export class Client {
   urls: { [key: string]: string };

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
}
