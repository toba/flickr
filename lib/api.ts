import { is, merge } from '@toba/utility';
import { Client as AuthClient, Token } from '@toba/oauth';
import { ClientConfig } from './client';
import { log } from '@toba/logger';
import { Url, Method } from './constants';
import { Flickr } from './types';
import { cache } from './cache';
import fetch from 'node-fetch';

/**
 * Number of retries keyed to API method.
 */
const retries: { [key: string]: number } = {};

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

/**
 * Response handler that may re-attempt HTTP Get request.
 */
export type ResponseHandler = (
   err: any,
   body: string,
   httpGet: () => void
) => void;

export const defaultRequest: Request<Flickr.Response> = {
   parse: r => r,
   error: null,
   sign: false,
   auth: null,
   allowCache: false
};

/**
 * Flickr entity identified by type and an ID value.
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

   return new Promise<T>((resolve, reject) => {
      const token = config.auth.token;
      const handler: ResponseHandler = (
         err: any,
         body: string,
         httpGet: () => void
      ) => {
         let tryAgain = false;

         if (err === null) {
            const res = parse(body, key);

            if (res.stat == Flickr.Status.Okay) {
               clearRetries(key);
               const parsed = req.parse(res);
               resolve(parsed);

               // cache result
               if (req.allowCache && config.useCache) {
                  cache.add(method, id.value, parsed);
               }
            } else {
               // try again depending on custom flag appended in `parse()`
               tryAgain = res.retry;
            }
         } else {
            log.error(err, { url, key });
            tryAgain = true;
         }

         if (!tryAgain || (tryAgain && !retry(httpGet, key, config))) {
            reject(`Flickr ${method} failed for ${id.type} ${id.value}`);
         }
      };

      const httpGet = req.sign
         ? signedGet(url, handler, req.auth, token)
         : basicGet(url, handler);

      httpGet();
   });
}

/**
 * Curry signed HTTP get request that can be retried without further parameters.
 */
export function signedGet(
   url: string,
   handler: ResponseHandler,
   authClient: AuthClient,
   token: Token
) {
   const getter = () =>
      authClient.get(url, token.access, token.secret, (err, body) => {
         handler(err, body, getter);
      });

   return getter;
}

/**
 * Curry basic HTTP get request that can be retried without further parameters.
 */
export function basicGet(url: string, handler: ResponseHandler) {
   const getter = () =>
      fetch(url, { headers: { 'User-Agent': 'node.js' } })
         .then(res => res.text())
         .then(body => {
            handler(null, body, getter);
         })
         .catch(err => {
            handler(err, null, getter);
         });

   return getter;
}

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
 * Retry service call if bad response and less than max retries.
 */
export function retry(
   httpGet: () => void,
   key: string,
   config: ClientConfig
): boolean {
   let count = 1;

   if (retries[key]) {
      count = ++retries[key];
   } else {
      retries[key] = count;
   }

   if (count > config.maxRetries) {
      retries[key] = 0;
      log.error(`Call to ${key} failed after ${config.maxRetries} tries`, {
         key
      });
      return false;
   } else {
      log.warn(`Retry ${count} for ${key}`, { key });
      setTimeout(httpGet, config.retryDelay);
      return true;
   }
}

/**
 * Clear retry count and log success.
 */
export function clearRetries(key: string) {
   if (retries[key] && retries[key] > 0) {
      log.info(`Call to ${key} succeeded`, { key });
      retries[key] = 0;
   }
}

/**
 * Setup standard parameters for Flickr API call.
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
