export type Platform = 'mac' | 'windows'

export type Modifier = 'meta' | 'control' | 'alt' | 'shift'

export type CategoryId =
  | 'system'
  | 'text'
  | 'terminal'
  | 'browser'
  | 'editor'
  | 'files'
  | 'workflow'

export type SpecialtyId =
  | 'core'
  | 'readline'
  | 'tmux'
  | 'vim'
  | 'emacs'
  | 'vscode'
  | 'devtools'
  | 'git'

export type KeyCombo = {
  modifiers: Modifier[]
  key: string
}

export type Shortcut = {
  id: string
  platform: Platform
  category: CategoryId
  specialty?: SpecialtyId
  action: string
  keys: KeyCombo
  sequence?: KeyCombo[]
  aliases?: KeyCombo[]
  realKeys?: KeyCombo
  capture: 'native' | 'simulated'
  note?: string
}

export const platforms: { id: Platform; label: string }[] = [
  { id: 'mac', label: 'macOS' },
  { id: 'windows', label: 'Windows' },
]

export const categories: { id: CategoryId; label: string }[] = [
  { id: 'system', label: 'System navigation' },
  { id: 'text', label: 'Text editing' },
  { id: 'terminal', label: 'Terminal' },
  { id: 'browser', label: 'Browser/devtools' },
  { id: 'editor', label: 'Editor/IDE' },
  { id: 'files', label: 'Finder/File Explorer' },
  { id: 'workflow', label: 'Git/workflow' },
]

export const specialties: { id: SpecialtyId; label: string }[] = [
  { id: 'core', label: 'Core OS' },
  { id: 'readline', label: 'Shell / Readline' },
  { id: 'tmux', label: 'tmux' },
  { id: 'vim', label: 'Vim' },
  { id: 'emacs', label: 'Emacs' },
  { id: 'vscode', label: 'VS Code' },
  { id: 'devtools', label: 'Browser DevTools' },
  { id: 'git', label: 'Git workflow' },
]

export const modifierOrder: Record<Platform, Modifier[]> = {
  mac: ['meta', 'control', 'alt', 'shift'],
  windows: ['control', 'alt', 'meta', 'shift'],
}

const modifierLabels: Record<Platform, Record<Modifier, string>> = {
  mac: {
    meta: 'Cmd',
    control: 'Control',
    alt: 'Option',
    shift: 'Shift',
  },
  windows: {
    meta: 'Win',
    control: 'Ctrl',
    alt: 'Alt',
    shift: 'Shift',
  },
}

const keyLabels: Record<string, string> = {
  '`': '`',
  '/': '/',
  '.': '.',
  ',': ',',
  '-': '-',
  '=': '=',
  '[': '[',
  ']': ']',
  ':': ':',
  '"': '"',
  '%': '%',
  space: 'Space',
  tab: 'Tab',
  enter: 'Enter',
  escape: 'Esc',
  backspace: 'Backspace',
  delete: 'Delete',
  arrowleft: 'Left Arrow',
  arrowright: 'Right Arrow',
  arrowup: 'Up Arrow',
  arrowdown: 'Down Arrow',
  home: 'Home',
  end: 'End',
  pageup: 'Page Up',
  pagedown: 'Page Down',
  f2: 'F2',
  f5: 'F5',
}

const combo = (modifiers: Modifier[], key: string): KeyCombo => ({
  modifiers,
  key,
})

export function sortModifiers(platform: Platform, modifiers: Modifier[]) {
  const unique = [...new Set(modifiers)]
  const order = modifierOrder[platform]
  return unique.sort((a, b) => order.indexOf(a) - order.indexOf(b))
}

export function formatCombo(comboValue: KeyCombo, platform: Platform) {
  const modifiers = sortModifiers(platform, comboValue.modifiers).map(
    (modifier) => modifierLabels[platform][modifier],
  )
  const key = keyLabels[comboValue.key] ?? comboValue.key.toUpperCase()
  return [...modifiers, key]
}

