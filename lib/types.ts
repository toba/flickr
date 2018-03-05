export namespace Flickr {
   enum Boolean {
      'false',
      'true'
   }

   export enum SizeUrl {
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

   export enum TypeName {
      User = 'user_id',
      Set = 'photoset_id',
      Photo = 'photo_id'
   }

   export enum Status {
      Okay = 'ok',
      Failed = 'fail'
   }

   export enum Format {
      /** https://www.flickr.com/services/api/response.json.html */
      JSON = 'json',
      /** https://www.flickr.com/services/api/response.xmlrpc.html */
      XML = 'xml'
   }

   export enum Sort {
      DatePostedAsc = 'date-posted-asc',
      DatePostedDesc = 'date-posted-desc',
      DateTakenAsc = 'date-taken-asc',
      DateTakenDesc = 'date-taken-desc',
      InterestingDesc = 'interestingness-desc',
      InterestingAsc = 'interestingness-asc',
      Relevance = 'relevance'
   }

   /**
    * http://www.flickr.com/services/api/flickr.photos.licenses.getInfo.html
    */
   enum License {
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
    * http://www.flickr.com/services/api/flickr.photos.setSafetyLevel.html
    */
   enum SafetyLevel {
      Safe = 1,
      Moderate = 2,
      Restricted = 3
   }

   export enum Extra {
      Description = 'description',
      Tags = 'tags',
      DateTaken = 'date_taken',
      Location = 'geo',
      PathAlias = 'path_alias'
   }

   /**
    * Parameters required or allowed with a Flickr API request.
    * https://www.flickr.com/services/api/flickr.photos.search.html
    */
   export interface Params {
      [index: string]: string | number | boolean | string[];
      /** https://www.flickr.com/services/api/misc.api_keys.html */
      api_key?: string;
      format?: Format;
      nojsoncallback?: Boolean;
      method?: string;
      /** Comma-delimited list of method-specific, extra fields to return */
      extras?: string;
      tags?: string;
      sort?: Sort;
      /**
       * Numer of items to return per page of results. The maximum is 500.
       */
      per_page?: number;
      [TypeName.Photo]?: string;
      [TypeName.User]?: string;
      [TypeName.Set]?: string;
   }

   export interface Collection {
      id: string;
      title: string;
      description: string;
      iconlarge: string;
      iconsmall: string;
      collection: Collection[];
      set: SetSummary[];
   }

   export interface Content {
      _content: string;
   }

   export interface EditAbility {
      cancomment: Boolean;
      canaddmeta: Boolean;
   }

   export interface Exif {
      tagspace: string;
      tagspaceid: number;
      tag: string;
      label: string;
      raw: Content;
   }

   interface FarmLocation {
      id: string;
      secret: string;
      server: string;
      farm: number;
   }

   export interface Location {
      latitude: number;
      longitude: number;
      accuracy: number;
      context: number;
      county: Place;
      region: Place;
      country: Place;
   }

   interface LocationPermission {
      ispublic: Boolean;
      iscontent: Boolean;
      isfriend: Boolean;
      isfamily: Boolean;
   }

   export interface MemberSet extends FarmLocation {
      title: string;
      primary: string;
      view_count: number;
      comment_count: number;
      count_photo: number;
      count_video: number;
   }

   interface Owner {
      nsid: string;
      username: string;
      location: string;
      iconserver: string;
      iconfarm: number;
   }

   interface Permission {
      permcomment: Boolean;
      permmetadata: Boolean;
   }

   interface PhotoDates {
      posted: string;
      taken: string;
      takengranularity: number;
      lastupdate: string;
   }

   export interface PhotoInfo extends FarmLocation {
      dateuploaded: string;
      isfavorite: Boolean;
      license: License;
      safetylevel: SafetyLevel;
      rotate: Boolean;
      originalsecret: string;
      originalformat: string;
      owner: Owner;
      title: Content;
      description: Content;
      visibility: Visibility;
      dates: PhotoDates;
      views: number;
      permissions: Permission;
      editability: EditAbility;
      publiceditability: EditAbility;
      usage: Usage;
      EXIF: Exif[];
      tags: {
         tag: TagSummary;
      };
      location: Location;
      geoperms: LocationPermission;
      media: string;
      urls: {
         url: URL[];
      };
   }

   // https://www.flickr.com/services/api/flickr.photos.getExif.html
   // interface PhotoExif {
   //    photo: Flickr.PhotoSummary;
   // }

   export interface PhotoMembership {
      set: MemberSet[];
   }

   export interface SetPhotos {
      photoset: SetInfo;
      photo: PhotoSummary[];
      page: number;
      per_page: string;
      perpage: string;
      pages: number;
      primary: string;
      owner: string;
      ownername: string;
      title: string;
      total: number;
   }

   export interface PhotoSummary extends Place {
      id: string;
      secret: string;
      server: string;
      farm: number;
      title: string;
      isprimary: string;
      tags: string;
      description?: Content;
      datetaken?: string;
      datetakengranularity?: string;
      latitude?: string;
      longitude?: string;
      context?: number;
      geo_is_family?: Boolean | boolean;
      geo_is_friend?: Boolean | boolean;
      geo_is_contact?: Boolean | boolean;
      geo_is_public?: Boolean | boolean;
      lastupdate?: string;
      pathalias?: string;

      exif: Exif[];

      url_s?: string;
      height_s?: string;
      width_s?: string;

      url_h?: string;
      height_h?: string;
      width_h?: string;

      url_k?: string;
      height_k?: string;
      width_k?: string;

      url_l?: string;
      height_l?: string;
      width_l?: string;

      url_m?: string;
      height_m?: string;
      width_m?: string;

      url_o?: string;
      height_o?: string;
      width_o?: string;
   }

   interface Place {
      place_id: string;
      woeid: string;
   }

   export interface Response {
      photoset?: SetPhotos | SetInfo;
      set?: MemberSet[];
      collections?: Tree;
      photo?: PhotoInfo;
      sizes?: SizeList;
      /**
       * Dynamically added property indicating whether the request can be
       * retried.
       */
      retry?: boolean;
      /** Response status */
      stat: Status;
      code?: number;
      message?: string;
      photos?: {
         photo: SearchResult | PhotoSummary[];
      };
      who?: {
         tags: {
            tag: Tag[];
         };
      };
   }

   interface SearchResult {
      page: number;
      pages: number;
      perpage: number;
      total: number;
   }

   export interface SetInfo {
      title: Content;
      description: Content;
      id: string;
      owner: string;
      username: string;
      primary: string;
      secret: string;
      server: string;
      farm: number;
      photos: number;
      count_views: number;
      count_comments: number;
      count_photos: number;
      count_vidoes: number;
      can_comment: Boolean;
      date_create: number;
      date_update: number;
   }

   interface SetSummary {
      id: string;
      title: string;
      description: string;
   }

   export interface Size {
      label: string;
      width: number;
      height: number;
      source: string;
      url: string;
      media: string;
   }

   interface SizeList {
      size: Flickr.Size[];
   }

   export interface Tag {
      clean: string;
      raw: Content[];
   }

   interface TagSummary {
      id: string;
      author: string;
      raw: string;
      machine_tag: number;
   }

   interface Tree {
      collection: Flickr.Collection[];
   }

   interface URL extends Flickr.Content {
      type: string;
   }

   interface Usage {
      candownload: Boolean;
      canblog: Boolean;
      canprint: Boolean;
      canshare: Boolean;
   }

   interface Visibility {
      ispublic: Boolean;
      isfriend: Boolean;
      isfamily: Boolean;
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
