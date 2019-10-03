import { AuthClient, SigningMethod, Token } from '@toba/oauth';
import { is, merge } from '@toba/node-tools';
import { Flickr } from './types';
import { ClientConfig, defaultConfig } from './config';
import { ChangeSubscription, Changes, EventType } from './subscription';
import { Url, Method } from './constants';
import { call, Identity, Request } from './api';
import { cache } from './cache';

export class FlickrClient {
   private config: ClientConfig;
   private oauth: AuthClient;
   subscription: ChangeSubscription;

   constructor(config: ClientConfig) {
      this.config = merge(defaultConfig, config);
      this.subscription = new ChangeSubscription(this);
      this.oauth = new AuthClient(
         Url.RequestToken,
         Url.AccessToken,
         config.auth.apiKey,
         config.auth.secret,
         '1.0A',
         config.auth.callback,
         SigningMethod.HMAC
      );
      cache.maxItems(this.config.maxCacheSize);

      if (this.config.useCache) {
         // subscribe to change events to clear cache if an external watcher is
         // added
         this.subscription.addEventListener(EventType.NewWatcher, () => {
            this.subscription.addEventListener(
               EventType.Change,
               this.onChange.bind(this)
            );
         });
      }
   }

   private get userID(): Identity {
      return { type: Flickr.TypeName.User, value: this.config.userID };
   }

   private setID = (id: string): Identity => ({
      type: Flickr.TypeName.Set,
      value: id
   });

   private photoID = (id: string | number): Identity => ({
      type: Flickr.TypeName.Photo,
      value: id.toString()
   });

   private apiCall<T>(
      method: string,
      id: Identity,
      req: Request<T>
   ): Promise<T | null> {
      req.auth = this.oauth;
      return call<T>(method, id, req, this.config);
   }

   /**
    * Remove items from cache when change is detected on the Flickr server.
    */
   private onChange(changes: Changes) {
      if (!this.config.useCache) {
         return;
      }

      if (changes.collections.length > 0) {
         cache.remove(Method.Collections, this.userID.value);
      }

      changes.sets.forEach(id => {
         cache.remove(Method.Set.Info, id);
         cache.remove(Method.Set.Photos, id);
      });
   }

   /**
    * Add method to receive change notifications. This also has the effect of
    * activating change polling.
    */
   subscribe(fn: (change: Changes) => void) {
      this.subscription.add(fn);
   }

   /**
    * @see https://www.flickr.com/services/api/flickr.collections.getTree.html
    */
   async getCollections(allowCache = true) {
      const collections = await this.apiCall<Flickr.Collection[]>(
         Method.Collections,
         this.userID,
         {
            select: r =>
               r.collections !== undefined ? r.collections.collection : [],
            allowCache
         }
      );
      if (collections !== null) {
         this.subscription.updateCollections(...collections);
      }
      return collections;
   }

   /**
    * @see https://www.flickr.com/services/api/flickr.photosets.getInfo.html
    */
   async getSetInfo(
      id: string,
      allowCache = true
   ): Promise<Flickr.SetInfo | null> {
      const info = await this.apiCall<Flickr.SetInfo>(
         Method.Set.Info,
         this.setID(id),
         {
            select: r => r.photoset as Flickr.SetInfo,
            allowCache
         }
      );
      if (info !== null) {
         this.subscription.updateSet(info.id, parseInt(info.date_update));
      }
      return info;
   }

   /**
    * All photos in a set. Include last update time to enable change detection.
    * @see https://www.flickr.com/services/api/flickr.photosets.getPhotos.html
    */
   async getSetPhotos(
      id: string,
      extras: Flickr.Extra[] = [],
      allowCache = true
   ): Promise<Flickr.SetPhotos | null> {
      const extrasList =
         extras.length > 0
            ? extras.join()
            : [
                 Flickr.Extra.Description,
                 Flickr.Extra.Tags,
                 Flickr.Extra.DateTaken,
                 Flickr.Extra.DateUpdated,
                 Flickr.Extra.Location,
                 Flickr.Extra.PathAlias
              ].join() +
              ',' +
              this.config.setPhotoSizes.join();

      const photos = await this.apiCall<Flickr.SetPhotos>(
         Method.Set.Photos,
         this.setID(id),
         {
            params: {
               extras: extrasList
            },
            select: r => r.photoset as Flickr.SetPhotos,
            allowCache
         }
      );
      if (photos !== null) {
         this.subscription.updateSet(id, photos);
      }
      return photos;
   }

