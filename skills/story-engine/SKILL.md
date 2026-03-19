---
name: story-engine
description: 유튜브 스토리 채널용 대본을 12단계 워크플로우로 작성하는 스킬. 야담, 민담, 설화, 옛날이야기, 조선시대 이야기 대본을 만들거나, 시나리오를 쓰거나, 스토리보드를 작성하거나, 유튜브 업로드 정보를 준비할 때 사용한다. 기존 대본을 리라이팅/리디자인할 때도 이 스킬을 사용한다. "야담 대본 써줘", "새 에피소드 만들어줘", "스토리보드 작성해줘", "ep11 시작하자", "대본 만들어줘", "이 영상처럼 만들어줘", "레퍼런스 영상", "대본 다시 써줘", "리라이팅", "리디자인", "수정해줘" 등 무한야담 프로젝트와 관련된 모든 요청에서 반드시 이 스킬을 사용한다.
---

# Story Engine v0.9

유튜브 채널 "무한야담"의 대본을 **12단계 워크플로우**로 작성한다.
대본 작성 + 프로덕션(TTS/SFX/이미지/비디오) 파이프라인을 통합한 풀스택 버전이다.

## 🔴 최상위 원칙: 궁금증 + 기대감 = 몰입감

> **궁금증과 기대감이 곧 몰입감이다. 몰입감이 이 스킬의 최상위 성공 기준이다.**
>
> - 기~승: 의심 대상이 2명 이상 → 시청자가 확신 불가 → 궁금증 유지
> - 전 초반~중반: 거짓 해결 / 반전으로 예측 뒤집기 → 기대감 극대화
> - 전 후반(16~17챕터): 비로소 진실 폭로 → 몰입의 정점
> - **전 중반 이전에 범인/진실이 확정되면 구조적 실패로 간주한다**

---

## 작업 디렉토리

```
/Users/tuxxon/premiere-workspace/무한야담/story/ep{번호}/
```

에피소드 번호는 사용자에게 확인한다. 디렉토리가 없으면 생성한다.

## 스코프 (Scope)

```
--scope 기          → 기(1~5챕터)만 작업
--scope 승          → 승(6~12챕터)만 작업
--scope 기,승       → 기+승만 작업
--scope 전,결       → 전+결만 작업
(미지정)            → 전체(기승전결) 작업
```

---

## 12단계 워크플로우

| # | 단계 | 참조 문서 | 핵심 |
|---|------|----------|------|
| R1 | 성공요인 분석 / 기존 대본 진단 | `docs/R01-03-story-design.md` | 레퍼런스 분석 또는 기존 대본 점수 |
| R2 | 팩트체크 | ↑ | 시대고증, 역사적 사실 검증 |
| R3 | 시놉시스 작성/리디자인 | ↑ + `meta-prompts/yadam/시놉시스_작성_지침.md` | 20챕터 프레임워크 |
| R4 | 프리플라이트 | `docs/R04-07-writing.md` + `meta-prompts/yadam/프리플라이트.md` | 금지사항, 구조 점검, 복선 추적표 |
| R5 | 대본 작성 | ↑ + `meta-prompts/yadam/시나리오·서술기법·서스펜스` | **기→승→전→결→훅** 순서 |
| R6 | 검토 후 수정 | ↑ | subagent 반복 검토, 최대 5라운드 |
| R7 | 대본 확정 | — | 🛑 사용자 확인 필수 |
| R8 | 프로덕션 추출 + 검토 | `docs/R08-09-production.md` | 나레이션/대사/SFX 추출 → subagent 검토 |
| R9 | TTS/SFX 생성 | ↑ | ElevenLabs mp3+SRT, SFX 타임코드 |
| R10 | 스토리보드 CSV + 검토 | `docs/R10-storyboard.md` | references.csv + scenes.csv → subagent 검토 |
| R11 | 이미지/영상 생성 | `docs/R11-12-image-upload.md` | Flow2CapCut 배치 생성 + QA |
| R12 | 업로드 정보 | ↑ | 제목/설명/태그/썸네일 |

