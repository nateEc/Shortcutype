import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import './App.css'
import {
  categoryName,
  localeOptions,
  shortcutAction,
  specialtyName,
  type Locale,
} from './i18n'
import { comboFromKeyboardEvent, describeMismatch, evaluateSequence, eventMatchesExpectedStep, shortcutPracticePolicy } from './input'
import {
  getWeakShortcutIds,
  loadProgress,
  recordSession,
  recordShortcutOutcome,
  type DrillEvent,
  type ProgressState,
  type SessionMode,
  type SessionRecord,
  type ShortcutOutcome,
} from './progress'
import { buildAdaptiveQueue, type ScheduledShortcut } from './scheduler'
import { loadSettings, SETTINGS_KEY, type AppSettings, type LearningMode, type Theme } from './settings'
import {
  categories,
  formatCombo,
  getShortcuts,
  platforms,
  shortcutSequence,
  shortcutSpecialty,
  specialties,
  type CategoryId,
  type KeyCombo,
  type Platform,
  type Shortcut,
  type SpecialtyId,
} from './shortcuts'
import { getCopy } from './ui-copy'
import {
  advanceOnboarding,
  completeOnboarding,
  loadOnboarding,
  saveOnboarding,
  shouldAutoStartOnboarding,
  skipOnboarding,
  startOnboarding,
  toolToSpecialty,
  type ToolId,
} from './onboarding'
import { OnboardingExperience } from './components/OnboardingExperience'
import { ReadyHome } from './components/ReadyHome'
import { clearStorageFailure, hasStorageFailure, STORAGE_ERROR_EVENT, writeStorage } from './storage'

type Panel = 'settings' | 'library' | 'history' | null
type Phase = 'ready' | 'running' | 'paused' | 'finished'

type SessionStats = {
  attempts: number
  correct: number
  wrong: number
  close: number
  skipped: number
  revealed: number
  reviewed: number
  scoredCorrect: number
  streak: number
  bestStreak: number
}

type Feedback = {
  kind: 'idle' | 'correct' | 'wrong' | 'close' | 'partial' | 'revealed' | 'skipped'
  detail: string
}

type DrillSession = {
  phase: Phase
  queue: ScheduledShortcut[]
  index: number
  startedAt: number | null
  finishedAt: number | null
  pausedAt: number | null
  pausedMs: number
  stats: SessionStats
  sequenceBuffer: KeyCombo[]
  events: DrillEvent[]
  feedback: Feedback
  revealed: boolean
  summary?: SessionRecord
}

const durations = [30, 60, 120, 300]
const counts = [10, 25, 50]

const emptyStats = (): SessionStats => ({
  attempts: 0, correct: 0, wrong: 0, close: 0, skipped: 0,
  revealed: 0, reviewed: 0, scoredCorrect: 0, streak: 0, bestStreak: 0,
})

