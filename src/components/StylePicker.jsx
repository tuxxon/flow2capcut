/**
 * StylePicker - 썸네일 그리드 기반 스타일 프리셋 선택기
 */

import { useState, useMemo, useEffect } from 'react'
import { STYLE_PRESETS } from '../config/defaults'
import { resolveImageSrc, hasImageData } from '../utils/formatters'
import './StylePicker.css'

// 경과 시간 포맷 (mm:ss)
function formatElapsed(ms) {
  const sec = Math.floor(ms / 1000)
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

const ALL_CATEGORY = '__all__'

export default function StylePicker({
  selectedId,
  onSelect,
  thumbnails = {},
  onDeleteThumbnail,
  uploadedStyleRefs = [],
  generating,
  stopping,
  progress = { current: 0, total: 0 },
  onGenerateThumbnails,
  onStopGenerating,
  t,
  isKo
}) {
  const [activeCategory, setActiveCategory] = useState(ALL_CATEGORY)
  const [elapsed, setElapsed] = useState(0)
  const [previewStyle, setPreviewStyle] = useState(null)  // 더블클릭 미리보기
  const [hoverPreview, setHoverPreview] = useState(null)  // 호버 풍선 { style, thumb, x, y }

  // 생성 중 경과 시간 타이머
  useEffect(() => {
    if (!generating || !progress.startedAt) {
      setElapsed(0)
      return
    }
    setElapsed(Date.now() - progress.startedAt)
    const timer = setInterval(() => {
      setElapsed(Date.now() - progress.startedAt)
    }, 1000)
    return () => clearInterval(timer)
  }, [generating, progress.startedAt])

  const categories = STYLE_PRESETS?.categories || []
  const allStyles = STYLE_PRESETS?.styles || []

  // 현재 카테고리에 해당하는 스타일 필터
  const filteredStyles = useMemo(() => {
    if (activeCategory === ALL_CATEGORY) return allStyles
    return allStyles.filter(s => s.category === activeCategory)
  }, [activeCategory, allStyles])

  // 썸네일 미생성 프리셋 수
  const missingCount = allStyles.filter(s => !thumbnails[s.id]).length

  return (
    <div className="style-picker">
      {/* 카테고리 탭 */}
      <div className="sp-categories">
        <button
          className={`sp-cat-tab ${activeCategory === ALL_CATEGORY ? 'active' : ''}`}
          onClick={() => setActiveCategory(ALL_CATEGORY)}
        >
          {t('reference.allCategories')}
        </button>
        {categories.map(cat => {
          const count = allStyles.filter(s => s.category === cat.id).length
          return (
            <button
              key={cat.id}
              className={`sp-cat-tab ${activeCategory === cat.id ? 'active' : ''}`}
              onClick={() => setActiveCategory(cat.id)}
              title={isKo ? cat.name_ko : cat.name_en}
            >
              {cat.icon} {isKo ? cat.name_ko : cat.name_en}
              <span className="sp-cat-count">{count}</span>
            </button>
          )
        })}
      </div>

      {/* 업로드된 스타일 레퍼런스 (있으면) */}
      {uploadedStyleRefs.length > 0 && activeCategory === ALL_CATEGORY && (
        <div className="sp-uploaded-section">
          <div className="sp-section-label">{t('reference.uploadedStyles')}</div>
          <div className="sp-grid">
            {uploadedStyleRefs.map(ref => (
              <div
                key={`ref:${ref.id}`}
                className={`sp-card ${selectedId === `ref:${ref.id}` ? 'selected' : ''}`}
                onClick={() => onSelect(selectedId === `ref:${ref.id}` ? null : `ref:${ref.id}`)}
              >
                <div className="sp-thumb">
                  {hasImageData(ref) ? (
                    <img src={resolveImageSrc(ref)} alt={ref.name} />
                  ) : (
                    <span className="sp-icon">🖼️</span>
                  )}
                </div>
                <div className="sp-name">{ref.name || 'Style'}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 프리셋 스타일 그리드 */}
      <div className="sp-grid">
        {/* 스타일 없음 카드 */}
        <div
          className={`sp-card sp-no-style ${!selectedId ? 'selected' : ''}`}
          onClick={() => onSelect(null)}
        >
          <div className="sp-thumb">
            <span className="sp-icon">🚫</span>
          </div>
          <div className="sp-name">{t('reference.noStyle')}</div>
        </div>

        {filteredStyles.map(style => {
          const thumb = thumbnails[style.id]
          const cat = categories.find(c => c.id === style.category)
          const styleName = isKo ? style.name_ko : style.name_en
          return (
            <div
              key={style.id}
              className={`sp-card ${selectedId === `preset:${style.id}` ? 'selected' : ''}`}
              onClick={() => onSelect(selectedId === `preset:${style.id}` ? null : `preset:${style.id}`)}
              onContextMenu={(e) => {
                if (!thumb) return
                e.preventDefault()
                if (window.confirm(`"${styleName}" 썸네일을 삭제하시겠습니까?`)) {
                  onDeleteThumbnail?.(style.id)
                }
              }}
              title={styleName}
            >
              <div className="sp-thumb">
                {thumb ? (
                  <img
                    src={thumb}
                    alt={styleName}
                    loading="lazy"
                    onDoubleClick={(e) => {
                      e.stopPropagation()
                      setPreviewStyle({ ...style, thumb })
                    }}
                    onMouseEnter={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect()
                      setHoverPreview({
                        style, thumb,
                        x: rect.right + 8,
                        y: rect.top
                      })
                    }}
                    onMouseLeave={() => setHoverPreview(null)}
                  />
                ) : (
                  <span className="sp-icon">{cat?.icon || '🎨'}</span>
                )}
              </div>
              <div className="sp-name">{styleName}</div>
            </div>
          )
        })}
      </div>

      {/* 하단: 썸네일 생성 버튼 + 진행 */}
      <div className="sp-footer">
        {generating ? (
          <div className="sp-progress-row">
            <div className="sp-progress-bar">
              <div
                className="sp-progress-fill"
                style={{ width: `${progress.total > 0 ? (progress.current / progress.total) * 100 : 0}%` }}
              />
            </div>
            <span className="sp-progress-text">
              {t('reference.thumbnailProgress', { current: progress.current, total: progress.total })}
              {elapsed > 0 && <span className="sp-elapsed"> {formatElapsed(elapsed)}</span>}
            </span>
            <button className={`sp-btn-stop ${stopping ? 'stopping' : ''}`} onClick={onStopGenerating} disabled={stopping}>
              {stopping ? `⏳ ${t('reference.stopping')}...` : t('reference.stop')}
            </button>
          </div>
        ) : missingCount > 0 ? (
          <button className="sp-btn-generate" onClick={() => onGenerateThumbnails?.()}>
            🎨 {t('reference.generateThumbnails')} ({missingCount})
          </button>
        ) : null}
      </div>
      {/* 호버 풍선 미리보기 */}
      {hoverPreview && (
        <div
          className="sp-hover-balloon"
          style={{
            top: Math.min(hoverPreview.y, window.innerHeight - 320),
            left: Math.min(hoverPreview.x, window.innerWidth - 280)
          }}
        >
          <img src={hoverPreview.thumb} alt="" />
          <div className="sp-hover-name">{isKo ? hoverPreview.style.name_ko : hoverPreview.style.name_en}</div>
        </div>
      )}

      {/* 미리보기 모달 */}
      {previewStyle && (
        <div className="sp-preview-overlay" onClick={() => setPreviewStyle(null)}>
          <div className="sp-preview" onClick={e => e.stopPropagation()}>
            <div className="sp-preview-header">
              <span>{isKo ? previewStyle.name_ko : previewStyle.name_en}</span>
              <button className="sp-preview-close" onClick={() => setPreviewStyle(null)}>✕</button>
            </div>
            <div className="sp-preview-image">
              <img src={previewStyle.thumb} alt={isKo ? previewStyle.name_ko : previewStyle.name_en} />
            </div>
            <div className="sp-preview-prompt">{previewStyle.prompt_en}</div>
          </div>
        </div>
      )}
    </div>
  )
}
