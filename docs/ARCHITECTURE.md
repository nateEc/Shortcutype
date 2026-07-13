# Shortcutype architecture

## Runtime shape

Shortcutype is a static React application. It has no backend, account system, analytics, or runtime network dependency. Vite builds the app into `dist/`; all user state stays in browser `localStorage`.

The implementation is split into four layers:

1. **Shortcut catalog** — `src/shortcuts.ts` owns the cross-platform shortcut data, formatting, categories, and specialties.
2. **Domain logic** — `input.ts`, `scheduler.ts`, `progress.ts`, `settings.ts`, and `onboarding.ts` contain deterministic parsing, scoring, scheduling, normalization, migration, and state transitions.
3. **Interaction shell** — `App.tsx` owns the active session and coordinates keyboard capture, overlays, persistence notifications, results, and navigation.
4. **Focused views** — `components/OnboardingExperience.tsx` and `components/ReadyHome.tsx` render the first-run learning path and intent-based home screen.

Visible copy is centralized in `ui-copy.ts`; shortcut action/category translations live in `i18n.ts`. `storage.ts` is the single failure boundary around browser storage.

## Session flow

```text
Ready
  → buildAdaptiveQueue
  → Running
      → keyboard event → KeyCombo
      → evaluateSequence
      → progress/stat update
      → next scheduled shortcut
  → Finished
  → results + focused retry
```

The scheduler is seeded for deterministic tests. It weights new, weak, and overdue shortcuts while preventing immediate repeats. The session owns a snapshot of its queue; changing a structural setting returns the user to Ready instead of mutating an active drill underneath them.

## Persistence boundaries

Three versioned records are stored locally:

- `shortcutype-settings-v2`
- `shortcutype-progress-v2`
- `shortcutype-onboarding-v1`

Every load validates versions and runtime values. Invalid current records may fall back to valid legacy records. Dates, enum values, counts, and durations are normalized before reaching UI code. Storage denial or quota errors never terminate practice; the app shows a non-blocking warning that progress cannot be saved.

## Accessibility model

- The practice area is a focusable landmark reached by the Skip link.
- Dialogs hide background landmarks from assistive technology and trap keyboard focus.
- Closing a dialog restores the element that opened it.
- Choice groups expose `aria-pressed`; switches expose `aria-checked`.
- Correct/error states use text in addition to color.
- Motion can be disabled in settings and respects `prefers-reduced-motion`.
- Playwright runs axe checks against the Ready page and drawer states.

## Verification layers

- **Vitest:** pure domain behavior, migration, persistence failures, component state, and keyboard transitions.
- **Playwright:** first run, full 10-answer session, results, settings, library, focus restoration, mobile layout, error/reveal behavior, command palette, storage denial, and screenshot evidence.
- **Benchmark:** scheduler and input-evaluation hot paths.
- **Build/audit:** TypeScript, Vite production build, and npm vulnerability audit.

The canonical full gate is `npm run verify`.
