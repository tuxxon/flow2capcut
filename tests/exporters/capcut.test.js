/**
 * capcut.js exporter tests
 */
import { describe, it, expect, vi } from 'vitest'

// Mock capcutCloud before importing
vi.mock('../../src/exporters/capcutCloud', () => ({
  exportCapcutPackageCloud: vi.fn().mockResolvedValue(new Blob(['zip'])),
}))

import { generateSRT } from '../../src/exporters/capcut'

describe('generateSRT', () => {
  // ============================================================
  // Basic Korean SRT generation
  // ============================================================
  describe('basic Korean SRT', () => {
    it('generates SRT with correct timing for Korean subtitles', () => {
      const project = {
        scenes: [
          { id: 'scene_1', subtitle_ko: 'First subtitle', image_duration: 3 },
          { id: 'scene_2', subtitle_ko: 'Second subtitle', image_duration: 4 },
        ],
        videos: [],
      }

      const srt = generateSRT(project, 'ko')

      expect(srt).toContain('1\n')
      expect(srt).toContain('00:00:00,000 --> 00:00:03,000')
      expect(srt).toContain('First subtitle')
      expect(srt).toContain('2\n')
      expect(srt).toContain('00:00:03,000 --> 00:00:07,000')
      expect(srt).toContain('Second subtitle')
    })

    it('sorts scenes by ID number', () => {
      const project = {
        scenes: [
          { id: 'scene_3', subtitle_ko: 'Third', image_duration: 2 },
          { id: 'scene_1', subtitle_ko: 'First', image_duration: 2 },
          { id: 'scene_2', subtitle_ko: 'Second', image_duration: 2 },
        ],
        videos: [],
      }

      const srt = generateSRT(project, 'ko')
      const lines = srt.split('\n')

      // First subtitle entry should be "First"
      const firstSubIdx = lines.indexOf('First')
      const thirdSubIdx = lines.indexOf('Third')
      expect(firstSubIdx).toBeLessThan(thirdSubIdx)
    })
  })

  // ============================================================
  // Empty subtitle skip
  // ============================================================
  describe('empty subtitle handling', () => {
    it('skips empty subtitles but advances duration', () => {
      const project = {
        scenes: [
          { id: 'scene_1', subtitle_ko: 'First', image_duration: 3 },
          { id: 'scene_2', subtitle_ko: '', image_duration: 2 },
          { id: 'scene_3', subtitle_ko: 'Third', image_duration: 4 },
        ],
        videos: [],
      }

      const srt = generateSRT(project, 'ko')

      // Should only have 2 entries (scene_2 skipped)
      expect(srt).toContain('1\n')
      expect(srt).toContain('2\n')
      expect(srt).not.toContain('3\n00:')

      // Third subtitle should start at 3+2=5 seconds
      expect(srt).toContain('00:00:05,000 --> 00:00:09,000')
      expect(srt).toContain('Third')
    })

    it('skips whitespace-only subtitles', () => {
      const project = {
        scenes: [
          { id: 'scene_1', subtitle_ko: '   ', image_duration: 3 },
          { id: 'scene_2', subtitle_ko: 'After blank', image_duration: 2 },
        ],
        videos: [],
      }

      const srt = generateSRT(project, 'ko')

      // Only 1 entry
      expect(srt).toContain('1\n')
      expect(srt).not.toContain('2\n00:')
      // Duration of first scene (3s) still advances
      expect(srt).toContain('00:00:03,000 --> 00:00:05,000')
    })

    it('skips null/undefined subtitles', () => {
      const project = {
        scenes: [
          { id: 'scene_1', image_duration: 3 },  // no subtitle_ko
          { id: 'scene_2', subtitle_ko: 'Present', image_duration: 2 },
        ],
        videos: [],
      }

      const srt = generateSRT(project, 'ko')

      expect(srt).toContain('1\n')
      expect(srt).toContain('00:00:03,000 --> 00:00:05,000')
      expect(srt).toContain('Present')
    })
  })

  // ============================================================
  // English subtitle selection
  // ============================================================
  describe('English subtitles', () => {
    it('uses subtitle_en when lang is en', () => {
      const project = {
        scenes: [
          { id: 'scene_1', subtitle_ko: 'Korean', subtitle_en: 'English', image_duration: 3 },
        ],
        videos: [],
      }

      const srt = generateSRT(project, 'en')

      expect(srt).toContain('English')
      expect(srt).not.toContain('Korean')
    })
  })

  // ============================================================
  // Empty project
  // ============================================================
  describe('empty project', () => {
    it('returns empty string for project with no scenes', () => {
      const srt = generateSRT({ scenes: [], videos: [] })
      expect(srt).toBe('')
    })

    it('returns empty string for project with missing scenes', () => {
      const srt = generateSRT({})
      expect(srt).toBe('')
    })

    it('returns empty string when all subtitles are empty', () => {
      const project = {
        scenes: [
          { id: 'scene_1', subtitle_ko: '', image_duration: 3 },
          { id: 'scene_2', subtitle_ko: '', image_duration: 3 },
        ],
        videos: [],
      }

      const srt = generateSRT(project, 'ko')
      expect(srt).toBe('')
    })
  })

  // ============================================================
  // Video duration override
  // ============================================================
  describe('video duration override', () => {
    it('uses video duration when video exists for scene', () => {
      const project = {
        scenes: [
          { id: 'scene_1', subtitle_ko: 'With video', image_duration: 3 },
          { id: 'scene_2', subtitle_ko: 'No video', image_duration: 4 },
        ],
        videos: [
          { video_path: '/video.mp4', from_scene: 'scene_1', duration: 10 },
        ],
      }

      const srt = generateSRT(project, 'ko')

      // scene_1 should use video duration (10s)
      expect(srt).toContain('00:00:00,000 --> 00:00:10,000')
      // scene_2 should start at 10s and use image_duration (4s)
      expect(srt).toContain('00:00:10,000 --> 00:00:14,000')
    })

    it('falls back to default 5s for video without explicit duration', () => {
      const project = {
        scenes: [
          { id: 'scene_1', subtitle_ko: 'Has video', image_duration: 3 },
        ],
        videos: [
          { video_path: '/video.mp4', from_scene: 'scene_1' },
        ],
      }

      const srt = generateSRT(project, 'ko')

      // video without duration defaults to 5s
      expect(srt).toContain('00:00:00,000 --> 00:00:05,000')
    })

    it('falls back to default 3s for scene without image_duration', () => {
      const project = {
        scenes: [
          { id: 'scene_1', subtitle_ko: 'No duration' },
        ],
        videos: [],
      }

      const srt = generateSRT(project, 'ko')

      expect(srt).toContain('00:00:00,000 --> 00:00:03,000')
    })
  })

  // ============================================================
  // SRT time formatting
  // ============================================================
  describe('SRT time formatting', () => {
    it('formats hours correctly for long projects', () => {
      const scenes = []
      // 1200 scenes x 3s each = 3600s = 1 hour
      for (let i = 0; i < 1200; i++) {
        scenes.push({
          id: 'scene_' + (i + 1),
          subtitle_ko: '',
          image_duration: 3,
        })
      }
      // Last scene with subtitle at exactly 1 hour mark
      scenes.push({
        id: 'scene_1201',
        subtitle_ko: 'At one hour',
        image_duration: 3,
      })

      const project = { scenes, videos: [] }
      const srt = generateSRT(project, 'ko')

      expect(srt).toContain('01:00:00,000 --> 01:00:03,000')
    })

    it('formats milliseconds correctly', () => {
      const project = {
        scenes: [
          { id: 'scene_1', subtitle_ko: 'Test', image_duration: 2.5 },
        ],
        videos: [],
      }

      const srt = generateSRT(project, 'ko')

      expect(srt).toContain('00:00:00,000 --> 00:00:02,500')
    })
  })
})
