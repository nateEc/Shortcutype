import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import './App.css'
import {
  categories,
  categoryLabel,
  comboSignature,
  formatCombo,
  getShortcuts,
  platforms,
  shortcutSequence,
  shortcutSpecialty,
  sortModifiers,
  specialties,
  specialtyLabel,
  type CategoryId,
  type KeyCombo,
  type Platform,
  type Shortcut,
  type SpecialtyId,
} from './shortcuts'
import {
  getShortcutAccuracy,
  getWeakShortcutIds,
  loadProgress,
  recordSession,
  recordShortcutOutcome,
  type SessionMode,
  type SessionRecord,
  type ShortcutOutcome,
} from './progress'

type FeedbackKind = 'idle' | 'correct' | 'wrong' | 'close' | 'skipped' | 'info'

type Feedback = {
  kind: FeedbackKind
  title: string
  detail: string
  combo?: KeyCombo[]
}

type SessionStats = {
  attempts: number
  correct: number
  wrong: number
  close: number
  skipped: number
  streak: number
  bestStreak: number
}

type DrillSession = {
  status: 'idle' | 'running' | 'finished'
  queue: Shortcut[]
  index: number
  startedAt: number | null
  finishedAt: number | null
  stats: SessionStats
  feedback: Feedback
  sequenceBuffer: KeyCombo[]
  summary?: SessionRecord
}

type Theme = 'dark' | 'light'

const durations = [30, 60, 120]
const counts = [15, 25, 50]
const settingsKey = 'shortcutype-settings-v1'

const initialStats = (): SessionStats => ({
  attempts: 0,
  correct: 0,
  wrong: 0,
  close: 0,
  skipped: 0,
  streak: 0,
  bestStreak: 0,
})

const emptyFeedback: Feedback = {
  kind: 'idle',
  title: 'Ready',
  detail: 'Focus the drill pad and begin.',
}

const detectPlatform = (): Platform => {
  if (typeof navigator === 'undefined') {
    return 'mac'
  }

  return navigator.platform.toLowerCase().includes('mac') ? 'mac' : 'windows'
}

const loadSettings = () => {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    return JSON.parse(window.localStorage.getItem(settingsKey) ?? 'null') as {
      platform?: Platform
      mode?: SessionMode
      category?: CategoryId
      specialty?: SpecialtyId
      duration?: number
      count?: number
      theme?: Theme
    } | null
  } catch {
    return null
  }
}

