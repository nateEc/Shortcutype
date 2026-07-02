# Shortcutype

[English](../README.md) | [简体中文](README.zh-CN.md)

**像练打字速度一样，训练开发者快捷键反射。**

Shortcutype 是一个快速、键盘优先的开发者快捷键训练器，覆盖 macOS、Windows、tmux、Vim、Emacs、VS Code、浏览器 DevTools、Shell 工作流和 Git 肌肉记忆。

如果你也收藏过快捷键速查表，却五分钟后还是伸手摸鼠标，这个项目就是为你准备的。

![Shortcutype 预览](preview.png)

## 为什么是 Shortcutype？

大多数快捷键工具只是静态速查表。Shortcutype 是一个真正的训练场。

它一次展示一个动作，监听真实按键组合，立刻给出反馈，并持续推进训练节奏。可以把它想成 Monkeytype，但练的是开发者每天真正会用到的命令。

## 亮点

- **真实训练循环**：支持限时训练、固定数量训练、分类训练、专项训练和弱项复习。
- **开发者优先的快捷键包**：覆盖 macOS、Windows、Shell/Readline、tmux、Vim、Emacs、VS Code、DevTools、Git、Finder/文件资源管理器和系统导航。
- **多步连续键支持**：可以训练 `Ctrl+B then C`、`D then D`、`G then G`、`Ctrl+X then Ctrl+S` 这类命令。
- **即时反馈**：区分正确、按键错误、修饰键接近但不对、跳过和连续键中间状态。
- **本地持久进度**：最近训练、单个快捷键准确率、弱项、最佳连击和最高分都会保存在本地。
- **浏览器安全捕获**：被系统接管的快捷键会显示真实组合，同时使用安全的训练组合，避免打断系统行为。
- **内置 i18n**：应用支持英文和简体中文切换，并会记住你的语言偏好。
- **专注界面**：密集统计、大提示、清晰键帽、深浅主题，没有落地页废话。

## 训练模式

| 模式 | 适合用来 |
| --- | --- |
| 限时 | 用 30s、60s 或 120s 的短 burst 建立节奏 |
| 固定数量 | 完成 15、25 或 50 个提示的一组干净训练 |
| 分类 | 针对 Terminal、DevTools、Editor/IDE 等场景训练 |
| 专项 | 深练 tmux、Vim、Emacs、VS Code、Git 等工具 |
| 弱项复习 | 回到那些手总是按错的快捷键 |

## 专项包

Shortcutype 默认带有一组实用的种子快捷键：

- 核心系统导航
- Shell / Readline
- tmux
- Vim
- Emacs
- VS Code
- 浏览器 DevTools
- Git 工作流

数据刻意保持简单，方便扩展。新增快捷键时改 `src/shortcuts.ts`，不需要往 App 里塞新的条件分支。

```ts
{
  action: 'tmux: new window',
  keys: combo(['control'], 'b'),
  sequence: [combo(['control'], 'b'), combo([], 'c')],
}
```

## 快速开始

```bash
npm install
npm run dev
```

打开：

```text
http://127.0.0.1:5173/
```

## 质量检查

```bash
npm run lint
npm run build
npm audit --audit-level=moderate
```

## 本地优先进度

Shortcutype 会把进度保存在浏览器 `localStorage`：

```text
shortcutype-progress-v1
```

没有账号，没有后端，没有遥测管线。只有训练和你的本地进度。

## 浏览器捕获限制

有些操作系统级快捷键无法被网页稳定捕获，例如 macOS `Cmd + Tab`、macOS `Cmd + Space` 和 Windows `Alt + Tab`。

对这些快捷键，Shortcutype 会保存真实组合，同时使用浏览器安全的训练组合，避免训练中断或劫持系统行为。

## Roadmap 想法

- 导入/导出快捷键包
- 用户自定义快捷键包
- 每日 streak
- GitHub Pages demo
- 多步连续键的节奏指标
- 可选声音和触感反馈

## 给个 Star

如果 Shortcutype 让你的双手更快，一个 star 能帮更多开发者发现它。
