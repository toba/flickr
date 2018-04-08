import '@toba/test';
import { Time } from '@toba/tools';
import { FlickrClient } from './client';
import { ClientConfig } from './config';
import { Flickr } from './types';

jest.unmock('./api');
jest.unmock('./client');

let client: FlickrClient;

export const testConfig: ClientConfig = {
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
   timeZoneOffset: -1,
   featureSets: [{ id: '72157632729508554', title: 'Ruminations' }],
   setPhotoSizes: [Flickr.SizeUrl.Large1024],
   useCache: false,
   maxRetries: 1,
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

const featureSetID = testConfig.featureSets[0].id;
const featurePhotoID = '8459503474';

beforeAll(() => {
   console.debug = jest.fn();
   client = new FlickrClient(testConfig);
});

test('Retrieves all collections', async () => {
   const collections = await client.getCollections();
   expect(collections).toBeInstanceOf(Array);
});

test('Catches non-existent set request', () =>
   client.getSetInfo('45').catch(error => {
      expect(error).toBe('Flickr photosets.getInfo failed for photoset_id 45');
   }));

test('Retrieves set information', async () => {
   const setInfo = await client.getSetInfo(featureSetID);
   expect(setInfo.id).toBe(testConfig.featureSets[0].id);
});

test('Retrieves set photos', async () => {
   const res: Flickr.SetPhotos = await client.getSetPhotos(featureSetID);
   expect(res).toHaveProperty('id', testConfig.featureSets[0].id);
   expect(res.photo).toBeInstanceOf(Array);
   testConfig.setPhotoSizes.forEach(s => {
      // should retrieve all size URLs needed to display post
      expect(res.photo[0]).toHaveProperty(s);
   });
});

test('Retrieves photo info', async () => {
   const info: Flickr.PhotoInfo = await client.getPhotoInfo(featurePhotoID);
   expect(info).toBeDefined();
   expect(info.dates.taken).toBe('2017-10-15 16:00:12');
   expect(info.location.accuracy).toBe(16);
});

test('Retrieves photo EXIF', async () => {
   const exif: Flickr.Exif[] = await client.getExif(featurePhotoID);
   expect(exif).toBeInstanceOf(Array);
});

test('Retrieves photo sizes', async () => {
   const sizes: Flickr.Size[] = await client.getPhotoSizes(featurePhotoID);
   expect(sizes).toBeInstanceOf(Array);
   expect(sizes[0]).toHaveProperty('url');
});

test('Retrieves all photo tags', async () => {
   const tags: Flickr.Tag[] = await client.getAllPhotoTags();
   expect(tags).toBeInstanceOf(Array);
});

test('Retrieves photo context', async () => {
   const context: Flickr.MemberSet[] = await client.getPhotoContext(
      featurePhotoID
   );
   expect(context).toBeInstanceOf(Array);
   expect(context[0]).toHaveProperty('id', featureSetID);
});

test('Searches for photos', async () => {
   const matches: Flickr.PhotoSummary[] = await client.photoSearch('horse');
   expect(matches).toBeInstanceOf(Array);
   expect(matches[0]).toHaveProperty('owner', testConfig.userID);
});

test('Supports simultaneous requests', () => {
   jest.setTimeout(Time.Second * 30);
   return Promise.all([
      client.getSetInfo(featurePhotoID),
      client.getSetPhotos(featureSetID),
      client.getCollections()
   ]).then(([info, photos, collections]) => {
      expect(info).toBeDefined();
      expect(photos).toBeDefined();
      expect(collections).toBeDefined();
   });
});
