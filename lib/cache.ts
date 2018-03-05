import { Cache } from '@toba/tools';
import { makeKey as key } from './api';

const store = new Cache<any>();

export const cache = {
   add<T>(method: string, id: string, value: T): void {
      store.add(key(method, id), value);
   },

   get<T>(method: string, id: string): Promise<T> {
      return Promise.resolve(store.get(key(method, id)) as T);
   },

   remove(method: string, id: string): void {
      store.remove(key(method, id));
   },

   clear(): void {
      store.clear();
   },

   /**
    * Set the maximum number of items allowed in cache.
    */
   maxItems(count: number): void {
      store.updatePolicy({ maxItems: count });
   }
};
