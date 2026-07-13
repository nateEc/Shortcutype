import { detectLocale, normalizeLocale, type Locale } from './i18n'
import type { SessionMode } from './progress'
import { categories, platforms, specialties, type CategoryId, type Platform, type SpecialtyId } from './shortcuts'
import { readStorage } from './storage'

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
      const raw = readStorage(key)
      if (!raw) continue
      const parsed = JSON.parse(raw) as { version?: unknown }
      if (key === SETTINGS_KEY && parsed?.version !== 2) continue
      if (key === LEGACY_SETTINGS_KEY && parsed?.version !== undefined && parsed.version !== 1) continue
      return normalizeSettings(parsed, fallback)
    } catch {
      // Try the legacy key or return safe defaults.
    }
  }
  return fallback
}

export function normalizeSettings(value: unknown, fallback = defaultSettings()): AppSettings {
  if (!value || typeof value !== 'object') return fallback
  const candidate = value as Partial<AppSettings>
  const platformIds = platforms.map((item) => item.id)
  const categoryIds = categories.map((item) => item.id)
  const specialtyIds = specialties.map((item) => item.id)
  const modes: SessionMode[] = ['timed', 'fixed', 'category', 'specialty', 'weak']
  return {
    version: 2,
    platform: platformIds.includes(candidate.platform as Platform) ? candidate.platform as Platform : fallback.platform,
    mode: modes.includes(candidate.mode as SessionMode) ? candidate.mode as SessionMode : fallback.mode,
    category: categoryIds.includes(candidate.category as CategoryId) ? candidate.category as CategoryId : fallback.category,
    specialty: specialtyIds.includes(candidate.specialty as SpecialtyId) ? candidate.specialty as SpecialtyId : fallback.specialty,
    duration: [30, 60, 120, 300].includes(candidate.duration as number) ? candidate.duration as number : fallback.duration,
    count: [10, 25, 50].includes(candidate.count as number) ? candidate.count as number : fallback.count,
    theme: candidate.theme === 'light' || candidate.theme === 'dark' ? candidate.theme : fallback.theme,
    locale: typeof candidate.locale === 'string' ? normalizeLocale(candidate.locale) : fallback.locale,
    learning: candidate.learning === 'learn' ? 'learn' : 'recall',
    includeSystemCards: candidate.includeSystemCards === true,
    motion: candidate.motion !== false,
    sound: candidate.sound === true,
  }
}
