import { beforeEach, describe, expect, it } from 'vitest'
import { LEGACY_SETTINGS_KEY, loadSettings, normalizeSettings, SETTINGS_KEY, type AppSettings } from './settings'

const fallback: AppSettings = {
  version: 2, platform: 'mac', mode: 'fixed', category: 'editor', specialty: 'vscode',
  duration: 60, count: 25, theme: 'dark', locale: 'zh-CN', learning: 'recall',
  includeSystemCards: false, motion: true, sound: false,
}

describe('settings normalization', () => {
  beforeEach(() => localStorage.clear())

  it('rejects unknown enum values instead of creating an empty or invalid session', () => {
    expect(normalizeSettings({
      platform: 'linux', mode: 'surprise', category: 'missing', specialty: 'missing',
      theme: 'neon', locale: 'fr',
    }, fallback)).toMatchObject({
      platform: 'mac', mode: 'fixed', category: 'editor', specialty: 'vscode',
      theme: 'dark', locale: 'en',
    })
  })

  it('rejects unsupported lengths and preserves detected locale when locale is absent', () => {
    expect(normalizeSettings({ duration: -1, count: 0, locale: 42 }, fallback)).toMatchObject({
      duration: 60, count: 25, locale: 'zh-CN',
    })
    expect(normalizeSettings({ duration: 300, count: 50 }, fallback)).toMatchObject({
      duration: 300, count: 50,
    })
  })

  it('uses valid legacy settings when the current key has an unknown version', () => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({ version: 99, platform: 'windows' }))
    localStorage.setItem(LEGACY_SETTINGS_KEY, JSON.stringify({ platform: 'mac', locale: 'zh-CN' }))
    expect(loadSettings()).toMatchObject({ version: 2, platform: 'mac', locale: 'zh-CN' })
  })
})
