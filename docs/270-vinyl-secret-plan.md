# “把秘密藏进这一圈”实现计划

- 日期：2026-07-25
- 工作 ID：`vinyl-secret`
- 基线研究：[267-vinyl-secret-research.md](./267-vinyl-secret-research.md)
- 选型：[268-vinyl-secret-brainstorm.md](./268-vinyl-secret-brainstorm.md)
- 冻结规格：[269-vinyl-secret-spec.md](./269-vinyl-secret-spec.md)
- 目标等级：A，`file://` 直接打开
- 当前阶段：只完成计划；不创建生产目录、不修改共享文件

## 1. 总体交付

实现一个单人惊喜：接收者在 12 圈沟槽间移动唱针，依据四级文字信号主动落针，按顺序找到三条秘密轨道；每次命中揭开文字并可尝试播放准备者自备的本地音频，第三轨打开最终封套。默认无音频也能完整通关。

生产实现零新依赖：

- 逻辑：仓库内原生 JavaScript；
- 输入：原生 `<input type="range">` 与按钮；
- 媒体：一个原生 `HTMLAudioElement`；
- 视觉：HTML/CSS 与自写 SVG favicon；
- 测试：Node 内置 `node:test`；
- 不修改根 `package.json`、锁文件、`shared/` 或统一 runtime。

## 2. 任务分类与工作方式

这是跨多文件的新功能，按：

```text
research → brainstorm → spec → plan
→ 子任务 A 纯逻辑
→ 子任务 B 界面与媒体
→ 子任务 C 项目验收/修复
→ 总控共享接入
```

执行时使用 `codex/exp-vinyl-secret` 与独立 worktree。每次写文件和 commit 前先确认：

```bash
git branch --show-current
git rev-parse --show-toplevel
```

必须分别得到：

```text
codex/exp-vinyl-secret
/Users/zenith/Desktop/two-of-us-worktrees/vinyl-secret
```

禁止未经当次授权执行 `reset --hard`、`push --force`、`branch -D`、`clean -f`、`checkout --`、覆盖未提交改动或其他破坏性操作。

## 3. 子代理与文件所有权

后续实现应由总控按顺序派发子任务；依赖链决定 A、B、C 不能同时写同一目录。

| 子任务 | 可写文件 | 前置 | 返回要求 |
| --- | --- | --- | --- |
| A：纯逻辑 | `config.js`、`logic.js`、`logic.test.js` | 本计划已接受 | API、测试数、边界、独立 commit |
| B：界面与媒体 | `index.html`、`styles.css`、`app.js`、`README.md`、`ATTRIBUTION.md`、`assets/favicon.svg` | A 已合并到同一分支 | file/localhost 浏览器证据、独立 commit |
| C：验收审查 | 默认只读；若发现问题，只改项目目录和唯一 bug/learn 文档 | A+B 完成 | 复现、根因、回归、独立修复 commit |
| 总控：共享接入 | catalog、根/分类/docs 索引、backlog、Board、verification 文档 | 项目 Gate 全绿 | 共享集成独立 commit |

同一时间只能有一个 agent 写 `experiences/surprises/vinyl-secret/`。C 不得顺手修改 catalog 或索引；这些始终由总控串行处理。

## 4. 已完成前置提交

研究、脑暴、规格和计划本身各自独立提交。实现开始前应确认四个提交都能从当前分支追踪；如果总控 cherry-pick，保持原提交顺序。

```text
1. research
2. brainstorm
3. spec
4. plan
```

不得 squash 成一个“docs”提交，因为用户要求每完成一部分就提交。

## 5. 子任务 A：配置、状态机与测试

### 5.1 创建

```text
experiences/surprises/vinyl-secret/config.js
experiences/surprises/vinyl-secret/logic.js
experiences/surprises/vinyl-secret/logic.test.js
```

### 5.2 实现顺序

1. 在 `config.js` 写递归冻结的默认配置，浏览器和 Node 双导出；
2. 在 `logic.js` 写通用白名单/普通对象/Unicode 长度/深冻结工具；
3. 实现 `sanitizeConfig`，任一非法字段整份回退；
4. 实现 `getSignal` 的 12×12 离散映射；
5. 实现初态、`assertState` 与 phase 不变量；
6. 实现精确 action 校验与 `transition`；
7. 实现只按 phase 暴露秘密的 `getViewModel`；
8. 最后写恶意配置、action、token、restart 和秘密 Gate 的测试。

逻辑层不得访问 DOM、Date、随机数、timer、Audio、storage、network 或 CSS。不得把媒体成功状态加进 reducer。

### 5.3 项目测试

```bash
node --check experiences/surprises/vinyl-secret/config.js
node --check experiences/surprises/vinyl-secret/logic.js
node --check experiences/surprises/vinyl-secret/logic.test.js
node --test experiences/surprises/vinyl-secret/logic.test.js
git diff --check
npm run verify
```

预期重点不是追求虚高 case 数，而是覆盖规格第 13 节全部边界。测试失败不得提交。

### 5.4 提交边界

只 stage 三个逻辑文件，commit 建议：

```text
feat: add vinyl secret state machine
```

