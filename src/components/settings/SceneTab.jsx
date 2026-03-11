/**
 * SceneTab - 씬 설정 탭
 */

export default function SceneTab({ localSettings, setLocalSettings, t }) {
  return (
    <div className="tab-panel">
      <div className="setting-row">
        <label className="setting-label">{t('settings.defaultDuration')}</label>
        <input
          type="number"
          value={localSettings.defaultDuration}
          onChange={(e) => setLocalSettings(s => ({ ...s, defaultDuration: parseFloat(e.target.value) || 3 }))}
          min="1" max="30" step="0.5"
        />
        <span className="setting-unit">{t('settings.seconds')}</span>
      </div>

      <div className="setting-row">
        <label className="setting-label">{t('settings.exportThreshold')}</label>
        <div className="threshold-input-group">
          <input
            type="range"
            min="10"
            max="100"
            step="10"
            value={localSettings.exportThreshold || 50}
            onChange={(e) => setLocalSettings(s => ({ ...s, exportThreshold: parseInt(e.target.value) }))}
          />
          <span className="threshold-value">{localSettings.exportThreshold || 50}%</span>
        </div>
        <span className="setting-sublabel">{t('settings.exportThresholdHint')}</span>
      </div>
    </div>
  )
}
