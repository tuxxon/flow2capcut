# Split View + WebContentsView Migration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** BrowserView를 WebContentsView로 마이그레이션하고, 탭/좌우분할/상하분할 레이아웃 모드를 지원

**Architecture:** BrowserWindow(React App) + WebContentsView(Whisk)를 contentView.addChildView()로 관리. 레이아웃 모드(tab/split-h/split-v)에 따라 bounds를 동적 계산. 드래그 리사이저로 분할 비율 조절.

**Tech Stack:** Electron 34 (WebContentsView), React 18, IPC

---

### Task 1: BrowserView → WebContentsView 마이그레이션 (electron/main.js)

**Files:**
- Modify: `electron/main.js`

**Step 1: import 변경**

변경 전:
```javascript
import { app, BrowserWindow, BrowserView, ipcMain, shell } from 'electron'
```

변경 후:
```javascript
import { app, BrowserWindow, WebContentsView, ipcMain, shell } from 'electron'
```

**Step 2: 상태 변수 추가**

`let currentTab = 'app'` 아래에 레이아웃 상태 추가:

```javascript
let currentTab = 'app' // 'app' | 'whisk'
let layoutMode = 'tab' // 'tab' | 'split-h' | 'split-v'
let splitRatio = 0.5   // 0.2 ~ 0.8
```

**Step 3: createWindow() 함수 내 BrowserView → WebContentsView 교체**

변경 전:
```javascript
  whiskView = new BrowserView({
    webPreferences: {
      partition: 'persist:whisk',
      contextIsolation: true
    }
  })
  mainWindow.addBrowserView(whiskView)
```

변경 후:
```javascript
  whiskView = new WebContentsView({
    webPreferences: {
      partition: 'persist:whisk',
      contextIsolation: true
    }
  })
  mainWindow.contentView.addChildView(whiskView)
```

**Step 4: updateBounds() 함수를 레이아웃 모드 대응으로 교체**

변경 전:
```javascript
  const updateBounds = () => {
    if (!mainWindow) return
    const { width, height } = mainWindow.getContentBounds()
    const contentHeight = height - TAB_BAR_HEIGHT
    if (currentTab === 'whisk') {
      whiskView.setBounds({ x: 0, y: TAB_BAR_HEIGHT, width, height: contentHeight })
    } else {
      whiskView.setBounds({ x: 0, y: 0, width: 0, height: 0 })
    }
  }
```

변경 후:
```javascript
  const updateBounds = () => {
    if (!mainWindow || !whiskView) return
    const { width, height } = mainWindow.getContentBounds()

    if (layoutMode === 'tab') {
      // 탭 모드: 기존과 동일
      const contentHeight = height - TAB_BAR_HEIGHT
      if (currentTab === 'whisk') {
        whiskView.setBounds({ x: 0, y: TAB_BAR_HEIGHT, width, height: contentHeight })
      } else {
        whiskView.setBounds({ x: 0, y: 0, width: 0, height: 0 })
      }
    } else if (layoutMode === 'split-h') {
      // 좌우 분할: 좌=Whisk, 우=App
      const splitPos = Math.round(width * splitRatio)
      whiskView.setBounds({ x: 0, y: 0, width: splitPos, height })
    } else if (layoutMode === 'split-v') {
      // 상하 분할: 상=Whisk, 하=App
      const splitPos = Math.round(height * splitRatio)
      whiskView.setBounds({ x: 0, y: 0, width, height: splitPos })
    }
  }
```

**Step 5: app:switch-tab IPC 핸들러에 레이아웃 모드 반영**

변경 전:
```javascript
ipcMain.handle('app:switch-tab', (event, { tab }) => {
  currentTab = tab
  if (!mainWindow) return
  const { width, height } = mainWindow.getContentBounds()
  const contentHeight = height - TAB_BAR_HEIGHT
  if (tab === 'whisk') {
    whiskView.setBounds({ x: 0, y: TAB_BAR_HEIGHT, width, height: contentHeight })
  } else {
    whiskView.setBounds({ x: 0, y: 0, width: 0, height: 0 })
  }
  mainWindow.webContents.send('tab-changed', { tab })
  return { success: true, tab }
})
```

변경 후:
```javascript
ipcMain.handle('app:switch-tab', (event, { tab }) => {
  currentTab = tab
  updateBounds()
  if (mainWindow) {
    mainWindow.webContents.send('tab-changed', { tab })
  }
  return { success: true, tab }
})
```

