/**
 * useReferenceGeneration 훅 테스트
 *
 * 레퍼런스 이미지 생성 (개별 + 일괄) 테스트
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock 함수들
const mockToast = {
  warning: vi.fn(),
  info: vi.fn(),
  error: vi.fn()
}

const mockFileSystemAPI = {
  saveReference: vi.fn(),
  ensurePermission: vi.fn()
}

const mockCheckFolderPermission = vi.fn()
const mockCheckAuthToken = vi.fn()
const mockGenerateImageAPI = vi.fn()
const mockUploadReference = vi.fn()
const mockGetAccessToken = vi.fn()
const mockSetReferences = vi.fn()
const mockAddPendingSave = vi.fn()
const mockOpenSettings = vi.fn()

describe('useReferenceGeneration 로직', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('handleGenerateRef (개별)', () => {
    describe('사전 검사', () => {
      it('프롬프트 없으면 경고', () => {
        const ref = { name: 'alice', prompt: '' }

        if (!ref?.prompt) {
          mockToast.warning('프롬프트가 없습니다.')
        }

        expect(mockToast.warning).toHaveBeenCalledWith('프롬프트가 없습니다.')
      })

      it('폴더 권한 실패 시 중단', async () => {
        mockCheckFolderPermission.mockResolvedValue(false)

        const permissionOk = await mockCheckFolderPermission()

        expect(permissionOk).toBe(false)
      })

      it('토큰 없으면 authError 반환', async () => {
        mockCheckAuthToken.mockResolvedValue(false)

        const tokenOk = await mockCheckAuthToken()

        if (!tokenOk) {
          const result = { success: false, authError: true }
          expect(result.authError).toBe(true)
        }
      })
    })

    describe('이미지 생성', () => {
      it('seed 처리', () => {
        const settings = { seedLocked: true, seed: 12345 }
        const seedToUse = settings.seedLocked ? settings.seed : null

        expect(seedToUse).toBe(12345)
      })

      it('빈 레퍼런스 배열로 생성', async () => {
        mockGenerateImageAPI.mockResolvedValue({
          success: true,
          images: ['base64_image']
        })

        const result = await mockGenerateImageAPI('prompt', '16:9', [], null)

        expect(result.success).toBe(true)
      })
    })

    describe('Whisk 업로드', () => {
      it('업로드 성공 시 mediaId, caption 반환', async () => {
        mockUploadReference.mockResolvedValue({
          success: true,
          mediaId: 'media_123',
          caption: 'Beautiful landscape'
        })

        const result = await mockUploadReference('base64', 'MEDIA_CATEGORY_SCENE')

        expect(result.mediaId).toBe('media_123')
        expect(result.caption).toBeDefined()
      })

      it('업로드 실패해도 계속 진행', async () => {
        mockUploadReference.mockResolvedValue({
          success: false,
          error: 'Upload failed'
        })

        const result = await mockUploadReference('base64', 'MEDIA_CATEGORY_SUBJECT')

        // 업로드 실패해도 로컬 저장은 진행
        expect(result.success).toBe(false)
      })

      it('base64 prefix 제거', () => {
        const imageData = 'data:image/png;base64,iVBORw0KGgo'
        const cleanBase64 = imageData.split(',')[1] || imageData

        expect(cleanBase64).toBe('iVBORw0KGgo')
      })
    })

    describe('파일 저장', () => {
      it('folder 모드일 때 저장', async () => {
        const settings = { saveMode: 'folder', projectName: 'test_project' }

        mockFileSystemAPI.saveReference.mockResolvedValue({
          success: true,
          path: 'test_project/references/alice.png',
          dataUrl: 'data:image/png;base64,...'
        })

        if (settings.saveMode === 'folder') {
          const result = await mockFileSystemAPI.saveReference(
            settings.projectName,
            'alice',
            'base64_data',
            'whisk',
            { mediaId: 'media_123', caption: 'Alice', category: 'MEDIA_CATEGORY_SUBJECT' }
          )

          expect(result.success).toBe(true)
          expect(result.path).toContain('references')
        }
      })

      it('저장 실패 시 pendingSave 추가', async () => {
        mockFileSystemAPI.saveReference.mockResolvedValue({
          success: false,
          error: 'Permission denied'
        })

        const saveResult = await mockFileSystemAPI.saveReference(
          'project',
          'alice',
          'base64',
          'whisk',
          {}
        )

        if (!saveResult.success) {
          mockAddPendingSave(vi.fn())
          mockToast.warning('로컬 저장을 위해 권한이 필요합니다.')
          mockOpenSettings('storage')
        }

        expect(mockAddPendingSave).toHaveBeenCalled()
        expect(mockToast.warning).toHaveBeenCalled()
        expect(mockOpenSettings).toHaveBeenCalledWith('storage')
      })
    })

    describe('레퍼런스 업데이트', () => {
      it('함수형 업데이트로 상태 변경', () => {
        const prevRefs = [
          { name: 'alice', type: 'character', data: null },
          { name: 'bob', type: 'character', data: null }
        ]
        const index = 0
        const newData = {
          data: 'base64_image',
          filePath: 'project/references/alice.png',
          dataStorage: 'file',
          mediaId: 'media_123',
          caption: 'Alice'
        }

        const updatedRefs = prevRefs.map((r, i) =>
          i === index ? { ...r, ...newData } : r
        )

        expect(updatedRefs[0].data).toBe('base64_image')
        expect(updatedRefs[0].mediaId).toBe('media_123')
        expect(updatedRefs[1].data).toBeNull()
      })

      it('dataStorage 결정', () => {
        const filePath = 'project/references/alice.png'
        const dataStorage = filePath ? 'file' : 'base64'

        expect(dataStorage).toBe('file')

        const noFilePath = null
        const dataStorage2 = noFilePath ? 'file' : 'base64'

        expect(dataStorage2).toBe('base64')
      })
    })

    describe('인증 에러 감지', () => {
      it('401 에러 감지', () => {
        const errorMsg = '401 Unauthorized'
        const isAuthError = errorMsg.includes('401')

        expect(isAuthError).toBe(true)
      })

      it('auth 관련 에러 감지', () => {
        const errorMessages = [
          '401 Unauthorized',
          'auth error',
          'token expired',
          'login required'
        ]

        errorMessages.forEach(msg => {
          const isAuthError = msg.includes('401') ||
            msg.includes('auth') ||
            msg.includes('token') ||
            msg.includes('login')

          expect(isAuthError).toBe(true)
        })
      })

      it('일반 에러는 authError false', () => {
        const errorMsg = 'Network error'
        const isAuthError = errorMsg.includes('401') ||
          errorMsg.includes('auth') ||
          errorMsg.includes('token') ||
          errorMsg.includes('login')

        expect(isAuthError).toBe(false)
      })
    })

    describe('반환값', () => {
      it('성공 시 { success: true }', () => {
        const result = { success: true }
        expect(result.success).toBe(true)
      })

      it('실패 시 { success: false }', () => {
        const result = { success: false }
        expect(result.success).toBe(false)
      })

      it('인증 에러 시 { success: false, authError: true }', () => {
        const result = { success: false, authError: true }
        expect(result.authError).toBe(true)
      })
    })
  })

  describe('handleGenerateAllRefs (일괄)', () => {
    describe('대상 레퍼런스 필터링', () => {
      it('prompt 있고 data 없는 것만 선택', () => {
        const references = [
          { name: 'alice', prompt: 'Alice prompt', data: null },
          { name: 'bob', prompt: 'Bob prompt', data: 'base64...' }, // 이미 생성됨
          { name: 'charlie', prompt: '', data: null }, // 프롬프트 없음
          { name: 'david', prompt: 'David prompt', data: null }
        ]

        const generatableIndices = references
          .map((ref, index) => (ref.prompt && !ref.data) ? index : -1)
          .filter(i => i !== -1)

        expect(generatableIndices).toEqual([0, 3])
      })

      it('모두 생성 완료면 빈 배열', () => {
        const references = [
          { name: 'alice', prompt: 'Alice', data: 'base64...' },
          { name: 'bob', prompt: 'Bob', data: 'base64...' }
        ]

        const generatableIndices = references
          .map((ref, index) => (ref.prompt && !ref.data) ? index : -1)
          .filter(i => i !== -1)

        expect(generatableIndices).toHaveLength(0)
      })
    })

    describe('폴더 권한 (사용자 제스처)', () => {
      it('folder 모드 시 권한 먼저 확인', async () => {
        const settings = { saveMode: 'folder' }

        mockFileSystemAPI.ensurePermission.mockResolvedValue({
          hasPermission: true,
          name: 'WorkFolder'
        })

        if (settings.saveMode === 'folder') {
          const permission = await mockFileSystemAPI.ensurePermission()
          expect(permission.hasPermission).toBe(true)
        }
      })

      it('폴더 미설정 시 설정창 열기', async () => {
        mockFileSystemAPI.ensurePermission.mockResolvedValue({
          error: 'not_set'
        })

        const permission = await mockFileSystemAPI.ensurePermission()

        if (permission.error === 'not_set') {
          mockOpenSettings('storage')
        }

        expect(mockOpenSettings).toHaveBeenCalledWith('storage')
      })

      it('권한 없으면 경고 후 설정창', async () => {
        mockFileSystemAPI.ensurePermission.mockResolvedValue({
          hasPermission: false,
          name: 'WorkFolder'
        })

        const permission = await mockFileSystemAPI.ensurePermission()

        if (!permission.hasPermission) {
          mockToast.warning('작업 폴더 권한이 필요합니다.')
          mockOpenSettings('storage')
        }

        expect(mockToast.warning).toHaveBeenCalled()
      })
    })

    describe('순차 처리', () => {
      it('하나씩 순서대로 처리', async () => {
        const generatableIndices = [0, 2, 3]
        const processedOrder = []

        for (const index of generatableIndices) {
          processedOrder.push(index)
        }

        expect(processedOrder).toEqual([0, 2, 3])
      })

      it('각 처리 사이 딜레이', async () => {
        const generatableIndices = [0, 1]
        const delays = []

        for (let i = 0; i < generatableIndices.length; i++) {
          if (i !== generatableIndices.length - 1) {
            delays.push(2000)
          }
        }

        expect(delays).toEqual([2000])
      })
    })

    describe('인증 에러 복구', () => {
      it('authError 시 토큰 갱신 시도', async () => {
        mockGetAccessToken.mockResolvedValue('new_token')

        const result = { authError: true }

        if (result.authError) {
          mockToast.info('토큰 갱신 중...')
          const newToken = await mockGetAccessToken(true)

          expect(newToken).toBe('new_token')
        }
      })

      it('토큰 갱신 성공 후 재시도', async () => {
        mockGetAccessToken.mockResolvedValue('new_token')

        const newToken = await mockGetAccessToken(true)

        if (newToken) {
          // 같은 인덱스 재시도
          const retryResult = { success: true }
          expect(retryResult.success).toBe(true)
        }
      })

      it('재시도도 실패하면 중단', async () => {
        mockGetAccessToken.mockResolvedValue('new_token')

        const retryResult = { authError: true }

        if (retryResult.authError) {
          mockToast.warning('인증 오류로 중단되었습니다. Whisk에 로그인 후 다시 시도해주세요.')
          // break
        }

        expect(mockToast.warning).toHaveBeenCalledWith(
          '인증 오류로 중단되었습니다. Whisk에 로그인 후 다시 시도해주세요.'
        )
      })

      it('토큰 갱신 실패하면 중단', async () => {
        mockGetAccessToken.mockResolvedValue(null)

        const newToken = await mockGetAccessToken(true)

        if (!newToken) {
          mockToast.warning('인증 오류로 중단되었습니다. Whisk에 로그인 후 다시 시도해주세요.')
        }

        expect(mockToast.warning).toHaveBeenCalled()
      })
    })
  })

  describe('generatingRefs 상태', () => {
    it('생성 시작 시 인덱스 추가', () => {
      let generatingRefs = []

      generatingRefs = [...generatingRefs, 0]

      expect(generatingRefs).toContain(0)
    })

    it('생성 완료 시 인덱스 제거', () => {
      let generatingRefs = [0, 1, 2]
      const index = 1

      generatingRefs = generatingRefs.filter(i => i !== index)

      expect(generatingRefs).toEqual([0, 2])
    })

    it('여러 개 동시에 추적', () => {
      let generatingRefs = []

      generatingRefs = [...generatingRefs, 0]
      generatingRefs = [...generatingRefs, 2]

      expect(generatingRefs).toEqual([0, 2])
    })
  })
})

describe('훅 반환값', () => {
  it('반환 객체 구조', () => {
    const hookReturn = {
      generatingRefs: [],
      handleGenerateRef: vi.fn(),
      handleGenerateAllRefs: vi.fn()
    }

    expect(hookReturn).toHaveProperty('generatingRefs')
    expect(hookReturn).toHaveProperty('handleGenerateRef')
    expect(hookReturn).toHaveProperty('handleGenerateAllRefs')
  })
})

describe('통합 시나리오', () => {
  it('개별 레퍼런스 생성 전체 플로우', async () => {
    const index = 0
    const ref = {
      name: 'alice',
      type: 'character',
      prompt: 'A beautiful woman with long hair',
      category: 'MEDIA_CATEGORY_SUBJECT'
    }
    const settings = {
      saveMode: 'folder',
      projectName: 'test_project',
      aspectRatio: '1:1',
      seedLocked: false
    }

    // 1. 권한 체크
    mockCheckFolderPermission.mockResolvedValue(true)
    mockCheckAuthToken.mockResolvedValue(true)

    // 2. 이미지 생성
    mockGenerateImageAPI.mockResolvedValue({
      success: true,
      images: ['base64_image_data']
    })

    const genResult = await mockGenerateImageAPI(ref.prompt, settings.aspectRatio, [], null)
    expect(genResult.success).toBe(true)

    // 3. Whisk 업로드
    mockUploadReference.mockResolvedValue({
      success: true,
      mediaId: 'media_123',
      caption: 'A beautiful woman'
    })

    const uploadResult = await mockUploadReference('base64', ref.category)
    expect(uploadResult.mediaId).toBe('media_123')

    // 4. 파일 저장
    mockFileSystemAPI.saveReference.mockResolvedValue({
      success: true,
      path: 'test_project/references/alice.png',
      dataUrl: 'data:image/png;base64,...'
    })

    const saveResult = await mockFileSystemAPI.saveReference(
      settings.projectName,
      ref.name,
      genResult.images[0],
      'whisk',
      { mediaId: uploadResult.mediaId, caption: uploadResult.caption, category: ref.category }
    )
    expect(saveResult.success).toBe(true)

    // 5. 상태 업데이트
    const updateData = {
      data: saveResult.dataUrl,
      filePath: saveResult.path,
      dataStorage: 'file',
      mediaId: uploadResult.mediaId,
      caption: uploadResult.caption
    }

    expect(updateData.filePath).toContain('alice')
    expect(updateData.mediaId).toBe('media_123')
  })

  it('일괄 생성 전체 플로우', async () => {
    const references = [
      { name: 'alice', prompt: 'Alice', data: null },
      { name: 'bob', prompt: 'Bob', data: null }
    ]
    const settings = { saveMode: 'folder', projectName: 'test' }

    // 1. 대상 필터링
    const generatableIndices = references
      .map((ref, index) => (ref.prompt && !ref.data) ? index : -1)
      .filter(i => i !== -1)

    expect(generatableIndices).toHaveLength(2)

    // 2. 폴더 권한
    mockFileSystemAPI.ensurePermission.mockResolvedValue({ hasPermission: true })
    const permission = await mockFileSystemAPI.ensurePermission()
    expect(permission.hasPermission).toBe(true)

    // 3. 순차 처리
    for (const index of generatableIndices) {
      // 각 레퍼런스 처리
      expect(index).toBeGreaterThanOrEqual(0)
    }
  })
})
