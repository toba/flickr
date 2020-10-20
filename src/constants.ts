export const Url = {
   Host: 'api.flickr.com',
   Base: '/services/rest/',
   RequestToken: 'https://www.flickr.com/services/oauth/request_token',
   Authorize: 'https://www.flickr.com/services/oauth/authorize',
   AccessToken: 'https://www.flickr.com/services/oauth/access_token',
   PhotoSet: 'https://www.flickr.com/photos/trailimage/sets/',
}

const PhotoMethods = {
   EXIF: 'photos.getExif',
   Info: 'photos.getInfo',
   Search: 'photos.search',
   Sets: 'photos.getAllContexts',
   Sizes: 'photos.getSizes',
   Tags: 'tags.getListUserRaw',
}

const SetMethods = {
   Info: 'photosets.getInfo',
   Photos: 'photosets.getPhotos',
}

export const Method = {
   Prefix: 'flickr.',
   Collections: 'collections.getTree',
   Photo: PhotoMethods,
   Set: SetMethods,
}
