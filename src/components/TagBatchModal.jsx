/**
 * TagBatchModal - 태그 적용 모달 (캐릭터/배경/스타일 공통)
 *
 * mode='single': 개별 씬 태그 변경 (캐릭터/배경용)
 * mode='batch':  범위 지정 일괄 변경 (스타일용)
 */

import { useState, useMemo } from 'react'
import { resolveImageSrc } from '../utils/formatters'
import Modal from './Modal'

const TAG_CONFIG = {
  character: { icon: '👤', field: 'characters' },
  scene:     { icon: '🏞️', field: 'scene_tag' },
  style:     { icon: '🎨', field: 'style_tag' },
}

export default function TagBatchModal({
  tagType,
  mode = 'batch',    // 'single' | 'batch'
  sceneIndex,        // single 모드: 대상 씬 인덱스 (0-based)
  scenes,
  references,
  onApply,
  onClose,
  t
}) {
  const config = TAG_CONFIG[tagType]
  const typeLabel = t(`sceneList.${tagType}`)

  const refs = useMemo(
    () => references.filter(r => r.type === tagType),
    [references, tagType]
  )

  const [selectedNames, setSelectedNames] = useState(new Set())
  const [rangeFrom, setRangeFrom] = useState(1)
  const [rangeTo, setRangeTo] = useState(scenes.length)

  const toggleName = (name) => {
    setSelectedNames(prev => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }

  const handleApply = () => {
    if (selectedNames.size === 0) return
    const combined = [...selectedNames].join(',')
    if (mode === 'single' && sceneIndex != null) {
      onApply(config.field, combined, sceneIndex, sceneIndex)
    } else {
      onApply(config.field, combined, rangeFrom - 1, rangeTo - 1)
    }
  }

  const isSingle = mode === 'single' && sceneIndex != null
  const affectedCount = isSingle
    ? 1
    : Math.max(0, Math.min(rangeTo, scenes.length) - Math.max(rangeFrom, 1) + 1)

  const titleText = isSingle
    ? `${config.icon} ${typeLabel} — #${sceneIndex + 1}`
    : `${config.icon} ${typeLabel} ${t('sceneList.batchApply')}`

  const footer = (
    <>
      <button className="btn-secondary" onClick={onClose}>{t('common.cancel')}</button>
      <button
        className="btn-primary"
        onClick={handleApply}
        disabled={selectedNames.size === 0 || affectedCount === 0}
      >
        {t('sceneList.applyTag')} ({affectedCount}{t('sceneList.sceneUnit')})
      </button>
    </>
  )

  return (
    <Modal
      onClose={onClose}
      title={titleText}
      className="tag-batch-modal"
      footer={footer}
    >
      {refs.length === 0 ? (
        <div className="tag-batch-empty">
          <p>{t('sceneList.noRefForType', { type: typeLabel })}</p>
        </div>
      ) : (
        <>
          {/* 레퍼런스 목록 (다중 선택) */}
          <div className="tag-batch-list">
            {refs.map(ref => {
              const thumb = resolveImageSrc(ref)
              const isSelected = selectedNames.has(ref.name)
              return (
                <div
                  key={ref.name}
                  className={`tag-batch-item ${isSelected ? 'selected' : ''}`}
                  onClick={() => toggleName(ref.name)}
                >
                  <span className={`tag-batch-check ${isSelected ? 'checked' : ''}`}>
                    {isSelected ? '☑' : '☐'}
                  </span>
                  {thumb ? (
                    <img src={thumb} alt={ref.name} className="tag-batch-thumb" />
                  ) : (
                    <div className="tag-batch-thumb placeholder">{config.icon}</div>
                  )}
                  <div className="tag-batch-info">
                    <span className="tag-batch-name">{ref.name}</span>
                    {ref.prompt && (
                      <span className="tag-batch-prompt">{ref.prompt.substring(0, 60)}...</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* 선택된 태그 미리보기 */}
          {selectedNames.size > 0 && (
            <div className="tag-batch-preview">
              {config.field}: <code>{[...selectedNames].join(',')}</code>
            </div>
          )}

          {/* 범위 지정 (batch 모드만) */}
          {!isSingle && (
            <div className="tag-batch-range">
              <label>{t('sceneList.range')}</label>
              <div className="range-inputs">
                <input
                  type="number"
                  min={1}
                  max={scenes.length}
                  value={rangeFrom}
                  onChange={(e) => setRangeFrom(Math.max(1, parseInt(e.target.value) || 1))}
                />
                <span>~</span>
                <input
                  type="number"
                  min={1}
                  max={scenes.length}
                  value={rangeTo}
                  onChange={(e) => setRangeTo(Math.min(scenes.length, parseInt(e.target.value) || scenes.length))}
                />
                <button
                  className="btn-secondary btn-sm"
                  onClick={() => { setRangeFrom(1); setRangeTo(scenes.length) }}
                >
                  {t('sceneList.allScenes')}
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </Modal>
  )
}
