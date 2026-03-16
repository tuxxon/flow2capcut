/**
 * Electron IPC Handler - CapCut Project File Operations
 *
 * Handles detecting CapCut installation paths, scanning project folders,
 * writing complete CapCut project structures, and launching the CapCut app.
 *
 * CapCut project folder structure:
 * {basePath}/
 * └── {number}/              (e.g., 0130)
 *     ├── draft_info.json     (main project data)
 *     ├── draft_meta_info.json (metadata)
 *     └── media/
 *         ├── scene_001.png
 *         ├── scene_002.png
 *         └── subtitles.srt
 */

import fs from 'fs/promises'
import path from 'path'
import { exec } from 'child_process'
import os from 'os'
import { dialog } from 'electron'
import { randomUUID } from 'crypto'

// ============================================================
// Helper Functions
// ============================================================

/**
 * Check whether a path exists on disk.
 */
async function pathExists(p) {
  try {
    await fs.access(p)
    return true
  } catch {
    return false
  }
}

/**
 * Strip the data: URL prefix from base64 data and convert to a Buffer.
 * Handles both raw base64 and data URL formatted strings.
 */
function base64ToBuffer(base64Data) {
  const clean = base64Data.replace(/^data:[^;]+;base64,/, '')
  return Buffer.from(clean, 'base64')
}

/**
 * Execute a shell command and return a promise.
 */
function execPromise(command) {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        reject(error)
      } else {
        resolve({ stdout, stderr })
      }
    })
  })
}

/**
 * Get candidate CapCut project base paths for the current platform.
 * Returns an array of paths to check, in priority order.
 */
function getCapcutCandidatePaths() {
  const platform = process.platform
  const home = os.homedir()

  if (platform === 'darwin') {
    return [
      path.join(home, 'Movies', 'CapCut', 'User Data', 'Projects', 'com.lveditor.draft'),
      path.join(home, 'Movies', 'CapCutPro', 'User Data', 'Projects', 'com.lveditor.draft'),
      path.join(home, 'Documents', 'CapCut', 'User Data', 'Projects', 'com.lveditor.draft'),
    ]
  } else if (platform === 'win32') {
    const localAppData = process.env.LOCALAPPDATA || path.join(home, 'AppData', 'Local')
    return [
      path.join(localAppData, 'CapCut', 'User Data', 'Projects', 'com.lveditor.draft'),
      path.join(localAppData, 'CapCutPro', 'User Data', 'Projects', 'com.lveditor.draft'),
      path.join(home, 'Documents', 'CapCut', 'User Data', 'Projects', 'com.lveditor.draft'),
    ]
  }

  // Linux or other — try common paths
  return [
    path.join(home, 'Documents', 'CapCut', 'User Data', 'Projects', 'com.lveditor.draft'),
  ]
}

/**
 * Get CapCut application paths for the current platform.
 * Used by both check-installed and open-app handlers.
 */
function getCapcutAppPaths() {
  const platform = process.platform

  if (platform === 'darwin') {
    return [
      '/Applications/CapCut.app',
      '/Applications/CapCut Pro.app',
    ]
  } else if (platform === 'win32') {
    const localAppData = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local')
    const programFiles = process.env['ProgramFiles'] || 'C:\\Program Files'
    const programFilesX86 = process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)'

    return [
      path.join(localAppData, 'CapCut', 'Apps', 'CapCut.exe'),
      path.join(localAppData, 'Programs', 'CapCut', 'CapCut.exe'),
      path.join(programFiles, 'CapCut', 'CapCut.exe'),
      path.join(programFilesX86, 'CapCut', 'CapCut.exe'),
    ]
  }

  return []
}

// ============================================================
// IPC Registration
// ============================================================

/**
 * Register all CapCut-related IPC handlers on the given ipcMain instance.
 */
