export namespace Flickr {
   const enum Boolean {
      'false',
      'true'
   }

   export const enum SizeCode {
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
   }

   /** Types of Flickr entities. */
   export const enum TypeName {
      User = 'user_id',
      Set = 'photoset_id',
      Photo = 'photo_id'
   }

   export const enum Status {
      Okay = 'ok',
      Failed = 'fail'
   }

   export const enum Format {
      /** @see https://www.flickr.com/services/api/response.json.html */
      JSON = 'json',
      /** @see https://www.flickr.com/services/api/response.xmlrpc.html */
      XML = 'xml'
   }

   export const enum Sort {
      DatePostedAsc = 'date-posted-asc',
      DatePostedDesc = 'date-posted-desc',
      DateTakenAsc = 'date-taken-asc',
      DateTakenDesc = 'date-taken-desc',
      InterestingDesc = 'interestingness-desc',
      InterestingAsc = 'interestingness-asc',
      Relevance = 'relevance'
   }

   export const enum Privacy {
      Public = 1,
      Friends,
      Family,
      FriendsAndFamily,
      Private
   }

   /**
    * @see http://www.flickr.com/services/api/flickr.photos.licenses.getInfo.html
    */
   const enum License {
      AllRightsReserved = 0,
      Attribution = 4,
      Attribution_NoDervis = 6,
      Attribution_NonCommercial_NoDerivs = 3,
      Attribution_NonCommercial = 2,
      Attribution_NonCommercial_ShareAlike = 1,
      Attribution_ShareAlike = 4,
      NoKnownRestriction = 7,
      UnitedStatesGovernmentWork = 8
   }
   /**
    * @see http://www.flickr.com/services/api/flickr.photos.setSafetyLevel.html
    */
   const enum SafetyLevel {
      Safe = 1,
      Moderate = 2,
      Restricted = 3
   }

   /**
    * Extra values to return from queries, e.g.
    * @see https://www.flickr.com/services/api/flickr.photosets.getPhotos.html
    */
   export const enum Extra {
      Description = 'description',
      Tags = 'tags',
      DateTaken = 'date_taken',
      DateUpdated = 'last_update',
      Location = 'geo',
      PathAlias = 'path_alias',
      OriginalFormat = 'original_format',
      OwnerName = 'owner_name',
      IconServer = 'icon_server',
      Views = 'views'
   }

   /**
    * Parameters required or allowed with a Flickr API request.
    * @see https://www.flickr.com/services/api/flickr.photos.search.html
    */
   export interface Params {
      [index: string]: string | number | boolean | string[] | undefined
      /** @see https://www.flickr.com/services/api/misc.api_keys.html */
      api_key?: string
      format?: Format
      nojsoncallback?: Boolean
      method?: string
      /** Comma-delimited list of method-specific, extra fields to return */
      extras?: string
      tags?: string
      sort?: Sort
      /**
       * Numer of items to return per page of results. The maximum is 500.
       */
      per_page?: number
      [TypeName.Photo]?: string
      [TypeName.User]?: string
      [TypeName.Set]?: string
   }

   export interface Collection {
      id: string
      title: string
      description: string
      iconlarge: string
      iconsmall: string
      collection: Collection[]
      set: SetSummary[]
   }

   export interface Content {
      _content: string
   }

   export interface EditAbility {
      cancomment: Boolean
      canaddmeta: Boolean
   }

   export interface Exif {
      tagspace: string
      tagspaceid: number
      tag: string
      label: string
      raw: Content
   }

   interface FarmLocation {
      id: string
      secret: string
      server: string
      farm: number
   }

   export interface Location {
      latitude: number
      longitude: number
      accuracy: number
      context: number
      county: Place
      region: Place
      country: Place
   }

   interface LocationPermission extends Visibility {
      iscontent: Boolean
   }

   export interface MemberSet extends FarmLocation {
      title: string
      primary: string
      view_count: number
      comment_count: number
      count_photo: number
      count_video: number
   }

   interface Owner {
      nsid: string
      username: string
      realname: string
      location: string
      iconserver: string
      iconfarm: number
      path_alias: string
   }

   interface Permission {
      permcomment: number
      permaddmeta: number
   }

   interface PhotoDates {
      /** Timestamp */
      posted: number
      /** ISO */
      taken: string
      takengranularity: number
      takenunknown: Boolean
      /** Timestamp */
      lastupdate: number
   }

