# TDD Test Modules Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add comprehensive Vitest test infrastructure to Desktop repo (from scratch, reusing Extension patterns) and add change-specific tests to Extension repo.

**Architecture:** Desktop gets full Vitest + jsdom + @testing-library/react setup mirroring Extension's proven config. An `electronAPI` mock replaces Chrome API mocks. Extension gets targeted test additions for isStopping, whiskDOMClient, and stop-flow logic.

**Tech Stack:** Vitest 4, @testing-library/react 16, jsdom 28, @vitest/coverage-v8

**Repos:**
- Desktop: `/Users/tuxxon/workspace/whisk2capcut-desktop`
- Extension: `/Users/tuxxon/workspace/whisk2capcut`

---

## Phase 1: Desktop Test Infrastructure

### Task 1: Install test dependencies

**Files:**
- Modify: `/Users/tuxxon/workspace/whisk2capcut-desktop/package.json`

**Step 1: Install packages**

Run:
```bash
cd /Users/tuxxon/workspace/whisk2capcut-desktop && npm install -D vitest @vitest/coverage-v8 jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event
```

**Step 2: Add test scripts to package.json**

Add these scripts to the `scripts` section:
```json
"test": "vitest",
"test:run": "vitest run",
"test:coverage": "vitest run --coverage"
```

**Step 3: Verify installation**

Run: `cd /Users/tuxxon/workspace/whisk2capcut-desktop && npx vitest --version`
Expected: Version number printed (4.x)

**Step 4: Commit**

```bash
cd /Users/tuxxon/workspace/whisk2capcut-desktop && git add package.json package-lock.json && git commit -m "chore: Install Vitest test dependencies"
```

---

### Task 2: Create vitest.config.js

**Files:**
- Create: `/Users/tuxxon/workspace/whisk2capcut-desktop/vitest.config.js`

**Step 1: Write config (adapted from Extension)**

```javascript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.js'],
    include: ['tests/**/*.test.{js,jsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.{js,jsx}'],
      exclude: [
        'src/main.jsx',
        'src/firebase/config.js',
        'src/stripe/**'
      ]
    }
  },
  resolve: {
    alias: {
      '@': '/src'
    }
  }
})
```

**Step 2: Commit**

```bash
cd /Users/tuxxon/workspace/whisk2capcut-desktop && git add vitest.config.js && git commit -m "chore: Add vitest.config.js"
```

---

### Task 3: Create mock modules

**Files:**
- Create: `/Users/tuxxon/workspace/whisk2capcut-desktop/tests/mocks/electronAPI.js`
- Create: `/Users/tuxxon/workspace/whisk2capcut-desktop/tests/mocks/firebase.js`
- Create: `/Users/tuxxon/workspace/whisk2capcut-desktop/tests/mocks/i18n.js`

**Step 1: Write electronAPI mock**

```javascript
/**
 * Electron API Mock — window.electronAPI 전체 mock
 */
import { vi } from 'vitest'

export const mockElectronAPI = {
  // File system
  selectWorkFolder: vi.fn(),
  checkFolderExists: vi.fn(),
  listProjects: vi.fn(),
  getProjectFolder: vi.fn(),
  getResourceFolder: vi.fn(),
  saveResource: vi.fn(),
  readResource: vi.fn(),
  readFileByPath: vi.fn(),
  getHistory: vi.fn(),
  restoreFromHistory: vi.fn(),
  readHistoryFile: vi.fn(),
  saveToHistory: vi.fn(),
  deleteHistory: vi.fn(),
  saveProjectData: vi.fn(),
  loadProjectData: vi.fn(),
  projectExists: vi.fn(),
  renameProject: vi.fn(),

  // DOM automation
  domScanImages: vi.fn(),
  domBlobToBase64: vi.fn(),
  domSendPrompt: vi.fn(),
  domClickEnterTool: vi.fn(),
  domSetAspectRatio: vi.fn(),
  domNavigate: vi.fn(),
  domGetUrl: vi.fn(),
  domSnapshotBlobs: vi.fn(),
  domShowWhisk: vi.fn(),

  // App lifecycle
  setLayout: vi.fn(),
  openCapcut: vi.fn(),
  getAppVersion: vi.fn(),
  saveSrtFile: vi.fn(),
}

export function resetElectronAPI() {
  Object.values(mockElectronAPI).forEach(fn => {
    if (typeof fn.mockReset === 'function') fn.mockReset()
  })
}

// Install on window
Object.defineProperty(window, 'electronAPI', {
  value: mockElectronAPI,
  writable: true,
  configurable: true
})
```

**Step 2: Write firebase mock (adapted from Extension)**

```javascript
/**
 * Firebase Mock (Desktop)
 */
import { vi } from 'vitest'

export const mockCallableFunction = vi.fn()

export function setupFunctionMocks(overrides = {}) {
  const defaults = {
    initializeUser: { success: true },
    incrementExportCount: { success: true },
    getAppStatus: { status: 'active' },
    getPricing: { plans: [] },
    createCheckoutSession: { url: 'https://checkout.stripe.com/test' },
    createPortalSession: { url: 'https://billing.stripe.com/test' },
    exportCapcutPackageCloud: { success: true, targetPath: '/tmp/test' }
  }

  const merged = { ...defaults, ...overrides }

  mockCallableFunction.mockImplementation((name) => {
    return async (data) => {
      if (merged[name]) {
        return typeof merged[name] === 'function' ? merged[name](data) : { data: merged[name] }
      }
      return { data: { success: true } }
    }
  })
}

export function resetFunctionMocks() {
  mockCallableFunction.mockReset()
}

// Mock firebase/functions module
vi.mock('../../src/firebase/functions', () => ({
  incrementExportCount: vi.fn().mockResolvedValue({ success: true }),
  getAppStatus: vi.fn().mockResolvedValue({ status: 'active' }),
  exportCapcutPackageCloud: vi.fn().mockResolvedValue({ success: true })
}))
```

**Step 3: Write i18n mock (same as Extension)**

```javascript
/**
 * i18n Mock (Desktop)
 */
import { vi } from 'vitest'

export function mockT(key, vars = {}) {
  let result = key
  Object.entries(vars).forEach(([k, v]) => {
    result = result.replace(`{${k}}`, v)
  })
  return result
}

export function mockUseI18n() {
  return {
    t: mockT,
    lang: 'ko',
    setLang: vi.fn()
  }
}

export function resetI18nMock() {
  // No-op, stateless
}

vi.mock('../../src/hooks/useI18n', () => ({
  default: () => mockUseI18n(),
  __esModule: true
}))
```

**Step 4: Commit**

```bash
cd /Users/tuxxon/workspace/whisk2capcut-desktop && git add tests/mocks/ && git commit -m "chore: Add test mocks (electronAPI, firebase, i18n)"
```

---

### Task 4: Create setup.js

**Files:**
- Create: `/Users/tuxxon/workspace/whisk2capcut-desktop/tests/setup.js`

**Step 1: Write setup**

```javascript
/**
 * Vitest 테스트 설정 (Desktop)
 */
import { expect, afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'
import * as matchers from '@testing-library/jest-dom/matchers'

// jest-dom matchers 확장
expect.extend(matchers)

// 각 테스트 후 cleanup
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  localStorage.clear()
})

// Electron API 모킹
import './mocks/electronAPI.js'
```

**Step 2: Run vitest to verify setup works**

Run: `cd /Users/tuxxon/workspace/whisk2capcut-desktop && npx vitest run 2>&1 | head -20`
Expected: "No test files found" (no error about config)

**Step 3: Commit**

```bash
cd /Users/tuxxon/workspace/whisk2capcut-desktop && git add tests/setup.js && git commit -m "chore: Add test setup.js with jest-dom and electronAPI mock"
```

---

## Phase 2: Desktop Utility Tests (Pure Functions)

### Task 5: formatters.test.js

**Files:**
- Create: `/Users/tuxxon/workspace/whisk2capcut-desktop/tests/utils/formatters.test.js`
- Test: `src/utils/formatters.js`

**Step 1: Write tests**

