import type { SessionMode } from './progress'
import type { CategoryId, SpecialtyId } from './shortcuts'

export type Locale = 'en' | 'zh-CN'

export const localeOptions: { id: Locale; label: string }[] = [
  { id: 'en', label: 'EN' },
  { id: 'zh-CN', label: '中' },
]

const enMessages = {
  'brand.subtitle': 'shortcut drills for dev muscle memory',
  'global.controls': 'Global controls',
  'controls.platform': 'Platform',
  'controls.language': 'Language',
  'controls.toggleTheme': 'Toggle theme',
  'theme.light': 'Light',
  'theme.dark': 'Dark',
  'state.readyTitle': 'Ready',
  'state.readyDetail': 'Focus the drill pad and begin.',
  'state.weakEmptyTitle': 'Weak review is empty',
  'state.weakEmptyDetail': 'Miss or skip a few shortcuts, then the review queue will appear.',
  'state.liveTitle': 'Live',
  'state.liveDetail': 'Every combo is captured in the drill pad.',
  'state.sessionCompleteTitle': 'Session complete',
  'state.sequenceTitle': 'Sequence',
  'metric.time': 'Time',
  'metric.done': 'Done',
  'metric.streak': 'Streak',
  'metric.accuracy': 'Accuracy',
  'metric.spm': 'SPM',
  'metric.best': 'Best',
  'metric.correct': 'Correct',
  'metric.bestStreak': 'Best streak',
  'label.library': 'Library',
  'label.browserSafe': 'browser-safe',
  'label.input': 'Input',
  'label.waitingForCombo': 'Waiting for combo',
  'label.realShortcut': 'Real shortcut',
  'label.drillCombo': 'Drill combo',
  'label.targetCombo': 'Target combo',
  'label.currentLifetime': 'Current lifetime',
  'label.fresh': 'fresh',
  'label.noShortcutLoaded': 'No shortcut loaded',
  'action.startDrill': 'Start drill',
  'action.endSession': 'End session',
  'action.skip': 'Skip',
  'panel.practiceDrill': 'Practice drill',
  'panel.practiceSetup': 'Practice setup',
  'panel.progressAndLibrary': 'Progress and library',
  'panel.weakShortcuts': 'Weak shortcuts',
  'panel.recentSessions': 'Recent sessions',
  'panel.shortcutLibrary': 'Shortcut library',
  'control.mode': 'Mode',
  'control.timer': 'Timer',
  'control.count': 'Count',
  'control.category': 'Category',
  'control.specialty': 'Specialty',
  'control.queue': 'Queue',
  'control.bestScore': 'Best score',
  'mode.timed': 'Timed',
  'mode.fixed': 'Fixed count',
  'mode.category': 'Category',
  'mode.specialty': 'Specialty',
  'mode.weak': 'Weak review',
  'empty.noWeak': 'No weak shortcuts yet.',
  'empty.sessions': 'Sessions will land here.',
  'feedback.correctTitle': 'Correct',
  'feedback.correctDetail': 'locked in.',
  'feedback.closeTitle': 'Close',
  'feedback.closeDetail': 'Right key, wrong modifier set.',
  'feedback.skippedTitle': 'Skipped',
  'feedback.wrongTitle': 'Wrong key',
  'summary.title': 'Session summary',
  'sequence.then': 'then',
} as const

type MessageKey = keyof typeof enMessages

