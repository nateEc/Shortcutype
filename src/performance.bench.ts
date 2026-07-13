import { bench, describe } from 'vitest'
import { evaluateSequence } from './input'
import { buildAdaptiveQueue } from './scheduler'
import { getShortcuts, shortcutSequence } from './shortcuts'

const shortcuts = getShortcuts('mac').filter((shortcut) => shortcut.capture === 'native')
const shortcut = shortcuts.find((item) => shortcutSequence(item).length > 1) ?? shortcuts[0]
const answer = shortcutSequence(shortcut)

describe('practice hot paths', () => {
  bench('schedule 100 prompts from the full native pool', () => {
    buildAdaptiveQueue(shortcuts, {}, 100, 42, 1_700_000_000_000)
  })

  bench('evaluate a complete shortcut sequence', () => {
    evaluateSequence(shortcut, answer, 'mac')
  })
})
