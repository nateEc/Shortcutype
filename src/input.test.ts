import { describe, expect, it } from 'vitest'
import { comboFromKeyboardEvent, describeMismatch, evaluateSequence, eventMatchesExpectedStep, normalizeKey, shortcutPracticePolicy } from './input'
import type { Shortcut } from './shortcuts'

const shortcut: Shortcut = {
  id: 'test', platform: 'mac', category: 'editor', action: 'Test',
  keys: { modifiers: ['control'], key: 'b' },
  sequence: [
    { modifiers: ['control'], key: 'b' },
    { modifiers: [], key: 'c' },
  ],
  aliases: [{ modifiers: ['meta'], key: 'k' }],
  capture: 'native',
}

describe('keyboard input', () => {
  it('normalizes physical and printable keys', () => {
    expect(normalizeKey({ code: 'Space', key: ' ' })).toBe('space')
    expect(normalizeKey({ code: 'KeyA', key: 'A' })).toBe('a')
    expect(comboFromKeyboardEvent({ code: 'KeyB', key: 'b', metaKey: false, ctrlKey: true, altKey: false, shiftKey: true }, 'mac'))
      .toEqual({ key: 'b', modifiers: ['control', 'shift'] })
  })

  it('distinguishes partial, exact, close, wrong, and alias input', () => {
    expect(evaluateSequence(shortcut, [{ modifiers: ['control'], key: 'b' }], 'mac')).toBe('partial')
    expect(evaluateSequence(shortcut, [{ modifiers: ['control'], key: 'b' }, { modifiers: [], key: 'c' }], 'mac')).toBe('exact')
    expect(evaluateSequence(shortcut, [{ modifiers: ['shift'], key: 'b' }], 'mac')).toBe('close')
    expect(evaluateSequence(shortcut, [{ modifiers: [], key: 'x' }], 'mac')).toBe('wrong')
    expect(evaluateSequence(shortcut, [{ modifiers: ['meta'], key: 'k' }], 'mac')).toBe('exact')
  })

  it('never scores system-owned shortcuts as native browser input', () => {
    const systemOwned = { ...shortcut, capture: 'simulated' as const }
    expect(shortcutPracticePolicy(systemOwned, false)).toBe('excluded')
    expect(shortcutPracticePolicy(systemOwned, true)).toBe('unscored-card')
    expect(shortcutPracticePolicy(shortcut, false)).toBe('native')
  })

  it('lets a reserved app command act as the current training answer', () => {
    const escapeShortcut: Shortcut = { ...shortcut, keys: { modifiers: [], key: 'escape' }, sequence: undefined, aliases: undefined }
    expect(eventMatchesExpectedStep(escapeShortcut, 0, {
      key: 'Escape', code: 'Escape', metaKey: false, ctrlKey: false, altKey: false, shiftKey: false,
    }, 'mac')).toBe(true)

    const paletteShortcut: Shortcut = { ...shortcut, keys: { modifiers: ['meta', 'shift'], key: 'p' }, sequence: undefined, aliases: undefined }
    expect(eventMatchesExpectedStep(paletteShortcut, 0, {
      key: 'p', code: 'KeyP', metaKey: true, ctrlKey: false, altKey: false, shiftKey: true,
    }, 'mac')).toBe(true)
  })

  it('describes a mistake against the current step of a multi-step shortcut', () => {
    expect(describeMismatch(shortcut, { modifiers: ['shift'], key: 'c' }, 'mac', 1)).toBe('modifiers')
    expect(describeMismatch(shortcut, { modifiers: [], key: 'x' }, 'mac', 1)).toBe('key')
  })
})
