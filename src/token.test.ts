import '@toba/test'
import { FlickrClient } from './client'
import { Url } from './constants'
import { testConfig } from './.test-data'

// jest.unmock('oauth')
// jest.unmock('@toba/oauth')

const client = new FlickrClient(testConfig)

it.skip('gets request token', async () => {
   const url = await client.getRequestToken()
   expect(url).toBe(`${Url.Authorize}?oauth_token=token`)
})
