/**
 * useSubscription Hook
 *
 * 구독 상태 관리 및 내보내기 권한 체크
 */

import { useCallback, useMemo } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useI18n } from './useI18n'
import { incrementExportCount } from '../firebase/functions'

/**
 * 구독 상태 및 내보내기 권한 관리 훅
 */
export function useSubscription() {
  const { t } = useI18n()
  const {
    user,
    userData,
    subscription,
    isAuthenticated,
    refreshSubscription
  } = useAuth()

  // 내보내기 가능 여부
  const canExport = useMemo(() => {
    if (!isAuthenticated) return false
    return subscription.canExport
  }, [isAuthenticated, subscription.canExport])

  // 체험판 정보 텍스트
  const trialInfoText = useMemo(() => {
    if (!isAuthenticated) {
      return t('subscriptionHook.loginFirst')
    }

    const { status, exportsRemaining, daysRemaining } = subscription

    if (status === 'active') {
      return t('subscriptionHook.proActive')
    }

    if (status === 'expired') {
      return t('subscriptionHook.trialExpired')
    }

    if (status === 'trial') {
      return t('subscriptionHook.trialInfo', { exports: exportsRemaining, days: daysRemaining })
    }

    return ''
  }, [isAuthenticated, subscription])

  // 내보내기 전 체크 (UI용)
  const checkExportPermission = useCallback(() => {
    if (!isAuthenticated) {
      return {
        allowed: false,
        reason: 'login_required',
        message: t('subscriptionHook.loginRequired')
      }
    }

    if (!subscription.canExport) {
      return {
        allowed: false,
        reason: 'trial_expired',
        message: t('subscriptionHook.trialExpiredUpgrade')
      }
    }

    return {
      allowed: true,
      reason: null,
      message: null
    }
  }, [isAuthenticated, subscription.canExport])

  // 내보내기 카운트 증가 (서버 호출)
  const recordExport = useCallback(async () => {
    if (!isAuthenticated) {
      throw new Error('Not authenticated')
    }

    try {
      const result = await incrementExportCount()
      // 로컬 상태도 새로고침
      refreshSubscription()
      return result
    } catch (error) {
      console.error('[useSubscription] Failed to record export:', error)
      throw error
    }
  }, [isAuthenticated, refreshSubscription])

  return {
    // 상태
    isAuthenticated,
    canExport,
    subscription,
    trialInfoText,

    // 메서드
    checkExportPermission,
    recordExport,
    refreshSubscription
  }
}

export default useSubscription
