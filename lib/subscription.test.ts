import { Time } from '@toba/tools';
import { FlickrClient } from '../';
import { testConfig } from './client.test';
import { ChangeSubscription } from './subscription';

let client: FlickrClient;

const featureSetID = testConfig.featureSets[0].id;
const featurePhotoID = '8459503474';

beforeAll(() => {
   client = new FlickrClient(testConfig);
});

test('rejects unreasonable poll interval', () => {
   const s = new ChangeSubscription(null);
   s.add(null, Time.Second);
   expect(s).toBeDefined();
});

test('the thing', async () => {
   jest.useFakeTimers();
   const fn = jest.fn();
   await Promise.all([
      client.getCollections(),
      client.getSetInfo(featureSetID),
      client.getSetPhotos(featureSetID)
   ]);
   client.subscribe(fn);
   expect(fn).toBeDefined();
});
