import { FlickrClient, ClientConfig } from './client';
import { Flickr } from './types';

jest.unmock('./api');
jest.unmock('./client');

let client: FlickrClient;

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

test('retrieves all collections', async () => {
   const collections = await client.getCollections();
   expect(collections).toBeInstanceOf(Array);
});

test('catches non-existent set request', () =>
   client.getSetInfo('45').catch(error => {
      expect(error).toBe('Flickr photosets.getInfo failed for photoset_id 45');
   }));

test('retrieves set information', async () => {
   const setInfo = await client.getSetInfo(featureSetID);
   expect(setInfo.id).toBe(config.featureSets[0].id);
});

test('retrieves set photos', async () => {
   const res = await client.getSetPhotos(config.featureSets[0].id);
   expect(res).toHaveProperty('id', config.featureSets[0].id);
   expect(res.photo).toBeInstanceOf(Array);
   config.setPhotoSizes.forEach(s => {
      // should retrieve all size URLs needed to display post
      expect(res.photo[0]).toHaveProperty(s);
   });
});

test('retrieves photo EXIF', async () => {
   const exif = await client.getExif(featurePhotoID);
   expect(exif).toBeInstanceOf(Array);
});

test('retrieves photo sizes', async () => {
   const sizes = await client.getPhotoSizes(featurePhotoID);
   expect(sizes).toBeInstanceOf(Array);
   expect(sizes[0]).toHaveProperty('url');
});

test('retrieves all photo tags', async () => {
   const tags = await client.getAllPhotoTags();
   expect(tags).toBeInstanceOf(Array);
});

test('retrieves photo context', async () => {
   const context = await client.getPhotoContext(featurePhotoID);
   expect(context).toBeInstanceOf(Array);
   expect(context[0]).toHaveProperty('id', featureSetID);
});

test('searches for photos', async () => {
   const matches = await client.photoSearch('horse');
   expect(matches).toBeInstanceOf(Array);
   expect(matches[0]).toHaveProperty('owner', config.userID);
});
