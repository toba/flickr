import '@toba/test';
import { merge, ValueType } from '@toba/tools';
import { AuthClient, SigningMethod } from '@toba/oauth';
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
import { testConfig } from './.test-data';
import { Url, Method } from './constants';
import { Flickr } from './types';

const key = 'mockKey';
const mockID: Identity = { value: 'user-name', type: Flickr.TypeName.User };
const mockRequest: Request<Flickr.Collection[]> = {
   select: r => (r.collections === undefined ? [] : r.collections.collection),
   allowCache: false,
   auth: new AuthClient(
      Url.RequestToken,
      Url.AccessToken,
      testConfig.auth.apiKey,
      testConfig.auth.secret,
      '1.0A',
      testConfig.auth.callback,
      SigningMethod.HMAC
   ),
   error: undefined
};
const collectionsURL = parameterize(
   Method.Collections,
   mockID,
   mockRequest,
   testConfig
);

function expectCollection(res: Flickr.Response): void {
   expect(res).toHaveProperty('stat', Flickr.Status.Okay);
   expect(res).toHaveProperty('collections');
   expect(res.collections).toHaveProperty('collection');
   expect(res.collections!.collection).toBeInstanceOf(Array);
}

test('Builds request parameters', () => {
   const url = parameterize(
      Method.Collections,
      mockID,
      mockRequest,
      testConfig
   );

   expect(url).toBe(
      `?api_key=${testConfig.auth.apiKey}&format=json&nojsoncallback=1&method=${Method.Prefix}${Method.Collections}&user_id=user-name`
   );
});

test('Curries basic HTTP get method', () => {
   const getter = basicRequest(collectionsURL);

   expect(getter).toBeInstanceOf(Function);

   return getter().then(body => {
      expect(typeof body).toBe(ValueType.String);
      expectCollection(JSON.parse(body));
   });
});

test('Curries signed HTTP get method', () => {
   const getter = signedRequest(
      collectionsURL,
      mockRequest.auth,
      testConfig.auth.token
   );

   expect(getter).toBeInstanceOf(Function);

   return getter().then(body => {
      expect(typeof body).toBe(ValueType.String);
      expectCollection(JSON.parse(body));
   });
});

test('Parses response body', () => {
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
   // expect(logMock).toHaveBeenCalledTimes(4);

   // logMock.mock.calls.forEach(params => {
   //    expect(params[0]).toContain('[Error]');
   // });
});

test('Converts response to objects', () =>
   call(
      Method.Collections,
      { type: Flickr.TypeName.User, value: '' },
      { select: r => r },
      testConfig
   ).then(expectCollection));
