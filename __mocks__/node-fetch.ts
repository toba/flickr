import * as fs from 'fs';
import { parse } from 'url';
import { Request, RequestInit, Response } from 'node-fetch';
import { Method } from '../lib/constants';

class MockResponse extends Response {
   plainText: string;

   constructor(body: string) {
      super();
      this.plainText = body;
   }
   text(): Promise<string> {
      return Promise.resolve(this.plainText);
   }
}

export default function fetch(
   url: string | Request,
   init?: RequestInit
): Promise<MockResponse> {
   return new Promise((resolve, reject) => {
      const link = parse(url.toString(), true);
      const fileName = `${__dirname}/${link.query['method']}.json`;

      fs.readFile(fileName, (err, data) => {
         if (err === null) {
            resolve(new MockResponse(data.toString()));
         } else {
            reject(err);
         }
      });
   });
}
