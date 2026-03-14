/**
 * useAudioImport Hook
 *
 * 오디오 패키지 폴더를 스캔하고, SRT와 매칭하여
 * CapCut 내보내기용 멀티트랙 오디오 데이터를 생성.
 */

import { useState, useCallback } from 'react'
import { parseSRT, parseSfxTimecodes, buildAudioTracks } from '../utils/audioTimeline'
import { toast } from '../components/Toast'

export function useAudioImport(t) {
  const [audioPackage, setAudioPackage] = useState(null)
  const [audioTracks, setAudioTracks] = useState(null)
  const [importing, setImporting] = useState(false)

  /**
   * 오디오 패키지 폴더 선택 및 스캔
   */
  const importAudioPackage = useCallback(async () => {
    if (!window.electronAPI?.scanAudioPackage) {
      toast.error(t('audioImport.electronRequired'))
      return null
    }

    setImporting(true)
    try {
      const result = await window.electronAPI.scanAudioPackage()

      if (!result.success) {
        if (result.error !== 'cancelled') {
          toast.error(t('audioImport.scanFailed').replace('{error}', result.error))
        }
        return null
      }

      // SRT 파싱
      let srtEntries = []
      if (result.srtContent) {
        srtEntries = parseSRT(result.srtContent)
      }

      // SFX 타임코드 파싱
      let sfxTimecodes = []
      if (result.sfxMdContent) {
        sfxTimecodes = parseSfxTimecodes(result.sfxMdContent)
      }

      // 오디오 패키지 구성
      const pkg = {
        folderPath: result.folderPath,
        footage: result.footage,
        voices: result.voices,
        sfx: result.sfx,
        sfxTimecodes,
        srtEntries,
        summary: result.summary
      }

      setAudioPackage(pkg)

      // 트랙 데이터 생성
      const tracks = buildAudioTracks(pkg, srtEntries)
      setAudioTracks(tracks)

      // 성공 토스트
      const { summary } = result
      toast.success(
        t('audioImport.scanSuccess')
          .replace('{characters}', summary.characters.join(', '))
          .replace('{voiceCount}', summary.totalVoiceFiles)
          .replace('{sfxCount}', summary.totalSfxCategories)
      )

      return pkg
    } catch (error) {
      console.error('[AudioImport] Error:', error)
      toast.error(t('audioImport.scanFailed').replace('{error}', error.message))
      return null
    } finally {
      setImporting(false)
    }
  }, [t])

  /**
   * 오디오 패키지 초기화
   */
  const clearAudioPackage = useCallback(() => {
    setAudioPackage(null)
    setAudioTracks(null)
  }, [])

  return {
    audioPackage,
    audioTracks,
    importing,
    importAudioPackage,
    clearAudioPackage,
    setAudioPackage,
    setAudioTracks
  }
}