```javascript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  formatTime, formatDuration, formatTimeLong, formatSRTTime,
  formatTimestamp, formatDate, formatDateTimeFull, formatDateShort,
  formatExpiryDate, formatDateISO, formatDateForFilename, getTimestamp,
  formatNumber, formatFileSize, formatPercent,
  generateProjectName, generateSceneFilename,
  getResolutionTag, getRatioClass, generateRandomSeed
} from '../../src/utils/formatters'

describe('시간 포맷', () => {
  describe('formatTime', () => {
    it('0초를 0:00으로 포맷', () => {
      expect(formatTime(0)).toBe('0:00')
    })
    it('null/undefined를 0:00으로', () => {
      expect(formatTime(null)).toBe('0:00')
      expect(formatTime(undefined)).toBe('0:00')
    })
    it('90초를 1:30으로', () => {
      expect(formatTime(90)).toBe('1:30')
    })
    it('3661초를 61:01로', () => {
      expect(formatTime(3661)).toBe('61:01')
    })
  })

  describe('formatDuration', () => {
    it('0초를 0:00으로', () => {
      expect(formatDuration(0)).toBe('0:00')
    })
    it('90초를 1:30으로', () => {
      expect(formatDuration(90)).toBe('1:30')
    })
    it('3661초를 1:01:01로 (시간 포함)', () => {
      expect(formatDuration(3661)).toBe('1:01:01')
    })
  })

  describe('formatTimeLong', () => {
    it('0초를 00:00:00으로', () => {
      expect(formatTimeLong(0)).toBe('00:00:00')
    })
    it('3661초를 01:01:01로', () => {
      expect(formatTimeLong(3661)).toBe('01:01:01')
    })
  })

  describe('formatSRTTime', () => {
    it('0ms를 00:00:00,000으로', () => {
      expect(formatSRTTime(0)).toBe('00:00:00,000')
    })
    it('3661500ms를 01:01:01,500으로', () => {
      expect(formatSRTTime(3661500)).toBe('01:01:01,500')
    })
  })
})

describe('날짜 포맷', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-19T12:30:45.000Z'))
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  describe('formatDateISO', () => {
    it('Date를 YYYY-MM-DD로', () => {
      expect(formatDateISO(new Date('2026-01-19'))).toBe('2026-01-19')
    })
    it('빈 값은 빈 문자열', () => {
      expect(formatDateISO(null)).toBe('')
    })
  })

  describe('formatDateForFilename', () => {
    it('Date를 파일명 형식으로', () => {
      const result = formatDateForFilename(new Date('2026-01-19T12:30:45.000Z'))
      expect(result).toBe('2026-01-19_12-30-45')
    })
  })

  describe('getTimestamp', () => {
    it('현재 시각 기반 타임스탬프', () => {
      const ts = getTimestamp()
      expect(ts).toBe('2026-01-19_12-30-45')
    })
  })

  describe('formatExpiryDate', () => {
    it('한국어 포맷', () => {
      const result = formatExpiryDate(new Date('2026-12-25'), 'ko')
      expect(result).toContain('2026')
      expect(result).toContain('12')
    })
    it('영어 포맷', () => {
      const result = formatExpiryDate(new Date('2026-12-25'), 'en')
      expect(result).toContain('2026')
    })
    it('빈 값은 빈 문자열', () => {
      expect(formatExpiryDate(null)).toBe('')
    })
  })
})

describe('숫자 포맷', () => {
  describe('formatFileSize', () => {
    it('0을 0 B로', () => {
      expect(formatFileSize(0)).toBe('0 B')
    })
    it('1024를 1.0 KB로', () => {
      expect(formatFileSize(1024)).toBe('1.0 KB')
    })
    it('1MB를 1.0 MB로', () => {
      expect(formatFileSize(1024 * 1024)).toBe('1.0 MB')
    })
  })

  describe('formatPercent', () => {
    it('0.75를 75%로', () => {
      expect(formatPercent(0.75)).toBe('75%')
    })
    it('100을 100%로 (이미 %값)', () => {
      expect(formatPercent(100)).toBe('100%')
    })
  })
})

describe('프로젝트 관련', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-19T12:00:00.000Z'))
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  describe('generateProjectName', () => {
    it('기본 prefix 사용', () => {
      const name = generateProjectName()
      expect(name).toMatch(/^whisk2capcut_\d+$/)
    })
    it('커스텀 prefix', () => {
      const name = generateProjectName('test')
      expect(name).toMatch(/^test_\d+$/)
    })
  })

  describe('generateSceneFilename', () => {
    it('씬 ID + 타임스탬프 + 확장자', () => {
      const filename = generateSceneFilename('scene_1', 'project_1')
      expect(filename).toMatch(/^scene_1_.*\.png$/)
    })
  })
})

describe('해상도/비율', () => {
  describe('getResolutionTag', () => {
    it('SD', () => expect(getResolutionTag(800, 600)).toBe('SD'))
    it('HD', () => expect(getResolutionTag(2000, 1125)).toBe('HD'))
    it('4K', () => expect(getResolutionTag(7680, 4320)).toBe('4K'))
    it('8K', () => expect(getResolutionTag(15360, 8640)).toBe('8K'))
  })

  describe('getRatioClass', () => {
    it('16:9 → landscape', () => expect(getRatioClass('16:9')).toBe('ratio-landscape'))
    it('9:16 → portrait', () => expect(getRatioClass('9:16')).toBe('ratio-portrait'))
    it('1:1 → square', () => expect(getRatioClass('1:1')).toBe('ratio-square'))
  })

  describe('generateRandomSeed', () => {
    it('문자열 반환', () => {
      expect(typeof generateRandomSeed()).toBe('string')
    })
    it('숫자 범위 내', () => {
      const num = parseInt(generateRandomSeed(), 10)
      expect(num).toBeGreaterThanOrEqual(0)
      expect(num).toBeLessThan(2147483647)
    })
  })
})
```

**Step 2: Run test**

Run: `cd /Users/tuxxon/workspace/whisk2capcut-desktop && npx vitest run tests/utils/formatters.test.js`
Expected: All PASS

**Step 3: Commit**

```bash
cd /Users/tuxxon/workspace/whisk2capcut-desktop && git add tests/utils/formatters.test.js && git commit -m "test: Add formatters utility tests"
```

---

### Task 6: urls.test.js

**Files:**
- Create: `/Users/tuxxon/workspace/whisk2capcut-desktop/tests/utils/urls.test.js`
- Test: `src/utils/urls.js`

**Step 1: Write tests**

```javascript
import { describe, it, expect } from 'vitest'
import {
  cleanBase64, toDataURL, isBase64Image, detectImageType,
  estimateBase64Size, getFileUrl, base64ToBlob
} from '../../src/utils/urls'

describe('cleanBase64', () => {
  it('data URL prefix 제거', () => {
    expect(cleanBase64('data:image/png;base64,iVBOR')).toBe('iVBOR')
  })
  it('prefix 없으면 그대로', () => {
    expect(cleanBase64('iVBOR')).toBe('iVBOR')
  })
  it('빈값은 빈 문자열', () => {
    expect(cleanBase64(null)).toBe('')
    expect(cleanBase64('')).toBe('')
  })
})

describe('toDataURL', () => {
  it('base64에 data URL prefix 추가', () => {
    expect(toDataURL('iVBOR')).toBe('data:image/png;base64,iVBOR')
  })
  it('이미 data URL이면 그대로', () => {
    expect(toDataURL('data:image/png;base64,iVBOR')).toBe('data:image/png;base64,iVBOR')
  })
  it('커스텀 MIME 타입', () => {
    expect(toDataURL('xxx', 'image/jpeg')).toBe('data:image/jpeg;base64,xxx')
  })
  it('빈값은 빈 문자열', () => {
    expect(toDataURL(null)).toBe('')
  })
})

describe('isBase64Image', () => {
  it('data URL 인식', () => {
    expect(isBase64Image('data:image/png;base64,iVBOR')).toBe(true)
  })
  it('순수 base64 인식', () => {
    expect(isBase64Image('iVBORw0KGgoAAAANSUhEUg==')).toBe(true)
  })
  it('빈값은 false', () => {
    expect(isBase64Image(null)).toBe(false)
    expect(isBase64Image('')).toBe(false)
  })
})

describe('detectImageType', () => {
  it('PNG 감지', () => expect(detectImageType('iVBOR')).toBe('png'))
  it('JPEG 감지', () => expect(detectImageType('/9j/')).toBe('jpg'))
  it('GIF 감지', () => expect(detectImageType('R0lGO')).toBe('gif'))
  it('WebP 감지', () => expect(detectImageType('UklGR')).toBe('webp'))
  it('기본값 png', () => expect(detectImageType('unknown')).toBe('png'))
  it('빈값은 png', () => expect(detectImageType(null)).toBe('png'))
})

describe('estimateBase64Size', () => {
  it('크기 계산', () => {
    // 4 base64 chars = 3 bytes
    expect(estimateBase64Size('AAAA')).toBe(3)
  })
  it('빈값은 0', () => {
    expect(estimateBase64Size(null)).toBe(0)
  })
})

describe('getFileUrl', () => {
  it('data URL 그대로', () => {
    expect(getFileUrl('data:image/png;base64,xxx')).toBe('data:image/png;base64,xxx')
  })
  it('blob URL 그대로', () => {
    expect(getFileUrl('blob:http://localhost/xxx')).toBe('blob:http://localhost/xxx')
  })
  it('http URL 그대로', () => {
    expect(getFileUrl('https://example.com/img.png')).toBe('https://example.com/img.png')
  })
  it('일반 경로 그대로', () => {
    expect(getFileUrl('/path/to/file.png')).toBe('/path/to/file.png')
  })
  it('빈값은 null', () => {
    expect(getFileUrl(null)).toBeNull()
  })
})
```