提交前重新运行分支/root 检查。pre-commit hook 失败后修复、重新 add、创建新 commit；不得 `--amend` 上一个提交。

## 6. 子任务 B：界面、媒体与项目文档

### 6.1 创建

```text
experiences/surprises/vinyl-secret/index.html
experiences/surprises/vinyl-secret/styles.css
experiences/surprises/vinyl-secret/app.js
experiences/surprises/vinyl-secret/README.md
experiences/surprises/vinyl-secret/ATTRIBUTION.md
experiences/surprises/vinyl-secret/assets/favicon.svg
```

不创建 `assets/private-audio/`，不生成占位歌曲或“测试 mp3”。

### 6.2 HTML 与视觉

1. 只放固定 shell、intro 与无 `src` 的 `<audio preload="none">`；
2. 阶段秘密由 app 按 view model 动态创建/销毁；
3. 用 CSS 构成唱片、12 圈沟槽、唱臂、信号仪表和纸封套；
4. range 是位置权威，CSS 只镜像 groove；
5. 窄屏改成纵向，不用图片维持布局；
6. 加强 focus、forced-colors、200% zoom 和 reduced-motion；
7. favicon 自写、无字、无品牌。

### 6.3 app

1. 绑定 START/MOVE/DROP/NEXT/RESTART；
2. 写单向 `render(getViewModel(...))`；
3. 实现 phase DOM Gate 与焦点迁移；
4. 正确 DROP 的同一 click 内调用 `play()`；
5. 用一个 audio 元素和 app-only generation 管理 Promise；
6. timer 携带创建时 token；reduced motion 使用 microtask；
7. hidden/pagehide 先结算 pending track，再 pause/clear/load；
8. 音频失败只显示软失败，不派 reducer action；
9. 退出 phase 清 timer、媒体和过期回调；
10. 不捕获 range 的原生方向键、Home/End。

### 6.4 README 与 ATTRIBUTION

README 必须写：

- 双击 `index.html` 的 A 级启动方式；
- 三轨首局、输入、无音频路线和重开；
- `config.js` 可编辑字段与安全相对路径示例；
- `config.js` 和音频文件都是本地明文，不是加密；
- 音频失败/格式不支持时文字仍完整；
- 不联网、不录音、不存储；
- 用户自备音频的词曲权、录音权、参与者同意和分发提醒。

ATTRIBUTION 必须写：

- 默认代码、文字、CSS 图形和 favicon 为本仓库原创；
- 默认没有音频、封面、字体或纹理文件；
- Library of Congress、WHATWG、W3C、Chrome/WebKit、U.S. Copyright Office 一手资料；
- 这些资料只用于事实和标准边界，未复制代码、界面、文案或素材；
- 当前没有参考第三方开源仓库；
- 若后来参考开源项目，补精确 commit/tag/license/版权人/借用与未借用范围后才能提交。

### 6.5 静态测试

```bash
node --check experiences/surprises/vinyl-secret/app.js
node --test experiences/surprises/vinyl-secret/logic.test.js
rg -n "https?://|fetch\\(|XMLHttpRequest|sendBeacon|localStorage|sessionStorage|indexedDB|MediaRecorder|getUserMedia|AudioContext|new Audio" experiences/surprises/vinyl-secret
git diff --check
npm run verify
```

URL 搜索命中 README/ATTRIBUTION 的资料链接是允许的；运行文件中的外链、远程资源或网络调用不允许。

### 6.6 浏览器验证

涉及 UI，必须使用 Chrome MCP 或当前可用的真实浏览器控制工具；同时 Safari 手验 `file://`。浏览器自动化如果拒绝 `file://`，记录局限，再用 localhost 验 UI，但仍保留真实手验的 file 证据。

默认无音频路线：

```text
intro
→ 开始
→ 错误圈落针
→ 第 3 圈命中
→ 下一轨
→ 第 7 圈命中
→ 下一轨
→ 第 11 圈命中
→ complete
→ restart
```

逐项检查：

- load/START/MOVE 不出现声音请求；
- 页面无外部网络；
- console 无未解释 error/warning；
- 三阶段秘密 DOM Gate；
- range、方向键、Home/End、逐圈按钮；
- stop/hidden/pagehide/restart 清媒体；
- 320、390、768、1440 宽与 200% zoom；
- reduced motion、forced colors、visible focus、Tab 次序；
- 错误落针重复播报但不推进；
- 正确结算不等待 `play()` 或 `ended`。

可选音频路线只能使用开发者自有、未提交的短录音：

- 正常播放；
- 不存在路径；
- 不支持格式；
- play Promise reject；
- 播放中 stop/NEXT/hidden/restart；
- 旧 Promise 和旧 timer 不污染新状态。

### 6.7 提交边界

界面、媒体、README 和 ATTRIBUTION通过上述测试后作为一个可独立运行的生产作品提交：

```text
feat: add vinyl secret surprise
```

如果实现中先完成并验收“静音完整 UI”，媒体增强尚未完成，则允许拆成两个提交：

```text
feat: add silent vinyl secret experience
feat: add optional local audio playback
```

