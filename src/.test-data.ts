import { ClientConfig } from './config';
import { Flickr } from './types';

export const setID = '72157632729508554';
export const photoID = '8459503474';
export const testConfig: ClientConfig = {
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
   timeZoneOffset: -1,
   setPhotoSizes: [Flickr.SizeCode.Large1024],
   useCache: false,
   maxRetries: 1,
   auth: {
      apiKey: 'FLICKR_API_KEY',
      secret: 'FLICKR_SECRET',
      callback: 'http://www.trailimage.com/auth/flickr',
      token: {
         access: 'FLICKR_ACCESS_TOKEN',
         secret: 'FLICKR_TOKEN_SECRET',
         request: undefined
      }
   }
};
