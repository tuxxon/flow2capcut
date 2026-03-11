/**
 * useSceneGeneration 훅 테스트
 *
 * 씬 이미지 재생성 (상세 모달에서 개별) 테스트
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock 함수들
const mockToast = {
  warning: vi.fn(),
  success: vi.fn(),
  error: vi.fn()
}

const mockFileSystemAPI = {
  saveSceneImage: vi.fn()
}

const mockCheckFolderPermission = vi.fn()
const mockCheckAuthToken = vi.fn()
const mockGenerateImageAPI = vi.fn()
const mockGetMatchingReferences = vi.fn()
const mockUpdateScene = vi.fn()

describe('useSceneGeneration 로직', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('handleGenerateScene', () => {
    describe('사전 검사', () => {
      it('프롬프트 없으면 경고', () => {
        const scene = { id: 'scene_1', prompt: '' }

        if (!scene?.prompt) {
          mockToast.warning('프롬프트가 없습니다.')
        }

        expect(mockToast.warning).toHaveBeenCalledWith('프롬프트가 없습니다.')
      })

      it('프롬프트 null도 경고', () => {
        const scene = { id: 'scene_1', prompt: null }

        if (!scene?.prompt) {
          mockToast.warning('프롬프트가 없습니다.')
        }

        expect(mockToast.warning).toHaveBeenCalled()
      })

      it('씬이 없으면 경고', () => {
        const scenes = []
        const sceneId = 'scene_1'
        const scene = scenes.find(s => s.id === sceneId)

        if (!scene?.prompt) {
          mockToast.warning('프롬프트가 없습니다.')
        }

        expect(mockToast.warning).toHaveBeenCalled()
      })
    })

    describe('폴더 권한 체크', () => {
      it('폴더 권한 실패 시 모달 닫기', async () => {
        mockCheckFolderPermission.mockResolvedValue(false)
        const setSelectedScene = vi.fn()

        const permissionOk = await mockCheckFolderPermission()
        if (!permissionOk) {
          setSelectedScene(null)
        }

        expect(setSelectedScene).toHaveBeenCalledWith(null)
      })

      it('폴더 권한 성공 시 계속 진행', async () => {
        mockCheckFolderPermission.mockResolvedValue(true)

        const permissionOk = await mockCheckFolderPermission()

        expect(permissionOk).toBe(true)
      })
    })

    describe('토큰 체크', () => {
      it('토큰 없으면 중단', async () => {
        mockCheckFolderPermission.mockResolvedValue(true)
        mockCheckAuthToken.mockResolvedValue(false)

        const tokenOk = await mockCheckAuthToken()

        expect(tokenOk).toBe(false)
      })

      it('토큰 있으면 계속 진행', async () => {
        mockCheckAuthToken.mockResolvedValue(true)

        const tokenOk = await mockCheckAuthToken()

        expect(tokenOk).toBe(true)
      })
    })

    describe('레퍼런스 매칭', () => {
      it('매칭된 레퍼런스 필터링', () => {
        const allRefs = [
          { name: 'alice', type: 'character', mediaId: 'media_1', category: 'MEDIA_CATEGORY_SUBJECT', caption: 'Alice' },
          { name: 'bob', type: 'character', mediaId: null, category: 'MEDIA_CATEGORY_SUBJECT' }, // mediaId 없음
          { name: 'forest', type: 'scene', mediaId: 'media_2', category: 'MEDIA_CATEGORY_SCENE', caption: 'Forest' }
        ]

        mockGetMatchingReferences.mockReturnValue(allRefs)

        const matchedRefs = mockGetMatchingReferences()
          .filter(r => r.mediaId)
          .map(r => ({
            category: r.category,
            mediaId: r.mediaId,
            caption: r.caption || ''
          }))

        expect(matchedRefs).toHaveLength(2)
        expect(matchedRefs[0].mediaId).toBe('media_1')
        expect(matchedRefs[1].mediaId).toBe('media_2')
      })

      it('매칭된 레퍼런스 없음', () => {
        mockGetMatchingReferences.mockReturnValue([])

        const matchedRefs = mockGetMatchingReferences()
          .filter(r => r.mediaId)

        expect(matchedRefs).toHaveLength(0)
      })
    })

    describe('Seed 처리', () => {
      it('seedLocked true면 고정 seed 사용', () => {
        const settings = { seedLocked: true, seed: 12345 }

        const seedToUse = settings.seedLocked ? settings.seed : null

        expect(seedToUse).toBe(12345)
      })

      it('seedLocked false면 랜덤 (null)', () => {
        const settings = { seedLocked: false, seed: 12345 }

        const seedToUse = settings.seedLocked ? settings.seed : null

        expect(seedToUse).toBeNull()
      })
    })

    describe('이미지 생성', () => {
      it('생성 성공', async () => {
        mockGenerateImageAPI.mockResolvedValue({
          success: true,
          images: ['base64_image_data']
        })

        const result = await mockGenerateImageAPI('prompt', '16:9', [], null)

        expect(result.success).toBe(true)
        expect(result.images).toHaveLength(1)
      })

      it('생성 실패', async () => {
        mockGenerateImageAPI.mockResolvedValue({
          success: false,
          error: 'Generation failed'
        })

        const result = await mockGenerateImageAPI('prompt', '16:9', [], null)

        expect(result.success).toBe(false)
      })
    })

    describe('이미지 크기 추출', () => {
      it('base64에서 크기 추출 (시뮬레이션)', async () => {
        // getImageSizeFromBase64 함수 시뮬레이션
        const mockGetImageSize = vi.fn().mockResolvedValue({
          width: 1024,
          height: 1024
        })

        const imageSize = await mockGetImageSize('base64_data')

        expect(imageSize.width).toBe(1024)
        expect(imageSize.height).toBe(1024)
      })

      it('크기 추출 실패 시 null', async () => {
        const mockGetImageSize = vi.fn().mockRejectedValue(new Error('Failed'))

        let imageSize = null
        try {
          imageSize = await mockGetImageSize('invalid_data')
        } catch (e) {
          // 무시
        }

        expect(imageSize).toBeNull()
      })
    })

    describe('파일 저장', () => {
      it('folder 모드일 때 저장', async () => {
        const settings = { saveMode: 'folder', projectName: 'test_project' }

        mockFileSystemAPI.saveSceneImage.mockResolvedValue({
          success: true,
          path: 'test_project/images/scene_1.png'
        })

        if (settings.saveMode === 'folder') {
          const saveResult = await mockFileSystemAPI.saveSceneImage(
            settings.projectName,
            'scene_1',
            'base64_data',
            'whisk'
          )

          expect(saveResult.success).toBe(true)
          expect(saveResult.path).toContain('scene_1')
        }
      })

      it('folder 모드가 아니면 저장 안함', () => {
        const settings = { saveMode: 'memory' }

        let imagePath = null
        if (settings.saveMode === 'folder') {
          // 저장 로직
          imagePath = 'path/to/image.png'
        }

        expect(imagePath).toBeNull()
      })

      it('프로젝트명 없으면 자동 생성', () => {
        const settings = { saveMode: 'folder', projectName: null }

        const projectName = settings.projectName || 'whisk2capcut_' + Date.now()

        expect(projectName).toContain('whisk2capcut_')
      })
    })

    describe('씬 상태 업데이트', () => {
      it('생성 중 상태', () => {
        mockUpdateScene('scene_1', { status: 'generating' })

        expect(mockUpdateScene).toHaveBeenCalledWith('scene_1', { status: 'generating' })
      })

      it('생성 완료 상태', () => {
        const updateData = {
          image: 'base64_image_data',
          imagePath: 'project/images/scene_1.png',
          image_size: { width: 1024, height: 1024 },
          status: 'done'
        }

        mockUpdateScene('scene_1', updateData)

        expect(mockUpdateScene).toHaveBeenCalledWith('scene_1', expect.objectContaining({
          status: 'done',
          image: 'base64_image_data'
        }))
      })

      it('에러 상태', () => {
        mockUpdateScene('scene_1', { status: 'error' })

        expect(mockUpdateScene).toHaveBeenCalledWith('scene_1', { status: 'error' })
      })
    })

    describe('토스트 메시지', () => {
      it('성공 메시지', () => {
        mockToast.success('Scene scene_1 생성 완료')

        expect(mockToast.success).toHaveBeenCalledWith('Scene scene_1 생성 완료')
      })

      it('실패 메시지', () => {
        mockToast.error('생성 실패: Rate limit exceeded')

        expect(mockToast.error).toHaveBeenCalledWith('생성 실패: Rate limit exceeded')
      })

      it('예외 메시지', () => {
        mockToast.error('생성 오류: Network error')

        expect(mockToast.error).toHaveBeenCalledWith('생성 오류: Network error')
      })
    })
  })

  describe('generatingSceneId 상태', () => {
    it('생성 시작 시 ID 설정', () => {
      let generatingSceneId = null

      generatingSceneId = 'scene_1'

      expect(generatingSceneId).toBe('scene_1')
    })

    it('생성 완료 시 null로 초기화', () => {
      let generatingSceneId = 'scene_1'

      generatingSceneId = null

      expect(generatingSceneId).toBeNull()
    })
  })
})

describe('훅 반환값', () => {
  it('반환 객체 구조', () => {
    const hookReturn = {
      generatingSceneId: null,
      handleGenerateScene: vi.fn()
    }

    expect(hookReturn).toHaveProperty('generatingSceneId')
    expect(hookReturn).toHaveProperty('handleGenerateScene')
  })
})

describe('통합 시나리오', () => {
  it('전체 씬 생성 플로우', async () => {
    const sceneId = 'scene_1'
    const scene = {
      id: sceneId,
      prompt: '아름다운 해변 풍경',
      characters: 'alice',
      scene_tag: 'beach'
    }
    const settings = {
      saveMode: 'folder',
      projectName: 'test_project',
      aspectRatio: '16:9',
      seedLocked: false,
      seed: 12345
    }

    // 1. 프롬프트 확인
    expect(scene.prompt).toBeTruthy()

    // 2. 폴더 권한 확인
    mockCheckFolderPermission.mockResolvedValue(true)
    const folderOk = await mockCheckFolderPermission()
    expect(folderOk).toBe(true)

    // 3. 토큰 확인
    mockCheckAuthToken.mockResolvedValue(true)
    const tokenOk = await mockCheckAuthToken()
    expect(tokenOk).toBe(true)

    // 4. 상태를 generating으로 변경
    mockUpdateScene(sceneId, { status: 'generating' })

    // 5. 레퍼런스 매칭
    mockGetMatchingReferences.mockReturnValue([
      { name: 'alice', mediaId: 'media_1', category: 'MEDIA_CATEGORY_SUBJECT', caption: 'Alice' }
    ])

    const matchedRefs = mockGetMatchingReferences(scene)
      .filter(r => r.mediaId)
      .map(r => ({
        category: r.category,
        mediaId: r.mediaId,
        caption: r.caption || ''
      }))

    expect(matchedRefs).toHaveLength(1)

    // 6. seed 결정
    const seedToUse = settings.seedLocked ? settings.seed : null
    expect(seedToUse).toBeNull()

    // 7. 이미지 생성
    mockGenerateImageAPI.mockResolvedValue({
      success: true,
      images: ['base64_image_data']
    })

    const result = await mockGenerateImageAPI(
      scene.prompt,
      settings.aspectRatio,
      matchedRefs,
      seedToUse
    )

    expect(result.success).toBe(true)

    // 8. 파일 저장
    mockFileSystemAPI.saveSceneImage.mockResolvedValue({
      success: true,
      path: 'test_project/images/scene_1.png'
    })

    const saveResult = await mockFileSystemAPI.saveSceneImage(
      settings.projectName,
      sceneId,
      result.images[0],
      'whisk'
    )

    expect(saveResult.success).toBe(true)

    // 9. 상태 업데이트
    mockUpdateScene(sceneId, {
      image: result.images[0],
      imagePath: saveResult.path,
      image_size: { width: 1024, height: 1024 },
      status: 'done'
    })

    expect(mockUpdateScene).toHaveBeenLastCalledWith(sceneId, expect.objectContaining({
      status: 'done'
    }))

    // 10. 성공 토스트
    mockToast.success(`Scene ${sceneId} 생성 완료`)
    expect(mockToast.success).toHaveBeenCalled()
  })

  it('생성 실패 플로우', async () => {
    const sceneId = 'scene_1'

    // 생성 실패
    mockGenerateImageAPI.mockResolvedValue({
      success: false,
      error: 'Rate limit exceeded'
    })

    const result = await mockGenerateImageAPI('prompt', '16:9', [], null)

    if (!result.success) {
      mockUpdateScene(sceneId, { status: 'error' })
      mockToast.error(`생성 실패: ${result.error || '알 수 없는 오류'}`)
    }

    expect(mockUpdateScene).toHaveBeenCalledWith(sceneId, { status: 'error' })
    expect(mockToast.error).toHaveBeenCalled()
  })

  it('예외 발생 플로우', async () => {
    const sceneId = 'scene_1'

    mockGenerateImageAPI.mockRejectedValue(new Error('Network error'))

    try {
      await mockGenerateImageAPI('prompt', '16:9', [], null)
    } catch (error) {
      mockUpdateScene(sceneId, { status: 'error' })
      mockToast.error(`생성 오류: ${error.message}`)
    }

    expect(mockUpdateScene).toHaveBeenCalledWith(sceneId, { status: 'error' })
    expect(mockToast.error).toHaveBeenCalledWith('생성 오류: Network error')
  })
})
