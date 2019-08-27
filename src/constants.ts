export const enum Url {
   Host = 'api.flickr.com',
   Base = '/services/rest/',
   RequestToken = 'http://www.flickr.com/services/oauth/request_token',
   Authorize = 'http://www.flickr.com/services/oauth/authorize',
   AccessToken = 'http://www.flickr.com/services/oauth/access_token',
   PhotoSet = 'http://www.flickr.com/photos/trailimage/sets/'
}

enum PhotoMethods {
   EXIF = 'photos.getExif',
   Info = 'photos.getInfo',
   Search = 'photos.search',
   Sets = 'photos.getAllContexts',
   Sizes = 'photos.getSizes',
   Tags = 'tags.getListUserRaw'
}

enum SetMethods {
   Info = 'photosets.getInfo',
   Photos = 'photosets.getPhotos'
}

export const Method = {
   Prefix: 'flickr.',
   Collections: 'collections.getTree',
   Photo: PhotoMethods,
   Set: SetMethods
};
