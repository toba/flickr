const store: { [key: string]: any } = {};

export const cache = {
   add<T>(method: string, id: string, value: T): void {
      store[key(method, id)] = value;
   },

   get<T>(method: string, id: string): Promise<T> {
      return Promise.resolve(store[key(method, id)] as T);
   },

   remove(method: string, id: string): void {
      delete store[key(method, id)];
   },

   clear(): void {
      store = {};
   }
};

const key = (method: string, id: string) => method + ':' + id;