只有前一提交本身已完整通关才允许这样拆；不能提交半成品页面。

## 7. 子任务 C：审查、bug 与 learn

### 7.1 只记录真实发现

实际出现的 bug 才写：

```text
/Users/zenith/Desktop/two-of-us/bugs/<unique-vinyl-secret-slug>.md
```

每份包含：

```text
环境与版本
复现步骤
预期 / 实际
影响
根因
修复
回归命令与浏览器证据
对应 commit
```

不要把“Safari 可能拒绝播放”“文件也许不存在”一类已经在规格处理的预防性风险冒充 bug。

真正可复用且经验证的知识才写：

```text
/Users/zenith/Desktop/two-of-us/learn/<unique-vinyl-secret-slug>.md
```

优先候选只有在实践证实后才记录：

- user activation 内同步 `play()` 与 reducer/render 的安全顺序；
- 单元素换 src 的 generation 失效模式；
- token 防 restart 后旧 timer 污染；
- `file://` 媒体路径与浏览器格式矩阵。

bug 修复与对应文档应形成单独 commit，例如：

```text
fix: invalidate stale vinyl audio callbacks
```

### 7.2 审查清单

- 机制没有退回连续手摇、二维热点或猜歌；
- target 不泄漏到 view/DOM；
- 音频不进入 reducer；
- audio src 仅命中后赋值；
- timer 与 Promise 都有陈旧回调保护；
- config 任一非法字段整份回退；
- 所有交互都有键盘/按钮等价路径；
- 资产与借鉴声明不含模糊“网上素材”；
- 项目目录独立复制可用；
- 没有修改未授权共享文件。

## 8. 总控共享接入

执行 worktree 不修改以下文件；项目 Gate 全绿后由总控串行处理：

```text
experiences/catalog.json
experiences/surprises/README.md
README.md
index.html
docs/README.md
docs/40-idea-backlog.md
docs/orchestration-board.md
```

建议 catalog 记录：

```yaml
id: vinyl-secret
title: 把秘密藏进这一圈
category: surprise
status: installed
entry: experiences/surprises/vinyl-secret/index.html
launch: file
network: false
players: 1
inputs:
  - pointer
  - keyboard
```

实际 schema 以接入时的 current catalog 为准，不复制这段伪字段强行写入。总控还要：

1. 把 S14 改成已实现并链接作品；
2. 更新根、分类和 docs 索引；
3. 更新真实 installed/A 级计数；
4. 新建验证文档，编号由总控当时预留；
5. 在 main 运行全仓测试和门户浏览器路径；
6. 为共享接入创建独立 commit。

## 9. 完整命令矩阵

项目分支：

```bash
node --check experiences/surprises/vinyl-secret/config.js
node --check experiences/surprises/vinyl-secret/logic.js
node --check experiences/surprises/vinyl-secret/logic.test.js
node --check experiences/surprises/vinyl-secret/app.js
node --test experiences/surprises/vinyl-secret/logic.test.js
npm test
npm run verify
git diff --check
git status --short
```

总控集成到 main 后重复：

```bash
npm test
npm run verify
git diff --check
```

再从统一门户打开并完成一局。测试或浏览器 Gate 失败时项目保持 In Progress，不计入 installed。

## 10. 分段提交清单

未来完整提交序列应清晰体现每个已完成部分：

```text
docs: research vinyl secret experience
docs: brainstorm vinyl secret experience
docs: specify vinyl secret experience
docs: plan vinyl secret implementation
feat: add vinyl secret state machine
feat: add vinyl secret surprise
[可选] fix: <真实问题>
[总控] docs/catalog: integrate and verify vinyl secret
```

每个提交：

- 只包含本阶段文件；
- commit 前跑分支/root 检查；
- stage 前看 `git status --short`；
- commit 后记录 SHA；
- 不 push，除非用户另行明确授权。

## 11. 完成定义

只有以下全部满足，`vinyl-secret` 才算完成：

- 12 圈、三轨、四级信号、显式落针与最终封套真实可玩；
- 默认无音频完整；可选音频成功与失败都不影响通关；
- 一个原生 audio、零新增依赖、零远程请求；
- Node 项目测试与全仓测试通过；
- Chrome/Safari 的 A 级 file 证据明确；
- 鼠标、触摸、键盘、按钮替代、焦点、响应式、reduced motion、forced colors 通过；
- phase DOM Gate、config 明文提醒和媒体清理通过；
- README/ATTRIBUTION 完整，词曲、录音、封面、字体、纹理权利分开；
- 实际 bug/learn 已按需沉淀，无虚构记录；
- 每个部分都有独立 commit；
- 总控共享接入和 main 验收完成。

## 12. 执行 Session 返回包

```text
项目 ID：vinyl-secret
worktree / 分支：
基线 main SHA：
提交列表：
修改文件：
项目测试：
浏览器验证：
可访问性 / 响应式 / 隐私 / 控制台：
A 级启动证据：
借鉴与许可证：
新增 bug / learn：
需要总控修改的共享文件：
遗留风险或阻塞：
```

缺少提交、项目测试、浏览器证据或借鉴声明时，不进入 Ready for Review。
