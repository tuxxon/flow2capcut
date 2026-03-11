/**
 * 전체 워크플로우 통합 테스트
 *
 * 사용자 입력 → 씬 생성 → 레퍼런스 매칭 → 내보내기 전체 흐름
 */

import { describe, it, expect } from 'vitest'
import {
  parseTextToScenes,
  parseCSVToScenes,
  parseSRTToScenes,
  parseReferencesCSV,
  mergeReferences,
  detectFileType
} from '../../src/utils/parsers'
import { generateSRT } from '../../src/exporters/capcut'

describe('전체 워크플로우: 텍스트 → SRT 내보내기', () => {
  it('텍스트 입력 → 씬 생성 → SRT 내보내기', () => {
    // 1. 사용자가 텍스트 입력
    const userInput = `아름다운 해변의 일몰
도시의 야경
숲 속의 오두막`

    // 2. 텍스트를 씬으로 파싱
    const scenes = parseTextToScenes(userInput, 5)
    expect(scenes).toHaveLength(3)

    // 3. 자막 추가 (사용자가 편집)
    const scenesWithSubtitles = scenes.map((scene, i) => ({
      ...scene,
      subtitle_ko: `자막 ${i + 1}`,
      subtitle_en: `Subtitle ${i + 1}`,
      image_duration: scene.duration
    }))

    // 4. 프로젝트 생성
    const project = {
      name: 'my_project',
      scenes: scenesWithSubtitles,
      videos: []
    }

    // 5. SRT 생성
    const srtKo = generateSRT(project, 'ko')
    const srtEn = generateSRT(project, 'en')

    // 검증
    expect(srtKo).toContain('자막 1')
    expect(srtKo).toContain('자막 2')
    expect(srtKo).toContain('자막 3')
    expect(srtEn).toContain('Subtitle 1')

    // 시간 검증 (5초씩)
    expect(srtKo).toContain('00:00:00,000 --> 00:00:05,000')
    expect(srtKo).toContain('00:00:05,000 --> 00:00:10,000')
    expect(srtKo).toContain('00:00:10,000 --> 00:00:15,000')
  })
})

describe('전체 워크플로우: CSV → 레퍼런스 매칭 → SRT', () => {
  it('씬 CSV + 레퍼런스 CSV → 매칭 → SRT', () => {
    // 1. 씬 CSV 입력
    const sceneCsv = `prompt,subtitle,characters,scene_tag,style_tag,duration
아이유가 카페에서 커피를 마시는 장면,커피 한 잔의 여유,iu,cafe,cinematic,3
아이유가 공원을 산책하는 장면,산책의 즐거움,iu,park,cinematic,4
배경만 있는 장면,도시의 야경,,city,night,5`

    // 2. 레퍼런스 CSV 입력
    const refCsv = `name,type,prompt
iu,character,Korean female singer with long black hair
cafe,scene,Cozy coffee shop interior
park,scene,Beautiful green park
city,scene,City skyline at night
cinematic,style,Cinematic film look
night,style,Night photography style`

    // 3. 씬 파싱
    const scenes = parseCSVToScenes(sceneCsv)
    expect(scenes).toHaveLength(3)

    // 4. 레퍼런스 파싱
    const refs = parseReferencesCSV(refCsv)
    expect(refs).toHaveLength(6)

    // 5. 레퍼런스 매칭 시뮬레이션
    const matchRefs = (scene, references) => {
      const matched = []

      // characters 매칭
      if (scene.characters) {
        const charTags = scene.characters.split(/[,;:]/).map(t => t.trim().toLowerCase())
        for (const ref of references) {
          if (ref.type === 'character' && charTags.includes(ref.name.toLowerCase())) {
            matched.push(ref)
          }
        }
      }

      // scene_tag 매칭
      if (scene.scene_tag) {
        const sceneTags = scene.scene_tag.split(/[,;:]/).map(t => t.trim().toLowerCase())
        for (const ref of references) {
          if (ref.type === 'scene' && sceneTags.includes(ref.name.toLowerCase())) {
            matched.push(ref)
          }
        }
      }

      // style_tag 매칭
      if (scene.style_tag) {
        const styleTags = scene.style_tag.split(/[,;:]/).map(t => t.trim().toLowerCase())
        for (const ref of references) {
          if (ref.type === 'style' && styleTags.includes(ref.name.toLowerCase())) {
            matched.push(ref)
          }
        }
      }

      return matched
    }

    // 6. 각 씬의 매칭된 레퍼런스 확인
    const scene1Refs = matchRefs(scenes[0], refs)
    expect(scene1Refs).toHaveLength(3) // iu, cafe, cinematic

    const scene2Refs = matchRefs(scenes[1], refs)
    expect(scene2Refs).toHaveLength(3) // iu, park, cinematic

    const scene3Refs = matchRefs(scenes[2], refs)
    expect(scene3Refs).toHaveLength(2) // city, night (characters 없음)

    // 7. SRT 생성
    const project = {
      name: 'iu_project',
      scenes: scenes.map(s => ({
        ...s,
        subtitle_ko: s.subtitle,
        image_duration: s.duration
      })),
      videos: []
    }

    const srt = generateSRT(project, 'ko')
    expect(srt).toContain('커피 한 잔의 여유')
    expect(srt).toContain('산책의 즐거움')
    expect(srt).toContain('도시의 야경')
  })
})

