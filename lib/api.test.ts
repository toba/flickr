import { Client as AuthClient } from '@toba/oauth';
import { call, parse, parameterize } from './api';
import { config } from './client.test';
import { Url, Method } from './constants';
import { Flickr } from './types';

//jest.mock('./api');

// const oauth = new AuthClient(
//    Url.RequestToken,
//    Url.AccessToken,
//    config.auth.apiKey,
//    config.auth.secret,
//    '1.0A',
//    config.auth.callback,
//    'HMAC-SHA1'
// );

test('builds request parameters', () => {
   const url = parameterize(
      Method.Collections,
      { value: 'user-name', type: Flickr.TypeName.User },
      {
         res: r => r.collections.collection,
         allowCache: false
      },
      config
   );

   expect(url).toBe(
      `?api_key=${config.auth.apiKey}&format=json&nojsoncallback=1&method=${
      Method.Prefix
      }${Method.Collections}&user_id=user-name`
   );
});

test('parses Flickr response', () =>
   call(
      Method.Collections,
      { type: Flickr.TypeName.User, value: '' },
      { res: r => r.collections.collection },
      config
   ).then(collections => {
      expect(collections).toBeInstanceOf(Array);
   }));
