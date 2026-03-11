/**
 * useAutomation hook tests
 *
 * Tests logic patterns rather than full hook rendering due to complex dependencies.
 * Uses renderHook with fully mocked dependencies.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'

// Mock dependencies BEFORE importing the hook
vi.mock('../../src/hooks/useFileSystem', () => ({
  fileSystemAPI: {
    checkPermission: vi.fn().mockResolvedValue({ success: true }),
    saveImage: vi.fn().mockResolvedValue({ success: true, path: '/test/image.png' }),
  }
}))

vi.mock('../../src/components/Toast', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
  }
}))

vi.mock('../../src/utils/whiskDOMClient', () => ({
  resetDOMSession: vi.fn(),
  requestStopDOM: vi.fn(),
}))

vi.mock('../../src/utils/formatters', () => ({
  getTimestamp: vi.fn(() => '2026-01-01'),
  generateProjectName: vi.fn(() => 'TestProject'),
  getImageSizeFromBase64: vi.fn().mockResolvedValue({ width: 1024, height: 1024 }),
}))

import { useAutomation } from '../../src/hooks/useAutomation'
import { fileSystemAPI } from '../../src/hooks/useFileSystem'
import { toast } from '../../src/components/Toast'
import { resetDOMSession, requestStopDOM } from '../../src/utils/whiskDOMClient'

// Helper: create mock whiskAPI
function createMockWhiskAPI(overrides = {}) {
  return {
    generateImageAPI: vi.fn().mockResolvedValue({
      success: true,
      images: ['base64imagedata']
    }),
    generateImageDOM: vi.fn().mockResolvedValue({
      success: true,
      images: ['base64imagedata']
    }),
    uploadReference: vi.fn().mockResolvedValue({
      success: true,
      mediaId: 'media_123',
      caption: 'test caption'
    }),
    getAccessToken: vi.fn().mockResolvedValue('fake-token'),
    ...overrides,
  }
}

// Helper: create mock scenesHook
function createMockScenesHook(scenes = [], references = []) {
  return {
    scenes,
    references,
    updateScene: vi.fn(),
    getMatchingReferences: vi.fn().mockReturnValue([]),
  }
}

function createDefaultScenes(count = 3) {
  return Array.from({ length: count }, (_, i) => ({
    id: 'scene_' + (i + 1),
    prompt: 'prompt ' + (i + 1),
    status: 'pending',
    image: null,
    imagePath: null,
  }))
}

const tMock = vi.fn((key, params) => key)

describe('useAutomation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    fileSystemAPI.checkPermission.mockResolvedValue({ success: true })
    fileSystemAPI.saveImage.mockResolvedValue({ success: true, path: '/test/img.png' })
  })

  // ============================================================
  // Initial state
  // ============================================================
  describe('initial state', () => {
    it('has correct initial values', () => {
      const whiskAPI = createMockWhiskAPI()
      const scenesHook = createMockScenesHook()

      const { result } = renderHook(() =>
        useAutomation(whiskAPI, scenesHook, vi.fn(), null, null, tMock)
      )

      expect(result.current.isRunning).toBe(false)
      expect(result.current.isPaused).toBe(false)
      expect(result.current.isStopping).toBe(false)
      expect(result.current.progress).toEqual({ current: 0, total: 0, percent: 0 })
      expect(result.current.status).toBe('ready')
    })
  })

  // ============================================================
  // Target scene selection
  // ============================================================
  describe('target scene selection', () => {
    it('only targets scenes without image and imagePath', async () => {
      const scenes = [
        { id: 'scene_1', prompt: 'a', status: 'done', image: 'data:img', imagePath: null },
        { id: 'scene_2', prompt: 'b', status: 'pending', image: null, imagePath: null },
        { id: 'scene_3', prompt: 'c', status: 'error', image: null, imagePath: null },
      ]
      const whiskAPI = createMockWhiskAPI()
      const scenesHook = createMockScenesHook(scenes)

      const { result } = renderHook(() =>
        useAutomation(whiskAPI, scenesHook, vi.fn(), null, null, tMock)
      )

      await act(async () => {
        await result.current.start({ method: 'api', saveMode: 'memory' })
      })

      // scene_1 has image, should be skipped; scene_2 and scene_3 should be processed
      expect(whiskAPI.generateImageAPI).toHaveBeenCalledTimes(2)
    })

    it('shows toast when all scenes already generated', async () => {
      const scenes = [
        { id: 'scene_1', prompt: 'a', status: 'done', image: 'data', imagePath: null },
      ]
      const whiskAPI = createMockWhiskAPI()
      const scenesHook = createMockScenesHook(scenes)

      const { result } = renderHook(() =>
        useAutomation(whiskAPI, scenesHook, vi.fn(), null, null, tMock)
      )

      await act(async () => {
        await result.current.start({ method: 'api', saveMode: 'memory' })
      })

      expect(toast.info).toHaveBeenCalled()
      expect(whiskAPI.generateImageAPI).not.toHaveBeenCalled()
    })

    it('skips scenes that have imagePath even without image data', async () => {
      const scenes = [
        { id: 'scene_1', prompt: 'a', status: 'done', image: null, imagePath: '/path/to/img.png' },
        { id: 'scene_2', prompt: 'b', status: 'pending', image: null, imagePath: null },
      ]
      const whiskAPI = createMockWhiskAPI()
      const scenesHook = createMockScenesHook(scenes)

      const { result } = renderHook(() =>
        useAutomation(whiskAPI, scenesHook, vi.fn(), null, null, tMock)
      )

      await act(async () => {
        await result.current.start({ method: 'api', saveMode: 'memory' })
      })

      expect(whiskAPI.generateImageAPI).toHaveBeenCalledTimes(1)
    })
  })

  // ============================================================
  // Stop mechanism
  // ============================================================
  describe('stop mechanism', () => {
    it('sets isStopping to true on stop()', () => {
      const whiskAPI = createMockWhiskAPI()
      const scenesHook = createMockScenesHook()

      const { result } = renderHook(() =>
        useAutomation(whiskAPI, scenesHook, vi.fn(), null, null, tMock)
      )

      act(() => {
        result.current.stop()
      })

      expect(result.current.isStopping).toBe(true)
      expect(result.current.isPaused).toBe(false)
    })

    it('calls requestStopDOM on stop()', () => {
      const whiskAPI = createMockWhiskAPI()
      const scenesHook = createMockScenesHook()

      const { result } = renderHook(() =>
        useAutomation(whiskAPI, scenesHook, vi.fn(), null, null, tMock)
      )

      act(() => {
        result.current.stop()
      })

      expect(requestStopDOM).toHaveBeenCalled()
    })

    it('sets statusMessage to stopping on stop()', () => {
      const whiskAPI = createMockWhiskAPI()
      const scenesHook = createMockScenesHook()

      const { result } = renderHook(() =>
        useAutomation(whiskAPI, scenesHook, vi.fn(), null, null, tMock)
      )

      act(() => {
        result.current.stop()
      })

      expect(tMock).toHaveBeenCalledWith('status.stopping')
    })
  })

  // ============================================================
  // DOM mode
  // ============================================================
  describe('DOM mode', () => {
    it('calls resetDOMSession on DOM mode start', async () => {
      const scenes = createDefaultScenes(1)
      const whiskAPI = createMockWhiskAPI()
      const scenesHook = createMockScenesHook(scenes)

      const { result } = renderHook(() =>
        useAutomation(whiskAPI, scenesHook, vi.fn(), null, null, tMock)
      )

      await act(async () => {
        await result.current.start({ method: 'dom', saveMode: 'memory' })
      })

      expect(resetDOMSession).toHaveBeenCalled()
    })

    it('does not call resetDOMSession on API mode start', async () => {
      const scenes = createDefaultScenes(1)
      const whiskAPI = createMockWhiskAPI()
      const scenesHook = createMockScenesHook(scenes)

      const { result } = renderHook(() =>
        useAutomation(whiskAPI, scenesHook, vi.fn(), null, null, tMock)
      )

      await act(async () => {
        await result.current.start({ method: 'api', saveMode: 'memory' })
      })

      expect(resetDOMSession).not.toHaveBeenCalled()
    })
  })

  // ============================================================
  // Auth error detection
  // ============================================================
  describe('auth error detection', () => {
    it('calls onAuthError when token is missing', async () => {
      const scenes = createDefaultScenes(1)
      const whiskAPI = createMockWhiskAPI({
        getAccessToken: vi.fn().mockResolvedValue(null),
      })
      const scenesHook = createMockScenesHook(scenes)
      const onAuthError = vi.fn()

      const { result } = renderHook(() =>
        useAutomation(whiskAPI, scenesHook, vi.fn(), null, null, tMock, onAuthError)
      )

      await act(async () => {
        await result.current.start({ method: 'api', saveMode: 'memory' })
      })

      expect(onAuthError).toHaveBeenCalled()
      expect(result.current.status).toBe('error')
      expect(result.current.isRunning).toBe(false)
    })

    it('detects auth keywords in error message and triggers onAuthError', async () => {
      const scenes = createDefaultScenes(1)
      const whiskAPI = createMockWhiskAPI({
        generateImageAPI: vi.fn()
          .mockResolvedValueOnce({ success: false, error: '401 Unauthorized' })
          .mockResolvedValueOnce({ success: false, error: '401 Unauthorized' })
          .mockResolvedValueOnce({ success: false, error: '401 Unauthorized' })
          // token refresh retry also fails
          .mockResolvedValueOnce({ success: false, error: '401 again' }),
        getAccessToken: vi.fn()
          .mockResolvedValueOnce('token')  // initial check
          .mockResolvedValueOnce('new-token'),  // refresh attempt
      })
      const scenesHook = createMockScenesHook(scenes)
      const onAuthError = vi.fn()

      const { result } = renderHook(() =>
        useAutomation(whiskAPI, scenesHook, vi.fn(), null, null, tMock, onAuthError)
      )

      await act(async () => {
        await result.current.start({ method: 'api', saveMode: 'memory' })
      })

      expect(onAuthError).toHaveBeenCalled()
    })
  })

  // ============================================================
  // Progress calculation
  // ============================================================
  describe('progress', () => {
    it('tracks progress through generation', async () => {
      const scenes = createDefaultScenes(2)
      const whiskAPI = createMockWhiskAPI()
      const scenesHook = createMockScenesHook(scenes)

      const { result } = renderHook(() =>
        useAutomation(whiskAPI, scenesHook, vi.fn(), null, null, tMock)
      )

      await act(async () => {
        await result.current.start({ method: 'api', saveMode: 'memory' })
      })

      // After completion, progress should be at 100%
      expect(result.current.progress.current).toBe(2)
      expect(result.current.progress.total).toBe(2)
      expect(result.current.progress.percent).toBe(100)
    })
  })

  // ============================================================
  // Folder permission check
  // ============================================================
  describe('folder save mode', () => {
    it('calls onOpenSettings when folder permission fails', async () => {
      fileSystemAPI.checkPermission.mockResolvedValue({ success: false })

      const scenes = createDefaultScenes(1)
      const whiskAPI = createMockWhiskAPI()
      const scenesHook = createMockScenesHook(scenes)
      const onOpenSettings = vi.fn()

      const { result } = renderHook(() =>
        useAutomation(whiskAPI, scenesHook, vi.fn(), onOpenSettings, null, tMock)
      )

      await act(async () => {
        await result.current.start({ method: 'api', saveMode: 'folder' })
      })

      expect(onOpenSettings).toHaveBeenCalled()
      expect(result.current.status).toBe('error')
      expect(result.current.isRunning).toBe(false)
    })
  })

  // ============================================================
  // Pause/Resume
  // ============================================================
  describe('togglePause', () => {
    it('toggles isPaused state', () => {
      const whiskAPI = createMockWhiskAPI()
      const scenesHook = createMockScenesHook()

      const { result } = renderHook(() =>
        useAutomation(whiskAPI, scenesHook, vi.fn(), null, null, tMock)
      )

      act(() => {
        result.current.togglePause()
      })
      expect(result.current.isPaused).toBe(true)

      act(() => {
        result.current.togglePause()
      })
      expect(result.current.isPaused).toBe(false)
    })
  })

  // ============================================================
  // Completion state
  // ============================================================
  describe('completion', () => {
    it('resets isStopping to false on completion', async () => {
      const scenes = createDefaultScenes(1)
      const whiskAPI = createMockWhiskAPI()
      const scenesHook = createMockScenesHook(scenes)

      const { result } = renderHook(() =>
        useAutomation(whiskAPI, scenesHook, vi.fn(), null, null, tMock)
      )

      await act(async () => {
        await result.current.start({ method: 'api', saveMode: 'memory' })
      })

      expect(result.current.isStopping).toBe(false)
      expect(result.current.isRunning).toBe(false)
      expect(result.current.status).toBe('done')
    })
  })

  // ============================================================
  // Reference upload
  // ============================================================
  describe('reference upload', () => {
    it('uploads references that have data but no mediaId', async () => {
      const scenes = createDefaultScenes(1)
      const refs = [
        { name: 'hero', data: 'data:image/png;base64,abc123', category: 'MEDIA_CATEGORY_SUBJECT', mediaId: null },
        { name: 'bg', data: 'base64data', category: 'MEDIA_CATEGORY_SCENE', mediaId: 'already_uploaded' },
      ]
      const whiskAPI = createMockWhiskAPI()
      const scenesHook = createMockScenesHook(scenes, refs)

      const { result } = renderHook(() =>
        useAutomation(whiskAPI, scenesHook, vi.fn(), null, null, tMock)
      )

      await act(async () => {
        await result.current.start({ method: 'api', saveMode: 'memory' })
      })

      // Only the first ref should be uploaded (no mediaId)
      expect(whiskAPI.uploadReference).toHaveBeenCalledTimes(1)
      // Should strip data: prefix
      expect(whiskAPI.uploadReference).toHaveBeenCalledWith('abc123', 'MEDIA_CATEGORY_SUBJECT')
    })
  })

  // ============================================================
  // sceneIndices (retryScene / retryErrors)
  // ============================================================
  describe('sceneIndices targeting', () => {
    it('processes only specified scene indices', async () => {
      const scenes = [
        { id: 'scene_1', prompt: 'a', status: 'pending', image: null, imagePath: null },
        { id: 'scene_2', prompt: 'b', status: 'pending', image: null, imagePath: null },
        { id: 'scene_3', prompt: 'c', status: 'pending', image: null, imagePath: null },
      ]
      const whiskAPI = createMockWhiskAPI()
      const scenesHook = createMockScenesHook(scenes)

      const { result } = renderHook(() =>
        useAutomation(whiskAPI, scenesHook, vi.fn(), null, null, tMock)
      )

      await act(async () => {
        await result.current.start({ method: 'api', saveMode: 'memory', sceneIndices: [1] })
      })

      // Only 1 scene processed (index 1 = scene_2)
      expect(whiskAPI.generateImageAPI).toHaveBeenCalledTimes(1)
      expect(result.current.progress.total).toBe(1)
    })
  })
})
