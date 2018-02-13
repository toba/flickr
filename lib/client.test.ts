import { FlickrClient, ClientConfig } from './client';
import { Flickr } from './types';

let client: FlickrClient;
const longTimeout = 5000;
const config: ClientConfig = {
   appID: '72157631007435048',
   userID: '60950751@N04',
   excludeSets: ['72157631638576162'],
   excludeTags: [
      'Idaho',
      'United States of America',
      'Abbott',
      'LensTagger',
      'Boise'
   ],
   featureSets: [{ id: '72157632729508554', title: 'Ruminations' }],
   maxRetries: 10,
   retryDelay: 300,
   useCache: false,
   searchPhotoSizes: [Flickr.SizeUrl.Large1024],
   setPhotoSizes: [Flickr.SizeUrl.Large1024],
   auth: {
      apiKey: process.env['FLICKR_API_KEY'],
      secret: process.env['FLICKR_SECRET'],
      callback: 'http://www.trailimage.com/auth/flickr',
      token: {
         access: process.env['FLICKR_ACCESS_TOKEN'],
         secret: process.env['FLICKR_TOKEN_SECRET'],
         request: null
      }
   }
};

const featureSetID = config.featureSets[0].id;
const featurePhotoID = '0';

beforeAll(() => {
   client = new FlickrClient(config);
});

test(
   'retrieves all collections',
   () =>
      client.getCollections().then(json => {
         expect(json).toBeInstanceOf(Array);
      }),
   longTimeout * 2
);

test(
   'catches non-existent set request',
   () =>
      client.getSetInfo('45').catch(error => {
         expect(error).toBe(
            'Flickr photosets.getInfo failed for photoset_id 45'
         );
      }),
   longTimeout
);

test(
   'retrieves set information',
   () =>
      client.getSetInfo(featureSetID).then(json => {
         expect(json.id).toBe(config.featureSets[0].id);
      }),
   longTimeout
);

test(
   'retrieves set photos',
   () =>
      client.getSetPhotos(config.featureSets[0].id).then(json => {
         expect(json).toHaveProperty('id', config.featureSets[0].id);
         expect(json.photo).toBeInstanceOf(Array);
         config.setPhotoSizes.forEach(s => {
            // should retrieve all size URLs needed to display post
            expect(json.photo[0]).toHaveProperty(s);
         });
      }),
   longTimeout
);

test(
   'retrieves photo EXIF',
   () =>
      client.getExif(featurePhotoID).then(json => {
         expect(json).toBeInstanceOf(Array);
      }),
   longTimeout
);

test(
   'retrieves photo sizes',
   () =>
      client.getPhotoSizes(featurePhotoID).then(json => {
         expect(json).toBeInstanceOf(Array);
         expect(json[0]).toHaveProperty('url');
      }),
   longTimeout
);

test(
   'retrieves all photo tags',
   () =>
      client.getAllPhotoTags().then(json => {
         expect(json).toBeInstanceOf(Array);
      }),
   longTimeout
);

test(
   'retrieves photo context',
   () =>
      client.getPhotoContext(featurePhotoID).then(json => {
         expect(json).toBeInstanceOf(Array);
         expect(json[0]).toHaveProperty('id', featureSetID);
      }),
   longTimeout
);

test(
   'searches for photos',
   () =>
      client.photoSearch('horse').then(json => {
         expect(json).toBeInstanceOf(Array);
         expect(json[0]).toHaveProperty('owner', config.userID);
      }),
   longTimeout
);

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