### 🔴 절대 규칙

- R4(프리플라이트) 없이 R5(대본)로 넘어갈 수 없다
- R7(대본 확정) 없이 R8(프로덕션)으로 넘어갈 수 없다
- R8.5(추출 검토) 없이 R9(TTS/SFX)로 넘어갈 수 없다
- R9(TTS/SFX) 없이 R10(CSV)으로 넘어갈 수 없다
- R5 대본 작성 순서: **기 → 승 → 전 → 결 → 훅** (전체를 알아야 훅을 쓸 수 있다)

---

## 🔴 워크플로우 게이트 시스템 (MCP 강제)

> **모든 단계 전환 시 게이트가 자동 검증된다. 예외 없음.**

**진행 상태 파일**: 에피소드 프로젝트 디렉토리의 `R_progress.json`

**MCP 도구 `mark_step_done`으로 검토 완료 기록 (필수):**
- subagent가 검토 완료(수정사항 없음) 판정 시 반드시 호출
- `result: "pass"`일 때만 다음 단계 게이트 열림
- **🔴 pass 시 다음 단계의 참조 문서 내용이 자동 반환된다** — 문서를 별도로 읽을 필요 없이 응답에 포함됨
- subagent 프롬프트에 반드시 포함: "검토 완료시 `mark_step_done` 호출해라. 수정사항 있으면 목록만 반환하고 호출하지 마."

**mark_step_done step ID 목록:**

| step ID | 단계 |
|---------|------|
| `R1_diagnosis` | R1 진단/분석 완료 |
| `R2_factcheck` | R2 팩트체크 완료 |
| `R3_synopsis` | R3 시놉시스 완료 |
| `R4_preflight` | R4 프리플라이트 완료 |
| `R5_writing` | R5 대본 작성 완료 |
| `R6_review` | R6 검토 완료 |
| `R7_finalize` | R7 대본 확정 |
| `R8_production` | R8 프로덕션 추출 완료 |
| `R8.5_review` | R8.5 추출 검토 완료 |
| `R9_tts_sfx` | R9 TTS/SFX 완료 |
| `R10-3_references_review` | R10 레퍼런스 CSV 검토 완료 |
| `R10-3_scenes_review` | R10 씬 CSV 검토 완료 |

**게이트 테이블:**

| 다음 단계 | 선행 조건 | 사용자 확인 |
|-----------|----------|------------|
| R5 (대본) | R4 완료 | 자동 |
| R7 (확정) | R6 완료 | 🛑 필수 |
| R8 (추출) | R7 완료 | 자동 |
| R9 (TTS/SFX) | R8.5 완료 | 자동 |
| R10 (CSV) | R9 완료 | 자동 |
| R11 (이미지) | R10 완료 | 자동 |
| R12 (업로드) | R11 완료 | 자동 |

**MCP 도구 게이트 (시스템 강제):**

| MCP 도구 | 선행 조건 |
|----------|----------|
| `app_start_ref_batch` | R10-3_references_review pass |
| `app_start_scene_batch` | R10-3_scenes_review pass |
| `load_csv` (references) | R10-3_references_review pass |
| `load_csv` (scenes) | R10-3_scenes_review pass |
| `audio-import` (나레이션) | R09_narration_qa pass |
| `audio-import` (인물별) | R09_voice_qa pass |
| `audio-import` (SFX) | R09_sfx_qa pass |

---

## 단계별 참조 문서 로딩

**🔴 해당 단계 진입 시 반드시 Read 도구로 참조 문서를 읽는다.**

