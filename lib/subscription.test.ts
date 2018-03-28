import { Time } from '@toba/tools';
import { log } from '@toba/logger';
import { FlickrClient } from '../';
import { testConfig } from './client.test';
import {
   ChangeSubscription,
   EventType,
   hasChanged,
   WatchMap,
   mapSetPhotos,
   Changes,
   mapSetCollections
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

test('creates map of collections per set', async () => {
   const collections = await client.getCollections();
   const sets = mapSetCollections(collections);

   expect(sets).toMatchSnapshot();
   expect(Object.keys(sets)).toHaveLength(167);
   expect(sets).toHaveProperty('72157658347054114');
   expect(sets['72157658347054114']).toBeInstanceOf(Array);
   expect(sets['72157658347054114']).toHaveLength(8);
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
   const map = mapSetPhotos(res.photo);

   expect(map).toHaveProperty('8459503474');
   expect(map['8459503474'].lastUpdate).toBe(1451765167);
});

test('polls for data changes', async done => {
   jest.useFakeTimers();
   jest.setTimeout(Time.Minute * 1);
   const photoID = '8458410907';
   const collectionID = '60918612-72157663268880026';
   const sub = client.subscription;
   const watcher = (changes: Changes) => {
      expect(changes).toEqual(expectedChange);
      simulateNextChange();
   };
   const noChange: Changes = {
      collections: [],
      sets: []
   };
   const simulatedChanges: (() => void)[] = [
      () => {
         // trigger change by adding collection and making older photo update
         watchedSet.photos[photoID].lastUpdate -= 10;
         watchedSet.collections.push(collectionID);
         expectedChange = {
            collections: [collectionID],
            sets: [featureSetID]
         };
      },
      () => {
         // trigger change by making older set update
         watchedSet.lastUpdate -= 10;
         expectedChange = {
            collections: [collectionID],
            sets: [featureSetID]
         };
      },
      () => {
         // trigger no change
         expectNoChange = true;
      },
      () => {
         // trigger change by removing collection
         watchedSet.collections = [];
         expectedChange = {
            collections: [collectionID],
            sets: [featureSetID]
         };
      },
      () => {
         // trigger change by removing photo
         delete watchedSet.photos[photoID];
         expectedChange = {
            collections: [],
            sets: [featureSetID]
         };
      }
   ];

   let expectedChange: Changes = noChange;
   let expectNoChange = false;

   const simulateNextChange = () => {
      if (simulatedChanges.length > 0) {
         process.nextTick(() => {
            const fn = simulatedChanges.shift();
            // nextTick ensures subscription clears changes and sets next timer
            expect(sub.changes).toEqual(noChange);
            expect(sub.changeTimer).toBeDefined();
            fn();
            // now run out the timer to trigger handler
            jest.runAllTimers();
         });
      } else {
         done();
      }
   };

   // shouldn't be active before first watcher
   expect(sub.active).toBe(false);
   expect(sub.changeTimer).not.toBeDefined();

   sub.add(watcher, Time.Minute * 2);
   sub.addEventListener(EventType.NoChange, () => {
      if (expectNoChange) {
         expectNoChange = false;
         simulateNextChange();
      } else {
         throw Error('Change expected but none found');
      }
   });

   expect(sub.active).toBe(true);
   expect(sub.changeTimer).toBeDefined();

   await client.getCollections();
   await client.getSetInfo(featureSetID);
   await client.getSetPhotos(featureSetID);

   expect(sub.changes).toEqual(noChange);
   expect(sub.watched).toMatchSnapshot();
   expect(sub.watched).toHaveProperty(featureSetID);

   const watchedSet = sub.watched[featureSetID];

   expect(Object.keys(watchedSet.photos)).toHaveLength(13);
   expect(watchedSet.photos).toHaveProperty(photoID);
   // feature photo set is not in any collections
   expect(watchedSet.collections).toHaveLength(0);
   expect(watchedSet.photos[photoID].lastUpdate).toBe(1451765387);

   process.nextTick(simulateNextChange);
});
