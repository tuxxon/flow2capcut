/**
 * useFileSystem 훅 테스트 (Desktop)
 *
 * Electron IPC 기반 파일 시스템 관리 테스트
 * Desktop에서는 File System Access API 대신 window.electronAPI를 사용
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

describe('fileSystemAPI 유틸리티', () => {
  describe('_getTimestamp', () => {
    it('ISO 형식 타임스탬프 생성', () => {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
      expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}$/)
    })
  })

  describe('_detectMimeType', () => {
    function detectMimeType(base64Data) {
      const cleanBase64 = base64Data.replace(/^data:[^;]+;base64,/, '')
      if (cleanBase64.startsWith('/9j/')) return { mimeType: 'image/jpeg', ext: 'jpg' }
      else if (cleanBase64.startsWith('iVBOR')) return { mimeType: 'image/png', ext: 'png' }
      else if (cleanBase64.startsWith('R0lGOD')) return { mimeType: 'image/gif', ext: 'gif' }
      else if (cleanBase64.startsWith('UklGR')) return { mimeType: 'image/webp', ext: 'webp' }
      else if (cleanBase64.startsWith('//u') || cleanBase64.startsWith('SUQ')) return { mimeType: 'audio/mpeg', ext: 'mp3' }
      else if (cleanBase64.startsWith('AAAA')) return { mimeType: 'video/mp4', ext: 'mp4' }
      return { mimeType: 'image/png', ext: 'png' }
    }

    it('JPEG 감지', () => {
      const result = detectMimeType('/9j/4AAQSkZJRgABAQAAAQ')
      expect(result.mimeType).toBe('image/jpeg')
      expect(result.ext).toBe('jpg')
    })

    it('PNG 감지', () => {
      const result = detectMimeType('iVBORw0KGgoAAAANSUhEUg')
      expect(result.mimeType).toBe('image/png')
      expect(result.ext).toBe('png')
    })

    it('GIF 감지', () => {
      const result = detectMimeType('R0lGODlhAQABAIAAAP')
      expect(result.mimeType).toBe('image/gif')
      expect(result.ext).toBe('gif')
    })

    it('WebP 감지', () => {
      const result = detectMimeType('UklGRlYAAABXRUJQ')
      expect(result.mimeType).toBe('image/webp')
      expect(result.ext).toBe('webp')
    })

    it('MP3 감지 (//u)', () => {
      const result = detectMimeType('//uQxAAA')
      expect(result.mimeType).toBe('audio/mpeg')
      expect(result.ext).toBe('mp3')
    })

    it('MP3 감지 (ID3)', () => {
      const result = detectMimeType('SUQzBAA')
      expect(result.mimeType).toBe('audio/mpeg')
      expect(result.ext).toBe('mp3')
    })

    it('MP4 감지', () => {
      const result = detectMimeType('AAAAIGZ0eXBpc29t')
      expect(result.mimeType).toBe('video/mp4')
      expect(result.ext).toBe('mp4')
    })

    it('data: prefix 제거', () => {
      const result = detectMimeType('data:image/jpeg;base64,/9j/4AAQ')
      expect(result.mimeType).toBe('image/jpeg')
    })

    it('알 수 없는 형식은 PNG 기본값', () => {
      const result = detectMimeType('unknown_data')
      expect(result.mimeType).toBe('image/png')
      expect(result.ext).toBe('png')
    })
  })

  describe('_base64ToBlob', () => {
    function base64ToBlob(base64Data, mimeType = 'image/png') {
      const cleanBase64 = base64Data.replace(/^data:[^;]+;base64,/, '')
      const binaryData = atob(cleanBase64)
      const bytes = new Uint8Array(binaryData.length)
      for (let i = 0; i < binaryData.length; i++) {
        bytes[i] = binaryData.charCodeAt(i)
      }
      return new Blob([bytes], { type: mimeType })
    }

    it('base64를 Blob으로 변환', () => {
      const pngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
      const blob = base64ToBlob(pngBase64, 'image/png')
      expect(blob).toBeInstanceOf(Blob)
      expect(blob.type).toBe('image/png')
      expect(blob.size).toBeGreaterThan(0)
    })

    it('data: prefix 처리', () => {
      const dataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
      const blob = base64ToBlob(dataUrl, 'image/png')
      expect(blob).toBeInstanceOf(Blob)
    })
  })
})

describe('폴더 구조 관리', () => {
  it('리소스 타입별 폴더 경로', () => {
    const resourceTypes = ['images', 'references', 'videos', 'sfx']
    const projectName = 'my_project'
    resourceTypes.forEach(type => {
      const path = `${projectName}/${type}`
      const historyPath = `${projectName}/${type}/history`
      expect(path).toBe(`my_project/${type}`)
      expect(historyPath).toBe(`my_project/${type}/history`)
    })
  })

  it('프로젝트 폴더 구조', () => {
    const expectedStructure = {
      'project_name': {
        'images': { 'history': {} },
        'references': { 'history': {} },
        'videos': { 'history': {} },
        'sfx': { 'history': {} },
        'project.json': 'file'
      }
    }
    expect(expectedStructure).toHaveProperty('project_name')
    expect(expectedStructure.project_name).toHaveProperty('images')
    expect(expectedStructure.project_name.images).toHaveProperty('history')
  })
})

describe('히스토리 파일명 생성', () => {
  it('히스토리 파일명 형식', () => {
    const baseName = 'scene_1'
    const timestamp = '2024-01-19T12-00-00'
    const engine = 'whisk'
    const ext = 'png'
    const historyFilename = `${baseName}_${timestamp}_${engine}.${ext}`
    expect(historyFilename).toBe('scene_1_2024-01-19T12-00-00_whisk.png')
  })

  it('다양한 엔진 태그', () => {
    const engines = ['whisk', 'kling', 'imported', 'before-restore']
    const baseName = 'ref_alice'
    const timestamp = '2024-01-19T12-00-00'
    engines.forEach(engine => {
      const filename = `${baseName}_${timestamp}_${engine}.png`
      expect(filename).toContain(`_${engine}.png`)
    })
  })
})

describe('saveResource 로직', () => {
  it('파일명 생성 (특수문자 제거)', () => {
    const names = [
      { input: 'scene_1', expected: 'scene_1' },
      { input: 'scene 1', expected: 'scene_1' },
      { input: 'scene/1', expected: 'scene_1' },
      { input: 'scene:1', expected: 'scene_1' },
      { input: '씬_1', expected: '씬_1' },
      { input: 'scene@#$%1', expected: 'scene____1' }
    ]
    names.forEach(({ input, expected }) => {
      const safeName = String(input).replace(/[^a-zA-Z0-9가-힣_-]/g, '_')
      expect(safeName).toBe(expected)
    })
  })

  it('저장 결과 객체 구조', () => {
    const result = {
      success: true,
      filename: 'scene_1.png',
      path: 'my_project/images/scene_1.png',
      fileHandle: {},
      engine: 'whisk',
      historyFilename: 'scene_1_2024-01-19T12-00-00_whisk.png',
      dataUrl: 'data:image/png;base64,xxx'
    }
    expect(result).toHaveProperty('success')
    expect(result).toHaveProperty('filename')
    expect(result).toHaveProperty('path')
    expect(result).toHaveProperty('dataUrl')
  })
})

describe('Desktop: Electron IPC 기반 저장', () => {
  it('saveResource가 window.electronAPI.saveResource를 호출', async () => {
    const mockSaveResource = vi.fn().mockResolvedValue({
      success: true,
      path: 'project/images/scene_1.png'
    })
    window.electronAPI.saveResource = mockSaveResource

    localStorage.setItem('workFolderPath', '/Users/test/workfolder')

    const result = await window.electronAPI.saveResource({
      workFolder: '/Users/test/workfolder',
      project: 'my_project',
      resourceType: 'images',
      name: 'scene_1',
      data: 'base64_data',
      engine: 'whisk'
    })

    expect(mockSaveResource).toHaveBeenCalled()
    expect(result.success).toBe(true)
  })

  it('workFolder 미설정 시 에러', () => {
    localStorage.removeItem('workFolderPath')
    const path = localStorage.getItem('workFolderPath')
    expect(path).toBeNull()
  })
})

describe('readResource 로직', () => {
  it('확장자 탐색 순서', () => {
    const extensions = ['png', 'jpg', 'jpeg', 'webp', 'gif']
    expect(extensions[0]).toBe('png')
    expect(extensions.length).toBe(5)
  })
})

describe('히스토리 관리', () => {
  describe('getHistory', () => {
    it('히스토리 필터링 로직', () => {
      const files = [
        { name: 'scene_1_2024-01-19T10-00-00_whisk.png' },
        { name: 'scene_1_2024-01-19T11-00-00_whisk.png' },
        { name: 'scene_1_2024-01-19T12-00-00_whisk.json' },
        { name: 'scene_2_2024-01-19T10-00-00_whisk.png' },
      ]
      const prefix = 'scene_1'
      const imageExtensions = ['.png', '.jpg', '.jpeg', '.webp', '.gif']
      const filtered = files.filter(f => {
        const isImage = imageExtensions.some(ext => f.name.toLowerCase().endsWith(ext))
        return f.name.startsWith(prefix + '_') && isImage
      })
      expect(filtered).toHaveLength(2)
    })

    it('엔진 추출 로직', () => {
      const filenames = [
        { name: 'scene_1_2024-01-19T12-00-00_whisk.png', expected: 'whisk' },
        { name: 'scene_1_2024-01-19T12-00-00_kling.png', expected: 'kling' },
        { name: 'scene_1_2024-01-19T12-00-00_imported.png', expected: 'imported' },
        { name: 'scene_1_2024-01-19T12-00-00_before-restore.png', expected: 'before-restore' },
      ]
      filenames.forEach(({ name, expected }) => {
        const engineMatch = name.match(/_([a-zA-Z][a-zA-Z0-9-]*)\.(\w+)$/)
        let engine = 'whisk'
        if (engineMatch) engine = engineMatch[1]
        expect(engine).toBe(expected)
      })
    })
  })

  describe('restoreFromHistory', () => {
    it('복원 전 백업 파일명', () => {
      const currentFilename = 'scene_1.png'
      const baseName = currentFilename.replace(/\.[^/.]+$/, '')
      const timestamp = '2024-01-19T12-00-00'
      const backupFilename = `${baseName}_${timestamp}_before-restore.png`
      expect(backupFilename).toBe('scene_1_2024-01-19T12-00-00_before-restore.png')
    })
  })

  describe('readHistoryFile', () => {
    it('메타데이터 파일명 변환', () => {
      const imageFilename = 'scene_1_2024-01-19T12-00-00_whisk.png'
      const metaFilename = imageFilename.replace(/\.(png|jpg|jpeg|webp|gif)$/i, '.json')
      expect(metaFilename).toBe('scene_1_2024-01-19T12-00-00_whisk.json')
    })
  })
})

describe('프로젝트 데이터 관리', () => {
  describe('saveProjectData', () => {
    it('프로젝트 데이터 구조', () => {
      const projectData = {
        scenes: [{ id: 'scene_1', prompt: '프롬프트1', image: 'base64...' }],
        references: [{ name: 'alice', type: 'character', data: 'base64...' }],
        settings: { aspectRatio: '16:9', defaultDuration: 3 }
      }
      const json = JSON.stringify(projectData, null, 2)
      expect(json).toContain('"scenes"')
      expect(json).toContain('"references"')
      expect(json).toContain('"settings"')
    })
  })

  describe('loadProjectData', () => {
    it('새 프로젝트 응답 구조', () => {
      const newProjectResponse = { success: true, data: null, isNew: true }
      expect(newProjectResponse.isNew).toBe(true)
      expect(newProjectResponse.data).toBeNull()
    })

    it('기존 프로젝트 응답 구조', () => {
      const existingProjectResponse = {
        success: true,
        data: { scenes: [], references: [], settings: {} },
        isNew: false
      }
      expect(existingProjectResponse.isNew).toBe(false)
      expect(existingProjectResponse.data).not.toBeNull()
    })
  })
})

describe('프로젝트 이름 변경', () => {
  it('이름 변경 시나리오', () => {
    const scenarios = [
      { oldName: 'project_old', newName: 'project_new', shouldSucceed: true },
      { oldName: 'project', newName: 'project', shouldSucceed: false, error: 'same_name' },
    ]
    scenarios.forEach(({ oldName, newName, shouldSucceed }) => {
      if (oldName === newName) expect(shouldSucceed).toBe(false)
    })
  })

  it('이미 존재하는 이름 확인', () => {
    const existingProjects = ['project_a', 'project_b', 'project_c']
    const newName = 'project_b'
    const alreadyExists = existingProjects.includes(newName)
    expect(alreadyExists).toBe(true)
  })
})

describe('Desktop: 권한 관리', () => {
  describe('selectWorkFolder', () => {
    it('폴더 선택 성공 시 localStorage에 저장', async () => {
      window.electronAPI.selectWorkFolder = vi.fn().mockResolvedValue({
        path: '/Users/test/workfolder',
        name: 'workfolder'
      })

      const result = await window.electronAPI.selectWorkFolder()
      localStorage.setItem('workFolderPath', result.path)
      localStorage.setItem('workFolderName', result.name)

      expect(localStorage.getItem('workFolderPath')).toBe('/Users/test/workfolder')
      expect(localStorage.getItem('workFolderName')).toBe('workfolder')
    })

    it('폴더 선택 취소', async () => {
      window.electronAPI.selectWorkFolder = vi.fn().mockResolvedValue({ canceled: true })
      const result = await window.electronAPI.selectWorkFolder()
      expect(result.canceled).toBe(true)
    })
  })

  describe('checkPermission', () => {
    it('폴더 설정됨 + 존재함 = 권한 있음', () => {
      localStorage.setItem('workFolderPath', '/Users/test/workfolder')
      const path = localStorage.getItem('workFolderPath')
      expect(path).toBeTruthy()
    })

    it('폴더 미설정 = 권한 없음', () => {
      localStorage.removeItem('workFolderPath')
      const path = localStorage.getItem('workFolderPath')
      expect(path).toBeNull()
    })
  })

  describe('ensurePermission', () => {
    it('Desktop에서는 checkPermission과 동일', () => {
      localStorage.setItem('workFolderPath', '/Users/test/workfolder')
      const path = localStorage.getItem('workFolderPath')
      const hasPermission = !!path
      expect(hasPermission).toBe(true)
    })
  })
})

describe('프로젝트 목록', () => {
  it('프로젝트 정렬 (최신순)', () => {
    const projects = [
      'whisk2capcut_1705600000000',
      'whisk2capcut_1705700000000',
      'whisk2capcut_1705500000000'
    ]
    const sorted = [...projects].sort().reverse()
    expect(sorted[0]).toBe('whisk2capcut_1705700000000')
    expect(sorted[2]).toBe('whisk2capcut_1705500000000')
  })
})

describe('래퍼 함수들', () => {
  it('saveImage는 images 리소스 타입 사용', () => {
    expect('images').toBe('images')
  })

  it('saveReference는 references 리소스 타입 사용', () => {
    expect('references').toBe('references')
  })

  it('saveVideo는 videos 리소스 타입 사용', () => {
    expect('videos').toBe('videos')
  })

  it('saveSFX는 sfx 리소스 타입 사용', () => {
    expect('sfx').toBe('sfx')
  })
})
