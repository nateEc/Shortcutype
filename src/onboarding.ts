import type { ProgressState } from './progress'
import type { KeyCombo, Platform, Shortcut, SpecialtyId } from './shortcuts'

export const ONBOARDING_KEY = 'shortcutype-onboarding-v1'

export type OnboardingStage = 'intro' | 'teach' | 'imitate' | 'recall' | 'tools'
export type OnboardingStatus = 'new' | 'in-progress' | 'completed' | 'skipped'
export type ToolId = 'general' | 'vscode' | 'readline' | 'devtools' | 'git' | 'vim' | 'tmux' | 'emacs'

export type OnboardingState = {
  version: 1
  status: OnboardingStatus
  stage: OnboardingStage
  selectedTools: ToolId[]
  completedAt?: number
  skippedAt?: number
}

export type TutorialStep = {
  id: 'copy-teach' | 'find-imitate' | 'copy-recall'
  stage: 'teach' | 'imitate' | 'recall'
  action: 'Copy' | 'Find in file'
  shortcut: Shortcut
  revealAnswer: boolean
}

export const emptyOnboarding = (): OnboardingState => ({
  version: 1,
  status: 'new',
  stage: 'intro',
  selectedTools: ['general'],
})

export function loadOnboarding(): OnboardingState {
  if (typeof window === 'undefined') return emptyOnboarding()
  try {
    const raw = window.localStorage.getItem(ONBOARDING_KEY)
    if (!raw) return emptyOnboarding()
    return normalizeOnboarding(JSON.parse(raw))
  } catch {
    return emptyOnboarding()
  }
}

export function saveOnboarding(state: OnboardingState) {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(ONBOARDING_KEY, JSON.stringify(state))
  }
  return state
}

export function normalizeOnboarding(value: unknown): OnboardingState {
  if (!value || typeof value !== 'object') return emptyOnboarding()
  const candidate = value as Partial<OnboardingState>
  const statuses: OnboardingStatus[] = ['new', 'in-progress', 'completed', 'skipped']
  const stages: OnboardingStage[] = ['intro', 'teach', 'imitate', 'recall', 'tools']
  if (candidate.version !== 1 || !statuses.includes(candidate.status as OnboardingStatus)) {
    return emptyOnboarding()
  }
  return {
    version: 1,
    status: candidate.status as OnboardingStatus,
    stage: stages.includes(candidate.stage as OnboardingStage) ? candidate.stage as OnboardingStage : 'intro',
    selectedTools: normalizeTools(candidate.selectedTools),
    completedAt: finiteTimestamp(candidate.completedAt),
    skippedAt: finiteTimestamp(candidate.skippedAt),
  }
}

export function shouldAutoStartOnboarding(state: OnboardingState, progress: ProgressState) {
  if (state.status === 'completed' || state.status === 'skipped') return false
  if (state.status === 'in-progress') return true
  return !hasExistingActivity(progress)
}

export function hasExistingActivity(progress: ProgressState) {
  return progress.recentSessions.length > 0 || Object.keys(progress.shortcutStats).length > 0
}

export function startOnboarding(state = emptyOnboarding()): OnboardingState {
  return {
    ...state,
    status: 'in-progress',
    stage: 'intro',
    completedAt: undefined,
    skippedAt: undefined,
  }
}

export function advanceOnboarding(state: OnboardingState): OnboardingState {
  const next: Record<Exclude<OnboardingStage, 'tools'>, OnboardingStage> = {
    intro: 'teach', teach: 'imitate', imitate: 'recall', recall: 'tools',
  }
  return { ...state, status: 'in-progress', stage: state.stage === 'tools' ? 'tools' : next[state.stage] }
}

export function skipOnboarding(state: OnboardingState, at = Date.now()): OnboardingState {
  return { ...state, status: 'skipped', stage: 'intro', skippedAt: at }
}

export function completeOnboarding(
  state: OnboardingState,
  selectedTools: ToolId[],
  at = Date.now(),
): OnboardingState {
  return {
    ...state,
    status: 'completed',
    stage: 'tools',
    selectedTools: normalizeTools(selectedTools),
    completedAt: at,
    skippedAt: undefined,
  }
}

export function toggleTool(tools: ToolId[], tool: ToolId): ToolId[] {
  if (tool === 'general') return ['general'] as ToolId[]
  const withoutGeneral = tools.filter((item) => item !== 'general')
  const next = withoutGeneral.includes(tool)
    ? withoutGeneral.filter((item) => item !== tool)
    : [...withoutGeneral, tool]
  return next.length ? next : ['general']
}

export function toolToSpecialty(tool: ToolId): SpecialtyId {
  return tool === 'general' ? 'core' : tool
}

export function getTutorialSteps(platform: Platform): TutorialStep[] {
  const modifier: KeyCombo['modifiers'] = platform === 'mac' ? ['meta'] : ['control']
  return [
    tutorialStep('copy-teach', 'teach', 'Copy', modifier, 'c', platform, true),
    tutorialStep('find-imitate', 'imitate', 'Find in file', modifier, 'f', platform, true),
    tutorialStep('copy-recall', 'recall', 'Copy', modifier, 'c', platform, false),
  ]
}

export function tutorialStepForStage(platform: Platform, stage: OnboardingStage) {
  return getTutorialSteps(platform).find((step) => step.stage === stage)
}

function tutorialStep(
  id: TutorialStep['id'],
  stage: TutorialStep['stage'],
  action: TutorialStep['action'],
  modifiers: KeyCombo['modifiers'],
  key: string,
  platform: Platform,
  revealAnswer: boolean,
): TutorialStep {
  return {
    id, stage, action, revealAnswer,
    shortcut: {
      id: `onboarding-${platform}-${id}`,
      platform,
      category: 'text',
      specialty: 'core',
      action,
      keys: { modifiers, key },
      capture: 'native',
    },
  }
}

function normalizeTools(value: unknown): ToolId[] {
  const valid: ToolId[] = ['general', 'vscode', 'readline', 'devtools', 'git', 'vim', 'tmux', 'emacs']
  if (!Array.isArray(value)) return ['general']
  const unique = [...new Set(value.filter((item): item is ToolId => valid.includes(item as ToolId)))]
  if (!unique.length || unique.includes('general')) return ['general']
  return unique
}

function finiteTimestamp(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : undefined
}
