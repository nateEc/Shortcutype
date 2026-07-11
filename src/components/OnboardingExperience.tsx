import { useEffect, useMemo, useRef, useState } from 'react'
import { shortcutAction, type Locale } from '../i18n'
import { comboFromKeyboardEvent, describeMismatch, evaluateSequence } from '../input'
import {
  getTutorialSteps,
  toggleTool,
  tutorialStepForStage,
  type OnboardingState,
  type ToolId,
} from '../onboarding'
import { formatCombo, type KeyCombo, type Modifier, type Platform } from '../shortcuts'
import { getCopy } from '../ui-copy'

type TutorialFeedback = 'idle' | 'correct' | 'wrong' | 'close'

export function OnboardingExperience({
  state,
  locale,
  platform,
  motion,
  paused,
  onAdvance,
  onSkip,
  onComplete,
  onOpenCommand,
}: {
  state: OnboardingState
  locale: Locale
  platform: Platform
  motion: boolean
  paused: boolean
  onAdvance: () => void
  onSkip: () => void
  onComplete: (tools: ToolId[]) => void
  onOpenCommand: () => void
}) {
  const copy = getCopy(locale)
  const step = useMemo(() => tutorialStepForStage(platform, state.stage), [platform, state.stage])
  const [feedback, setFeedback] = useState<TutorialFeedback>('idle')
  const [pressed, setPressed] = useState<KeyCombo | null>(null)
  const [held, setHeld] = useState<Modifier[]>([])
  const [lostFocus, setLostFocus] = useState(false)
  const [selectedTools, setSelectedTools] = useState<ToolId[]>(state.selectedTools)
  const stageRef = useRef<HTMLElement>(null)
  const timerRef = useRef<number | null>(null)

  useEffect(() => {
    setFeedback('idle')
    setPressed(null)
    setHeld([])
    setLostFocus(false)
    stageRef.current?.focus()
    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current)
    }
  }, [state.stage])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (paused || event.isComposing) return
      const target = event.target
      const editing = target instanceof HTMLElement && target.matches('input, textarea, select')
      if (editing) return
      if (event.key === 'Escape' || ((event.metaKey || event.ctrlKey) && event.shiftKey && event.key.toLowerCase() === 'p')) {
        event.preventDefault()
        onOpenCommand()
        return
      }
      if (state.stage === 'intro') {
        if (event.key === 'Enter' && !(target instanceof HTMLButtonElement)) {
          event.preventDefault()
          onAdvance()
        }
        return
      }
      if (state.stage === 'tools') {
        if (event.key === 'Enter' && !(target instanceof HTMLButtonElement)) {
          event.preventDefault()
          onComplete(selectedTools)
        }
        return
      }
      if (!step || feedback === 'correct') return
      if (event.repeat) {
        event.preventDefault()
        return
      }
      setLostFocus(false)
      setHeld(modifiersFromEvent(event, platform))
      const combo = comboFromKeyboardEvent(event, platform)
      if (!combo) return
      event.preventDefault()
      setPressed(combo)
      const verdict = evaluateSequence(step.shortcut, [combo], platform)
      if (verdict === 'exact') {
        setFeedback('correct')
        timerRef.current = window.setTimeout(onAdvance, motion ? 620 : 240)
      } else {
        setFeedback(verdict === 'close' ? 'close' : 'wrong')
      }
    }
    const onKeyUp = (event: KeyboardEvent) => setHeld(modifiersFromEvent(event, platform))
    const onBlur = () => {
      setHeld([])
      setLostFocus(true)
    }
    window.addEventListener('keydown', onKeyDown, true)
    window.addEventListener('keyup', onKeyUp, true)
    window.addEventListener('blur', onBlur)
    return () => {
      window.removeEventListener('keydown', onKeyDown, true)
      window.removeEventListener('keyup', onKeyUp, true)
      window.removeEventListener('blur', onBlur)
    }
  }, [feedback, motion, onAdvance, onComplete, onOpenCommand, paused, platform, selectedTools, state.stage, step])

  if (state.stage === 'intro') {
    const example = getTutorialSteps(platform)[0]
    return (
      <section className="onboarding intro-stage" aria-labelledby="intro-title" ref={stageRef} tabIndex={-1}>
        <p className="onboarding-eyebrow">{copy.introEyebrow}</p>
        <h1 id="intro-title">{copy.introTitle}</h1>
        <p className="onboarding-lede">{copy.introBody}</p>
        <div className="answer-equation" aria-label={copy.introRule}>
          <div><small>{copy.introAction}</small><strong>{shortcutAction(locale, 'Copy')}</strong></div>
          <span aria-hidden="true">→</span>
          <div><small>{copy.introAnswer}</small><KeyComboView combo={example.shortcut.keys} platform={platform} /></div>
        </div>
        <p className="intro-rule">{copy.introRule}</p>
        <div className="intro-actions">
          <button className="start-action" type="button" onClick={onAdvance}>{copy.firstShortcut}<kbd>Enter</kbd></button>
          <button className="quiet-action" type="button" onClick={onSkip}>{copy.skipIntro}</button>
        </div>
      </section>
    )
  }

  if (state.stage === 'tools') {
    return (
      <section className="onboarding tools-stage" aria-labelledby="tools-title" ref={stageRef} tabIndex={-1}>
        <p className="onboarding-eyebrow">3 / 3 · {copy.chooseToolsEyebrow}</p>
        <h1 id="tools-title">{copy.chooseToolsTitle}</h1>
        <p className="onboarding-lede">{copy.chooseToolsBody}</p>
        <div className="tool-picker">
          {toolOptions(copy).map((tool) => (
            <button
              key={tool.id}
              type="button"
              className={selectedTools.includes(tool.id) ? 'selected' : ''}
              aria-pressed={selectedTools.includes(tool.id)}
              onClick={() => setSelectedTools((current) => toggleTool(current, tool.id))}
            >
              <span>{tool.symbol}</span>{tool.label}
            </button>
          ))}
        </div>
        <button className="start-action tools-submit" type="button" onClick={() => onComplete(selectedTools)}>
          {copy.saveTools}<kbd>Enter</kbd>
        </button>
      </section>
    )
  }

  if (!step) return null
  const answer = step.shortcut.keys
  const answerVisible = step.revealAnswer || feedback === 'wrong' || feedback === 'close'
  const pressedLabels = pressed ? formatCombo(pressed, platform) : heldModifierLabels(held, platform)
  const stageCopy = stageText(state.stage, copy)
  const mismatch = pressed ? describeMismatch(step.shortcut, pressed, platform) : 'none'

  return (
    <section
      className={`onboarding tutorial-stage tutorial-${state.stage} tutorial-${feedback}`}
      aria-labelledby="tutorial-title"
      ref={stageRef}
      tabIndex={-1}
      onClick={() => stageRef.current?.focus()}
    >
      <div className="tutorial-progress">
        <span>{stageCopy.step}</span><span>{stageIndex(state.stage)} {copy.stepOf}</span>
      </div>
      <div className="tutorial-copy">
        <p>{stageCopy.title}</p>
        <h1 id="tutorial-title">{shortcutAction(locale, step.action)}</h1>
        <span>{stageCopy.body}</span>
      </div>

      <div className={`tutorial-trace chord-trace trace-${feedback}`} aria-label={copy.nowPress}>
        <span className="trace-label">{copy.nowPress}</span>
        <div className="trace-line" aria-hidden="true" />
        <div className="trace-nodes">
          {pressedLabels.length ? (
            <div className="trace-step live-keys">
              {pressedLabels.map((key) => <kbd key={key}>{key}</kbd>)}
              {!pressed && held.length ? <kbd className="waiting-key">…</kbd> : null}
            </div>
          ) : answerVisible ? <KeyComboView combo={answer} platform={platform} /> : (
            <span className="recall-cue">?</span>
          )}
        </div>
      </div>

      {answerVisible ? (
        <div className="key-anatomy" aria-label={copy.correctAnswer}>
          <span><i>{copy.modifierKey}</i><strong>{formatCombo(answer, platform)[0]}</strong></span>
          <span><i>{copy.mainKey}</i><strong>{formatCombo(answer, platform).at(-1)}</strong></span>
        </div>
      ) : null}

      <div className="tutorial-feedback" aria-live="polite" aria-atomic="true">
        {feedback === 'correct' ? <strong className="success-text">{copy.tutorialCorrect}</strong> : null}
        {feedback === 'wrong' || feedback === 'close' ? (
          <div className="input-comparison">
            <span><small>{copy.youPressed}</small><b>{pressed ? formatCombo(pressed, platform).join(' + ') : '—'}</b></span>
            <span><small>{copy.correctAnswer}</small><b>{formatCombo(answer, platform).join(' + ')}</b></span>
            <p>{mismatch === 'modifiers' ? copy.tutorialWrongModifiers : copy.tutorialWrongKey}</p>
          </div>
        ) : null}
        {feedback === 'idle' && lostFocus ? <span>{copy.tutorialFocus}</span> : null}
        {feedback === 'idle' && !lostFocus ? <span>{stageCopy.hint}</span> : null}
      </div>
    </section>
  )
}

