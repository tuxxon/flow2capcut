/**
 * ReferenceCard - 레퍼런스 카드 컴포넌트
 */

import { useState, useRef } from 'react'
import { REFERENCE_TYPES } from '../config/defaults'
import { getRatioClass } from '../utils/formatters'

export default function ReferenceCard({ 
  reference, 
  index, 
  onUpdate, 
  onRemove, 
  onUpload, 
  onGenerate, 
  aspectRatio, 
  t, 
  isGenerating, 
  onShowDetail 
}) {
  const fileInputRef = useRef(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isDragOver, setIsDragOver] = useState(false)
  
  const ratioClass = getRatioClass(aspectRatio)
  
  // 파일 처리 공통 함수
  const processFile = async (file) => {
    if (!file || !file.type.startsWith('image/')) return
    
    setIsUploading(true)
    
    const reader = new FileReader()
    reader.onloadend = async () => {
      const base64 = reader.result
      
      onUpdate(index, { 
        ...reference, 
        data: base64,
        mimeType: file.type
      })
      
      // API 업로드
      if (onUpload) {
        const cleanBase64 = base64.split(',')[1]
        const result = await onUpload(cleanBase64, reference.category)
        if (result.success) {
          onUpdate(index, {
            ...reference,
            data: base64,
            mediaId: result.mediaId,
            caption: result.caption
          })
        }
      }
      
      setIsUploading(false)
    }
    reader.readAsDataURL(file)
  }
  
  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0]
    if (file) await processFile(file)
    e.target.value = ''
  }
  
  // Drag & Drop 핸들러
  const handleDragOver = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(true)
  }
  
  const handleDragLeave = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
  }
  
  const handleDrop = async (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
    
    const file = e.dataTransfer.files?.[0]
    if (file) await processFile(file)
  }
  
  const typeInfo = REFERENCE_TYPES.find(t => t.value === reference.type) || REFERENCE_TYPES[0]
  const hasPrompt = reference.prompt && reference.prompt.trim().length > 0
  const isBusy = isUploading || isGenerating
  
  return (
    <div className={`reference-card ${reference.data ? 'has-image' : ''} ${isBusy ? 'uploading' : ''} ${isDragOver ? 'drag-over' : ''} ${ratioClass}`}>
      <input 
        type="file"
        ref={fileInputRef}
        accept="image/*"
        onChange={handleFileSelect}
        style={{ display: 'none' }}
      />
      
      <div className="ref-header">
        <select 
          value={reference.type}
          onChange={(e) => {
            const typeInfo = REFERENCE_TYPES.find(t => t.value === e.target.value)
            onUpdate(index, { 
              ...reference, 
              type: e.target.value,
              category: typeInfo?.category || 'MEDIA_CATEGORY_SUBJECT'
            })
          }}
        >
          {REFERENCE_TYPES.map(t => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
        
        <button className="btn-remove" onClick={() => onRemove(index)} title={t('common.delete')}>
          ✕
        </button>
      </div>
      
      <div 
        className="ref-image-area"
        onClick={() => {
          if (isBusy) return
          if (reference.data) {
            onShowDetail(index) // 이미지 있으면 상세카드
          } else {
            fileInputRef.current?.click() // 없으면 파일 선택
          }
        }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {isBusy ? (
          <div className="ref-uploading">
            <span className="spinner">⏳</span>
            <span>{isGenerating ? t('reference.generating') : t('reference.uploading')}</span>
          </div>
        ) : reference.data ? (
          <img src={reference.data} alt={reference.name || 'Reference'} />
        ) : (
          <div className="ref-placeholder">
            <span className="icon">{typeInfo.label.split(' ')[0]}</span>
            <span>{t('reference.upload')}</span>
          </div>
        )}
        
        {reference.mediaId && (
          <span className="uploaded-badge" title={t('reference.uploadedToFlow')}>✅</span>
        )}
      </div>
      
      {/* 이름 클릭 시 상세 모달 */}
      <button 
        className="ref-name-btn"
        onClick={() => onShowDetail(index)}
        title={reference.prompt ? `${t('reference.prompt')}: ${reference.prompt}` : t('reference.clickToEdit')}
      >
        {reference.name || t('reference.namePlaceholder')}
        {reference.prompt && <span className="has-prompt-indicator">📝</span>}
      </button>
      
      {/* 프롬프트가 있으면 생성 버튼 표시 */}
      {hasPrompt && !reference.data && (
        <button 
          className="btn-generate-ref"
          onClick={(e) => {
            e.stopPropagation()
            onGenerate && onGenerate(index)
          }}
          disabled={isBusy}
          title={reference.prompt}
        >
          🎨 {t('reference.generate')}
        </button>
      )}
      
      {reference.caption && (
        <div className="ref-caption" title={reference.caption}>
          {reference.caption.substring(0, 50)}...
        </div>
      )}
    </div>
  )
}
