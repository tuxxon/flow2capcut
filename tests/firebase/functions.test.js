/**
 * Firebase Cloud Functions 클라이언트 테스트 (Desktop)
 *
 * FUNCTION_SUFFIX 로직 및 함수 호출 테스트
 * Desktop 버전은 clientType: 'desktop'을 platform 정보에 포함
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock httpsCallable
const mockHttpsCallable = vi.fn()

// Firebase Functions 모듈 모킹
vi.mock('firebase/functions', () => ({
  httpsCallable: (...args) => mockHttpsCallable(...args),
  getFunctions: vi.fn(() => ({}))
}))

// Firebase config 모킹
vi.mock('../../src/firebase/config', () => ({
  functions: {},
  auth: {},
  db: {}
}))

/**
 * 모든 Cloud Functions 모킹 설정
 */
function setupFunctionMocks(suffix = '_test') {
  const mocks = {}
  const functionNames = [
    'initializeUser',
    'incrementExportCount',
    'getAppStatus',
    'getPricing',
    'createCheckoutSession',
    'createPortalSession'
  ]

  functionNames.forEach(name => {
    mocks[name] = vi.fn().mockResolvedValue({ data: {} })
  })

  mockHttpsCallable.mockImplementation((functions, name) => {
    const baseName = name.replace(/_test$|_prod$/, '')
    if (mocks[baseName]) return mocks[baseName]
    return vi.fn().mockRejectedValue(new Error(`Unknown function: ${name}`))
  })

  return mocks
}

function resetFunctionMocks() {
  mockHttpsCallable.mockReset()
}

describe('FUNCTION_SUFFIX', () => {
  const originalEnv = { ...import.meta.env }

  afterEach(() => {
    vi.resetModules()
    Object.keys(import.meta.env).forEach(key => {
      if (!(key in originalEnv)) delete import.meta.env[key]
    })
    Object.assign(import.meta.env, originalEnv)
  })

  describe('환경변수에 따른 suffix 결정', () => {
    it('VITE_FUNCTION_ENV가 "test"일 때 _test suffix 사용', async () => {
      import.meta.env.VITE_FUNCTION_ENV = 'test'
      const { FUNCTION_SUFFIX } = await import('../../src/firebase/functions.js')
      expect(FUNCTION_SUFFIX).toBe('_test')
    })

    it('VITE_FUNCTION_ENV가 "prod"일 때 _prod suffix 사용', async () => {
      import.meta.env.VITE_FUNCTION_ENV = 'prod'
      const { FUNCTION_SUFFIX } = await import('../../src/firebase/functions.js')
      expect(FUNCTION_SUFFIX).toBe('_prod')
    })

    it('VITE_FUNCTION_ENV가 없을 때 _test suffix 사용 (기본값)', async () => {
      delete import.meta.env.VITE_FUNCTION_ENV
      const { FUNCTION_SUFFIX } = await import('../../src/firebase/functions.js')
      expect(FUNCTION_SUFFIX).toBe('_test')
    })
  })
})

