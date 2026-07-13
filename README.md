# Shortcutype

[English](README.md) | [简体中文](docs/README.zh-CN.md)

**Turn commands into reflexes.**

**[Try Shortcutype online](https://nateEc.github.io/Shortcutype/)**

Shortcutype is a keyboard-first recall trainer for developer shortcuts. It presents the action, hides the answer, captures the real chord, and immediately schedules the next useful recall. It is local-only: no account, backend, analytics, or telemetry.

![Shortcutype ready state](docs/screenshots/ready.png)

## Your first minute

The first run explains the whole product in one sentence: **the action is the question; the shortcut is your answer**. A short, platform-correct tutorial then moves through three steps:

1. **Teach:** press a visible Copy shortcut.
2. **Imitate:** repeat the same input pattern for Find in file.
3. **Recall:** answer Copy again with the shortcut hidden.

Choose the tools you use—such as VS Code, Vim, Git, or DevTools—and Shortcutype immediately starts a relevant 10-card practice set. You can skip the introduction, replay it from Practice setup or the command palette, and existing users with saved activity are never forced through it.

After onboarding, the ready screen asks what you want to accomplish instead of exposing configuration first: continue, run a five-minute warmup, review weak shortcuts, or practice a selected tool. Advanced setup remains one action away.

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
- Timed sessions: 30, 60, 120, or 300 seconds.
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
shortcutype-onboarding-v1
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

With Node.js 20 or newer, a fresh checkout starts with one command:

```bash
npm start
```

The start command installs locked dependencies only when they are missing, then launches the local Vite server.

Quality gates:

```bash
npm test
npm run test:e2e
npm run lint
npm run build
npm audit --audit-level=moderate
npm run benchmark
```

Run the complete release gate with `npm run verify`.

Core input parsing, sequence matching, adaptive scheduling, onboarding transitions, platform-correct tutorial chords, v1→v2 migration, timing boundaries, command-palette behavior, and keyboard session transitions are covered by Vitest and Testing Library.

## Visual verification

Browser-reviewed states live in [`docs/screenshots`](docs/screenshots): ready, focused running, partial sequence, error, command palette, results, light theme, and mobile. The [`onboarding` set](docs/screenshots/onboarding) records the first-run explanation, Teach, Imitate, Recall, error comparison, tool selection, personalized ready screen, and mobile ready screen.

Shortcutype is inspired by the focus and immediacy of excellent typing tools, but its interaction model, visual system, Chord Trace, scheduling, and implementation are original.

Further documentation: [architecture](docs/ARCHITECTURE.md), [user guide](docs/USER_GUIDE.md), [known limitations](docs/KNOWN_LIMITATIONS.md), and [hardening progress](progress.md).