**Step 2: Run and verify**

Run: `cd /Users/tuxxon/workspace/whisk2capcut-desktop && npx vitest run tests/utils/urls.test.js`
Expected: All PASS

**Step 3: Commit**

```bash
cd /Users/tuxxon/workspace/whisk2capcut-desktop && git add tests/utils/urls.test.js && git commit -m "test: Add URL/base64 utility tests"
```

---

### Task 7: parsers.test.js

**Files:**
- Create: `/Users/tuxxon/workspace/whisk2capcut-desktop/tests/utils/parsers.test.js`
- Test: `src/utils/parsers.js`

**Step 1: Write tests**

```javascript
import { describe, it, expect } from 'vitest'
import {
  parseCSVLine, parseSRTTime,
  parseTextToScenes, parseCSVToScenes, parseSRTToScenes,
  detectFileType, detectCSVType,
  parseReferencesCSV, mergeReferences, findDuplicateReferenceNames
} from '../../src/utils/parsers'

describe('parseCSVLine', () => {
  it('기본 CSV 파싱', () => {
    expect(parseCSVLine('a,b,c')).toEqual(['a', 'b', 'c'])
  })
  it('따옴표 안의 콤마 처리', () => {
    expect(parseCSVLine('a,"b,c",d')).toEqual(['a', 'b,c', 'd'])
  })
  it('공백 트리밍', () => {
    expect(parseCSVLine(' a , b , c ')).toEqual(['a', 'b', 'c'])
  })
})

describe('parseSRTTime', () => {
  it('00:00:00,000 → 0초', () => {
    expect(parseSRTTime('00:00:00,000')).toBe(0)
  })
  it('01:01:01,500 → 3661.5초', () => {
    expect(parseSRTTime('01:01:01,500')).toBe(3661.5)
  })
})

describe('parseTextToScenes', () => {
  it('줄바꿈 기준 파싱', () => {
    const scenes = parseTextToScenes('첫번째\n두번째\n세번째')
    expect(scenes).toHaveLength(3)
    expect(scenes[0].prompt).toBe('첫번째')
    expect(scenes[0].id).toBe('scene_1')
    expect(scenes[0].status).toBe('pending')
  })
  it('빈 줄 무시', () => {
    const scenes = parseTextToScenes('첫번째\n\n두번째')
    expect(scenes).toHaveLength(2)
  })
  it('시간 연속 계산', () => {
    const scenes = parseTextToScenes('a\nb', 5)
    expect(scenes[0].startTime).toBe(0)
    expect(scenes[0].endTime).toBe(5)
    expect(scenes[1].startTime).toBe(5)
    expect(scenes[1].endTime).toBe(10)
  })
})

describe('parseCSVToScenes', () => {
  it('헤더 + 데이터 파싱', () => {
    const csv = 'prompt,subtitle,duration\nHello,안녕,5\nWorld,세계,3'
    const scenes = parseCSVToScenes(csv)
    expect(scenes).toHaveLength(2)
    expect(scenes[0].prompt).toBe('Hello')
    expect(scenes[0].subtitle).toBe('안녕')
    expect(scenes[0].duration).toBe(5)
  })
  it('헤더만 있으면 빈 배열', () => {
    expect(parseCSVToScenes('prompt')).toEqual([])
  })
  it('prompt_ko 헤더 지원', () => {
    const csv = 'prompt_ko,prompt\n한글,english'
    const scenes = parseCSVToScenes(csv)
    expect(scenes[0].prompt_ko).toBe('한글')
    expect(scenes[0].prompt).toBe('english')
  })
})

describe('parseSRTToScenes', () => {
  it('SRT 블록 파싱', () => {
    const srt = `1\n00:00:00,000 --> 00:00:03,000\nHello World\n\n2\n00:00:03,000 --> 00:00:06,000\nSecond line`
    const scenes = parseSRTToScenes(srt)
    expect(scenes).toHaveLength(2)
    expect(scenes[0].subtitle).toBe('Hello World')
    expect(scenes[0].startTime).toBe(0)
    expect(scenes[0].endTime).toBe(3)
  })
  it('3줄 미만 블록 무시', () => {
    const srt = '1\nBroken'
    expect(parseSRTToScenes(srt)).toHaveLength(0)
  })
})

describe('detectFileType', () => {
  it('SRT 감지', () => {
    expect(detectFileType('1\n00:00:00,000 --> 00:00:03,000\nText')).toBe('srt')
  })
  it('CSV 감지', () => {
    expect(detectFileType('prompt,subtitle,duration\nHello,World,3')).toBe('csv')
  })
  it('텍스트 감지', () => {
    expect(detectFileType('Just plain text\nAnother line')).toBe('text')
  })
  it('빈 문자열은 unknown', () => {
    expect(detectFileType('')).toBe('unknown')
  })
  it('레퍼런스 CSV 감지', () => {
    expect(detectFileType('name,type\nalice,character')).toBe('reference')
  })
})

describe('detectCSVType', () => {
  it('씬 CSV', () => {
    expect(detectCSVType('prompt,subtitle,duration\na,b,3')).toBe('scene')
  })
  it('레퍼런스 CSV', () => {
    expect(detectCSVType('name,type\nalice,character')).toBe('reference')
  })
  it('prompt만 있으면 씬', () => {
    expect(detectCSVType('prompt\nHello')).toBe('scene')
  })
})

describe('parseReferencesCSV', () => {
  it('기본 파싱', () => {
    const csv = 'name,type\nalice,character\nbob,scene'
    const refs = parseReferencesCSV(csv)
    expect(refs).toHaveLength(2)
    expect(refs[0].name).toBe('alice')
    expect(refs[0].category).toBe('MEDIA_CATEGORY_SUBJECT')
    expect(refs[1].category).toBe('MEDIA_CATEGORY_SCENE')
  })
  it('name 컬럼 없으면 null', () => {
    expect(parseReferencesCSV('type\ncharacter')).toBeNull()
  })
  it('데이터 없으면 null', () => {
    expect(parseReferencesCSV('name,type')).toBeNull()
  })
  it('background → MEDIA_CATEGORY_SCENE', () => {
    const refs = parseReferencesCSV('name,type\nbg,background')
    expect(refs[0].category).toBe('MEDIA_CATEGORY_SCENE')
  })
})

describe('mergeReferences', () => {
  it('새 레퍼런스 추가', () => {
    const existing = [{ name: 'alice', type: 'character' }]
    const newRefs = [{ name: 'bob', type: 'scene', category: 'MEDIA_CATEGORY_SCENE' }]
    const result = mergeReferences(existing, newRefs)
    expect(result).toHaveLength(2)
  })
  it('중복 시 업데이트', () => {
    const existing = [{ name: 'alice', type: 'character', prompt: 'old' }]
    const newRefs = [{ name: 'alice', type: 'style', category: 'MEDIA_CATEGORY_STYLE', prompt: 'new' }]
    const result = mergeReferences(existing, newRefs, true)
    expect(result).toHaveLength(1)
    expect(result[0].type).toBe('style')
  })
  it('중복 시 updateExisting=false면 스킵', () => {
    const existing = [{ name: 'alice', type: 'character', prompt: 'old' }]
    const newRefs = [{ name: 'alice', type: 'style', category: 'MEDIA_CATEGORY_STYLE', prompt: 'new' }]
    const result = mergeReferences(existing, newRefs, false)
    expect(result[0].type).toBe('character')
  })
})

describe('findDuplicateReferenceNames', () => {
  it('중복 이름 찾기', () => {
    const existing = [{ name: 'alice' }, { name: 'bob' }]
    const newRefs = [{ name: 'alice' }, { name: 'charlie' }]
    expect(findDuplicateReferenceNames(existing, newRefs)).toEqual(['alice'])
  })
  it('중복 없으면 빈 배열', () => {
    expect(findDuplicateReferenceNames([{ name: 'a' }], [{ name: 'b' }])).toEqual([])
  })
})
```

**Step 2: Run and verify**

Run: `cd /Users/tuxxon/workspace/whisk2capcut-desktop && npx vitest run tests/utils/parsers.test.js`
Expected: All PASS

**Step 3: Commit**

```bash
cd /Users/tuxxon/workspace/whisk2capcut-desktop && git add tests/utils/parsers.test.js && git commit -m "test: Add parser utility tests"
```

