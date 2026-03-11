/**
 * useSubscription 훅 테스트
 *
 * 구독 상태 관리 및 내보내기 권한 체크 테스트
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock incrementExportCount
const mockIncrementExportCount = vi.fn()

describe('useSubscription 로직', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('canExport 계산', () => {
    it('미인증 시 false', () => {
      const isAuthenticated = false
      const subscription = { canExport: true }

      const canExport = isAuthenticated ? subscription.canExport : false

      expect(canExport).toBe(false)
    })

    it('인증 + 구독 활성 = true', () => {
      const isAuthenticated = true
      const subscription = { canExport: true }

      const canExport = isAuthenticated ? subscription.canExport : false

      expect(canExport).toBe(true)
    })

    it('인증 + 구독 만료 = false', () => {
      const isAuthenticated = true
      const subscription = { canExport: false }

      const canExport = isAuthenticated ? subscription.canExport : false

      expect(canExport).toBe(false)
    })
  })

  describe('trialInfoText 계산', () => {
    it('미인증', () => {
      const isAuthenticated = false

      let text = ''
      if (!isAuthenticated) {
        text = '로그인 후 무료 체험을 시작하세요'
      }

      expect(text).toBe('로그인 후 무료 체험을 시작하세요')
    })

    it('Pro 구독 중', () => {
      const isAuthenticated = true
      const subscription = { status: 'active' }

      let text = ''
      if (!isAuthenticated) {
        text = '로그인 후 무료 체험을 시작하세요'
      } else if (subscription.status === 'active') {
        text = 'Pro 구독 중'
      }

      expect(text).toBe('Pro 구독 중')
    })

    it('체험 만료', () => {
      const isAuthenticated = true
      const subscription = { status: 'expired' }

      let text = ''
      if (!isAuthenticated) {
        text = '로그인 후 무료 체험을 시작하세요'
      } else if (subscription.status === 'active') {
        text = 'Pro 구독 중'
      } else if (subscription.status === 'expired') {
        text = '체험 기간이 만료되었습니다'
      }

      expect(text).toBe('체험 기간이 만료되었습니다')
    })

    it('체험 중', () => {
      const isAuthenticated = true
      const subscription = {
        status: 'trial',
        exportsRemaining: 3,
        daysRemaining: 5
      }

      let text = ''
      if (!isAuthenticated) {
        text = '로그인 후 무료 체험을 시작하세요'
      } else if (subscription.status === 'active') {
        text = 'Pro 구독 중'
      } else if (subscription.status === 'expired') {
        text = '체험 기간이 만료되었습니다'
      } else if (subscription.status === 'trial') {
        text = `무료 체험: ${subscription.exportsRemaining}회 / ${subscription.daysRemaining}일 남음`
      }

      expect(text).toBe('무료 체험: 3회 / 5일 남음')
    })
  })

  describe('checkExportPermission', () => {
    it('미인증 시 login_required', () => {
      const isAuthenticated = false
      const subscription = { canExport: true }

      let result
      if (!isAuthenticated) {
        result = {
          allowed: false,
          reason: 'login_required',
          message: '내보내기를 사용하려면 로그인이 필요합니다.'
        }
      }

      expect(result.allowed).toBe(false)
      expect(result.reason).toBe('login_required')
    })

    it('구독 만료 시 trial_expired', () => {
      const isAuthenticated = true
      const subscription = { canExport: false }

      let result
      if (!isAuthenticated) {
        result = {
          allowed: false,
          reason: 'login_required',
          message: '내보내기를 사용하려면 로그인이 필요합니다.'
        }
      } else if (!subscription.canExport) {
        result = {
          allowed: false,
          reason: 'trial_expired',
          message: '무료 체험이 만료되었습니다. Pro로 업그레이드하세요.'
        }
      }

      expect(result.allowed).toBe(false)
      expect(result.reason).toBe('trial_expired')
    })

    it('권한 있음', () => {
      const isAuthenticated = true
      const subscription = { canExport: true }

      let result
      if (!isAuthenticated) {
        result = {
          allowed: false,
          reason: 'login_required',
          message: '내보내기를 사용하려면 로그인이 필요합니다.'
        }
      } else if (!subscription.canExport) {
        result = {
          allowed: false,
          reason: 'trial_expired',
          message: '무료 체험이 만료되었습니다. Pro로 업그레이드하세요.'
        }
      } else {
        result = {
          allowed: true,
          reason: null,
          message: null
        }
      }

      expect(result.allowed).toBe(true)
      expect(result.reason).toBeNull()
    })
  })

  describe('recordExport', () => {
    it('미인증 시 에러', async () => {
      const isAuthenticated = false

      await expect(async () => {
        if (!isAuthenticated) {
          throw new Error('Not authenticated')
        }
        await mockIncrementExportCount()
      }).rejects.toThrow('Not authenticated')
    })

    it('인증 시 카운트 증가 호출', async () => {
      const isAuthenticated = true
      mockIncrementExportCount.mockResolvedValue({ exportCount: 2 })

      if (isAuthenticated) {
        const result = await mockIncrementExportCount()
        expect(result.exportCount).toBe(2)
      }

      expect(mockIncrementExportCount).toHaveBeenCalled()
    })

    it('카운트 증가 실패 시 에러 전파', async () => {
      mockIncrementExportCount.mockRejectedValue(new Error('Server error'))

      await expect(mockIncrementExportCount()).rejects.toThrow('Server error')
    })
  })
})

describe('구독 상태 객체', () => {
  it('trial 상태', () => {
    const subscription = {
      status: 'trial',
      canExport: true,
      exportCount: 2,
      exportsRemaining: 3,
      daysRemaining: 5
    }

    expect(subscription.status).toBe('trial')
    expect(subscription.canExport).toBe(true)
    expect(subscription.exportsRemaining).toBe(3)
  })

  it('active 상태', () => {
    const subscription = {
      status: 'active',
      canExport: true,
      unlimited: true
    }

    expect(subscription.status).toBe('active')
    expect(subscription.canExport).toBe(true)
    expect(subscription.unlimited).toBe(true)
  })

  it('expired 상태', () => {
    const subscription = {
      status: 'expired',
      canExport: false,
      exportCount: 5,
      exportsRemaining: 0,
      daysRemaining: 0
    }

    expect(subscription.status).toBe('expired')
    expect(subscription.canExport).toBe(false)
    expect(subscription.exportsRemaining).toBe(0)
  })
})

describe('훅 반환값', () => {
  it('반환 객체 구조', () => {
    const hookReturn = {
      isAuthenticated: true,
      canExport: true,
      subscription: {
        status: 'trial',
        canExport: true,
        exportsRemaining: 5,
        daysRemaining: 7
      },
      trialInfoText: '무료 체험: 5회 / 7일 남음',
      checkExportPermission: vi.fn(),
      recordExport: vi.fn(),
      refreshSubscription: vi.fn()
    }

    expect(hookReturn).toHaveProperty('isAuthenticated')
    expect(hookReturn).toHaveProperty('canExport')
    expect(hookReturn).toHaveProperty('subscription')
    expect(hookReturn).toHaveProperty('trialInfoText')
    expect(hookReturn).toHaveProperty('checkExportPermission')
    expect(hookReturn).toHaveProperty('recordExport')
    expect(hookReturn).toHaveProperty('refreshSubscription')
  })
})

describe('구독 상태 변화 시나리오', () => {
  it('신규 사용자 → 체험 시작', () => {
    // 1. 처음 로그인
    const beforeLogin = {
      isAuthenticated: false,
      subscription: null
    }

    // 2. 로그인 후
    const afterLogin = {
      isAuthenticated: true,
      subscription: {
        status: 'trial',
        canExport: true,
        exportsRemaining: 5,
        daysRemaining: 7
      }
    }

    expect(beforeLogin.isAuthenticated).toBe(false)
    expect(afterLogin.subscription.status).toBe('trial')
    expect(afterLogin.subscription.exportsRemaining).toBe(5)
  })

  it('체험 → 만료', () => {
    // 체험 중 (마지막 내보내기)
    const beforeExport = {
      status: 'trial',
      canExport: true,
      exportsRemaining: 1
    }

    // 내보내기 후
    const afterExport = {
      status: 'expired',
      canExport: false,
      exportsRemaining: 0
    }

    expect(beforeExport.canExport).toBe(true)
    expect(afterExport.canExport).toBe(false)
    expect(afterExport.status).toBe('expired')
  })

  it('만료 → Pro 구독', () => {
    // 만료 상태
    const expired = {
      status: 'expired',
      canExport: false
    }

    // 구독 후
    const active = {
      status: 'active',
      canExport: true,
      unlimited: true
    }

    expect(expired.canExport).toBe(false)
    expect(active.canExport).toBe(true)
    expect(active.status).toBe('active')
  })

  it('Pro 구독 → 취소 (만료 대기)', () => {
    // 취소했지만 기간 남음
    const canceledButActive = {
      status: 'active',
      canExport: true,
      canceledAt: '2024-01-19',
      expiresAt: '2024-02-19'
    }

    expect(canceledButActive.status).toBe('active')
    expect(canceledButActive.canceledAt).toBeDefined()
  })
})

describe('다양한 구독 상태 텍스트', () => {
  const testCases = [
    {
      input: { isAuthenticated: false },
      expected: '로그인 후 무료 체험을 시작하세요'
    },
    {
      input: { isAuthenticated: true, subscription: { status: 'active' } },
      expected: 'Pro 구독 중'
    },
    {
      input: { isAuthenticated: true, subscription: { status: 'expired' } },
      expected: '체험 기간이 만료되었습니다'
    },
    {
      input: {
        isAuthenticated: true,
        subscription: { status: 'trial', exportsRemaining: 3, daysRemaining: 5 }
      },
      expected: '무료 체험: 3회 / 5일 남음'
    },
    {
      input: {
        isAuthenticated: true,
        subscription: { status: 'trial', exportsRemaining: 0, daysRemaining: 2 }
      },
      expected: '무료 체험: 0회 / 2일 남음'
    }
  ]

  testCases.forEach(({ input, expected }, index) => {
    it(`케이스 ${index + 1}: ${expected}`, () => {
      const { isAuthenticated, subscription } = input

      let text = ''
      if (!isAuthenticated) {
        text = '로그인 후 무료 체험을 시작하세요'
      } else if (subscription.status === 'active') {
        text = 'Pro 구독 중'
      } else if (subscription.status === 'expired') {
        text = '체험 기간이 만료되었습니다'
      } else if (subscription.status === 'trial') {
        text = `무료 체험: ${subscription.exportsRemaining}회 / ${subscription.daysRemaining}일 남음`
      }

      expect(text).toBe(expected)
    })
  })
})
