import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { StrictMode } from 'react'
import App from './App'
import { loadSettings } from './settings'
import { getShortcuts, shortcutSequence } from './shortcuts'
import { ONBOARDING_KEY } from './onboarding'

describe('keyboard-first practice flow', () => {
  beforeEach(() => {
    localStorage.clear()
    localStorage.setItem('shortcutype-settings-v2', JSON.stringify({
      version: 2, platform: 'mac', mode: 'fixed', category: 'editor', specialty: 'vscode',
      duration: 60, count: 10, theme: 'dark', locale: 'en', learning: 'recall',
      includeSystemCards: false, motion: true, sound: false,
    }))
    localStorage.setItem(ONBOARDING_KEY, JSON.stringify({
      version: 1, status: 'completed', stage: 'tools', selectedTools: ['general'], completedAt: 1,
    }))
  })

  afterEach(() => vi.useRealTimers())

  it('starts from one keyboard action without revealing the answer', () => {
    const { container } = render(<StrictMode><App /></StrictMode>)
    expect(screen.getByText('What do you want to practice?')).toBeInTheDocument()
    fireEvent.keyDown(window, { key: 'Enter', code: 'Enter' })
    expect(container.querySelector('.app')).toHaveClass('phase-running')
    expect(container.querySelector('.masthead')).toHaveAttribute('aria-hidden', 'true')
    expect(container.querySelector('.chord-trace')).toHaveClass('concealed')
  })

  it('pauses into the Esc command palette and resumes with focus state restored', () => {
    localStorage.setItem('shortcutype-settings-v2', JSON.stringify({
      version: 2, platform: 'mac', mode: 'specialty', category: 'editor', specialty: 'tmux',
      duration: 60, count: 10, theme: 'dark', locale: 'en', learning: 'recall',
      includeSystemCards: false, motion: true, sound: false,
    }))
    const { container } = render(<App />)
    fireEvent.keyDown(window, { key: 'Enter', code: 'Enter' })
    fireEvent.keyDown(window, { key: 'Escape', code: 'Escape' })
    expect(screen.getByRole('dialog', { name: 'Command palette' })).toBeInTheDocument()
    expect(container.querySelector('.app')).toHaveClass('phase-paused')
    expect(screen.getByPlaceholderText('Search commands…')).toHaveFocus()
    fireEvent.keyDown(screen.getByPlaceholderText('Search commands…'), { key: 'Tab', code: 'Tab' })
    expect(screen.getByRole('option', { name: 'Resume practice' })).toHaveFocus()
    fireEvent.keyDown(window, { key: 'Escape', code: 'Escape' })
    expect(screen.queryByRole('dialog', { name: 'Command palette' })).not.toBeInTheDocument()
    expect(container.querySelector('.app')).toHaveClass('phase-running')
  })

  it('closes the settings drawer with Escape', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Practice setup' }))
    expect(screen.getByRole('dialog', { name: 'settings' })).toBeInTheDocument()
    fireEvent.keyDown(window, { key: 'Escape', code: 'Escape' })
    expect(screen.queryByRole('dialog', { name: 'settings' })).not.toBeInTheDocument()
  })

  it('reveals with F1 and marks the attempt unscored', () => {
    const { container } = render(<App />)
    fireEvent.keyDown(window, { key: 'Enter', code: 'Enter' })
    fireEvent.keyDown(window, { key: 'F1', code: 'F1' })
    expect(screen.getByText('Answer revealed — unscored')).toBeInTheDocument()
    expect(container.querySelector('.chord-trace')).not.toHaveClass('concealed')
  })

  it('ignores repeated keydown events', () => {
    render(<App />)
    fireEvent.keyDown(window, { key: 'Enter', code: 'Enter' })
    const action = screen.getByRole('heading', { level: 1 }).textContent
    fireEvent.keyDown(window, { key: 'x', code: 'KeyX', repeat: true })
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(action)
    expect(screen.getByText('0 / 10')).toBeInTheDocument()
  })

  it('migrates legacy settings and falls back from corrupt data', () => {
    localStorage.clear()
    localStorage.setItem('shortcutype-settings-v1', JSON.stringify({ platform: 'windows', locale: 'zh-CN', mode: 'timed', duration: 120 }))
    expect(loadSettings()).toMatchObject({ version: 2, platform: 'windows', locale: 'zh-CN', mode: 'timed', duration: 120 })
    localStorage.clear()
    localStorage.setItem('shortcutype-settings-v2', '{broken')
    expect(loadSettings()).toMatchObject({ version: 2, learning: 'recall', includeSystemCards: false })
  })

  it('applies a command and resumes the paused session', () => {
    const { container } = render(<App />)
    fireEvent.keyDown(window, { key: 'Enter', code: 'Enter' })
    fireEvent.keyDown(window, { key: 'Escape', code: 'Escape' })
    const search = screen.getByPlaceholderText('Search commands…')
    fireEvent.change(search, { target: { value: 'theme light' } })
    fireEvent.keyDown(search, { key: 'Enter', code: 'Enter' })
    expect(container.querySelector('.app')).toHaveClass('phase-running')
    expect(document.body.dataset.theme).toBe('light')
  })

  it('moves ready → running → finished → restart entirely by keyboard', () => {
    const { container } = render(<App />)
    fireEvent.keyDown(window, { key: 'Enter', code: 'Enter' })
    fireEvent.keyDown(window, { key: 'Escape', code: 'Escape' })
    const search = screen.getByPlaceholderText('Search commands…')
    fireEvent.change(search, { target: { value: 'end session' } })
    fireEvent.keyDown(search, { key: 'Enter', code: 'Enter' })
    expect(screen.getByText('Practice complete')).toBeInTheDocument()
    expect(container.querySelector('.app')).toHaveClass('phase-finished')
    fireEvent.keyDown(window, { key: 'Tab', code: 'Tab' })
    expect(screen.getByText('Enter', { selector: '.restart-tip' })).toBeInTheDocument()
    fireEvent.keyDown(window, { key: 'Enter', code: 'Enter' })
    expect(container.querySelector('.app')).toHaveClass('phase-running')
  })

  it('finishes a timed session once at the boundary', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'))
    localStorage.setItem('shortcutype-settings-v2', JSON.stringify({
      version: 2, platform: 'mac', mode: 'timed', category: 'editor', specialty: 'vscode',
      duration: 30, count: 10, theme: 'dark', locale: 'en', learning: 'recall',
      includeSystemCards: false, motion: false, sound: false,
    }))
    const { container } = render(<StrictMode><App /></StrictMode>)
    fireEvent.keyDown(window, { key: 'Enter', code: 'Enter' })
    act(() => vi.advanceTimersByTime(30_200))
    expect(container.querySelector('.app')).toHaveClass('phase-finished')
    act(() => vi.advanceTimersByTime(2_000))
    const stored = JSON.parse(localStorage.getItem('shortcutype-progress-v2') ?? '{}')
    expect(stored.recentSessions).toHaveLength(1)
  })

  it('renders correct feedback and the next prompt in the same interaction frame', () => {
    localStorage.setItem('shortcutype-settings-v2', JSON.stringify({
      version: 2, platform: 'mac', mode: 'specialty', category: 'editor', specialty: 'vscode',
      duration: 60, count: 10, theme: 'dark', locale: 'en', learning: 'recall',
      includeSystemCards: false, motion: false, sound: false,
    }))
    render(<App />)
    fireEvent.keyDown(window, { key: 'Enter', code: 'Enter' })
    const firstAction = screen.getByRole('heading', { level: 1 }).textContent
    const shortcut = getShortcuts('mac').find((item) => item.action === firstAction)
    expect(shortcut).toBeDefined()
    const started = performance.now()
    for (const combo of shortcutSequence(shortcut!)) {
      fireEvent.keyDown(window, {
        key: browserKey(combo.key), code: browserCode(combo.key),
        metaKey: combo.modifiers.includes('meta'), ctrlKey: combo.modifiers.includes('control'),
        altKey: combo.modifiers.includes('alt'), shiftKey: combo.modifiers.includes('shift'),
      })
    }
    const elapsed = performance.now() - started
    expect(screen.getByText('Locked in')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1 }).textContent).not.toBe(firstAction)
    expect(elapsed).toBeLessThan(50)
  })
})

