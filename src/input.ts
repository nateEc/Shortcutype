import {
  comboSignature,
  shortcutSequence,
  sortModifiers,
  type KeyCombo,
  type Platform,
  type Shortcut,
} from './shortcuts'

export type ComboVerdict = 'exact' | 'partial' | 'close' | 'wrong'
export type ShortcutPracticePolicy = 'native' | 'unscored-card' | 'excluded'

export function shortcutPracticePolicy(
  shortcut: Shortcut,
  includeSystemCards: boolean,
): ShortcutPracticePolicy {
  if (shortcut.capture === 'native') return 'native'
  return includeSystemCards ? 'unscored-card' : 'excluded'
}

export function comboFromKeyboardEvent(
  event: Pick<
    KeyboardEvent,
    'key' | 'code' | 'metaKey' | 'ctrlKey' | 'altKey' | 'shiftKey'
  >,
  platform: Platform,
): KeyCombo | null {
  const key = normalizeKey(event)
  if (!key || isModifierKey(key)) return null

  const modifiers: KeyCombo['modifiers'] = []
  if (event.metaKey) modifiers.push('meta')
  if (event.ctrlKey) modifiers.push('control')
  if (event.altKey) modifiers.push('alt')
  if (event.shiftKey) modifiers.push('shift')

  return { key, modifiers: sortModifiers(platform, modifiers) }
}

export function expectedSequences(shortcut: Shortcut): KeyCombo[][] {
  const primary = shortcutSequence(shortcut)
  return shortcut.aliases?.length
    ? [primary, ...shortcut.aliases.map((alias) => [alias])]
    : [primary]
}

export function eventMatchesExpectedStep(
  shortcut: Shortcut,
  bufferLength: number,
  event: Pick<KeyboardEvent, 'key' | 'code' | 'metaKey' | 'ctrlKey' | 'altKey' | 'shiftKey'>,
  platform: Platform,
) {
  const combo = comboFromKeyboardEvent(event, platform)
  if (!combo) return false
  return expectedSequences(shortcut).some((sequence) => {
    const target = sequence[bufferLength]
    return target && comboSignature(target, platform) === comboSignature(combo, platform)
  })
}

export function evaluateSequence(
  shortcut: Shortcut,
  buffer: KeyCombo[],
  platform: Platform,
): ComboVerdict {
  const expected = expectedSequences(shortcut)
  if (expected.some((sequence) => sequencesEqual(sequence, buffer, platform))) {
    return 'exact'
  }
  if (expected.some((sequence) => sequenceStartsWith(sequence, buffer, platform))) {
    return 'partial'
  }

  const step = Math.max(0, buffer.length - 1)
  return expected.some((sequence) => sequence[step]?.key === buffer[step]?.key)
    ? 'close'
    : 'wrong'
}

export function describeMismatch(
  shortcut: Shortcut,
  pressed: KeyCombo,
  platform: Platform,
  step = 0,
) {
  const sequence = expectedSequences(shortcut)[0]
  const target = sequence[Math.min(Math.max(0, step), sequence.length - 1)]
  if (target.key !== pressed.key) return 'key' as const
  const expected = comboSignature(target, platform)
  const actual = comboSignature(pressed, platform)
  return expected === actual ? ('none' as const) : ('modifiers' as const)
}

export function sequencesEqual(
  expected: KeyCombo[],
  actual: KeyCombo[],
  platform: Platform,
) {
  return (
    expected.length === actual.length &&
    expected.every(
      (combo, index) =>
        comboSignature(combo, platform) === comboSignature(actual[index], platform),
    )
  )
}

export function sequenceStartsWith(
  expected: KeyCombo[],
  actual: KeyCombo[],
  platform: Platform,
) {
  return (
    actual.length < expected.length &&
    actual.every(
      (combo, index) =>
        comboSignature(combo, platform) === comboSignature(expected[index], platform),
    )
  )
}

export function normalizeKey(
  event: Pick<KeyboardEvent, 'key' | 'code'>,
): string | null {
  const byCode: Record<string, string> = {
    Space: 'space', Tab: 'tab', Enter: 'enter', Escape: 'escape',
    Backspace: 'backspace', Delete: 'delete', ArrowLeft: 'arrowleft',
    ArrowRight: 'arrowright', ArrowUp: 'arrowup', ArrowDown: 'arrowdown',
    Home: 'home', End: 'end', PageUp: 'pageup', PageDown: 'pagedown',
    Backquote: '`', Slash: '/', Period: '.', Comma: ',', Minus: '-',
    Equal: '=', BracketLeft: '[', BracketRight: ']', Semicolon: ';',
    Quote: "'", Backslash: '\\', F1: 'f1', F2: 'f2', F5: 'f5',
  }
  if (byCode[event.code]) return byCode[event.code]
  const key = event.key.toLowerCase()
  if (key === ' ') return 'space'
  if (key.length === 1 || /^f\d{1,2}$/.test(key)) return key
  return key || null
}

function isModifierKey(key: string) {
  return ['meta', 'control', 'alt', 'shift'].includes(key)
}