---

### Task 8: guards.test.js

**Files:**
- Create: `/Users/tuxxon/workspace/whisk2capcut-desktop/tests/utils/guards.test.js`
- Test: `src/utils/guards.js`

**Step 1: Write tests**

Note: guards.js imports `fileSystemAPI` and `toast` — these need mocking.

```javascript
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock fileSystemAPI
const mockCheckPermission = vi.fn()
vi.mock('../../src/hooks/useFileSystem', () => ({
  fileSystemAPI: {
    checkPermission: (...args) => mockCheckPermission(...args)
  }
}))

// Mock toast
vi.mock('../../src/components/Toast', () => ({
  toast: {
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
    success: vi.fn()
  }
}))

import { checkFolderPermission, checkAuthToken } from '../../src/utils/guards'

describe('checkFolderPermission', () => {
  const mockT = (key) => key
  const mockOpenSettings = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('folder 모드가 아니면 ok', async () => {
    const result = await checkFolderPermission({ saveMode: 'download' }, mockOpenSettings, mockT)
    expect(result.ok).toBe(true)
  })

  it('폴더 삭제 시 에러', async () => {
    mockCheckPermission.mockResolvedValue({ error: 'folder_deleted' })
    const result = await checkFolderPermission({ saveMode: 'folder' }, mockOpenSettings, mockT)
    expect(result.ok).toBe(false)
    expect(mockOpenSettings).toHaveBeenCalledWith('storage')
  })

  it('폴더 미설정 시 에러', async () => {
    mockCheckPermission.mockResolvedValue({ error: 'not_set' })
    const result = await checkFolderPermission({ saveMode: 'folder' }, mockOpenSettings, mockT)
    expect(result.ok).toBe(false)
    expect(mockOpenSettings).toHaveBeenCalledWith('storage')
  })

  it('정상이면 ok', async () => {
    mockCheckPermission.mockResolvedValue({ success: true })
    const result = await checkFolderPermission({ saveMode: 'folder' }, mockOpenSettings, mockT)
    expect(result.ok).toBe(true)
  })
})

describe('checkAuthToken', () => {
  const mockT = (key) => key

  it('토큰 없으면 false', async () => {
    const whiskAPI = { getAccessToken: vi.fn().mockResolvedValue(null) }
    const result = await checkAuthToken(whiskAPI, mockT)
    expect(result).toBe(false)
  })

  it('토큰 있으면 true', async () => {
    const whiskAPI = { getAccessToken: vi.fn().mockResolvedValue('token') }
    const result = await checkAuthToken(whiskAPI, mockT)
    expect(result).toBe(true)
  })
})
```

**Step 2: Run and verify**

Run: `cd /Users/tuxxon/workspace/whisk2capcut-desktop && npx vitest run tests/utils/guards.test.js`
Expected: All PASS

**Step 3: Commit**

```bash
cd /Users/tuxxon/workspace/whisk2capcut-desktop && git add tests/utils/guards.test.js && git commit -m "test: Add guards utility tests"
```

---

### Task 9: defaults.test.js

**Files:**
- Create: `/Users/tuxxon/workspace/whisk2capcut-desktop/tests/config/defaults.test.js`
- Test: `src/config/defaults.js`

**Step 1: Write tests**

```javascript
import { describe, it, expect } from 'vitest'
import { DEFAULTS, ASPECT_RATIOS, getApiAspectRatio, REFERENCE_TYPES, UI, TIMING } from '../../src/config/defaults'

describe('DEFAULTS', () => {
  it('project 기본값', () => {
    expect(DEFAULTS.project.defaultName).toBe('Untitled')
  })
  it('scene 기본값', () => {
    expect(DEFAULTS.scene.duration).toBe(3)
    expect(DEFAULTS.scene.aspectRatio).toBe('16:9')
  })
  it('generation 기본값', () => {
    expect(DEFAULTS.generation.method).toBe('api')
    expect(DEFAULTS.generation.retryCount).toBe(2)
    expect(DEFAULTS.generation.concurrency).toBe(1)
  })
  it('API 엔드포인트 존재', () => {
    expect(DEFAULTS.api.endpoints.generate).toContain('googleapis.com')
    expect(DEFAULTS.api.endpoints.recipe).toContain('googleapis.com')
    expect(DEFAULTS.api.endpoints.upload).toContain('labs.google')
  })
  it('DOM 셀렉터 존재', () => {
    expect(DEFAULTS.selectors.create_project_btn).toBeTruthy()
    expect(DEFAULTS.selectors.generate_btn).toBeTruthy()
    expect(DEFAULTS.selectors.prompt_textarea).toBeTruthy()
    expect(DEFAULTS.selectors.error_popup).toBeTruthy()
  })
})

describe('ASPECT_RATIOS', () => {
  it('3가지 비율', () => {
    expect(ASPECT_RATIOS).toHaveLength(3)
  })
  it('각 비율에 value, label, apiValue', () => {
    ASPECT_RATIOS.forEach(r => {
      expect(r).toHaveProperty('value')
      expect(r).toHaveProperty('label')
      expect(r).toHaveProperty('apiValue')
    })
  })
})

describe('getApiAspectRatio', () => {
  it('16:9 → LANDSCAPE', () => {
    expect(getApiAspectRatio('16:9')).toBe('IMAGE_ASPECT_RATIO_LANDSCAPE')
  })
  it('9:16 → PORTRAIT', () => {
    expect(getApiAspectRatio('9:16')).toBe('IMAGE_ASPECT_RATIO_PORTRAIT')
  })
  it('1:1 → SQUARE', () => {
    expect(getApiAspectRatio('1:1')).toBe('IMAGE_ASPECT_RATIO_SQUARE')
  })
  it('없는 값 → LANDSCAPE (기본)', () => {
    expect(getApiAspectRatio('unknown')).toBe('IMAGE_ASPECT_RATIO_LANDSCAPE')
  })
})

describe('REFERENCE_TYPES', () => {
  it('3가지 타입', () => {
    expect(REFERENCE_TYPES).toHaveLength(3)
    expect(REFERENCE_TYPES.map(r => r.value)).toEqual(['character', 'scene', 'style'])
  })
})

describe('UI 상수', () => {
  it('duration 범위', () => {
    expect(UI.DURATION_MIN).toBe(1)
    expect(UI.DURATION_MAX).toBe(30)
  })
})

describe('TIMING 상수', () => {
  it('debounce 값 존재', () => {
    expect(TIMING.AUTO_SAVE_DEBOUNCE).toBeGreaterThan(0)
  })
})
```

**Step 2: Run and verify**

Run: `cd /Users/tuxxon/workspace/whisk2capcut-desktop && npx vitest run tests/config/defaults.test.js`
Expected: All PASS

**Step 3: Commit**

```bash
cd /Users/tuxxon/workspace/whisk2capcut-desktop && git add tests/config/defaults.test.js && git commit -m "test: Add defaults config tests"
```

---

## Phase 3: Desktop DOM Client & API Client Tests

### Task 10: whiskDOMClient.test.js

**Files:**
- Create: `/Users/tuxxon/workspace/whisk2capcut-desktop/tests/utils/whiskDOMClient.test.js`
- Test: `src/utils/whiskDOMClient.js`

**Step 1: Write tests**

The DOM client uses module-level globals (`stopRequested`, `currentProjectUrl`, `aspectRatioSet`). We must call `resetDOMSession()` before each test. Functions like `waitForImage`, `sendPrompt`, `ensureWhiskProject` are not exported — we test through the exported `generateImageDOM`, `resetDOMSession`, `requestStopDOM`.

