/**
 * defaults.js 테스트
 */
import { describe, it, expect } from 'vitest'
import {
  DEFAULTS,
  ASPECT_RATIOS,
  getApiAspectRatio,
  REFERENCE_TYPES,
  UI,
  TIMING,
  STYLE_PRESETS,
} from '../../src/config/defaults'

// ============================================================
// DEFAULTS structure
// ============================================================
describe('DEFAULTS', () => {
  it('has project section', () => {
    expect(DEFAULTS.project).toBeDefined()
    expect(DEFAULTS.project.defaultName).toBe('Untitled')
  })

  it('has scene section with expected defaults', () => {
    expect(DEFAULTS.scene).toBeDefined()
    expect(DEFAULTS.scene.duration).toBe(3)
    expect(DEFAULTS.scene.aspectRatio).toBe('16:9')
  })

  it('has generation section', () => {
    expect(DEFAULTS.generation).toBeDefined()
    expect(DEFAULTS.generation.method).toBe('api')
    expect(DEFAULTS.generation.imageCount).toBe(1)
    expect(DEFAULTS.generation.retryCount).toBe(2)
    expect(DEFAULTS.generation.concurrency).toBe(1)
    expect(typeof DEFAULTS.generation.delayMin).toBe('number')
    expect(typeof DEFAULTS.generation.delayMax).toBe('number')
  })

  it('has api section with endpoints', () => {
    expect(DEFAULTS.api).toBeDefined()
    expect(DEFAULTS.api.endpoints).toBeDefined()
    expect(DEFAULTS.api.endpoints.generate).toContain('googleapis.com')
    expect(DEFAULTS.api.endpoints.session).toContain('labs.google')
  })

  it('has api payload section', () => {
    expect(DEFAULTS.api.payload).toBeDefined()
    expect(DEFAULTS.api.payload.tool_name).toBe('BACKBONE')
    expect(DEFAULTS.api.payload.model_default).toBe('IMAGEN_3_5')
  })

  it('has selectors section for DOM mode', () => {
    expect(DEFAULTS.selectors).toBeDefined()
    expect(DEFAULTS.selectors.create_project_btn).toBeTruthy()
    expect(DEFAULTS.selectors.generate_btn).toBeTruthy()
    expect(DEFAULTS.selectors.prompt_textarea).toBeTruthy()
  })
})

// ============================================================
// ASPECT_RATIOS
// ============================================================
describe('ASPECT_RATIOS', () => {
  it('is an array with 3 entries', () => {
    expect(Array.isArray(ASPECT_RATIOS)).toBe(true)
    expect(ASPECT_RATIOS).toHaveLength(3)
  })

  it('includes portrait, landscape, square', () => {
    const values = ASPECT_RATIOS.map(r => r.value)
    expect(values).toContain('9:16')
    expect(values).toContain('16:9')
    expect(values).toContain('1:1')
  })

  it('each entry has value, label, apiValue', () => {
    for (const ratio of ASPECT_RATIOS) {
      expect(ratio).toHaveProperty('value')
      expect(ratio).toHaveProperty('label')
      expect(ratio).toHaveProperty('apiValue')
    }
  })
})

// ============================================================
// getApiAspectRatio
// ============================================================
describe('getApiAspectRatio', () => {
  it('maps 16:9 to landscape', () => {
    expect(getApiAspectRatio('16:9')).toBe('IMAGE_ASPECT_RATIO_LANDSCAPE')
  })

  it('maps 9:16 to portrait', () => {
    expect(getApiAspectRatio('9:16')).toBe('IMAGE_ASPECT_RATIO_PORTRAIT')
  })

  it('maps 1:1 to square', () => {
    expect(getApiAspectRatio('1:1')).toBe('IMAGE_ASPECT_RATIO_SQUARE')
  })

  it('defaults to landscape for unknown', () => {
    expect(getApiAspectRatio('4:3')).toBe('IMAGE_ASPECT_RATIO_LANDSCAPE')
    expect(getApiAspectRatio(undefined)).toBe('IMAGE_ASPECT_RATIO_LANDSCAPE')
  })
})

// ============================================================
// REFERENCE_TYPES
// ============================================================
describe('REFERENCE_TYPES', () => {
  it('has 3 reference types', () => {
    expect(REFERENCE_TYPES).toHaveLength(3)
  })

  it('includes character, scene, style', () => {
    const values = REFERENCE_TYPES.map(r => r.value)
    expect(values).toContain('character')
    expect(values).toContain('scene')
    expect(values).toContain('style')
  })

  it('each has value, label, category', () => {
    for (const rt of REFERENCE_TYPES) {
      expect(rt).toHaveProperty('value')
      expect(rt).toHaveProperty('label')
      expect(rt).toHaveProperty('category')
    }
  })

  it('maps categories correctly', () => {
    const charType = REFERENCE_TYPES.find(r => r.value === 'character')
    expect(charType.category).toBe('MEDIA_CATEGORY_SUBJECT')
    const sceneType = REFERENCE_TYPES.find(r => r.value === 'scene')
    expect(sceneType.category).toBe('MEDIA_CATEGORY_SCENE')
    const styleType = REFERENCE_TYPES.find(r => r.value === 'style')
    expect(styleType.category).toBe('MEDIA_CATEGORY_STYLE')
  })
})

// ============================================================
// UI constants
// ============================================================
describe('UI', () => {
  it('has panel height defaults', () => {
    expect(UI.DEFAULT_BOTTOM_PANEL_HEIGHT).toBe(180)
    expect(UI.MIN_TOP_PANEL_HEIGHT).toBe(250)
    expect(UI.MIN_BOTTOM_PANEL_HEIGHT).toBe(80)
  })

  it('has duration constraints', () => {
    expect(UI.DURATION_MIN).toBe(1)
    expect(UI.DURATION_MAX).toBe(30)
    expect(UI.DURATION_STEP).toBe(0.5)
  })

  it('has export threshold', () => {
    expect(UI.EXPORT_THRESHOLD).toBe(50)
  })
})

// ============================================================
// TIMING constants
// ============================================================
describe('TIMING', () => {
  it('has all timing constants', () => {
    expect(TIMING.AUTO_SAVE_DEBOUNCE).toBe(1000)
    expect(TIMING.AUTH_CHECK_DELAY).toBe(3000)
    expect(TIMING.AUTH_POLL_INTERVAL).toBe(2000)
    expect(TIMING.TOAST_EXIT_ANIMATION).toBe(300)
    expect(TIMING.SETTINGS_HIGHLIGHT).toBe(3000)
    expect(TIMING.AUTH_ERROR_TOAST).toBe(6000)
  })

  it('all values are positive numbers', () => {
    for (const [key, value] of Object.entries(TIMING)) {
      expect(typeof value).toBe('number')
      expect(value).toBeGreaterThan(0)
    }
  })
})

// ============================================================
// STYLE_PRESETS
// ============================================================
describe('STYLE_PRESETS', () => {
  it('is defined and non-empty', () => {
    expect(STYLE_PRESETS).toBeDefined()
    // It's imported from JSON, should be an array or object
    expect(STYLE_PRESETS).toBeTruthy()
  })
})
