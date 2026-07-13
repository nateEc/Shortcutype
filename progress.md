# Shortcutype 真实用户试用推进记录

更新时间：2026-07-13

## 完成标准

| 条件 | 当前状态 | 权威证据 / 下一步 |
| --- | --- | --- |
| 全新环境一条命令启动 | 已满足 | 不含 `node_modules` 的 `/tmp` 副本执行 `npm start`，自动 `npm ci` 后成功启动 Vite；见 `artifacts/evidence/clean-start.txt`。 |
| 核心用户路径均有端到端测试 | 已满足 | Playwright 8/8：首次教学、个性化开练、完整 10 题到结果、设置/库、错误/辅助答案/命令、存储失败、390px 与视觉证据。 |
| 修复至少 10 个真实问题 | 已满足（21 / 10） | 见下方问题表；每项均有复现依据和自动化/axe 回归证据。 |
| 响应式、无障碍、错误态、空状态 | 已满足 | 390px 无横向溢出；axe 通过；存储错误、弱项为空和搜索无结果均有明确状态。 |
| 完整验证连续 5 次无失败 | 已满足 | `verify-five-summary.json`：5 轮 exit code 均为 0，总耗时分别为 17.027s、16.217s、16.289s、15.592s、16.646s。 |
| 架构、用户说明、已知限制 | 已满足 | `docs/ARCHITECTURE.md`、`USER_GUIDE.md`、`KNOWN_LIMITATIONS.md`。 |
| 截图、测试输出、benchmark | 已满足 | `artifacts/evidence/` 保存截图与 benchmark；最终测试输出将在 5 轮门禁时写入同目录。 |

## 2026-07-13 基线

- 分支：`main`，基线提交 `89d3ac1`，开始时与 `origin/main` 一致且工作区干净。
- Node：当前环境使用 Node.js 22；包管理器为 npm。
- 单元/组件测试：5 个文件、27 项通过；命令墙钟时间 2.30 秒，Vitest 报告执行时间 1.47 秒。
- 生产构建：通过；墙钟时间 2.64 秒，Vite 打包阶段 640 毫秒。
- 构建产物：296 KB；JS 267.87 KB（gzip 82.46 KB），CSS 23.78 KB（gzip 5.79 KB）。
- 依赖审计：`npm audit --audit-level=moderate` 报告 0 个漏洞。
- 当前没有浏览器 E2E 框架或 E2E 脚本。

## 已修复的真实问题

