/**
 * urls.js 테스트
 */
import { describe, it, expect } from 'vitest'
import {
  cleanBase64,
  toDataURL,
  isBase64Image,
  detectImageType,
  estimateBase64Size,
  getFileUrl,
  base64ToBlob,
} from '../../src/utils/urls'

// ============================================================
// cleanBase64
// ============================================================
describe('cleanBase64', () => {
  it('removes data URL prefix', () => {
    expect(cleanBase64('data:image/png;base64,abc123')).toBe('abc123')
    expect(cleanBase64('data:image/jpeg;base64,xyz')).toBe('xyz')
  })

  it('returns raw base64 as-is', () => {
    expect(cleanBase64('abc123')).toBe('abc123')
  })

  it('returns empty string for falsy input', () => {
    expect(cleanBase64('')).toBe('')
    expect(cleanBase64(null)).toBe('')
    expect(cleanBase64(undefined)).toBe('')
  })
})

// ============================================================
// toDataURL
// ============================================================
describe('toDataURL', () => {
  it('adds data URL prefix', () => {
    expect(toDataURL('abc123')).toBe('data:image/png;base64,abc123')
  })

  it('uses custom mime type', () => {
    expect(toDataURL('abc', 'image/jpeg')).toBe('data:image/jpeg;base64,abc')
  })

  it('returns data URL as-is if already prefixed', () => {
    const url = 'data:image/png;base64,abc'
    expect(toDataURL(url)).toBe(url)
  })

  it('returns empty string for falsy input', () => {
    expect(toDataURL('')).toBe('')
    expect(toDataURL(null)).toBe('')
  })
})

// ============================================================
// isBase64Image
// ============================================================
describe('isBase64Image', () => {
  it('detects data URL images', () => {
    expect(isBase64Image('data:image/png;base64,iVBOR')).toBe(true)
    expect(isBase64Image('data:image/jpeg;base64,/9j/')).toBe(true)
  })

  it('detects raw base64 pattern', () => {
    expect(isBase64Image('iVBORw0KGgoAAAANSUh')).toBe(true)
  })

  it('returns false for falsy', () => {
    expect(isBase64Image(null)).toBe(false)
    expect(isBase64Image('')).toBe(false)
  })

  it('returns false for non-base64 strings', () => {
    // strings with characters outside base64 alphabet (first 100 chars)
    expect(isBase64Image('hello world with spaces!!!')).toBe(false)
  })
})

// ============================================================
// detectImageType
// ============================================================
describe('detectImageType', () => {
  it('detects JPEG', () => {
    expect(detectImageType('/9j/4AAQ')).toBe('jpg')
  })

  it('detects PNG', () => {
    expect(detectImageType('iVBORw0KGgo')).toBe('png')
  })

  it('detects GIF', () => {
    expect(detectImageType('R0lGODlh')).toBe('gif')
  })

  it('detects WebP', () => {
    expect(detectImageType('UklGRlYA')).toBe('webp')
  })

  it('defaults to png for unknown', () => {
    expect(detectImageType('AAAA')).toBe('png')
  })

  it('defaults to png for falsy', () => {
    expect(detectImageType(null)).toBe('png')
    expect(detectImageType('')).toBe('png')
  })

  it('handles data URL prefix', () => {
    expect(detectImageType('data:image/jpeg;base64,/9j/4AAQ')).toBe('jpg')
  })
})

// ============================================================
// estimateBase64Size
// ============================================================
describe('estimateBase64Size', () => {
  it('returns 0 for falsy', () => {
    expect(estimateBase64Size(null)).toBe(0)
    expect(estimateBase64Size('')).toBe(0)
  })

  it('estimates correct size', () => {
    // 4 base64 chars = 3 bytes
    expect(estimateBase64Size('AAAA')).toBe(3)
  })

  it('strips data URL prefix before estimating', () => {
    const raw = 'AAAA'
    const withPrefix = `data:image/png;base64,${raw}`
    expect(estimateBase64Size(withPrefix)).toBe(estimateBase64Size(raw))
  })
})

// ============================================================
// getFileUrl
// ============================================================
describe('getFileUrl', () => {
  it('returns null for falsy', () => {
    expect(getFileUrl(null)).toBeNull()
    expect(getFileUrl('')).toBeNull()
  })

  it('returns data URLs as-is', () => {
    const url = 'data:image/png;base64,abc'
    expect(getFileUrl(url)).toBe(url)
  })

  it('returns blob URLs as-is', () => {
    const url = 'blob:http://example.com/123'
    expect(getFileUrl(url)).toBe(url)
  })

  it('returns http URLs as-is', () => {
    const url = 'https://example.com/image.png'
    expect(getFileUrl(url)).toBe(url)
  })

  it('returns other paths as-is', () => {
    expect(getFileUrl('/local/path/image.png')).toBe('/local/path/image.png')
  })
})

// ============================================================
// base64ToBlob
// ============================================================
describe('base64ToBlob', () => {
  it('converts data URL to Blob', () => {
    // "Hello" in base64 is "SGVsbG8="
    const dataUrl = 'data:text/plain;base64,SGVsbG8='
    const blob = base64ToBlob(dataUrl)
    expect(blob).toBeInstanceOf(Blob)
    expect(blob.type).toBe('text/plain')
  })

  it('creates blob with correct mime type from image', () => {
    const dataUrl = 'data:image/jpeg;base64,/9j/4AAQ'
    const blob = base64ToBlob(dataUrl)
    expect(blob.type).toBe('image/jpeg')
  })
})