   export interface PhotoInfo extends FarmLocation {
      dateuploaded: number
      isfavorite: Boolean
      license: License
      safety_level: SafetyLevel
      rotation: Boolean
      originalsecret: string
      originalformat: string
      owner: Owner
      title: Content
      description: Content
      visibility: Visibility
      dates: PhotoDates
      views: number
      permissions: Permission
      editability: EditAbility
      publiceditability: EditAbility
      usage: Usage
      comments: Content
      notes: any
      /** Flickr changed their API from uppercase to lower for EXIF */
      EXIF: Exif[]
      exif: Exif[]
      tags: {
         tag: TagSummary[]
      }
      location: Location
      geoperms: LocationPermission
      media: string
      urls: {
         url: URL[]
      }
   }

   // https://www.flickr.com/services/api/flickr.photos.getExif.html
   // interface PhotoExif {
   //    photo: Flickr.PhotoSummary;
   // }

   export interface PhotoMembership {
      set: MemberSet[]
   }

   export interface SetPhotos {
      id: string
      /** ID of primary photo */
      primary: string
      owner: string
      ownername: string
      photo: PhotoSummary[]
      page: number
      per_page: string
      perpage: string
      pages: number
      title: string
      total: number
   }

   export interface SizeInfo {
      [key: string]: string | undefined
      [SizeCode.Small240]?: string
      height_s?: string
      width_s?: string

      [SizeCode.Large1600]?: string
      height_h?: string
      width_h?: string

      [SizeCode.Large2048]?: string
      height_k?: string
      width_k?: string

      [SizeCode.Large1024]?: string
      height_l?: string
      width_l?: string

      [SizeCode.Medium500]?: string
      height_m?: string
      width_m?: string

      [SizeCode.Original]?: string
      height_o?: string
      width_o?: string
   }

   export interface PhotoSummary
      extends Place,
         FarmLocation,
         Visibility,
         SizeInfo {
      // include index signature so size fields can be accessed by index
      [key: string]: any
      title: string
      isprimary: Boolean
      tags?: string
      description?: Content
      datetaken?: string
      datetakengranularity?: string
      latitude?: string
      longitude?: string
      context?: number
      geo_is_family?: Boolean | boolean
      geo_is_friend?: Boolean | boolean
      geo_is_contact?: Boolean | boolean
      geo_is_public?: Boolean | boolean
      lastupdate: string
      pathalias?: string

      exif: Exif[]
   }

   interface Place extends Content {
      place_id: string
      woeid: string
   }

   export interface Response {
      photoset?: SetPhotos | SetInfo
      set?: MemberSet[]
      collections?: Tree
      photo?: PhotoInfo
      sizes?: SizeList
      /**
       * Dynamically added property indicating whether the request can be
       * retried.
       */
      retry?: boolean
      /** Response status */
      stat: Status
      code?: number
      message?: string
      photos?: {
         photo: SearchResult | PhotoSummary[]
      }
      who?: {
         tags: {
            tag: Tag[]
         }
      }
   }

   interface SearchResult {
      page: number
      pages: number
      perpage: number
      total: number
   }

   export interface SetInfo extends FarmLocation {
      title: Content
      description: Content
      owner: string
      username: string
      primary: string
      photos: number
      count_views: number
      count_comments: number
      count_photos: number
      count_vidoes: number
      can_comment: Boolean
      date_create: number
      /** Timestamp */
      date_update: string
   }

   export interface SetSummary {
      id: string
      title: string
      description: string
   }

   export interface Size {
      label: string
      width: number
      height: number
      source: string
      url: string
      media: string
   }

   interface SizeList {
      size: Size[]
   }

   export interface Tag {
      clean: string
      raw: Content[]
   }

   interface TagSummary extends Content {
      id: string
      author: string
      authorname: string
      machine_tag: number
   }

   interface Tree {
      collection: Collection[]
   }

   interface URL extends Content {
      type: string
   }

   interface Usage {
      candownload: Boolean
      canblog: Boolean
      canprint: Boolean
      canshare: Boolean
   }

   interface Visibility {
      ispublic: Boolean
      isfriend: Boolean
      isfamily: Boolean
   }

