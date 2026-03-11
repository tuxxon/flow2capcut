/**
 * GenerationTab - 생성 설정 탭
 *
 * 방식(API/DOM), Seed, 화면비, 동시처리는 제거됨:
 * - DOM 자동화 모드로 고정 (Flow UI에서 직접 설정)
 * - 순차 처리 고정 (FlowView가 하나이므로)
 */

export default function GenerationTab({ localSettings, setLocalSettings, t }) {
  return (
    <div className="tab-panel">
      <p className="setting-info">
        {t('settings.generationInfo')}
      </p>
    </div>
  )
}