describe('전체 워크플로우: SRT 임포트 → 편집 → 내보내기', () => {
  it('SRT 임포트 → 프롬프트 수정 → 새 SRT 내보내기', () => {
    // 1. 기존 SRT 파일 임포트
    const existingSrt = `1
00:00:00,000 --> 00:00:03,000
첫 번째 장면

2
00:00:03,000 --> 00:00:07,000
두 번째 장면

3
00:00:07,000 --> 00:00:10,000
세 번째 장면`

    // 2. SRT → 씬 파싱
    const scenes = parseSRTToScenes(existingSrt)
    expect(scenes).toHaveLength(3)

    // 3. 타임코드 확인
    expect(scenes[0].startTime).toBe(0)
    expect(scenes[0].endTime).toBe(3)
    expect(scenes[1].startTime).toBe(3)
    expect(scenes[1].endTime).toBe(7)
    expect(scenes[2].startTime).toBe(7)
    expect(scenes[2].endTime).toBe(10)

    // 4. 사용자가 프롬프트 편집 (자막은 유지)
    const editedScenes = scenes.map((s, i) => ({
      ...s,
      prompt: `새로운 AI 프롬프트 ${i + 1}`,
      subtitle_ko: s.subtitle,
      image_duration: s.duration
    }))

    // 5. 프로젝트 생성 및 SRT 내보내기
    const project = {
      name: 'edited_project',
      scenes: editedScenes,
      videos: []
    }

    const newSrt = generateSRT(project, 'ko')

    // 6. 검증 - 원본 타임코드와 자막 유지
    expect(newSrt).toContain('첫 번째 장면')
    expect(newSrt).toContain('두 번째 장면')
    expect(newSrt).toContain('세 번째 장면')
    expect(newSrt).toContain('00:00:00,000 --> 00:00:03,000')
    expect(newSrt).toContain('00:00:03,000 --> 00:00:07,000')
    expect(newSrt).toContain('00:00:07,000 --> 00:00:10,000')
  })
})

