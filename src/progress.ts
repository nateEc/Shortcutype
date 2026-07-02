import type { CategoryId, Platform, SpecialtyId } from './shortcuts'

export type ShortcutOutcome = 'correct' | 'wrong' | 'close' | 'skipped'

export type SessionMode = 'timed' | 'fixed' | 'category' | 'specialty' | 'weak'

export type ShortcutStat = {
  attempts: number
  correct: number
  wrong: number
  close: number
  skipped: number
  lastOutcome?: ShortcutOutcome
  lastPracticed?: number
}

export type SessionRecord = {
  id: string
  date: number
  platform: Platform
  mode: SessionMode
  category?: CategoryId
  specialty?: SpecialtyId
  durationSec: number
  correct: number
  attempts: number
  wrong: number
  close: number
  skipped: number
  accuracy: number
  spm: number
  bestStreak: number
  score: number
}

export type ProgressState = {
  version: 1
  bestStreak: number
  bestScore: number
  shortcutStats: Record<string, ShortcutStat>
  recentSessions: SessionRecord[]
}

const STORAGE_KEY = 'shortcutype-progress-v1'
const MAX_SESSIONS = 12

const emptyProgress = (): ProgressState => ({
  version: 1,
  bestStreak: 0,
  bestScore: 0,
  shortcutStats: {},
  recentSessions: [],
})

export function loadProgress(): ProgressState {
  if (typeof window === 'undefined') {
    return emptyProgress()
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return emptyProgress()
    }

    const parsed = JSON.parse(raw) as ProgressState
    if (parsed.version !== 1) {
      return emptyProgress()
    }

    return {
      ...emptyProgress(),
      ...parsed,
      shortcutStats: parsed.shortcutStats ?? {},
      recentSessions: parsed.recentSessions ?? [],
    }
  } catch {
    return emptyProgress()
  }
}

export function saveProgress(progress: ProgressState) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(progress))
}

export function getShortcutAccuracy(stat?: ShortcutStat) {
  if (!stat) {
    return null
  }

  const total = stat.attempts + stat.skipped
  if (total === 0) {
    return null
  }

  return Math.round((stat.correct / total) * 100)
}

export function getWeakShortcutIds(progress: ProgressState) {
  return Object.entries(progress.shortcutStats)
    .filter(([, stat]) => {
      const total = stat.attempts + stat.skipped
      const accuracy = getShortcutAccuracy(stat)
      return total >= 2 && accuracy !== null && accuracy < 80
    })
    .sort(([, a], [, b]) => {
      const aAccuracy = getShortcutAccuracy(a) ?? 101
      const bAccuracy = getShortcutAccuracy(b) ?? 101
      return aAccuracy - bAccuracy
    })
    .map(([id]) => id)
}

export function recordShortcutOutcome(
  progress: ProgressState,
  shortcutId: string,
  outcome: ShortcutOutcome,
): ProgressState {
  const current = progress.shortcutStats[shortcutId] ?? {
    attempts: 0,
    correct: 0,
    wrong: 0,
    close: 0,
    skipped: 0,
  }

  const next: ShortcutStat = {
    ...current,
    attempts: outcome === 'skipped' ? current.attempts : current.attempts + 1,
    correct: outcome === 'correct' ? current.correct + 1 : current.correct,
    wrong: outcome === 'wrong' ? current.wrong + 1 : current.wrong,
    close: outcome === 'close' ? current.close + 1 : current.close,
    skipped: outcome === 'skipped' ? current.skipped + 1 : current.skipped,
    lastOutcome: outcome,
    lastPracticed: Date.now(),
  }

  const updated = {
    ...progress,
    shortcutStats: {
      ...progress.shortcutStats,
      [shortcutId]: next,
    },
  }

  saveProgress(updated)
  return updated
}

export function recordSession(
  progress: ProgressState,
  session: SessionRecord,
): ProgressState {
  const updated = {
    ...progress,
    bestStreak: Math.max(progress.bestStreak, session.bestStreak),
    bestScore: Math.max(progress.bestScore, session.score),
    recentSessions: [session, ...progress.recentSessions].slice(0, MAX_SESSIONS),
  }

  saveProgress(updated)
  return updated
}