| # | 复现/风险 | 修复 | 回归证据 |
| --- | --- | --- | --- |
| 1 | 合法 JSON 中的非法 platform/mode/category/specialty 会进入 UI，可能得到空训练池。 | 对全部设置枚举做 allow-list 归一化。 | `settings.test.ts` |
| 2 | 负数、0 或任意 duration/count 可绕过 UI 进入计时/完成逻辑。 | 仅接受产品实际支持的时长与题数。 | `settings.test.ts` |
| 3 | 未知版本的当前设置会遮蔽仍然有效的 legacy 设置。 | 当前/legacy 分别校验版本并继续回退。 | `settings.test.ts` |
| 4 | 未知版本的当前进度会返回空数据，静默丢弃有效 legacy 进度。 | 无效版本继续尝试 legacy key。 | `progress.test.ts` |
| 5 | `localStorage.setItem/getItem` 被浏览器拒绝时会抛异常并终止交互。 | 统一安全存储边界；训练继续并显示可关闭警告。 | `storage.test.ts`、App 测试、Playwright 存储拒绝路径 |
| 6 | `Infinity`/负历史日期通过旧过滤，`Intl.DateTimeFormat` 可能抛 `RangeError`。 | 迁移时丢弃非有限或非正日期。 | `progress.test.ts` |
| 7 | 多段快捷键第二步出错时，错误说明始终和第一步比较。 | `describeMismatch` 接收当前 step。 | `input.test.ts` |
| 8 | 抽屉的 accessible name 是内部值 `settings/library`，中文也读英文。 | 使用当前语言的可见面板标题。 | App 测试、Playwright role 断言 |
| 9 | 关闭抽屉后焦点落到 `body`，键盘用户丢失位置。 | 记录触发元素并在关闭后恢复。 | App 测试、Playwright focus 断言 |
| 10 | 设置选中态只靠颜色，读屏无法知道当前选项。 | 分组增加语义，按钮增加 `aria-pressed`。 | App 测试、Playwright、axe |
| 11 | 模态打开时背景仍暴露给辅助技术。 | 对背景 landmarks 设置 `aria-hidden`，保留对话框。 | App 测试、Playwright |
| 12 | Skip link 指向不可聚焦的 main，激活后焦点仍在 body。 | main 可程序化聚焦并在激活后显式聚焦。 | App 测试 |
| 13 | 快捷键库搜索 0 条时只有 `0 / N` 和空白。 | 增加本地化、live 的无结果状态。 | App 测试、Playwright |
| 14 | 没有弱项时只显示禁用按钮，未解释如何产生弱项。 | Ready 页显示可操作的弱项空状态说明。 | App 测试、axe |
| 15 | 中文历史详情混入英文 `recalls`。 | 复用本地化回忆单位。 | App 测试 |
| 16 | 390px 下“快捷键库”被隐藏，与“移动端仍可浏览”承诺冲突。 | 移动端保留库入口，仅折叠历史。 | Playwright 390px 断言 |
| 17 | axe 检出 `aside role=dialog` 为不允许的角色组合。 | 抽屉容器改为允许 dialog role 的 `section`。 | Playwright axe |
| 18 | axe 测得暗色抽屉弱文本对比度 4.28:1，低于 AA 4.5:1。 | 提升暗色 `--quiet` 对比度。 | Playwright axe |
| 19 | 学习模式答错时，轨迹染红并继续显示正确答案，而不是用户的实际输入。 | wrong/close 优先展示输入缓冲并标为“你的输入”。 | Playwright 错误反馈路径与截图 |
| 20 | locale 为 truthy 非字符串时，设置归一化会调用不存在的 `toLowerCase`。 | locale 先做运行时字符串检查。 | `settings.test.ts` |
| 21 | 合法 JSON 中单项 shortcut stat 为 `null` 时，迁移会解引用并失败。 | stat 正规化接受 unknown，非对象回退为零统计。 | `progress.test.ts` |

## 验证日志

### 基线验证

- `npm test`：通过（27/27）。
- `npm run build`：通过。
- `npm audit --audit-level=moderate`：通过，0 vulnerabilities。

### 当前验证

- Vitest：7 个文件、42 项通过。
- Playwright：8 项真实浏览器测试通过。
- Playwright axe：Ready 主区与抽屉无 violation。
- 干净启动：临时副本无 `node_modules`；`npm start` 自动安装 161 个包并启动成功。
- benchmark：100 题全池调度均值 0.0711ms；完整组合判断均值 0.0005ms。
- 截图：`onboarding-intro.png`、`ready-desktop.png`、`practice-error.png`、`results.png`、`ready-mobile.png`。
- 连续门禁：2026-07-13 11:46:58–11:48:20 完成 5 轮；每轮 lint、42 项 Vitest、8 项 Playwright、build、benchmark、audit 均通过。

## 最终构建与证据

- 最终生产包：JS 271.29KB / 83.52KB gzip；CSS 24.39KB / 5.90KB gzip；HTML 0.40KB gzip。
- 5 轮原始日志：`artifacts/evidence/verify-run-1.log` 至 `verify-run-5.log`。
- 机器汇总：`artifacts/evidence/verify-five-summary.json`，`allPassed: true`。
- 本文件顶部 7 条完成条件均已有直接证据；没有以 mock 代替浏览器 E2E，也没有删除功能、放宽断言或跳过失败测试。
