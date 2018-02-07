export const host = 'api.flickr.com';

export enum IdType { User = 'user_id', Set = 'photoset_id', Photo = 'photo_id' };

export enum Url {
   Base = '/services/rest/',
   RequestToken = 'http://www.flickr.com/services/oauth/request_token',
   Authorize = 'http://www.flickr.com/services/oauth/authorize',
   AccessToken = 'http://www.flickr.com/services/oauth/access_token',
   PhotoSet = 'http://www.flickr.com/photos/trailimage/sets/'
};

export const method = {
   COLLECTIONS: 'collections.getTree',
   photo: {
      EXIF: 'photos.getExif',
      SEARCH: 'photos.search',
      SETS: 'photos.getAllContexts',
      SIZES: 'photos.getSizes',
      TAGS: 'tags.getListUserRaw'
   },
   set: {
      INFO: 'photosets.getInfo',
      PHOTOS: 'photosets.getPhotos'
   }
};

export enum Extra {
   Description = 'description',
   Tags = 'tags',
   DateTaken = 'date_taken',
   Location = 'geo',
   PathAlias = 'path_alias'
};

export enum Size {
   Thumb = 'url_t',
   Square75 = 'url_sq',
   Square150 = 'url_q',
   Small240 = 'url_s',
   Small320 = 'url_n',
   Medium500 = 'url_m',
   Medium640 = 'url_z',
   Medium800 = 'url_c',
   Large1024 = 'url_l',
   Large1600 = 'url_h',
   Large2048 = 'url_k',
   Original = 'url_o'
};
