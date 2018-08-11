import { is, retry, Header } from '@toba/tools';
import { AuthClient, Token } from '@toba/oauth';
import { log } from '@toba/logger';
import { ClientConfig } from './config';
import { Url, Method } from './constants';
import { Flickr } from './types';
import { cache } from './cache';
import fetch from 'node-fetch';

/**
 * Response to return when the API call has failed but can be retried.
 */
export const failResponse: Flickr.Response = {
   retry: true,
   stat: Flickr.Status.Failed
};

export interface Request<T> {
   /** Method to select data from the complete Flickr response. */
   select(r: Flickr.Response): T;
   /** Whether to OAuth sign the request. */
   sign?: boolean;
   /** Whether result can be cached (subject to global configuration). */
   allowCache?: boolean;
   /** Error message to log if call fails. */
   error?: string;
   /** OAuthClient to use if signing is required. */
   auth?: AuthClient;
   params?: Flickr.Params;
}

export const defaultRequest: Request<Flickr.Response> = {
   select: r => r,
   error: null,
   sign: false,
   auth: null,
   allowCache: false
};

/**
 * Flickr entity identified by its type and ID value.
 */
export interface Identity {
   type: Flickr.TypeName;
   value: string;
}

/**
 * Load response from cache or call API.
 */
export async function call<T>(
   method: string,
   id: Identity,
   req: Request<T>,
   config: ClientConfig
): Promise<T> {
   //req = merge(defaultRequest, req);
   req = Object.assign(defaultRequest, req);
   // curry parameterless fallback call to API
   const curryCallAPI = (): Promise<T> => callAPI<T>(method, id, req, config);

   return req.allowCache && config.useCache
      ? cache
           .get<T>(method, id.value)
           // revert to calling API if cache item is invalid
           .then(item => (is.value(item) ? item : curryCallAPI()))
           // revert to calling API if error reading cache
           .catch((err: Error) => {
              log.error(err, { method, id });
              return null;
           })
      : curryCallAPI();
}

/**
 * Invoke remote API when method result isn't cached locally. Optionally retry
 * the call if an error is received.
 *
 * @see http://www.flickr.com/services/api/response.json.html
 */
export function callAPI<T>(
   method: string,
   id: Identity,
   req: Request<T>,
   config: ClientConfig
): Promise<T> {
   // create key to track retries and log messages
   const key = makeKey(method, id.value);
   // must be assigned in block to be held by closure
   const selector = req.select;
   const allowCache = req.allowCache;
   const url =
      'https://' + Url.Host + Url.Base + parameterize(method, id, req, config);
   const request = req.sign
      ? signedRequest(url, req.auth, config.auth.token)
      : basicRequest(url);
   const requestAndVerify = async () => {
      const body = await request();
      const res = parse(body, key);

      if (res.stat == Flickr.Status.Okay) {
         const item = selector(res);

         if (item === undefined) {
            throw `Failed to select item from ${url} response`;
         }

         // cache result
         if (allowCache && config.useCache) {
            cache.add(method, id.value, item);
         }
         return item;
      } else if (!res.retry) {
         // try again depending on custom flag appended in `parse()`
         throw `${url} failed`;
      }
   };

   return retry(
      requestAndVerify,
      config.maxRetries,
      config.retryDelay,
      `Parsing ${url} response`
   );
}

/**
 * Curry signed HTTP get request as string `Promise` that can be retried without
 * re-supplying parameters.
 */
export const signedRequest = (
   url: string,
   authClient: AuthClient,
   token: Token
) => () =>
   new Promise<string>((resolve, reject) => {
      authClient.get(
         url,
         token.access,
         token.secret,
         (err: { statusCode: number; data: any }, body: string) => {
            if (err) {
               reject(err);
            } else {
               resolve(body);
            }
         }
      );
   });

/**
 * Curry basic HTTP get request as string `Promise` that can be retried without
 * re-supplying parameters.
 */
export const basicRequest = (url: string) => async () => {
   const res = await fetch(url, { headers: { [Header.UserAgent]: 'node.js' } });
   return res.text();
};

/**
 * Parse Flickr response and handle error conditions.
 */
export function parse(body: string, key: string): Flickr.Response {
   let res: Flickr.Response = null;

   if (is.value(body)) {
      // replace escaped single-quotes with regular single-quotes
      // tslint:disable-next-line:quotemark
      body = body.replace(/\\'/g, "'");
   }

   if (/<html>/.test(body)) {
      // Flickr returned an HTML response instead of JSON -- likely an error
      // message; see if we can swallow it and retry.
      log.error('Flickr returned HTML instead of JSON', { key });
      return failResponse;
   }

   try {
      res = JSON.parse(body);

      if (res === null) {
         log.error(`Call to ${key} returned null`, { key });
         res = failResponse;
      } else if (res.stat == Flickr.Status.Failed) {
         log.error(res.message, { key, code: res.code });
         // do not retry if the item is simply not found
         if (res.message.includes('not found')) {
            res.retry = false;
         }
      }
   } catch (ex) {
      log.error(ex, { key });
      res = failResponse;
   }
   return res;
}

/**
 * Setup standard parameters for Flickr API call.
 *
 * @see https://www.flickr.com/services/api/request.rest.html
 */
export function parameterize<T>(
   method: string,
   id: Identity,
   req: Request<T>,
   config: ClientConfig
): string {
   let qs = '';
   let op = '?';

   const param: Flickr.Params = is.value(req.params) ? req.params : {};

   param.api_key = config.auth.apiKey;
   param.format = Flickr.Format.JSON;
   param.nojsoncallback = 1;
   param.method = Method.Prefix + method;

   if (is.value(id)) {
      param[id.type] = id.value;
   }
   for (const k in param) {
      qs += op + k + '=' + encodeURIComponent(param[k].toString());
      op = '&';
   }
   return qs;
}

/**
 * Simple key used to track HTTP retries and caching.
 */
export const makeKey = (method: string, id: string) => method + ':' + id;