function App() {
  const [settings, setSettings] = useState(loadSettings)
  const [progress, setProgress] = useState<ProgressState>(loadProgress)
  const [onboarding, setOnboarding] = useState(loadOnboarding)
  const [onboardingActive, setOnboardingActive] = useState(() =>
    shouldAutoStartOnboarding(loadOnboarding(), loadProgress()),
  )
  const [panel, setPanel] = useState<Panel>(null)
  const [commandOpen, setCommandOpen] = useState(false)
  const [commandQuery, setCommandQuery] = useState('')
  const [commandIndex, setCommandIndex] = useState(0)
  const [libraryQuery, setLibraryQuery] = useState('')
  const [now, setNow] = useState(Date.now())
  const [retryPool, setRetryPool] = useState<Shortcut[] | null>(null)
  const [restartArmed, setRestartArmed] = useState(false)
  const [storageError, setStorageError] = useState(hasStorageFailure)
  const commandInputRef = useRef<HTMLInputElement>(null)
  const stageRef = useRef<HTMLElement>(null)
  const focusReturnRef = useRef<HTMLElement | null>(null)
  const savedSummaryIds = useRef(new Set<string>())
  const copy = getCopy(settings.locale)

  const [session, setSession] = useState<DrillSession>({
    phase: 'ready', queue: [], index: 0, startedAt: null, finishedAt: null,
    pausedAt: null, pausedMs: 0, stats: emptyStats(), sequenceBuffer: [], events: [],
    feedback: { kind: 'idle', detail: '' }, revealed: false,
  })

  const shortcuts = useMemo(() => getShortcuts(settings.platform), [settings.platform])
  const weakIds = useMemo(() => new Set(getWeakShortcutIds(progress)), [progress])
  const basePool = useMemo(() => {
    let pool = shortcuts
    if (settings.mode === 'category') pool = pool.filter((item) => item.category === settings.category)
    if (settings.mode === 'specialty') pool = pool.filter((item) => shortcutSpecialty(item) === settings.specialty)
    if (settings.mode === 'weak') {
      const weak = pool.filter((item) => weakIds.has(item.id))
      pool = weak.length ? weak : pool
    }
    return pool.filter((item) => shortcutPracticePolicy(item, settings.includeSystemCards) !== 'excluded')
  }, [settings, shortcuts, weakIds])

  const activeScheduled = session.queue[session.index]
  const active = activeScheduled?.shortcut ?? basePool[0]
  const elapsedMs = session.startedAt === null
    ? 0
    : Math.max(0, (session.finishedAt ?? session.pausedAt ?? now) - session.startedAt - session.pausedMs)
  const elapsedSeconds = Math.floor(elapsedMs / 1000)
  const timeLeft = Math.max(0, settings.duration - elapsedSeconds)
  const completed = session.stats.correct + session.stats.skipped + session.stats.reviewed
  const accuracy = session.stats.attempts
    ? Math.round((session.stats.scoredCorrect / session.stats.attempts) * 100)
    : 100

  useEffect(() => {
    const reportError = () => setStorageError(true)
    window.addEventListener(STORAGE_ERROR_EVENT, reportError)
    return () => window.removeEventListener(STORAGE_ERROR_EVENT, reportError)
  }, [])

  useEffect(() => {
    writeStorage(SETTINGS_KEY, JSON.stringify(settings))
    document.body.dataset.theme = settings.theme
    document.body.dataset.motion = settings.motion ? 'on' : 'off'
    document.documentElement.lang = settings.locale
  }, [settings])

  useEffect(() => {
    if (session.phase !== 'running') return
    const timer = window.setInterval(() => setNow(Date.now()), 100)
    return () => window.clearInterval(timer)
  }, [session.phase])

  useEffect(() => {
    if (!session.summary || savedSummaryIds.current.has(session.summary.id)) return
    savedSummaryIds.current.add(session.summary.id)
    setProgress((value) => recordSession(value, session.summary!))
  }, [session.summary])

  useEffect(() => {
    if (session.phase === 'running' && settings.mode === 'timed' && timeLeft <= 0) {
      finishSession()
    }
  })

  useEffect(() => {
    if (commandOpen) {
      commandInputRef.current?.focus()
    } else if (session.phase === 'running') {
      stageRef.current?.focus()
    }
  }, [commandOpen, session.phase])

  const commands = [
    { label: copy.resume, keywords: 'resume close', action: closeCommand },
    { label: copy.settings, keywords: 'settings setup config', action: () => openPanel('settings') },
    { label: copy.library, keywords: 'library shortcuts search', action: () => openPanel('library') },
    { label: copy.history, keywords: 'history results sessions', action: () => openPanel('history') },
    { label: `${copy.theme}: ${settings.theme === 'dark' ? copy.light : copy.dark}`, keywords: 'theme light dark', action: toggleTheme },
    { label: `${settings.learning === 'recall' ? copy.learn : copy.recall} · ${copy.learningLabel}`, keywords: 'learn recall answer', action: toggleLearning },
    { label: copy.replayIntro, keywords: 'onboarding tutorial introduction replay help', action: replayOnboarding },
    { label: copy.again, keywords: 'restart again repeat', action: startSession },
    { label: copy.end, keywords: 'finish end stop', action: finishSession },
  ]
  const filteredCommands = commands.filter((command) =>
    `${command.label} ${command.keywords}`.toLowerCase().includes(commandQuery.toLowerCase()),
  )

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.isComposing) return
      const target = event.target
      const editing = target instanceof HTMLElement && target.matches('input, select, textarea')

      if (commandOpen) {
        if (event.key === 'Escape') { event.preventDefault(); closeCommand(); return }
        if (event.key === 'Tab') {
          event.preventDefault()
          cycleModalFocus('.command-palette', event.shiftKey)
          return
        }
        if (event.key === 'ArrowDown') {
          event.preventDefault(); setCommandIndex((value) => Math.min(filteredCommands.length - 1, value + 1)); return
        }
        if (event.key === 'ArrowUp') {
          event.preventDefault(); setCommandIndex((value) => Math.max(0, value - 1)); return
        }
        if (event.key === 'Enter' && filteredCommands[commandIndex]) {
          event.preventDefault(); filteredCommands[commandIndex].action(); return
        }
        return
      }
      if (panel) {
        if (event.key === 'Escape') { event.preventDefault(); closePanel(); return }
        if (event.key === 'Tab') { event.preventDefault(); cycleModalFocus('.drawer', event.shiftKey) }
        return
      }
      if (editing) return
      if (onboardingActive) return

      const currentStep = ['wrong', 'close'].includes(session.feedback.kind) ? 0 : session.sequenceBuffer.length
      const reservedIsAnswer = session.phase === 'running' && active
        ? eventMatchesExpectedStep(active, currentStep, event, settings.platform)
        : false
      if ((event.metaKey || event.ctrlKey) && event.shiftKey && event.key.toLowerCase() === 'p' && !reservedIsAnswer) {
        event.preventDefault(); openCommand(); return
      }
      if (event.key === 'Escape' && !reservedIsAnswer) { event.preventDefault(); openCommand(); return }

      if (session.phase === 'ready') {
        if (event.key === 'Enter') { event.preventDefault(); startSession(); }
        return
      }
      if (session.phase === 'finished') {
        if (event.key === 'Tab' && document.activeElement === document.body) {
          event.preventDefault(); setRestartArmed(true); return
        }
        if (event.key === 'Enter') { event.preventDefault(); startSession(); return }
        return
      }
      if (session.phase !== 'running') return

      if (event.repeat) { event.preventDefault(); return }
      if (event.key === 'F1' && !reservedIsAnswer) { event.preventDefault(); revealAnswer(); return }
      if (event.ctrlKey && event.key === 'ArrowRight' && !reservedIsAnswer) { event.preventDefault(); applyOutcome('skipped'); return }
      if (active?.capture === 'simulated') {
        event.preventDefault()
        if (event.key === 'Enter') applyOutcome('reviewed')
        return
      }
      const combo = comboFromKeyboardEvent(event, settings.platform)
      if (!combo) return
      event.preventDefault()
      evaluateCombo(combo)
    }
    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  })

  function updateSetting<K extends keyof AppSettings>(key: K, value: AppSettings[K]) {
    setSettings((current) => ({ ...current, [key]: value }))
    setRetryPool(null)
    if (
      ['platform', 'mode', 'category', 'specialty', 'duration', 'count', 'includeSystemCards'].includes(key) &&
      (session.phase === 'running' || session.phase === 'paused')
    ) {
      setSession((current) => ({ ...current, phase: 'ready', queue: [], index: 0, startedAt: null, pausedAt: null }))
    }
  }

  function startSession() {
    beginSession(retryPool?.length ? retryPool : basePool)
  }

  function beginSession(
    pool: Shortcut[],
    overrides?: { mode?: SessionMode; count?: number; duration?: number },
  ) {
    if (!pool.length) return
    const seed = Date.now()
    const mode = overrides?.mode ?? settings.mode
    const count = overrides?.count ?? settings.count
    const size = mode === 'timed' ? Math.max(100, pool.length * 2) : count
    setNow(seed)
    setSession({
      phase: 'running', queue: buildAdaptiveQueue(pool, progress.shortcutStats, size, seed),
      index: 0, startedAt: seed, finishedAt: null, pausedAt: null, pausedMs: 0,
      stats: emptyStats(), sequenceBuffer: [], events: [],
      feedback: { kind: 'idle', detail: '' }, revealed: false,
    })
    setCommandOpen(false); setPanel(null); setRestartArmed(false)
  }

  function finishSession() {
    setSession((current) => {
      if (!current.startedAt || current.phase === 'finished' || current.phase === 'ready') return current
      const finishedAt = Date.now()
      const durationSec = Math.max(1, Math.round((finishedAt - current.startedAt - current.pausedMs) / 1000))
      const acc = current.stats.attempts ? Math.round((current.stats.scoredCorrect / current.stats.attempts) * 100) : 100
      const summary: SessionRecord = {
        id: `${finishedAt}-${Math.random().toString(36).slice(2, 8)}`, date: finishedAt,
        platform: settings.platform, mode: settings.mode,
        category: settings.mode === 'category' ? settings.category : undefined,
        specialty: settings.mode === 'specialty' ? settings.specialty : undefined,
        durationSec, correct: current.stats.correct, attempts: current.stats.attempts,
        wrong: current.stats.wrong, close: current.stats.close, skipped: current.stats.skipped,
        revealed: current.stats.revealed, accuracy: acc,
        spm: Number(((current.stats.correct / durationSec) * 60).toFixed(1)),
        bestStreak: current.stats.bestStreak,
        score: Math.max(0, current.stats.correct * 100 + current.stats.bestStreak * 12 - current.stats.wrong * 18 - current.stats.close * 8 - current.stats.revealed * 12),
        events: current.events,
      }
      return { ...current, phase: 'finished', finishedAt, pausedAt: null, summary }
    })
    setCommandOpen(false)
    focusReturnRef.current = null
    queueMicrotask(() => document.getElementById('practice-stage')?.focus())
  }

  function evaluateCombo(combo: KeyCombo) {
    if (!active || session.phase !== 'running') return
    const retained = ['wrong', 'close'].includes(session.feedback.kind) ? [] : session.sequenceBuffer
    const nextBuffer = [...retained, combo]
    const verdict = evaluateSequence(active, nextBuffer, settings.platform)
    if (verdict === 'exact') { applyOutcome('correct', nextBuffer); return }
    if (verdict === 'partial') {
      setSession((current) => ({
        ...current, sequenceBuffer: nextBuffer,
        feedback: { kind: 'partial', detail: `${nextBuffer.length}/${shortcutSequence(active).length}` },
      }))
      return
    }
    const mismatch = describeMismatch(active, combo, settings.platform, nextBuffer.length - 1)
    applyOutcome(verdict, nextBuffer, mismatch === 'modifiers' ? copy.modifierError : copy.keyError)
  }

  function revealAnswer() {
    if (!active || session.revealed || session.phase !== 'running') return
    setProgress((value) => recordShortcutOutcome(value, active.id, 'revealed'))
    setSession((current) => ({
      ...current, revealed: true, stats: { ...current.stats, revealed: current.stats.revealed + 1 },
      events: [...current.events, makeEvent(active, activeScheduled, 'revealed', current, undefined)],
      feedback: { kind: 'revealed', detail: copy.revealed },
    }))
  }

  function applyOutcome(outcome: ShortcutOutcome, pressed?: KeyCombo[], detail?: string) {
    if (!active || session.phase !== 'running') return
    if (outcome !== 'reviewed' && !(outcome === 'correct' && session.revealed)) {
      setProgress((value) => recordShortcutOutcome(value, active.id, outcome))
    }
    playFeedback(outcome, settings.sound)
    setSession((current) => {
      if (current.phase !== 'running') return current
      const assisted = current.revealed
      const scoredAttempt = ['correct', 'wrong', 'close'].includes(outcome) && !(outcome === 'correct' && assisted)
      const stats = { ...current.stats }
      if (scoredAttempt) stats.attempts += 1
      if (outcome === 'correct') stats.correct += 1
      if (outcome === 'correct' && !assisted) stats.scoredCorrect += 1
      if (outcome === 'wrong') stats.wrong += 1
      if (outcome === 'close') stats.close += 1
      if (outcome === 'skipped') stats.skipped += 1
      if (outcome === 'reviewed') stats.reviewed += 1
      stats.streak = outcome === 'correct' && !assisted ? stats.streak + 1 : ['wrong', 'close'].includes(outcome) ? 0 : stats.streak
      stats.bestStreak = Math.max(stats.bestStreak, stats.streak)
      const event = makeEvent(active, activeScheduled, outcome, current, pressed)
      const events = [...current.events, event]

      if (outcome === 'wrong' || outcome === 'close') {
        return {
          ...current, stats, sequenceBuffer: pressed ?? [], events,
          feedback: { kind: outcome, detail: detail ?? '' },
        }
      }
      const done = stats.correct + stats.skipped + stats.reviewed
      const shouldFinish = settings.mode !== 'timed' && done >= settings.count
      if (shouldFinish) {
        const finishedAt = Date.now()
        const durationSec = Math.max(1, Math.round((finishedAt - (current.startedAt ?? finishedAt) - current.pausedMs) / 1000))
        const acc = stats.attempts ? Math.round((stats.scoredCorrect / stats.attempts) * 100) : 100
        const summary: SessionRecord = {
          id: `${finishedAt}-${Math.random().toString(36).slice(2, 8)}`, date: finishedAt,
          platform: settings.platform, mode: settings.mode,
          category: settings.mode === 'category' ? settings.category : undefined,
          specialty: settings.mode === 'specialty' ? settings.specialty : undefined,
          durationSec, correct: stats.correct, attempts: stats.attempts, wrong: stats.wrong,
          close: stats.close, skipped: stats.skipped, revealed: stats.revealed,
          accuracy: acc, spm: Number(((stats.correct / durationSec) * 60).toFixed(1)),
          bestStreak: stats.bestStreak, score: Math.max(0, stats.correct * 100 - stats.wrong * 18 - stats.close * 8),
          events,
        }
        return { ...current, phase: 'finished', finishedAt, stats, events, summary, sequenceBuffer: [], revealed: false }
      }

      let queue = current.queue
      const nextIndex = current.index + 1
      if (nextIndex >= queue.length - 2) {
        const pool = retryPool?.length ? retryPool : basePool
        queue = [...queue, ...buildAdaptiveQueue(pool, progress.shortcutStats, Math.max(20, pool.length), Date.now())]
      }
      return {
        ...current, queue, index: nextIndex, stats, events, sequenceBuffer: [], revealed: false,
        feedback: { kind: outcome === 'skipped' ? 'skipped' : 'correct', detail: outcome === 'skipped' ? copy.skipped : copy.correct },
      }
    })
  }

  function makeEvent(
    shortcut: Shortcut,
    scheduled: ScheduledShortcut | undefined,
    outcome: ShortcutOutcome,
    current: DrillSession,
    pressed?: KeyCombo[],
  ): DrillEvent {
    return {
      atMs: Math.max(0, Date.now() - (current.startedAt ?? Date.now()) - current.pausedMs),
      shortcutId: shortcut.id, action: shortcut.action, outcome,
      reason: scheduled?.reason ?? 'coverage', pressed, revealed: current.revealed,
    }
  }

  function openCommand() {
    rememberFocus()
    setCommandQuery(''); setCommandIndex(0); setCommandOpen(true)
    setSession((current) => current.phase === 'running'
      ? { ...current, phase: 'paused', pausedAt: Date.now() }
      : current)
  }

  function closeCommand() {
    setCommandOpen(false)
    setSession((current) => current.phase === 'paused'
      ? { ...current, phase: 'running', pausedMs: current.pausedMs + (Date.now() - (current.pausedAt ?? Date.now())), pausedAt: null }
      : current)
    restoreFocus()
  }

  function openPanel(next: Exclude<Panel, null>) {
    if (!commandOpen) rememberFocus()
    setCommandOpen(false); setPanel(next)
  }

  function closePanel() {
    setPanel(null)
    if (session.phase === 'paused') closeCommand()
    else restoreFocus()
  }

  function rememberFocus() {
    if (!focusReturnRef.current && document.activeElement instanceof HTMLElement) {
      focusReturnRef.current = document.activeElement
    }
  }

  function restoreFocus() {
    const target = focusReturnRef.current
    focusReturnRef.current = null
    queueMicrotask(() => {
      if (target?.isConnected) target.focus()
      else document.getElementById('practice-stage')?.focus()
    })
  }

  function toggleTheme() {
    updateSetting('theme', settings.theme === 'dark' ? 'light' : 'dark')
    closeCommand()
  }

  function toggleLearning() {
    updateSetting('learning', settings.learning === 'recall' ? 'learn' : 'recall')
    closeCommand()
  }

  function practiceMistakes() {
    const ids = new Set(session.events.filter((event) => ['wrong', 'close', 'skipped', 'revealed'].includes(event.outcome)).map((event) => event.shortcutId))
    const pool = shortcuts.filter((item) => ids.has(item.id))
    if (pool.length) { setRetryPool(pool); beginSession(pool) }
  }

  function replayOnboarding() {
    const next = saveOnboarding(startOnboarding(onboarding))
    setOnboarding(next)
    setOnboardingActive(true)
    setSession((current) => ({ ...current, phase: 'ready', queue: [], index: 0 }))
    setCommandOpen(false)
    setPanel(null)
  }

  function advanceIntroduction() {
    setOnboarding((current) => {
      const next = saveOnboarding(advanceOnboarding(current.status === 'new' ? startOnboarding(current) : current))
      return next
    })
  }

  function skipIntroduction() {
    const next = saveOnboarding(skipOnboarding(onboarding))
    setOnboarding(next)
    setOnboardingActive(false)
  }

  function finishIntroduction(tools: ToolId[]) {
    const next = saveOnboarding(completeOnboarding(onboarding, tools))
    setOnboarding(next)
    setOnboardingActive(false)
    startToolPractice(tools.find((tool) => tool !== 'general') ?? 'general')
  }

  function startToolPractice(tool: ToolId) {
    const specialty = toolToSpecialty(tool)
    const pool = shortcuts.filter(
      (shortcut) => shortcut.capture === 'native' && shortcutSpecialty(shortcut) === specialty,
    )
    setSettings((current) => ({ ...current, mode: 'specialty', specialty, count: 10, learning: 'recall' }))
    beginSession(pool.length ? pool : shortcuts.filter((shortcut) => shortcut.capture === 'native'), {
      mode: 'fixed', count: 10,
    })
  }

  function startWarmup() {
    const pool = shortcuts.filter((shortcut) => shortcut.capture === 'native')
    setSettings((current) => ({ ...current, mode: 'timed', duration: 300, learning: 'recall' }))
    beginSession(pool, { mode: 'timed', duration: 300 })
  }

  function startWeakReview() {
    const pool = shortcuts.filter((shortcut) => weakIds.has(shortcut.id) && shortcut.capture === 'native')
    if (!pool.length) return
    setSettings((current) => ({ ...current, mode: 'weak', count: 10, learning: 'recall' }))
    beginSession(pool, { mode: 'fixed', count: 10 })
  }

  const reasonLabel = activeScheduled
    ? ({ new: copy.reasonNew, weak: copy.reasonWeak, due: copy.reasonDue, coverage: copy.reasonCoverage } as const)[activeScheduled.reason]
    : copy.reasonCoverage
  const revealVisible = settings.learning === 'learn' || session.revealed || active?.capture === 'simulated'
  const showAttempt = session.feedback.kind === 'wrong' || session.feedback.kind === 'close'
  const modalOpen = commandOpen || panel !== null

  return (
    <div className={`app phase-${session.phase} ${onboardingActive ? 'onboarding-active' : ''}`}>
      <a className="skip-link" href="#practice-stage" aria-hidden={modalOpen || undefined} tabIndex={modalOpen ? -1 : undefined} onClick={() => queueMicrotask(() => document.getElementById('practice-stage')?.focus())}>{copy.skipToPractice}</a>
      {storageError ? (
        <div className="storage-alert" role="alert">
          <span>{copy.persistenceError}</span>
          <button type="button" onClick={() => { clearStorageFailure(); setStorageError(false) }}>{copy.dismiss}</button>
        </div>
      ) : null}
      <header className="masthead" aria-hidden={session.phase === 'running' || modalOpen ? 'true' : undefined}>
        <button className="brand" type="button" onClick={() => setSession((value) => ({ ...value, phase: 'ready' }))}>
          <span className="brand-mark" aria-hidden="true"><i /><i /><i /></span>
          <span>shortcutype</span>
        </button>
        <nav className="utility-nav" aria-label={copy.application}>
          <button type="button" onClick={() => openPanel('library')}>{copy.library}</button>
          <button type="button" onClick={() => openPanel('history')}>{copy.history}</button>
          <button type="button" onClick={() => openPanel('settings')} aria-label={copy.settings}>⌘</button>
        </nav>
      </header>

      <main id="practice-stage" className="practice-shell" tabIndex={-1} aria-hidden={modalOpen || undefined}>
        {onboardingActive ? (
          <OnboardingExperience
            state={onboarding}
            locale={settings.locale}
            platform={settings.platform}
            motion={settings.motion}
            paused={commandOpen || panel !== null}
            onAdvance={advanceIntroduction}
            onSkip={skipIntroduction}
            onComplete={finishIntroduction}
            onOpenCommand={openCommand}
          />
        ) : session.phase === 'finished' && session.summary ? (
          <Results
            summary={session.summary} locale={settings.locale} shortcuts={shortcuts}
            onRestart={startSession} onMistakes={practiceMistakes} restartArmed={restartArmed}
          />
        ) : session.phase === 'ready' ? (
          <ReadyHome
            locale={settings.locale}
            platform={settings.platform}
            selectedTools={onboarding.selectedTools}
            hasWeak={weakIds.size > 0}
            onContinue={startSession}
            onWarmup={startWarmup}
            onWeak={startWeakReview}
            onTool={startToolPractice}
            onAdvanced={() => openPanel('settings')}
          />
        ) : (
          <section
            ref={stageRef} tabIndex={-1}
            className={`practice-stage feedback-${session.feedback.kind}`}
            aria-label={copy.practiceRegion}
          >
            <div className="stage-hud" aria-live="off">
              <span>{settings.mode === 'timed' ? `${timeLeft}s` : `${Math.min(completed, settings.count)} / ${settings.count}`}</span>
              <span className="hud-center">{settings.learning === 'recall' ? copy.recall : copy.learn} · {settings.platform === 'mac' ? 'macOS' : 'Windows'}</span>
              <span>{accuracy}%</span>
            </div>

            <div className="prompt-block">
              <p className="prompt-context">
                {active ? `${specialtyName(settings.locale, shortcutSpecialty(active))} / ${categoryName(settings.locale, active.category)}` : copy.all}
                {session.phase === 'running' ? <em>{reasonLabel}</em> : null}
              </p>
              <h1>{active ? shortcutAction(settings.locale, active.action) : copy.tagline}</h1>
              {active?.capture === 'simulated' && session.phase === 'running' ? (
                <div className="system-card-note">
                  <strong>{copy.unsupportedTitle}</strong><span>{copy.unsupportedBody}</span>
                </div>
              ) : null}
            </div>

            <ChordTrace
              sequence={showAttempt ? session.sequenceBuffer : revealVisible && active ? (active.realKeys ? [active.realKeys] : shortcutSequence(active)) : session.sequenceBuffer}
              platform={settings.platform} thenLabel={copy.sequenceThen}
              concealed={!revealVisible && session.sequenceBuffer.length === 0}
              status={session.feedback.kind}
              label={showAttempt ? copy.yourInput : revealVisible ? copy.target : copy.yourInput}
            />

            <div className="stage-feedback" aria-live="polite" aria-atomic="true">
              {session.phase === 'paused' ? <strong>{copy.paused}</strong> : null}
              {session.phase === 'running' && session.feedback.detail ? <strong>{session.feedback.detail}</strong> : null}
              {session.phase === 'running' && !session.feedback.detail ? (
                <span>{active?.capture === 'simulated' ? copy.confirmRehearsed : `${copy.revealHint} · ${copy.skipHint}`}</span>
              ) : null}
            </div>

          </section>
        )}
      </main>

      <footer className="key-footer" aria-hidden={session.phase === 'running' || modalOpen ? 'true' : undefined}>
        <span>{copy.commandHint}</span><span>{copy.tagline}</span><span>v2 · {copy.localOnly}</span>
      </footer>

      {commandOpen ? (
        <div className="overlay" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && closeCommand()}>
          <section className="command-palette" role="dialog" aria-modal="true" aria-label={copy.commands}>
            <div className="command-search">
              <span aria-hidden="true">›</span>
              <input
                ref={commandInputRef} value={commandQuery} placeholder={copy.search}
                aria-label={copy.search} onChange={(event) => { setCommandQuery(event.target.value); setCommandIndex(0) }}
              />
              <kbd>esc</kbd>
            </div>
            <div className="command-list" role="listbox">
              {filteredCommands.length ? filteredCommands.map((command, index) => (
                <button
                  key={command.label} type="button" role="option" aria-selected={index === commandIndex}
                  className={index === commandIndex ? 'selected' : ''}
                  onMouseEnter={() => setCommandIndex(index)} onClick={command.action}
                >
                  <span>{command.label}</span><span aria-hidden="true">↵</span>
                </button>
              )) : <p className="empty-message">{copy.noCommands}</p>}
            </div>
          </section>
        </div>
      ) : null}

      {panel ? (
        <div className="overlay" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && closePanel()}>
          <section className="drawer" role="dialog" aria-modal="true" aria-label={panel === 'settings' ? copy.settings : panel === 'library' ? copy.library : copy.history}>
            <div className="drawer-head">
              <div><small>Shortcutype /</small><h2>{panel === 'settings' ? copy.settings : panel === 'library' ? copy.library : copy.history}</h2></div>
              <button autoFocus type="button" onClick={closePanel} aria-label={copy.close}>×</button>
            </div>
            {panel === 'settings' ? (
              <SettingsPanel settings={settings} update={updateSetting} copy={copy} onReplay={replayOnboarding} />
            ) : panel === 'library' ? (
              <LibraryPanel shortcuts={shortcuts} locale={settings.locale} platform={settings.platform} query={libraryQuery} setQuery={setLibraryQuery} />
            ) : (
              <HistoryPanel progress={progress} locale={settings.locale} />
            )}
          </section>
        </div>
      ) : null}

      <div className="mobile-note" aria-hidden={modalOpen || undefined}>{copy.mobile}</div>
    </div>
  )
}

