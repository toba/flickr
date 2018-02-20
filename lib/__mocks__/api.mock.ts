import * as fs from 'fs';
import { Identity, Request } from '../api';
import { ClientConfig } from '../client';
import { Method } from '../constants';
import { defaultRequest } from '../api';

export { parse, parameterize, defaultRequest } from '../api';

export const call = <T>(
   method: string,
   id: Identity,
   req: Request<T>,
   config: ClientConfig
): Promise<T> =>
   callAPI<T>(method, id, Object.assign(defaultRequest, req), config);

export const callAPI = <T>(
   method: string,
   _id: Identity,
   req: Request<T>,
   _config: ClientConfig
): Promise<T> =>
   new Promise((resolve, reject) => {
      fs.readFile(
         `${__dirname}/${Method.Prefix}${method}.json`,
         (err, data) => {
            if (err === null) {
               resolve(req.res(JSON.parse(data.toString())));
            } else {
               reject(err);
            }
         }
      );
   });
