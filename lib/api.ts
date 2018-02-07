import { is } from '@toba/utility';
import { log } from '@toba/logger';
import { IdType } from './constants';
import { Flickr } from './types';
import { cache } from './cache';

/**
 * Number of retries keyed to API method.
 */
const retries: { [key: string]: number } = {};

const defaultCallOptions: Flickr.Options<Flickr.Response> = {
   // method to retrieve value from JSON response
   value: r => r,
   // error message to log if call fails
   error: null,
   // whether to OAuth sign the request
   sign: false,
   // whether result can be cached (subject to global configuration)
   allowCache: false,
   // additional querystring arguments
   args: {}
};

export interface ID {
   type: IdType,
   value: string
}

/**
 * Load response from cache or call API
 */
export function call<T>(
   method: string,
   id: ID,
   options: Flickr.Options<T>
): Promise<T> {
   options = Object.assign({}, defaultCallOptions, options);
   // generate fallback API call
   const noCache = () => callAPI<T>(method, id, options);

   return options.allowCache
      ? cache
         .get<T>(method, id.value)
         .then(item => (is.value(item) ? item : noCache()))
         .catch((err: Error) => {
            log.error(err, { method, id });
            return noCache();
         })
      : noCache();
}

/**
 * Invoke remote API when method result isn't cached locally.
 *
 * See http://www.flickr.com/services/api/response.json.html
 */
export function callAPI<T>(
   method: string,
   id: ID,
   options: Flickr.Options<T>
): Promise<T> {
   // create key to track retries and log messages
   const key = method + ':' + id;
   const methodUrl =
      'https://' +
      host +
      url.BASE +
      parameterize(method, id, options.args);

   return new Promise<T>((resolve, reject) => {
      const token = config.flickr.auth.token;
      // response handler that may retry call
      const handler = (err: any, body: string, attempt: Function) => {
         let tryAgain = false;
         if (err === null) {
            const res = parse(body, key);
            if (res.stat == 'ok') {
               clearRetries(key);
               const parsed = options.value(res);
               resolve(parsed);
               // cache result
               if (options.allowCache) {
                  cache.add(method, id.value, parsed);
               }
            } else {
               tryAgain = res.retry;
            }
         } else {
            log.error(err, { url: methodUrl });
            tryAgain = true;
         }
         if (!tryAgain || (tryAgain && !retry(attempt, key))) {
            reject('Flickr ' + method + ' failed for ' + id.type + ' ' + id.value);
         }
      };
      // create call attempt with signing as required
      const attempt = options.sign
         ? () =>
            oauth.get(
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
   const fail = { retry: true, stat: 'fail' };
   let json = null;

   if (is.value(body)) {
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
export function retry(fn: Function, key: string): boolean {
   let count = 1;

   if (retries[key]) {
      count = ++retries[key];
   } else {
      retries[key] = count;
   }

   if (count > config.flickr.maxRetries) {
      retries[key] = 0;
      log.error(`Call to ${key} failed after ${maxRetries} tries`);
      return false;
   } else {
      log.warn(`Retry ${count} for ${key}`);
      setTimeout(fn, config.flickr.retryDelay);
      return true;
   }
}

/**
 * Clear retry count and log success.
 */
export function clearRetries(key: string) {
   if (retries[key] && retries[key] > 0) {
      log.info('Call to %s succeeded', key);
      retries[key] = 0;
   }
}

/**
 * Setup standard parameters.
 */
export function parameterize(
   method: string,
   id?: ID,
   args: { [key: string]: string | number | boolean } = {}
): string {
   let qs = '';
   let op = '?';

   args.api_key = config.flickr.auth.apiKey;
   args.format = 'json';
   args.nojsoncallback = 1;
   args.method = 'flickr.' + method;

   if (is.value(id)) {
      args[id.type] = id.value;
   }
   for (const k in args) {
      qs += op + k + '=' + encodeURIComponent(args[k].toString());
      op = '&';
   }
   return qs;
}