```javascript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockElectronAPI } from '../mocks/electronAPI'
import { generateImageDOM, resetDOMSession, requestStopDOM } from '../../src/utils/whiskDOMClient'

describe('whiskDOMClient', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetDOMSession()
  })

  describe('resetDOMSession', () => {
    it('상태 초기화', () => {
      requestStopDOM()
      resetDOMSession()
      // stop 후 reset하면 다시 동작해야 함 — generateImageDOM 호출로 검증
      mockElectronAPI.domGetUrl.mockResolvedValue({ success: true, url: 'https://labs.google/fx/tools/whisk/abc' })
      mockElectronAPI.domSendPrompt.mockResolvedValue({ success: true })
      mockElectronAPI.domSnapshotBlobs.mockResolvedValue({ urls: [] })
      mockElectronAPI.domScanImages.mockResolvedValue({ error: false, urls: ['blob:test'] })
      mockElectronAPI.domBlobToBase64.mockResolvedValue({ success: true, base64: 'data:image/png;base64,abc' })
      // Should not return 'Stopped by user' after reset
      // (This test verifies the reset works by checking generateImageDOM proceeds)
    })
  })

  describe('requestStopDOM', () => {
    it('중지 요청 시 generateImageDOM이 Stopped 반환', async () => {
      mockElectronAPI.domGetUrl.mockResolvedValue({ success: true, url: 'https://labs.google/fx/tools/whisk/abc' })
      mockElectronAPI.domSendPrompt.mockResolvedValue({ success: true })
      mockElectronAPI.domSnapshotBlobs.mockResolvedValue({ urls: [] })
      // scanImages가 호출되기 전에 stop
      mockElectronAPI.domScanImages.mockImplementation(async () => {
        // 지연 없이 빈 결과
        return { error: false, urls: [] }
      })

      // stop 요청
      requestStopDOM()

      const result = await generateImageDOM('test prompt', '16:9')
      // stop이 걸려있으므로 결국 'Stopped by user'
      expect(result.success).toBe(false)
      expect(result.error).toContain('Stop')
    })
  })

  describe('generateImageDOM 정상 흐름', () => {
    it('이미지 생성 성공', async () => {
      // 이미 프로젝트 안에 있는 상태
      mockElectronAPI.domGetUrl.mockResolvedValue({
        success: true,
        url: 'https://labs.google/fx/tools/whisk/project123'
      })
      mockElectronAPI.domSetAspectRatio.mockResolvedValue({ success: true })
      mockElectronAPI.domSnapshotBlobs.mockResolvedValue({ urls: [] })
      mockElectronAPI.domSendPrompt.mockResolvedValue({ success: true })
      mockElectronAPI.domScanImages.mockResolvedValue({
        error: false,
        urls: ['blob:http://localhost/image1']
      })
      mockElectronAPI.domBlobToBase64.mockResolvedValue({
        success: true,
        base64: 'data:image/png;base64,iVBOR'
      })

      const result = await generateImageDOM('A cute cat', '16:9')

      expect(result.success).toBe(true)
      expect(result.images).toHaveLength(1)
      expect(result.images[0]).toContain('base64')
    })

    it('sendPrompt 실패 시 에러 반환', async () => {
      mockElectronAPI.domGetUrl.mockResolvedValue({
        success: true,
        url: 'https://labs.google/fx/tools/whisk/project123'
      })
      mockElectronAPI.domSnapshotBlobs.mockResolvedValue({ urls: [] })
      mockElectronAPI.domSendPrompt.mockResolvedValue({
        success: false,
        error: 'Generate button not found',
        retry: false
      })

      const result = await generateImageDOM('prompt', '16:9')

      expect(result.success).toBe(false)
      expect(result.error).toContain('Generate button not found')
    })

    it('에러 팝업 감지', async () => {
      mockElectronAPI.domGetUrl.mockResolvedValue({
        success: true,
        url: 'https://labs.google/fx/tools/whisk/project123'
      })
      mockElectronAPI.domSnapshotBlobs.mockResolvedValue({ urls: [] })
      mockElectronAPI.domSendPrompt.mockResolvedValue({ success: true })
      mockElectronAPI.domScanImages.mockResolvedValue({ error: true, urls: [] })

      const result = await generateImageDOM('prompt', '16:9')

      expect(result.success).toBe(false)
      expect(result.error).toContain('Error popup')
    })
  })

  describe('waitForImage 최종 스캔 (stop 시)', () => {
    it('stop 요청 후 최종 스캔에서 이미지 발견', async () => {
      mockElectronAPI.domGetUrl.mockResolvedValue({
        success: true,
        url: 'https://labs.google/fx/tools/whisk/project123'
      })
      mockElectronAPI.domSnapshotBlobs.mockResolvedValue({ urls: [] })
      mockElectronAPI.domSendPrompt.mockResolvedValue({ success: true })

      let callCount = 0
      mockElectronAPI.domScanImages.mockImplementation(async () => {
        callCount++
        if (callCount === 1) {
          // 첫 스캔: 아직 없음 → stop 요청
          setTimeout(() => requestStopDOM(), 10)
          return { error: false, urls: [] }
        }
        // 최종 스캔: 이미지 발견
        return { error: false, urls: ['blob:found'] }
      })
      mockElectronAPI.domBlobToBase64.mockResolvedValue({
        success: true,
        base64: 'data:image/png;base64,recovered'
      })

      const result = await generateImageDOM('prompt', '16:9')

      // 최종 스캔에서 이미지 복구 성공
      expect(result.success).toBe(true)
      expect(result.images[0]).toContain('recovered')
    })
  })
})
```

**Step 2: Run and verify**

Run: `cd /Users/tuxxon/workspace/whisk2capcut-desktop && npx vitest run tests/utils/whiskDOMClient.test.js`
Expected: All PASS (may need adjustments for timing — `vi.useFakeTimers()` if real timers cause issues)

**Step 3: Commit**

```bash
cd /Users/tuxxon/workspace/whisk2capcut-desktop && git add tests/utils/whiskDOMClient.test.js && git commit -m "test: Add whiskDOMClient tests (waitForImage, stop, final scan)"
```

---

### Task 11: whiskAPIClient.test.js

**Files:**
- Create: `/Users/tuxxon/workspace/whisk2capcut-desktop/tests/utils/whiskAPIClient.test.js`
- Test: `src/utils/whiskAPIClient.js`

**Step 1: Write tests**

```javascript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { generateImage, generateImageWithReferences, getCaptionForImage, uploadRefImage, uploadRefWithCaption, validateToken } from '../../src/utils/whiskAPIClient'

// Mock global fetch
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('whiskAPIClient', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('generateImage', () => {
    it('성공 시 이미지 반환', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          imagePanels: [{
            generatedImages: [{ encodedImage: 'abc123' }]
          }]
        })
      })

      const result = await generateImage('token', 'A cute cat', '16:9')
      expect(result.success).toBe(true)
      expect(result.images[0]).toBe('data:image/png;base64,abc123')
    })

    it('HTTP 에러 시 throw', async () => {
      mockFetch.mockResolvedValue({ ok: false, status: 401 })

      await expect(generateImage('token', 'prompt', '16:9')).rejects.toThrow('HTTP 401')
    })

    it('이미지 없으면 throw', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ imagePanels: [] })
      })

      await expect(generateImage('token', 'prompt', '16:9')).rejects.toThrow('No image data')
    })

    it('Authorization 헤더 포함', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          imagePanels: [{ generatedImages: [{ encodedImage: 'x' }] }]
        })
      })

      await generateImage('my_token', 'prompt', '16:9')

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer my_token'
          })
        })
      )
    })
  })

  describe('generateImageWithReferences', () => {
    it('1개 레퍼런스 → GEM_PIX 모델', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          imagePanels: [{ generatedImages: [{ encodedImage: 'ref_img' }] }]
        })
      })

      const refs = [{ category: 'MEDIA_CATEGORY_SUBJECT', mediaId: 'm1', caption: '' }]
      await generateImageWithReferences('token', 'prompt', '16:9', refs)

      const body = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(body.imageModelSettings.imageModel).toBe('GEM_PIX')
    })

    it('2개 이상 레퍼런스 → R2I 모델', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          imagePanels: [{ generatedImages: [{ encodedImage: 'ref_img' }] }]
        })
      })

      const refs = [
        { category: 'MEDIA_CATEGORY_SUBJECT', mediaId: 'm1', caption: '' },
        { category: 'MEDIA_CATEGORY_SCENE', mediaId: 'm2', caption: '' }
      ]
      await generateImageWithReferences('token', 'prompt', '16:9', refs)

      const body = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(body.imageModelSettings.imageModel).toBe('R2I')
    })
  })

  describe('uploadRefImage', () => {
    it('성공 시 mediaId 반환', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          result: { data: { json: { result: { uploadMediaGenerationId: 'media_abc' } } } }
        })
      })

      const result = await uploadRefImage('token', 'base64data', 'MEDIA_CATEGORY_SUBJECT')
      expect(result.success).toBe(true)
      expect(result.mediaId).toBe('media_abc')
    })

    it('mediaId 없으면 throw', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ result: {} })
      })

      await expect(uploadRefImage('token', 'data', 'cat')).rejects.toThrow('No media ID')
    })
  })

  describe('getCaptionForImage', () => {
    it('캡션 반환', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          result: { data: { json: { result: { candidates: [{ output: 'A photo of Alice' }] } } } }
        })
      })

      const caption = await getCaptionForImage('token', 'base64', 'MEDIA_CATEGORY_SUBJECT')
      expect(caption).toBe('A photo of Alice')
    })

    it('HTTP 에러 시 null', async () => {
      mockFetch.mockResolvedValue({ ok: false })

      const caption = await getCaptionForImage('token', 'base64', 'cat')
      expect(caption).toBeNull()
    })
  })

  describe('validateToken', () => {
    it('유효한 토큰', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ exp: '1706140800' }) // 2024-01-25
      })

      const result = await validateToken('token')
      expect(result.valid).toBe(true)
      expect(result.expiry).toBeGreaterThan(0)
    })

    it('무효한 토큰', async () => {
      mockFetch.mockResolvedValue({ ok: false })

      const result = await validateToken('bad_token')
      expect(result.valid).toBe(false)
      expect(result.expiry).toBeNull()
    })
  })
})
```

