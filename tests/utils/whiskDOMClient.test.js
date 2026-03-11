/**
 * whiskDOMClient.js 테스트
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mockElectronAPI, resetElectronAPI } from '../mocks/electronAPI'

// Suppress console output during tests
vi.spyOn(console, 'log').mockImplementation(() => {})
vi.spyOn(console, 'warn').mockImplementation(() => {})

// We need fake timers to handle the many setTimeout calls in the source
beforeEach(() => {
  vi.useFakeTimers()
  resetElectronAPI()
})

afterEach(() => {
  vi.useRealTimers()
})

// Helper: import fresh module to reset module-level state
async function loadModule() {
  vi.resetModules()
  Object.defineProperty(window, 'electronAPI', {
    value: mockElectronAPI,
    writable: true,
    configurable: true,
  })
  const mod = await import('../../src/utils/whiskDOMClient')
  return mod
}

// Helper: advance timers and flush all pending promises
async function flushAll(ms = 1000) {
  await vi.advanceTimersByTimeAsync(ms)
}

/**
 * Set up default mocks that allow a successful end-to-end flow.
 * Tests can override individual mocks after calling this.
 */
function setupDefaultMocks() {
  mockElectronAPI.domGetUrl.mockResolvedValue({
    success: true,
    url: 'https://labs.google/fx/tools/whisk/project123'
  })
  mockElectronAPI.domNavigate.mockResolvedValue({ success: true })
  mockElectronAPI.domClickEnterTool.mockResolvedValue({ success: true })
  mockElectronAPI.domShowWhisk.mockResolvedValue({ success: true })
  mockElectronAPI.domSetAspectRatio.mockResolvedValue({ success: true })
  mockElectronAPI.domSnapshotBlobs.mockResolvedValue({ urls: [] })
  mockElectronAPI.domSendPrompt.mockResolvedValue({ success: true })
  mockElectronAPI.domScanImages.mockResolvedValue({
    urls: ['blob:https://labs.google/generated-image']
  })
  mockElectronAPI.domBlobToBase64.mockResolvedValue({
    success: true,
    base64: 'data:image/png;base64,DEFAULT'
  })
}

// ============================================================
// resetDOMSession
// ============================================================
describe('resetDOMSession', () => {
  it('resets internal state without throwing', async () => {
    const { resetDOMSession } = await loadModule()
    expect(() => resetDOMSession()).not.toThrow()
  })
})

// ============================================================
// requestStopDOM
// ============================================================
describe('requestStopDOM', () => {
  it('causes generateImageDOM to stop early', async () => {
    const { generateImageDOM, resetDOMSession, requestStopDOM } = await loadModule()
    resetDOMSession()
    setupDefaultMocks()

    // No images found during normal scan
    mockElectronAPI.domScanImages.mockResolvedValue({ urls: [] })

    const promise = generateImageDOM('test prompt', '16:9')

    // Advance past ensureWhiskProject + setAspectRatio + sendPrompt into waitForImage
    await flushAll(5000)
    requestStopDOM()
    // Advance so the stop flag is detected and final scan runs
    await flushAll(5000)

    const result = await promise
    expect(result.success).toBe(false)
    expect(result.error).toBe('Stopped by user')
  })
})

