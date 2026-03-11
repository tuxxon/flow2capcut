/**
 * Vitest 테스트 설정 (Desktop)
 */
import { expect, afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'
import * as matchers from '@testing-library/jest-dom/matchers'

// jest-dom matchers 확장
expect.extend(matchers)

// 각 테스트 후 cleanup
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  localStorage.clear()
})

// Electron API 모킹
import './mocks/electronAPI.js'