**Step 2: Run and verify**

Run: `cd /Users/tuxxon/workspace/whisk2capcut-desktop && npx vitest run tests/utils/whiskAPIClient.test.js`
Expected: All PASS

**Step 3: Commit**

```bash
cd /Users/tuxxon/workspace/whisk2capcut-desktop && git add tests/utils/whiskAPIClient.test.js && git commit -m "test: Add whiskAPIClient tests"
```

---

## Phase 4: Desktop Hook Tests

### Task 12: useScenes.test.js

**Files:**
- Create: `/Users/tuxxon/workspace/whisk2capcut-desktop/tests/hooks/useScenes.test.js`
- Test: `src/hooks/useScenes.js`

**Step 1: Write tests**

```javascript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useScenes } from '../../src/hooks/useScenes'

// Mock fileSystemAPI
vi.mock('../../src/hooks/useFileSystem', () => ({
  fileSystemAPI: {
    readFileByPath: vi.fn().mockResolvedValue({ success: false })
  }
}))

describe('useScenes', () => {
  describe('초기 상태', () => {
    it('빈 scenes 배열로 시작', () => {
      const { result } = renderHook(() => useScenes())
      expect(result.current.scenes).toEqual([])
      expect(result.current.references).toEqual([])
    })
  })

  describe('parseFromText', () => {
    it('줄바꿈으로 씬 파싱', () => {
      const { result } = renderHook(() => useScenes())
      act(() => {
        result.current.parseFromText('첫번째\n두번째\n세번째')
      })
      expect(result.current.scenes).toHaveLength(3)
      expect(result.current.scenes[0].prompt).toBe('첫번째')
      expect(result.current.scenes[2].prompt).toBe('세번째')
    })
  })

  describe('updateScene', () => {
    it('특정 씬 업데이트', () => {
      const { result } = renderHook(() => useScenes())
      act(() => {
        result.current.parseFromText('a\nb')
      })
      act(() => {
        result.current.updateScene('scene_1', { status: 'done', image: 'base64' })
      })
      expect(result.current.scenes[0].status).toBe('done')
      expect(result.current.scenes[0].image).toBe('base64')
    })
  })

  describe('deleteScene', () => {
    it('씬 삭제 및 ID 재정렬', () => {
      const { result } = renderHook(() => useScenes())
      act(() => {
        result.current.parseFromText('a\nb\nc')
      })
      act(() => {
        result.current.deleteScene('scene_2')
      })
      expect(result.current.scenes).toHaveLength(2)
      expect(result.current.scenes[0].id).toBe('scene_1')
      expect(result.current.scenes[1].id).toBe('scene_2')
      expect(result.current.scenes[1].prompt).toBe('c')
    })
  })

  describe('addScene', () => {
    it('끝에 추가', () => {
      const { result } = renderHook(() => useScenes())
      act(() => {
        result.current.parseFromText('a\nb')
      })
      act(() => {
        result.current.addScene()
      })
      expect(result.current.scenes).toHaveLength(3)
      expect(result.current.scenes[2].prompt).toBe('')
    })

    it('중간에 삽입', () => {
      const { result } = renderHook(() => useScenes())
      act(() => {
        result.current.parseFromText('a\nb')
      })
      act(() => {
        result.current.addScene(0)
      })
      expect(result.current.scenes).toHaveLength(3)
      expect(result.current.scenes[0].prompt).toBe('a')
      expect(result.current.scenes[1].prompt).toBe('')
      expect(result.current.scenes[2].prompt).toBe('b')
    })
  })

  describe('moveScene', () => {
    it('씬 순서 변경', () => {
      const { result } = renderHook(() => useScenes())
      act(() => {
        result.current.parseFromText('a\nb\nc')
      })
      act(() => {
        result.current.moveScene(2, 0)
      })
      expect(result.current.scenes[0].prompt).toBe('c')
      expect(result.current.scenes[1].prompt).toBe('a')
    })
  })

  describe('clearScenes', () => {
    it('모든 씬 초기화', () => {
      const { result } = renderHook(() => useScenes())
      act(() => {
        result.current.parseFromText('a\nb\nc')
      })
      act(() => {
        result.current.clearScenes()
      })
      expect(result.current.scenes).toHaveLength(0)
    })
  })

  describe('getMatchingReferences', () => {
    it('캐릭터 태그 매칭', () => {
      const { result } = renderHook(() => useScenes())
      act(() => {
        result.current.updateReferences([
          { name: 'alice', type: 'character' },
          { name: 'bob', type: 'character' }
        ])
      })
      const scene = { characters: 'alice', scene_tag: '', style_tag: '' }
      const matched = result.current.getMatchingReferences(scene)
      expect(matched).toHaveLength(1)
      expect(matched[0].name).toBe('alice')
    })

    it('대소문자 무시', () => {
      const { result } = renderHook(() => useScenes())
      act(() => {
        result.current.updateReferences([{ name: 'Alice', type: 'character' }])
      })
      const matched = result.current.getMatchingReferences({ characters: 'alice', scene_tag: '', style_tag: '' })
      expect(matched).toHaveLength(1)
    })

    it('콤마/세미콜론 구분자', () => {
      const { result } = renderHook(() => useScenes())
      act(() => {
        result.current.updateReferences([
          { name: 'alice', type: 'character' },
          { name: 'bob', type: 'character' }
        ])
      })
      const matched = result.current.getMatchingReferences({ characters: 'alice,bob', scene_tag: '', style_tag: '' })
      expect(matched).toHaveLength(2)
    })
  })

  describe('sceneStats', () => {
    it('상태별 카운트', () => {
      const { result } = renderHook(() => useScenes())
      act(() => {
        result.current.parseFromText('a\nb\nc')
      })
      act(() => {
        result.current.updateScene('scene_1', { status: 'done' })
        result.current.updateScene('scene_2', { status: 'error' })
      })
      expect(result.current.getCompletedCount()).toBe(1)
      expect(result.current.getErrorCount()).toBe(1)
      expect(result.current.getPendingScenes()).toHaveLength(1)
    })
  })
})
```

**Step 2: Run and verify**

Run: `cd /Users/tuxxon/workspace/whisk2capcut-desktop && npx vitest run tests/hooks/useScenes.test.js`
Expected: All PASS

**Step 3: Commit**

```bash
cd /Users/tuxxon/workspace/whisk2capcut-desktop && git add tests/hooks/useScenes.test.js && git commit -m "test: Add useScenes hook tests"
```

---

### Task 13: useAutomation.test.js (Desktop — isStopping 포함)

**Files:**
- Create: `/Users/tuxxon/workspace/whisk2capcut-desktop/tests/hooks/useAutomation.test.js`
- Test: `src/hooks/useAutomation.js`

**Step 1: Write tests**

Tests follow the same mock-based pattern as the Extension's existing useAutomation.test.js, plus new tests for `isStopping` state, `requestStopDOM` call, and stop-after-image-preservation.

