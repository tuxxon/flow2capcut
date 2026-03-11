/**
 * DisplayTab - 화면 레이아웃 설정 탭
 */

const LAYOUT_OPTIONS = [
  { value: 'split-left', labelKey: 'settings.layoutSplitLeft' },
  { value: 'split-right', labelKey: 'settings.layoutSplitRight' },
  { value: 'split-top', labelKey: 'settings.layoutSplitTop' },
  { value: 'split-bottom', labelKey: 'settings.layoutSplitBottom' },
]

export default function DisplayTab({ localSettings, setLocalSettings, t }) {
  const layoutMode = localSettings.layoutMode || 'split-left'

  return (
    <div className="tab-panel">
      <div className="setting-row">
        <label className="setting-label">{t('settings.layoutMode')}</label>
        <div className="radio-group">
          {LAYOUT_OPTIONS.map(opt => (
            <label className="radio-label" key={opt.value}>
              <input
                type="radio" name="layoutMode" value={opt.value}
                checked={layoutMode === opt.value}
                onChange={(e) => setLocalSettings(s => ({ ...s, layoutMode: e.target.value }))}
              />
              <span>{t(opt.labelKey)}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="setting-row">
        <label className="setting-label">
          {t('settings.splitRatio')} ({Math.round((localSettings.splitRatio || 0.5) * 100)}%)
        </label>
        <input
          type="range"
          min="20" max="80" step="5"
          value={Math.round((localSettings.splitRatio || 0.5) * 100)}
          onChange={(e) => setLocalSettings(s => ({ ...s, splitRatio: parseInt(e.target.value) / 100 }))}
          className="setting-slider"
        />
        <div className="setting-hint" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#888' }}>
          <span>Flow 20%</span>
          <span>Flow 80%</span>
        </div>
      </div>
    </div>
  )
}
