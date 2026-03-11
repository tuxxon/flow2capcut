/**
 * whiskAPIClient.js 테스트
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  generateImage,
  generateImageWithReferences,
  uploadRefImage,
  getCaptionForImage,
  uploadRefWithCaption,
  validateToken,
} from '../../src/utils/whiskAPIClient'

// Mock generateRandomSeed to return a predictable value
vi.mock('../../src/utils/formatters', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    generateRandomSeed: vi.fn(() => '12345')
  }
})

// ============================================================
// Setup
// ============================================================

const MOCK_TOKEN = 'test-access-token-123'

beforeEach(() => {
  vi.restoreAllMocks()
})

// Helper to create a fetch mock response
function mockFetchResponse(body, status = 200) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body)
  })
}

// ============================================================
// generateImage
// ============================================================
describe('generateImage', () => {
  it('sends correct request and returns images on success', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockReturnValue(
      mockFetchResponse({
        imagePanels: [{
          generatedImages: [
            { encodedImage: 'BASE64_IMG_1' },
            { encodedImage: 'BASE64_IMG_2' }
          ]
        }]
      })
    )

    const result = await generateImage(MOCK_TOKEN, 'A sunset over mountains', '16:9')

    expect(result.success).toBe(true)
    expect(result.images).toEqual([
      'data:image/png;base64,BASE64_IMG_1',
      'data:image/png;base64,BASE64_IMG_2'
    ])

    // Verify fetch was called with correct params
    expect(fetchSpy).toHaveBeenCalledTimes(1)
    const [url, options] = fetchSpy.mock.calls[0]
    expect(url).toBe('https://aisandbox-pa.googleapis.com/v1/whisk:generateImage')
    expect(options.method).toBe('POST')
    expect(options.headers.Authorization).toBe(`Bearer ${MOCK_TOKEN}`)
    expect(options.headers['Content-Type']).toBe('application/json')

    const body = JSON.parse(options.body)
    expect(body.prompt).toBe('A sunset over mountains')
    expect(body.imageModelSettings.imageModel).toBe('IMAGEN_3_5')
    expect(body.imageModelSettings.aspectRatio).toBe('IMAGE_ASPECT_RATIO_LANDSCAPE')
    expect(body.clientContext.tool).toBe('BACKBONE')
    expect(typeof body.seed).toBe('number')
  })

  it('uses provided seed instead of random', async () => {
    vi.spyOn(globalThis, 'fetch').mockReturnValue(
      mockFetchResponse({
        imagePanels: [{ generatedImages: [{ encodedImage: 'IMG' }] }]
      })
    )

    await generateImage(MOCK_TOKEN, 'test', '1:1', '99999')

    const body = JSON.parse(globalThis.fetch.mock.calls[0][1].body)
    expect(body.seed).toBe(99999)
    expect(body.imageModelSettings.aspectRatio).toBe('IMAGE_ASPECT_RATIO_SQUARE')
  })

  it('throws on HTTP error', async () => {
    vi.spyOn(globalThis, 'fetch').mockReturnValue(
      mockFetchResponse({}, 401)
    )

    await expect(generateImage(MOCK_TOKEN, 'test', '16:9'))
      .rejects.toThrow('HTTP 401')
  })

  it('throws when response has no image panels', async () => {
    vi.spyOn(globalThis, 'fetch').mockReturnValue(
      mockFetchResponse({ imagePanels: [] })
    )

    await expect(generateImage(MOCK_TOKEN, 'test', '16:9'))
      .rejects.toThrow('No image data')
  })

  it('throws when imagePanels has empty generatedImages', async () => {
    vi.spyOn(globalThis, 'fetch').mockReturnValue(
      mockFetchResponse({ imagePanels: [{ generatedImages: [] }] })
    )

    await expect(generateImage(MOCK_TOKEN, 'test', '16:9'))
      .rejects.toThrow('No image data')
  })

  it('maps portrait aspect ratio correctly', async () => {
    vi.spyOn(globalThis, 'fetch').mockReturnValue(
      mockFetchResponse({
        imagePanels: [{ generatedImages: [{ encodedImage: 'X' }] }]
      })
    )

    await generateImage(MOCK_TOKEN, 'test', '9:16')

    const body = JSON.parse(globalThis.fetch.mock.calls[0][1].body)
    expect(body.imageModelSettings.aspectRatio).toBe('IMAGE_ASPECT_RATIO_PORTRAIT')
  })
})

// ============================================================
// generateImageWithReferences
// ============================================================
describe('generateImageWithReferences', () => {
  it('uses GEM_PIX model for single reference', async () => {
    vi.spyOn(globalThis, 'fetch').mockReturnValue(
      mockFetchResponse({
        imagePanels: [{ generatedImages: [{ encodedImage: 'REF_IMG' }] }]
      })
    )

    const refs = [{ caption: 'a character', category: 'MEDIA_CATEGORY_SUBJECT', mediaId: 'media-1' }]
    const result = await generateImageWithReferences(MOCK_TOKEN, 'draw it', '16:9', refs)

    expect(result.success).toBe(true)
    expect(result.images).toEqual(['data:image/png;base64,REF_IMG'])

    const [url, options] = globalThis.fetch.mock.calls[0]
    expect(url).toBe('https://aisandbox-pa.googleapis.com/v1/whisk:runImageRecipe')

    const body = JSON.parse(options.body)
    expect(body.imageModelSettings.imageModel).toBe('GEM_PIX')
    expect(body.userInstruction).toBe('draw it')
    expect(body.recipeMediaInputs).toHaveLength(1)
    expect(body.recipeMediaInputs[0].caption).toBe('a character')
    expect(body.recipeMediaInputs[0].mediaInput.mediaCategory).toBe('MEDIA_CATEGORY_SUBJECT')
    expect(body.recipeMediaInputs[0].mediaInput.mediaGenerationId).toBe('media-1')
  })

  it('uses R2I model for multiple references', async () => {
    vi.spyOn(globalThis, 'fetch').mockReturnValue(
      mockFetchResponse({
        imagePanels: [{ generatedImages: [{ encodedImage: 'MULTI_REF' }] }]
      })
    )

    const refs = [
      { caption: 'char', category: 'MEDIA_CATEGORY_SUBJECT', mediaId: 'id1' },
      { caption: 'scene', category: 'MEDIA_CATEGORY_SCENE', mediaId: 'id2' }
    ]
    await generateImageWithReferences(MOCK_TOKEN, 'combine them', '9:16', refs)

    const body = JSON.parse(globalThis.fetch.mock.calls[0][1].body)
    expect(body.imageModelSettings.imageModel).toBe('R2I')
    expect(body.recipeMediaInputs).toHaveLength(2)
  })

  it('uses provided seed', async () => {
    vi.spyOn(globalThis, 'fetch').mockReturnValue(
      mockFetchResponse({
        imagePanels: [{ generatedImages: [{ encodedImage: 'X' }] }]
      })
    )

    const refs = [{ caption: '', category: 'CAT', mediaId: 'id1' }]
    await generateImageWithReferences(MOCK_TOKEN, 'test', '16:9', refs, '77777')

    const body = JSON.parse(globalThis.fetch.mock.calls[0][1].body)
    expect(body.seed).toBe(77777)
  })

  it('throws on HTTP error', async () => {
    vi.spyOn(globalThis, 'fetch').mockReturnValue(mockFetchResponse({}, 500))

    const refs = [{ caption: '', category: 'CAT', mediaId: 'id1' }]
    await expect(generateImageWithReferences(MOCK_TOKEN, 'test', '16:9', refs))
      .rejects.toThrow('HTTP 500')
  })

  it('throws when no image data returned', async () => {
    vi.spyOn(globalThis, 'fetch').mockReturnValue(
      mockFetchResponse({ imagePanels: [] })
    )

    const refs = [{ caption: '', category: 'CAT', mediaId: 'id1' }]
    await expect(generateImageWithReferences(MOCK_TOKEN, 'test', '16:9', refs))
      .rejects.toThrow('No image data')
  })
})

// ============================================================
// uploadRefImage
// ============================================================
describe('uploadRefImage', () => {
  it('uploads image and returns mediaId', async () => {
    vi.spyOn(globalThis, 'fetch').mockReturnValue(
      mockFetchResponse({
        result: {
          data: {
            json: {
              result: {
                uploadMediaGenerationId: 'uploaded-media-id-123'
              }
            }
          }
        }
      })
    )

    const result = await uploadRefImage(MOCK_TOKEN, 'base64data', 'MEDIA_CATEGORY_SUBJECT')

    expect(result.success).toBe(true)
    expect(result.mediaId).toBe('uploaded-media-id-123')

    const [url, options] = globalThis.fetch.mock.calls[0]
    expect(url).toBe('https://labs.google/fx/api/trpc/backbone.uploadImage')
    expect(options.headers.Authorization).toBe(`Bearer ${MOCK_TOKEN}`)

    const body = JSON.parse(options.body)
    expect(body.json.uploadMediaInput.rawBytes).toBe('base64data')
    expect(body.json.uploadMediaInput.mediaCategory).toBe('MEDIA_CATEGORY_SUBJECT')
  })

  it('throws on HTTP error', async () => {
    vi.spyOn(globalThis, 'fetch').mockReturnValue(mockFetchResponse({}, 403))

    await expect(uploadRefImage(MOCK_TOKEN, 'data', 'CAT'))
      .rejects.toThrow('Upload HTTP 403')
  })

  it('throws when no media ID returned', async () => {
    vi.spyOn(globalThis, 'fetch').mockReturnValue(
      mockFetchResponse({
        result: { data: { json: { result: {} } } }
      })
    )

    await expect(uploadRefImage(MOCK_TOKEN, 'data', 'CAT'))
      .rejects.toThrow('No media ID returned')
  })
})

// ============================================================
// getCaptionForImage
// ============================================================
describe('getCaptionForImage', () => {
  it('returns caption text on success', async () => {
    vi.spyOn(globalThis, 'fetch').mockReturnValue(
      mockFetchResponse({
        result: {
          data: {
            json: {
              result: {
                candidates: [{ output: 'A fluffy cat sitting on a sofa' }]
              }
            }
          }
        }
      })
    )

    const caption = await getCaptionForImage(MOCK_TOKEN, 'imgdata', 'MEDIA_CATEGORY_SUBJECT')

    expect(caption).toBe('A fluffy cat sitting on a sofa')

    const [url, options] = globalThis.fetch.mock.calls[0]
    expect(url).toBe('https://labs.google/fx/api/trpc/backbone.captionImage')

    const body = JSON.parse(options.body)
    expect(body.json.captionInput.rawBytes).toBeUndefined()
    expect(body.json.captionInput.mediaInput.rawBytes).toBe('imgdata')
    expect(body.json.captionInput.mediaInput.mediaCategory).toBe('MEDIA_CATEGORY_SUBJECT')
    expect(body.json.captionInput.candidatesCount).toBe(1)
  })

  it('returns null on HTTP error', async () => {
    vi.spyOn(globalThis, 'fetch').mockReturnValue(mockFetchResponse({}, 500))

    const caption = await getCaptionForImage(MOCK_TOKEN, 'data', 'CAT')
    expect(caption).toBeNull()
  })

  it('returns null when no candidates', async () => {
    vi.spyOn(globalThis, 'fetch').mockReturnValue(
      mockFetchResponse({
        result: { data: { json: { result: { candidates: [] } } } }
      })
    )

    const caption = await getCaptionForImage(MOCK_TOKEN, 'data', 'CAT')
    expect(caption).toBeNull()
  })

  it('returns empty string when candidate output is empty', async () => {
    vi.spyOn(globalThis, 'fetch').mockReturnValue(
      mockFetchResponse({
        result: {
          data: {
            json: {
              result: {
                candidates: [{ output: '' }]
              }
            }
          }
        }
      })
    )

    const caption = await getCaptionForImage(MOCK_TOKEN, 'data', 'CAT')
    expect(caption).toBe('')
  })
})

// ============================================================
// uploadRefWithCaption
// ============================================================
describe('uploadRefWithCaption', () => {
  it('returns upload result with caption', async () => {
    vi.spyOn(globalThis, 'fetch')
      // First call: getCaptionForImage
      .mockReturnValueOnce(mockFetchResponse({
        result: {
          data: {
            json: {
              result: {
                candidates: [{ output: 'A landscape photo' }]
              }
            }
          }
        }
      }))
      // Second call: uploadRefImage
      .mockReturnValueOnce(mockFetchResponse({
        result: {
          data: {
            json: {
              result: {
                uploadMediaGenerationId: 'media-456'
              }
            }
          }
        }
      }))

    const result = await uploadRefWithCaption(MOCK_TOKEN, 'imgdata', 'MEDIA_CATEGORY_SCENE')

    expect(result.success).toBe(true)
    expect(result.mediaId).toBe('media-456')
    expect(result.caption).toBe('A landscape photo')
  })

  it('still uploads even if caption extraction fails', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(globalThis, 'fetch')
      // Caption call fails
      .mockReturnValueOnce(Promise.reject(new Error('Network error')))
      // Upload succeeds
      .mockReturnValueOnce(mockFetchResponse({
        result: {
          data: {
            json: {
              result: {
                uploadMediaGenerationId: 'media-789'
              }
            }
          }
        }
      }))

    const result = await uploadRefWithCaption(MOCK_TOKEN, 'imgdata', 'MEDIA_CATEGORY_STYLE')

    expect(result.success).toBe(true)
    expect(result.mediaId).toBe('media-789')
    expect(result.caption).toBe('')
  })

  it('propagates upload error even after successful caption', async () => {
    vi.spyOn(globalThis, 'fetch')
      // Caption succeeds
      .mockReturnValueOnce(mockFetchResponse({
        result: {
          data: { json: { result: { candidates: [{ output: 'caption' }] } } }
        }
      }))
      // Upload fails
      .mockReturnValueOnce(mockFetchResponse({}, 500))

    await expect(uploadRefWithCaption(MOCK_TOKEN, 'imgdata', 'CAT'))
      .rejects.toThrow('Upload HTTP 500')
  })
})

// ============================================================
// validateToken
// ============================================================
describe('validateToken', () => {
  it('returns valid=true with expiry on success', async () => {
    const expTimestamp = Math.floor(Date.now() / 1000) + 3600 // 1 hour from now
    vi.spyOn(globalThis, 'fetch').mockReturnValue(
      mockFetchResponse({ exp: String(expTimestamp) })
    )

    const result = await validateToken(MOCK_TOKEN)

    expect(result.valid).toBe(true)
    expect(result.expiry).toBe(expTimestamp * 1000)

    const [url] = globalThis.fetch.mock.calls[0]
    expect(url).toBe(
      `https://www.googleapis.com/oauth2/v3/tokeninfo?access_token=${MOCK_TOKEN}`
    )
  })

  it('returns valid=false on HTTP error', async () => {
    vi.spyOn(globalThis, 'fetch').mockReturnValue(mockFetchResponse({}, 400))

    const result = await validateToken(MOCK_TOKEN)

    expect(result.valid).toBe(false)
    expect(result.expiry).toBeNull()
  })

  it('returns valid=false on network error', async () => {
    vi.spyOn(globalThis, 'fetch').mockReturnValue(
      Promise.reject(new Error('Network error'))
    )

    const result = await validateToken(MOCK_TOKEN)

    expect(result.valid).toBe(false)
    expect(result.expiry).toBeNull()
  })
})
