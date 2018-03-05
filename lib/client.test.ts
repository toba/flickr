import { FlickrClient, ClientConfig } from './client';
import { Flickr } from './types';

jest.unmock('./api');
jest.unmock('./client');
jest.unmock('@toba/oauth');

let client: FlickrClient;
const longTimeout = 5000;

export const config: ClientConfig = {
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
   setPhotoSizes: [Flickr.SizeUrl.Large1024],
   useCache: false,
   auth: {
      apiKey: 'FLICKR_API_KEY',
      secret: 'FLICKR_SECRET',
      callback: 'http://www.trailimage.com/auth/flickr',
      token: {
         access: 'FLICKR_ACCESS_TOKEN',
         secret: 'FLICKR_TOKEN_SECRET',
         request: null
      }
   }
};

const featureSetID = config.featureSets[0].id;
const featurePhotoID = '8459503474';

beforeAll(() => {
   client = new FlickrClient(config);
});

test('retrieves all collections', () =>
   client.getCollections().then(json => {
      expect(json).toBeInstanceOf(Array);
   }));

test('catches non-existent set request', () =>
   client.getSetInfo('45').catch(error => {
      expect(error).toBe('Flickr photosets.getInfo failed for photoset_id 45');
   }));

test('retrieves set information', () =>
   client.getSetInfo(featureSetID).then(json => {
      expect(json.id).toBe(config.featureSets[0].id);
   }));

test('retrieves set photos', () =>
   client.getSetPhotos(config.featureSets[0].id).then(json => {
      expect(json).toHaveProperty('id', config.featureSets[0].id);
      expect(json.photo).toBeInstanceOf(Array);
      config.setPhotoSizes.forEach(s => {
         // should retrieve all size URLs needed to display post
         expect(json.photo[0]).toHaveProperty(s);
      });
   }));

// test(
//    'retrieves photo EXIF',
//    () =>
//       client.getExif(featurePhotoID).then(json => {
//          expect(json).toBeInstanceOf(Array);
//       })
// );

test('retrieves photo sizes', () =>
   client.getPhotoSizes(featurePhotoID).then(json => {
      expect(json).toBeInstanceOf(Array);
      expect(json[0]).toHaveProperty('url');
   }));

// test(
//    'retrieves all photo tags',
//    () =>
//       client.getAllPhotoTags().then(json => {
//          expect(json).toBeInstanceOf(Array);
//       })
// );

// test(
//    'retrieves photo context',
//    () =>
//       client.getPhotoContext(featurePhotoID).then(json => {
//          expect(json).toBeInstanceOf(Array);
//          expect(json[0]).toHaveProperty('id', featureSetID);
//       })
// );

// test(
//    'searches for photos',
//    () =>
//       client.photoSearch('horse').then(json => {
//          expect(json).toBeInstanceOf(Array);
//          expect(json[0]).toHaveProperty('owner', config.userID);
//       })
// );
