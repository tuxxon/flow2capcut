/**
 * useProjectData - 프로젝트 데이터 관리 (저장/로드/전환/복원)
 */

import { useEffect } from 'react'
import { fileSystemAPI } from './useFileSystem'

/**
 * 프로젝트 데이터 로드 + 이미지 파일 복원 (공통 헬퍼)
 */
async function loadProjectWithImages(projectName) {
  const result = await fileSystemAPI.loadProjectData(projectName)
  if (!result.success || !result.data) return null

  // scenes 이미지 파일에서 로드
  const scenesWithImages = await Promise.all(
    (result.data.scenes || []).map(async (scene) => {
      if (scene.id && !scene.image) {
        const imgResult = await fileSystemAPI.readImage(projectName, scene.id)
        if (imgResult.success) return { ...scene, image: imgResult.data }
      }
      return scene
    })
  )

  // references 이미지 파일에서 로드
  const refsWithImages = await Promise.all(
    (result.data.references || []).map(async (ref) => {
      if (ref.name && !ref.data) {
        const imgResult = await fileSystemAPI.readReference(projectName, ref.name)
        if (imgResult.success) return { ...ref, data: imgResult.data }
      }
      return ref
    })
  )

  return { scenes: scenesWithImages, references: refsWithImages }
}

/**
 * 현재 프로젝트 데이터 저장 (공통 헬퍼)
 * - 이미지 데이터(base64)는 제외하고 메타데이터만 저장
 * - 이미지는 이미 별도 파일로 저장됨 (images/, references/)
 */
async function saveCurrentProject(settings, scenes, references) {
  if (!settings.projectName || settings.saveMode !== 'folder') return
  const exists = await fileSystemAPI.projectExists(settings.projectName)
  if (!exists) return

  // scenes에서 image(base64) 제외
  const scenesWithoutImages = scenes.map(({ image, ...rest }) => rest)

  // references에서 data(base64) 제외
  const refsWithoutData = references.map(({ data, ...rest }) => rest)

  await fileSystemAPI.saveProjectData(settings.projectName, {
    scenes: scenesWithoutImages,
    references: refsWithoutData,
    settings: { aspectRatio: settings.aspectRatio, defaultDuration: settings.defaultDuration }
  })
}

export function useProjectData({ settings, setSettings, scenes, references, setScenes, setReferences, openSettings }) {
  // Pending save 추가 (no-op in desktop — permission is always available)
  const addPendingSave = () => {}

  // 마운트 시 자동 복원: 폴더가 설정되어 있으면 이전 프로젝트 로드
  useEffect(() => {
    const tryAutoRestore = async () => {
      const saved = localStorage.getItem('flow2capcut_settings')
      if (!saved) return

      const parsed = JSON.parse(saved)
      const prevProjectName = parsed.projectName
      if (!prevProjectName) return

      const permResult = await fileSystemAPI.checkPermission()
      if (!permResult.success) return

      const exists = await fileSystemAPI.projectExists(prevProjectName)
      if (!exists) return

      console.log('[App] Auto-restore: loading project:', prevProjectName)
      const loaded = await loadProjectWithImages(prevProjectName)
      if (loaded) {
        setScenes(loaded.scenes)
        setReferences(loaded.references)
        setSettings(s => ({ ...s, projectName: prevProjectName }))
        console.log('[App] Auto-restore complete:', prevProjectName)
      }
    }

    tryAutoRestore().catch(e => console.warn('[App] Auto-restore failed:', e))
  }, [])

  // 프로젝트 전환 핸들러
  const handleProjectChange = async (newProjectName) => {
    if (newProjectName === settings.projectName) return

    // 1. 현재 프로젝트 데이터 저장
    await saveCurrentProject(settings, scenes, references)

    // 2. 새 프로젝트 데이터 로드
    const newExists = await fileSystemAPI.projectExists(newProjectName)
    if (newExists) {
      const loaded = await loadProjectWithImages(newProjectName)
      if (loaded) {
        setScenes(loaded.scenes)
        setReferences(loaded.references)
        console.log('[App] Project loaded:', newProjectName)
      } else {
        // 폴더는 있지만 데이터 없음 (새로 만든 빈 프로젝트)
        setScenes([])
        setReferences([])
        console.log('[App] Empty project:', newProjectName)
      }
    } else {
      // 프로젝트 폴더 자체가 없음
      setScenes([])
      setReferences([])
      console.log('[App] New project created:', newProjectName)
    }

    // 3. 프로젝트명 업데이트
    setSettings(s => ({ ...s, projectName: newProjectName }))
  }

  return {
    addPendingSave,
    handleProjectChange,
    saveCurrentProject: () => saveCurrentProject(settings, scenes, references)
  }
}