| 진입 단계 | 읽어야 할 문서 |
|----------|--------------|
| R1~R3 | `docs/R01-03-story-design.md` |
| R3 시놉시스 | + `meta-prompts/yadam/야담_시놉시스_작성_지침.md` |
| R4~R7 | `docs/R04-07-writing.md` |
| R4 프리플라이트 | + `meta-prompts/yadam/야담_프리플라이트.md` |
| R5 대본 작성 | + `meta-prompts/yadam/야담_시나리오_작성_지침.md` + `야담_서술기법_가이드.md` + `야담_서스펜스_기법.md` |
| R8~R9 | `docs/R08-09-production.md` |
| R10 | `docs/R10-storyboard.md` |
| R11~R12 | `docs/R11-12-image-upload.md` |

---

## 관련 도구

### Flow2CapCut MCP (이미지/비디오 생성)
- 프로젝트: `app_list_projects`, `app_create_project`
- CSV: `load_csv`, `list_scenes`, `update_prompt`, `save_csv`
- 레퍼런스: `list_references`, `update_reference_prompt`
- 이미지: `app_start_ref_batch`, `app_start_scene_batch`, `app_wait_batch`
- 스키마: `get_schema({ type: "scenes" | "references" | "prompt-image" })`
- 게이트: `mark_step_done`, `get_progress`

### TTS (대사 음성)
- ElevenLabs: `https://api.elevenlabs.io/v1/text-to-speech`
- Typecast: `https://api.typecast.ai/v1/text-to-speech`

### SFX (음향효과)
- ElevenLabs: `https://api.elevenlabs.io/v1/sound-generation`

### 대본 평가
- Codex MCP — 반드시 `cwd` 파라미터로 디렉토리 경로를 전달
- Gemini-cli MCP — `mcp__gemini-cli__ask-gemini`

### 유튜브 업로드
```bash
cd /Users/tuxxon/workspace/srt2short-cli && node bin/srt2short.js youtube upload \
  -f "<영상파일>" -c "11_업로드정보.json"
```

---

## 전체 진행 원칙

1. 단계 시작 전 현재 단계를 명시한다 (예: `## ▶ R5: 대본 작성`)
2. 각 단계 완료 후 "다음 단계(RX)로 진행할까요?" 라고 물어본다
3. 사용자가 수정 요청을 하면 해당 단계를 재실행한다
4. 웹 검색은 R2·R3에서 자동 사용한다 (별도 허락 불필요)
5. **R5(대본 작성) 전에 반드시 meta-prompts/ 문서를 읽는다**
6. 역사·야담·실화 주제의 경우, 사실 왜곡에 특히 주의한다
7. 🔴 궁금증 유지가 최우선 — 범인/진실이 전 중반(15챕터) 이전에 드러나면 구조적 실패
8. **CSV/레퍼런스 로드 후 앱의 씬/레퍼런스 갯수가 CSV와 일치하는지 확인한다**

---

## 🚩 Red Flags — 이 생각이 들면 멈춰라

스킬을 건너뛰거나 단계를 생략하려는 합리화를 감지하는 테이블.

| 내 생각 | 현실 |
|---------|------|
| "검토 안 해도 될 것 같은데" | 검토는 품질 보장 단계. 스킬에 있으면 반드시 한다 |
| "빨리 이미지 생성부터 하자" | 검토 → 이미지 순서. 결과물 편향에 빠지지 마라 |
| "내가 만든 CSV니까 맞겠지" | 자기 결과물 과신. subagent 검토가 있는 이유다 |
| "스킬 안 읽어도 기억나" | 스킬은 업데이트된다. 매번 읽어라 |
| "이건 간단해서 스킬 필요 없어" | 간단한 게 복잡해진다. 스킬 체크부터 |
| "전체 삭제하고 다시 만들자" | 영향 범위 먼저 확인. 수정 필요한 것만 개별 처리 |
| "일단 진행하고 나중에 확인하자" | 확인 먼저, 진행 나중. 순서를 바꾸면 낭비 |
| "배치로 한꺼번에 돌리면 빠르겠다" | 스킬에 배치/개별 규칙이 있다. 읽고 따라라 |
| "사용자가 빨리 결과 보고 싶겠지" | 사용자는 올바른 결과를 원한다. 속도보다 정확성 |