**Step 6: 새 IPC 핸들러 추가 (app:switch-tab 아래)**

```javascript
// Layout mode
ipcMain.handle('app:set-layout', (event, { mode, ratio }) => {
  layoutMode = mode || 'tab'
  if (ratio !== undefined) splitRatio = Math.max(0.2, Math.min(0.8, ratio))
  updateBounds()
  if (mainWindow) {
    mainWindow.webContents.send('layout-changed', { mode: layoutMode, splitRatio })
  }
  return { success: true, mode: layoutMode, splitRatio }
})

// Split position update (drag)
ipcMain.handle('app:update-split', (event, { position }) => {
  if (!mainWindow) return
  const { width, height } = mainWindow.getContentBounds()
  if (layoutMode === 'split-h') {
    splitRatio = Math.max(0.2, Math.min(0.8, position / width))
  } else if (layoutMode === 'split-v') {
    splitRatio = Math.max(0.2, Math.min(0.8, position / height))
  }
  updateBounds()
  return { success: true, splitRatio }
})

// Get current layout
ipcMain.handle('app:get-layout', () => {
  return { mode: layoutMode, splitRatio }
})
```

**Step 7: 에러 텍스트에서 "BrowserView" → "WebContentsView" 변경**

`whisk:extract-token` 핸들러의 에러 메시지 변경:
```javascript
// 변경 전
return { success: false, error: 'BrowserView not ready' }
// 변경 후
return { success: false, error: 'Whisk view not ready' }
```

**Step 8: 빌드 확인**

Run: `npm run build 2>&1 | tail -15`
Expected: 빌드 성공, 에러 없음

**Step 9: Commit**

```bash
git add electron/main.js
git commit -m "refactor: migrate BrowserView to WebContentsView, add layout mode support"
```

---

### Task 2: Preload에 새 IPC 노출 (electron/preload.js)

**Files:**
- Modify: `electron/preload.js`

**Step 1: Layout IPC 추가**

`// Auth` 섹션 위에 추가:

```javascript
  // Layout
  setLayout: (params) => ipcRenderer.invoke('app:set-layout', params),
  updateSplit: (params) => ipcRenderer.invoke('app:update-split', params),
  getLayout: () => ipcRenderer.invoke('app:get-layout'),
  onLayoutChanged: (callback) => ipcRenderer.on('layout-changed', (_, data) => callback(data)),
```

**Step 2: 빌드 확인**

Run: `npm run build 2>&1 | tail -15`
Expected: 빌드 성공

**Step 3: Commit**

```bash
git add electron/preload.js
git commit -m "feat: expose layout IPC in preload"
```

---

### Task 3: Shell.jsx에 레이아웃 모드 지원 추가

**Files:**
- Modify: `src/Shell.jsx`

**Step 1: 전체 Shell.jsx 교체**

