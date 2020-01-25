import '@toba/test'
import { cache } from './cache'

const m = 'method'
const id = 'id'

interface TestItem {
   key: string
}

test('Adds items to cache', async () => {
   cache.add(m, id, { key: 'value' } as TestItem)
   const item = await cache.get<TestItem>(m, id)
   expect(item.key).toBe('value')
})
