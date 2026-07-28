# Two of Us 多 Session 总控 Runbook

> 适用仓库：`{repo-root}`
>
> 目标：用 1 个总控 Session 协调最多 4 个执行 Session，把仓库稳定推进到 75 个已安装、已验收的本地优先互动体验。
>
> 状态与排队信息见 [`orchestration-board.md`](./orchestration-board.md)。

## 1. 恢复协议

总控在首次启动、恢复会话或上下文压缩后，必须先：

1. 完整读取本文件和 [`orchestration-board.md`](./orchestration-board.md)；
2. 检查 `git status --short`、当前分支、仓库根目录和 `HEAD`；
3. 重新读取 `experiences/catalog.json`，计算真实 installed 数量和 A/B/C/D 分布；
4. 对照实际 worktree、分支与提交刷新 Board；
5. 以当前仓库事实覆盖 Board 中已经过时的快照，不沿用聊天中的旧计数。

## 2. 角色与并发

- **总控 Session**：负责任务拆分、队列、共享文件、审查、验收、集成和 Board；不与执行 Session 抢占同一个项目。
- **执行 Session**：一个 Session 同一时间只负责一个项目或一个可独立验收的阶段。
- 目标并发是 **4 个执行 Session + 1 个总控 Session**；总控不计入四个执行名额。
- 若当前运行环境允许的并发少于 4，不得伪造 Session；按实际可用上限滚动执行，并在有空位时立即补发。
- 一个执行 Session 返回后，总控先完成审查与集成，再把释放的名额派给下一个候选。

## 3. Worktree 与分支

每个执行项目使用独立 worktree 和独立分支：

```text
分支：codex/exp-<project-id>
worktree：../two-of-us-worktrees/<project-id>
```

派发时必须记录：

- 项目 ID、分类、启动等级和预期交付；
- 基线 `main` SHA；
- worktree 绝对路径和分支；
- 允许修改的文件范围；
- 预留的文档编号；
- 必跑测试与浏览器场景。

执行 Session 在任何写操作和 commit 前都要运行：

```bash
git branch --show-current
git rev-parse --show-toplevel
```

结果必须与任务分支和 worktree 一致。禁止执行 `reset --hard`、`push --force`、`branch -D`、`clean -f`、`checkout --`，除非用户在当前消息中明确授权。

## 4. 文件所有权

### 执行 Session 可修改

- 自己的 `experiences/<category>/<project-id>/`；
- 总控明确分配给该项目的 research/spec/plan/design/verification 文档；
- 为该项目新建的唯一命名 bug 或 learn 文件；
- 任务明确授权的项目级测试。

### 仅总控修改

- `experiences/catalog.json`；
- 根 `index.html`、根 `README.md`；
- 分类 README、`docs/README.md`、`docs/40-idea-backlog.md`；
- 根 `package.json`、锁文件、共享 runtime、共享启动脚本；
- 全局精确计数和目录合同测试；
- `bugs/`、`learn/` 的汇总索引；
- 本 Runbook 与 Board。

共享文件只有在总控显式授权后才能交给某个执行 Session；同一时刻只能有一个所有者。独立 worktree 只能隔离文件写入，不能自动消除目录、依赖、端口、协议和计数上的逻辑冲突。

## 5. 调度顺序

优先级按以下顺序决定：

1. 许可证清楚、来源可固定、无重复机制；
2. 已有研究和规格，可直接实现；
3. A 级、零共享依赖、目录互不重叠；
4. B/C/D 项目及需要共享 runtime 的项目；
5. 仍需澄清许可证、模型、资产或服务边界的候选。

第一批尽量派发 4 个互不重叠的 A 级项目。B/C/D 或共享 runtime 改动可以独立研究、实现项目代码，但共享层只能由总控串行集成。

## 6. 执行 Session 工作流

非平凡项目执行：

```text
brainstorm → research/attribution → spec → plan → implementation
→ project tests → browser verification → fixes → verification note → commits
```

若仓库已有合格的 research/spec/plan，可以从下一未完成阶段继续，不重复制造同义文档。每完成一个项目或可独立验收的阶段，都要创建独立 commit。

实现必须满足：

- 本地优先；按 A/B/C/D 启动合同运行；
- 首局规则清楚，核心玩法真实完成，不以静态页面或按钮演示代替；
- 鼠标、触屏、键盘等承诺输入可用；
- 响应式、焦点、状态反馈和 `prefers-reduced-motion` 有合理处理；
- 本地文件、摄像头、麦克风等隐私边界清楚；
- 不必要的网络请求为零；
- 降级、重开和异常路径可理解；
- 控制台没有未解释错误。

