import fetch from 'node-fetch';
import { useFetch } from '@toba/test';

useFetch(fetch);

export { MockAuth as OAuth } from '@toba/test';
