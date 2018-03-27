import { Time } from '@toba/tools';
import { log } from '@toba/logger';
import { sleep } from '@toba/test';
import { FlickrClient } from '../';
import { testConfig } from './client.test';
import {
   ChangeSubscription,
   EventType,
   hasChanged,
   WatchMap,
   watchPhotos,
   Changes
} from './subscription';

let client: FlickrClient;
let logWithColor: boolean;

const logMock = jest.fn();
const featureSetID = testConfig.featureSets[0].id;

beforeAll(() => {
   console.log = logMock;
   logWithColor = log.config.color;
   log.update({ color: false });
});
beforeEach(() => {
   logMock.mockClear();
   testConfig.useCache = true;
   client = new FlickrClient(testConfig);
});
afterAll(() => {
   log.update({ color: logWithColor });
});

test('rejects unreasonable poll interval', () => {
   const warn = 'Poll interval of 1s is invalid; reverting to 5m.';
   const s = new ChangeSubscription(null);
   s.add(null, Time.Second);
   expect(logMock).toHaveBeenCalledTimes(1);
   expect(logMock).toHaveBeenCalledWith(
      `[Warn] ${warn} level=3 message=\"${warn}\"`
   );
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

test('polls for data changes', async done => {
   jest.useFakeTimers();
   const photoID = '8458410907';
   const collectionID = '60918612-72157663268880026';
   const sub = new ChangeSubscription(client);
   const watcher = jest.fn((changes: Changes) => {
      expect(sub.changes).toEqual(finalChange);
      done();
   });
   const noChange: Changes = {
      collections: [],
      sets: []
   };
   const finalChange: Changes = {
      collections: [collectionID],
      sets: [featureSetID]
   };

   // shouldn't be active before first watcher
   expect(sub.active).toBe(false);
   expect(sub.changeTimer).not.toBeDefined();

   sub.add(watcher, Time.Minute * 2);

   expect(sub.active).toBe(true);
   expect(sub.changeTimer).toBeDefined();

   const collections = await client.getCollections();
   const info = await client.getSetInfo(featureSetID);
   const photos = await client.getSetPhotos(featureSetID);

   sub.updateCollections(...collections);
   sub.updateSet(featureSetID, parseInt(info.date_update));
   sub.updateSet(featureSetID, photos);

   expect(watcher).toHaveBeenCalledTimes(0);
   expect(sub.changes).toEqual(noChange);
   expect(sub.watched).toMatchSnapshot();
   expect(sub.watched).toHaveProperty(featureSetID);

   const photoSetWatcher = sub.watched[featureSetID];

   expect(Object.keys(photoSetWatcher.photos)).toHaveLength(13);
   expect(photoSetWatcher.photos).toHaveProperty(photoID);
   // feature photo set is not in any collections
   expect(photoSetWatcher.collections).toHaveLength(0);
   expect(photoSetWatcher.photos[photoID].lastUpdate).toBe(1451765387);

   // mock older update time to trigger change detection
   photoSetWatcher.photos[photoID].lastUpdate -= 10;
   photoSetWatcher.collections.push(collectionID);

   // run down timer to trigger polling
   jest.runAllTimers();

   //expect(sub.changes).toEqual(finalChange);
   // expect(watcher).toHaveBeenCalledTimes(1);
   // expect(watcher).toHaveBeenCalledWith(finalChange);
});