function ChordTrace({
  sequence, platform, concealed, status, label, thenLabel,
}: {
  sequence: KeyCombo[]; platform: Platform; concealed: boolean;
  status: Feedback['kind']; label: string; thenLabel: string
}) {
  return (
    <div className={`chord-trace trace-${status} ${concealed ? 'concealed' : ''}`} aria-label={label}>
      <span className="trace-label">{label}</span>
      <div className="trace-line" aria-hidden="true" />
      <div className="trace-nodes">
        {concealed ? (
          <><span className="pulse-node" /><span className="pulse-node delayed" /><span className="pulse-node late" /></>
        ) : sequence.length ? sequence.map((combo, step) => (
          <div className="trace-step" key={`${step}-${combo.key}`}>
            {step > 0 ? <span className="step-link">{thenLabel}</span> : null}
            {formatCombo(combo, platform).map((key) => <kbd key={key}>{key}</kbd>)}
          </div>
        )) : <span className="trace-empty">…</span>}
      </div>
    </div>
  )
}

function Results({
  summary, locale, shortcuts, onRestart, onMistakes, restartArmed,
}: {
  summary: SessionRecord; locale: Locale; shortcuts: Shortcut[];
  onRestart: () => void; onMistakes: () => void; restartArmed: boolean
}) {
  const copy = getCopy(locale)
  const misses = summary.events.filter((event) => ['wrong', 'close', 'skipped', 'revealed'].includes(event.outcome))
  const finalEvents = summary.events.filter((event) => ['correct', 'skipped', 'reviewed'].includes(event.outcome))
  return (
    <section className="results" aria-labelledby="results-title">
      <div className="results-heading">
        <div><p>{copy.finished}</p><h1 id="results-title">{summary.accuracy}<sup>%</sup></h1><span>{copy.finishedBody}</span></div>
        <div className="result-actions">
          <button className="start-action" type="button" onClick={onRestart}>{copy.again}<kbd>Enter</kbd></button>
          <button type="button" onClick={onMistakes} disabled={!misses.length}>{copy.mistakes}</button>
        </div>
      </div>
      <div className="result-metrics">
        <ResultMetric value={summary.correct} label={copy.correct} />
        <ResultMetric value={summary.bestStreak} label={copy.streak} />
        <ResultMetric value={summary.spm} label={copy.recallsPerMinute} />
        <ResultMetric value={`${summary.durationSec}s`} label={copy.time} />
      </div>
      <div className="rhythm-panel">
        <div className="section-heading"><h2>{copy.rhythm}</h2><span>{finalEvents.length} {copy.recallUnit}</span></div>
        <RhythmChart events={summary.events} duration={summary.durationSec * 1000} label={copy.rhythm} />
      </div>
      <div className="review-panel">
        <div className="section-heading"><h2>{copy.review}</h2><span>{misses.length ? `${misses.length} ${copy.signalsToRevisit}` : copy.noMistakes}</span></div>
        <div className="review-list">
          {summary.events.slice(-12).map((event, index) => {
            const shortcut = shortcuts.find((item) => item.id === event.shortcutId)
            return (
              <div className="review-row" key={`${event.atMs}-${index}`}>
                <span className={`outcome-dot outcome-${event.outcome}`} aria-label={outcomeLabel(copy, event.outcome)} />
                <span>{shortcutAction(locale, event.action)}</span>
                <small>{shortcut ? formatSequence(shortcut.realKeys ? [shortcut.realKeys] : shortcutSequence(shortcut), summary.platform) : ''}</small>
                <em>{event.revealed ? copy.assisted : outcomeLabel(copy, event.outcome)}</em>
              </div>
            )
          })}
        </div>
      </div>
      <p className={`restart-tip ${restartArmed ? 'armed' : ''}`}>{restartArmed ? 'Enter' : copy.tabRestart}</p>
    </section>
  )
}

