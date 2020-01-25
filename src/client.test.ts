import '@toba/test'
import { FlickrClient } from './client'
import { Flickr } from './types'
import { testConfig, photoID, setID } from './.test-data'

jest.unmock('./api')
jest.unmock('./client')

let client: FlickrClient

beforeAll(() => {
   console.debug = jest.fn()
   client = new FlickrClient(testConfig)
})

it('Retrieves all collections', async () => {
   const collections = await client.getCollections()
   expect(collections).toBeInstanceOf(Array)
})

it('Catches non-existent set request', () =>
   client.getSetInfo('45').catch(error => {
      expect(error).toBe('Flickr photosets.getInfo failed for photoset_id 45')
   }))

it('Retrieves set information', async () => {
   const setInfo = await client.getSetInfo(setID)
   expect(setInfo!.id).toBe(setID)
})

it('Retrieves set photos', async () => {
   const res: Flickr.SetPhotos | null = await client.getSetPhotos(setID)
   expect(res).toHaveProperty('id', setID)
   expect(res!.photo).toBeInstanceOf(Array)
   testConfig.setPhotoSizes.forEach(s => {
      // should retrieve all size URLs needed to display post
      expect(res!.photo[0]).toHaveProperty(s)
   })
})

it('Retrieves photo info', async () => {
   const info: Flickr.PhotoInfo | null = await client.getPhotoInfo(photoID)
   expect(info).not.toBeNull()
   expect(info!.dates.taken).toBe('2017-10-15 16:00:12')
   expect(info!.location.accuracy).toBe(16)
})

it('Retrieves photo EXIF', async () => {
   const exif: Flickr.Exif[] | null = await client.getExif(photoID)
   expect(exif).toBeInstanceOf(Array)
})

it('Retrieves photo sizes', async () => {
   const sizes: Flickr.Size[] | null = await client.getPhotoSizes(photoID)
   expect(sizes).toBeInstanceOf(Array)
   expect(sizes![0]).toHaveProperty('url')
})

it('Retrieves all photo tags', async () => {
   const tags: Flickr.Tag[] | null = await client.getAllPhotoTags()
   expect(tags).toBeInstanceOf(Array)
})

it('Retrieves photo context', async () => {
   const context: Flickr.MemberSet[] | null = await client.getPhotoContext(
      photoID
   )
   expect(context).toBeInstanceOf(Array)
   expect(context![0]).toHaveProperty('id', setID)
})

it('Searches for photos', async () => {
   const matches: Flickr.PhotoSummary[] | null = await client.photoSearch(
      'horse'
   )
   expect(matches).toBeInstanceOf(Array)
   expect(matches![0]).toHaveProperty('owner', testConfig.userID)
})

it('Supports simultaneous requests', async () => {
   //jest.setTimeout(Duration.Second * 30)
   return Promise.all([
      client.getSetInfo(photoID),
      client.getSetPhotos(setID),
      client.getCollections()
   ]).then(([info, photos, collections]) => {
      expect(info).toBeDefined()
      expect(photos).toBeDefined()
      expect(collections).toBeDefined()
   })
})
