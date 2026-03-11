/**
 * useScenes hook tests
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useScenes } from '../../src/hooks/useScenes'

// Mock fileSystemAPI
vi.mock('../../src/hooks/useFileSystem', () => ({
  fileSystemAPI: {
    readFileByPath: vi.fn().mockResolvedValue({ success: false }),
  }
}))

describe('useScenes', () => {
  // ============================================================
  // parseFromText
  // ============================================================
  describe('parseFromText', () => {
    it('parses lines into scenes with default duration', () => {
      const { result } = renderHook(() => useScenes())

      let scenes
      act(() => {
        scenes = result.current.parseFromText('scene one\nscene two\nscene three')
      })

      expect(scenes).toHaveLength(3)
      expect(scenes[0].id).toBe('scene_1')
      expect(scenes[0].prompt).toBe('scene one')
      expect(scenes[0].status).toBe('pending')
      expect(scenes[0].image).toBeNull()
      expect(scenes[1].id).toBe('scene_2')
      expect(scenes[1].prompt).toBe('scene two')
      expect(scenes[2].id).toBe('scene_3')
      expect(scenes[2].prompt).toBe('scene three')
    })

    it('sets sequential timing with default duration', () => {
      const { result } = renderHook(() => useScenes())

      let scenes
      act(() => {
        scenes = result.current.parseFromText('a\nb')
      })

      // default duration = 3
      expect(scenes[0].startTime).toBe(0)
      expect(scenes[0].endTime).toBe(3)
      expect(scenes[0].duration).toBe(3)
      expect(scenes[1].startTime).toBe(3)
      expect(scenes[1].endTime).toBe(6)
    })

    it('uses custom duration', () => {
      const { result } = renderHook(() => useScenes())

      let scenes
      act(() => {
        scenes = result.current.parseFromText('a\nb', 5)
      })

      expect(scenes[0].duration).toBe(5)
      expect(scenes[0].endTime).toBe(5)
      expect(scenes[1].startTime).toBe(5)
      expect(scenes[1].endTime).toBe(10)
    })

    it('ignores empty lines', () => {
      const { result } = renderHook(() => useScenes())

      let scenes
      act(() => {
        scenes = result.current.parseFromText('hello\n\n\nworld\n')
      })

      expect(scenes).toHaveLength(2)
      expect(scenes[0].prompt).toBe('hello')
      expect(scenes[1].prompt).toBe('world')
    })

    it('updates hook state', () => {
      const { result } = renderHook(() => useScenes())

      act(() => {
        result.current.parseFromText('line one')
      })

      expect(result.current.scenes).toHaveLength(1)
      expect(result.current.scenes[0].prompt).toBe('line one')
    })
  })

  // ============================================================
  // parseFromCSV
  // ============================================================
  describe('parseFromCSV', () => {
    it('parses CSV with headers into scenes', () => {
      const csv = 'prompt,subtitle,characters,scene_tag,style_tag,duration\n"A cat",Meow,cat,forest,cartoon,4'
      const { result } = renderHook(() => useScenes())

      let scenes
      act(() => {
        scenes = result.current.parseFromCSV(csv)
      })

      expect(scenes).toHaveLength(1)
      expect(scenes[0].prompt).toBe('A cat')
      expect(scenes[0].subtitle).toBe('Meow')
      expect(scenes[0].characters).toBe('cat')
      expect(scenes[0].scene_tag).toBe('forest')
      expect(scenes[0].style_tag).toBe('cartoon')
      expect(scenes[0].duration).toBe(4)
    })

    it('returns empty array for header-only CSV', () => {
      const { result } = renderHook(() => useScenes())

      let scenes
      act(() => {
        scenes = result.current.parseFromCSV('prompt,subtitle')
      })

      expect(scenes).toHaveLength(0)
    })

    it('uses default duration when not specified', () => {
      const csv = 'prompt\nhello world'
      const { result } = renderHook(() => useScenes())

      let scenes
      act(() => {
        scenes = result.current.parseFromCSV(csv, 7)
      })

      expect(scenes[0].duration).toBe(7)
    })
  })

  // ============================================================
  // parseFromSRT
  // ============================================================
  describe('parseFromSRT', () => {
    it('parses SRT text into scenes', () => {
      const srt = `1
00:00:00,000 --> 00:00:03,000
Hello world

2
00:00:03,000 --> 00:00:06,500
Goodbye world`

      const { result } = renderHook(() => useScenes())

      let scenes
      act(() => {
        scenes = result.current.parseFromSRT(srt)
      })

      expect(scenes).toHaveLength(2)
      expect(scenes[0].subtitle).toBe('Hello world')
      expect(scenes[0].prompt).toBe('Hello world')
      expect(scenes[0].startTime).toBe(0)
      expect(scenes[0].endTime).toBe(3)
      expect(scenes[0].duration).toBe(3)
      expect(scenes[1].subtitle).toBe('Goodbye world')
      expect(scenes[1].startTime).toBe(3)
      expect(scenes[1].endTime).toBe(6.5)
    })
  })

  // ============================================================
  // updateScene
  // ============================================================
  describe('updateScene', () => {
    it('immutably updates a specific scene', () => {
      const { result } = renderHook(() => useScenes())

      act(() => {
        result.current.parseFromText('a\nb\nc')
      })

      const beforeScenes = result.current.scenes

      act(() => {
        result.current.updateScene('scene_2', { prompt: 'updated', status: 'done' })
      })

      // Original reference should differ (immutable)
      expect(result.current.scenes).not.toBe(beforeScenes)
      expect(result.current.scenes[1].prompt).toBe('updated')
      expect(result.current.scenes[1].status).toBe('done')
      // Others unchanged
      expect(result.current.scenes[0].prompt).toBe('a')
      expect(result.current.scenes[2].prompt).toBe('c')
    })

    it('does nothing if scene id not found', () => {
      const { result } = renderHook(() => useScenes())

      act(() => {
        result.current.parseFromText('a')
      })

      act(() => {
        result.current.updateScene('scene_999', { prompt: 'nope' })
      })

      expect(result.current.scenes[0].prompt).toBe('a')
    })
  })

  // ============================================================
  // deleteScene
  // ============================================================
  describe('deleteScene', () => {
    it('removes scene and re-numbers IDs', () => {
      const { result } = renderHook(() => useScenes())

      act(() => {
        result.current.parseFromText('a\nb\nc')
      })

      act(() => {
        result.current.deleteScene('scene_2')
      })

      expect(result.current.scenes).toHaveLength(2)
      expect(result.current.scenes[0].id).toBe('scene_1')
      expect(result.current.scenes[0].prompt).toBe('a')
      expect(result.current.scenes[1].id).toBe('scene_2')
      expect(result.current.scenes[1].prompt).toBe('c')
    })

    it('handles deleting first scene', () => {
      const { result } = renderHook(() => useScenes())

      act(() => {
        result.current.parseFromText('first\nsecond')
      })

      act(() => {
        result.current.deleteScene('scene_1')
      })

      expect(result.current.scenes).toHaveLength(1)
      expect(result.current.scenes[0].id).toBe('scene_1')
      expect(result.current.scenes[0].prompt).toBe('second')
    })

    it('handles deleting non-existent scene', () => {
      const { result } = renderHook(() => useScenes())

      act(() => {
        result.current.parseFromText('a')
      })

      act(() => {
        result.current.deleteScene('scene_999')
      })

      expect(result.current.scenes).toHaveLength(1)
    })
  })

  // ============================================================
  // addScene
  // ============================================================
  describe('addScene', () => {
    it('appends scene at end by default', () => {
      const { result } = renderHook(() => useScenes())

      act(() => {
        result.current.parseFromText('a\nb')
      })

      act(() => {
        result.current.addScene()
      })

      expect(result.current.scenes).toHaveLength(3)
      expect(result.current.scenes[2].id).toBe('scene_3')
      expect(result.current.scenes[2].prompt).toBe('')
      expect(result.current.scenes[2].status).toBe('pending')
    })

    it('inserts scene after specified index', () => {
      const { result } = renderHook(() => useScenes())

      act(() => {
        result.current.parseFromText('a\nb\nc')
      })

      act(() => {
        result.current.addScene(0)
      })

      expect(result.current.scenes).toHaveLength(4)
      expect(result.current.scenes[0].prompt).toBe('a')
      expect(result.current.scenes[1].prompt).toBe('')  // inserted
      expect(result.current.scenes[2].prompt).toBe('b')
      expect(result.current.scenes[3].prompt).toBe('c')
    })

    it('re-numbers all IDs after insert', () => {
      const { result } = renderHook(() => useScenes())

      act(() => {
        result.current.parseFromText('a\nb')
      })

      act(() => {
        result.current.addScene(0)
      })

      expect(result.current.scenes[0].id).toBe('scene_1')
      expect(result.current.scenes[1].id).toBe('scene_2')
      expect(result.current.scenes[2].id).toBe('scene_3')
    })

    it('recalculates timing after insert', () => {
      const { result } = renderHook(() => useScenes())

      act(() => {
        result.current.parseFromText('a\nb')
      })

      act(() => {
        result.current.addScene(0)
      })

      // All scenes should have sequential timing
      const scenes = result.current.scenes
      expect(scenes[0].startTime).toBe(0)
      expect(scenes[1].startTime).toBe(scenes[0].endTime)
      expect(scenes[2].startTime).toBe(scenes[1].endTime)
    })
  })

  // ============================================================
  // moveScene
  // ============================================================
  describe('moveScene', () => {
    it('moves scene from one position to another', () => {
      const { result } = renderHook(() => useScenes())

      act(() => {
        result.current.parseFromText('a\nb\nc')
      })

      act(() => {
        result.current.moveScene(2, 0)
      })

      expect(result.current.scenes[0].prompt).toBe('c')
      expect(result.current.scenes[1].prompt).toBe('a')
      expect(result.current.scenes[2].prompt).toBe('b')
    })

    it('re-numbers IDs after move', () => {
      const { result } = renderHook(() => useScenes())

      act(() => {
        result.current.parseFromText('a\nb\nc')
      })

      act(() => {
        result.current.moveScene(0, 2)
      })

      expect(result.current.scenes[0].id).toBe('scene_1')
      expect(result.current.scenes[1].id).toBe('scene_2')
      expect(result.current.scenes[2].id).toBe('scene_3')
    })

    it('does nothing when same index', () => {
      const { result } = renderHook(() => useScenes())

      act(() => {
        result.current.parseFromText('a\nb')
      })

      const before = result.current.scenes

      act(() => {
        result.current.moveScene(0, 0)
      })

      // Same reference when no change
      expect(result.current.scenes).toBe(before)
    })

    it('recalculates timing after move', () => {
      const { result } = renderHook(() => useScenes())

      act(() => {
        result.current.parseFromText('a\nb\nc')
      })

      act(() => {
        result.current.moveScene(2, 0)
      })

      const scenes = result.current.scenes
      expect(scenes[0].startTime).toBe(0)
      expect(scenes[1].startTime).toBe(scenes[0].endTime)
      expect(scenes[2].startTime).toBe(scenes[1].endTime)
    })
  })

  // ============================================================
  // clearScenes
  // ============================================================
  describe('clearScenes', () => {
    it('resets scenes to empty array', () => {
      const { result } = renderHook(() => useScenes())

      act(() => {
        result.current.parseFromText('a\nb\nc')
      })

      expect(result.current.scenes).toHaveLength(3)

      act(() => {
        result.current.clearScenes()
      })

      expect(result.current.scenes).toHaveLength(0)
    })
  })

  // ============================================================
  // updateReferences
  // ============================================================
  describe('updateReferences', () => {
    it('sets references array', () => {
      const { result } = renderHook(() => useScenes())

      const refs = [
        { name: 'hero', type: 'character', category: 'MEDIA_CATEGORY_SUBJECT' },
        { name: 'forest', type: 'scene', category: 'MEDIA_CATEGORY_SCENE' },
      ]

      act(() => {
        result.current.updateReferences(refs)
      })

      expect(result.current.references).toEqual(refs)
    })

    it('replaces existing references', () => {
      const { result } = renderHook(() => useScenes())

      act(() => {
        result.current.updateReferences([{ name: 'old' }])
      })

      act(() => {
        result.current.updateReferences([{ name: 'new' }])
      })

      expect(result.current.references).toEqual([{ name: 'new' }])
    })
  })

  // ============================================================
  // getMatchingReferences
  // ============================================================
  describe('getMatchingReferences', () => {
    function setupWithRefs() {
      const { result } = renderHook(() => useScenes())

      act(() => {
        result.current.updateReferences([
          { name: 'Hero', type: 'character' },
          { name: 'Villain', type: 'character' },
          { name: 'Forest', type: 'scene' },
          { name: 'Castle', type: 'scene' },
          { name: 'Anime', type: 'style' },
          { name: 'Watercolor', type: 'style' },
        ])
      })

      return result
    }

    it('matches character tags (case-insensitive)', () => {
      const result = setupWithRefs()

      const scene = { characters: 'hero', scene_tag: '', style_tag: '' }
      const matched = result.current.getMatchingReferences(scene)

      expect(matched).toHaveLength(1)
      expect(matched[0].name).toBe('Hero')
    })

    it('matches scene tags', () => {
      const result = setupWithRefs()

      const scene = { characters: '', scene_tag: 'forest', style_tag: '' }
      const matched = result.current.getMatchingReferences(scene)

      expect(matched).toHaveLength(1)
      expect(matched[0].name).toBe('Forest')
    })

    it('matches style tags', () => {
      const result = setupWithRefs()

      const scene = { characters: '', scene_tag: '', style_tag: 'anime' }
      const matched = result.current.getMatchingReferences(scene)

      expect(matched).toHaveLength(1)
      expect(matched[0].name).toBe('Anime')
    })

    it('matches multiple tags with comma delimiter', () => {
      const result = setupWithRefs()

      const scene = { characters: 'hero,villain', scene_tag: '', style_tag: '' }
      const matched = result.current.getMatchingReferences(scene)

      expect(matched).toHaveLength(2)
    })

    it('matches tags with semicolon delimiter', () => {
      const result = setupWithRefs()

      const scene = { characters: 'hero;villain', scene_tag: '', style_tag: '' }
      const matched = result.current.getMatchingReferences(scene)

      expect(matched).toHaveLength(2)
    })

    it('matches tags with colon delimiter', () => {
      const result = setupWithRefs()

      const scene = { characters: 'hero:villain', scene_tag: '', style_tag: '' }
      const matched = result.current.getMatchingReferences(scene)

      expect(matched).toHaveLength(2)
    })

    it('matches across all three tag types', () => {
      const result = setupWithRefs()

      const scene = { characters: 'hero', scene_tag: 'forest', style_tag: 'anime' }
      const matched = result.current.getMatchingReferences(scene)

      expect(matched).toHaveLength(3)
    })

    it('returns empty for null scene', () => {
      const result = setupWithRefs()
      expect(result.current.getMatchingReferences(null)).toEqual([])
    })

    it('returns empty when no references set', () => {
      const { result } = renderHook(() => useScenes())

      const scene = { characters: 'hero', scene_tag: '', style_tag: '' }
      expect(result.current.getMatchingReferences(scene)).toEqual([])
    })

    it('returns empty when tags do not match', () => {
      const result = setupWithRefs()

      const scene = { characters: 'unknown', scene_tag: 'beach', style_tag: 'abstract' }
      expect(result.current.getMatchingReferences(scene)).toEqual([])
    })

    it('handles whitespace in tag strings', () => {
      const result = setupWithRefs()

      const scene = { characters: ' hero , villain ', scene_tag: '', style_tag: '' }
      const matched = result.current.getMatchingReferences(scene)

      expect(matched).toHaveLength(2)
    })
  })

  // ============================================================
  // sceneStats & computed queries
  // ============================================================
  describe('sceneStats and query helpers', () => {
    it('computes stats correctly', () => {
      const { result } = renderHook(() => useScenes())

      act(() => {
        result.current.parseFromText('a\nb\nc\nd\ne')
      })

      // Mark some statuses
      act(() => {
        result.current.updateScene('scene_1', { status: 'done' })
        result.current.updateScene('scene_2', { status: 'done' })
        result.current.updateScene('scene_3', { status: 'error' })
        result.current.updateScene('scene_4', { status: 'generating' })
        // scene_5 stays 'pending'
      })

      expect(result.current.getCompletedCount()).toBe(2)
      expect(result.current.getErrorCount()).toBe(1)
      expect(result.current.getErrorScenes()).toHaveLength(1)
      expect(result.current.getErrorScenes()[0].prompt).toBe('c')
      expect(result.current.getPendingScenes()).toHaveLength(1)
      expect(result.current.getPendingScenes()[0].prompt).toBe('e')
    })

    it('returns zeros for empty scenes', () => {
      const { result } = renderHook(() => useScenes())

      expect(result.current.getCompletedCount()).toBe(0)
      expect(result.current.getErrorCount()).toBe(0)
      expect(result.current.getErrorScenes()).toEqual([])
      expect(result.current.getPendingScenes()).toEqual([])
    })
  })
})
