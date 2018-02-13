import { is, merge } from '@toba/utility';
import { Client as AuthClient } from '@toba/oauth';
import { ClientConfig } from './client';
import { log } from '@toba/logger';
import { Url } from './constants';
import { Flickr } from './types';
import { cache } from './cache';
import 'fetch';

/**
 * Number of retries keyed to API method.
 */
const retries: { [key: string]: number } = {};

export interface Request<T> {
   /** Method to retreive response from JSON result */
   res(r: Flickr.Response): T;
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
   res: r => r,
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
 * Load response from cache or call API
 */
export function call<T>(
   method: string,
   id: Identity,
   req: Request<T>,
   config: ClientConfig
): Promise<T> {
   req = merge(defaultRequest, req);
   // generate fallback API call
   const noCacheCall = () => callAPI<T>(method, id, req, config);

   return req.allowCache && config.useCache
      ? cache
           .get<T>(method, id.value)
           .then(item => (is.value(item) ? item : noCacheCall()))
           .catch((err: Error) => {
              log.error(err, { method, id });
              return noCacheCall();
           })
      : noCacheCall();
}

/**
 * Invoke remote API when method result isn't cached locally.
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
   const methodUrl =
      'https://' + Url.Host + Url.Base + parameterize(method, id, req, config);

   return new Promise<T>((resolve, reject) => {
      const token = config.auth.token;
      /** Response handler that may retry call */
      const handler = (err: any, body: string, attempt: Function) => {
         let tryAgain = false;
         if (err === null) {
            const res = parse(body, key);
            if (res.stat == Flickr.Status.Okay) {
               clearRetries(key);
               const parsed = req.res(res);
               resolve(parsed);
               // cache result
               if (req.allowCache && config.useCache) {
                  cache.add(method, id.value, parsed);
               }
            } else {
               tryAgain = res.retry;
            }
         } else {
            log.error(err, { url: methodUrl, key });
            tryAgain = true;
         }
         if (!tryAgain || (tryAgain && !retry(attempt, key, config))) {
            reject(`Flickr ${method} failed for ${id.type} ${id.value}`);
         }
      };
      // create call attempt with signing as required
      const attempt = req.sign
         ? () =>
              req.auth.get(
                 methodUrl,
                 token.access,
                 token.secret,
                 (error, body) => {
                    handler(error, body, attempt);
                 }
              )
         : () =>
              fetch(methodUrl, { headers: { 'User-Agent': 'node.js' } })
                 .then(res => res.text())
                 .then(body => {
                    handler(null, body, attempt);
                 })
                 .catch(err => {
                    handler(err, null, attempt);
                 });

      attempt();
   });
}

/**
 * Parse Flickr response and handle different kinds of error conditions
 */
export function parse(body: string, key: string): Flickr.Response {
   const fail = { retry: true, stat: Flickr.Status.Failed };
   let json = null;

   if (is.value(body)) {
      // tslint:disable-next-line:quotemark
      body = body.replace(/\\'/g, "'");
   }

   try {
      json = JSON.parse(body);

      if (json === null) {
         log.error(`Call to ${key} returned null`);
         json = fail;
      } else if (json.stat == 'fail') {
         log.error(json.message, { key, code: json.code });
         // do not retry if the item is simply not found
         if (json.message.includes('not found')) {
            json.retry = false;
         }
      }
   } catch (ex) {
      log.error(ex, { key });

      if (/<html>/.test(body)) {
         // Flickr returned an HTML response instead of JSON -- likely an error message
         // see if we can swallow it
         log.error('Flickr returned HTML instead of JSON');
      }
      json = fail;
   }
   return json;
}

/**
 * Retry service call if bad response and less than max retries
 */
export function retry(
   fn: Function,
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
      setTimeout(fn, config.retryDelay);
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
 * Setup standard parameters.
 */
export function parameterize<T>(
   method: string,
   id: Identity,
   req: Request<T>,
   config: ClientConfig
): string {
   if (!is.value(req.params)) {
      return '';
   }
   let qs = '';
   let op = '?';

   const param = req.params;

   param.api_key = config.auth.apiKey;
   param.format = Flickr.Format.JSON;
   param.nojsoncallback = 1;
   param.method = 'flickr.' + method;

   if (is.value(id)) {
      param[id.type] = id.value;
   }
   for (const k in param) {
      qs += op + k + '=' + encodeURIComponent(param[k].toString());
      op = '&';
   }
   return qs;
}

export const makeKey = (method: string, id: string) => method + ':' + id;