export function comboSignature(comboValue: KeyCombo, platform: Platform) {
  return [...sortModifiers(platform, comboValue.modifiers), comboValue.key].join(
    '+',
  )
}

export function categoryLabel(categoryId: CategoryId) {
  return categories.find((category) => category.id === categoryId)?.label ?? categoryId
}

const defaultSpecialtyByCategory: Record<CategoryId, SpecialtyId> = {
  system: 'core',
  text: 'core',
  terminal: 'readline',
  browser: 'devtools',
  editor: 'vscode',
  files: 'core',
  workflow: 'git',
}

export function shortcutSpecialty(shortcut: Shortcut) {
  return shortcut.specialty ?? defaultSpecialtyByCategory[shortcut.category]
}

export function specialtyLabel(specialtyId: SpecialtyId) {
  return specialties.find((specialty) => specialty.id === specialtyId)?.label ?? specialtyId
}

export function shortcutSequence(shortcut: Shortcut) {
  return shortcut.sequence ?? [shortcut.keys]
}

export function getShortcuts(platform: Platform) {
  return shortcutLibrary.filter((shortcut) => shortcut.platform === platform)
}

type CrossPlatformShortcut = Omit<Shortcut, 'id' | 'platform'> & { id: string }

const bothPlatforms = (items: CrossPlatformShortcut[]): Shortcut[] =>
  platforms.flatMap(({ id: platform }) =>
    items.map((item) => {
      const { id, ...shortcut } = item
      return {
        ...shortcut,
        id: `${platform}-${id}`,
        platform,
      }
    }),
  )

