import * as fs from 'fs';
import { Identity, Request } from '../api';
import { ClientConfig } from '../client';
import { Method } from '../constants';

export const api = jest.genMockFromModule('../api.ts');

export const call = <T>(
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
