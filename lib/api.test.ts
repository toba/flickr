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
import { merge, is } from '@toba/utility';
import { log } from '@toba/logger';
// this should automatically select mock implementation but isn't
//import { Client as AuthClient } from '@toba/oauth';
import { Client as AuthClient } from '../__mocks__/@toba/oauth';

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
const collectionsURL = parameterize(
   Method.Collections,
   mockID,
   mockRequest,
   config
);
let logWithColor: boolean;

console.log = logMock;

function expectCollection(res: Flickr.Response): void {
   expect(res).toHaveProperty('stat', Flickr.Status.Okay);
   expect(res).toHaveProperty('collections');
   expect(res.collections).toHaveProperty('collection');
   expect(res.collections.collection).toBeInstanceOf(Array);
}

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
   const getter = basicRequest(collectionsURL);

   expect(getter).toBeInstanceOf(Function);

   return getter().then(body => {
      expect(typeof body).toBe(is.Type.String);
      expectCollection(JSON.parse(body));
   });
});

test('curries signed HTTP get method', () => {
   const getter = signedRequest(
      collectionsURL,
      mockRequest.auth,
      config.auth.token
   );

   expect(getter).toBeInstanceOf(Function);

   return getter().then(body => {
      expect(typeof body).toBe(is.Type.String);
      expectCollection(JSON.parse(body));
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
   expect(logMock).toHaveBeenCalledTimes(4);

   logMock.mock.calls.forEach(params => {
      expect(params[0]).toContain('[Error]');
   });
});

test('converts response to objects', () =>
   call(
      Method.Collections,
      { type: Flickr.TypeName.User, value: '' },
      { parse: r => r },
      config
   ).then(expectCollection));
