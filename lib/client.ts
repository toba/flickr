import { Flickr } from './types';
import { Client as AuthClient, Config as AuthConfig } from '@toba/oauth';
import { is } from '@toba/utility';
import { Url, method } from './constants';
import { call, Identity, Request } from './api';

export interface FeatureSet {
   id: string;
   title: string;
}

export interface ClientConfig {
   userID: string;
   appID: string;
   /** Whether to cache API resuts */
   useCache: boolean;
   /** Optional set IDs to feature */
   featureSets?: FeatureSet[];
   /** Optional set IDs to exclude from results */
   excludeSets?: string[];
   /** Optional tags to exclude from tag request */
   excludeTags?: string[];
   /** Photo sizes to return from search request */
   searchPhotoSizes: Flickr.SizeUrl[];
   /** Photo sizes to return for photo set request */
   setPhotoSizes: Flickr.SizeUrl[];
   /** Number of times to retry failed requests */
   maxRetries: number;
   /** Milliseconds to wait before retrying failed request */
   retryDelay: number;
   auth: AuthConfig;
}

export class FlickrClient {
   config: ClientConfig;
   oauth: AuthClient;
   /**
    * Number of retries keyed to API method.
    */
   retries: { [key: string]: number } = {};

   constructor(config: ClientConfig) {
      this.config = config;
      this.oauth = new AuthClient(
         Url.RequestToken,
         Url.AccessToken,
         config.auth.apiKey,
         config.auth.secret,
         '1.0A',
         config.auth.callback,
         'HMAC-SHA1'
      );
   }

   get _userID(): Identity {
      return { type: Flickr.TypeName.User, value: this.config.userID };
   }

   _setID(id: string) {
      return { type: Flickr.TypeName.Set, value: id };
   }

   _photoID(id: string | number) {
      return { type: Flickr.TypeName.Photo, value: id.toString() };
   }

   _call<T>(method: string, id: Identity, req: Request<T>) {
      call<T>(method, id, req, this.config);
   }

   getCollections() {
      return this._call<Flickr.Collection[]>(method.COLLECTIONS, this._userID, {
         value: r => r.collections.collection,
         allowCache: true
      });
   }

   getSetInfo(id: string) {
      return this._call<Flickr.SetInfo>(method.set.INFO, this._setID(id), {
         value: r => r.photoset as Flickr.SetInfo,
         allowCache: true
      });
   }

   getPhotoSizes(id: string) {
      return this._call<Flickr.Size[]>(method.photo.SIZES, this._photoID(id), {
         value: r => r.sizes.size
      });
   }

   getPhotoContext(id: string) {
      return this._call<Flickr.MemberSet[]>(
         method.photo.SETS,
         this._photoID(id),
         {
            value: r => r.set
         }
      );
   }

   getExif(id: number) {
      return this._call<Flickr.Exif[]>(method.photo.EXIF, this._photoID(id), {
         value: r => r.photo.exif,
         allowCache: true
      });
   }

   getSetPhotos(id: string) {
      return this._call<Flickr.SetPhotos>(method.set.PHOTOS, this._setID(id), {
         params: {
            extras: [
               Flickr.Extra.Description,
               Flickr.Extra.Tags,
               Flickr.Extra.DateTaken,
               Flickr.Extra.Location,
               Flickr.Extra.PathAlias
            ]
               .concat(this.config.setPhotoSizes)
               .join()
         },
         value: r => r.photoset as Flickr.SetPhotos,
         allowCache: true
      });
   }

   /**
    * The documentation says signing is not required but results differ even
    * with entirely public photos -- perhaps a Flickr bug
    *
    * https://www.flickr.com/services/api/flickr.photos.search.html
    */
   photoSearch(tags: string | string[]) {
      return this._call<Flickr.PhotoSummary[]>(
         method.photo.SEARCH,
         this._userID,
         {
            params: {
               extras: this.config.searchPhotoSizes.join(),
               tags: is.array(tags) ? tags.join() : tags,
               sort: Flickr.Sort.Relevance,
               per_page: 500 // maximum
            },
            value: r => r.photos.photo as Flickr.PhotoSummary[],
            sign: true
         }
      );
   }

   /**
    * Photo tags for user
    */
   getAllPhotoTags() {
      return this._call<Flickr.Tag[]>(method.photo.TAGS, this._userID, {
         value: r => r.who.tags.tag,
         sign: true,
         allowCache: true
      });
   }
}
