import { FlickrClient, ClientConfig } from './client';
import { Size } from './constants';

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
   featureSets: [
      { id: '72157632729508554', title: 'Ruminations' }
   ],
   maxRetries: 10,
   retryDelay: 300,
   useCache: false,
   searchPhotoSizes: [Size.Large1024],
   setPhotoSizes: [Size.Large1024],
   auth: {
      apiKey: process.env['FLICKR_API_KEY'],
      secret: process.env['FLICKR_SECRET'],
      callbackURL: 'http://www.trailimage.com/auth/flickr',
      token: {
         access: process.env['FLICKR_ACCESS_TOKEN'],
         secret: process.env['FLICKR_TOKEN_SECRET'],
         request: null
      }
   }
};

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
      client.getSetInfo(config.featureSets[0].id).then(json => {
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
         config.photoSize.post.forEach(s => {
            // should retrieve all size URLs needed to display post
            expect(json.photo[0]).to.include.keys(s);
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
         expect(json[0]).to.include.keys('url');
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
         expect(json[0]).toHaveProperty('owner', config.flickr.userID);
      }),
   longTimeout
);