describe('파일 타입 자동 감지 워크플로우', () => {
  it('파일 내용으로 타입 자동 감지', () => {
    // 텍스트 파일
    const textContent = `첫 번째 프롬프트
두 번째 프롬프트`
    expect(detectFileType(textContent)).toBe('text')

    // SRT 파일
    const srtContent = `1
00:00:00,000 --> 00:00:03,000
자막`
    expect(detectFileType(srtContent)).toBe('srt')

    // 씬 CSV
    const sceneCsv = `prompt,subtitle,duration
프롬프트,자막,3`
    expect(detectFileType(sceneCsv)).toBe('csv')

    // 레퍼런스 CSV
    const refCsv = `name,type,prompt
alice,character,금발`
    expect(detectFileType(refCsv)).toBe('reference')
  })

  it('자동 감지 후 적절한 파서 호출', () => {
    const files = [
      { content: '프롬프트1\n프롬프트2', expectedType: 'text' },
      { content: '1\n00:00:00,000 --> 00:00:03,000\n자막', expectedType: 'srt' },
      { content: 'prompt,duration\n프롬프트,3', expectedType: 'csv' },
      { content: 'name,type\nalice,character', expectedType: 'reference' }
    ]

    for (const file of files) {
      const type = detectFileType(file.content)
      expect(type).toBe(file.expectedType)

      // 타입에 따라 적절한 파서 사용
      let result
      switch (type) {
        case 'text':
          result = parseTextToScenes(file.content)
          expect(Array.isArray(result)).toBe(true)
          break
        case 'srt':
          result = parseSRTToScenes(file.content)
          expect(Array.isArray(result)).toBe(true)
          break
        case 'csv':
          result = parseCSVToScenes(file.content)
          expect(Array.isArray(result)).toBe(true)
          break
        case 'reference':
          result = parseReferencesCSV(file.content)
          expect(Array.isArray(result)).toBe(true)
          break
      }
    }
  })
})

describe('레퍼런스 병합 워크플로우', () => {
  it('기존 레퍼런스에 새 레퍼런스 추가', () => {
    // 1. 기존 레퍼런스 (이미 업로드된 상태)
    const existing = [
      {
        name: 'alice',
        type: 'character',
        category: 'MEDIA_CATEGORY_SUBJECT',
        data: 'base64_image_data',
        mediaId: 'media_123',
        prompt: '기존 프롬프트'
      }
    ]

    // 2. 새 레퍼런스 CSV 임포트
    const newCsv = `name,type,prompt
alice,character,업데이트된 프롬프트
bob,character,새 캐릭터`

    const newRefs = parseReferencesCSV(newCsv)
    expect(newRefs).toHaveLength(2)

    // 3. 병합 (기존 업데이트)
    const merged = mergeReferences(existing, newRefs, true)

    // 4. 검증
    expect(merged).toHaveLength(2)

    // alice는 업데이트되었지만 mediaId는 유지
    const alice = merged.find(r => r.name === 'alice')
    expect(alice.prompt).toBe('업데이트된 프롬프트')
    expect(alice.mediaId).toBe('media_123')
    expect(alice.data).toBe('base64_image_data')

    // bob은 새로 추가됨
    const bob = merged.find(r => r.name === 'bob')
    expect(bob).toBeDefined()
    expect(bob.prompt).toBe('새 캐릭터')
  })

  it('중복 스킵 모드로 병합', () => {
    const existing = [
      { name: 'alice', type: 'character', prompt: '기존' }
    ]

    const newCsv = `name,type,prompt
alice,character,새 프롬프트
bob,character,밥`

    const newRefs = parseReferencesCSV(newCsv)
    const merged = mergeReferences(existing, newRefs, false) // 중복 스킵

    expect(merged).toHaveLength(2)

    // alice는 기존 값 유지
    const alice = merged.find(r => r.name === 'alice')
    expect(alice.prompt).toBe('기존')
  })
})

describe('에러 상황 처리', () => {
  it('빈 입력 처리', () => {
    expect(parseTextToScenes('')).toHaveLength(0)
    expect(parseCSVToScenes('')).toHaveLength(0)
    expect(parseSRTToScenes('')).toHaveLength(0)
    expect(parseReferencesCSV('')).toBeNull()
  })

  it('잘못된 형식 처리', () => {
    // 헤더만 있는 CSV
    expect(parseCSVToScenes('prompt,subtitle')).toHaveLength(0)

    // 타임코드 없는 SRT
    expect(parseSRTToScenes('1\n잘못된 형식\n자막')).toHaveLength(0)
  })

  it('누락된 필드 처리', () => {
    // 빈 필드가 있는 CSV
    const csv = `prompt,subtitle,duration
첫번째,,3
두번째,자막,`

    const scenes = parseCSVToScenes(csv)
    expect(scenes).toHaveLength(2)
    expect(scenes[0].subtitle).toBe('')
    expect(scenes[1].duration).toBe(3) // 기본값
  })
})
