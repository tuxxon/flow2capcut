/**
 * Firebase Authentication for Electron Desktop
 *
 * Production(file://)에서는 signInWithPopup이 동작하지 않으므로
 * main process에서 BrowserWindow로 Google OAuth를 수행한 후
 * id_token을 받아 signInWithCredential로 Firebase 인증합니다.
 *
 * Dev(localhost)에서도 동일한 방식으로 동작합니다.
 */

import {
  signInWithCredential,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  onAuthStateChanged
} from 'firebase/auth'
import { auth } from './config'

/**
 * Google 로그인 (Main process OAuth → signInWithCredential)
 * 1. electronAPI.googleSignIn() → main process에서 BrowserWindow OAuth
 * 2. id_token 반환
 * 3. signInWithCredential로 Firebase 인증
 */
export async function signInWithGoogle() {
  try {
    const result = await window.electronAPI.googleSignIn()

    if (!result.success || !result.idToken) {
      throw new Error(result.error || 'Google sign-in was cancelled')
    }

    // id_token으로 Firebase credential 생성 → 로그인
    const credential = GoogleAuthProvider.credential(result.idToken)
    const userCredential = await signInWithCredential(auth, credential)

    console.log('[Auth] Google sign-in successful:', userCredential.user.email)
    return userCredential
  } catch (error) {
    console.error('[Auth] Google sign-in failed:', error)
    throw error
  }
}

/**
 * 로그아웃
 */
export async function signOut() {
  try {
    await firebaseSignOut(auth)
    if (window.electronAPI?.googleSignOut) {
      await window.electronAPI.googleSignOut()
    }
    console.log('[Auth] Sign out successful')
  } catch (error) {
    console.error('[Auth] Sign out failed:', error)
    throw error
  }
}

/**
 * 현재 로그인된 사용자
 */
export function getCurrentUser() {
  return auth.currentUser
}

/**
 * 인증 상태 변화 리스너
 */
export function onAuthChange(callback) {
  return onAuthStateChanged(auth, callback)
}

/**
 * ID 토큰 가져오기
 */
export async function getIdToken() {
  const user = auth.currentUser
  if (!user) return null

  try {
    return await user.getIdToken()
  } catch (error) {
    console.error('[Auth] Failed to get ID token:', error)
    return null
  }
}
