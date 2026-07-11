import type { Locale } from '../i18n'
import type { ToolId } from '../onboarding'
import type { Platform } from '../shortcuts'
import { getCopy } from '../ui-copy'

export function ReadyHome({
  locale,
  platform,
  selectedTools,
  hasWeak,
  onContinue,
  onWarmup,
  onWeak,
  onTool,
  onAdvanced,
}: {
  locale: Locale
  platform: Platform
  selectedTools: ToolId[]
  hasWeak: boolean
  onContinue: () => void
  onWarmup: () => void
  onWeak: () => void
  onTool: (tool: ToolId) => void
  onAdvanced: () => void
}) {
  const copy = getCopy(locale)
  const focusedTools = selectedTools.filter((tool) => tool !== 'general')
  const primaryTool = focusedTools[0]
  return (
    <section className="ready-home" aria-labelledby="ready-title">
      <div className="ready-thesis">
        <p>{copy.introRule}</p>
        <h1 id="ready-title">{copy.readyTitle}</h1>
        <span>{copy.readyBody}</span>
      </div>

      <div className="ready-example" aria-label={copy.introRule}>
        <span><small>{copy.introAction}</small><strong>{locale === 'zh-CN' ? '在文件中查找' : 'Find in file'}</strong></span>
        <i aria-hidden="true">→</i>
        <span><small>{copy.introAnswer}</small><kbd>{platform === 'mac' ? 'Cmd' : 'Ctrl'}</kbd><kbd>F</kbd></span>
      </div>

      <div className="intent-actions">
        {primaryTool ? (
          <button className="intent-primary" type="button" onClick={() => onTool(primaryTool)}>
            <small>{copy.toolIntentPrefix}</small><strong>{toolLabel(primaryTool, copy)}</strong><span>↵</span>
          </button>
        ) : (
          <button className="intent-primary" type="button" onClick={onContinue}>
            <small>{copy.continuePractice}</small><strong>{copy.generalTool}</strong><span>↵</span>
          </button>
        )}
        <div className="intent-secondary">
          <button type="button" onClick={onContinue}>{copy.continuePractice}</button>
          <button type="button" onClick={onWarmup}>{copy.warmupIntent}</button>
          <button type="button" onClick={onWeak} disabled={!hasWeak}>{copy.weakIntent}</button>
          {focusedTools.slice(1).map((tool) => (
            <button type="button" key={tool} onClick={() => onTool(tool)}>{copy.toolIntentPrefix} {toolLabel(tool, copy)}</button>
          ))}
          <button type="button" onClick={onAdvanced}>{copy.advancedSetup}</button>
        </div>
      </div>
    </section>
  )
}

function toolLabel(tool: ToolId, copy: ReturnType<typeof getCopy>) {
  const labels: Record<ToolId, string> = {
    general: copy.generalTool,
    vscode: copy.toolVscode,
    readline: copy.toolReadline,
    devtools: copy.toolDevtools,
    git: copy.toolGit,
    vim: copy.toolVim,
    tmux: copy.toolTmux,
    emacs: copy.toolEmacs,
  }
  return labels[tool]
}
