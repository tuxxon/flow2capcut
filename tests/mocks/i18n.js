/**
 * i18n Mock (Desktop)
 */
import { vi } from 'vitest'

export function mockT(key, vars = {}) {
  let result = key
  Object.entries(vars).forEach(([k, v]) => {
    result = result.replace(`{${k}}`, v)
  })
  return result
}

export function mockUseI18n() {
  return {
    t: mockT,
    lang: 'ko',
    setLang: vi.fn()
  }
}

export function resetI18nMock() {
  // No-op, stateless
}

vi.mock('../../src/hooks/useI18n', () => ({
  default: () => mockUseI18n(),
  __esModule: true
}))
