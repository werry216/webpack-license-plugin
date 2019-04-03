const needle = require('needle')
import DefaultLicenseTextProvider, {
  fetch,
  REPO_URL,
} from '../../src/DefaultLicenseTextProvider'

jest.mock('needle', () =>
  jest.fn(async (method: string, url: string) => {
    return url.match(/notfound$/i)
      ? { statusCode: 404 }
      : { statusCode: 200, body: 'body content' }
  })
)

const mockRequest = jest.fn((url: string) => {
  const [_, license] = url.match(/^.*\/(.*?)\.txt$/i)

  let result
  switch (license) {
    case 'MIT':
      result = 'MIT License Text'
      break
    case 'Apache-2.0':
      result = 'Apache License Text'
      break
    default:
      result = null
      break
  }

  return Promise.resolve(result)
})

describe('fetch', () => {
  test('fetch starts get request with url and returns the response body or null', async () => {
    const okUrl = 'https://example.com'
    const notFoundUrl = 'https://example.com/notfound'

    const okResult = await fetch(okUrl)
    const notFoundResult = await fetch(notFoundUrl)

    expect(needle.mock.calls).toEqual([['get', okUrl], ['get', notFoundUrl]])
    expect(notFoundResult).toBe(null)
    expect(okResult).toBe('body content')
  })
})

describe('DefaultLicenseTextProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('returns null when no license text was found on spdx', async () => {
    const unknownLicenseName = 'foo'
    const instance = new DefaultLicenseTextProvider(mockRequest)
    const result = await instance.retrieveLicenseText(unknownLicenseName)

    expect(result).toBe(null)
    expect(mockRequest).toHaveBeenCalledTimes(1)
    expect(mockRequest).toHaveBeenCalledWith(
      `${REPO_URL}/master/text/${unknownLicenseName}.txt`
    )
  })

  test('returns license text from spdx', async () => {
    const instance = new DefaultLicenseTextProvider(mockRequest)

    const result1 = await instance.retrieveLicenseText('MIT')
    expect(result1).toBe('MIT License Text')
    const result2 = await instance.retrieveLicenseText('Apache-2.0')
    expect(result2).toBe('Apache License Text')
    expect(mockRequest).toBeCalledTimes(2)
  })

  test('returns license text from cache on cache hit', async () => {
    const instance = new DefaultLicenseTextProvider(mockRequest)

    const result1 = await instance.retrieveLicenseText('MIT')
    expect(result1).toBe('MIT License Text')
    const result2 = await instance.retrieveLicenseText('MIT')
    expect(result2).toBe('MIT License Text')
    expect(mockRequest).toBeCalledTimes(1)
  })

  test('uses fetch when not given a request method', async () => {
    const instance = new DefaultLicenseTextProvider()

    await instance.retrieveLicenseText('MIT')
    expect(needle).toHaveBeenCalledTimes(1)
  })
})
