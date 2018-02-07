import { Flickr } from './types';
import { Token, Client as AuthClient, Config as AuthConfig } from '@toba/oauth';
import { is } from '@toba/utility';
import { Url, Extra, method, IdType, Size } from './constants';
import { call, ID } from './api';

export interface ClientConfig {
   userID: string;
   appID: string;
   /** Whether to cache API resuts */
   useCache: boolean;
   excludeSets?: string[];
   /** Tags to exclude from tag request */
   excludeTags?: string[];
   /** Photo sizes to return from search request */
   searchPhotoSizes: Size[];
   /** Photo sizes to return for photo set request */
   setPhotoSizes: Size[];
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

   get _userID(): ID {
      return { type: IdType.User, value: this.config.userID }
   }

   _setID(id: string) {
      return { type: IdType.Set, value: id }
   }

   _photoID(id: string | number) {
      return { type: IdType.Photo, value: id.toString() }
   }

   getCollections() {
      return call<Flickr.Collection[]>(
         method.COLLECTIONS,
         this._userID,
         {
            value: r => r.collections.collection,
            allowCache: true
         }
      );
   }

   getSetInfo(id: string) {
      return call<Flickr.SetInfo>(method.set.INFO, this._setID(id), {
         value: r => r.photoset as Flickr.SetInfo,
         allowCache: true
      });
   }

   getPhotoSizes(id: string) {
      return call<Flickr.Size[]>(method.photo.SIZES, this._photoID(id), {
         value: r => r.sizes.size
      });
   }

   getPhotoContext(id: string) {
      return call<Flickr.MemberSet[]>(method.photo.SETS, this._photoID(id), {
         value: r => r.set
      });
   }

   getExif(id: number) {
      return call<Flickr.Exif[]>(method.photo.EXIF, this._photoID(id), {
         value: r => r.photo.exif,
         allowCache: true
      });
   }

   getSetPhotos(id: string) {
      return call<Flickr.SetPhotos>(method.set.PHOTOS, this._setID(id), {
         args: {
            extras: [
               Extra.Description,
               Extra.Tags,
               Extra.DateTaken,
               Extra.Location,
               Extra.PathAlias
            ]
               .concat(this.config.setPhotoSizes)
               .join()
         },
         value: r => r.photoset as Flickr.SetPhotos,
         allowCache: true
      });
   }

   /**
    * The documentation says signing is not required but results differ even with entirely
    * public photos -- perhaps a Flickr bug
    *
    * https://www.flickr.com/services/api/flickr.photos.search.html
    */
   photoSearch(tags: string | string[]) {
      return call<Flickr.PhotoSummary[]>(
         method.photo.SEARCH,
         this._userID,
         {
            args: {
               extras: this.config.searchPhotoSizes.join(),
               tags: is.array(tags) ? tags.join() : tags,
               sort: 'relevance',
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
      return call<Flickr.Tag[]>(
         method.photo.TAGS,
         this._userID,
         {
            value: r => r.who.tags.tag,
            sign: true,
            allowCache: true
         }
      );
   }
}

// const sizes = {
//    thumb: s.SQUARE_150,
//    preview: s.SMALL_320,
//    normal: [s.LARGE_1024, s.MEDIUM_800, s.MEDIUM_640],
//    big: [s.LARGE_2048, s.LARGE_1600, s.LARGE_1024]
// };

// const flickr = {
//    userID: '60950751@N04',
//    appID: '72157631007435048',
//    featureSets: [
//       { id: '72157632729508554', title: 'Ruminations' }
//    ] as Flickr.FeatureSet[],
//    sizes,
//    /** Photo sizes that must be retrieved for certain contexts */
//    photoSize: {
//       post: sizes.normal.concat(sizes.big, sizes.preview),
//       map: [s.SMALL_320],
//       search: [s.SQUARE_150]
//    },
//    excludeSets: ['72157631638576162'],
//    excludeTags: [
//       'Idaho',
//       'United States of America',
//       'Abbott',
//       'LensTagger',
//       'Boise'
//    ],
//    maxRetries: 10,
//    retryDelay: 300,
//    auth: {
//       apiKey: env('FLICKR_API_KEY'),
//       secret: env('FLICKR_SECRET'),
//       callback: 'http://www.' + domain + '/auth/flickr',
//       token: {
//          access: process.env['FLICKR_ACCESS_TOKEN'] as string,
//          secret: process.env['FLICKR_TOKEN_SECRET'] as string,
//          request: null as string
//       } as Token
//    }
// };
