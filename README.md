# Shortcutype

[English](README.md) | [简体中文](docs/README.zh-CN.md)

**Turn commands into reflexes.**

Shortcutype is a keyboard-first recall trainer for developer shortcuts. It presents the action, hides the answer, captures the real chord, and immediately schedules the next useful recall. It is local-only: no account, backend, analytics, or telemetry.

![Shortcutype ready state](docs/screenshots/ready.png)

## The practice loop

Shortcutype is intentionally not a shortcut cheat sheet. In the default **Recall** mode, the target combo stays hidden. Your input appears on the Chord Trace as a short signal path, and mistakes identify whether the main key or modifier set was wrong.

- Press `Enter` to start from the ready screen.
- Press the shown shortcut to answer; multi-step chords are accepted one step at a time.
- Press `F1` to reveal the answer. Revealed answers are marked assisted and are not scored.
- Press `Ctrl + →` to skip.
- Press `Esc` or `Ctrl/Cmd + Shift + P` for the command palette. Time pauses while it is open.
- From results, press `Enter` to repeat or `Tab`, then `Enter`, for a deliberate quick restart.

The entire start → practice → pause/configure → finish → review → restart path is keyboard accessible.

## Modes and practice sets

- Fixed sessions: 10, 25, or 50 recalls.
- Timed sessions: 30, 60, or 120 seconds.
- Category practice: system, text, terminal, browser/devtools, editor, files, or workflow.
- Specialty practice: Core OS, Readline, tmux, Vim, Emacs, VS Code, DevTools, or Git.
- Weak review: shortcuts below 80% accuracy after at least two scored attempts.
- Learn mode: keeps the target visible for familiarization before switching to Recall.

The adaptive scheduler weights new, weak, and overdue shortcuts while preventing immediate repeats. The small reason label above each prompt explains why it appeared.

## Honest browser limits

Some shortcuts belong to the operating system, including macOS `Cmd + Tab`, `Cmd + Space`, and Windows `Alt + Tab`. A browser cannot reliably capture them.

Shortcutype excludes these shortcuts by default. You can include them as **unscored system cards**: the app shows the real shortcut, asks you to rehearse it outside the browser, and uses `Enter` only as confirmation. Safe proxy combinations are never counted as real muscle-memory practice.

## Results and local progress

The result screen includes scored accuracy, recall rate, best streak, duration, an accuracy-over-time rhythm chart, and per-attempt review. Missed, close, skipped, and revealed prompts can be retried as a focused set.

Progress is stored in `localStorage` under:

```text
shortcutype-progress-v2
shortcutype-settings-v2
```

Existing `shortcutype-progress-v1` and `shortcutype-settings-v1` data is migrated automatically. Invalid local data falls back safely without breaking the app.

## Accessibility and display

- English and Simplified Chinese.
- Dark and light themes.
- Visible keyboard focus and semantic dialogs/controls.
- Non-color text feedback for correct, wrong, close, skipped, and assisted states.
- `prefers-reduced-motion` support plus an in-app motion toggle.
- Desktop-first practice; mobile remains useful for browsing shortcuts and results and explains the physical-keyboard requirement.

## Development

```bash
npm install
npm run dev
```

Quality gates:

```bash
npm test
npm run lint
npm run build
npm audit --audit-level=moderate
```

Core input parsing, sequence matching, adaptive scheduling, v1→v2 migration, timing boundaries, command-palette behavior, and keyboard session transitions are covered by Vitest and Testing Library.

## Visual verification

Browser-reviewed states live in [`docs/screenshots`](docs/screenshots): ready, focused running, partial sequence, error, command palette, results, light theme, and mobile.

Shortcutype is inspired by the focus and immediacy of excellent typing tools, but its interaction model, visual system, Chord Trace, scheduling, and implementation are original.