```jsx
/**
 * Shell - Electron Desktop 외부 쉘
 *
 * 레이아웃 모드:
 * - tab: 탭 바 (App / Whisk) 전환
 * - split-h: 좌우 분할 (좌 Whisk / 우 App)
 * - split-v: 상하 분할 (상 Whisk / 하 App)
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { I18nProvider } from './hooks/useI18n'
import { AuthProvider } from './contexts/AuthContext'
import { ToastProvider } from './components/Toast'
import App from './App'

function ShellContent() {
  const [activeTab, setActiveTab] = useState('app')
  const [whiskStatus, setWhiskStatus] = useState({ loaded: false, loggedIn: false })
  const [layoutMode, setLayoutMode] = useState('tab') // 'tab' | 'split-h' | 'split-v'
  const [splitRatio, setSplitRatio] = useState(0.5)
  const [isDragging, setIsDragging] = useState(false)
  const shellRef = useRef(null)

  useEffect(() => {
    if (window.electronAPI?.onWhiskStatus) {
      window.electronAPI.onWhiskStatus((data) => setWhiskStatus(data))
    }
    if (window.electronAPI?.onTabChanged) {
      window.electronAPI.onTabChanged(({ tab }) => setActiveTab(tab))
    }
    if (window.electronAPI?.onLayoutChanged) {
      window.electronAPI.onLayoutChanged(({ mode, splitRatio: ratio }) => {
        setLayoutMode(mode)
        setSplitRatio(ratio)
      })
    }
    // 저장된 레이아웃 로드
    const saved = localStorage.getItem('layoutSettings')
    if (saved) {
      try {
        const { mode, ratio } = JSON.parse(saved)
        if (mode) {
          setLayoutMode(mode)
          setSplitRatio(ratio || 0.5)
          window.electronAPI?.setLayout?.({ mode, ratio: ratio || 0.5 })
        }
      } catch (e) { /* ignore */ }
    }
  }, [])

  // 레이아웃 변경 시 localStorage 저장
  useEffect(() => {
    localStorage.setItem('layoutSettings', JSON.stringify({ mode: layoutMode, ratio: splitRatio }))
  }, [layoutMode, splitRatio])

  const handleTabSwitch = async (tab) => {
    setActiveTab(tab)
    if (window.electronAPI?.switchTab) {
      await window.electronAPI.switchTab(tab)
    }
  }

  // 드래그 리사이저
  const handleMouseDown = useCallback((e) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  useEffect(() => {
    if (!isDragging) return

    const handleMouseMove = (e) => {
      if (!shellRef.current) return
      const rect = shellRef.current.getBoundingClientRect()
      let position
      if (layoutMode === 'split-h') {
        position = e.clientX - rect.left
      } else {
        position = e.clientY - rect.top
      }
      window.electronAPI?.updateSplit?.({ position })
      // 로컬 상태도 업데이트 (React UI 즉시 반영)
      const total = layoutMode === 'split-h' ? rect.width : rect.height
      const newRatio = Math.max(0.2, Math.min(0.8, position / total))
      setSplitRatio(newRatio)
    }

    const handleMouseUp = () => {
      setIsDragging(false)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging, layoutMode])

  const isSplit = layoutMode === 'split-h' || layoutMode === 'split-v'

  // App 영역 스타일 계산
  const getAppStyle = () => {
    if (layoutMode === 'split-h') {
      return {
        position: 'absolute',
        top: 0,
        left: `${splitRatio * 100}%`,
        width: `${(1 - splitRatio) * 100}%`,
        height: '100%',
        overflow: 'auto'
      }
    }
    if (layoutMode === 'split-v') {
      return {
        position: 'absolute',
        top: `${splitRatio * 100}%`,
        left: 0,
        width: '100%',
        height: `${(1 - splitRatio) * 100}%`,
        overflow: 'auto'
      }
    }
    return {} // tab mode: default
  }

  // 리사이저 스타일
  const getResizerStyle = () => {
    if (layoutMode === 'split-h') {
      return {
        position: 'absolute',
        top: 0,
        left: `${splitRatio * 100}%`,
        width: '6px',
        height: '100%',
        transform: 'translateX(-3px)',
        cursor: 'col-resize',
        zIndex: 100
      }
    }
    if (layoutMode === 'split-v') {
      return {
        position: 'absolute',
        top: `${splitRatio * 100}%`,
        left: 0,
        width: '100%',
        height: '6px',
        transform: 'translateY(-3px)',
        cursor: 'row-resize',
        zIndex: 100
      }
    }
    return {}
  }

  return (
    <div
      className={`shell-root ${isSplit ? 'split-mode' : 'tab-mode'}`}
      ref={shellRef}
      style={{ position: 'relative', height: '100vh', overflow: 'hidden' }}
    >
      {/* Tab Bar — 탭 모드에서만 표시 */}
      {layoutMode === 'tab' && (
        <div className="tab-bar">
          <button
            className={`tab-btn ${activeTab === 'app' ? 'active' : ''}`}
            onClick={() => handleTabSwitch('app')}
          >
            Whisk2CapCut
          </button>
          <button
            className={`tab-btn ${activeTab === 'whisk' ? 'active' : ''}`}
            onClick={() => handleTabSwitch('whisk')}
          >
            Whisk {whiskStatus.loggedIn ? '●' : '○'}
          </button>
        </div>
      )}

      {/* App Content */}
      {(layoutMode === 'tab' ? activeTab === 'app' : true) && (
        <div className={isSplit ? 'app-content-split' : 'app-content'} style={isSplit ? getAppStyle() : undefined}>
          <App />
        </div>
      )}

      {/* Drag Resizer — split 모드에서만 */}
      {isSplit && (
        <div
          className="split-resizer"
          style={getResizerStyle()}
          onMouseDown={handleMouseDown}
        >
          <div className="split-resizer-handle" />
        </div>
      )}

      {/* Drag Overlay — 드래그 중 WebContentsView 위 마우스 이벤트 캡처 */}
      {isDragging && (
        <div
          style={{
            position: 'absolute',
            top: 0, left: 0, right: 0, bottom: 0,
            zIndex: 99,
            cursor: layoutMode === 'split-h' ? 'col-resize' : 'row-resize'
          }}
        />
      )}
    </div>
  )
}

export default function Shell() {
  return (
    <I18nProvider>
      <AuthProvider>
        <ToastProvider>
          <ShellContent />
        </ToastProvider>
      </AuthProvider>
    </I18nProvider>
  )
}
```

