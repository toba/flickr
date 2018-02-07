import { cache } from './cache';

const m = 'method';
const id = 'id';

interface TestItem {
   key: string;
}

test('add item to cache', () => {
   cache.add(m, id, { key: 'value' } as TestItem);

   return cache.get<TestItem>(m, id).then(item => {
      expect(item.key).toBe('value');
   });
});
