import fetch from 'node-fetch';
import { oAuthGetWithFetch } from '@toba/test';

oAuthGetWithFetch(fetch);

export { MockAuth as OAuth } from '@toba/test';
