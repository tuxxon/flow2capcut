/**
 * SceneList Component - 목록 탭 (시간 + 편집 + 히스토리)
 */

import { useState } from 'react'
import { useI18n } from '../hooks/useI18n'
import { formatTime, getRatioClass } from '../utils/formatters'
import { UI } from '../config/defaults'
import SceneDetailModal from './SceneDetailModal'
import './SceneList.css'

// 태그 매칭 여부 체크 (콤마, 세미콜론, 콜론 지원)
function checkTagMatch(tagValue, references, type) {
  if (!tagValue || !tagValue.trim()) return null // 태그 없음

  // 콤마, 세미콜론, 콜론으로 분리
  const tags = tagValue.split(/[,;:]/).map(t => t.trim().toLowerCase()).filter(Boolean)
  if (tags.length === 0) return null

  const matchedTags = []
  const unmatchedTags = []

  for (const tag of tags) {
    const isMatched = references.some(ref =>
      ref.type === type && ref.name.toLowerCase() === tag
    )
    if (isMatched) {
      matchedTags.push(tag)
    } else {
      unmatchedTags.push(tag)
    }
  }

  return { matchedTags, unmatchedTags, allMatched: unmatchedTags.length === 0 }
}

function SceneRow({ scene, index, onUpdate, onDelete, disabled, ratioClass, t, onShowDetail, references }) {
  const [isEditing, setIsEditing] = useState(false)
  
  const statusIcon = {
    pending: '⏳',
    generating: '⚙️',
    done: '✅',
    error: '❌'
  }[scene.status] || '⏳'
  
  // 태그 매칭 상태 체크
  const charMatch = checkTagMatch(scene.characters, references, 'character')
  const sceneMatch = checkTagMatch(scene.scene_tag, references, 'scene')
  const styleMatch = checkTagMatch(scene.style_tag, references, 'style')
  
  // 매칭 상태 아이콘 (커스텀 툴팁)
  const MatchIndicator = ({ match }) => {
    if (!match) return null
    if (match.allMatched) {
      return (
        <span className="tag-match-indicator matched">
          ✓
          <span className="tag-tooltip matched">
            {t('sceneList.tagMatched')}: {match.matchedTags.join(', ')}
          </span>
        </span>
      )
    }
    return (
      <span className="tag-match-indicator unmatched">
        ✗
        <span className="tag-tooltip unmatched">
          {t('sceneList.tagUnmatched')}: {match.unmatchedTags.join(', ')}
        </span>
      </span>
    )
  }
  
  return (
    <tr className={`scene-row status-${scene.status}`}>
      <td className="col-id">
        {index + 1}
      </td>
      
      <td className="col-time">
        <span className="time-display">
          {formatTime(scene.startTime)} ~ {formatTime(scene.endTime)}
        </span>
        <input 
          type="number"
          className="duration-input"
          value={scene.duration}
          onChange={(e) => {
            const duration = parseFloat(e.target.value) || 3
            onUpdate(scene.id, { 
              duration,
              endTime: scene.startTime + duration
            })
          }}
          min={UI.DURATION_MIN}
          max={UI.DURATION_MAX}
          step={UI.DURATION_STEP}
          disabled={disabled}
          title={t('sceneList.durationTitle')}
        />
      </td>
      
      <td className="col-prompt">
        <textarea
          value={scene.prompt}
          onChange={(e) => onUpdate(scene.id, { prompt: e.target.value })}
          disabled={disabled}
          rows={2}
        />
        {scene.subtitle && (
          <div className="subtitle-preview">
            <span className="subtitle-icon">💬</span>
            <span className="subtitle-text">{scene.subtitle}</span>
          </div>
        )}
      </td>
      
      <td className="col-tags">
        <div className="tag-input-wrapper">
          <input 
            type="text"
            placeholder={t('sceneList.character')}
            value={scene.characters || ''}
            onChange={(e) => onUpdate(scene.id, { characters: e.target.value })}
            disabled={disabled}
            title={t('sceneList.characterTitle')}
            className={charMatch ? (charMatch.allMatched ? 'matched' : 'unmatched') : ''}
          />
          <MatchIndicator match={charMatch} />
        </div>
        <div className="tag-input-wrapper">
          <input 
            type="text"
            placeholder={t('sceneList.background')}
            value={scene.scene_tag || ''}
            onChange={(e) => onUpdate(scene.id, { scene_tag: e.target.value })}
            disabled={disabled}
            title={t('sceneList.backgroundTitle')}
            className={sceneMatch ? (sceneMatch.allMatched ? 'matched' : 'unmatched') : ''}
          />
          <MatchIndicator match={sceneMatch} />
        </div>
        <div className="tag-input-wrapper">
          <input 
            type="text"
            placeholder={t('sceneList.style')}
            value={scene.style_tag || ''}
            onChange={(e) => onUpdate(scene.id, { style_tag: e.target.value })}
            disabled={disabled}
            title={t('sceneList.styleTitle')}
            className={styleMatch ? (styleMatch.allMatched ? 'matched' : 'unmatched') : ''}
          />
          <MatchIndicator match={styleMatch} />
        </div>
      </td>
      
      <td className="col-image">
        <div 
          className={`image-cell ${ratioClass} clickable`}
          onClick={() => onShowDetail(scene)}
          title={t('headerExtra.clickToDetail')}
        >
          {scene.image ? (
            <img
              src={scene.image}
              alt={`Scene ${index + 1}`}
            />
          ) : (
            <span className={`status-icon ${scene.status === 'generating' ? 'spinner' : ''}`}>{statusIcon}</span>
          )}
        </div>
      </td>
      
      <td className="col-actions">
        <button 
          className="btn-delete"
          onClick={() => onDelete(scene.id)}
          disabled={disabled || scene.status === 'generating'}
          title={t('common.delete')}
        >
          ✕
        </button>
      </td>
    </tr>
  )
}

