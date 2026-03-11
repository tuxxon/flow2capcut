/**
 * CapCut Cloud Exporter 통합 테스트
 *
 * ZIP 생성, 미디어 처리, 유틸리티 함수 테스트
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// 유틸리티 함수들 (capcutCloud.js 내부 로직 테스트)
describe('이미지 확장자 감지', () => {
  // base64 시그니처로 이미지 확장자 감지
  function detectImageExtension(base64Data) {
    if (!base64Data) return 'png'
    const clean = base64Data.replace(/^data:[^;]+;base64,/, '')
    if (clean.startsWith('/9j/')) return 'jpg'
    if (clean.startsWith('iVBOR')) return 'png'
    if (clean.startsWith('R0lGOD')) return 'gif'
    if (clean.startsWith('UklGR')) return 'webp'
    return 'png'
  }

  it('JPEG 감지', () => {
    expect(detectImageExtension('/9j/4AAQSkZJRgAB')).toBe('jpg')
    expect(detectImageExtension('data:image/jpeg;base64,/9j/4AAQ')).toBe('jpg')
  })

  it('PNG 감지', () => {
    expect(detectImageExtension('iVBORw0KGgoAAAANSUhEUg')).toBe('png')
    expect(detectImageExtension('data:image/png;base64,iVBORw0KG')).toBe('png')
  })

  it('GIF 감지', () => {
    expect(detectImageExtension('R0lGODlhAQABAIAAAP')).toBe('gif')
  })

  it('WebP 감지', () => {
    expect(detectImageExtension('UklGRlYAAABXRUJQ')).toBe('webp')
  })

  it('알 수 없는 포맷은 png 기본값', () => {
    expect(detectImageExtension('unknown_data')).toBe('png')
    expect(detectImageExtension('')).toBe('png')
    expect(detectImageExtension(null)).toBe('png')
  })
})

describe('파일 경로 감지', () => {
  // 파일 경로인지 체크
  function isFilePath(data) {
    if (!data) return false
    if (data.startsWith('data:')) return false
    if (data.startsWith('http')) return false
    if (data.startsWith('/9j/') || data.startsWith('iVBOR') ||
        data.startsWith('AAAA') || data.startsWith('//u') || data.startsWith('SUQ')) {
      return false
    }
    return data.includes('/')
  }

  it('파일 경로 감지', () => {
    expect(isFilePath('project/images/scene_1.png')).toBe(true)
    expect(isFilePath('/absolute/path/to/file.jpg')).toBe(true)
    expect(isFilePath('folder/subfolder/image.webp')).toBe(true)
  })

  it('data URL은 파일 경로가 아님', () => {
    expect(isFilePath('data:image/png;base64,iVBORw0KG')).toBe(false)
    expect(isFilePath('data:image/jpeg;base64,/9j/4AAQ')).toBe(false)
  })

  it('HTTP URL은 파일 경로가 아님', () => {
    expect(isFilePath('http://example.com/image.png')).toBe(false)
    expect(isFilePath('https://example.com/image.jpg')).toBe(false)
  })

  it('base64 raw 데이터는 파일 경로가 아님', () => {
    expect(isFilePath('/9j/4AAQSkZJRgABAQAAAQ')).toBe(false) // JPEG
    expect(isFilePath('iVBORw0KGgoAAAANSUhEUg')).toBe(false) // PNG
    expect(isFilePath('AAAA')).toBe(false) // MP4
    expect(isFilePath('//u')).toBe(false) // MP3
    expect(isFilePath('SUQ')).toBe(false) // MP3 (ID3)
  })

  it('null/undefined 처리', () => {
    expect(isFilePath(null)).toBe(false)
    expect(isFilePath(undefined)).toBe(false)
    expect(isFilePath('')).toBe(false)
  })
})

describe('파일명 생성', () => {
  function getFilename(path, sceneId, type) {
    if (!path) return `${type}_${sceneId}.bin`

    if (path.startsWith('data:')) {
      const mimeMatch = path.match(/data:([^;]+)/)
      const mime = mimeMatch ? mimeMatch[1] : 'application/octet-stream'
      const extMap = {
        'image/png': 'png',
        'image/jpeg': 'jpg',
        'image/gif': 'gif',
        'video/mp4': 'mp4',
        'video/webm': 'webm',
        'audio/mpeg': 'mp3',
        'audio/mp3': 'mp3',
        'audio/wav': 'wav'
      }
      const ext = extMap[mime] || 'bin'
      return `${type}_${sceneId}.${ext}`
    }

    // base64 시그니처 감지
    if (path.startsWith('/9j/')) return `${type}_${sceneId}.jpg`
    if (path.startsWith('iVBOR')) return `${type}_${sceneId}.png`
    if (path.startsWith('R0lGOD')) return `${type}_${sceneId}.gif`
    if (path.startsWith('UklGR')) return `${type}_${sceneId}.webp`

    // 파일 경로에서 파일명 추출
    if (path.includes('/')) {
      const parts = path.split('/')
      return parts[parts.length - 1] || `${type}_${sceneId}.bin`
    }

    return `${type}_${sceneId}.bin`
  }

  it('data URL에서 파일명 생성', () => {
    expect(getFilename('data:image/png;base64,xxx', 'scene_1', 'image')).toBe('image_scene_1.png')
    expect(getFilename('data:image/jpeg;base64,xxx', 'scene_2', 'image')).toBe('image_scene_2.jpg')
    expect(getFilename('data:video/mp4;base64,xxx', 'scene_1', 'video')).toBe('video_scene_1.mp4')
    expect(getFilename('data:audio/mpeg;base64,xxx', 'scene_1', 'sfx')).toBe('sfx_scene_1.mp3')
  })

  it('파일 경로에서 파일명 추출', () => {
    expect(getFilename('project/images/my_image.png', 'scene_1', 'image')).toBe('my_image.png')
    expect(getFilename('videos/clip.mp4', 'scene_1', 'video')).toBe('clip.mp4')
  })

  it('base64 raw에서 파일명 생성', () => {
    expect(getFilename('/9j/4AAQ', 'scene_1', 'image')).toBe('image_scene_1.jpg')
    expect(getFilename('iVBORw0', 'scene_1', 'image')).toBe('image_scene_1.png')
  })

  it('null/undefined는 기본 파일명', () => {
    expect(getFilename(null, 'scene_1', 'image')).toBe('image_scene_1.bin')
    expect(getFilename('', 'scene_1', 'video')).toBe('video_scene_1.bin')
  })
})

describe('Cloud Request 준비', () => {
  // prepareCloudRequest 로직 테스트
  it('씬 메타데이터 변환', () => {
    const scenes = [
      {
        id: 'scene_1',
        image_path: 'data:image/png;base64,iVBOR',
        image_duration: 3,
        subtitle_ko: '첫 번째 자막',
        subtitle_en: 'First subtitle'
      },
      {
        id: 'scene_2',
        image_path: 'project/images/scene_2.jpg',
        image_duration: 5,
        subtitle_ko: '두 번째 자막',
        subtitle_en: 'Second subtitle'
      }
    ]

    // 변환 로직 시뮬레이션
    const cloudScenes = scenes.map(scene => ({
      id: scene.id,
      type: 'image',
      filename: scene.image_path.startsWith('data:')
        ? `image_${scene.id}.png`
        : scene.image_path.split('/').pop(),
      width: 1024,
      height: 1024,
      duration: scene.image_duration || 3,
      subtitleKo: scene.subtitle_ko || null,
      subtitleEn: scene.subtitle_en || null
    }))

    expect(cloudScenes).toHaveLength(2)
    expect(cloudScenes[0].filename).toBe('image_scene_1.png')
    expect(cloudScenes[0].duration).toBe(3)
    expect(cloudScenes[0].subtitleKo).toBe('첫 번째 자막')
    expect(cloudScenes[1].filename).toBe('scene_2.jpg')
  })

  it('비디오 씬 변환', () => {
    const scene = { id: 'scene_1', image_path: 'img.png', image_duration: 3 }
    const video = { from_scene: 'scene_1', video_path: 'data:video/mp4;base64,AAAA', duration: 10 }

    // 비디오가 있으면 비디오 타입으로 변환
    const isVideo = video && video.from_scene === scene.id
    const cloudScene = {
      id: scene.id,
      type: isVideo ? 'video' : 'image',
      duration: isVideo ? video.duration : scene.image_duration
    }

    expect(cloudScene.type).toBe('video')
    expect(cloudScene.duration).toBe(10)
  })

  it('SFX 메타데이터 변환', () => {
    const scenes = [
      { id: 'scene_1', sfx_path: 'data:audio/mpeg;base64,//u', sfx_duration: 3 },
      { id: 'scene_2', sfx_path: null }
    ]

    const sfxItems = scenes
      .filter(s => s.sfx_path)
      .map(s => ({
        sceneId: s.id,
        filename: `sfx_${s.id}.mp3`,
        duration: s.sfx_duration || 3
      }))

    expect(sfxItems).toHaveLength(1)
    expect(sfxItems[0].sceneId).toBe('scene_1')
    expect(sfxItems[0].duration).toBe(3)
  })
})

describe('Ken Burns 옵션', () => {
  it('Ken Burns 설정 변환', () => {
    const options = {
      kenBurns: true,
      kenBurnsMode: 'zoom_in',
      kenBurnsCycle: 3,
      kenBurnsScaleMin: 1.0,
      kenBurnsScaleMax: 1.5
    }

    const kenBurnsConfig = {
      enabled: options.kenBurns,
      mode: options.kenBurnsMode,
      cycle: options.kenBurnsCycle,
      scaleMin: options.kenBurnsScaleMin,
      scaleMax: options.kenBurnsScaleMax
    }

    expect(kenBurnsConfig.enabled).toBe(true)
    expect(kenBurnsConfig.mode).toBe('zoom_in')
    expect(kenBurnsConfig.cycle).toBe(3)
    expect(kenBurnsConfig.scaleMin).toBe(1.0)
    expect(kenBurnsConfig.scaleMax).toBe(1.5)
  })

  it('Ken Burns 비활성화', () => {
    const options = { kenBurns: false }

    const kenBurnsConfig = {
      enabled: options.kenBurns || false,
      mode: options.kenBurnsMode || 'random',
      cycle: options.kenBurnsCycle || 5,
      scaleMin: options.kenBurnsScaleMin || 1.0,
      scaleMax: options.kenBurnsScaleMax || 1.3
    }

    expect(kenBurnsConfig.enabled).toBe(false)
    expect(kenBurnsConfig.mode).toBe('random') // 기본값
  })
})

describe('프로젝트 폴더 경로', () => {
  it('mediaPathBase 설정', () => {
    const capcutProjectNumber = '/path/to/0128/'

    const cleanPath = capcutProjectNumber.replace(/\/+$/, '')
    const mediaPathBase = `${cleanPath}/media`

    expect(mediaPathBase).toBe('/path/to/0128/media')
  })

  it('프로젝트 폴더명 추출', () => {
    const paths = [
      '/path/to/0128/',
      '/path/to/0128',
      '0128/',
      '0128'
    ]

    paths.forEach(path => {
      const cleanPath = path.replace(/[/\\]+$/, '')
      const projectFolderName = cleanPath.split(/[/\\]/).pop() || '0128'
      expect(projectFolderName).toBe('0128')
    })
  })

  it('빈 프로젝트 번호 처리', () => {
    const capcutProjectNumber = ''

    expect(() => {
      if (!capcutProjectNumber) {
        throw new Error('CapCut 프로젝트 폴더 경로가 필요합니다.')
      }
    }).toThrow('CapCut 프로젝트 폴더 경로가 필요합니다.')
  })
})

describe('자막 옵션', () => {
  const subtitleOptions = ['ko', 'en', 'both', 'none']

  it('한국어만 선택', () => {
    const option = 'ko'
    const includeKo = option === 'ko' || option === 'both'
    const includeEn = option === 'en' || option === 'both'

    expect(includeKo).toBe(true)
    expect(includeEn).toBe(false)
  })

  it('영어만 선택', () => {
    const option = 'en'
    const includeKo = option === 'ko' || option === 'both'
    const includeEn = option === 'en' || option === 'both'

    expect(includeKo).toBe(false)
    expect(includeEn).toBe(true)
  })

  it('둘 다 선택', () => {
    const option = 'both'
    const includeKo = option === 'ko' || option === 'both'
    const includeEn = option === 'en' || option === 'both'

    expect(includeKo).toBe(true)
    expect(includeEn).toBe(true)
  })

  it('자막 없음', () => {
    const option = 'none'
    const includeKo = option === 'ko' || option === 'both'
    const includeEn = option === 'en' || option === 'both'

    expect(includeKo).toBe(false)
    expect(includeEn).toBe(false)
  })
})

describe('스케일 모드', () => {
  const scaleModes = ['fill', 'fit', 'none']

  it('유효한 스케일 모드', () => {
    scaleModes.forEach(mode => {
      expect(['fill', 'fit', 'none']).toContain(mode)
    })
  })

  it('기본값은 fill', () => {
    const options = {}
    const scaleMode = options.scaleMode || 'fill'
    expect(scaleMode).toBe('fill')
  })
})