**Step 2: 빌드 확인**

Run: `npm run build 2>&1 | tail -15`
Expected: 빌드 성공

**Step 3: Commit**

```bash
git add src/Shell.jsx
git commit -m "feat: add split view layout support in Shell"
```

---

### Task 4: CSS 추가 (리사이저 + split 모드 스타일)

**Files:**
- Modify: `src/App.css` (Tab Bar 섹션 근처)

**Step 1: split 모드 CSS 추가**

기존 `.app-content` 아래에 추가:

```css
/* ============================================
   Split View Mode
   ============================================ */

.shell-root.split-mode {
  padding-top: 0;
}

.shell-root.split-mode .app-root {
  padding-top: 0;
}

.app-content-split {
  height: 100%;
  overflow-y: auto;
  background: #1a1a2e;
}

.app-content-split .app-root {
  padding-top: 0;
  height: 100%;
}

/* Resizer */
.split-resizer {
  background: transparent;
  transition: background 0.15s;
}

.split-resizer:hover,
.split-resizer:active {
  background: rgba(99, 102, 241, 0.3);
}

.split-resizer-handle {
  position: absolute;
  border-radius: 2px;
  background: rgba(255, 255, 255, 0.2);
  transition: background 0.15s;
}

.split-resizer:hover .split-resizer-handle,
.split-resizer:active .split-resizer-handle {
  background: rgba(99, 102, 241, 0.8);
}

/* 좌우 분할 시 handle */
.shell-root.split-mode .split-resizer[style*="col-resize"] .split-resizer-handle {
  width: 2px;
  height: 40px;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

/* 상하 분할 시 handle */
.shell-root.split-mode .split-resizer[style*="row-resize"] .split-resizer-handle {
  width: 40px;
  height: 2px;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}
```

**Step 2: 빌드 확인**

Run: `npm run build 2>&1 | tail -15`
Expected: 빌드 성공

**Step 3: Commit**

```bash
git add src/App.css
git commit -m "style: add split view resizer CSS"
```

---

### Task 5: 설정 UI — DisplayTab 컴포넌트 생성

**Files:**
- Create: `src/components/settings/DisplayTab.jsx`

**Step 1: DisplayTab 생성**

```jsx
/**
 * DisplayTab - 화면 레이아웃 설정 탭
 */

export default function DisplayTab({ localSettings, setLocalSettings, t }) {
  const layoutMode = localSettings.layoutMode || 'tab'

  return (
    <div className="tab-panel">
      <div className="setting-row">
        <label className="setting-label">{t('settings.layoutMode')}</label>
        <div className="radio-group">
          <label className="radio-label">
            <input
              type="radio" name="layoutMode" value="tab"
              checked={layoutMode === 'tab'}
              onChange={(e) => setLocalSettings(s => ({ ...s, layoutMode: e.target.value }))}
            />
            <span>📑 {t('settings.layoutTab')}</span>
          </label>
          <label className="radio-label">
            <input
              type="radio" name="layoutMode" value="split-h"
              checked={layoutMode === 'split-h'}
              onChange={(e) => setLocalSettings(s => ({ ...s, layoutMode: e.target.value }))}
            />
            <span>◧ {t('settings.layoutSplitH')}</span>
          </label>
          <label className="radio-label">
            <input
              type="radio" name="layoutMode" value="split-v"
              checked={layoutMode === 'split-v'}
              onChange={(e) => setLocalSettings(s => ({ ...s, layoutMode: e.target.value }))}
            />
            <span>⬒ {t('settings.layoutSplitV')}</span>
          </label>
        </div>
      </div>

      {layoutMode !== 'tab' && (
        <div className="setting-row">
          <label className="setting-label">
            {t('settings.splitRatio')} ({Math.round((localSettings.splitRatio || 0.5) * 100)}%)
          </label>
          <input
            type="range"
            min="20" max="80" step="5"
            value={Math.round((localSettings.splitRatio || 0.5) * 100)}
            onChange={(e) => setLocalSettings(s => ({ ...s, splitRatio: parseInt(e.target.value) / 100 }))}
            className="setting-slider"
          />
          <div className="setting-hint" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#888' }}>
            <span>Whisk 20%</span>
            <span>Whisk 80%</span>
          </div>
        </div>
      )}
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add src/components/settings/DisplayTab.jsx
git commit -m "feat: create DisplayTab settings component"
```

