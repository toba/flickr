import { Flickr } from './types';
import { Config as AuthConfig } from '@toba/oauth';

export interface FeatureSet {
   id: string;
   title: string;
}

export interface ClientConfig {
   userID: string;
   appID: string;
   /** Whether to cache API resuts */
   useCache?: boolean;
   /** Maximum number of responses to cache */
   maxCacheSize?: number;
   /** Optional set IDs to feature */
   featureSets?: FeatureSet[];
   /** Optional set IDs to exclude from results */
   excludeSets?: string[];
   /** Optional tags to exclude from tag request */
   excludeTags?: string[];
   /** Photo sizes to return from search request */
   searchPhotoSizes?: Flickr.SizeUrl[];
   /** Photo sizes to return for photo set request */
   setPhotoSizes?: Flickr.SizeUrl[];
   /** Number of times to retry failed requests */
   maxRetries?: number;
   /** Milliseconds to wait before retrying failed request */
   retryDelay?: number;
   /** https://www.flickr.com/services/api/auth.oauth.html */
   auth: AuthConfig;
}

export const defaultConfig: ClientConfig = {
   userID: null,
   appID: null,
   useCache: false,
   maxCacheSize: 200,
   featureSets: [],
   excludeSets: [],
   excludeTags: [],
   searchPhotoSizes: [Flickr.SizeUrl.Large1024],
   setPhotoSizes: [Flickr.SizeUrl.Large1024],
   maxRetries: 3,
   retryDelay: 500,
   auth: null
};