export const shortcutLibrary: Shortcut[] = [
  {
    id: 'mac-system-switch-app',
    platform: 'mac',
    category: 'system',
    action: 'Switch app',
    keys: combo(['control'], 'tab'),
    realKeys: combo(['meta'], 'tab'),
    capture: 'simulated',
    note: 'Cmd+Tab is owned by macOS. Drill with Control+Tab in the browser-safe lane.',
  },
  {
    id: 'mac-system-search',
    platform: 'mac',
    category: 'system',
    action: 'Open system search',
    keys: combo(['control', 'alt'], 'space'),
    realKeys: combo(['meta'], 'space'),
    capture: 'simulated',
    note: 'Cmd+Space is usually reserved by Spotlight. Drill with Control+Option+Space here.',
  },
  {
    id: 'mac-system-settings',
    platform: 'mac',
    category: 'system',
    action: 'Open app settings',
    keys: combo(['meta'], ','),
    capture: 'native',
  },
  {
    id: 'mac-text-find',
    platform: 'mac',
    category: 'text',
    action: 'Find in file',
    keys: combo(['meta'], 'f'),
    capture: 'native',
  },
  {
    id: 'mac-text-select-all',
    platform: 'mac',
    category: 'text',
    action: 'Select all',
    keys: combo(['meta'], 'a'),
    capture: 'native',
  },
  {
    id: 'mac-text-save',
    platform: 'mac',
    category: 'text',
    action: 'Save file',
    keys: combo(['meta'], 's'),
    capture: 'native',
  },
  {
    id: 'mac-text-delete-word',
    platform: 'mac',
    category: 'text',
    action: 'Delete previous word',
    keys: combo(['alt'], 'backspace'),
    capture: 'native',
  },
  {
    id: 'mac-text-word-left',
    platform: 'mac',
    category: 'text',
    action: 'Move one word left',
    keys: combo(['alt'], 'arrowleft'),
    capture: 'native',
  },
  {
    id: 'mac-text-line-start',
    platform: 'mac',
    category: 'text',
    action: 'Jump to line start',
    keys: combo(['meta'], 'arrowleft'),
    capture: 'native',
  },
  {
    id: 'mac-text-comment',
    platform: 'mac',
    category: 'text',
    action: 'Toggle line comment',
    keys: combo(['meta'], '/'),
    capture: 'native',
  },
  {
    id: 'mac-terminal-interrupt',
    platform: 'mac',
    category: 'terminal',
    action: 'Stop current process',
    keys: combo(['control'], 'c'),
    capture: 'native',
  },
  {
    id: 'mac-terminal-clear',
    platform: 'mac',
    category: 'terminal',
    action: 'Clear terminal',
    keys: combo(['control'], 'l'),
    capture: 'native',
  },
  {
    id: 'mac-terminal-history',
    platform: 'mac',
    category: 'terminal',
    action: 'Search command history',
    keys: combo(['control'], 'r'),
    capture: 'native',
  },
  {
    id: 'mac-terminal-line-start',
    platform: 'mac',
    category: 'terminal',
    action: 'Terminal line start',
    keys: combo(['control'], 'a'),
    capture: 'native',
  },
  {
    id: 'mac-terminal-line-end',
    platform: 'mac',
    category: 'terminal',
    action: 'Terminal line end',
    keys: combo(['control'], 'e'),
    capture: 'native',
  },
  {
    id: 'mac-terminal-delete-line',
    platform: 'mac',
    category: 'terminal',
    action: 'Delete line before cursor',
    keys: combo(['control'], 'u'),
    capture: 'native',
  },
  {
    id: 'mac-browser-devtools',
    platform: 'mac',
    category: 'browser',
    action: 'Open DevTools',
    keys: combo(['meta', 'alt'], 'i'),
    capture: 'native',
  },
  {
    id: 'mac-browser-hard-refresh',
    platform: 'mac',
    category: 'browser',
    action: 'Hard reload',
    keys: combo(['meta', 'shift'], 'r'),
    capture: 'native',
  },
  {
    id: 'mac-browser-address',
    platform: 'mac',
    category: 'browser',
    action: 'Focus address bar',
    keys: combo(['meta'], 'l'),
    capture: 'native',
  },
  {
    id: 'mac-browser-new-tab',
    platform: 'mac',
    category: 'browser',
    action: 'New tab',
    keys: combo(['meta'], 't'),
    capture: 'native',
  },
  {
    id: 'mac-browser-reopen-tab',
    platform: 'mac',
    category: 'browser',
    action: 'Reopen closed tab',
    keys: combo(['meta', 'shift'], 't'),
    capture: 'native',
  },
  {
    id: 'mac-editor-command-palette',
    platform: 'mac',
    category: 'editor',
    action: 'Open command palette',
    keys: combo(['meta', 'shift'], 'p'),
    capture: 'native',
  },
  {
    id: 'mac-editor-quick-open',
    platform: 'mac',
    category: 'editor',
    action: 'Quick open file',
    keys: combo(['meta'], 'p'),
    capture: 'native',
  },
  {
    id: 'mac-editor-sidebar',
    platform: 'mac',
    category: 'editor',
    action: 'Toggle sidebar',
    keys: combo(['meta'], 'b'),
    capture: 'native',
  },
  {
    id: 'mac-editor-terminal',
    platform: 'mac',
    category: 'editor',
    action: 'Toggle integrated terminal',
    keys: combo(['control'], '`'),
    capture: 'native',
  },
  {
    id: 'mac-editor-line',
    platform: 'mac',
    category: 'editor',
    action: 'Go to line',
    keys: combo(['control'], 'g'),
    capture: 'native',
  },
  {
    id: 'mac-finder-go-path',
    platform: 'mac',
    category: 'files',
    action: 'Go to path',
    keys: combo(['meta', 'shift'], 'g'),
    capture: 'native',
  },
  {
    id: 'mac-finder-hidden',
    platform: 'mac',
    category: 'files',
    action: 'Show hidden files',
    keys: combo(['meta', 'shift'], '.'),
    capture: 'native',
  },
  {
    id: 'mac-finder-parent',
    platform: 'mac',
    category: 'files',
    action: 'Open parent folder',
    keys: combo(['meta'], 'arrowup'),
    capture: 'native',
  },
  {
    id: 'mac-finder-quick-look',
    platform: 'mac',
    category: 'files',
    action: 'Quick Look selected file',
    keys: combo([], 'space'),
    capture: 'native',
  },
  {
    id: 'mac-finder-new-folder',
    platform: 'mac',
    category: 'files',
    action: 'New folder',
    keys: combo(['meta', 'shift'], 'n'),
    capture: 'native',
  },
  {
    id: 'mac-workflow-source-control',
    platform: 'mac',
    category: 'workflow',
    action: 'Open Source Control view',
    keys: combo(['control', 'shift'], 'g'),
    capture: 'native',
  },
  {
    id: 'mac-workflow-project-search',
    platform: 'mac',
    category: 'workflow',
    action: 'Search project',
    keys: combo(['meta', 'shift'], 'f'),
    capture: 'native',
  },
  {
    id: 'mac-workflow-build-task',
    platform: 'mac',
    category: 'workflow',
    action: 'Run build task',
    keys: combo(['meta', 'shift'], 'b'),
    capture: 'native',
  },
  {
    id: 'windows-system-switch-app',
    platform: 'windows',
    category: 'system',
    action: 'Switch app',
    keys: combo(['control'], 'tab'),
    realKeys: combo(['alt'], 'tab'),
    capture: 'simulated',
    note: 'Alt+Tab is owned by Windows. Drill with Ctrl+Tab in the browser-safe lane.',
  },
  {
    id: 'windows-system-search',
    platform: 'windows',
    category: 'system',
    action: 'Open system search',
    keys: combo(['control', 'alt'], 'space'),
    realKeys: combo(['meta'], 's'),
    capture: 'simulated',
    note: 'Win+S can leave the browser. Drill with Ctrl+Alt+Space here.',
  },
  {
    id: 'windows-system-settings',
    platform: 'windows',
    category: 'system',
    action: 'Open app settings',
    keys: combo(['control'], ','),
    capture: 'native',
  },
  {
    id: 'windows-text-find',
    platform: 'windows',
    category: 'text',
    action: 'Find in file',
    keys: combo(['control'], 'f'),
    capture: 'native',
  },
  {
    id: 'windows-text-select-all',
    platform: 'windows',
    category: 'text',
    action: 'Select all',
    keys: combo(['control'], 'a'),
    capture: 'native',
  },
  {
    id: 'windows-text-save',
    platform: 'windows',
    category: 'text',
    action: 'Save file',
    keys: combo(['control'], 's'),
    capture: 'native',
  },
  {
    id: 'windows-text-delete-word',
    platform: 'windows',
    category: 'text',
    action: 'Delete previous word',
    keys: combo(['control'], 'backspace'),
    capture: 'native',
  },
  {
    id: 'windows-text-word-left',
    platform: 'windows',
    category: 'text',
    action: 'Move one word left',
    keys: combo(['control'], 'arrowleft'),
    capture: 'native',
  },
  {
    id: 'windows-text-line-start',
    platform: 'windows',
    category: 'text',
    action: 'Jump to line start',
    keys: combo([], 'home'),
    capture: 'native',
  },
  {
    id: 'windows-text-comment',
    platform: 'windows',
    category: 'text',
    action: 'Toggle line comment',
    keys: combo(['control'], '/'),
    capture: 'native',
  },
  {
    id: 'windows-terminal-interrupt',
    platform: 'windows',
    category: 'terminal',
    action: 'Stop current process',
    keys: combo(['control'], 'c'),
    capture: 'native',
  },
  {
    id: 'windows-terminal-clear',
    platform: 'windows',
    category: 'terminal',
    action: 'Clear terminal',
    keys: combo(['control'], 'l'),
    capture: 'native',
  },
  {
    id: 'windows-terminal-history',
    platform: 'windows',
    category: 'terminal',
    action: 'Search command history',
    keys: combo(['control'], 'r'),
    capture: 'native',
  },
  {
    id: 'windows-terminal-line-start',
    platform: 'windows',
    category: 'terminal',
    action: 'Terminal line start',
    keys: combo([], 'home'),
    capture: 'native',
  },
  {
    id: 'windows-terminal-line-end',
    platform: 'windows',
    category: 'terminal',
    action: 'Terminal line end',
    keys: combo([], 'end'),
    capture: 'native',
  },
  {
    id: 'windows-terminal-accept',
    platform: 'windows',
    category: 'terminal',
    action: 'Accept command',
    keys: combo([], 'enter'),
    capture: 'native',
  },
  {
    id: 'windows-browser-devtools',
    platform: 'windows',
    category: 'browser',
    action: 'Open DevTools',
    keys: combo(['control', 'shift'], 'i'),
    capture: 'native',
  },
  {
    id: 'windows-browser-hard-refresh',
    platform: 'windows',
    category: 'browser',
    action: 'Hard reload',
    keys: combo(['control', 'shift'], 'r'),
    capture: 'native',
  },
  {
    id: 'windows-browser-address',
    platform: 'windows',
    category: 'browser',
    action: 'Focus address bar',
    keys: combo(['control'], 'l'),
    capture: 'native',
  },
  {
    id: 'windows-browser-new-tab',
    platform: 'windows',
    category: 'browser',
    action: 'New tab',
    keys: combo(['control'], 't'),
    capture: 'native',
  },
  {
    id: 'windows-browser-reopen-tab',
    platform: 'windows',
    category: 'browser',
    action: 'Reopen closed tab',
    keys: combo(['control', 'shift'], 't'),
    capture: 'native',
  },
  {
    id: 'windows-editor-command-palette',
    platform: 'windows',
    category: 'editor',
    action: 'Open command palette',
    keys: combo(['control', 'shift'], 'p'),
    capture: 'native',
  },
  {
    id: 'windows-editor-quick-open',
    platform: 'windows',
    category: 'editor',
    action: 'Quick open file',
    keys: combo(['control'], 'p'),
    capture: 'native',
  },
  {
    id: 'windows-editor-sidebar',
    platform: 'windows',
    category: 'editor',
    action: 'Toggle sidebar',
    keys: combo(['control'], 'b'),
    capture: 'native',
  },
  {
    id: 'windows-editor-terminal',
    platform: 'windows',
    category: 'editor',
    action: 'Toggle integrated terminal',
    keys: combo(['control'], '`'),
    capture: 'native',
  },
  {
    id: 'windows-editor-line',
    platform: 'windows',
    category: 'editor',
    action: 'Go to line',
    keys: combo(['control'], 'g'),
    capture: 'native',
  },
  {
    id: 'windows-editor-format',
    platform: 'windows',
    category: 'editor',
    action: 'Format document',
    keys: combo(['shift', 'alt'], 'f'),
    capture: 'native',
  },
  {
    id: 'windows-files-address',
    platform: 'windows',
    category: 'files',
    action: 'Focus path bar',
    keys: combo(['alt'], 'd'),
    capture: 'native',
  },
  {
    id: 'windows-files-new-folder',
    platform: 'windows',
    category: 'files',
    action: 'New folder',
    keys: combo(['control', 'shift'], 'n'),
    capture: 'native',
  },
  {
    id: 'windows-files-rename',
    platform: 'windows',
    category: 'files',
    action: 'Rename selected file',
    keys: combo([], 'f2'),
    capture: 'native',
  },
  {
    id: 'windows-files-properties',
    platform: 'windows',
    category: 'files',
    action: 'Open properties',
    keys: combo(['alt'], 'enter'),
    capture: 'native',
  },
  {
    id: 'windows-files-back',
    platform: 'windows',
    category: 'files',
    action: 'Go back',
    keys: combo(['alt'], 'arrowleft'),
    capture: 'native',
  },
  {
    id: 'windows-workflow-source-control',
    platform: 'windows',
    category: 'workflow',
    action: 'Open Source Control view',
    keys: combo(['control', 'shift'], 'g'),
    capture: 'native',
  },
  {
    id: 'windows-workflow-project-search',
    platform: 'windows',
    category: 'workflow',
    action: 'Search project',
    keys: combo(['control', 'shift'], 'f'),
    capture: 'native',
  },
  {
    id: 'windows-workflow-build-task',
    platform: 'windows',
    category: 'workflow',
    action: 'Run build task',
    keys: combo(['control', 'shift'], 'b'),
    capture: 'native',
  },
  {
    id: 'windows-workflow-problems',
    platform: 'windows',
    category: 'workflow',
    action: 'Open problems panel',
    keys: combo(['control', 'shift'], 'm'),
    capture: 'native',
  },
  ...bothPlatforms([
    {
      id: 'shell-delete-after-cursor',
      category: 'terminal',
      specialty: 'readline',
      action: 'Shell: delete after cursor',
      keys: combo(['control'], 'k'),
      capture: 'native',
    },
    {
      id: 'shell-delete-previous-word',
      category: 'terminal',
      specialty: 'readline',
      action: 'Shell: delete previous word',
      keys: combo(['control'], 'w'),
      capture: 'native',
    },
    {
      id: 'shell-eof',
      category: 'terminal',
      specialty: 'readline',
      action: 'Shell: send EOF / close input',
      keys: combo(['control'], 'd'),
      capture: 'native',
    },
    {
      id: 'shell-previous-command',
      category: 'terminal',
      specialty: 'readline',
      action: 'Shell: previous command',
      keys: combo([], 'arrowup'),
      capture: 'native',
    },
    {
      id: 'shell-next-command',
      category: 'terminal',
      specialty: 'readline',
      action: 'Shell: next command',
      keys: combo([], 'arrowdown'),
      capture: 'native',
    },
    {
      id: 'tmux-new-window',
      category: 'terminal',
      specialty: 'tmux',
      action: 'tmux: new window',
      keys: combo(['control'], 'b'),
      sequence: [combo(['control'], 'b'), combo([], 'c')],
      capture: 'native',
    },
    {
      id: 'tmux-next-window',
      category: 'terminal',
      specialty: 'tmux',
      action: 'tmux: next window',
      keys: combo(['control'], 'b'),
      sequence: [combo(['control'], 'b'), combo([], 'n')],
      capture: 'native',
    },
    {
      id: 'tmux-previous-window',
      category: 'terminal',
      specialty: 'tmux',
      action: 'tmux: previous window',
      keys: combo(['control'], 'b'),
      sequence: [combo(['control'], 'b'), combo([], 'p')],
      capture: 'native',
    },
    {
      id: 'tmux-horizontal-split',
      category: 'terminal',
      specialty: 'tmux',
      action: 'tmux: split pane horizontally',
      keys: combo(['control'], 'b'),
      sequence: [combo(['control'], 'b'), combo(['shift'], '"')],
      capture: 'native',
    },
    {
      id: 'tmux-vertical-split',
      category: 'terminal',
      specialty: 'tmux',
      action: 'tmux: split pane vertically',
      keys: combo(['control'], 'b'),
      sequence: [combo(['control'], 'b'), combo(['shift'], '%')],
      capture: 'native',
    },
    {
      id: 'tmux-copy-mode',
      category: 'terminal',
      specialty: 'tmux',
      action: 'tmux: enter copy mode',
      keys: combo(['control'], 'b'),
      sequence: [combo(['control'], 'b'), combo([], '[')],
      capture: 'native',
    },
    {
      id: 'tmux-detach',
      category: 'terminal',
      specialty: 'tmux',
      action: 'tmux: detach session',
      keys: combo(['control'], 'b'),
      sequence: [combo(['control'], 'b'), combo([], 'd')],
      capture: 'native',
    },
    {
      id: 'tmux-kill-pane',
      category: 'terminal',
      specialty: 'tmux',
      action: 'tmux: kill current pane',
      keys: combo(['control'], 'b'),
      sequence: [combo(['control'], 'b'), combo([], 'x')],
      capture: 'native',
    },
    {
      id: 'vim-normal-mode',
      category: 'editor',
      specialty: 'vim',
      action: 'Vim: return to normal mode',
      keys: combo([], 'escape'),
      capture: 'native',
    },
    {
      id: 'vim-insert',
      category: 'editor',
      specialty: 'vim',
      action: 'Vim: insert before cursor',
      keys: combo([], 'i'),
      capture: 'native',
    },
    {
      id: 'vim-append',
      category: 'editor',
      specialty: 'vim',
      action: 'Vim: append after cursor',
      keys: combo([], 'a'),
      capture: 'native',
    },
    {
      id: 'vim-visual',
      category: 'editor',
      specialty: 'vim',
      action: 'Vim: visual mode',
      keys: combo([], 'v'),
      capture: 'native',
    },
    {
      id: 'vim-delete-line',
      category: 'editor',
      specialty: 'vim',
      action: 'Vim: delete current line',
      keys: combo([], 'd'),
      sequence: [combo([], 'd'), combo([], 'd')],
      capture: 'native',
    },
    {
      id: 'vim-yank-line',
      category: 'editor',
      specialty: 'vim',
      action: 'Vim: yank current line',
      keys: combo([], 'y'),
      sequence: [combo([], 'y'), combo([], 'y')],
      capture: 'native',
    },
    {
      id: 'vim-paste-after',
      category: 'editor',
      specialty: 'vim',
      action: 'Vim: paste after cursor',
      keys: combo([], 'p'),
      capture: 'native',
    },
    {
      id: 'vim-search-forward',
      category: 'editor',
      specialty: 'vim',
      action: 'Vim: search forward',
      keys: combo([], '/'),
      capture: 'native',
    },
    {
      id: 'vim-next-search',
      category: 'editor',
      specialty: 'vim',
      action: 'Vim: next search result',
      keys: combo([], 'n'),
      capture: 'native',
    },
    {
      id: 'vim-file-top',
      category: 'editor',
      specialty: 'vim',
      action: 'Vim: go to file top',
      keys: combo([], 'g'),
      sequence: [combo([], 'g'), combo([], 'g')],
      capture: 'native',
    },
    {
      id: 'vim-file-bottom',
      category: 'editor',
      specialty: 'vim',
      action: 'Vim: go to file bottom',
      keys: combo(['shift'], 'g'),
      capture: 'native',
    },
    {
      id: 'vim-undo',
      category: 'editor',
      specialty: 'vim',
      action: 'Vim: undo',
      keys: combo([], 'u'),
      capture: 'native',
    },
    {
      id: 'vim-redo',
      category: 'editor',
      specialty: 'vim',
      action: 'Vim: redo',
      keys: combo(['control'], 'r'),
      capture: 'native',
    },
    {
      id: 'emacs-save-buffer',
      category: 'editor',
      specialty: 'emacs',
      action: 'Emacs: save buffer',
      keys: combo(['control'], 'x'),
      sequence: [combo(['control'], 'x'), combo(['control'], 's')],
      capture: 'native',
    },
    {
      id: 'emacs-find-file',
      category: 'editor',
      specialty: 'emacs',
      action: 'Emacs: find file',
      keys: combo(['control'], 'x'),
      sequence: [combo(['control'], 'x'), combo(['control'], 'f')],
      capture: 'native',
    },
    {
      id: 'emacs-switch-buffer',
      category: 'editor',
      specialty: 'emacs',
      action: 'Emacs: switch buffer',
      keys: combo(['control'], 'x'),
      sequence: [combo(['control'], 'x'), combo([], 'b')],
      capture: 'native',
    },
    {
      id: 'emacs-kill-buffer',
      category: 'editor',
      specialty: 'emacs',
      action: 'Emacs: kill buffer',
      keys: combo(['control'], 'x'),
      sequence: [combo(['control'], 'x'), combo([], 'k')],
      capture: 'native',
    },
    {
      id: 'emacs-cancel',
      category: 'editor',
      specialty: 'emacs',
      action: 'Emacs: cancel command',
      keys: combo(['control'], 'g'),
      capture: 'native',
    },
    {
      id: 'emacs-line-start',
      category: 'editor',
      specialty: 'emacs',
      action: 'Emacs: beginning of line',
      keys: combo(['control'], 'a'),
      capture: 'native',
    },
    {
      id: 'emacs-line-end',
      category: 'editor',
      specialty: 'emacs',
      action: 'Emacs: end of line',
      keys: combo(['control'], 'e'),
      capture: 'native',
    },
    {
      id: 'emacs-search',
      category: 'editor',
      specialty: 'emacs',
      action: 'Emacs: incremental search',
      keys: combo(['control'], 's'),
      capture: 'native',
    },
    {
      id: 'emacs-yank',
      category: 'editor',
      specialty: 'emacs',
      action: 'Emacs: yank',
      keys: combo(['control'], 'y'),
      capture: 'native',
    },
    {
      id: 'emacs-kill-region',
      category: 'editor',
      specialty: 'emacs',
      action: 'Emacs: kill region',
      keys: combo(['control'], 'w'),
      capture: 'native',
    },
    {
      id: 'emacs-copy-region',
      category: 'editor',
      specialty: 'emacs',
      action: 'Emacs: copy region',
      keys: combo(['alt'], 'w'),
      capture: 'native',
    },
    {
      id: 'emacs-forward-word',
      category: 'editor',
      specialty: 'emacs',
      action: 'Emacs: forward word',
      keys: combo(['alt'], 'f'),
      capture: 'native',
    },
    {
      id: 'vscode-rename-symbol',
      category: 'editor',
      specialty: 'vscode',
      action: 'VS Code: rename symbol',
      keys: combo([], 'f2'),
      capture: 'native',
    },
    {
      id: 'vscode-format-document',
      category: 'editor',
      specialty: 'vscode',
      action: 'VS Code: format document',
      keys: combo(['shift', 'alt'], 'f'),
      capture: 'native',
    },
  ]),
  {
    id: 'mac-vscode-add-selection-next',
    platform: 'mac',
    category: 'editor',
    specialty: 'vscode',
    action: 'VS Code: add next match to selection',
    keys: combo(['meta'], 'd'),
    capture: 'native',
  },
  {
    id: 'windows-vscode-add-selection-next',
    platform: 'windows',
    category: 'editor',
    specialty: 'vscode',
    action: 'VS Code: add next match to selection',
    keys: combo(['control'], 'd'),
    capture: 'native',
  },
  {
    id: 'mac-devtools-inspect',
    platform: 'mac',
    category: 'browser',
    specialty: 'devtools',
    action: 'DevTools: inspect element',
    keys: combo(['meta', 'shift'], 'c'),
    capture: 'native',
  },
  {
    id: 'windows-devtools-inspect',
    platform: 'windows',
    category: 'browser',
    specialty: 'devtools',
    action: 'DevTools: inspect element',
    keys: combo(['control', 'shift'], 'c'),
    capture: 'native',
  },
  {
    id: 'mac-git-commit-from-scm',
    platform: 'mac',
    category: 'workflow',
    specialty: 'git',
    action: 'Git: commit from Source Control input',
    keys: combo(['meta'], 'enter'),
    capture: 'native',
  },
  {
    id: 'windows-git-commit-from-scm',
    platform: 'windows',
    category: 'workflow',
    specialty: 'git',
    action: 'Git: commit from Source Control input',
    keys: combo(['control'], 'enter'),
    capture: 'native',
  },
]