// ============================================================
// generateImageDOM
// ============================================================
describe('generateImageDOM', () => {
  it('generates image successfully when already on project URL', async () => {
    const { generateImageDOM, resetDOMSession } = await loadModule()
    resetDOMSession()
    setupDefaultMocks()

    const promise = generateImageDOM('A cat in space', '16:9')
    await flushAll(60000)

    const result = await promise

    expect(result.success).toBe(true)
    expect(result.images).toEqual(['data:image/png;base64,DEFAULT'])
    expect(mockElectronAPI.domSetAspectRatio).toHaveBeenCalledWith({ aspectRatio: '16:9' })
    expect(mockElectronAPI.domSendPrompt).toHaveBeenCalled()
  })

  it('sets aspect ratio only once per batch', async () => {
    const { generateImageDOM, resetDOMSession } = await loadModule()
    resetDOMSession()
    setupDefaultMocks()

    // First call
    const p1 = generateImageDOM('prompt 1', '9:16')
    await flushAll(60000)
    await p1

    expect(mockElectronAPI.domSetAspectRatio).toHaveBeenCalledTimes(1)

    // Second call should NOT set aspect ratio again
    mockElectronAPI.domSetAspectRatio.mockClear()
    const p2 = generateImageDOM('prompt 2', '9:16')
    await flushAll(60000)
    await p2

    expect(mockElectronAPI.domSetAspectRatio).not.toHaveBeenCalled()
  })

  it('navigates to Whisk base and clicks Enter tool when not on project URL', async () => {
    const { generateImageDOM, resetDOMSession } = await loadModule()
    resetDOMSession()
    setupDefaultMocks()

    // Not on a project URL initially, then after enter tool click, project URL appears
    let urlCallCount = 0
    mockElectronAPI.domGetUrl.mockImplementation(() => {
      urlCallCount++
      if (urlCallCount <= 2) {
        return Promise.resolve({
          success: true,
          url: 'https://labs.google/fx/tools/whisk/'
        })
      }
      return Promise.resolve({
        success: true,
        url: 'https://labs.google/fx/tools/whisk/newproj'
      })
    })

    const promise = generateImageDOM('new prompt', '1:1')
    await flushAll(60000)

    const result = await promise

    expect(result.success).toBe(true)
    expect(mockElectronAPI.domNavigate).toHaveBeenCalledWith({
      url: 'https://labs.google/fx/tools/whisk'
    })
    expect(mockElectronAPI.domClickEnterTool).toHaveBeenCalled()
  })

  it('returns error when sendPrompt fails (no retry)', async () => {
    const { generateImageDOM, resetDOMSession } = await loadModule()
    resetDOMSession()
    setupDefaultMocks()

    mockElectronAPI.domSendPrompt.mockResolvedValue({
      success: false,
      error: 'Injection failed',
      retry: false
    })

    const promise = generateImageDOM('fail prompt', '16:9')
    await flushAll(60000)

    const result = await promise

    expect(result.success).toBe(false)
    expect(result.error).toBe('Injection failed')
  })

  it('returns error when blob to base64 conversion keeps failing (stop to exit)', async () => {
    const { generateImageDOM, resetDOMSession, requestStopDOM } = await loadModule()
    resetDOMSession()
    setupDefaultMocks()

    mockElectronAPI.domBlobToBase64.mockResolvedValue({
      success: false,
      base64: null
    })

    const promise = generateImageDOM('test', '16:9')

    // Advance timers, then stop to break out of the infinite retry loop
    await flushAll(10000)
    requestStopDOM()
    await flushAll(10000)

    const result = await promise
    expect(result.success).toBe(false)
  })

  it('returns error when an error popup is detected', async () => {
    const { generateImageDOM, resetDOMSession } = await loadModule()
    resetDOMSession()
    setupDefaultMocks()

    mockElectronAPI.domScanImages.mockResolvedValue({
      error: 'Something went wrong',
      urls: []
    })

    const promise = generateImageDOM('test', '16:9')
    await flushAll(60000)

    const result = await promise

    expect(result.success).toBe(false)
    expect(result.error).toBe('Error popup detected on Whisk page')
  })

  it('handles exception thrown during execution', async () => {
    const { generateImageDOM, resetDOMSession } = await loadModule()
    resetDOMSession()

    mockElectronAPI.domGetUrl.mockRejectedValue(new Error('IPC channel closed'))

    const promise = generateImageDOM('test', '16:9')
    await flushAll(5000)

    const result = await promise

    expect(result.success).toBe(false)
    expect(result.error).toBe('IPC channel closed')
  })

  it('skips aspect ratio setting when aspectRatio is null', async () => {
    const { generateImageDOM, resetDOMSession } = await loadModule()
    resetDOMSession()
    setupDefaultMocks()

    const promise = generateImageDOM('test', null)
    await flushAll(60000)

    const result = await promise

    expect(result.success).toBe(true)
    expect(mockElectronAPI.domSetAspectRatio).not.toHaveBeenCalled()
  })

  it('recovers in-progress image on stop via final scan', async () => {
    const { generateImageDOM, resetDOMSession, requestStopDOM } = await loadModule()
    resetDOMSession()
    setupDefaultMocks()

    // Normal scans return nothing; final scan (after stop) finds an image
    let stopWasRequested = false
    mockElectronAPI.domScanImages.mockImplementation(() => {
      if (stopWasRequested) {
        return Promise.resolve({
          urls: ['blob:https://labs.google/recovered-img']
        })
      }
      return Promise.resolve({ urls: [] })
    })
    mockElectronAPI.domBlobToBase64.mockResolvedValue({
      success: true,
      base64: 'data:image/png;base64,RECOVERED'
    })

    const promise = generateImageDOM('test', '16:9')

    // Advance past ensureWhiskProject + setAspectRatio + sendPrompt + into waitForImage
    await flushAll(8000)

    // Now request stop — set our flag first so the next domScanImages call returns an image
    stopWasRequested = true
    requestStopDOM()

    // Advance timers so the stop is detected and final scan runs
    await flushAll(10000)

    const result = await promise

    expect(result.success).toBe(true)
    expect(result.images).toEqual(['data:image/png;base64,RECOVERED'])
  })

  it('reuses existing project on second call without navigating', async () => {
    const { generateImageDOM, resetDOMSession } = await loadModule()
    resetDOMSession()
    setupDefaultMocks()

    // First call — forceNew=true because currentProjectUrl is null
    const p1 = generateImageDOM('prompt 1', '16:9')
    await flushAll(60000)
    const r1 = await p1
    expect(r1.success).toBe(true)

    // Clear navigation mocks to track second call
    mockElectronAPI.domNavigate.mockClear()
    mockElectronAPI.domClickEnterTool.mockClear()

    // Second call — should reuse project (forceNew=false, currentProjectUrl set)
    const p2 = generateImageDOM('prompt 2', '16:9')
    await flushAll(60000)
    const r2 = await p2

    expect(r2.success).toBe(true)
    expect(mockElectronAPI.domNavigate).not.toHaveBeenCalled()
    expect(mockElectronAPI.domClickEnterTool).not.toHaveBeenCalled()
  })

  it('handles Enter tool click failure', async () => {
    const { generateImageDOM, resetDOMSession } = await loadModule()
    resetDOMSession()
    setupDefaultMocks()

    // Not on project URL
    mockElectronAPI.domGetUrl.mockResolvedValue({
      success: true,
      url: 'https://labs.google/fx/tools/whisk/'
    })
    // Enter tool click fails
    mockElectronAPI.domClickEnterTool.mockResolvedValue({
      success: false,
      error: 'Button not found'
    })

    const promise = generateImageDOM('test', '16:9')
    await flushAll(60000)

    const result = await promise
    // Even though enter tool fails, the function continues and tries sendPrompt
    // The overall result depends on subsequent steps
    // sendPrompt succeeds because we set it up in setupDefaultMocks
    expect(mockElectronAPI.domClickEnterTool).toHaveBeenCalled()
  })

  it('handles aspect ratio setting failure gracefully', async () => {
    const { generateImageDOM, resetDOMSession } = await loadModule()
    resetDOMSession()
    setupDefaultMocks()

    mockElectronAPI.domSetAspectRatio.mockResolvedValue({
      success: false,
      error: 'Aspect ratio button not found'
    })

    const promise = generateImageDOM('test', '16:9')
    await flushAll(60000)

    const result = await promise

    // Aspect ratio failure is non-fatal; generation continues
    expect(result.success).toBe(true)
    expect(mockElectronAPI.domSetAspectRatio).toHaveBeenCalled()
  })
})