function RhythmChart({ events, duration, label }: { events: DrillEvent[]; duration: number; label: string }) {
  const scored = events.filter((event) => ['correct', 'wrong', 'close'].includes(event.outcome))
  const points = scored.map((event, index) => {
    const x = duration ? Math.min(100, (event.atMs / duration) * 100) : 0
    const previous = scored.slice(0, index + 1)
    const correct = previous.filter((item) => item.outcome === 'correct').length
    return `${x},${100 - (correct / previous.length) * 82}`
  })
  return (
    <svg className="rhythm-chart" viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-label={label}>
      <path className="chart-grid" d="M0 20H100 M0 50H100 M0 80H100" />
      {points.length > 1 ? <polyline points={points.join(' ')} /> : null}
      {scored.map((event, index) => (
        <circle key={`${event.atMs}-${event.outcome}-${index}`} cx={duration ? Math.min(100, (event.atMs / duration) * 100) : 0} cy={event.outcome === 'correct' ? 18 : 82} r="1.4" className={`chart-${event.outcome}`} />
      ))}
    </svg>
  )
}

function ResultMetric({ value, label }: { value: ReactNode; label: string }) {
  return <div><strong>{value}</strong><span>{label}</span></div>
}

function SettingsPanel({ settings, update, copy, onReplay }: {
  settings: AppSettings
  update: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void
  copy: ReturnType<typeof getCopy>
  onReplay: () => void
}) {
  return (
    <div className="settings-groups">
      <SettingGroup label={copy.platform}>
        <ChoiceRow ariaLabel={copy.platform} items={platforms.map((item) => ({ value: item.id, label: item.label }))} value={settings.platform} onChange={(value) => update('platform', value as Platform)} />
      </SettingGroup>
      <SettingGroup label={copy.mode}>
        <ChoiceRow ariaLabel={copy.mode} items={[
          { value: 'fixed', label: copy.fixed }, { value: 'timed', label: copy.timed },
          { value: 'category', label: copy.category }, { value: 'specialty', label: copy.specialty },
          { value: 'weak', label: copy.weak },
        ]} value={settings.mode} onChange={(value) => update('mode', value as SessionMode)} />
      </SettingGroup>
      <SettingGroup label={settings.mode === 'timed' ? copy.time : copy.length}>
        <ChoiceRow ariaLabel={settings.mode === 'timed' ? copy.time : copy.length} items={(settings.mode === 'timed' ? durations : counts).map((value) => ({ value: String(value), label: settings.mode === 'timed' ? `${value}s` : String(value) }))} value={String(settings.mode === 'timed' ? settings.duration : settings.count)} onChange={(value) => settings.mode === 'timed' ? update('duration', Number(value)) : update('count', Number(value))} />
      </SettingGroup>
      {settings.mode === 'category' ? (
        <SettingGroup label={copy.pack}><Select ariaLabel={copy.pack} value={settings.category} onChange={(value) => update('category', value as CategoryId)}>{categories.map((item) => <option key={item.id} value={item.id}>{categoryName(settings.locale, item.id)}</option>)}</Select></SettingGroup>
      ) : null}
      {settings.mode === 'specialty' ? (
        <SettingGroup label={copy.pack}><Select ariaLabel={copy.pack} value={settings.specialty} onChange={(value) => update('specialty', value as SpecialtyId)}>{specialties.map((item) => <option key={item.id} value={item.id}>{specialtyName(settings.locale, item.id)}</option>)}</Select></SettingGroup>
      ) : null}
      <SettingGroup label={copy.learningLabel}>
        <ChoiceRow ariaLabel={copy.learningLabel} items={[{ value: 'recall', label: copy.recall }, { value: 'learn', label: copy.learn }]} value={settings.learning} onChange={(value) => update('learning', value as LearningMode)} />
      </SettingGroup>
      <SettingGroup label={copy.systemCards} description={settings.includeSystemCards ? copy.systemCardsOn : copy.systemCardsOff}>
        <Toggle value={settings.includeSystemCards} onChange={(value) => update('includeSystemCards', value)} copy={copy} />
      </SettingGroup>
      <SettingGroup label={copy.theme}><ChoiceRow ariaLabel={copy.theme} items={[{ value: 'dark', label: copy.dark }, { value: 'light', label: copy.light }]} value={settings.theme} onChange={(value) => update('theme', value as Theme)} /></SettingGroup>
      <SettingGroup label={copy.language}><ChoiceRow ariaLabel={copy.language} items={localeOptions.map((item) => ({ value: item.id, label: item.label }))} value={settings.locale} onChange={(value) => update('locale', value as Locale)} /></SettingGroup>
      <SettingGroup label={copy.motion}><Toggle value={settings.motion} onChange={(value) => update('motion', value)} copy={copy} /></SettingGroup>
      <SettingGroup label={copy.sound}><Toggle value={settings.sound} onChange={(value) => update('sound', value)} copy={copy} /></SettingGroup>
      <SettingGroup label={copy.introEyebrow}>
        <button className="drawer-secondary-action" type="button" onClick={onReplay}>{copy.replayIntro}</button>
      </SettingGroup>
    </div>
  )
}

