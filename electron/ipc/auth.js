/**
 * Electron IPC Handler - Google OAuth Authentication
 *
 * Desktop app용 Google OAuth 인증:
 * 1. BrowserWindow에서 Google OAuth 동의 화면 표시
 * 2. Authorization code 캡처
 * 3. code → id_token 교환
 * 4. id_token을 renderer로 반환 → signInWithCredential로 Firebase 인증
 *
 * Production에서 file:// 프로토콜로 인해 signInWithPopup이 동작하지 않으므로
 * 이 방식을 사용합니다.
 */

import { BrowserWindow } from 'electron'

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'

// Desktop app OAuth client (Google Cloud Console에서 생성)
const OAUTH_CLIENT_ID = process.env.GOOGLE_OAUTH_CLIENT_ID || ''
const OAUTH_CLIENT_SECRET = process.env.GOOGLE_OAUTH_CLIENT_SECRET || ''
const OAUTH_REDIRECT_URI = 'http://localhost'

/**
 * Register auth-related IPC handlers.
 *
 * @param {Electron.IpcMain} ipcMain
 * @param {Function} getFlowView - Returns the Flow WebContentsView instance
 */
export function registerAuthIPC(ipcMain, getFlowView) {

  // ----------------------------------------------------------
  // auth:google-sign-in
  //
  // BrowserWindow로 Google OAuth → authorization code → id_token 반환
  // ----------------------------------------------------------
  ipcMain.handle('auth:google-sign-in', async () => {
    try {
      const idToken = await openOAuthPopup()
      if (idToken) {
        return { success: true, idToken }
      }
      return { success: false, error: 'OAuth cancelled or failed' }
    } catch (e) {
      return { success: false, error: e.message }
    }
  })

  // ----------------------------------------------------------
  // auth:google-sign-out
  // ----------------------------------------------------------
  ipcMain.handle('auth:google-sign-out', async () => {
    return { success: true }
  })
}

/**
 * Open an OAuth popup window for Google sign-in.
 * Uses authorization code flow → exchanges code for id_token.
 * Returns the id_token on success, null on cancel.
 */
function openOAuthPopup() {
  return new Promise((resolve, reject) => {
    const authUrl = new URL(GOOGLE_AUTH_URL)
    authUrl.searchParams.set('client_id', OAUTH_CLIENT_ID)
    authUrl.searchParams.set('redirect_uri', OAUTH_REDIRECT_URI)
    authUrl.searchParams.set('response_type', 'code')
    authUrl.searchParams.set('scope', 'openid email profile')
    authUrl.searchParams.set('prompt', 'select_account')
    authUrl.searchParams.set('access_type', 'offline')

    const popup = new BrowserWindow({
      width: 500,
      height: 700,
      title: 'Sign in with Google',
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true
      }
    })

    let resolved = false

    const tryCapture = (url) => {
      if (resolved) return
      if (!url.startsWith(OAUTH_REDIRECT_URI)) return
      resolved = true
      handleRedirect(url, popup, resolve)
    }

    // 여러 이벤트에서 캡처 시도 (브라우저/OS에 따라 발생 이벤트가 다름)
    popup.webContents.on('will-redirect', (_event, url) => tryCapture(url))
    popup.webContents.on('will-navigate', (_event, url) => tryCapture(url))
    popup.webContents.on('did-navigate', (_event, url) => tryCapture(url))

    popup.on('closed', () => {
      if (!resolved) {
        resolved = true
        resolve(null)
      }
    })

    popup.loadURL(authUrl.toString())
  })
}

/**
 * Handle OAuth redirect URL:
 * 1. Extract authorization code from URL
 * 2. Exchange code for id_token via Google Token endpoint
 */
async function handleRedirect(url, popup, resolve) {
  if (!url.startsWith(OAUTH_REDIRECT_URI)) return

  try {
    const urlObj = new URL(url)
    const code = urlObj.searchParams.get('code')
    const error = urlObj.searchParams.get('error')

    if (error) {
      console.error('[Auth] OAuth error:', error)
      popup.removeAllListeners('closed')
      popup.close()
      resolve(null)
      return
    }

    if (!code) return

    // Exchange authorization code for tokens
    console.log('[Auth] Exchanging authorization code for tokens...')

    const tokenResponse = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: OAUTH_CLIENT_ID,
        client_secret: OAUTH_CLIENT_SECRET,
        redirect_uri: OAUTH_REDIRECT_URI,
        grant_type: 'authorization_code'
      })
    })

    if (!tokenResponse.ok) {
      const text = await tokenResponse.text()
      console.error('[Auth] Token exchange failed:', text)
      popup.removeAllListeners('closed')
      popup.close()
      resolve(null)
      return
    }

    const tokenData = await tokenResponse.json()
    const idToken = tokenData.id_token

    if (idToken) {
      console.log('[Auth] Successfully obtained id_token')
      popup.removeAllListeners('closed')
      popup.close()
      resolve(idToken)
    } else {
      console.error('[Auth] No id_token in response')
      popup.removeAllListeners('closed')
      popup.close()
      resolve(null)
    }
  } catch (e) {
    console.error('[Auth] Failed to handle redirect:', e)
    popup.removeAllListeners('closed')
    popup.close()
    resolve(null)
  }
}
