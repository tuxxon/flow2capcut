/**
 * ReferencePanel - 레퍼런스 이미지 관리 패널
 */

import { useState } from 'react'
import { REFERENCE_TYPES } from '../config/defaults'
import { useI18n } from '../hooks/useI18n'
import { getRatioClass } from '../utils/formatters'
import ReferenceCard from './ReferenceCard'
import ReferenceDetailModal from './ReferenceDetailModal'
import './ReferencePanel.css'

export default function ReferencePanel({
  references,
  onUpdate,
  onUpload,
  onGenerate,
  onGenerateAll,
  onClearAll,
  aspectRatio = '16:9',
  generatingRefs = [],
  projectName
}) {
  const { t } = useI18n()
  const [collapsed, setCollapsed] = useState(false)
  const [detailIndex, setDetailIndex] = useState(null)
  
  const handleAdd = () => {
    const maxId = references.length > 0 
      ? Math.max(...references.map(r => r.id || 0)) 
      : 0
    
    const typeInfo = REFERENCE_TYPES[0]
    
    onUpdate([...references, {
      id: maxId + 1,
      name: '',
      type: typeInfo.value,
      category: typeInfo.category,
      prompt: '',
      data: null,
      mediaId: null,
      caption: ''
    }])
  }
  
  const handleUpdateRef = (index, updatedRef) => {
    const newRefs = [...references]
    newRefs[index] = updatedRef
    onUpdate(newRefs)
  }
  
  const handleRemoveRef = (index) => {
    onUpdate(references.filter((_, i) => i !== index))
  }
  
  const ratioClass = getRatioClass(aspectRatio)
  
  // 생성 가능한 레퍼런스 (프롬프트 있고, 이미지 없음)
  const generatableRefs = references.filter(r => r.prompt && !r.data)
  const isGenerating = generatingRefs.length > 0

  const handleClearAll = () => {
    if (window.confirm(t('reference.clearConfirm'))) {
      onClearAll?.()
    }
  }
  
  return (
    <div className={`reference-panel ${collapsed ? 'collapsed' : ''}`}>
      <div className="ref-panel-header">
        <div className="ref-header-left">
          <button 
            className="btn-collapse"
            onClick={() => setCollapsed(!collapsed)}
            title={collapsed ? t('common.expand') : t('common.collapse')}
          >
            {collapsed ? '▶' : '▼'}
          </button>
          <span>🖼️ {t('reference.title')} ({references.length})</span>
          {collapsed && <span className="ref-hint-collapsed">{t('reference.hintCollapsed')}</span>}
        </div>
        
        {!collapsed && (
          <div className="ref-header-actions">
            {/* Clear All 버튼 */}
            {references.length > 0 && (
              <button
                className="btn-clear-refs"
                onClick={handleClearAll}
                disabled={isGenerating}
                title={t('reference.clearAll')}
              >
                🗑️
              </button>
            )}
            {/* 일괄 생성 버튼 */}
            {generatableRefs.length > 0 && (
              <button
                className="btn-generate-all"
                onClick={onGenerateAll}
                disabled={isGenerating}
              >
                {isGenerating
                  ? `⏳ ${generatingRefs.length}/${generatableRefs.length}`
                  : `🎨 ${t('reference.generateAll')} (${generatableRefs.length})`
                }
              </button>
            )}
          </div>
        )}
      </div>
      
      {!collapsed && (
        <div className={`ref-grid ${ratioClass}`}>
          {references.map((ref, index) => (
            <ReferenceCard 
              key={ref.id || index}
              reference={ref}
              index={index}
              onUpdate={handleUpdateRef}
              onRemove={handleRemoveRef}
              onUpload={onUpload}
              onGenerate={onGenerate}
              aspectRatio={aspectRatio}
              t={t}
              isGenerating={generatingRefs.includes(index)}
              onShowDetail={setDetailIndex}
            />
          ))}
          
          <div className={`reference-add-card ${ratioClass}`} onClick={handleAdd}>
            <span className="add-icon">+</span>
            <span>{t('reference.add')}</span>
          </div>
        </div>
      )}
      
      {/* 상세 모달 */}
      {detailIndex !== null && references[detailIndex] && (
        <ReferenceDetailModal
          reference={references[detailIndex]}
          index={detailIndex}
          onUpdate={handleUpdateRef}
          onUpload={onUpload}
          onGenerate={onGenerate}
          isGenerating={generatingRefs.includes(detailIndex)}
          onClose={() => setDetailIndex(null)}
          t={t}
          projectName={projectName}
        />
      )}
    </div>
  )
}
