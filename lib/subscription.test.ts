import { Time } from '@toba/tools';
import { FlickrClient } from '../';
import { testConfig } from './client.test';
import {
   ChangeSubscription,
   EventType,
   hasChanged,
   WatchMap,
   watchPhotos
} from './subscription';
import { watch } from 'fs';

let client: FlickrClient;

const featureSetID = testConfig.featureSets[0].id;
const featurePhotoID = '8459503474';

beforeEach(() => {
   console.debug = jest.fn();
   testConfig.useCache = true;
   client = new FlickrClient(testConfig);
});

test('rejects unreasonable poll interval', () => {
   const s = new ChangeSubscription(null);
   s.add(null, Time.Second);
   expect(s).toBeDefined();
});

test('emits events', () => {
   const sub = new ChangeSubscription(client);
   const watchMock = jest.fn();
   const changeMock = jest.fn();

   sub.addEventListener(EventType.NewWatcher, watchMock);
   sub.add(changeMock);

   expect(watchMock).toHaveBeenCalledTimes(1);
   expect(changeMock).toHaveBeenCalledTimes(0);
});

test('identifies changes in watch maps', () => {
   const original: WatchMap = {
      one: { lastUpdate: 15 },
      two: { lastUpdate: 20 }
   };
   const same: WatchMap = {
      one: { lastUpdate: 15 },
      two: { lastUpdate: 20 }
   };
   const updated: WatchMap = {
      one: { lastUpdate: 15 },
      two: { lastUpdate: 21 }
   };
   const removed: WatchMap = {
      one: { lastUpdate: 15 }
   };
   const added: WatchMap = {
      one: { lastUpdate: 15 },
      two: { lastUpdate: 21 },
      three: { lastUpdate: 30 }
   };

   expect(hasChanged(original, same)).toBe(false);
   expect(hasChanged(original, updated)).toBe(true);
   expect(hasChanged(original, removed)).toBe(true);
   expect(hasChanged(original, added)).toBe(true);
});

test('creates map of watched photos', async () => {
   const res = await client.getSetPhotos(featureSetID);
   const map = watchPhotos(res.photo);

   expect(map).toHaveProperty('8459503474');
   expect(map['8459503474'].lastUpdate).toBe(1451765167);
});

test('the thing', async () => {
   jest.useFakeTimers();
   const sub = new ChangeSubscription(client);
   const watcher = jest.fn();

   sub.add(watcher);

   const collections = await client.getCollections();
   const info = await client.getSetInfo(featureSetID);
   const photos = await client.getSetPhotos(featureSetID);

   sub.updateCollections(...collections);
   sub.updateSet(featureSetID, parseInt(info.date_update));
   sub.updateSet(featureSetID, photos);

   expect(watcher).toHaveBeenCalledTimes(0);
   expect(sub.changes).toEqual({ collections: [], sets: [] });
   expect(sub.watched).toEqual({
      collections: [],
      sets: ['72157632729508554']
   });

   jest.runAllTimers();
});