const zhMessages: Record<MessageKey, string> = {
  'brand.subtitle': '面向开发者肌肉记忆的快捷键训练',
  'global.controls': '全局控制',
  'controls.platform': '平台',
  'controls.language': '语言',
  'controls.toggleTheme': '切换主题',
  'theme.light': '浅色',
  'theme.dark': '深色',
  'state.readyTitle': '准备就绪',
  'state.readyDetail': '聚焦训练区，然后开始。',
  'state.weakEmptyTitle': '弱项复习为空',
  'state.weakEmptyDetail': '先错过或跳过几个快捷键，复习队列就会出现。',
  'state.liveTitle': '训练中',
  'state.liveDetail': '所有按键组合都会在训练区捕获。',
  'state.sessionCompleteTitle': '本轮完成',
  'state.sequenceTitle': '连续键',
  'metric.time': '时间',
  'metric.done': '完成',
  'metric.streak': '连击',
  'metric.accuracy': '准确率',
  'metric.spm': 'SPM',
  'metric.best': '最佳',
  'metric.correct': '正确',
  'metric.bestStreak': '最佳连击',
  'label.library': '快捷键库',
  'label.browserSafe': '浏览器安全',
  'label.input': '输入',
  'label.waitingForCombo': '等待按键组合',
  'label.realShortcut': '真实快捷键',
  'label.drillCombo': '训练组合',
  'label.targetCombo': '目标组合',
  'label.currentLifetime': '当前生涯',
  'label.fresh': '新快捷键',
  'label.noShortcutLoaded': '没有载入快捷键',
  'action.startDrill': '开始训练',
  'action.endSession': '结束本轮',
  'action.skip': '跳过',
  'panel.practiceDrill': '快捷键训练',
  'panel.practiceSetup': '训练设置',
  'panel.progressAndLibrary': '进度和快捷键库',
  'panel.weakShortcuts': '弱项快捷键',
  'panel.recentSessions': '最近训练',
  'panel.shortcutLibrary': '快捷键库',
  'control.mode': '模式',
  'control.timer': '计时',
  'control.count': '数量',
  'control.category': '分类',
  'control.specialty': '专项',
  'control.queue': '队列',
  'control.bestScore': '最高分',
  'mode.timed': '限时',
  'mode.fixed': '固定数量',
  'mode.category': '分类训练',
  'mode.specialty': '专项训练',
  'mode.weak': '弱项复习',
  'empty.noWeak': '还没有弱项快捷键。',
  'empty.sessions': '训练记录会显示在这里。',
  'feedback.correctTitle': '正确',
  'feedback.correctDetail': '已记住。',
  'feedback.closeTitle': '接近',
  'feedback.closeDetail': '按键正确，但修饰键组合不对。',
  'feedback.skippedTitle': '已跳过',
  'feedback.wrongTitle': '按键错误',
  'summary.title': '本轮总结',
  'sequence.then': '然后',
}

const messages = {
  en: enMessages,
  'zh-CN': zhMessages,
} satisfies Record<Locale, Record<MessageKey, string>>

const categoryLabels = {
  en: {
    system: 'System navigation',
    text: 'Text editing',
    terminal: 'Terminal',
    browser: 'Browser/devtools',
    editor: 'Editor/IDE',
    files: 'Finder/File Explorer',
    workflow: 'Git/workflow',
  },
  'zh-CN': {
    system: '系统导航',
    text: '文本编辑',
    terminal: '终端',
    browser: '浏览器/开发者工具',
    editor: '编辑器/IDE',
    files: 'Finder/文件资源管理器',
    workflow: 'Git/工作流',
  },
} satisfies Record<Locale, Record<CategoryId, string>>

const specialtyLabels = {
  en: {
    core: 'Core OS',
    readline: 'Shell / Readline',
    tmux: 'tmux',
    vim: 'Vim',
    emacs: 'Emacs',
    vscode: 'VS Code',
    devtools: 'Browser DevTools',
    git: 'Git workflow',
  },
  'zh-CN': {
    core: '核心系统',
    readline: 'Shell / Readline',
    tmux: 'tmux',
    vim: 'Vim',
    emacs: 'Emacs',
    vscode: 'VS Code',
    devtools: '浏览器开发者工具',
    git: 'Git 工作流',
  },
} satisfies Record<Locale, Record<SpecialtyId, string>>

const modeLabels = {
  en: {
    timed: enMessages['mode.timed'],
    fixed: enMessages['mode.fixed'],
    category: enMessages['mode.category'],
    specialty: enMessages['mode.specialty'],
    weak: enMessages['mode.weak'],
  },
  'zh-CN': {
    timed: zhMessages['mode.timed'],
    fixed: zhMessages['mode.fixed'],
    category: zhMessages['mode.category'],
    specialty: zhMessages['mode.specialty'],
    weak: zhMessages['mode.weak'],
  },
} satisfies Record<Locale, Record<SessionMode, string>>