describe('Cloud Functions 호출', () => {
  let mocks

  beforeEach(() => {
    mocks = setupFunctionMocks('_test')
    import.meta.env.VITE_FUNCTION_ENV = 'test'
  })

  afterEach(() => {
    resetFunctionMocks()
    vi.resetModules()
  })

  describe('initializeUser', () => {
    it('appId와 함께 initializeUser_test 함수를 호출해야 함', async () => {
      mocks.initializeUser.mockResolvedValue({
        data: { success: true, userCreated: true, appCreated: true }
      })

      const { initializeUser } = await import('../../src/firebase/functions.js')
      const result = await initializeUser()

      expect(mockHttpsCallable).toHaveBeenCalledWith(expect.anything(), 'initializeUser_test')
      expect(result).toEqual({ success: true, userCreated: true, appCreated: true })
    })

    it('함수 호출 실패 시 null 반환', async () => {
      mocks.initializeUser.mockRejectedValue(new Error('Function not deployed'))

      const { initializeUser } = await import('../../src/firebase/functions.js')
      const result = await initializeUser()

      expect(result).toBeNull()
    })
  })

  describe('incrementExportCount', () => {
    it('incrementExportCount_test 함수를 호출해야 함', async () => {
      mocks.incrementExportCount.mockResolvedValue({
        data: { exportCount: 1, status: 'trial' }
      })

      const { incrementExportCount } = await import('../../src/firebase/functions.js')
      const result = await incrementExportCount()

      expect(mockHttpsCallable).toHaveBeenCalledWith(expect.anything(), 'incrementExportCount_test')
      expect(result).toEqual({ exportCount: 1, status: 'trial' })
    })

    it('체험판 한도 초과 시 에러 발생', async () => {
      mocks.incrementExportCount.mockRejectedValue(
        new Error('무료 체험 횟수(5회)를 모두 사용했습니다.')
      )

      const { incrementExportCount } = await import('../../src/firebase/functions.js')
      await expect(incrementExportCount()).rejects.toThrow('무료 체험 횟수')
    })
  })

  describe('getAppStatus', () => {
    it('구독 상태를 반환해야 함', async () => {
      mocks.getAppStatus.mockResolvedValue({
        data: { status: 'trial', exportCount: 2, exportsRemaining: 3, daysRemaining: 5 }
      })

      const { getAppStatus } = await import('../../src/firebase/functions.js')
      const result = await getAppStatus()

      expect(mockHttpsCallable).toHaveBeenCalledWith(expect.anything(), 'getAppStatus_test')
      expect(result.status).toBe('trial')
      expect(result.exportsRemaining).toBe(3)
    })

    it('함수 호출 실패 시 기본값 반환', async () => {
      mocks.getAppStatus.mockRejectedValue(new Error('Network error'))

      const { getAppStatus } = await import('../../src/firebase/functions.js')
      const result = await getAppStatus()

      expect(result).toEqual({
        status: 'trial',
        exportCount: 0,
        exportsRemaining: 5,
        daysRemaining: 7
      })
    })
  })

  describe('getPricing', () => {
    it('가격 정보를 반환해야 함', async () => {
      mocks.getPricing.mockResolvedValue({
        data: {
          prices: [
            { variantId: '123', amount: 4.99, interval: 'month' },
            { variantId: '456', amount: 39.99, interval: 'year' }
          ]
        }
      })

      const { getPricing } = await import('../../src/firebase/functions.js')
      const result = await getPricing()

      expect(mockHttpsCallable).toHaveBeenCalledWith(expect.anything(), 'getPricing_test')
      expect(result.prices).toHaveLength(2)
      expect(result.prices[0].interval).toBe('month')
    })
  })

  describe('createCheckoutSession', () => {
    it('월간 구독 체크아웃 URL 생성', async () => {
      mocks.createCheckoutSession.mockResolvedValue({
        data: { url: 'https://checkout.lemonsqueezy.com/xxx' }
      })

      const { createCheckoutSession } = await import('../../src/firebase/functions.js')
      const result = await createCheckoutSession({ interval: 'month' })

      expect(mockHttpsCallable).toHaveBeenCalledWith(expect.anything(), 'createCheckoutSession_test')
      expect(result.url).toContain('lemonsqueezy.com')
    })

    it('연간 구독 체크아웃 URL 생성', async () => {
      mocks.createCheckoutSession.mockResolvedValue({
        data: { url: 'https://checkout.lemonsqueezy.com/yearly' }
      })

      const { createCheckoutSession } = await import('../../src/firebase/functions.js')
      const result = await createCheckoutSession({ interval: 'year' })

      expect(result.url).toContain('lemonsqueezy.com')
    })
  })

  describe('createPortalSession', () => {
    it('구독 관리 포털 URL 생성', async () => {
      mocks.createPortalSession.mockResolvedValue({
        data: { url: 'https://portal.lemonsqueezy.com/xxx' }
      })

      const { createPortalSession } = await import('../../src/firebase/functions.js')
      const result = await createPortalSession()

      expect(mockHttpsCallable).toHaveBeenCalledWith(expect.anything(), 'createPortalSession_test')
      expect(result.url).toContain('lemonsqueezy.com')
    })
  })
})

describe('Prod 환경 함수 호출', () => {
  let mocks

  beforeEach(() => {
    mocks = setupFunctionMocks('_prod')
    import.meta.env.VITE_FUNCTION_ENV = 'prod'
  })

  afterEach(() => {
    resetFunctionMocks()
    vi.resetModules()
  })

  it('VITE_FUNCTION_ENV=prod일 때 _prod 함수 호출', async () => {
    mocks.getAppStatus.mockResolvedValue({
      data: { status: 'active', unlimited: true }
    })

    const { getAppStatus, FUNCTION_SUFFIX } = await import('../../src/firebase/functions.js')
    expect(FUNCTION_SUFFIX).toBe('_prod')

    await getAppStatus()

    expect(mockHttpsCallable).toHaveBeenCalledWith(expect.anything(), 'getAppStatus_prod')
  })
})
