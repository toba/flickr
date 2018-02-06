export const host = 'api.flickr.com';

export const type = { USER: 'user_id', SET: 'photoset_id', PHOTO: 'photo_id' };

export const url = {
   BASE: '/services/rest/',
   REQUEST_TOKEN: 'http://www.flickr.com/services/oauth/request_token',
   AUTHORIZE: 'http://www.flickr.com/services/oauth/authorize',
   ACCESS_TOKEN: 'http://www.flickr.com/services/oauth/access_token',
   PHOTO_SET: 'http://www.flickr.com/photos/trailimage/sets/'
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

export const extra = {
   DESCRIPTION: 'description',
   TAGS: 'tags',
   DATE_TAKEN: 'date_taken',
   LOCATION: 'geo',
   PATH_ALIAS: 'path_alias'
};

export const Size = {
   THUMB: 'url_t',
   SQUARE_75: 'url_sq',
   SQUARE_150: 'url_q',
   SMALL_240: 'url_s',
   SMALL_320: 'url_n',
   MEDIUM_500: 'url_m',
   MEDIUM_640: 'url_z',
   MEDIUM_800: 'url_c',
   LARGE_1024: 'url_l',
   LARGE_1600: 'url_h',
   LARGE_2048: 'url_k',
   ORIGINAL: 'url_o'
};