function KeyComboView({ combo, platform }: { combo: KeyCombo; platform: Platform }) {
  return <div className="trace-step">{formatCombo(combo, platform).map((key) => <kbd key={key}>{key}</kbd>)}</div>
}

function modifiersFromEvent(event: KeyboardEvent, platform: Platform): Modifier[] {
  const modifiers: Modifier[] = []
  if (event.metaKey) modifiers.push('meta')
  if (event.ctrlKey) modifiers.push('control')
  if (event.altKey) modifiers.push('alt')
  if (event.shiftKey) modifiers.push('shift')
  const order: Modifier[] = platform === 'mac' ? ['meta', 'control', 'alt', 'shift'] : ['control', 'alt', 'meta', 'shift']
  return modifiers.sort((a, b) => order.indexOf(a) - order.indexOf(b))
}

function heldModifierLabels(modifiers: Modifier[], platform: Platform) {
  const labels: Record<Platform, Record<Modifier, string>> = {
    mac: { meta: 'Cmd', control: 'Control', alt: 'Option', shift: 'Shift' },
    windows: { meta: 'Win', control: 'Ctrl', alt: 'Alt', shift: 'Shift' },
  }
  return modifiers.map((modifier) => labels[platform][modifier])
}

function stageIndex(stage: OnboardingState['stage']) {
  return stage === 'teach' ? 1 : stage === 'imitate' ? 2 : 3
}

function stageText(stage: OnboardingState['stage'], copy: ReturnType<typeof getCopy>) {
  if (stage === 'teach') return { step: copy.teachStep, title: copy.teachTitle, body: copy.teachBody, hint: copy.nowPress }
  if (stage === 'imitate') return { step: copy.imitateStep, title: copy.imitateTitle, body: copy.imitateBody, hint: copy.nowPress }
  return { step: copy.recallStep, title: copy.recallTitle, body: copy.recallBody, hint: copy.nowPress }
}

function toolOptions(copy: ReturnType<typeof getCopy>): Array<{ id: ToolId; label: string; symbol: string }> {
  return [
    { id: 'general', label: copy.generalTool, symbol: '⌘' },
    { id: 'vscode', label: copy.toolVscode, symbol: '⌁' },
    { id: 'readline', label: copy.toolReadline, symbol: '›_' },
    { id: 'devtools', label: copy.toolDevtools, symbol: '⌗' },
    { id: 'git', label: copy.toolGit, symbol: '⑂' },
    { id: 'vim', label: copy.toolVim, symbol: ':w' },
    { id: 'tmux', label: copy.toolTmux, symbol: '▥' },
    { id: 'emacs', label: copy.toolEmacs, symbol: 'C-x' },
  ]
}