const actionLabelsZh: Record<string, string> = {
  'Copy': '复制',
  'Switch app': '切换应用',
  'Open system search': '打开系统搜索',
  'Open app settings': '打开应用设置',
  'Find in file': '在文件中查找',
  'Select all': '全选',
  'Save file': '保存文件',
  'Delete previous word': '删除前一个词',
  'Move one word left': '向左移动一个词',
  'Jump to line start': '跳到行首',
  'Toggle line comment': '切换行注释',
  'Stop current process': '停止当前进程',
  'Clear terminal': '清空终端',
  'Search command history': '搜索命令历史',
  'Terminal line start': '终端跳到行首',
  'Terminal line end': '终端跳到行尾',
  'Delete line before cursor': '删除光标前整行',
  'Open DevTools': '打开开发者工具',
  'Hard reload': '强制刷新',
  'Focus address bar': '聚焦地址栏',
  'New tab': '新建标签页',
  'Reopen closed tab': '重新打开关闭的标签页',
  'Open command palette': '打开命令面板',
  'Quick open file': '快速打开文件',
  'Toggle sidebar': '切换侧边栏',
  'Toggle integrated terminal': '切换集成终端',
  'Go to line': '跳转到行',
  'Go to path': '跳转到路径',
  'Show hidden files': '显示隐藏文件',
  'Open parent folder': '打开上级文件夹',
  'Quick Look selected file': '快速预览所选文件',
  'New folder': '新建文件夹',
  'Open Source Control view': '打开源代码管理视图',
  'Search project': '搜索项目',
  'Run build task': '运行构建任务',
  'Accept command': '接受命令',
  'Format document': '格式化文档',
  'Focus path bar': '聚焦路径栏',
  'Rename selected file': '重命名所选文件',
  'Open properties': '打开属性',
  'Go back': '后退',
  'Open problems panel': '打开问题面板',
  'Shell: delete after cursor': 'Shell: 删除光标后内容',
  'Shell: delete previous word': 'Shell: 删除前一个词',
  'Shell: send EOF / close input': 'Shell: 发送 EOF / 关闭输入',
  'Shell: previous command': 'Shell: 上一条命令',
  'Shell: next command': 'Shell: 下一条命令',
  'tmux: new window': 'tmux: 新建窗口',
  'tmux: next window': 'tmux: 下一个窗口',
  'tmux: previous window': 'tmux: 上一个窗口',
  'tmux: split pane horizontally': 'tmux: 水平分割面板',
  'tmux: split pane vertically': 'tmux: 垂直分割面板',
  'tmux: enter copy mode': 'tmux: 进入复制模式',
  'tmux: detach session': 'tmux: 分离会话',
  'tmux: kill current pane': 'tmux: 关闭当前面板',
  'Vim: return to normal mode': 'Vim: 返回普通模式',
  'Vim: insert before cursor': 'Vim: 在光标前插入',
  'Vim: append after cursor': 'Vim: 在光标后追加',
  'Vim: visual mode': 'Vim: 可视模式',
  'Vim: delete current line': 'Vim: 删除当前行',
  'Vim: yank current line': 'Vim: 复制当前行',
  'Vim: paste after cursor': 'Vim: 在光标后粘贴',
  'Vim: search forward': 'Vim: 向前搜索',
  'Vim: next search result': 'Vim: 下一个搜索结果',
  'Vim: go to file top': 'Vim: 跳到文件顶部',
  'Vim: go to file bottom': 'Vim: 跳到文件底部',
  'Vim: undo': 'Vim: 撤销',
  'Vim: redo': 'Vim: 重做',
  'Emacs: save buffer': 'Emacs: 保存缓冲区',
  'Emacs: find file': 'Emacs: 打开文件',
  'Emacs: switch buffer': 'Emacs: 切换缓冲区',
  'Emacs: kill buffer': 'Emacs: 关闭缓冲区',
  'Emacs: cancel command': 'Emacs: 取消命令',
  'Emacs: beginning of line': 'Emacs: 跳到行首',
  'Emacs: end of line': 'Emacs: 跳到行尾',
  'Emacs: incremental search': 'Emacs: 增量搜索',
  'Emacs: yank': 'Emacs: 粘贴',
  'Emacs: kill region': 'Emacs: 剪切区域',
  'Emacs: copy region': 'Emacs: 复制区域',
  'Emacs: forward word': 'Emacs: 前进一个词',
  'VS Code: rename symbol': 'VS Code: 重命名符号',
  'VS Code: format document': 'VS Code: 格式化文档',
  'VS Code: add next match to selection': 'VS Code: 将下一个匹配加入选择',
  'DevTools: inspect element': 'DevTools: 检查元素',
  'Git: commit from Source Control input': 'Git: 从源代码管理输入提交',
}

