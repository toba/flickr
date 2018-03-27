import {
   EventEmitter,
   Time,
   is,
   addUnique,
   durationString,
   listDifference
} from '@toba/tools';
import { log } from '@toba/logger';
import { Flickr, FlickrClient } from '../';

const defaultPollInterval = Time.Minute * 5;

/**
 * Set and collection IDs that have been added, removed or changed.
 */
export interface Changes {
   sets: string[];
   collections: string[];
}

export enum EventType {
   /** A set or collection has changed. */
   Change,
   /** A new watcher has subscribed to changes. */
   NewWatcher
}

/**
 * Collection IDs mapped to Set IDs used to detect changes.
 */
type SetCollections = { [key: string]: string[] };

/**
 * Flickr item that is being watched for changes.
 */
interface Watched {
   lastUpdate: number;
}

export type WatchMap = { [key: string]: Watched };

/**
 * Sets are the primary watch target. They can their child photos and parent
 * collections.
 */
interface WatchedSet extends Watched {
   collections: string[];
   photos: WatchMap;
}

/**
 * Create map of watched photos. To work as expected, extra parameter
 * `Flickr.Extra.DateUpdated` must be sent with `getSetPhotos`.
 */
export const watchPhotos = (photos: Flickr.PhotoSummary[]): WatchMap =>
   photos.reduce(
      (hash, p) => {
         hash[p.id] = {
            lastUpdate: parseInt(p.lastupdate)
         };
         return hash;
      },
      {} as WatchMap
   );

/**
 * Whether a map of watched items has changed.
 */
export function hasChanged(older: WatchMap, newer: WatchMap): boolean {
   const oldKeys = Object.keys(older);

   if (oldKeys.length !== Object.keys(newer).length) {
      return true;
   }

   let changed = false;

   oldKeys.forEach(key => {
      if (!is.defined(newer, key)) {
         changed = true;
         return;
      }
      if (
         older[key].lastUpdate != 0 &&
         older[key].lastUpdate < newer[key].lastUpdate
      ) {
         changed = true;
         return;
      }
   });

   return changed;
}

/**
 * Create list of all collections a set belongs to either directly or
 * ancestrally.
 *
 * @param parentIDs Collection IDs to which the current collections belong
 */
export function addSetCollections(
   collections: Flickr.Collection[],
   sets: SetCollections = {},
   ...parentIDs: string[]
): SetCollections {
   collections.forEach(c => {
      if (is.array(c.set)) {
         c.set.forEach(s => {
            if (!is.defined(sets, s.id)) {
               sets[s.id] = [];
            }
            addUnique(sets[s.id], c.id, ...parentIDs);
         });
      }
      if (is.array(c.collection)) {
         // recurse into child collections
         sets = addSetCollections(
            c.collection,
            sets,
            ...parentIDs.concat(c.id)
         );
      }
   });
   return sets;
}

/**
 * Sets are considered changed when any one of:
 * - last update time changes
 * - photo is added or removed
 * - photo update time changes
 *
 * Flickr does not roll-up change times. An updated photo does not cause its
 * containing set to show as updated, nor does an updated set cause its
 * containing collection to show updated.
 */
export class ChangeSubscription extends EventEmitter<EventType, any> {
   client: FlickrClient;
   changeTimer: number;
   /** Changes accumulated but not yet emitted. */
   changes: Changes;
   /** Frequency at which to query for changes. */
   pollInterval = defaultPollInterval;
   /** Whether there are any change subscribers. */
   active = false;
   watched: { [key: string]: WatchedSet };

   constructor(client: FlickrClient) {
      super();
      this.client = client;
      this.watched = {};
      this.changes = { sets: [], collections: [] };
   }

   /**
    * Retrieve photo set watcher, initializing if needed.
    */
   private photoSetWatcher(id: string) {
      if (!is.defined(this.watched, id)) {
         this.watched[id] = {
            lastUpdate: 0,
            collections: [],
            photos: {}
         };
      }
      return this.watched[id];
   }

   /**
    * Generate unique list of collection IDs that contain different sets
    * between this and previous update.
    */
   updateCollections(...collections: Flickr.Collection[]) {
      /** Collection IDs that different between set versions */
      const collectionDiff: string[] = [];
      const changedSets: string[] = [];
      /** List of collection IDs matched to set IDs */
      const sets = addSetCollections(collections);

      Object.keys(sets).forEach(id => {
         const setWatcher = this.photoSetWatcher(id);
         const diff = listDifference(sets[id], setWatcher.collections);

         if (diff.length > 0) {
            // track changes and update watch list
            addUnique(collectionDiff, diff);
            changedSets.push(id);
            setWatcher.collections = sets[id];
         }
      });

      if (collectionDiff.length > 0) {
         addUnique(this.changes.collections, ...collectionDiff);
         addUnique(this.changes.sets, ...changedSets);
      }
   }

   updateSet(id: string, photos: Flickr.SetPhotos): void;
   updateSet(id: string, lastUpdate: number): void;
   updateSet(id: string, p2: number | Flickr.SetPhotos) {
      const set = this.photoSetWatcher(id);
      let changed = false;

      if (is.number(p2)) {
         if (this.active) {
            changed = set.lastUpdate !== 0 && p2 > set.lastUpdate;
         }
         set.lastUpdate = p2;
      } else {
         const photos = watchPhotos(p2.photo);
         if (this.active) {
            changed =
               Object.keys(set.photos).length > 0 &&
               hasChanged(set.photos, photos);
         }
         set.photos = photos;
      }

      if (changed) {
         // accumulate change IDs to be emitted together
         this.changes.sets.push(id);
         this.changes.collections.push(...set.collections);
      }
   }

   /**
    * Query for changes to photos, sets or collections.
    */
   private queryChange() {
      if (this.changeTimer) {
         clearTimeout(this.changeTimer);
      }

      const keys = Object.keys(this.watched);
      const photos: Promise<any>[] = keys.map(id =>
         this.client.getSetPhotos(id, [Flickr.Extra.DateUpdated], false)
      );
      const info: Promise<any>[] = keys.map(id =>
         this.client.getSetInfo(id, false)
      );
      const collections = this.client.getCollections(false);

      //return Promise.all([...photos, ...info, collections]).then(() => {
      return Promise.all([collections]).then(() => {
         this.emitChange();
         this.changeTimer = setTimeout(
            this.queryChange.bind(this),
            this.pollInterval
         );
      });
   }

   /**
    * Emit change and reset accumulated IDs.
    */
   private emitChange() {
      if (this.changes.sets.length > 0 || this.changes.collections.length > 0) {
         this.emit(EventType.Change, this.changes);
         log.info(
            `Flickr sets [${this.changes.sets.join()}] or collections [${this.changes.collections.join()}] changed`
         );
         this.changes = { sets: [], collections: [] };
      }
   }

   /**
    * Add subscriber to receive change notifications.
    *
    * @param pollInterval Milliseconds between queries for change
    */
   add(
      fn: (change: Changes) => void,
      pollInterval: number = defaultPollInterval
   ) {
      if (pollInterval < Time.Second * 20) {
         // disallow rapid polling
         log.warn(
            `Poll interval of ${durationString(
               pollInterval
            )} is invalid; reverting to ${durationString(defaultPollInterval)}.`
         );
         pollInterval = defaultPollInterval;
      }
      this.pollInterval = pollInterval;
      this.active = true;
      this.subscribe(EventType.Change, fn);
      this.emit(EventType.NewWatcher);
      this.changeTimer = setTimeout(this.queryChange.bind(this), pollInterval);
   }
}
