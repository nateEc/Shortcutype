import type { CategoryId, KeyCombo, Platform, SpecialtyId } from './shortcuts'

export type ShortcutOutcome = 'correct' | 'wrong' | 'close' | 'skipped' | 'revealed' | 'reviewed'
export type SessionMode = 'timed' | 'fixed' | 'category' | 'specialty' | 'weak'

export type ShortcutStat = {
  attempts: number
  correct: number
  wrong: number
  close: number
  skipped: number
  revealed: number
  streak: number
  lastOutcome?: ShortcutOutcome
  lastPracticed?: number
}

export type DrillEvent = {
  atMs: number
  shortcutId: string
  action: string
  outcome: ShortcutOutcome
  reason: 'new' | 'weak' | 'due' | 'coverage'
  pressed?: KeyCombo[]
  revealed?: boolean
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
  revealed: number
  accuracy: number
  spm: number
  bestStreak: number
  score: number
  events: DrillEvent[]
}

export type ProgressState = {
  version: 2
  bestStreak: number
  bestScore: number
  shortcutStats: Record<string, ShortcutStat>
  recentSessions: SessionRecord[]
}

type LegacyProgress = Omit<ProgressState, 'version' | 'shortcutStats' | 'recentSessions'> & {
  version: 1
  shortcutStats?: Record<string, Partial<ShortcutStat>>
  recentSessions?: Array<Partial<SessionRecord> & { id: string; date: number }>
}

export const PROGRESS_KEY = 'shortcutype-progress-v2'
export const LEGACY_PROGRESS_KEY = 'shortcutype-progress-v1'
const MAX_SESSIONS = 20

export const emptyProgress = (): ProgressState => ({
  version: 2,
  bestStreak: 0,
  bestScore: 0,
  shortcutStats: {},
  recentSessions: [],
})

export function migrateProgress(value: unknown): ProgressState {
  if (!value || typeof value !== 'object') return emptyProgress()
  const candidate = value as Partial<ProgressState> & Partial<LegacyProgress>
  if (candidate.version !== 1 && candidate.version !== 2) return emptyProgress()

  const stats = Object.fromEntries(
    Object.entries(candidate.shortcutStats ?? {}).map(([id, stat]) => [
      id,
      normalizeStat(stat),
    ]),
  )
  const recentSessions = Array.isArray(candidate.recentSessions)
    ? candidate.recentSessions
        .filter((session) =>
          Boolean(session && typeof session.id === 'string' && typeof session.date === 'number'),
        )
        .slice(0, MAX_SESSIONS)
        .map((session) => normalizeSession(session as Partial<SessionRecord> & { id: string; date: number }))
    : []

  return {
    version: 2,
    bestStreak: finite(candidate.bestStreak),
    bestScore: finite(candidate.bestScore),
    shortcutStats: stats,
    recentSessions,
  }
}

export function loadProgress(): ProgressState {
  if (typeof window === 'undefined') return emptyProgress()
  for (const key of [PROGRESS_KEY, LEGACY_PROGRESS_KEY]) {
    try {
      const raw = window.localStorage.getItem(key)
      if (!raw) continue
      const migrated = migrateProgress(JSON.parse(raw))
      if (key === LEGACY_PROGRESS_KEY) saveProgress(migrated)
      return migrated
    } catch {
      // Try the legacy key or return a clean state.
    }
  }
  return emptyProgress()
}

export function saveProgress(progress: ProgressState) {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress))
  }
}

export function getShortcutAccuracy(stat?: ShortcutStat) {
  if (!stat || stat.attempts === 0) return null
  return Math.round((stat.correct / stat.attempts) * 100)
}

export function getWeakShortcutIds(progress: ProgressState) {
  return Object.entries(progress.shortcutStats)
    .filter(([, stat]) => stat.attempts >= 2 && (getShortcutAccuracy(stat) ?? 100) < 80)
    .sort(([, a], [, b]) => (getShortcutAccuracy(a) ?? 101) - (getShortcutAccuracy(b) ?? 101))
    .map(([id]) => id)
}

export function recordShortcutOutcome(
  progress: ProgressState,
  shortcutId: string,
  outcome: ShortcutOutcome,
  at = Date.now(),
): ProgressState {
  const current = progress.shortcutStats[shortcutId] ?? normalizeStat({})
  const scored = ['correct', 'wrong', 'close'].includes(outcome)
  const next: ShortcutStat = {
    ...current,
    attempts: current.attempts + (scored ? 1 : 0),
    correct: current.correct + (outcome === 'correct' ? 1 : 0),
    wrong: current.wrong + (outcome === 'wrong' ? 1 : 0),
    close: current.close + (outcome === 'close' ? 1 : 0),
    skipped: current.skipped + (outcome === 'skipped' ? 1 : 0),
    revealed: current.revealed + (outcome === 'revealed' ? 1 : 0),
    streak: outcome === 'correct' ? current.streak + 1 : scored ? 0 : current.streak,
    lastOutcome: outcome,
    lastPracticed: at,
  }
  const updated: ProgressState = {
    ...progress,
    bestStreak: Math.max(progress.bestStreak, next.streak),
    shortcutStats: { ...progress.shortcutStats, [shortcutId]: next },
  }
  saveProgress(updated)
  return updated
}

export function recordSession(progress: ProgressState, session: SessionRecord) {
  const updated: ProgressState = {
    ...progress,
    bestStreak: Math.max(progress.bestStreak, session.bestStreak),
    bestScore: Math.max(progress.bestScore, session.score),
    recentSessions: [session, ...progress.recentSessions]
      .filter((item, index, all) => all.findIndex((candidate) => candidate.id === item.id) === index)
      .slice(0, MAX_SESSIONS),
  }
  saveProgress(updated)
  return updated
}

function normalizeStat(stat: Partial<ShortcutStat>): ShortcutStat {
  return {
    attempts: finite(stat.attempts), correct: finite(stat.correct),
    wrong: finite(stat.wrong), close: finite(stat.close), skipped: finite(stat.skipped),
    revealed: finite(stat.revealed), streak: finite(stat.streak),
    lastOutcome: stat.lastOutcome, lastPracticed: finite(stat.lastPracticed) || undefined,
  }
}

function normalizeSession(session: Partial<SessionRecord> & { id: string; date: number }): SessionRecord {
  return {
    id: session.id, date: session.date, platform: session.platform ?? 'mac',
    mode: session.mode ?? 'fixed', category: session.category, specialty: session.specialty,
    durationSec: Math.max(1, finite(session.durationSec)), correct: finite(session.correct),
    attempts: finite(session.attempts), wrong: finite(session.wrong), close: finite(session.close),
    skipped: finite(session.skipped), revealed: finite(session.revealed),
    accuracy: finite(session.accuracy), spm: finite(session.spm),
    bestStreak: finite(session.bestStreak), score: finite(session.score),
    events: Array.isArray(session.events) ? session.events : [],
  }
}

function finite(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : 0
}