export default function SceneList({
  scenes,
  onUpdate,
  onDelete,
  onAdd,
  onClearAll,
  defaultDuration,
  disabled,
  aspectRatio = '16:9',
  projectName,
  onGenerate,
  generatingSceneId,
  references = []
}) {
  const { t } = useI18n()
  const [detailModal, setDetailModal] = useState({ open: false, scene: null })
  
  // 상세 모달 열기
  const handleShowDetail = (scene) => {
    setDetailModal({ open: true, scene })
  }
  
  // 모달에서 업데이트
  const handleUpdateFromModal = (sceneId, data) => {
    onUpdate(sceneId, data)
    // 모달의 scene도 업데이트
    setDetailModal(prev => ({
      ...prev,
      scene: prev.scene ? { ...prev.scene, ...data } : null
    }))
  }
  
  if (scenes.length === 0) {
    return (
      <div className="scene-list-empty">
        <p>{t('sceneList.empty')}</p>
        <p>{t('sceneList.emptyHint')}</p>
      </div>
    )
  }
  
  const totalDuration = scenes.reduce((sum, s) => sum + s.duration, 0)
  
  const ratioClass = getRatioClass(aspectRatio)
  
  // 현재 선택된 씬의 최신 상태 가져오기
  const currentScene = detailModal.scene 
    ? scenes.find(s => s.id === detailModal.scene.id) || detailModal.scene
    : null
  
  const handleClearAll = () => {
    if (window.confirm(t('sceneList.clearConfirm'))) {
      onClearAll?.()
    }
  }

  return (
    <div className="scene-list-container">
      <div className="scene-list-header">
        <span>{t('sceneList.total', { count: scenes.length, duration: formatTime(totalDuration) })}</span>
        <div className="scene-list-actions">
          <button
            className="btn-clear-all"
            onClick={handleClearAll}
            disabled={disabled || scenes.length === 0}
            title={t('sceneList.clearAll')}
          >
            🗑️ {t('sceneList.clearAll')}
          </button>
          <button
            className="btn-add-scene"
            onClick={() => onAdd(null, defaultDuration)}
            disabled={disabled}
          >
            {t('sceneList.addScene')}
          </button>
        </div>
      </div>
      
      <div className="scene-table-wrapper">
        <table className="scene-table">
          <thead>
            <tr>
              <th className="col-id">#</th>
              <th className="col-time">{t('sceneList.time')}</th>
              <th className="col-prompt">{t('sceneList.promptCol')}</th>
              <th className="col-tags">{t('sceneList.tags')}</th>
              <th className="col-image">{t('sceneList.image')}</th>
              <th className="col-actions"></th>
            </tr>
          </thead>
          <tbody>
            {scenes.map((scene, index) => (
              <SceneRow
                key={scene.id}
                scene={scene}
                index={index}
                onUpdate={onUpdate}
                onDelete={onDelete}
                disabled={disabled}
                ratioClass={ratioClass}
                t={t}
                onShowDetail={handleShowDetail}
                references={references}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* 태그 매칭 범례 - 레퍼런스가 있을 때만 표시 */}
      {references.length > 0 && (
        <div className="tag-match-legend">
          <span className="legend-label">{t('sceneList.tagLegend')}</span>
          <span className="legend-item">
            <span className="tag-match-indicator matched">✓</span>
            {t('sceneList.tagMatched')}
          </span>
          <span className="legend-item">
            <span className="tag-match-indicator unmatched">✗</span>
            {t('sceneList.tagUnmatched')}
          </span>
        </div>
      )}
      
      {/* 씬 상세 모달 */}
      {detailModal.open && currentScene && (
        <SceneDetailModal
          scene={currentScene}
          onUpdate={handleUpdateFromModal}
          onClose={() => setDetailModal({ open: false, scene: null })}
          onGenerate={onGenerate}
          isGenerating={generatingSceneId === currentScene.id}
          t={t}
          projectName={projectName}
          aspectRatio={aspectRatio}
        />
      )}
    </div>
  )
}
