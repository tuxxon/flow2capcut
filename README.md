# Whisk2CapCut Desktop

Google Whisk로 AI 이미지를 생성하고, CapCut 영상 편집 프로젝트로 자동 변환하는 데스크톱 앱.

[Chrome 확장 프로그램 버전](https://github.com/touchizen/whisk2capcut)의 Electron 데스크톱 포팅입니다.

## 주요 기능

- **일괄 이미지 생성** - 여러 프롬프트를 한번에 입력하여 대량 이미지 생성
- **레퍼런스 시스템** - 캐릭터/배경/스타일 레퍼런스 이미지로 일관된 결과물
- **CapCut 직접 내보내기** - CapCut 프로젝트 폴더에 직접 쓰기 (ZIP 불필요)
- **CapCut 자동 실행** - Export 후 CapCut 앱 자동 실행
- **Ken Burns 효과** - 자동 줌/패닝 애니메이션
- **자막 지원** - SRT 자막 포함 내보내기
- **다국어** - 한국어/영어

## Chrome 확장 대비 장점

| | Chrome 확장 | Desktop |
|---|---|---|
| CapCut 내보내기 | ZIP 다운로드 → 수동 압축해제 | 프로젝트 폴더에 직접 쓰기 |
| CapCut 실행 | 수동 | 자동 실행 |
| 파일 저장 | File System Access API (제한적) | Node.js fs (제한 없음) |
| Whisk 연동 | Content script 기반 | WebContentsView 내장 |
| 레이아웃 | 단일 탭 | 탭 / 좌우 / 상하 분할 뷰 |

## 기술 스택

- **Frontend**: React 18 + Vite 6
- **Desktop**: Electron 34
- **Backend**: Firebase (Auth, Firestore, Cloud Functions)
- **결제**: Lemon Squeezy
- **빌드/패키징**: Vite + electron-builder

## 프로젝트 구조

```
whisk2capcut-desktop/
├── electron/
│   ├── main.js            # Electron 메인 프로세스 (WebContentsView + IPC)
│   ├── preload.js         # Context bridge (window.electronAPI)
│   └── ipc/
│       ├── filesystem.js  # Node.js fs 파일 I/O
│       ├── capcut.js      # 경로 탐지, 프로젝트 쓰기, CapCut 실행
│       └── auth.js        # Google OAuth
├── src/                   # React 앱
│   ├── Shell.jsx          # 레이아웃 관리 (탭 / 분할 뷰)
│   ├── App.jsx            # 메인 앱
│   ├── components/        # UI 컴포넌트
│   ├── hooks/             # React 훅 (useWhiskAPI, useFileSystem, useExport 등)
│   ├── exporters/         # CapCut JSON 생성 + 디스크 쓰기
│   ├── firebase/          # Auth, Firestore, Functions
│   ├── contexts/          # AuthContext
│   ├── config/            # 기본값, 스타일 프리셋
│   ├── locales/           # ko, en
│   ├── utils/             # 유틸리티
│   └── stripe/            # 결제 (Lemon Squeezy, 레거시 Stripe 코드 포함)
├── assets/
│   ├── icon.icns          # macOS 앱 아이콘
│   ├── icon.png           # Windows 앱 아이콘
│   └── capcut_template.zip
├── vite.config.js
└── package.json
```

## 아키텍처

```
Electron BrowserWindow
├── [Tab Mode] — 탭 바 상단 고정, App/Whisk 전환
├── [Split Mode] — 좌우 또는 상하 분할, 드래그 리사이저
│
├── [App] — React (BrowserWindow webContents)
│   ├── Header (프로젝트 선택, Export, Settings)
│   ├── PromptInput / SceneList
│   └── StatusBar + ResultsTable
└── [Whisk] — WebContentsView (labs.google/fx/tools/whisk)
    └── Google 로그인 + Whisk UI
```

- **Whisk 토큰**: WebContentsView에서 `executeJavaScript`로 세션 토큰 추출
- **CORS 우회**: Whisk API 호출을 메인 프로세스에서 직접 수행
- **IPC 통신**: `whisk:*`, `fs:*`, `capcut:*`, `auth:*` 네임스페이스
- **레이아웃**: tab / split-left / split-right / split-top / split-bottom (설정에서 변경)

## 시작하기

### 요구사항

- Node.js 18+
- npm

### 설치

```bash
git clone https://github.com/tuxxon/whisk2capcut-desktop.git
cd whisk2capcut-desktop
npm install
```

### 개발

```bash
# 개발 모드 (test 환경 — _test GCF 사용)
npm run dev

# 개발 모드 (prod 환경 — _prod GCF 사용)
npm run dev:prod
```

### 빌드

```bash
# macOS 배포 (DMG + ZIP)
npm run dist:mac

# Windows 배포 (NSIS + ZIP + APPX)
npm run dist:win

# Windows 개별 타겟 빌드
npm run dist:win:nsis    # 웹사이트 다운로드용 (.exe)
npm run dist:win:appx    # MS Store용 (.appx)
npm run dist:win:all     # 전체 Windows 타겟

# 테스트 배포 (test 환경)
npm run dist:test:mac
npm run dist:test:win

# 패키징 테스트 (설치 파일 없이)
npm run pack
```

빌드 결과물은 `release/` 디렉토리에 생성됩니다.

> **Windows APPX 빌드 참고**: Windows SDK 설치 및 개발자 모드 활성화 필요

### 환경 분리 (test / prod)

Cloud Functions는 `_test` / `_prod` 접미사로 분리 배포되어 있습니다.
클라이언트에서는 `VITE_FUNCTION_ENV` 환경변수로 어떤 함수를 호출할지 결정합니다.

| 파일 | 환경 | 설명 |
|------|------|------|
| `.env` | `VITE_FUNCTION_ENV=test` | 개발 시 사용 (`npm run dev`) |
| `.env.production` | `VITE_FUNCTION_ENV=prod` | 배포 빌드 시 사용 (`npm run dist:*`) |

| 스크립트 | 환경 | GCF 접미사 |
|----------|------|-----------|
| `npm run dev` | test | `_test` (initializeUser_test, ...) |
| `npm run dev:prod` | prod | `_prod` (initializeUser_prod, ...) |
| `npm run dist:mac` / `dist:win` | prod | `_prod` |
| `npm run dist:test:mac` / `dist:test:win` | test | `_test` |

## 사용 방법

1. 앱 실행 후 **Whisk 탭**에서 Google 로그인
2. **App 탭**으로 전환
3. 프롬프트 입력 → 이미지 생성
4. **Export** → CapCut 프로젝트 폴더에 자동 저장 → CapCut 실행

## 라이선스

UNLICENSED - Private

## 다운로드

- **Windows**: [Releases](https://github.com/touchizen/whisk2capcut-desktop/releases)

## 링크

- **회사**: [Touchizen](https://touchizen.com)
- **YouTube**: [@touchizen](https://youtube.com/@touchizen)
- **Discord**: [touchizen](https://discord.gg/touchizen)
