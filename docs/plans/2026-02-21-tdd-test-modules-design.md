# TDD Test Modules Design

**Date**: 2026-02-21
**Scope**: Desktop (전체 인프라 + 포괄적 테스트) + Extension (변경사항 테스트 추가)

## 1. Desktop 테스트 인프라 구축

### 1.1 Extension에서 재활용

Extension(`whisk2capcut`)의 검증된 테스트 인프라를 Desktop에 적용한다.

| Extension 원본 | Desktop 적용 | 변경 사항 |
|---------------|-------------|-----------|
| `vitest.config.js` | 복사 후 수정 | Electron plugin 제외, alias 조정 |
| `tests/setup.js` | 복사 후 수정 | chrome mock → electronAPI mock |
| `tests/mocks/firebase.js` | 거의 그대로 | 동일 Firebase 구조 |
| `tests/mocks/i18n.js` | 그대로 | 동일 훅 |
| `tests/mocks/fileSystem.js` | 재작성 | File System Access API → electronAPI IPC |

### 1.2 Desktop 전용 mock

**`tests/mocks/electronAPI.js`** — `window.electronAPI` 전체 mock:
- File system IPC: `selectFolder`, `readFile`, `writeFile`, `listFiles`, `deleteFile`, `fileExists`
- DOM automation: `domScanImages`, `domBlobToBase64`, `domSetPrompt`, `domClickGenerate`, `domCheckGenButton`, `domSetAspectRatio`, `domNavigate`, `domGetUrl`
- App lifecycle: `setLayout`, `openCapCut`, `getAppVersion`

### 1.3 패키지 설치

```bash
npm install -D vitest @vitest/coverage-v8 jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event
```

### 1.4 npm scripts

```json
{
  "test": "vitest",
  "test:run": "vitest run",
  "test:coverage": "vitest run --coverage"
}
```

## 2. Desktop 테스트 파일 (전체)

### Critical Priority

| 파일 | 대상 모듈 | 핵심 테스트 항목 |
|------|-----------|-----------------|
| `tests/hooks/useAutomation.test.js` | useAutomation.js | 동시실행 큐, isStopping, pause/resume, retry, 401 복구, 진행률 |
| `tests/utils/whiskDOMClient.test.js` | whiskDOMClient.js | waitForImage, 최종스캔, stopRequested, sendPrompt retry |
| `tests/utils/whiskAPIClient.test.js` | whiskAPIClient.js | generateImage, 레퍼런스 업로드, 토큰 검증, HTTP 에러 |
| `tests/utils/parsers.test.js` | parsers.js | CSV/SRT/텍스트 파싱, detectFileType, 레퍼런스 파싱 |

### Important Priority

| 파일 | 대상 모듈 | 핵심 테스트 항목 |
|------|-----------|-----------------|
| `tests/utils/formatters.test.js` | formatters.js | 시간/날짜/파일크기 포맷, 프로젝트명 생성, 해상도 태그 |
| `tests/utils/urls.test.js` | urls.js | base64 변환, MIME 감지, blob 변환 |
| `tests/utils/guards.test.js` | guards.js | 폴더/토큰 검증 |
| `tests/hooks/useScenes.test.js` | useScenes.js | 씬 CRUD, 태그 매칭, 시간 재계산 |
| `tests/hooks/useFileSystem.test.js` | useFileSystem.js | IPC 래퍼, localStorage, 프로젝트 관리 |

### Medium Priority

| 파일 | 대상 모듈 | 핵심 테스트 항목 |
|------|-----------|-----------------|
| `tests/hooks/useExport.test.js` | useExport.js | 내보내기 플로우, 구독 체크, phase 전환 |
| `tests/hooks/useExportSettings.test.js` | useExportSettings.js | localStorage 설정 저장/로드/리셋 |
| `tests/exporters/capcut.test.js` | capcut.js | SRT 생성, 시간 포맷 |
| `tests/integration/workflow.test.js` | 통합 | 전체 자동화 플로우 시나리오 |

### Low Priority

| 파일 | 대상 모듈 |
|------|-----------|
| `tests/config/defaults.test.js` | defaults.js 상수 스냅샷 |

## 3. Extension 변경사항 테스트 추가

### 기존 파일 수정

**`tests/hooks/useAutomation.test.js`** 에 추가:
- `isStopping` 상태 전환: stop() 호출 시 true, 자동화 완료 시 false
- stop 시 `requestStopDOM()` 호출 확인
- stop 후 생성된 이미지 보존 시나리오

### 신규 파일

**`tests/utils/whiskDOMClient.test.js`**:
- `waitForImage()` 정상 이미지 반환
- `waitForImage()` 타임아웃 처리
- `waitForImage()` stop 시 최종 스캔으로 이미지 복구
- `requestStopDOM()` / `resetDOMSession()` 상태 관리
- `sendPrompt()` disabled 상태 retry
- `snapshotBlobUrls()` 기존 URL 캡처
- `ensureWhiskProject()` URL 대기 로직

## 4. 테스트 디렉토리 구조

### Desktop

```
tests/
├── setup.js                          # Extension 기반, electronAPI mock 적용
├── mocks/
│   ├── electronAPI.js                # Desktop 전용 (신규)
│   ├── firebase.js                   # Extension에서 복사
│   └── i18n.js                       # Extension에서 복사
├── hooks/
│   ├── useAutomation.test.js
│   ├── useScenes.test.js
│   ├── useFileSystem.test.js
│   ├── useExport.test.js
│   └── useExportSettings.test.js
├── utils/
│   ├── whiskDOMClient.test.js
│   ├── whiskAPIClient.test.js
│   ├── parsers.test.js
│   ├── formatters.test.js
│   ├── urls.test.js
│   └── guards.test.js
├── exporters/
│   └── capcut.test.js
├── config/
│   └── defaults.test.js
└── integration/
    └── workflow.test.js
```

### Extension (추가분만)

```
tests/
├── hooks/
│   └── useAutomation.test.js         # 기존 파일에 테스트 추가
└── utils/
    └── whiskDOMClient.test.js        # 신규 파일
```

## 5. Mock 전략

### electronAPI Mock 핵심 구조

```javascript
const mockElectronAPI = {
  // File system
  selectFolder: vi.fn(),
  readFile: vi.fn(),
  writeFile: vi.fn(),
  listFiles: vi.fn(),
  deleteFile: vi.fn(),
  fileExists: vi.fn(),

  // DOM automation
  domScanImages: vi.fn(),
  domBlobToBase64: vi.fn(),
  domSetPrompt: vi.fn(),
  domClickGenerate: vi.fn(),
  domCheckGenButton: vi.fn(),
  domSetAspectRatio: vi.fn(),
  domNavigate: vi.fn(),
  domGetUrl: vi.fn(),

  // App
  setLayout: vi.fn(),
  openCapCut: vi.fn(),
  getAppVersion: vi.fn(),
}

Object.defineProperty(window, 'electronAPI', {
  value: mockElectronAPI,
  writable: true
})
```

## 6. 테스트 패턴

Extension의 검증된 패턴을 따른다:
- **describe/it**: 한국어 설명
- **beforeEach**: `vi.clearAllMocks()`
- **AAA 패턴**: Arrange → Act → Assert
- **Mock chain**: `mockFn.mockResolvedValueOnce()` 순차 결과
- **renderHook + act()**: React 훅 테스트
- **vi.useFakeTimers()**: 시간 의존 테스트