function SettingGroup({ label, description, children }: { label: string; description?: string; children: ReactNode }) {
  return <section className="setting-group"><div><h3>{label}</h3>{description ? <p>{description}</p> : null}</div>{children}</section>
}

function ChoiceRow({ ariaLabel, items, value, onChange }: { ariaLabel: string; items: Array<{ value: string; label: string }>; value: string; onChange: (value: string) => void }) {
  return <div className="choice-row" role="group" aria-label={ariaLabel}>{items.map((item) => <button key={item.value} type="button" aria-pressed={value === item.value} className={value === item.value ? 'active' : ''} onClick={() => onChange(item.value)}>{item.label}</button>)}</div>
}

function Toggle({ value, onChange, copy }: { value: boolean; onChange: (value: boolean) => void; copy: ReturnType<typeof getCopy> }) {
  return <button className={`toggle ${value ? 'active' : ''}`} type="button" role="switch" aria-checked={value} onClick={() => onChange(!value)}><span />{value ? copy.on : copy.off}</button>
}

function Select({ ariaLabel, value, onChange, children }: { ariaLabel: string; value: string; onChange: (value: string) => void; children: ReactNode }) {
  return <select aria-label={ariaLabel} value={value} onChange={(event) => onChange(event.target.value)}>{children}</select>
}

