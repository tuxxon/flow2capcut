/**
 * guards.js - 생성 전 공통 사전 체크 (폴더 권한 + 토큰)
 */

import { fileSystemAPI } from '../hooks/useFileSystem'
import { toast } from '../components/Toast'

/**
 * 폴더 모드일 때 폴더 설정 확인.
 * 데스크톱에서는 권한이 항상 있으므로 폴더 존재 여부만 확인.
 * @param {object} settings - 설정
 * @param {function} openSettings - 설정창 열기 함수
 * @param {function} t - 다국어 함수
 * @returns {{ ok: boolean }} ok = 통과 여부
 */
export async function checkFolderPermission(settings, openSettings, t) {
  if (settings.saveMode !== 'folder') return { ok: true }

  const result = await fileSystemAPI.ensurePermission()

  // 폴더 삭제됨
  if (result.error === 'folder_deleted') {
    toast.error(t('toast.folderDeleted'))
    openSettings('storage')
    return { ok: false }
  }

  // 폴더 미설정
  if (result.error === 'not_set') {
    toast.warning(t('toast.folderSelectFirst'))
    openSettings('storage')
    return { ok: false }
  }

  return { ok: true }
}

/**
 * Flow 토큰 확인.
 * @param {object} flowAPI - Flow API
 * @param {function} t - 다국어 함수
 * @returns {boolean} true = 통과, false = 차단됨
 */
export async function checkAuthToken(flowAPI, t) {
  const token = await flowAPI.getAccessToken(false, true)
  if (!token) {
    toast.warning(t('toast.flowLoginRequired'))
    return false
  }
  return true
}
