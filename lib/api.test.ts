import {
   call,
   parse,
   parameterize,
   failResponse,
   basicRequest,
   signedRequest,
   Request,
   Identity
} from './api';
import { config } from './client.test';
import { Url, Method } from './constants';
import { Flickr } from './types';
import { merge } from '@toba/utility';
import { log } from '@toba/logger';
import { Client as AuthClient } from '@toba/oauth';

const key = 'mockKey';
const logMock = jest.fn();
const responseHandler = jest.fn();
const mockID: Identity = { value: 'user-name', type: Flickr.TypeName.User };
const mockRequest: Request<Flickr.Collection[]> = {
   parse: r => r.collections.collection,
   allowCache: false,
   auth: new AuthClient(
      Url.RequestToken,
      Url.AccessToken,
      config.auth.apiKey,
      config.auth.secret,
      '1.0A',
      config.auth.callback,
      'HMAC-SHA1'
   )
};
let logWithColor: boolean;

console.log = logMock;

// remove color codes since they complicate the snapshots
beforeAll(() => {
   logWithColor = log.config.color;
   log.update({ color: false });
});
beforeEach(() => logMock.mockClear());
afterAll(() => {
   log.update({ color: logWithColor });
});

test('builds request parameters', () => {
   const url = parameterize(Method.Collections, mockID, mockRequest, config);

   expect(url).toBe(
      `?api_key=${config.auth.apiKey}&format=json&nojsoncallback=1&method=${
         Method.Prefix
      }${Method.Collections}&user_id=user-name`
   );
});

test('curries basic HTTP get method', () => {
   const url = parameterize(Method.Collections, mockID, mockRequest, config);
   const getter = basicRequest(url);

   expect(getter).toBeInstanceOf(Function);

   return getter().then(body => {
      expect(typeof body).toBe('string');
   });
});

test.skip('curries signed HTTP get method', () => {
   const url = parameterize(Method.Collections, mockID, mockRequest, config);
   const getter = signedRequest(url, mockRequest.auth, config.auth.token);

   expect(getter).toBeInstanceOf(Function);

   return getter().then(body => {
      expect(body).toBeInstanceOf(String);
   });
});

test('parses response body', () => {
   const notFound: Flickr.Response = {
      stat: Flickr.Status.Failed,
      message: 'thing not found'
   };
   // empty body should fail with retry option
   expect(parse(null, key)).toEqual(failResponse);
   // html body should also fail
   expect(parse('<html>whatever</html>', key)).toEqual(failResponse);
   // non-JSON should fail
   expect(parse('not json', key)).toEqual(failResponse);
   // Flickr IDs that can't be found shouldn't be retried
   expect(parse(JSON.stringify(notFound), key)).toEqual(
      merge(notFound, { retry: false })
   );

   //expect(logMock).toMatchSnapshot();
});

test('converts response to objects', () =>
   call(
      Method.Collections,
      { type: Flickr.TypeName.User, value: '' },
      { parse: r => r },
      config
   ).then((res: Flickr.Response) => {
      expect(res).toHaveProperty('stat', Flickr.Status.Okay);
      expect(res).toHaveProperty('collections');
      expect(res.collections).toHaveProperty('collection');
      expect(res.collections.collection).toBeInstanceOf(Array);
   }));
