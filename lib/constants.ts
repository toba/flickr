export const host = 'api.flickr.com';

export enum Url {
   Base = '/services/rest/',
   RequestToken = 'http://www.flickr.com/services/oauth/request_token',
   Authorize = 'http://www.flickr.com/services/oauth/authorize',
   AccessToken = 'http://www.flickr.com/services/oauth/access_token',
   PhotoSet = 'http://www.flickr.com/photos/trailimage/sets/'
}

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
