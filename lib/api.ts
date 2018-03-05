import { is, merge, retry, Cache } from '@toba/tools';
import { Client as AuthClient, Token } from '@toba/oauth';
import { ClientConfig } from './client';
import { log } from '@toba/logger';
import { Url, Method } from './constants';
import { Flickr } from './types';
import fetch from 'node-fetch';

export const failResponse: Flickr.Response = {
   retry: true,
   stat: Flickr.Status.Failed
};

export interface Request<T> {
   /** Method to retreive response from JSON result */
   parse(r: Flickr.Response): T;
   /** Whether to OAuth sign the request. */
   sign?: boolean;
   /** Whether result can be cached (subject to global configuration) */
   allowCache?: boolean;
   /** Error message to log if call fails. */
   error?: string;
   /** OAuthClient to use if signing is required */
   auth?: AuthClient;
   params?: Flickr.Params;
}

export const defaultRequest: Request<Flickr.Response> = {
   parse: r => r,
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
export function call<T>(
   method: string,
   id: Identity,
   req: Request<T>,
   config: ClientConfig
): Promise<T> {
   //req = merge(defaultRequest, req);
   req = Object.assign(defaultRequest, req);
   // curry parameterless fallback call to API
   const remoteCall = () => callAPI<T>(method, id, req, config);

   return req.allowCache && config.useCache
      ? cache
           .get<T>(method, id.value)
           // revert to calling API if cache item is invalid
           .then(item => (is.value(item) ? item : remoteCall()))
           // revert to calling API if error reading cache
           .catch((err: Error) => {
              log.error(err, { method, id });
              return remoteCall();
           })
      : remoteCall();
}

/**
 * Invoke remote API when method result isn't cached locally. Optionally retry
 * the call if an error is received.
 *
 * See http://www.flickr.com/services/api/response.json.html
 */
export function callAPI<T>(
   method: string,
   id: Identity,
   req: Request<T>,
   config: ClientConfig
): Promise<T> {
   // create key to track retries and log messages
   const key = makeKey(method, id.value);
   const url =
      'https://' + Url.Host + Url.Base + parameterize(method, id, req, config);
   const token = config.auth.token;
   const request = req.sign
      ? signedRequest(url, req.auth, token)
      : basicRequest(url);
   const requestAndVerify = () =>
      request().then(body => {
         const res = parse(body, key);

         if (res.stat == Flickr.Status.Okay) {
            const parsed = req.parse(res);

            // cache result
            if (req.allowCache && config.useCache) {
               cache.add(method, id.value, parsed);
            }
            return parsed;
         } else if (!res.retry) {
            // try again depending on custom flag appended in `parse()`
            throw `${url} failed`;
         }
      });

   return retry(requestAndVerify, config.maxRetries, config.retryDelay);
}

/**
 * Curry signed HTTP get request as string `Promise` that can be retried without
 * further parameters.
 */
export const signedRequest = (
   url: string,
   authClient: AuthClient,
   token: Token
) => () =>
   new Promise<string>((resolve, reject) => {
      authClient.get(url, token.access, token.secret, (err, body) => {
         if (err) {
            reject(err);
         } else {
            resolve(body);
         }
      });
   });

/**
 * Curry basic HTTP get request as string `Promise` that can be retried without
 * further parameters.
 */
export const basicRequest = (url: string) => () =>
   fetch(url, { headers: { 'User-Agent': 'node.js' } }).then(res => res.text());

/**
 * Parse Flickr response and handle different kinds of error conditions.
 */
export function parse(body: string, key: string): Flickr.Response {
   let res: Flickr.Response = null;

   if (is.value(body)) {
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
 * https://www.flickr.com/services/api/request.rest.html
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