function LibraryPanel({ shortcuts, locale, platform, query, setQuery }: {
  shortcuts: Shortcut[]; locale: Locale; platform: Platform; query: string; setQuery: (value: string) => void
}) {
  const copy = getCopy(locale)
  const filtered = shortcuts.filter((item) => `${item.action} ${item.category} ${shortcutSpecialty(item)}`.toLowerCase().includes(query.toLowerCase()))
  return (
    <div className="library-panel">
      <input className="drawer-search" aria-label={copy.search} value={query} onChange={(event) => setQuery(event.target.value)} placeholder={copy.search} />
      <p className="drawer-count">{filtered.length} / {shortcuts.length}</p>
      {filtered.length ? <div className="library-list">{filtered.map((shortcut) => (
        <div className="library-item" key={shortcut.id}>
          <div><strong>{shortcutAction(locale, shortcut.action)}</strong><span>{specialtyName(locale, shortcutSpecialty(shortcut))} · {shortcut.capture === 'simulated' ? copy.unscored : categoryName(locale, shortcut.category)}</span></div>
          <small>{formatSequence(shortcut.realKeys ? [shortcut.realKeys] : shortcutSequence(shortcut), platform)}</small>
        </div>
      ))}</div> : <p className="empty-message" role="status">{copy.noLibraryResults}</p>}
    </div>
  )
}

