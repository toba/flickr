import { cache } from './cache';

const m = 'method';
const id = 'id';

test('add item to cache', () => {
   cache.add(m, id, { key: 'value' });

   return cache.get(m, id).then(item => {
      expect(item.key).toBe('value');
   });
});
