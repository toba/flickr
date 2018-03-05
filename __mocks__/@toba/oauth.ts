import fetch from 'node-fetch';

/**
 * Mock OAuth client.
 *
 * https://github.com/facebook/jest/pull/2483
 */
export class Client {
   urls: { [key: string]: string };
   last: {
      accessToken: string;
      secret: string;
   };

   constructor(
      requestTokenUrl: string,
      accessTokenUrl: string,
      apiKey: string,
      secret: string,
      version: string,
      callbackUrl: string,
      hashing: string
   ) {
      this.urls = {
         requestTokenUrl,
         accessTokenUrl,
         callbackUrl
      };
   }

   /**
    * Get URL as basic fetch and record the token information.
    */
   get(
      url: string,
      accessToken: string,
      secret: string,
      callback: (err: any, body: string) => void
   ) {
      this.last.accessToken = accessToken;
      this.last.secret = secret;

      fetch(url)
         .then(res => res.text())
         .then(body => {
            callback(null, body);
         })
         .catch(err => {
            callback(err, null);
         });
   }
}
