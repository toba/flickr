import { EventEmitter, Time, is } from '@toba/tools';
import { log } from '@toba/logger';
import { Flickr, FlickrClient } from '../';
import { debug } from 'util';

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
 * Flickr item that is being watched for changes.
 */
interface Watched {
   lastUpdate: number;
}

type WatchMap = { [key: string]: Watched };

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
const watchPhotos = (photos: Flickr.PhotoSummary[]): WatchMap =>
   photos.reduce(
      (hash, p) => {
         hash[p.id] = {
            lastUpdate: p.lastupdate
         };
         return hash;
      },
      {} as WatchMap
   );

/**
 * Whether a map of watched items has changed.
 */
function hasChanged(older: WatchMap, newer: WatchMap): boolean {
   const oldKeys = Object.keys(older);

   if (oldKeys.length !== Object.keys(newer).length) {
      return true;
   }

   oldKeys.forEach(key => {
      if (!is.defined(newer, key)) {
         return true;
      }
      if (
         older[key].lastUpdate !== 0 &&
         older[key].lastUpdate < newer[key].lastUpdate
      ) {
         return true;
      }
   });

   return false;
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
   changeTimer: NodeJS.Timer;
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
   private setWatcher(id: string) {
      if (!is.defined(this.watched, id)) {
         this.watched[id] = {
            lastUpdate: 0,
            collections: [],
            photos: {}
         };
      }
      return this.watched[id];
   }

   updateCollections(...collections: Flickr.Collection[]) {
      this.addCollections(collections);
   }

   /**
    * Add collection parent IDs to monitored sets, e.g. if c1 contains c2 which
    * contains a set then `set.collections = [c1, c2]`.
    */
   private addCollections(
      collections: Flickr.Collection[],
      ...parentIDs: string[]
   ) {
      collections.forEach(c => {
         const parents = parentIDs.concat(c.id);
         if (is.array(c.set)) {
            c.set.forEach(s => {
               this.setWatcher(s.id).collections.push(...parents);
            });
         }
         if (is.array(c.collection)) {
            this.addCollections(c.collection, ...parents);
         }
      });
   }

   updateSet(id: string, photos: Flickr.SetPhotos): void;
   updateSet(id: string, lastUpdate: number): void;
   updateSet(id: string, p2: number | Flickr.SetPhotos) {
      const set = this.setWatcher(id);
      let changed = false;

      if (is.number(p2)) {
         if (this.active) {
            changed = set.lastUpdate !== 0 && p2 > set.lastUpdate;
         }
         set.lastUpdate = p2;
      } else {
         debugger;
         const photos = watchPhotos(p2.photo);
         if (this.active) {
            changed = hasChanged(set.photos, photos);
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

      return Promise.all(
         Object.keys(this.watched).map(id =>
            this.client.getSetPhotos(id, [Flickr.Extra.DateUpdated], false)
         )
      ).then(photos => {
         this.emitChange();
         this.changeTimer = setTimeout(this.queryChange, this.pollInterval);
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
    */
   add(
      fn: (change: Changes) => void,
      pollInterval: number = defaultPollInterval
   ) {
      if (pollInterval < Time.Second * 20) {
         // disallow rapid polling
         log.warn(
            `Poll interval of ${pollInterval}ms is invalid; reverting to ${defaultPollInterval}ms.`
         );
         pollInterval = defaultPollInterval;
      }
      this.pollInterval = pollInterval;
      this.active = true;
      this.subscribe(EventType.Change, fn);
      this.emit(EventType.NewWatcher);
      this.changeTimer = setTimeout(this.queryChange, pollInterval);
   }
}
