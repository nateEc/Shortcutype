import { describe, expect, it } from 'vitest'
import { buildAdaptiveQueue } from './scheduler'
import type { Shortcut } from './shortcuts'

const makeShortcut = (id: string): Shortcut => ({
  id, platform: 'mac', category: 'editor', action: id,
  keys: { modifiers: ['meta'], key: id }, capture: 'native',
})

describe('adaptive scheduler', () => {
  const pool = ['a', 'b', 'c'].map(makeShortcut)

  it('is deterministic for a seed and avoids immediate repeats', () => {
    const one = buildAdaptiveQueue(pool, {}, 20, 42, 1_000)
    const two = buildAdaptiveQueue(pool, {}, 20, 42, 1_000)
    expect(one.map((item) => item.shortcut.id)).toEqual(two.map((item) => item.shortcut.id))
    expect(one.every((item, index) => index === 0 || item.shortcut.id !== one[index - 1].shortcut.id)).toBe(true)
  })

  it('brings weak shortcuts back more often and explains why', () => {
    const stats = {
      a: { attempts: 10, correct: 2, wrong: 7, close: 1, skipped: 0, lastPracticed: 900 },
      b: { attempts: 10, correct: 10, wrong: 0, close: 0, skipped: 0, streak: 10, lastPracticed: 900 },
    }
    const queue = buildAdaptiveQueue(pool, stats, 200, 7, 1_000)
    const aCount = queue.filter((item) => item.shortcut.id === 'a').length
    const bCount = queue.filter((item) => item.shortcut.id === 'b').length
    expect(aCount).toBeGreaterThan(bCount)
    expect(queue.find((item) => item.shortcut.id === 'a')?.reason).toBe('weak')
    expect(queue.find((item) => item.shortcut.id === 'c')?.reason).toBe('new')
  })
})
