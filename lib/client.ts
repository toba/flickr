import { Flickr } from './types';
import { Token, OAuthClient } from '@toba/oauth';
import { is } from '@toba/utility';
import { url, extra, method, type } from './constants';
import { call } from './api';

export interface ClientConfig {
      userID: string;
      appID: string;
      useCache: boolean;
      excludeSets?: string[];
      excludeTags?: string[];
      maxRetries: number;
      retryDelay: number;
      auth: Token;
}

export class FlickrClient {
      config: ClientConfig;
      oauth: OAuthClient;
      /**
       * Number of retries keyed to API method.
       */
      retries: { [key: string]: number } = {};

      constructor(config: ClientConfig) {
            this.config = config;
            this.oauth = new OAuthClient(
                  url.REQUEST_TOKEN,
                  url.ACCESS_TOKEN,
                  config.auth.apiKey,
                  config.auth.secret,
                  '1.0A',
                  config.auth.callback,
                  'HMAC-SHA1'
            );
      }

      getCollections() {
            return call<Flickr.Collection[]>(
                  method.COLLECTIONS,
                  type.USER,
                  this.config.userID,
                  {
                        value: r => r.collections.collection,
                        allowCache: true
                  }
            );
      }

      getSetInfo(id: string) {
            return call<Flickr.SetInfo>(method.set.INFO, type.SET, id, {
                  value: r => r.photoset as Flickr.SetInfo,
                  allowCache: true
            });
      }

      getPhotoSizes(id: string) {
            return call<Flickr.Size[]>(method.photo.SIZES, type.PHOTO, id, {
                  value: r => r.sizes.size
            });
      }

      getPhotoContext(id: string) {
            return call<Flickr.MemberSet[]>(method.photo.SETS, type.PHOTO, id, {
                  value: r => r.set
            });
      }

      getExif(id: number) {
            return call<Flickr.Exif[]>(method.photo.EXIF, type.PHOTO, id.toString(), {
                  value: r => r.photo.exif,
                  allowCache: true
            });
      }

      getSetPhotos(id: string) {
            return call<Flickr.SetPhotos>(method.set.PHOTOS, type.SET, id, {
                  args: {
                        extras: [
                              extra.DESCRIPTION,
                              extra.TAGS,
                              extra.DATE_TAKEN,
                              extra.LOCATION,
                              extra.PATH_ALIAS
                        ]
                              .concat(this.config.photoSize.post)
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
                  type.USER,
                  this.config.userID,
                  {
                        args: {
                              extras: this.config.photoSize.search.join(),
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
                  type.USER,
                  this.config.userID,
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
