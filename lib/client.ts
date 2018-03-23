import { Flickr } from './types';
import { Client as AuthClient, Config as AuthConfig } from '@toba/oauth';
import { is, merge } from '@toba/tools';
import { Url, Method } from './constants';
import { call, Identity, Request } from './api';
import { cache } from './cache';

export interface FeatureSet {
   id: string;
   title: string;
}

export interface ClientConfig {
   userID: string;
   appID: string;
   /** Whether to cache API resuts */
   useCache?: boolean;
   /** Maximum number of responses to cache */
   maxCacheSize?: number;
   /** Optional set IDs to feature */
   featureSets?: FeatureSet[];
   /** Optional set IDs to exclude from results */
   excludeSets?: string[];
   /** Optional tags to exclude from tag request */
   excludeTags?: string[];
   /** Photo sizes to return from search request */
   searchPhotoSizes?: Flickr.SizeUrl[];
   /** Photo sizes to return for photo set request */
   setPhotoSizes?: Flickr.SizeUrl[];
   /** Number of times to retry failed requests */
   maxRetries?: number;
   /** Milliseconds to wait before retrying failed request */
   retryDelay?: number;
   /** https://www.flickr.com/services/api/auth.oauth.html */
   auth: AuthConfig;
}

const defaultConfig: ClientConfig = {
   userID: null,
   appID: null,
   useCache: true,
   maxCacheSize: 200,
   featureSets: [],
   excludeSets: [],
   excludeTags: [],
   searchPhotoSizes: [Flickr.SizeUrl.Large1024],
   setPhotoSizes: [Flickr.SizeUrl.Large1024],
   maxRetries: 3,
   retryDelay: 500,
   auth: null
};

export class FlickrClient {
   private config: ClientConfig;
   private oauth: AuthClient;

   constructor(config: ClientConfig) {
      this.config = merge(defaultConfig, config);
      this.oauth = new AuthClient(
         Url.RequestToken,
         Url.AccessToken,
         config.auth.apiKey,
         config.auth.secret,
         '1.0A',
         config.auth.callback,
         'HMAC-SHA1'
      );
      cache.maxItems(this.config.maxCacheSize);
   }

   private get userID(): Identity {
      return { type: Flickr.TypeName.User, value: this.config.userID };
   }

   private setID(id: string): Identity {
      return { type: Flickr.TypeName.Set, value: id };
   }

   private photoID(id: string | number): Identity {
      return { type: Flickr.TypeName.Photo, value: id.toString() };
   }

   private async _api<T>(
      method: string,
      id: Identity,
      req: Request<T>
   ): Promise<T> {
      req.auth = this.oauth;
      return call<T>(method, id, req, this.config);
   }

   /**
    * https://www.flickr.com/services/api/flickr.collections.getTree.html
    */
   async getCollections() {
      return this._api<Flickr.Collection[]>(Method.Collections, this.userID, {
         select: r => r.collections.collection,
         allowCache: true
      });
   }

   /**
    * https://www.flickr.com/services/api/flickr.photosets.getInfo.html
    */
   async getSetInfo(id: string) {
      return this._api<Flickr.SetInfo>(Method.Set.Info, this.setID(id), {
         select: r => r.photoset as Flickr.SetInfo,
         allowCache: true
      });
   }

   /**
    * https://www.flickr.com/services/api/flickr.photos.getSizes.html
    */
   async getPhotoSizes(id: string) {
      return this._api<Flickr.Size[]>(Method.Photo.Sizes, this.photoID(id), {
         select: r => r.sizes.size
      });
   }

   /**
    * All sets that a photo belongs to.
    * https://www.flickr.com/services/api/flickr.photos.getAllContexts.html
    */
   async getPhotoContext(id: string) {
      return this._api<Flickr.MemberSet[]>(
         Method.Photo.Sets,
         this.photoID(id),
         {
            select: r => r.set
         }
      );
   }

   /**
    * https://www.flickr.com/services/api/flickr.photos.getExif.html
    */
   async getExif(id: string) {
      return this._api<Flickr.Exif[]>(Method.Photo.EXIF, this.photoID(id), {
         select: r => r.photo.EXIF,
         allowCache: true
      });
   }

   /**
    * All photos in a set.
    * https://www.flickr.com/services/api/flickr.photosets.getPhotos.html
    */
   async getSetPhotos(id: string) {
      return this._api<Flickr.SetPhotos>(Method.Set.Photos, this.setID(id), {
         params: {
            extras:
               [
                  Flickr.Extra.Description,
                  Flickr.Extra.Tags,
                  Flickr.Extra.DateTaken,
                  Flickr.Extra.Location,
                  Flickr.Extra.PathAlias
               ].join() +
               ',' +
               this.config.searchPhotoSizes.join()
         },
         select: r => r.photoset as Flickr.SetPhotos,
         allowCache: true
      });
   }

   /**
    * The documentation says signing is not required but results differ even
    * with entirely public photos -- perhaps a Flickr bug
    *
    * https://www.flickr.com/services/api/flickr.photos.search.html
    */
   async photoSearch(tags: string | string[]) {
      return this._api<Flickr.PhotoSummary[]>(
         Method.Photo.Search,
         this.userID,
         {
            params: {
               extras: this.config.searchPhotoSizes.join(),
               tags: is.array(tags) ? tags.join() : tags,
               sort: Flickr.Sort.Relevance,
               per_page: 500 // maximum
            },
            select: r => r.photos.photo as Flickr.PhotoSummary[],
            sign: true
         }
      );
   }

   /**
    * All photo tags for API user.
    * https://www.flickr.com/services/api/flickr.tags.getListUserRaw.html
    */
   async getAllPhotoTags() {
      return this._api<Flickr.Tag[]>(Method.Photo.Tags, this.userID, {
         select: r => r.who.tags.tag,
         sign: true,
         allowCache: true
      });
   }
}
