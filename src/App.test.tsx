import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { StrictMode } from 'react'
import App from './App'
import { loadSettings } from './settings'
import { getShortcuts, shortcutSequence } from './shortcuts'

describe('keyboard-first practice flow', () => {
  beforeEach(() => {
    localStorage.clear()
    localStorage.setItem('shortcutype-settings-v2', JSON.stringify({
      version: 2, platform: 'mac', mode: 'fixed', category: 'editor', specialty: 'vscode',
      duration: 60, count: 10, theme: 'dark', locale: 'en', learning: 'recall',
      includeSystemCards: false, motion: true, sound: false,
    }))
  })

  afterEach(() => vi.useRealTimers())

  it('starts from one keyboard action without revealing the answer', () => {
    const { container } = render(<StrictMode><App /></StrictMode>)
    expect(screen.getByText('Begin practice')).toBeInTheDocument()
    expect(container.querySelector('.chord-trace')).toHaveClass('concealed')
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