## 7. 开源借鉴与许可证

只要参考了开源项目，就必须在项目 README、研究文档或专门 attribution 文件中写清：

- 仓库与固定 commit URL；
- 许可证名称、许可证文件链接和版权人；
- 实际借鉴了什么；
- 明确没有复制什么；
- 若引入代码或资产，保留许可证要求的正文、版权与 notice；
- 必要时记录许可证文件或资产的 SHA-256。

许可证不清、来源无法固定、资产权利不明或许可证不兼容时，不得复制。可以只研究抽象机制并自行重写，但仍需声明机制参考边界。

## 8. Bug 与 Learn

- 实际出现的 bug、复现条件、影响、根因、修复和回归验证写入 `{repo-root}/bugs`。
- 可复用的架构、交互、调试、浏览器兼容和许可证知识写入 `{repo-root}/learn`。
- 一个独立问题优先使用一个唯一命名文件，避免四个 Session 同写同一个文件。
- 同一根因再次出现时，追加到已有记录并注明新项目和回归证据。
- 纯预防性假设不冒充真实 bug。

## 9. 执行 Session 返回包

执行 Session 完成时必须返回：

```text
项目 ID：
worktree / 分支：
基线 main SHA：
提交列表：
修改文件：
项目测试：
浏览器验证：
可访问性 / 响应式 / 隐私 / 控制台：
A/B/C/D 启动证据：
借鉴与许可证：
新增 bug / learn：
需要总控修改的共享文件：
遗留风险或阻塞：
```

缺少提交、测试、浏览器证据或借鉴声明时，不进入 Ready for Review。

## 10. 总控审查与自动集成

总控可以自动集成到**本地 `main`**，但必须按顺序执行：

1. 核对执行 Session 的分支、worktree、基线 SHA、提交和改动范围；
2. 查看 diff，确认没有越权修改、重复机制、泄露或许可证问题；
3. 在执行 worktree 重跑项目测试和必要浏览器场景；
4. 把项目 commits 集成到本地 `main`；
5. 由总控更新 catalog、门户、分类索引、backlog、共享 runtime 和精确计数；
6. 在 `main` 运行项目测试、全仓测试、`npm run verify`；
7. 涉及 UI 时，用真实浏览器从统一门户启动并完成核心玩法；
8. 为共享集成和计数更新创建独立 commit；
9. 更新 Board，再补发下一个项目。

集成冲突必须理解后手工解决，不能用 ours/theirs 一键覆盖。默认不得 push、创建 PR、发布或部署；这些需要用户另行明确授权。

## 11. 验收 Gate

项目只有同时满足以下条件才算 installed：

- 核心玩法和结束条件可完成；
- 项目级测试通过；
- 对应 A/B/C/D 启动合同通过；
- 桌面与移动关键视口、键盘/焦点和触屏路径完成验证；
- 隐私、网络、降级与控制台检查完成；
- README、catalog、门户、分类索引和 attribution 一致；
- 实际 bug 和可复用 learn 已沉淀；
- `main` 上全仓测试和 repository verify 通过；
- 所有改动已形成可追踪 commit。

任一 Gate 失败，项目只能标记为 In Progress 或 Blocked，不能计入 75。

## 12. 阻塞处理

出现以下情况时停止该项目的集成，写入 Board 的 Blocked 区并释放执行名额：

- 许可证或来源边界不清；
- 需要用户选择会显著改变玩法或范围；
- 共享依赖、端口或协议存在冲突；
- 测试或浏览器核心路径失败；
- 执行 Session 修改了未授权共享文件；
- 需要破坏性 Git/文件操作；
- 需要 push、发布、外部账号或凭据。

阻塞项目不妨碍其他独立项目继续滚动。

## 13. 总目标完成条件

只有以下条件全部成立，总控才可宣布目标完成：

- catalog 中至少 75 个真实 `installed: true` 项目；
- 每个项目都满足对应启动合同和项目 Gate；
- 统一依赖、本地 runtime 与跨平台一键启动可用；
- 全仓测试、`npm run verify` 和统一门户浏览器验证通过；
- `bugs/`、`learn/`、借鉴声明和 Board 已同步；
- 本地 `main` 无未解释改动、冲突或伪完成项目。