function App() {
  const savedSettings = useMemo(loadSettings, [])
  const [platform, setPlatform] = useState<Platform>(
    savedSettings?.platform ?? detectPlatform(),
  )
  const [mode, setMode] = useState<SessionMode>(savedSettings?.mode ?? 'timed')
  const [selectedCategory, setSelectedCategory] = useState<CategoryId>(
    savedSettings?.category ?? 'editor',
  )
  const [selectedSpecialty, setSelectedSpecialty] = useState<SpecialtyId>(
    savedSettings?.specialty ?? 'tmux',
  )
  const [duration, setDuration] = useState(savedSettings?.duration ?? 60)
  const [targetCount, setTargetCount] = useState(savedSettings?.count ?? 25)
  const [theme, setTheme] = useState<Theme>(savedSettings?.theme ?? 'dark')
  const [progress, setProgress] = useState(loadProgress)
  const [now, setNow] = useState(Date.now())
  const captureRef = useRef<HTMLDivElement>(null)
  const savedSessionIdsRef = useRef(new Set<string>())

  const [session, setSession] = useState<DrillSession>({
    status: 'idle',
    queue: [],
    index: 0,
    startedAt: null,
    finishedAt: null,
    stats: initialStats(),
    feedback: emptyFeedback,
    sequenceBuffer: [],
  })

  const shortcuts = useMemo(() => getShortcuts(platform), [platform])
  const weakIds = useMemo(() => new Set(getWeakShortcutIds(progress)), [progress])
  const weakShortcuts = useMemo(
    () => shortcuts.filter((shortcut) => weakIds.has(shortcut.id)),
    [shortcuts, weakIds],
  )
  const practicePool = useMemo(() => {
    if (mode === 'category') {
      return shortcuts.filter((shortcut) => shortcut.category === selectedCategory)
    }

    if (mode === 'weak') {
      return weakShortcuts
    }

    if (mode === 'specialty') {
      return shortcuts.filter(
        (shortcut) => shortcutSpecialty(shortcut) === selectedSpecialty,
      )
    }

    return shortcuts
  }, [mode, selectedCategory, selectedSpecialty, shortcuts, weakShortcuts])

  const activeShortcut = session.queue[session.index] ?? practicePool[0] ?? shortcuts[0]
  const elapsedSeconds =
    session.startedAt === null
      ? 0
      : Math.max(
          0,
          Math.floor(((session.finishedAt ?? now) - session.startedAt) / 1000),
        )
  const timeLeft =
    mode === 'timed' && session.status === 'running'
      ? Math.max(0, duration - elapsedSeconds)
      : duration
  const completedPrompts = session.stats.correct + session.stats.skipped
  const accuracy = calculateAccuracy(session.stats)
  const spm = calculateSpm(session.stats.correct, elapsedSeconds)
  const canEditSettings = session.status !== 'running'

  useEffect(() => {
    window.localStorage.setItem(
      settingsKey,
      JSON.stringify({
        platform,
        mode,
        category: selectedCategory,
        specialty: selectedSpecialty,
        duration,
        count: targetCount,
        theme,
      }),
    )
  }, [
    duration,
    mode,
    platform,
    selectedCategory,
    selectedSpecialty,
    targetCount,
    theme,
  ])

  useEffect(() => {
    document.body.dataset.theme = theme
  }, [theme])

  useEffect(() => {
    if (session.status !== 'running') {
      return
    }

    const timer = window.setInterval(() => setNow(Date.now()), 200)
    return () => window.clearInterval(timer)
  }, [session.status])

  useEffect(() => {
    if (session.status === 'running' && mode === 'timed' && timeLeft <= 0) {
      finishSession()
    }
  })

  useEffect(() => {
    if (!session.summary || savedSessionIdsRef.current.has(session.summary.id)) {
      return
    }

    savedSessionIdsRef.current.add(session.summary.id)
    setProgress((currentProgress) => recordSession(currentProgress, session.summary!))
  }, [session.summary])

  useEffect(() => {
    if (session.status === 'running') {
      captureRef.current?.focus()
    }
  }, [session.index, session.status])

  useEffect(() => {
    if (session.status !== 'running') {
      return
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat) {
        event.preventDefault()
        return
      }

      if (event.key === 'Escape') {
        event.preventDefault()
        applyOutcome('skipped')
        return
      }

      const pressed = comboFromKeyboardEvent(event, platform)
      if (!pressed) {
        return
      }

      event.preventDefault()
      evaluateCombo(pressed)
    }

    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  })

  function startSession() {
    if (practicePool.length === 0) {
      setSession((current) => ({
        ...current,
        status: 'idle',
        feedback: {
          kind: 'info',
          title: 'Weak review is empty',
          detail: 'Miss or skip a few shortcuts, then the review queue will appear.',
        },
      }))
      return
    }

    const seedSize = mode === 'timed' ? Math.max(80, practicePool.length * 3) : targetCount
    setNow(Date.now())
    setSession({
      status: 'running',
      queue: buildQueue(practicePool, seedSize),
      index: 0,
      startedAt: Date.now(),
      finishedAt: null,
      stats: initialStats(),
      sequenceBuffer: [],
      feedback: {
        kind: 'info',
        title: 'Live',
        detail: 'Every combo is captured in the drill pad.',
      },
    })
  }

  function finishSession() {
    setSession((current) => {
      if (current.status !== 'running' || current.startedAt === null) {
        return current
      }

      const finishedAt = Date.now()
      const summary = createSessionRecord(
        current.stats,
        current.startedAt,
        finishedAt,
        platform,
        mode,
        mode === 'category' ? selectedCategory : undefined,
        mode === 'specialty' ? selectedSpecialty : undefined,
      )

      return {
        ...current,
        status: 'finished',
        finishedAt,
        summary,
        feedback: {
          kind: 'info',
          title: 'Session complete',
          detail: `${summary.correct} correct at ${summary.spm.toFixed(1)} SPM.`,
        },
      }
    })
  }

  function evaluateCombo(pressed: KeyCombo) {
    if (!activeShortcut || session.status !== 'running') {
      return
    }

    const nextBuffer = [...session.sequenceBuffer, pressed]
    const expectedSequences = getExpectedSequences(activeShortcut)
    const exact = expectedSequences.some((expected) =>
      sequencesEqual(expected, nextBuffer, platform),
    )

    if (exact) {
      applyOutcome('correct', nextBuffer)
      return
    }

    const partial = expectedSequences.some((expected) =>
      sequenceStartsWith(expected, nextBuffer, platform),
    )

    if (partial) {
      setSession((current) => ({
        ...current,
        sequenceBuffer: nextBuffer,
        feedback: {
          kind: 'info',
          title: 'Sequence',
          detail: `${nextBuffer.length}/${expectedSequences[0].length} keys accepted.`,
          combo: nextBuffer,
        },
      }))
      return
    }

    const stepIndex = Math.max(0, nextBuffer.length - 1)
    const sameKey = expectedSequences.some(
      (expected) => expected[stepIndex]?.key === pressed.key,
    )

    applyOutcome(sameKey ? 'close' : 'wrong', nextBuffer)
  }

  function applyOutcome(outcome: ShortcutOutcome, pressed?: KeyCombo[]) {
    if (!activeShortcut || session.status !== 'running') {
      return
    }

    setProgress((current) =>
      recordShortcutOutcome(current, activeShortcut.id, outcome),
    )

    setSession((current) => {
      if (current.status !== 'running') {
        return current
      }

      const nextStats = updateStats(current.stats, outcome)
      const feedback = createFeedback(outcome, activeShortcut, pressed, platform)

      if (outcome === 'wrong' || outcome === 'close') {
        return {
          ...current,
          stats: nextStats,
          sequenceBuffer: [],
          feedback,
        }
      }

      const completed = nextStats.correct + nextStats.skipped
      if (mode !== 'timed' && completed >= targetCount) {
        const finishedAt = Date.now()
        const summary = createSessionRecord(
          nextStats,
          current.startedAt ?? finishedAt,
          finishedAt,
          platform,
          mode,
          mode === 'category' ? selectedCategory : undefined,
          mode === 'specialty' ? selectedSpecialty : undefined,
        )

        return {
          ...current,
          status: 'finished',
          finishedAt,
          stats: nextStats,
          sequenceBuffer: [],
          feedback: {
            kind: 'info',
            title: 'Session complete',
            detail: `${summary.correct} correct at ${summary.spm.toFixed(1)} SPM.`,
          },
          summary,
        }
      }

      const nextIndex = current.index + 1
      const queue =
        nextIndex >= current.queue.length - 2
          ? [
              ...current.queue,
              ...buildQueue(
                practicePool,
                Math.max(targetCount, practicePool.length),
              ),
            ]
          : current.queue

      return {
        ...current,
        queue,
        index: nextIndex,
        stats: nextStats,
        sequenceBuffer: [],
        feedback,
      }
    })
  }

  const progressForActive = activeShortcut
    ? progress.shortcutStats[activeShortcut.id]
    : undefined
  const activeAccuracy = getShortcutAccuracy(progressForActive)

  return (
    <div className={`app-shell theme-${theme}`}>
      <header className="topbar">
        <div className="brand-block">
          <span className="eyebrow">Shortcutype</span>
          <strong>shortcut drills for dev muscle memory</strong>
        </div>
        <div className="top-actions" aria-label="Global controls">
          <div className="segmented" aria-label="Platform">
            {platforms.map((item) => (
              <button
                key={item.id}
                className={platform === item.id ? 'active' : ''}
                disabled={!canEditSettings}
                type="button"
                onClick={() => setPlatform(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
          <button
            className="icon-button"
            type="button"
            aria-label="Toggle theme"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          >
            {theme === 'dark' ? 'Light' : 'Dark'}
          </button>
        </div>
      </header>

      <main className="workbench">
        <section className="drill-panel" aria-label="Practice drill">
          <div className="metric-strip">
            <Metric label={mode === 'timed' ? 'Time' : 'Done'} value={mode === 'timed' ? `${timeLeft}s` : `${completedPrompts}/${targetCount}`} />
            <Metric label="Streak" value={session.stats.streak.toString()} />
            <Metric label="Accuracy" value={`${accuracy}%`} />
            <Metric label="SPM" value={spm.toFixed(1)} />
            <Metric label="Best" value={progress.bestStreak.toString()} />
          </div>

          <div
            ref={captureRef}
            className={`capture-pad feedback-${session.feedback.kind}`}
            tabIndex={0}
            aria-live="polite"
            onClick={() => captureRef.current?.focus()}
          >
            {session.status === 'finished' && session.summary ? (
              <Summary summary={session.summary} />
            ) : (
              <>
                <div className="prompt-meta">
                  <span>
                    {activeShortcut
                      ? `${specialtyLabel(shortcutSpecialty(activeShortcut))} · ${categoryLabel(activeShortcut.category)}`
                      : 'Library'}
                  </span>
                  {activeShortcut?.capture === 'simulated' ? (
                    <span className="simulation-pill">browser-safe</span>
                  ) : null}
                </div>
                <h1>{activeShortcut?.action ?? 'No shortcut loaded'}</h1>
                {activeShortcut ? (
                  <ComboRail shortcut={activeShortcut} platform={platform} />
                ) : null}
                <div className="input-readout">
                  <span className="readout-label">Input</span>
                  <div className="pressed-combo">
                    {session.feedback.combo ? (
                      <KeySequence sequence={session.feedback.combo} platform={platform} />
                    ) : (
                      <span className="ghost-combo">Waiting for combo</span>
                    )}
                  </div>
                </div>
                <div className="feedback-line">
                  <strong>{session.feedback.title}</strong>
                  <span>{session.feedback.detail}</span>
                </div>
                {activeShortcut?.note ? (
                  <p className="limit-note">
                    Real shortcut:{' '}
                    {activeShortcut.realKeys
                      ? formatCombo(activeShortcut.realKeys, platform).join(' + ')
                      : formatCombo(activeShortcut.keys, platform).join(' + ')}
                    . {activeShortcut.note}
                  </p>
                ) : null}
              </>
            )}
          </div>

          <div className="drill-actions">
            <button
              className="primary-action"
              type="button"
              onClick={session.status === 'running' ? finishSession : startSession}
            >
              {session.status === 'running' ? 'End session' : 'Start drill'}
            </button>
            <button
              type="button"
              disabled={session.status !== 'running'}
              onClick={() => applyOutcome('skipped')}
            >
              Skip
            </button>
            <div className="active-history">
              <span>Current lifetime</span>
              <strong>
                {activeAccuracy === null ? 'fresh' : `${activeAccuracy}%`}
              </strong>
            </div>
          </div>
        </section>

        <aside className="setup-panel" aria-label="Practice setup">
          <ControlGroup title="Mode">
            <div className="mode-grid">
              <ModeButton current={mode} mode="timed" label="Timed" setMode={setMode} disabled={!canEditSettings} />
              <ModeButton current={mode} mode="fixed" label="Fixed count" setMode={setMode} disabled={!canEditSettings} />
              <ModeButton current={mode} mode="category" label="Category" setMode={setMode} disabled={!canEditSettings} />
              <ModeButton current={mode} mode="specialty" label="Specialty" setMode={setMode} disabled={!canEditSettings} />
              <ModeButton current={mode} mode="weak" label="Weak review" setMode={setMode} disabled={!canEditSettings} />
            </div>
          </ControlGroup>

          <ControlGroup title={mode === 'timed' ? 'Timer' : 'Count'}>
            {mode === 'timed' ? (
              <div className="segmented full">
                {durations.map((seconds) => (
                  <button
                    key={seconds}
                    className={duration === seconds ? 'active' : ''}
                    disabled={!canEditSettings}
                    type="button"
                    onClick={() => setDuration(seconds)}
                  >
                    {seconds}s
                  </button>
                ))}
              </div>
            ) : (
              <div className="segmented full">
                {counts.map((count) => (
                  <button
                    key={count}
                    className={targetCount === count ? 'active' : ''}
                    disabled={!canEditSettings}
                    type="button"
                    onClick={() => setTargetCount(count)}
                  >
                    {count}
                  </button>
                ))}
              </div>
            )}
          </ControlGroup>

          <ControlGroup title="Category">
            <select
              disabled={!canEditSettings || mode !== 'category'}
              value={selectedCategory}
              onChange={(event) =>
                setSelectedCategory(event.target.value as CategoryId)
              }
            >
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.label}
                </option>
              ))}
            </select>
          </ControlGroup>

          <ControlGroup title="Specialty">
            <select
              disabled={!canEditSettings || mode !== 'specialty'}
              value={selectedSpecialty}
              onChange={(event) =>
                setSelectedSpecialty(event.target.value as SpecialtyId)
              }
            >
              {specialties.map((specialty) => (
                <option key={specialty.id} value={specialty.id}>
                  {specialty.label}
                </option>
              ))}
            </select>
          </ControlGroup>

          <div className="pool-meter">
            <span>Queue</span>
            <strong>{practicePool.length}</strong>
          </div>
          <div className="pool-meter">
            <span>Best score</span>
            <strong>{progress.bestScore}</strong>
          </div>
        </aside>
      </main>

      <section className="progress-grid" aria-label="Progress and library">
        <ProgressPanel title="Weak shortcuts">
          {weakShortcuts.length === 0 ? (
            <p className="empty-state">No weak shortcuts yet.</p>
          ) : (
            <ul className="compact-list">
              {weakShortcuts.slice(0, 6).map((shortcut) => (
                <li key={shortcut.id}>
                  <span>{shortcut.action}</span>
                  <strong>
                    {getShortcutAccuracy(progress.shortcutStats[shortcut.id]) ?? 0}%
                  </strong>
                </li>
              ))}
            </ul>
          )}
        </ProgressPanel>

        <ProgressPanel title="Recent sessions">
          {progress.recentSessions.length === 0 ? (
            <p className="empty-state">Sessions will land here.</p>
          ) : (
            <ul className="compact-list">
              {progress.recentSessions.slice(0, 5).map((record) => (
                <li key={record.id}>
                  <span>
                    {record.correct} correct / {record.accuracy}%
                  </span>
                  <strong>{record.spm.toFixed(1)} SPM</strong>
                </li>
              ))}
            </ul>
          )}
        </ProgressPanel>

        <ProgressPanel title="Shortcut library">
          <div className="library-list">
            {shortcuts.map((shortcut) => (
              <div key={shortcut.id} className="library-row">
                <div>
                  <span>{shortcut.action}</span>
                  <small>
                    {specialtyLabel(shortcutSpecialty(shortcut))} /{' '}
                    {categoryLabel(shortcut.category)}
                  </small>
                </div>
                <div className="library-combo">
                  <KeySequence sequence={shortcutSequence(shortcut)} platform={platform} />
                  <strong>
                    {getShortcutAccuracy(progress.shortcutStats[shortcut.id]) ??
                      '--'}
                    {getShortcutAccuracy(progress.shortcutStats[shortcut.id]) ===
                    null
                      ? ''
                      : '%'}
                  </strong>
                </div>
              </div>
            ))}
          </div>
        </ProgressPanel>
      </section>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

function ModeButton({
  current,
  mode,
  label,
  setMode,
  disabled,
}: {
  current: SessionMode
  mode: SessionMode
  label: string
  setMode: (mode: SessionMode) => void
  disabled: boolean
}) {
  return (
    <button
      className={current === mode ? 'active' : ''}
      disabled={disabled}
      type="button"
      onClick={() => setMode(mode)}
    >
      {label}
    </button>
  )
}

function ControlGroup({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <section className="control-group">
      <h2>{title}</h2>
      {children}
    </section>
  )
}

function ProgressPanel({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <section className="progress-panel">
      <h2>{title}</h2>
      {children}
    </section>
  )
}

function Summary({ summary }: { summary: SessionRecord }) {
  return (
    <div className="summary">
      <span className="eyebrow">Session summary</span>
      <h1>{summary.score}</h1>
      <div className="summary-grid">
        <Metric label="Correct" value={summary.correct.toString()} />
        <Metric label="Accuracy" value={`${summary.accuracy}%`} />
        <Metric label="SPM" value={summary.spm.toFixed(1)} />
        <Metric label="Best streak" value={summary.bestStreak.toString()} />
      </div>
    </div>
  )
}

function ComboRail({
  shortcut,
  platform,
}: {
  shortcut: Shortcut
  platform: Platform
}) {
  return (
    <div className="combo-rail">
      <span className="readout-label">
        {shortcut.capture === 'simulated' ? 'Drill combo' : 'Target combo'}
      </span>
      <KeySequence sequence={shortcutSequence(shortcut)} platform={platform} />
    </div>
  )
}

function KeySequence({
  sequence,
  platform,
}: {
  sequence: KeyCombo[]
  platform: Platform
}) {
  return (
    <span
      className="key-sequence"
      aria-label={formatSequence(sequence, platform)}
    >
      {sequence.map((combo, index) => (
        <span
          key={`${comboSignature(combo, platform)}-${index}`}
          className="sequence-step"
        >
          {index > 0 ? <span className="sequence-arrow">then</span> : null}
          <Keycaps combo={combo} platform={platform} />
        </span>
      ))}
    </span>
  )
}

function Keycaps({ combo, platform }: { combo: KeyCombo; platform: Platform }) {
  return (
    <span className="keycaps" aria-label={formatCombo(combo, platform).join(' ')}>
      {formatCombo(combo, platform).map((part) => (
        <kbd key={part}>{part}</kbd>
      ))}
    </span>
  )
}

function buildQueue(pool: Shortcut[], target: number) {
  const queue: Shortcut[] = []
  while (queue.length < target) {
    queue.push(...shuffle(pool))
  }
  return queue.slice(0, target)
}

function shuffle<T>(items: T[]) {
  return [...items].sort(() => Math.random() - 0.5)
}

function updateStats(stats: SessionStats, outcome: ShortcutOutcome): SessionStats {
  const isAttempt = outcome !== 'skipped'
  const isCorrect = outcome === 'correct'
  const nextStreak = isCorrect ? stats.streak + 1 : 0

  return {
    attempts: stats.attempts + (isAttempt ? 1 : 0),
    correct: stats.correct + (isCorrect ? 1 : 0),
    wrong: stats.wrong + (outcome === 'wrong' ? 1 : 0),
    close: stats.close + (outcome === 'close' ? 1 : 0),
    skipped: stats.skipped + (outcome === 'skipped' ? 1 : 0),
    streak: nextStreak,
    bestStreak: Math.max(stats.bestStreak, nextStreak),
  }
}

function createFeedback(
  outcome: ShortcutOutcome,
  shortcut: Shortcut,
  pressed: KeyCombo[] | undefined,
  platform: Platform,
): Feedback {
  const target = formatSequence(shortcutSequence(shortcut), platform)
  if (outcome === 'correct') {
    return {
      kind: 'correct',
      title: 'Correct',
      detail: `${shortcut.action} locked in.`,
      combo: pressed,
    }
  }

  if (outcome === 'close') {
    return {
      kind: 'close',
      title: 'Close',
      detail: 'Right key, wrong modifier set.',
      combo: pressed,
    }
  }

  if (outcome === 'skipped') {
    return {
      kind: 'skipped',
      title: 'Skipped',
      detail: `${target} was the target.`,
    }
  }

  return {
    kind: 'wrong',
    title: 'Wrong key',
    detail: `${target} was expected.`,
    combo: pressed,
  }
}

function getExpectedSequences(shortcut: Shortcut) {
  return [
    shortcutSequence(shortcut),
    ...(shortcut.aliases ?? []).map((combo) => [combo]),
  ]
}

function sequencesEqual(
  expected: KeyCombo[],
  pressed: KeyCombo[],
  platform: Platform,
) {
  return (
    expected.length === pressed.length &&
    expected.every(
      (combo, index) =>
        comboSignature(combo, platform) === comboSignature(pressed[index]!, platform),
    )
  )
}

function sequenceStartsWith(
  expected: KeyCombo[],
  pressed: KeyCombo[],
  platform: Platform,
) {
  return (
    pressed.length < expected.length &&
    pressed.every(
      (combo, index) =>
        comboSignature(combo, platform) === comboSignature(expected[index]!, platform),
    )
  )
}

function formatSequence(sequence: KeyCombo[], platform: Platform) {
  return sequence
    .map((combo) => formatCombo(combo, platform).join(' + '))
    .join(' then ')
}

function calculateAccuracy(stats: SessionStats) {
  if (stats.attempts === 0) {
    return 100
  }

  return Math.round((stats.correct / stats.attempts) * 100)
}

function calculateSpm(correct: number, elapsedSeconds: number) {
  if (elapsedSeconds <= 0) {
    return 0
  }

  return (correct / elapsedSeconds) * 60
}

function createSessionRecord(
  stats: SessionStats,
  startedAt: number,
  finishedAt: number,
  platform: Platform,
  mode: SessionMode,
  category: CategoryId | undefined,
  specialty: SpecialtyId | undefined,
): SessionRecord {
  const durationSec = Math.max(1, Math.round((finishedAt - startedAt) / 1000))
  const spm = calculateSpm(stats.correct, durationSec)
  const accuracy = calculateAccuracy(stats)
  const score = Math.max(
    0,
    Math.round(
      stats.correct * 100 +
        stats.bestStreak * 14 +
        spm * 4 -
        stats.wrong * 18 -
        stats.close * 8 -
        stats.skipped * 10,
    ),
  )

  return {
    id: `${finishedAt}-${Math.random().toString(36).slice(2)}`,
    date: finishedAt,
    platform,
    mode,
    category,
    specialty,
    durationSec,
    correct: stats.correct,
    attempts: stats.attempts,
    wrong: stats.wrong,
    close: stats.close,
    skipped: stats.skipped,
    accuracy,
    spm,
    bestStreak: stats.bestStreak,
    score,
  }
}

function comboFromKeyboardEvent(event: KeyboardEvent, platform: Platform) {
  const key = normalizeKey(event)
  if (!key || isModifierKey(key)) {
    return null
  }

  const modifiers: KeyCombo['modifiers'] = []
  if (event.metaKey) {
    modifiers.push('meta')
  }
  if (event.ctrlKey) {
    modifiers.push('control')
  }
  if (event.altKey) {
    modifiers.push('alt')
  }
  if (event.shiftKey) {
    modifiers.push('shift')
  }

  return {
    key,
    modifiers: sortModifiers(platform, modifiers),
  }
}

function isModifierKey(key: string) {
  return key === 'meta' || key === 'control' || key === 'alt' || key === 'shift'
}

function normalizeKey(event: KeyboardEvent) {
  const byCode: Record<string, string> = {
    Space: 'space',
    Tab: 'tab',
    Enter: 'enter',
    Escape: 'escape',
    Backspace: 'backspace',
    Delete: 'delete',
    ArrowLeft: 'arrowleft',
    ArrowRight: 'arrowright',
    ArrowUp: 'arrowup',
    ArrowDown: 'arrowdown',
    Home: 'home',
    End: 'end',
    PageUp: 'pageup',
    PageDown: 'pagedown',
    Backquote: '`',
    Slash: '/',
    Period: '.',
    Comma: ',',
    Minus: '-',
    Equal: '=',
    BracketLeft: '[',
    BracketRight: ']',
    F2: 'f2',
    F5: 'f5',
  }

  if (byCode[event.code]) {
    return byCode[event.code]
  }

  const key = event.key.toLowerCase()
  if (key === ' ') {
    return 'space'
  }
  if (key.length === 1) {
    return key
  }
  if (key.startsWith('f') && key.length <= 3) {
    return key
  }

  return key
}

export default App
