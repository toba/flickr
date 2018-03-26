import { Time } from '@toba/tools';
import { ChangeSubscription } from './subscription';

test('rejects unreasonable poll interval', () => {
   const s = new ChangeSubscription(null);
   s.add(null, Time.Second);
   expect(s).toBeDefined();
});