describe('first success experience', () => {
  beforeEach(() => {
    localStorage.clear()
    localStorage.setItem('shortcutype-settings-v2', JSON.stringify({
      version: 2, platform: 'mac', mode: 'fixed', category: 'editor', specialty: 'vscode',
      duration: 60, count: 10, theme: 'dark', locale: 'en', learning: 'recall',
      includeSystemCards: false, motion: true, sound: false,
    }))
  })

  afterEach(() => vi.useRealTimers())

  it('teaches, imitates, recalls, selects tools, and starts a useful session', () => {
    vi.useFakeTimers()
    const { container } = render(<App />)
    expect(screen.getByText('See an action. Press its shortcut.')).toBeInTheDocument()
    expect(screen.getByText("Don't type the action name. Use the real key combination you would use at work.")).toBeInTheDocument()

    fireEvent.keyDown(window, { key: 'Enter', code: 'Enter' })
    expect(screen.getByText('Start with the answer visible')).toBeInTheDocument()

    fireEvent.keyDown(window, { key: 'Meta', code: 'MetaLeft', metaKey: true })
    expect(screen.getByText('Cmd', { selector: '.live-keys kbd' })).toBeInTheDocument()
    fireEvent.keyDown(window, { key: 'c', code: 'KeyC', metaKey: true })
    expect(screen.getByText('That is it. Moving to the next step…')).toBeInTheDocument()
    act(() => vi.advanceTimersByTime(700))

    expect(screen.getByText('Now follow the pattern')).toBeInTheDocument()
    fireEvent.keyDown(window, { key: 'x', code: 'KeyX' })
    expect(screen.getByText('The main key is different. Compare the two combinations and try again.')).toBeInTheDocument()
    expect(screen.getByText('Cmd + F')).toBeInTheDocument()
    fireEvent.keyDown(window, { key: 'f', code: 'KeyF', metaKey: true })
    act(() => vi.advanceTimersByTime(700))

    expect(screen.getByText('Now do it from memory')).toBeInTheDocument()
    expect(container.querySelector('.recall-cue')).toBeInTheDocument()
    expect(screen.queryByText('Cmd', { selector: '.tutorial-trace kbd' })).not.toBeInTheDocument()
    fireEvent.keyDown(window, { key: 'c', code: 'KeyC', metaKey: true })
    act(() => vi.advanceTimersByTime(700))

    expect(screen.getByText('Where do you work most?')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /VS Code/ }))
    fireEvent.keyDown(window, { key: 'Enter', code: 'Enter' })
    expect(container.querySelector('.app')).toHaveClass('phase-running')
    expect(JSON.parse(localStorage.getItem(ONBOARDING_KEY) ?? '{}')).toMatchObject({
      status: 'completed', selectedTools: ['vscode'],
    })
  })

  it('does not force onboarding on users with existing progress', () => {
    localStorage.setItem('shortcutype-progress-v2', JSON.stringify({
      version: 2, bestStreak: 1, bestScore: 1, recentSessions: [],
      shortcutStats: { known: { attempts: 1, correct: 1, wrong: 0, close: 0, skipped: 0, revealed: 0, streak: 1 } },
    }))
    render(<App />)
    expect(screen.queryByText('See an action. Press its shortcut.')).not.toBeInTheDocument()
    expect(screen.getByText('What do you want to practice?')).toBeInTheDocument()
  })

  it('supports skip, replay, repeat/IME protection, focus recovery, and Windows chords', () => {
    const { unmount } = render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Skip introduction' }))
    expect(screen.getByText('What do you want to practice?')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Practice setup' }))
    fireEvent.click(screen.getByRole('button', { name: 'Replay introduction' }))
    expect(screen.getByText('See an action. Press its shortcut.')).toBeInTheDocument()
    fireEvent.keyDown(window, { key: 'Enter', code: 'Enter' })
    fireEvent.keyDown(window, { key: 'c', code: 'KeyC', metaKey: true, repeat: true })
    expect(screen.getByText('Start with the answer visible')).toBeInTheDocument()
    fireEvent.keyDown(window, { key: 'c', code: 'KeyC', metaKey: true, isComposing: true })
    expect(screen.queryByText('That is it. Moving to the next step…')).not.toBeInTheDocument()
    fireEvent(window, new Event('blur'))
    expect(screen.getByText('Click the practice area or press any key to continue.')).toBeInTheDocument()
    unmount()

    localStorage.clear()
    localStorage.setItem('shortcutype-settings-v2', JSON.stringify({
      version: 2, platform: 'windows', mode: 'fixed', category: 'editor', specialty: 'vscode',
      duration: 60, count: 10, theme: 'dark', locale: 'en', learning: 'recall',
      includeSystemCards: false, motion: false, sound: false,
    }))
    render(<App />)
    fireEvent.keyDown(window, { key: 'Enter', code: 'Enter' })
    expect(screen.getByText('Ctrl', { selector: '.tutorial-trace kbd' })).toBeInTheDocument()
    expect(screen.queryByText('Cmd', { selector: '.tutorial-trace kbd' })).not.toBeInTheDocument()
  })

  it('provides Chinese first-run copy without exposing expert mode terms', () => {
    localStorage.setItem('shortcutype-settings-v2', JSON.stringify({
      version: 2, platform: 'mac', mode: 'specialty', category: 'editor', specialty: 'tmux',
      duration: 60, count: 10, theme: 'dark', locale: 'zh-CN', learning: 'recall',
      includeSystemCards: false, motion: false, sound: false,
    }))
    render(<App />)
    expect(screen.getByText('看到一个动作，按下它的快捷键。')).toBeInTheDocument()
    expect(screen.getByText('不要输入动作名称。请按下你在工作中真正会用的组合键。')).toBeInTheDocument()
    expect(screen.queryByText('Recall')).not.toBeInTheDocument()
    expect(screen.queryByText('Specialty')).not.toBeInTheDocument()
  })
})

function browserKey(key: string) {
  const named: Record<string, string> = {
    escape: 'Escape', enter: 'Enter', tab: 'Tab', space: ' ', arrowleft: 'ArrowLeft',
    arrowright: 'ArrowRight', arrowup: 'ArrowUp', arrowdown: 'ArrowDown',
  }
  return named[key] ?? key
}

function browserCode(key: string) {
  if (/^[a-z]$/.test(key)) return `Key${key.toUpperCase()}`
  const named: Record<string, string> = { escape: 'Escape', enter: 'Enter', tab: 'Tab', space: 'Space' }
  return named[key] ?? key
}
