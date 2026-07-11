import type { Shortcut } from './shortcuts'

export type SchedulerStat = {
  attempts: number
  correct: number
  wrong: number
  close: number
  skipped: number
  streak?: number
  lastPracticed?: number
}

export type ScheduledShortcut = {
  shortcut: Shortcut
  reason: 'new' | 'weak' | 'due' | 'coverage'
}

export function buildAdaptiveQueue(
  pool: Shortcut[],
  stats: Record<string, SchedulerStat>,
  size: number,
  seed = Date.now(),
  now = Date.now(),
): ScheduledShortcut[] {
  if (!pool.length || size <= 0) return []
  const random = seededRandom(seed)
  const ranked = pool.map((shortcut) => {
    const stat = stats[shortcut.id]
    const attempts = stat?.attempts ?? 0
    const misses = (stat?.wrong ?? 0) + (stat?.close ?? 0) * 0.65 + (stat?.skipped ?? 0)
    const accuracy = attempts ? (stat?.correct ?? 0) / attempts : 0.72
    const ageDays = stat?.lastPracticed
      ? Math.max(0, (now - stat.lastPracticed) / 86_400_000)
      : 30
    const novelty = attempts === 0 ? 2.5 : 0
    const weakness = Math.max(0, 1 - accuracy) * 4 + misses / Math.max(1, attempts)
    const due = Math.min(2.5, ageDays / Math.max(1, 2 + (stat?.streak ?? 0)))
    return { shortcut, score: 1 + novelty + weakness + due, stat, ageDays }
  })

  const queue: ScheduledShortcut[] = []
  let previousId = ''
  for (let index = 0; index < size; index += 1) {
    const eligible = ranked.filter((item) => item.shortcut.id !== previousId || ranked.length === 1)
    const total = eligible.reduce((sum, item) => sum + item.score, 0)
    let cursor = random() * total
    let selected = eligible[eligible.length - 1]
    for (const item of eligible) {
      cursor -= item.score
      if (cursor <= 0) {
        selected = item
        break
      }
    }
    previousId = selected.shortcut.id
    queue.push({ shortcut: selected.shortcut, reason: getReason(selected.stat, selected.ageDays) })
  }
  return queue
}

function getReason(stat: SchedulerStat | undefined, ageDays: number): ScheduledShortcut['reason'] {
  if (!stat || stat.attempts === 0) return 'new'
  const misses = stat.wrong + stat.close + stat.skipped
  if (misses > 0 && stat.correct / Math.max(1, stat.attempts) < 0.8) return 'weak'
  if (ageDays >= 3) return 'due'
  return 'coverage'
}

function seededRandom(seed: number) {
  let value = seed >>> 0
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0
    return value / 0x1_0000_0000
  }
}