   // enum ExifTag {
   //    Description: 'ImageDescription',
   // CameraMake: 'Make',
   // CameraModel: 'Model',
   // CameraSerialNumber: 'SerialNumber',
   // Lens: 'Lens',
   // LensInfo: 'LensInfo',
   // LensModel: 'LensModel',
   // ResolutionX: 'XResolution',
   // ResolutionY: 'YResolution',
   // ResolutionUnit: 'ResolutionUnit',
   // DisplayedUnitsX: 'DisplayedUnitsX',
   // DisplayedUnitsY: 'DisplayedUnitsY',
   // Software: 'Software',
   // ApplicationRecordVersion: 'ApplicationRecordVersion',
   // DateCreated: 'CreateDate',
   // DateModified: 'ModifyDate',
   // DateOriginal: 'DateTimeOriginal',
   // TimeCreated: 'TimeCreated',
   // MetadataDate: 'MetadataDate',
   // DigitalCreationDate: 'DigitalCreationDate',
   // DigitalCreationTime: 'DigitalCreationTime',
   // SubSecTimeOriginal: 'SubSecTimeOriginal',
   // SubSecTimeDigitized: 'SubSecTimeDigitized',
   // Artist: 'Artist',
   // ByLine: 'By-line',
   // Creator: 'Creator',
   // Copyright: 'Copyright',
   // CopyrightFlag: 'CopyrightFlag',
   // CopyrightNotice: 'CopyrightNotice',
   // Rights: 'Rights',
   // Marked: 'Marked',
   // Title: 'Title',
   // Subject: 'Subject',
   // CaptionAbstract: 'Caption-Abstract',
   // ExposureTime: 'ExposureTime',
   // ExposureMode: 'ExposureMode',
   // ExposureProgram: 'ExposureProgram',
   // ExposureCompensation: 'ExposureCompensation',
   // WhiteBalance: 'WhiteBalance',
   // FocalLength: 'FocalLength',
   // FocalLengthIn35mmFormat: 'FocalLengthIn35mmFormat',
   // ApproximateFocusDistance: 'ApproximateFocusDistance',
   // Aperture: 'FNumber',
   // MaxAperture: 'MaxApertureValue',
   // ISO: 'ISO',
   // MeteringMode: 'MeteringMode',
   // SensitivityType: 'SensitivityType',
   // SensingMethod: 'SensingMethod',
   // ExifVersion: 'ExifVersion',
   // XmpToolkit: 'XMPToolkit',
   // LightSource: 'LightSource',
   // Flash: 'Flash',
   // FileSource: 'FileSource',
   // SceneType: 'SceneType',
   // SceneCaptureType: 'SceneCaptureType',
   // CustomRendered: 'CustomRendered',
   // DigitalZoomRatio: 'DigitalZoomRatio',
   // GainControl: 'GainControl',
   // Contrast: 'Contrast',
   // Saturation: 'Saturation',
   // Sharpness: 'Sharpness',
   // ColorTransform: 'ColorTransform',
   // Compression: 'Compression',
   // Format: 'Format',
   // SubjectDistance: 'SubjectDistanceRange',
   // GpsVersionID: 'GPSVersionID',
   // GpsLatitudeRef: 'GPSLatitudeRef',
   // GpsLatitude: 'GPSLatitude',
   // GpsLongitudeRef: 'GPSLongitudeRef',
   // GpsLongitude: 'GPSLongitude',
   // ThumbnailOffset: 'ThumbnailOffset',
   // ThumbnailLength: 'ThumbnailLength',
   // PhotoshopThumbnail: 'PhotoshopThumbnail',
   // IptcDigest: 'IPTCDigest',
   // DctEncodeVersion: 'DCTEncodeVersion',
   // ImageNumber: 'ImageNumber',
   // DocumentID: 'DocumentID',
   // OriginalDocumentID: 'OriginalDocumentID',
   // DerivedFromDocumentID: 'DerivedFromDocumentID',
   // DerivedFromOriginalDocumentID: 'DerivedFromOriginalDocumentID',
   // InstanceID: 'InstanceID',
   // CodedCharacterSet: 'CodedCharacterSet',
   // ObjectName: 'ObjectName',
   // Keywords: 'Keywords',
   // City: 'City',
   // Location: 'Location',
   // SubLocation: 'Sub-location',
   // State: 'Province-State',
   // Country: 'Country-PrimaryLocationName',
   // ViewingIlluminant: 'ViewingCondIlluminant',
   // ViewingSurround: 'ViewingCondSurround',
   // ViewingIlluminantType: 'ViewingCondIlluminantType',
   // MeasurementObserver: 'MeasurementObserver',
   // MeasurementBacking: 'MeasurementBacking',
   // MeasurementGeometry: 'MeasurementGeometry',
   // MeasurementFlare: 'MeasurementFlare',
   // MeasurementIlluminant: 'MeasurementIlluminant',
   // HistoryAction: 'HistoryAction',
   // HistoryParameters: 'HistoryParameters',
   // HistoryInstanceID: 'HistoryInstanceID',
   // HistoryWhen: 'HistoryWhen',
   // HistorySoftware: 'HistorySoftwareAgent',
   // HistoryChanged: 'HistoryChanged'
   // }
}
