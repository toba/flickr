import { Client as AuthClient } from '@toba/oauth';
import { call, parse, parameterize } from './api';
//import { config } from './client.testskip';
import { Url, Method } from './constants';
import { Flickr } from './types';

const config = {
   appID: '72157631007435048',
   userID: '60950751@N04',
   excludeSets: ['72157631638576162'],
   excludeTags: [
      'Idaho',
      'United States of America',
      'Abbott',
      'LensTagger',
      'Boise'
   ],
   featureSets: [{ id: '72157632729508554', title: 'Ruminations' }],
   maxRetries: 10,
   retryDelay: 300,
   useCache: false,
   searchPhotoSizes: [Flickr.SizeUrl.Large1024],
   setPhotoSizes: [Flickr.SizeUrl.Large1024],
   auth: {
      apiKey: 'apiKey',
      secret: 'secret',
      callback: 'http://www.trailimage.com/auth/flickr',
      token: {
         access: 'access token',
         secret: 'token secret',
         request: null
      }
   }
};

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