---

### Task 6: SettingsModal에 화면 탭 추가

**Files:**
- Modify: `src/components/SettingsModal.jsx`

**Step 1: import 추가**

```javascript
import DisplayTab from './settings/DisplayTab'
```

**Step 2: TABS 배열에 화면 탭 추가**

```javascript
const TABS = [
  { id: 'storage', icon: '💾', labelKey: 'settings.tabStorage' },
  { id: 'generation', icon: '🎨', labelKey: 'settings.tabGeneration' },
  { id: 'scene', icon: '🎬', labelKey: 'settings.tabScene' },
  { id: 'display', icon: '🖥️', labelKey: 'settings.tabDisplay' }
]
```

**Step 3: 탭 컨텐츠에 DisplayTab 렌더링 추가**

SceneTab 아래에:

```jsx
        {activeTab === 'display' && (
          <DisplayTab
            localSettings={localSettings}
            setLocalSettings={setLocalSettings}
            t={t}
          />
        )}
```

**Step 4: onSave에서 레이아웃 설정을 main process에 전달하도록 수정**

handleSave 변경:

```javascript
  const handleSave = () => {
    // 레이아웃 변경 시 main process에 알림
    if (localSettings.layoutMode) {
      window.electronAPI?.setLayout?.({
        mode: localSettings.layoutMode,
        ratio: localSettings.splitRatio || 0.5
      })
    }
    onSave(localSettings)
  }
```

**Step 5: 빌드 확인**

Run: `npm run build 2>&1 | tail -15`
Expected: 빌드 성공

**Step 6: Commit**

```bash
git add src/components/SettingsModal.jsx
git commit -m "feat: add Display tab to settings modal"
```

---

### Task 7: i18n 문자열 추가

**Files:**
- Modify: `src/locales/ko.js`
- Modify: `src/locales/en.js`

**Step 1: ko.js settings 섹션에 추가**

`tabScene: '씬',` 아래에:

```javascript
    tabDisplay: '화면',
```

`exportThresholdHint:` 아래에:

```javascript
    // 화면 레이아웃
    layoutMode: '레이아웃',
    layoutTab: '탭 전환',
    layoutSplitH: '좌우 분할',
    layoutSplitV: '상하 분할',
    splitRatio: 'Whisk 비율',
```

**Step 2: en.js settings 섹션에 추가**

`tabScene: 'Scene',` 아래에:

```javascript
    tabDisplay: 'Display',
```

해당 위치에:

```javascript
    // Display layout
    layoutMode: 'Layout',
    layoutTab: 'Tab Switch',
    layoutSplitH: 'Side by Side',
    layoutSplitV: 'Top / Bottom',
    splitRatio: 'Whisk Ratio',
```

**Step 3: 빌드 확인**

Run: `npm run build 2>&1 | tail -15`
Expected: 빌드 성공

**Step 4: Commit**

```bash
git add src/locales/ko.js src/locales/en.js
git commit -m "i18n: add display layout strings for ko/en"
```

---

### Task 8: 통합 테스트 및 최종 확인

**Step 1: 전체 빌드**

Run: `npm run build 2>&1 | tail -20`
Expected: 빌드 성공

**Step 2: dev 실행하여 수동 테스트**

Run: `npm run dev`

확인 항목:
1. 기본 탭 모드가 정상 동작하는지 (탭 전환, Whisk 로드)
2. 설정 > 화면 > 좌우 분할 선택 → 저장 → 탭 바 사라지고 좌우 분할 표시
3. 드래그 리사이저로 비율 조절 가능한지
4. 설정 > 화면 > 상하 분할 선택 → 저장 → 상하 분할 표시
5. 설정 > 화면 > 탭 전환 복귀 → 탭 바 다시 표시
6. 앱 재시작 시 마지막 레이아웃 설정이 유지되는지

**Step 3: 최종 Commit**

```bash
git add -A
git commit -m "feat: split view layout with WebContentsView migration"
```
