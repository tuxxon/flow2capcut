/**
 * 태그 매칭 유틸리티
 * SceneList UI 표시 + 생성 전 검증에서 공통 사용
 */

/** 태그 문자열을 배열로 분리 (콤마, 세미콜론, 콜론) */
export function splitTags(tagString) {
  if (!tagString) return []
  return tagString.split(/[,;:]/).map(t => t.trim().toLowerCase()).filter(Boolean)
}

/** 단일 태그 필드의 매칭 체크 */
export function checkTagMatch(tagValue, references, type) {
  if (!tagValue || !tagValue.trim()) return null
  const tags = splitTags(tagValue)
  if (tags.length === 0) return null

  const matchedTags = []
  const unmatchedTags = []
  for (const tag of tags) {
    const isMatched = references.some(ref =>
      ref.type === type && ref.name.toLowerCase() === tag
    )
    if (isMatched) matchedTags.push(tag)
    else unmatchedTags.push(tag)
  }
  return { matchedTags, unmatchedTags, allMatched: unmatchedTags.length === 0 }
}

/** 전체 씬 목록의 태그 매칭 에러 수집 */
export function collectTagErrors(scenes, references) {
  const errors = []
  const checks = [
    { field: 'characters', type: 'character' },
    { field: 'scene_tag', type: 'scene' },
    { field: 'style_tag', type: 'style' },
  ]

  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i]
    const sceneErrors = []

    for (const { field, type } of checks) {
      const result = checkTagMatch(scene[field], references, type)
      if (result && !result.allMatched) {
        sceneErrors.push({ type, unmatchedTags: result.unmatchedTags })
      }
    }

    if (sceneErrors.length > 0) {
      errors.push({ sceneIndex: i, errors: sceneErrors })
    }
  }
  return errors
}