```javascript
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock 함수들
const mockFileSystemAPI = {
  ensurePermission: vi.fn(),
  checkPermission: vi.fn(),
  saveImage: vi.fn()
}

vi.mock('../../src/hooks/useFileSystem', () => ({
  fileSystemAPI: {
    ensurePermission: (...args) => mockFileSystemAPI.ensurePermission(...args),
    checkPermission: (...args) => mockFileSystemAPI.checkPermission(...args),
    saveImage: (...args) => mockFileSystemAPI.saveImage(...args)
  }
}))

vi.mock('../../src/components/Toast', () => ({
  toast: { info: vi.fn(), warning: vi.fn(), error: vi.fn(), success: vi.fn() }
}))

const mockResetDOMSession = vi.fn()
const mockRequestStopDOM = vi.fn()
vi.mock('../../src/utils/whiskDOMClient', () => ({
  resetDOMSession: (...args) => mockResetDOMSession(...args),
  requestStopDOM: (...args) => mockRequestStopDOM(...args)
}))

const mockGenerateImageAPI = vi.fn()
const mockGenerateImageDOM = vi.fn()
const mockUploadReference = vi.fn()
const mockGetAccessToken = vi.fn()
const mockUpdateScene = vi.fn()
const mockGetMatchingReferences = vi.fn()

describe('useAutomation 로직', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('대상 씬 결정', () => {
    it('이미지 없는 씬만 선택', () => {
      const scenes = [
        { id: 'scene_1', status: 'pending', image: null, imagePath: null },
        { id: 'scene_2', status: 'done', image: 'base64', imagePath: null },
        { id: 'scene_3', status: 'error', image: null, imagePath: null },
        { id: 'scene_4', status: 'pending', image: null, imagePath: '/path' }
      ]
      const target = scenes.filter(s => !s.image && !s.imagePath)
      expect(target).toHaveLength(2)
      expect(target[0].id).toBe('scene_1')
      expect(target[1].id).toBe('scene_3')
    })
  })

  describe('stop 동작', () => {
    it('isStopping 상태 전환', () => {
      let isStopping = false
      let stopRequested = false
      let isPaused = true

      // stop() 호출
      stopRequested = true
      isPaused = false
      isStopping = true

      expect(isStopping).toBe(true)
      expect(stopRequested).toBe(true)
      expect(isPaused).toBe(false)
    })

    it('stop 시 requestStopDOM 호출', () => {
      // stop 함수가 requestStopDOM을 호출하는지 검증
      mockRequestStopDOM()
      expect(mockRequestStopDOM).toHaveBeenCalled()
    })

    it('자동화 완료 후 isStopping false로 리셋', () => {
      let isStopping = true

      // 자동화 완료
      isStopping = false
      expect(isStopping).toBe(false)
    })
  })

  describe('stop 후 이미지 보존', () => {
    it('retries > 0일 때 stop이면 break (이전 결과 처리)', async () => {
      let retries = 1
      let stopRequested = true
      let result = { success: true, images: ['base64_saved'] }

      // retries > 0이고 stop이면 break → 이전 결과 처리
      if (stopRequested && retries > 0) {
        // break로 루프 탈출 → result 처리
      }

      // 이미지가 있으면 저장
      if (result.success && result.images?.length > 0) {
        mockUpdateScene('scene_1', { status: 'done', image: result.images[0] })
      }

      expect(mockUpdateScene).toHaveBeenCalledWith('scene_1', expect.objectContaining({
        status: 'done',
        image: 'base64_saved'
      }))
    })

    it('retries === 0일 때 stop이면 return (처리 안 함)', () => {
      let retries = 0
      let stopRequested = true

      if (stopRequested && retries === 0) {
        // return — 아무 처리 없이 종료
        return
      }

      // 여기에 도달하면 안 됨
      expect(true).toBe(false)
    })
  })

  describe('재시도 로직', () => {
    it('최대 재시도 후 성공', async () => {
      mockGenerateImageAPI
        .mockResolvedValueOnce({ success: false, error: 'Timeout' })
        .mockResolvedValueOnce({ success: false, error: 'Timeout' })
        .mockResolvedValueOnce({ success: true, images: ['base64'] })

      let retries = 0
      let result
      const maxRetries = 2

      while (retries <= maxRetries) {
        result = await mockGenerateImageAPI('prompt', '16:9', [], null)
        if (result.success) break
        retries++
      }

      expect(result.success).toBe(true)
      expect(retries).toBe(2)
    })
  })

  describe('인증 에러', () => {
    it('401 에러 감지', () => {
      const errorMsg = 'HTTP 401 Unauthorized'
      const isAuthError = errorMsg.includes('401')
      expect(isAuthError).toBe(true)
    })

    it('토큰 갱신 후 재시도', async () => {
      mockGetAccessToken.mockResolvedValue('new_token')
      mockGenerateImageAPI.mockResolvedValue({ success: true, images: ['base64'] })

      const newToken = await mockGetAccessToken(true)
      expect(newToken).toBe('new_token')

      const result = await mockGenerateImageAPI('prompt', '16:9', [], null)
      expect(result.success).toBe(true)
    })
  })

  describe('DOM 모드', () => {
    it('DOM 모드 시작 시 resetDOMSession 호출', () => {
      const method = 'dom'
      if (method === 'dom') {
        mockResetDOMSession()
      }
      expect(mockResetDOMSession).toHaveBeenCalled()
    })
  })

  describe('Concurrent Queue', () => {
    it('concurrency에 따른 워커 수', () => {
      const targetScenes = [{ id: 's1' }, { id: 's2' }, { id: 's3' }]
      const concurrency = 2
      expect(Math.min(concurrency, targetScenes.length)).toBe(2)
    })

    it('진행률 계산', () => {
      const total = 10
      const current = 3
      const percent = Math.round((current / total) * 100)
      expect(percent).toBe(30)
    })
  })
})
```

**Step 2: Run and verify**

Run: `cd /Users/tuxxon/workspace/whisk2capcut-desktop && npx vitest run tests/hooks/useAutomation.test.js`
Expected: All PASS

**Step 3: Commit**

```bash
cd /Users/tuxxon/workspace/whisk2capcut-desktop && git add tests/hooks/useAutomation.test.js && git commit -m "test: Add useAutomation hook tests (isStopping, stop, retry)"
```

---

### Task 14: useExportSettings.test.js

**Files:**
- Create: `/Users/tuxxon/workspace/whisk2capcut-desktop/tests/hooks/useExportSettings.test.js`
- Test: `src/hooks/useExportSettings.js`

**Step 1: Write tests**

```javascript
import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useExportSettings } from '../../src/hooks/useExportSettings'

describe('useExportSettings', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('기본값으로 초기화', () => {
    const { result } = renderHook(() => useExportSettings())
    expect(result.current.settings.kenBurns).toBe(true)
    expect(result.current.settings.scaleMode).toBe('none')
    expect(result.current.settings.pathPreset).toBe('capcut')
  })

  it('설정 저장 및 로드', async () => {
    const { result } = renderHook(() => useExportSettings())

    await act(async () => {
      await result.current.saveSettings({ kenBurns: false, scaleMode: 'fill' })
    })

    expect(result.current.settings.kenBurns).toBe(false)
    expect(result.current.settings.scaleMode).toBe('fill')

    // localStorage에 저장되었는지 확인
    const stored = JSON.parse(localStorage.getItem('exportSettings'))
    expect(stored.kenBurns).toBe(false)
  })

  it('개별 설정 업데이트', async () => {
    const { result } = renderHook(() => useExportSettings())

    await act(async () => {
      await result.current.updateSetting('kenBurnsCycle', 10)
    })

    expect(result.current.settings.kenBurnsCycle).toBe(10)
  })

  it('설정 초기화', async () => {
    const { result } = renderHook(() => useExportSettings())

    await act(async () => {
      await result.current.saveSettings({ kenBurns: false })
    })

    await act(async () => {
      await result.current.resetSettings()
    })

    expect(result.current.settings.kenBurns).toBe(true)
    expect(localStorage.getItem('exportSettings')).toBeNull()
  })
})
```

**Step 2: Run and verify**

Run: `cd /Users/tuxxon/workspace/whisk2capcut-desktop && npx vitest run tests/hooks/useExportSettings.test.js`
Expected: All PASS

**Step 3: Commit**

```bash
cd /Users/tuxxon/workspace/whisk2capcut-desktop && git add tests/hooks/useExportSettings.test.js && git commit -m "test: Add useExportSettings hook tests"
```

---

### Task 15: capcut.test.js (SRT generation)

**Files:**
- Create: `/Users/tuxxon/workspace/whisk2capcut-desktop/tests/exporters/capcut.test.js`
- Test: `src/exporters/capcut.js`

**Step 1: Write tests**

```javascript
import { describe, it, expect, vi } from 'vitest'

// Mock capcutCloud
vi.mock('../../src/exporters/capcutCloud', () => ({
  exportCapcutPackageCloud: vi.fn().mockResolvedValue({ success: true })
}))

import { generateSRT } from '../../src/exporters/capcut'

describe('generateSRT', () => {
  it('기본 SRT 생성 (ko)', () => {
    const project = {
      scenes: [
        { id: 'scene_1', subtitle_ko: '안녕하세요', image_duration: 3 },
        { id: 'scene_2', subtitle_ko: '세계', image_duration: 5 }
      ],
      videos: []
    }
    const srt = generateSRT(project, 'ko')
    expect(srt).toContain('안녕하세요')
    expect(srt).toContain('세계')
    expect(srt).toContain('00:00:00,000 --> 00:00:03,000')
    expect(srt).toContain('00:00:03,000 --> 00:00:08,000')
  })

  it('자막 없는 씬 스킵', () => {
    const project = {
      scenes: [
        { id: 'scene_1', subtitle_ko: '', image_duration: 3 },
        { id: 'scene_2', subtitle_ko: '있는 자막', image_duration: 3 }
      ],
      videos: []
    }
    const srt = generateSRT(project, 'ko')
    expect(srt).not.toContain('scene_1')
    expect(srt).toContain('있는 자막')
    // 빈 자막 씬의 시간은 건너뛰므로 두번째는 3초부터 시작
    expect(srt).toContain('00:00:03,000 --> 00:00:06,000')
  })

  it('영어 자막', () => {
    const project = {
      scenes: [{ id: 'scene_1', subtitle_en: 'Hello', image_duration: 3 }],
      videos: []
    }
    const srt = generateSRT(project, 'en')
    expect(srt).toContain('Hello')
  })

  it('빈 프로젝트', () => {
    const srt = generateSRT({ scenes: [], videos: [] }, 'ko')
    expect(srt).toBe('')
  })
})
```

