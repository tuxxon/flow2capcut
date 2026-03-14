/**
 * useStyleThumbnails - 스타일 프리셋 썸네일 생성/로드/캐싱
 */

import { useState, useRef, useCallback, useEffect } from 'react'
import { STYLE_PRESETS } from '../config/defaults'
import { toast } from '../components/Toast'

const THUMBNAIL_PROMPT_PREFIX = 'A serene landscape with mountains and a river'

// 1~3초 랜덤 딜레이
const randomDelay = () => new Promise(r => setTimeout(r, 1000 + Math.random() * 2000))

// 번들된 썸네일 fallback 로드 (public/style-thumbnails/) — 훅 밖 함수
async function loadBundledThumbnails(existingIds = []) {
  const allStyles = STYLE_PRESETS?.styles || []
  const missingStyles = allStyles.filter(s => !existingIds.includes(s.id))
  if (missingStyles.length === 0) return {}

  const bundled = {}
  await Promise.all(
    missingStyles.map(async (style) => {
      try {
        const res = await fetch(`./style-thumbnails/${style.id}.png`)
        if (res.ok) {
          const blob = await res.blob()
          bundled[style.id] = URL.createObjectURL(blob)
        }
      } catch {}
    })
  )
  if (Object.keys(bundled).length > 0) {
    console.log('[StyleThumbnails] Loaded', Object.keys(bundled).length, 'bundled thumbnails')
  }
  return bundled
}

export function useStyleThumbnails(flowAPI) {
  const [thumbnails, setThumbnails] = useState({})         // { presetId: dataUrl }
  const [generating, setGenerating] = useState(false)
  const [stopping, setStopping] = useState(false)
  const [progress, setProgress] = useState({ current: 0, total: 0 })
  const stopRequestedRef = useRef(false)

  // 앱 시작 시 저장된 썸네일 로드
  useEffect(() => {
    loadThumbnails()
  }, [])

  const loadThumbnails = useCallback(async () => {
    let loaded = {}
    // 1) Electron IPC로 사용자 생성 썸네일 로드
    if (window.electronAPI?.loadStyleThumbnails) {
      try {
        const result = await window.electronAPI.loadStyleThumbnails()
        if (result.success && result.thumbnails) {
          loaded = result.thumbnails
          console.log('[StyleThumbnails] Loaded', Object.keys(loaded).length, 'user thumbnails')
        }
      } catch (e) {
        console.warn('[StyleThumbnails] IPC load failed:', e)
      }
    }
    // 2) 없는 것은 번들 fallback
    const bundled = await loadBundledThumbnails(Object.keys(loaded))
    const merged = { ...bundled, ...loaded }  // 사용자 생성분 우선
    setThumbnails(merged)
    console.log('[StyleThumbnails] Total:', Object.keys(merged).length, 'thumbnails')
  }, [])

  // 썸네일 일괄 생성
  const generateThumbnails = useCallback(async (presetIds, t) => {
    if (!flowAPI?.generateImageDOM) {
      toast.error('Flow API not available')
      return
    }

    const allStyles = STYLE_PRESETS?.styles || []
    // presetIds가 없으면 썸네일이 없는 전체 프리셋 대상
    const targetIds = presetIds || allStyles
      .filter(s => !thumbnails[s.id])
      .map(s => s.id)

    if (targetIds.length === 0) {
      toast.info(t?.('reference.thumbnailComplete') || 'All thumbnails generated')
      return
    }

    stopRequestedRef.current = false
    setStopping(false)
    setGenerating(true)
    setProgress({ current: 0, total: targetIds.length, startedAt: Date.now() })

    let generated = 0

    for (const presetId of targetIds) {
      if (stopRequestedRef.current) {
        console.log('[StyleThumbnails] Stop requested')
        toast.info(t?.('reference.thumbnailStopped') || 'Thumbnail generation stopped')
        break
      }

      const preset = allStyles.find(s => s.id === presetId)
      if (!preset) continue

      const prompt = `${THUMBNAIL_PROMPT_PREFIX}, ${preset.prompt_en}`
      console.log(`[StyleThumbnails] Generating ${presetId}: ${prompt}`)

      try {
        const result = await flowAPI.generateImageDOM(prompt, [], { batchCount: 1 })

        if (result.success && result.images?.length > 0) {
          const firstImage = result.images[0]
          const imageData = firstImage.base64 || firstImage
          const dataUrl = imageData.startsWith('data:') ? imageData : `data:image/png;base64,${imageData}`

          // 파일 시스템에 저장
          if (window.electronAPI?.saveStyleThumbnail) {
            await window.electronAPI.saveStyleThumbnail({ presetId, data: dataUrl })
          }

          // state 업데이트
          setThumbnails(prev => ({ ...prev, [presetId]: dataUrl }))
          generated++
        } else {
          console.warn(`[StyleThumbnails] Failed to generate ${presetId}:`, result.error)
        }
      } catch (e) {
        console.error(`[StyleThumbnails] Error generating ${presetId}:`, e)
        // 인증 에러면 중단
        if (e.message?.includes('401') || e.message?.includes('auth')) {
          toast.error(t?.('toast.authErrorStop') || 'Authentication error')
          break
        }
      }

      setProgress(prev => ({ ...prev, current: prev.current + 1 }))

      // 랜덤 딜레이
      if (presetId !== targetIds[targetIds.length - 1]) {
        await randomDelay()
      }
    }

    setGenerating(false)
    setStopping(false)

    if (generated > 0) {
      toast.success(t?.('reference.thumbnailComplete', { count: generated }) || `${generated} thumbnails generated`)
    }
  }, [flowAPI, thumbnails])

  const stopGenerating = useCallback(() => {
    stopRequestedRef.current = true
    setStopping(true)
  }, [])

  // 개별 썸네일 삭제
  const deleteThumbnail = useCallback(async (presetId) => {
    if (window.electronAPI?.deleteStyleThumbnail) {
      await window.electronAPI.deleteStyleThumbnail({ presetId })
    }
    setThumbnails(prev => {
      const next = { ...prev }
      delete next[presetId]
      return next
    })
    console.log('[StyleThumbnails] Deleted:', presetId)
  }, [])

  return {
    thumbnails,
    generating,
    stopping,
    progress,
    generateThumbnails,
    stopGenerating,
    deleteThumbnail,
    loadThumbnails
  }
}