export function registerCapcutIPC(ipcMain) {

  // ----------------------------------------------------------
  // 1. capcut:detect-path
  //
  // Auto-detect the CapCut projects base path.
  // Checks platform-specific candidate paths and returns the
  // first one that exists on disk.
  // ----------------------------------------------------------
  ipcMain.handle('capcut:detect-path', async () => {
    try {
      const candidates = getCapcutCandidatePaths()

      for (const candidatePath of candidates) {
        if (await pathExists(candidatePath)) {
          return { success: true, basePath: candidatePath, exists: true }
        }
      }

      // No path found — return the primary candidate for the platform
      return { success: true, basePath: candidates[0], exists: false }
    } catch (error) {
      return { success: false, basePath: null, exists: false, error: error.message }
    }
  })

  // ----------------------------------------------------------
  // 1.5. capcut:check-installed
  //
  // Check if CapCut application is installed on the system.
  // Checks app executable paths (not project folders).
  // ----------------------------------------------------------
  ipcMain.handle('capcut:check-installed', async () => {
    try {
      const appPaths = getCapcutAppPaths()

      for (const appPath of appPaths) {
        if (await pathExists(appPath)) {
          return { installed: true }
        }
      }

      return { installed: false }
    } catch (error) {
      console.warn('[capcut:check-installed] Error:', error.message)
      // On error, don't block the user
      return { installed: true }
    }
  })

  // ----------------------------------------------------------
  // 2. capcut:next-number
  //
  // Scan existing project folders in basePath and return the
  // next available project number (max + 1), zero-padded to
  // 4 digits. CapCut folders are typically named like 0128, 0129.
  // ----------------------------------------------------------
  ipcMain.handle('capcut:next-number', async (_event, { basePath }) => {
    try {
      if (!(await pathExists(basePath))) {
        return { success: true, number: 1, folderName: '0001' }
      }

      const entries = await fs.readdir(basePath, { withFileTypes: true })
      let maxNumber = 0

      for (const entry of entries) {
        if (!entry.isDirectory()) continue

        // Match directories that are purely numeric
        const match = entry.name.match(/^(\d+)$/)
        if (match) {
          const num = parseInt(match[1], 10)
          if (num > maxNumber) {
            maxNumber = num
          }
        }
      }

      const nextNumber = maxNumber + 1
      const folderName = String(nextNumber).padStart(4, '0')

      return { success: true, number: nextNumber, folderName }
    } catch (error) {
      return { success: false, number: null, folderName: null, error: error.message }
    }
  })

  // ----------------------------------------------------------
  // 3. capcut:write-project
  //
  // Write a complete CapCut project folder structure.
  // Creates the directory, writes draft_info.json,
  // draft_meta_info.json, media files, and SRT files.
  // ----------------------------------------------------------
  ipcMain.handle('capcut:write-project', async (_event, {
    targetPath, draftInfo, draftMetaInfo, mediaFiles, srtFiles
  }) => {
    try {
      let fileCount = 0

      // Create project directory and media subdirectory
      const mediaDir = path.join(targetPath, 'media')
      await fs.mkdir(mediaDir, { recursive: true })

      // Write draft_info.json (main project data)
      const draftInfoPath = path.join(targetPath, 'draft_info.json')
      const draftInfoContent = typeof draftInfo === 'string'
        ? draftInfo
        : JSON.stringify(draftInfo, null, 2)
      await fs.writeFile(draftInfoPath, draftInfoContent, 'utf-8')
      fileCount++

      // Write draft_meta_info.json (metadata)
      const draftMetaInfoPath = path.join(targetPath, 'draft_meta_info.json')
      const draftMetaInfoContent = typeof draftMetaInfo === 'string'
        ? draftMetaInfo
        : JSON.stringify(draftMetaInfo, null, 2)
      await fs.writeFile(draftMetaInfoPath, draftMetaInfoContent, 'utf-8')
      fileCount++

      // Write boilerplate files that CapCut expects
      const draftAgencyInfoPath = path.join(targetPath, 'draft_agency_info.json')
      await fs.writeFile(draftAgencyInfoPath, '{}', 'utf-8')
      fileCount++

      // Write media files (base64 → binary)
      if (Array.isArray(mediaFiles)) {
        for (const file of mediaFiles) {
          const filePath = path.join(mediaDir, file.filename)
          const buffer = base64ToBuffer(file.base64Data)
          await fs.writeFile(filePath, buffer)
          fileCount++
        }
      }

      // Write SRT subtitle files (text content) and register in draft_meta_info
      if (Array.isArray(srtFiles)) {
        // Parse draftMetaInfo to add SRT references
        let metaObj = typeof draftMetaInfo === 'string'
          ? JSON.parse(draftMetaInfo)
          : draftMetaInfo
        const type2Group = metaObj.draft_materials?.find(g => g.type === 2)

        for (const file of srtFiles) {
          const filePath = path.join(mediaDir, file.filename)
          await fs.writeFile(filePath, file.content, 'utf-8')
          fileCount++

          // Register SRT in draft_meta_info type=2
          if (type2Group) {
            type2Group.value.push({
              ai_group_type: '',
              create_time: 0,
              duration: 0,
              enter_from: 0,
              extra_info: file.filename,
              file_Path: `./media/${file.filename}`,
              height: 0,
              id: randomUUID().toUpperCase(),
              import_time: Math.floor(Date.now() / 1000),
              import_time_ms: -1,
              item_source: 1,
              md5: '',
              metetype: 'none',
              roughcut_time_range: { duration: -1, start: -1 },
              sub_time_range: { duration: -1, start: -1 },
              type: 2,
              width: 0
            })
          }
        }

        // Re-write draft_meta_info.json with SRT references
        if (type2Group && srtFiles.length > 0) {
          const updatedMeta = JSON.stringify(metaObj, null, 2)
          await fs.writeFile(path.join(targetPath, 'draft_meta_info.json'), updatedMeta, 'utf-8')
        }
      }

      return { success: true, targetPath, fileCount }
    } catch (error) {
      return { success: false, targetPath, fileCount: 0, error: error.message }
    }
  })

  // ----------------------------------------------------------
  // 4. capcut:open-app
  //
  // Launch the CapCut application.
  // macOS: Uses `open -a` command
  // Windows: Searches typical install locations
  // ----------------------------------------------------------
  ipcMain.handle('capcut:open-app', async () => {
    try {
      const platform = process.platform

      if (platform === 'darwin') {
        // macOS: Try known CapCut app names
        const appNames = ['CapCut', 'CapCut Pro']
        let launched = false

        for (const appName of appNames) {
          try {
            await execPromise(`open -a "${appName}"`)
            launched = true
            break
          } catch {
            // App not found with this name, try next
          }
        }

        if (!launched) {
          // Try to find CapCut in /Applications directly
          const appPaths = [
            '/Applications/CapCut.app',
            '/Applications/CapCut Pro.app',
          ]

          for (const appPath of appPaths) {
            if (await pathExists(appPath)) {
              await execPromise(`open "${appPath}"`)
              launched = true
              break
            }
          }
        }

        if (!launched) {
          return { success: false, error: 'CapCut application not found on this Mac' }
        }

        return { success: true }

      } else if (platform === 'win32') {
        // Windows: Search typical install locations
        const localAppData = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local')
        const programFiles = process.env['ProgramFiles'] || 'C:\\Program Files'
        const programFilesX86 = process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)'

        const exePaths = [
          path.join(localAppData, 'CapCut', 'Apps', 'CapCut.exe'),
          path.join(localAppData, 'Programs', 'CapCut', 'CapCut.exe'),
          path.join(programFiles, 'CapCut', 'CapCut.exe'),
          path.join(programFilesX86, 'CapCut', 'CapCut.exe'),
        ]

        for (const exePath of exePaths) {
          if (await pathExists(exePath)) {
            // Use start command to launch without blocking
            exec(`start "" "${exePath}"`)
            return { success: true }
          }
        }

        return { success: false, error: 'CapCut application not found on this PC' }

      } else {
        return { success: false, error: `Unsupported platform: ${platform}` }
      }
    } catch (error) {
      return { success: false, error: error.message }
    }
  })

  // ----------------------------------------------------------
  // 5. capcut:get-system-info
  //
  // Return system username, platform, and home directory.
  // Used by ExportModal to auto-fill username and detect OS.
  // ----------------------------------------------------------
  ipcMain.handle('capcut:get-system-info', async () => {
    try {
      return {
        success: true,
        username: os.userInfo().username,
        platform: process.platform,  // 'darwin' | 'win32' | 'linux'
        homedir: os.homedir()
      }
    } catch (error) {
      return { success: false, error: error.message }
    }
  })

  // ----------------------------------------------------------
  // 6. capcut:save-srt-file
  //
  // Save an SRT subtitle file via native save dialog.
  // ----------------------------------------------------------
  ipcMain.handle('capcut:save-srt-file', async (_event, { filename, content }) => {
    try {
      const result = await dialog.showSaveDialog({
        defaultPath: filename,
        filters: [
          { name: 'SRT Subtitle', extensions: ['srt'] },
          { name: 'All Files', extensions: ['*'] }
        ]
      })

      if (result.canceled || !result.filePath) {
        return { success: false, error: 'cancelled' }
      }

      await fs.writeFile(result.filePath, content, 'utf-8')
      return { success: true, filePath: result.filePath }
    } catch (error) {
      return { success: false, error: error.message }
    }
  })
}
