import { beforeEach, describe, expect, it } from 'vitest'
import { LEGACY_PROGRESS_KEY, PROGRESS_KEY, loadProgress, migrateProgress } from './progress'

describe('progress migration', () => {
  beforeEach(() => localStorage.clear())

  it('migrates v1 stats and sessions without losing totals', () => {
    const migrated = migrateProgress({
      version: 1, bestStreak: 4, bestScore: 200,
      shortcutStats: { a: { attempts: 3, correct: 2, wrong: 1, close: 0, skipped: 0 } },
      recentSessions: [{ id: 'old', date: 10, correct: 2, attempts: 3, accuracy: 67 }],
    })
    expect(migrated.version).toBe(2)
    expect(migrated.shortcutStats.a).toMatchObject({ attempts: 3, correct: 2, revealed: 0, streak: 0 })
    expect(migrated.recentSessions[0]).toMatchObject({ id: 'old', correct: 2, events: [] })
  })

  it('falls back from corrupt current data and persists a valid legacy migration', () => {
    localStorage.setItem(PROGRESS_KEY, '{broken')
    localStorage.setItem(LEGACY_PROGRESS_KEY, JSON.stringify({ version: 1, bestStreak: 2, bestScore: 0, shortcutStats: {}, recentSessions: [] }))
    expect(loadProgress().bestStreak).toBe(2)
    expect(JSON.parse(localStorage.getItem(PROGRESS_KEY) ?? '{}').version).toBe(2)
  })

  it('does not let an unknown current version hide valid legacy progress', () => {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify({ version: 99, bestStreak: 0 }))
    localStorage.setItem(LEGACY_PROGRESS_KEY, JSON.stringify({ version: 1, bestStreak: 7, bestScore: 0, shortcutStats: {}, recentSessions: [] }))
    expect(loadProgress().bestStreak).toBe(7)
  })

  it('drops sessions with invalid dates before they can crash history formatting', () => {
    const migrated = migrateProgress({
      version: 2, bestStreak: 0, bestScore: 0, shortcutStats: {},
      recentSessions: [
        { id: 'valid', date: 10 },
        { id: 'infinite', date: Infinity },
        { id: 'negative', date: -1 },
      ],
    })
    expect(migrated.recentSessions.map((session) => session.id)).toEqual(['valid'])
  })

  it('normalizes null shortcut stats instead of crashing migration', () => {
    const migrated = migrateProgress({
      version: 2, bestStreak: 0, bestScore: 0, shortcutStats: { damaged: null }, recentSessions: [],
    })
    expect(migrated.shortcutStats.damaged).toMatchObject({ attempts: 0, correct: 0, streak: 0 })
  })
})
