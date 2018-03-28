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
 * Set and collection IDs that have been added, removed or changed, emitted as
 * change event payload.
 */
export interface Changes {
   sets: string[];
   collections: string[];
}

export enum EventType {
   /** A set or collection has changed. */
   Change,
   /** Polling found no data change -- useful for testing */
   NoChange,
   /** A new watcher has subscribed to changes. */
   NewWatcher
}

/**
 * Collection IDs mapped to Set IDs used to detect changes by comparing to the
 * previously collected `WatchMap`.
 */
type SetCollections = { [key: string]: string[] };

/**
 * Flickr item that is being watched for changes.
 */
interface Watched {
   /**
    * Last timestamp at which the item was updated. The value will be 0 if the
    * item hasn't been directly retrieved through the API, such as a set
    * identified as part of a collection but not itself loaded.
    */
   lastUpdate: number;
}

export type WatchMap = { [key: string]: Watched };

/**
 * Sets are the primary watch target.
 */
interface WatchedSet extends Watched {
   collections: string[];
   photos: WatchMap;
}

/**
 * Whether a map of watched items has changed. It is considered changed if it
 * contain a different number of items or an item has a newer update time.
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
 * Create map of watched photos. To work as expected, extra parameter
 * `Flickr.Extra.DateUpdated` must be sent with `getSetPhotos`.
 */
export const mapSetPhotos = (photos: Flickr.PhotoSummary[]): WatchMap =>
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
 * Create list of all collections a set belongs to either directly or
 * ancestrally.
 *
 * @param parentIDs Collection IDs to which the current collections belong
 */
export function mapSetCollections(
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
         sets = mapSetCollections(c.collection, sets, c.id, ...parentIDs);
      }
   });
   return sets;
}

/**
 * Poll the Flickr API to determine when sets or collections change.
 *
 * Collections are considered changed when any one of:
 * - set is added or removed
 * - child collection is added or removed
 *
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
   private watchedSet(id: string): WatchedSet {
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
      /** Collection IDs that differ between set versions */
      const collectionDiff: string[] = [];
      /** Sets that belong to changed collections */
      const changedSets: string[] = [];
      /** List of collection IDs matched to set IDs */
      const sets = mapSetCollections(collections);
      /** Only compare if collection sets were previously retrieved */
      const compare = Object.keys(this.watched).length > 0;
      const setIDs = Object.keys(sets);

      setIDs.forEach(id => {
         const watchedSet = this.watchedSet(id);

         if (compare) {
            const diff = listDifference(sets[id], watchedSet.collections);

            if (diff.length > 0) {
               // track changes and update watch list
               addUnique(collectionDiff, ...diff);
               if (watchedSet.lastUpdate > 0) {
                  // if set doesn't have update time then it hasn't been retrieved
                  changedSets.push(id);
               }
            }
         }
         watchedSet.collections = sets[id];
      });

      if (compare) {
         // find watched sets that were in a collection but are now in none, so
         // aren't listed in the current collections list
         Object.keys(this.watched).forEach(id => {
            const watchedSet = this.watched[id];
            if (setIDs.indexOf(id) == -1 && watchedSet.collections.length > 0) {
               changedSets.push(id);
               addUnique(collectionDiff, ...watchedSet.collections);
            }
         });
      }

      if (collectionDiff.length > 0) {
         addUnique(this.changes.collections, ...collectionDiff);
         addUnique(this.changes.sets, ...changedSets);
      }
   }

   updateSet(id: string, photos: Flickr.SetPhotos): void;
   updateSet(id: string, lastUpdate: number): void;
   updateSet(id: string, p2: number | Flickr.SetPhotos) {
      const set = this.watchedSet(id);
      let changed = false;

      if (is.number(p2)) {
         if (this.active) {
            changed = set.lastUpdate != 0 && p2 > set.lastUpdate;
         }
         set.lastUpdate = p2;
      } else {
         const photos = mapSetPhotos(p2.photo);
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

      /**
       * IDs of sets with an update timestamp. Those without a timestamp are
       * placeholders that haven't been loaded yet.
       */
      const setIDs = Object.keys(this.watched).filter(
         id => this.watched[id].lastUpdate > 0
      );
      const photos: Promise<any>[] = setIDs.map(id =>
         this.client.getSetPhotos(id, [Flickr.Extra.DateUpdated], false)
      );
      const info: Promise<any>[] = setIDs.map(id =>
         this.client.getSetInfo(id, false)
      );
      const collections = this.client.getCollections(false);

      return Promise.all([...info, ...photos, collections]).then(() => {
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
      } else {
         this.emit(EventType.NoChange);
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