   /**
    * @see https://www.flickr.com/services/api/flickr.photos.getInfo.html
    */
   getPhotoInfo = (id: string) =>
      this.apiCall<Flickr.PhotoInfo>(Method.Photo.Info, this.photoID(id), {
         select: r => r.photo as Flickr.PhotoInfo,
         allowCache: true
      });

   /**
    * @see https://www.flickr.com/services/api/flickr.photos.getSizes.html
    */
   getPhotoSizes = (id: string) =>
      this.apiCall<Flickr.Size[]>(Method.Photo.Sizes, this.photoID(id), {
         select: r => (r.sizes !== undefined ? r.sizes.size : [])
      });

   /**
    * All sets that a photo belongs to.
    * @see https://www.flickr.com/services/api/flickr.photos.getAllContexts.html
    */
   getPhotoContext = (id: string) =>
      this.apiCall<Flickr.MemberSet[]>(Method.Photo.Sets, this.photoID(id), {
         select: r => (r.set !== undefined ? r.set : [])
      });

   /**
    * @see https://www.flickr.com/services/api/flickr.photos.getExif.html
    */
   getExif = (id: string) =>
      this.apiCall<Flickr.Exif[]>(Method.Photo.EXIF, this.photoID(id), {
         select: r => {
            if (r.photo === undefined) {
               return [];
            }
            if (r.photo.exif !== undefined) {
               return r.photo.exif;
            }
            // Flickr changed the field name
            if (r.photo.EXIF !== undefined) {
               return r.photo.EXIF;
            }
            return [];
         },
         allowCache: true
      });

   /**
    * The documentation says signing is not required but results differ even
    * with entirely public photos -- perhaps a Flickr bug
    *
    * @see https://www.flickr.com/services/api/flickr.photos.search.html
    */
   photoSearch = (tags: string | string[]) =>
      this.apiCall<Flickr.PhotoSummary[]>(Method.Photo.Search, this.userID, {
         params: {
            extras: this.config.searchPhotoSizes.join(),
            tags: is.array(tags) ? tags.join() : tags,
            sort: Flickr.Sort.Relevance,
            per_page: 500 // maximum
         },
         select: r =>
            r.photos !== undefined
               ? (r.photos.photo as Flickr.PhotoSummary[])
               : [],
         sign: true
      });

   /**
    * All photo tags for API user.
    * @see https://www.flickr.com/services/api/flickr.tags.getListUserRaw.html
    */
   getAllPhotoTags = () =>
      this.apiCall<Flickr.Tag[]>(Method.Photo.Tags, this.userID, {
         select: r => (r.who !== undefined ? r.who.tags.tag : []),
         sign: true,
         allowCache: true
      });

   getRequestToken = (): Promise<string> =>
      new Promise<string>((resolve, reject) => {
         const token = this.config.auth.token;
         if (token === undefined) {
            return reject('Cannot get request token without OAuth object');
         }
         this.oauth.getOAuthRequestToken((error, requestToken, secret) => {
            if (is.value(error)) {
               return reject(error);
            }
            // token and secret are both needed for the next call but token is
            // echoed back from the authorize service
            token.request = requestToken;
            token.secret = secret;

            resolve(`${Url.Authorize}?oauth_token=${requestToken}`);
         });
      });

   getAccessToken = (requestToken: string, verifier: string) =>
      new Promise<Token>((resolve, reject) => {
         const token = this.config.auth.token;
         if (token === undefined || token.secret === undefined) {
            return reject('Cannot get access token without secret');
         }

         this.oauth.getOAuthAccessToken(
            requestToken,
            token.secret,
            verifier,
            (error, accessToken, secret) => {
               token.secret = undefined;
               if (is.value(error)) {
                  return reject(error);
               }
               resolve({
                  access: accessToken,
                  secret: secret
               } as Token);
            }
         );
      });

   /**
    * Empty API response cache.
    */
   clearCache() {
      cache.clear();
   }
}