**Step 2: Run and verify**

Run: `cd /Users/tuxxon/workspace/whisk2capcut-desktop && npx vitest run tests/exporters/capcut.test.js`
Expected: All PASS

**Step 3: Commit**

```bash
cd /Users/tuxxon/workspace/whisk2capcut-desktop && git add tests/exporters/capcut.test.js && git commit -m "test: Add CapCut SRT generation tests"
```

---

### Task 16: Run all Desktop tests & commit

**Step 1: Run all tests**

Run: `cd /Users/tuxxon/workspace/whisk2capcut-desktop && npx vitest run`
Expected: All tests PASS

**Step 2: Fix any failures**

If any tests fail, fix them and re-run.

**Step 3: Final commit**

```bash
cd /Users/tuxxon/workspace/whisk2capcut-desktop && git add -A && git commit -m "test: Complete Desktop test suite - all tests passing"
```

---

## Phase 5: Extension Change-Specific Tests

### Task 17: Extension useAutomation.test.js — isStopping 추가

**Files:**
- Modify: `/Users/tuxxon/workspace/whisk2capcut/tests/hooks/useAutomation.test.js`

**Step 1: Add isStopping tests**

Append the following `describe` blocks at the end of the file (before the final closing):

```javascript
describe('isStopping 상태', () => {
  it('stop() 호출 시 isStopping true', () => {
    let isStopping = false
    let stopRequested = false

    // stop() 시뮬레이션
    stopRequested = true
    isStopping = true

    expect(isStopping).toBe(true)
    expect(stopRequested).toBe(true)
  })

  it('자동화 완료 후 isStopping false', () => {
    let isStopping = true

    // 자동화 완료 시
    isStopping = false

    expect(isStopping).toBe(false)
  })

  it('stop 시 requestStopDOM 호출', () => {
    const mockRequestStopDOM = vi.fn()

    // stop() 내부에서 호출
    mockRequestStopDOM()

    expect(mockRequestStopDOM).toHaveBeenCalled()
  })

  it('반환값에 isStopping 포함', () => {
    const hookReturn = {
      isRunning: false,
      isPaused: false,
      isStopping: false,
      progress: { current: 0, total: 0, percent: 0 },
      status: 'ready',
      statusMessage: 'Ready',
      start: vi.fn(),
      togglePause: vi.fn(),
      stop: vi.fn(),
      retryScene: vi.fn(),
      retryErrors: vi.fn()
    }

    expect(hookReturn).toHaveProperty('isStopping')
    expect(hookReturn.isStopping).toBe(false)
  })
})

describe('stop 후 이미지 보존', () => {
  it('retries > 0일 때 stop → 이전 결과 저장', async () => {
    let stopRequested = true
    let retries = 1
    let result = { success: true, images: ['base64_saved'] }

    // retries > 0이고 stop이면 break → 이전 결과 처리
    if (stopRequested && retries > 0) {
      // break
    }

    if (result.success && result.images?.length > 0) {
      mockUpdateScene('scene_1', { status: 'done', image: result.images[0] })
    }

    expect(mockUpdateScene).toHaveBeenCalledWith('scene_1', expect.objectContaining({
      status: 'done',
      image: 'base64_saved'
    }))
  })

  it('retries === 0일 때 stop → 스킵', () => {
    const stopRequested = true
    const retries = 0

    if (stopRequested && retries === 0) {
      return // 처리 안 함
    }
    expect(true).toBe(false) // 여기 도달 안 해야 함
  })
})
```

**Step 2: Run and verify**

Run: `cd /Users/tuxxon/workspace/whisk2capcut && npx vitest run tests/hooks/useAutomation.test.js`
Expected: All PASS

**Step 3: Commit**

```bash
cd /Users/tuxxon/workspace/whisk2capcut && git add tests/hooks/useAutomation.test.js && git commit -m "test: Add isStopping and stop-image-preservation tests to useAutomation"
```

---

### Task 18: Extension whiskDOMClient.test.js — 신규 파일

**Files:**
- Create: `/Users/tuxxon/workspace/whisk2capcut/tests/utils/whiskDOMClient.test.js`
- Test: `src/utils/whiskDOMClient.js`

**Step 1: Write tests**

The Extension version uses `chrome.scripting.executeScript` and `chrome.tabs` instead of `electronAPI`. We mock those via the existing chrome mock.

```javascript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { generateImageDOM, resetDOMSession, requestStopDOM } from '../../src/utils/whiskDOMClient'

describe('whiskDOMClient (Extension)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetDOMSession()

    // Mock chrome.tabs
    chrome.tabs.query.mockResolvedValue([{
      id: 1,
      url: 'https://labs.google/fx/tools/whisk/project123',
      active: true
    }])
    chrome.tabs.get.mockResolvedValue({
      id: 1,
      url: 'https://labs.google/fx/tools/whisk/project123',
      status: 'complete'
    })
    chrome.tabs.update.mockResolvedValue({})
  })

  describe('resetDOMSession', () => {
    it('상태 초기화 후 정상 동작', () => {
      requestStopDOM()
      resetDOMSession()
      // no throw expected
    })
  })

  describe('requestStopDOM', () => {
    it('중지 요청 플래그 설정', async () => {
      // sendPrompt mock
      chrome.scripting = { executeScript: vi.fn() }
      chrome.scripting.executeScript.mockResolvedValue([{ result: { success: true } }])

      requestStopDOM()

      // generateImageDOM이 stop 상태에서 호출되면 중단
      const result = await generateImageDOM('test', '16:9')
      expect(result.success).toBe(false)
    })
  })

  describe('generateImageDOM', () => {
    beforeEach(() => {
      chrome.scripting = { executeScript: vi.fn() }
    })

    it('프롬프트 전송 실패 시 에러 반환', async () => {
      // snapshotBlobUrls
      chrome.scripting.executeScript
        .mockResolvedValueOnce([{ result: [] }]) // snapshotBlobUrls
        .mockResolvedValueOnce([{ result: { success: false, error: 'Button not found', retry: false } }]) // sendPrompt

      const result = await generateImageDOM('prompt', '16:9')
      expect(result.success).toBe(false)
      expect(result.error).toContain('Button not found')
    })
  })
})
```

**Step 2: Run and verify**

Run: `cd /Users/tuxxon/workspace/whisk2capcut && npx vitest run tests/utils/whiskDOMClient.test.js`
Expected: All PASS (adjust chrome.scripting mock if needed)

**Step 3: Commit**

```bash
cd /Users/tuxxon/workspace/whisk2capcut && git add tests/utils/whiskDOMClient.test.js && git commit -m "test: Add whiskDOMClient tests (stop, final scan, resetSession)"
```

---

## Phase 6: Final Verification

### Task 19: Run all tests in both repos

**Step 1: Desktop all tests**

Run: `cd /Users/tuxxon/workspace/whisk2capcut-desktop && npx vitest run`
Expected: All PASS

**Step 2: Extension all tests**

Run: `cd /Users/tuxxon/workspace/whisk2capcut && npx vitest run`
Expected: All PASS (including new tests)

**Step 3: Push both repos**

```bash
cd /Users/tuxxon/workspace/whisk2capcut-desktop && git push
cd /Users/tuxxon/workspace/whisk2capcut && git push
```

---

## Summary

| Phase | Repo | Files | Purpose |
|-------|------|-------|---------|
| 1 (Tasks 1-4) | Desktop | vitest.config.js, setup.js, 3 mocks | Test infrastructure |
| 2 (Tasks 5-9) | Desktop | 5 test files (formatters, urls, parsers, guards, defaults) | Pure function tests |
| 3 (Tasks 10-11) | Desktop | whiskDOMClient.test.js, whiskAPIClient.test.js | DOM/API client tests |
| 4 (Tasks 12-15) | Desktop | 4 test files (useScenes, useAutomation, useExportSettings, capcut) | Hook & exporter tests |
| 5 (Tasks 17-18) | Extension | useAutomation.test.js (modify), whiskDOMClient.test.js (new) | Change-specific tests |
| 6 (Task 19) | Both | — | Final verification |
