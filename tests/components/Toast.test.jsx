/**
 * Toast 컴포넌트 테스트
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { ToastProvider, useToast, toast } from '../../src/components/Toast'

// 테스트용 컴포넌트
function TestComponent() {
  const toastFns = useToast()

  return (
    <div>
      <button onClick={() => toastFns.success('성공 메시지')}>Success</button>
      <button onClick={() => toastFns.error('에러 메시지')}>Error</button>
      <button onClick={() => toastFns.warning('경고 메시지')}>Warning</button>
      <button onClick={() => toastFns.info('정보 메시지')}>Info</button>
    </div>
  )
}

describe('Toast', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('ToastProvider', () => {
    it('children 렌더링', () => {
      render(
        <ToastProvider>
          <div>테스트 콘텐츠</div>
        </ToastProvider>
      )

      expect(screen.getByText('테스트 콘텐츠')).toBeInTheDocument()
    })
  })

  describe('useToast 훅', () => {
    it('success 토스트 표시', async () => {
      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      )

      fireEvent.click(screen.getByText('Success'))

      expect(screen.getByText('성공 메시지')).toBeInTheDocument()
      expect(screen.getByText('✅')).toBeInTheDocument()
    })

    it('error 토스트 표시', () => {
      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      )

      fireEvent.click(screen.getByText('Error'))

      expect(screen.getByText('에러 메시지')).toBeInTheDocument()
      expect(screen.getByText('❌')).toBeInTheDocument()
    })

    it('warning 토스트 표시', () => {
      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      )

      fireEvent.click(screen.getByText('Warning'))

      expect(screen.getByText('경고 메시지')).toBeInTheDocument()
      expect(screen.getByText('⚠️')).toBeInTheDocument()
    })

    it('info 토스트 표시', () => {
      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      )

      fireEvent.click(screen.getByText('Info'))

      expect(screen.getByText('정보 메시지')).toBeInTheDocument()
      expect(screen.getByText('ℹ️')).toBeInTheDocument()
    })
  })

  describe('자동 제거', () => {
    it('success 토스트가 3초 후 자동 제거', () => {
      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      )

      fireEvent.click(screen.getByText('Success'))
      expect(screen.getByText('성공 메시지')).toBeInTheDocument()

      // 3초 경과
      act(() => {
        vi.advanceTimersByTime(3100)
      })

      expect(screen.queryByText('성공 메시지')).not.toBeInTheDocument()
    })

    it('error 토스트가 5초 후 자동 제거', () => {
      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      )

      fireEvent.click(screen.getByText('Error'))
      expect(screen.getByText('에러 메시지')).toBeInTheDocument()

      // 3초 경과 - 아직 표시됨
      act(() => {
        vi.advanceTimersByTime(3000)
      })
      expect(screen.getByText('에러 메시지')).toBeInTheDocument()

      // 5초 경과 - 제거됨
      act(() => {
        vi.advanceTimersByTime(2100)
      })

      expect(screen.queryByText('에러 메시지')).not.toBeInTheDocument()
    })
  })

  describe('수동 제거', () => {
    it('닫기 버튼 클릭으로 토스트 제거', () => {
      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      )

      fireEvent.click(screen.getByText('Success'))
      expect(screen.getByText('성공 메시지')).toBeInTheDocument()

      // 닫기 버튼 클릭
      fireEvent.click(screen.getByText('×'))

      // exit 애니메이션 대기 (300ms)
      act(() => {
        vi.advanceTimersByTime(400)
      })

      expect(screen.queryByText('성공 메시지')).not.toBeInTheDocument()
    })
  })

  describe('여러 토스트', () => {
    it('여러 토스트 동시 표시', () => {
      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      )

      fireEvent.click(screen.getByText('Success'))
      fireEvent.click(screen.getByText('Error'))
      fireEvent.click(screen.getByText('Warning'))

      expect(screen.getByText('성공 메시지')).toBeInTheDocument()
      expect(screen.getByText('에러 메시지')).toBeInTheDocument()
      expect(screen.getByText('경고 메시지')).toBeInTheDocument()
    })
  })

  describe('Provider 외부에서 useToast', () => {
    it('Provider 없이 사용 시 console fallback', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      function StandaloneComponent() {
        const toastFns = useToast()
        return <button onClick={() => toastFns.success('테스트')}>Click</button>
      }

      render(<StandaloneComponent />)
      fireEvent.click(screen.getByText('Click'))

      expect(consoleSpy).toHaveBeenCalledWith('✅', '테스트')
      consoleSpy.mockRestore()
    })
  })
})
