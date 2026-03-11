/**
 * guards.js 테스트
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock dependencies before importing guards
vi.mock('../../src/hooks/useFileSystem', () => ({
  fileSystemAPI: {
    checkPermission: vi.fn(),
  }
}))

vi.mock('../../src/components/Toast', () => ({
  toast: {
    error: vi.fn(),
    warning: vi.fn(),
  }
}))

import { checkFolderPermission, checkAuthToken } from '../../src/utils/guards'
import { fileSystemAPI } from '../../src/hooks/useFileSystem'
import { toast } from '../../src/components/Toast'

const t = vi.fn((key) => key) // translation mock that returns key
const openSettings = vi.fn()

beforeEach(() => {
  vi.clearAllMocks()
})

// ============================================================
// checkFolderPermission
// ============================================================
describe('checkFolderPermission', () => {
  it('returns ok:true if saveMode is not folder', async () => {
    const settings = { saveMode: 'none' }
    const result = await checkFolderPermission(settings, openSettings, t)
    expect(result).toEqual({ ok: true })
    expect(fileSystemAPI.checkPermission).not.toHaveBeenCalled()
  })

  it('returns ok:true when folder permission is valid', async () => {
    const settings = { saveMode: 'folder' }
    fileSystemAPI.checkPermission.mockResolvedValue({})
    const result = await checkFolderPermission(settings, openSettings, t)
    expect(result).toEqual({ ok: true })
  })

  it('returns ok:false and opens settings when folder_deleted', async () => {
    const settings = { saveMode: 'folder' }
    fileSystemAPI.checkPermission.mockResolvedValue({ error: 'folder_deleted' })
    const result = await checkFolderPermission(settings, openSettings, t)
    expect(result).toEqual({ ok: false })
    expect(toast.error).toHaveBeenCalledWith('toast.folderDeleted')
    expect(openSettings).toHaveBeenCalledWith('storage')
  })

  it('returns ok:false and opens settings when not_set', async () => {
    const settings = { saveMode: 'folder' }
    fileSystemAPI.checkPermission.mockResolvedValue({ error: 'not_set' })
    const result = await checkFolderPermission(settings, openSettings, t)
    expect(result).toEqual({ ok: false })
    expect(toast.warning).toHaveBeenCalledWith('toast.folderSelectFirst')
    expect(openSettings).toHaveBeenCalledWith('storage')
  })
})

// ============================================================
// checkAuthToken
// ============================================================
describe('checkAuthToken', () => {
  it('returns true when token is available', async () => {
    const whiskAPI = { getAccessToken: vi.fn().mockResolvedValue('some-token') }
    const result = await checkAuthToken(whiskAPI, t)
    expect(result).toBe(true)
    expect(whiskAPI.getAccessToken).toHaveBeenCalledWith(false, true)
  })

  it('returns false and shows warning when no token', async () => {
    const whiskAPI = { getAccessToken: vi.fn().mockResolvedValue(null) }
    const result = await checkAuthToken(whiskAPI, t)
    expect(result).toBe(false)
    expect(toast.warning).toHaveBeenCalledWith('toast.whiskLoginRequired')
  })
})
