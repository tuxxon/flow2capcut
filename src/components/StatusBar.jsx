/**
 * StatusBar Component - 진행 상태 표시
 */

export default function StatusBar({ progress, status, message }) {
  const statusClass = {
    ready: '',
    uploading: 'uploading',
    running: 'running',
    done: 'success',
    stopped: 'warning',
    error: 'error'
  }[status] || ''
  
  return (
    <div className={`status-bar ${statusClass}`}>
      <div className="status-progress">
        <progress 
          value={progress.percent} 
          max="100"
        />
        <span className="progress-text">
          {progress.current} / {progress.total} ({progress.percent}%)
        </span>
      </div>
      
      <div className="status-message">
        {message}
      </div>
    </div>
  )
}
