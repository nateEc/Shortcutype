import { detectLocale, normalizeLocale, type Locale } from './i18n'
import type { SessionMode } from './progress'
import type { CategoryId, Platform, SpecialtyId } from './shortcuts'

export type Theme = 'dark' | 'light'
export type LearningMode = 'recall' | 'learn'

export type AppSettings = {
  version: 2
  platform: Platform
  mode: SessionMode
  category: CategoryId
  specialty: SpecialtyId
  duration: number
  count: number
  theme: Theme
  locale: Locale
  learning: LearningMode
  includeSystemCards: boolean
  motion: boolean
  sound: boolean
}

export const SETTINGS_KEY = 'shortcutype-settings-v2'
export const LEGACY_SETTINGS_KEY = 'shortcutype-settings-v1'

export function defaultSettings(): AppSettings {
  const mac = typeof navigator !== 'undefined' && navigator.platform.toLowerCase().includes('mac')
  return {
    version: 2, platform: mac ? 'mac' : 'windows', mode: 'fixed', category: 'editor',
    specialty: 'vscode', duration: 60, count: 25, theme: 'dark', locale: detectLocale(),
    learning: 'recall', includeSystemCards: false, motion: true, sound: false,
  }
}

export function loadSettings(): AppSettings {
  const fallback = defaultSettings()
  if (typeof window === 'undefined') return fallback
  for (const key of [SETTINGS_KEY, LEGACY_SETTINGS_KEY]) {
    try {
      const raw = window.localStorage.getItem(key)
      if (!raw) continue
      const value = JSON.parse(raw) as Partial<AppSettings>
      return {
        ...fallback, ...value, version: 2,
        locale: normalizeLocale(value.locale),
        learning: value.learning === 'learn' ? 'learn' : 'recall',
        includeSystemCards: Boolean(value.includeSystemCards),
        motion: value.motion !== false,
        sound: Boolean(value.sound),
      }
    } catch {
      // Try the legacy key or return safe defaults.
    }
  }
  return fallback
}