function HistoryPanel({ progress, locale }: { progress: ProgressState; locale: Locale }) {
  const copy = getCopy(locale)
  return <div className="history-list">{progress.recentSessions.length ? progress.recentSessions.map((session) => (
    <div className="history-item" key={session.id}>
      <time>{new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(session.date)}</time>
      <strong>{session.accuracy}%</strong><span>{session.correct} {copy.recallUnit} · {session.durationSec}s</span>
    </div>
  )) : <p className="empty-message">{copy.noHistory}</p>}</div>
}

function formatSequence(sequence: KeyCombo[], platform: Platform) {
  return sequence.map((combo) => formatCombo(combo, platform).join(' + ')).join('  →  ')
}

function outcomeLabel(copy: ReturnType<typeof getCopy>, outcome: ShortcutOutcome) {
  if (outcome === 'correct') return copy.correct
  if (outcome === 'wrong') return copy.wrong
  if (outcome === 'close') return copy.closeCall
  if (outcome === 'skipped') return copy.skipped
  if (outcome === 'revealed') return copy.assisted
  return copy.unscored
}

function cycleModalFocus(containerSelector: string, backwards: boolean) {
  const container = document.querySelector(containerSelector)
  if (!container) return
  const focusable = Array.from(
    container.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select:not(:disabled), [tabindex="0"]'),
  ).filter((element) => !element.hasAttribute('hidden'))
  if (!focusable.length) return
  const current = focusable.indexOf(document.activeElement as HTMLElement)
  const next = backwards
    ? (current <= 0 ? focusable.length - 1 : current - 1)
    : (current >= focusable.length - 1 ? 0 : current + 1)
  focusable[next]?.focus()
}

function playFeedback(outcome: ShortcutOutcome, enabled: boolean) {
  if (!enabled || typeof AudioContext === 'undefined') return
  const context = new AudioContext()
  const oscillator = context.createOscillator()
  const gain = context.createGain()
  oscillator.frequency.value = outcome === 'correct' ? 520 : 180
  gain.gain.setValueAtTime(0.025, context.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.045)
  oscillator.connect(gain).connect(context.destination)
  oscillator.start(); oscillator.stop(context.currentTime + 0.05)
  oscillator.addEventListener('ended', () => context.close())
}

export default App
