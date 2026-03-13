/**
 * FrameToVideoPanel — Frame to Video 매핑 테이블
 *
 * 이미지 씬(mediaId 있는)을 Start/End Image로 선택하여
 * 비디오 생성 요청을 구성하는 UI.
 *
 * Props:
 *   scenes             — 전체 씬 배열 (이미지)
 *   videoScenes        — 비디오 씬 배열 (비디오 탭 프롬프트)
 *   framePairs         — [{ id, startSceneId, endSceneId, prompt, videoPrompt, customPrompt, status }]
 *   onUpdate           — framePairs 업데이트 콜백
 *   onShowSceneDetail  — 씬 상세 모달 열기 콜백
 *   disabled           — 생성 중 비활성화
 *   t                  — i18n 함수
 */

import { useMemo, useEffect, useRef } from 'react'

const STATUS_ICONS = {
  waiting: '⏳',
  generating: '⚙️',
  complete: '✅',
  error: '❌',
}

let nextPairId = 1

export default function FrameToVideoPanel({ scenes, videoScenes = [], framePairs, onUpdate, promptSource = 'image', onPromptSourceChange, onShowSceneDetail, disabled, t }) {

  // mediaId 있는 씬만 드롭다운에 표시
  const availableScenes = useMemo(
    () => scenes.filter(s => s.mediaId),
    [scenes]
  )

  // 새로운 이미지 씬이 생기면 자동으로 프레임 페어 추가 (unselected)
  const prevAvailableCountRef = useRef(availableScenes.length)
  useEffect(() => {
    const usedStart = new Set(framePairs.map(p => p.startSceneId))
    const unusedScenes = availableScenes.filter(s => !usedStart.has(s.id))

    if (unusedScenes.length === 0) {
      prevAvailableCountRef.current = availableScenes.length
      return
    }

    // 마운트 시 또는 새 이미지 씬 추가됐을 때만 실행
    const newPairs = unusedScenes.map((scene) => {
      const globalIdx = availableScenes.indexOf(scene)
      const nextScene = globalIdx >= 0 ? availableScenes[globalIdx + 1] : null
      return {
        id: `fp_${nextPairId++}`,
        startSceneId: scene.id,
        endSceneId: nextScene?.id || '',
        prompt: scene.prompt || '',
        videoPrompt: '',
        customPrompt: '',
        status: 'waiting',
        selected: false,
      }
    })

    onUpdate([...framePairs, ...newPairs])
    prevAvailableCountRef.current = availableScenes.length
  }, [availableScenes.length]) // 이미지 씬 수가 바뀔 때만

  const toggleSelect = (id) => {
    onUpdate(framePairs.map(p =>
      p.id === id ? { ...p, selected: p.selected === false ? true : false } : p
    ))
  }

  const toggleSelectAll = () => {
    const allSelected = framePairs.every(p => p.selected !== false)
    onUpdate(framePairs.map(p => ({ ...p, selected: !allSelected })))
  }

  const updatePair = (index, field, value) => {
    const updated = [...framePairs]
    updated[index] = { ...updated[index], [field]: value }
    onUpdate(updated)
  }

  const addRow = () => {
    // 기본값: 순서대로 자동 채움
    const usedStart = new Set(framePairs.map(p => p.startSceneId))
    const nextStart = availableScenes.find(s => !usedStart.has(s.id))
    const nextStartId = nextStart?.id || ''

    const startIdx = availableScenes.findIndex(s => s.id === nextStartId)
    const nextEnd = startIdx >= 0 ? availableScenes[startIdx + 1] : null

    onUpdate([
      ...framePairs,
      {
        id: `fp_${nextPairId++}`,
        startSceneId: nextStartId,
        endSceneId: nextEnd?.id || '',
        prompt: nextStart?.prompt || '',
        videoPrompt: '',
        customPrompt: '',
        status: 'waiting',
      },
    ])
  }

  // Auto Batch — 아직 배치 안 된 씬 전부를 프레임 페어로 자동 생성
  const autoBatch = () => {
    const usedStart = new Set(framePairs.map(p => p.startSceneId))
    const unusedScenes = availableScenes.filter(s => !usedStart.has(s.id))

    if (unusedScenes.length === 0) return

    const newPairs = unusedScenes.map((scene, i) => {
      const globalIdx = availableScenes.indexOf(scene)
      const nextScene = globalIdx >= 0 ? availableScenes[globalIdx + 1] : null
      return {
        id: `fp_${nextPairId++}`,
        startSceneId: scene.id,
        endSceneId: nextScene?.id || '',
        prompt: scene.prompt || '',
        videoPrompt: '',
        customPrompt: '',
        status: 'waiting',
        selected: false,
      }
    })

    onUpdate([...framePairs, ...newPairs])
  }

  const removeRow = (index) => {
    onUpdate(framePairs.filter((_, i) => i !== index))
  }

  const getSceneThumb = (sceneId) => {
    const scene = scenes.find(s => s.id === sceneId)
    return scene?.image || null
  }

  const getSceneLabel = (scene) => {
    const idx = scenes.indexOf(scene) + 1
    return `#${idx} ${scene.prompt?.substring(0, 25) || scene.id}`
  }

  if (availableScenes.length === 0) {
    return (
      <div className="video-panel-empty">
        <p>🎞️ {t('frameToVideo.noScenesWithMedia')}</p>
      </div>
    )
  }

  return (
    <div className="video-panel">
      <div className="video-panel-header">
        <p className="video-panel-description">{t('frameToVideo.description')}</p>
      </div>

      <div className="video-mapping-table">
        {/* 테이블 헤더 */}
        <div className="mapping-row mapping-header">
          <th className="col-check"><input
            type="checkbox"
            checked={framePairs.length > 0 && framePairs.every(p => p.selected !== false)}
            onChange={toggleSelectAll}
            disabled={disabled}
          /></th>
          <span className="mapping-col col-num">#</span>
          <span className="mapping-col col-image">{t('frameToVideo.startImage')}</span>
          <span className="mapping-col col-image">{t('frameToVideo.endImage')}</span>
          <span className="mapping-col col-prompt">
            <select
              value={promptSource}
              onChange={(e) => onPromptSourceChange(e.target.value)}
              className="prompt-source-toggle"
            >
              <option value="image">{t('frameToVideo.imagePrompt')}</option>
              <option value="video">{t('frameToVideo.videoPromptLabel')}</option>
              <option value="none">{t('frameToVideo.noPrompt')}</option>
            </select>
          </span>
          <span className="mapping-col col-status">{t('frameToVideo.status')}</span>
          <span className="mapping-col col-action"></span>
        </div>

        {/* 매핑 행들 */}
        {framePairs.map((pair, index) => (
          <div key={pair.id} className="mapping-row">
            <td className="col-check"><input
              type="checkbox"
              checked={pair.selected !== false}
              onChange={() => toggleSelect(pair.id)}
              disabled={disabled}
            /></td>
            <span className="mapping-col col-num">{index + 1}</span>

            {/* Start Image 드롭다운 */}
            <div className="mapping-col col-image">
              <div className="scene-select-wrapper">
                {pair.startSceneId && getSceneThumb(pair.startSceneId) && (
                  <img
                    src={getSceneThumb(pair.startSceneId)}
                    alt=""
                    className="scene-thumb scene-thumb-clickable"
                    onClick={() => {
                      const scene = scenes.find(s => s.id === pair.startSceneId)
                      if (scene && onShowSceneDetail) onShowSceneDetail(scene)
                    }}
                    title={t('frameToVideo.clickToDetail')}
                  />
                )}
                <select
                  value={pair.startSceneId}
                  onChange={(e) => updatePair(index, 'startSceneId', e.target.value)}
                  disabled={disabled || pair.status === 'generating'}
                >
                  <option value="">—</option>
                  {availableScenes.map(scene => (
                    <option key={scene.id} value={scene.id}>
                      {getSceneLabel(scene)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* End Image 드롭다운 */}
            <div className="mapping-col col-image">
              <div className="scene-select-wrapper">
                {pair.endSceneId && getSceneThumb(pair.endSceneId) && (
                  <img
                    src={getSceneThumb(pair.endSceneId)}
                    alt=""
                    className="scene-thumb scene-thumb-clickable"
                    onClick={() => {
                      const scene = scenes.find(s => s.id === pair.endSceneId)
                      if (scene && onShowSceneDetail) onShowSceneDetail(scene)
                    }}
                    title={t('frameToVideo.clickToDetail')}
                  />
                )}
                <select
                  value={pair.endSceneId}
                  onChange={(e) => updatePair(index, 'endSceneId', e.target.value)}
                  disabled={disabled || pair.status === 'generating'}
                >
                  <option value="">{t('frameToVideo.noEndImage')}</option>
                  {availableScenes.map(scene => (
                    <option key={scene.id} value={scene.id}>
                      {getSceneLabel(scene)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* 프롬프트 — 이미지/비디오/직접입력 모드 */}
            <div className="mapping-col col-prompt">
              {promptSource === 'image' && (
                <input
                  type="text"
                  value={pair.prompt || ''}
                  onChange={(e) => updatePair(index, 'prompt', e.target.value)}
                  disabled={disabled || pair.status === 'generating'}
                  placeholder={t('frameToVideo.promptPlaceholder')}
                />
              )}
              {promptSource === 'video' && (
                <input
                  type="text"
                  value={pair.videoPrompt || videoScenes[index]?.prompt || ''}
                  onChange={(e) => updatePair(index, 'videoPrompt', e.target.value)}
                  disabled={disabled || pair.status === 'generating'}
                  placeholder={t('frameToVideo.videoPromptPlaceholder')}
                />
              )}
              {promptSource === 'none' && (
                <input
                  type="text"
                  value={pair.customPrompt || ''}
                  onChange={(e) => updatePair(index, 'customPrompt', e.target.value)}
                  disabled={disabled || pair.status === 'generating'}
                  placeholder={t('frameToVideo.customPromptPlaceholder')}
                />
              )}
            </div>

            {/* 상태 */}
            <span className="mapping-col col-status">
              {STATUS_ICONS[pair.status] || '⏳'} {t(`frameToVideo.${pair.status}`)}
            </span>

            {/* 삭제 */}
            <div className="mapping-col col-action">
              <button
                className="btn-remove"
                onClick={() => removeRow(index)}
                disabled={disabled || pair.status === 'generating'}
                title={t('frameToVideo.removeRow')}
              >
                ✕
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* 행 추가 + 자동 배치 버튼 */}
      <div className="video-panel-actions">
        <button
          className="btn-add-row"
          onClick={addRow}
          disabled={disabled}
        >
          {t('frameToVideo.addRow')}
        </button>
        <button
          className="btn-add-row btn-auto-batch"
          onClick={autoBatch}
          disabled={disabled || availableScenes.filter(s => !new Set(framePairs.map(p => p.startSceneId)).has(s.id)).length === 0}
          title={t('frameToVideo.autoBatchHint')}
        >
          {t('frameToVideo.autoBatch')}
        </button>
      </div>
    </div>
  )
}