const noteLabelsZh: Record<string, string> = {
  'Cmd+Tab is owned by macOS. Drill with Control+Tab in the browser-safe lane.':
    'Cmd+Tab 由 macOS 接管。这里用 Control+Tab 做浏览器安全训练。',
  'Cmd+Space is usually reserved by Spotlight. Drill with Control+Option+Space here.':
    'Cmd+Space 通常由 Spotlight 保留。这里用 Control+Option+Space 训练。',
  'Alt+Tab is owned by Windows. Drill with Ctrl+Tab in the browser-safe lane.':
    'Alt+Tab 由 Windows 接管。这里用 Ctrl+Tab 做浏览器安全训练。',
  'Win+S can leave the browser. Drill with Ctrl+Alt+Space here.':
    'Win+S 可能会离开浏览器。这里用 Ctrl+Alt+Space 训练。',
}

export function normalizeLocale(value?: string | null): Locale {
  return value?.toLowerCase().startsWith('zh') ? 'zh-CN' : 'en'
}

export function detectLocale(): Locale {
  if (typeof navigator === 'undefined') {
    return 'en'
  }

  return normalizeLocale(navigator.language)
}

export function t(locale: Locale, key: MessageKey) {
  return messages[locale][key] ?? messages.en[key]
}

export function categoryName(locale: Locale, categoryId: CategoryId) {
  return categoryLabels[locale][categoryId] ?? categoryLabels.en[categoryId]
}

export function specialtyName(locale: Locale, specialtyId: SpecialtyId) {
  return specialtyLabels[locale][specialtyId] ?? specialtyLabels.en[specialtyId]
}

export function modeName(locale: Locale, mode: SessionMode) {
  return modeLabels[locale][mode] ?? modeLabels.en[mode]
}

export function shortcutAction(locale: Locale, action: string) {
  if (locale === 'zh-CN') {
    return actionLabelsZh[action] ?? action
  }

  return action
}

export function shortcutNote(locale: Locale, note: string) {
  if (locale === 'zh-CN') {
    return noteLabelsZh[note] ?? note
  }

  return note
}

export function sessionCompleteDetail(locale: Locale, correct: number, spm: number) {
  if (locale === 'zh-CN') {
    return `${correct} 个正确，${spm.toFixed(1)} SPM。`
  }

  return `${correct} correct at ${spm.toFixed(1)} SPM.`
}

export function sequenceAcceptedDetail(locale: Locale, current: number, total: number) {
  if (locale === 'zh-CN') {
    return `已接受 ${current}/${total} 步。`
  }

  return `${current}/${total} keys accepted.`
}

export function targetWasDetail(locale: Locale, target: string) {
  if (locale === 'zh-CN') {
    return `目标是 ${target}。`
  }

  return `${target} was the target.`
}

export function targetExpectedDetail(locale: Locale, target: string) {
  if (locale === 'zh-CN') {
    return `应输入 ${target}。`
  }

  return `${target} was expected.`
}

export function recentSessionDetail(locale: Locale, correct: number, accuracy: number) {
  if (locale === 'zh-CN') {
    return `${correct} 正确 / ${accuracy}%`
  }

  return `${correct} correct / ${accuracy}%`
}
