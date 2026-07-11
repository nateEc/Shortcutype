import { beforeEach, describe, expect, it } from 'vitest'
import {
  ONBOARDING_KEY,
  advanceOnboarding,
  completeOnboarding,
  emptyOnboarding,
  getTutorialSteps,
  loadOnboarding,
  normalizeOnboarding,
  shouldAutoStartOnboarding,
  skipOnboarding,
  startOnboarding,
  toggleTool,
} from './onboarding'
import { emptyProgress } from './progress'

describe('first success onboarding domain', () => {
  beforeEach(() => localStorage.clear())

  it('auto-starts only for genuinely new users', () => {
    expect(shouldAutoStartOnboarding(emptyOnboarding(), emptyProgress())).toBe(true)
    const existing = emptyProgress()
    existing.shortcutStats.known = {
      attempts: 1, correct: 1, wrong: 0, close: 0, skipped: 0, revealed: 0, streak: 1,
    }
    expect(shouldAutoStartOnboarding(emptyOnboarding(), existing)).toBe(false)
    expect(shouldAutoStartOnboarding(startOnboarding(), existing)).toBe(true)
  })

  it('moves through teach, imitate, recall, and tools', () => {
    let state = startOnboarding()
    expect(state.stage).toBe('intro')
    for (const expected of ['teach', 'imitate', 'recall', 'tools']) {
      state = advanceOnboarding(state)
      expect(state.stage).toBe(expected)
    }
    const complete = completeOnboarding(state, ['vscode', 'git'], 100)
    expect(complete).toMatchObject({ status: 'completed', selectedTools: ['vscode', 'git'], completedAt: 100 })
    expect(skipOnboarding(startOnboarding(), 50)).toMatchObject({ status: 'skipped', skippedAt: 50 })
  })

  it('recovers safely from corrupt or invalid local state', () => {
    localStorage.setItem(ONBOARDING_KEY, '{broken')
    expect(loadOnboarding()).toEqual(emptyOnboarding())
    expect(normalizeOnboarding({ version: 9, status: 'completed' })).toEqual(emptyOnboarding())
  })

  it('uses platform-correct safe tutorial chords', () => {
    const mac = getTutorialSteps('mac')
    const windows = getTutorialSteps('windows')
    expect(mac.map((step) => step.action)).toEqual(['Copy', 'Find in file', 'Copy'])
    expect(mac[0].shortcut.keys.modifiers).toEqual(['meta'])
    expect(windows[0].shortcut.keys.modifiers).toEqual(['control'])
    expect(mac[2].revealAnswer).toBe(false)
  })

  it('keeps general exclusive and persists focused tool selections', () => {
    expect(toggleTool(['general'], 'vscode')).toEqual(['vscode'])
    expect(toggleTool(['vscode'], 'git')).toEqual(['vscode', 'git'])
    expect(toggleTool(['vscode', 'git'], 'general')).toEqual(['general'])
  })
})
