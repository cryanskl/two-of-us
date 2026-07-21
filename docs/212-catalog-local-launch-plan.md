# Catalog 本地直达合同实施计划

- 日期：2026-07-21
- Brainstorm：[210-catalog-local-launch-brainstorm.md](./210-catalog-local-launch-brainstorm.md)
- 规格：[211-catalog-local-launch-spec.md](./211-catalog-local-launch-spec.md)
- 状态：待执行

## 1. 分工与写入边界

| 阶段 | 所有者 | 文件 | 完成证据 |
| --- | --- | --- | --- |
| 规划 | 主线程 | 210–212、README 索引 | 独立审查、verify、提交 |
| 合同核心 | 实现子代理 | `scripts/experience-contracts.mjs`、对应 test | 定向测试全绿，不改集成文件 |
| 集成 | 主线程 | `shared/runtime/catalog.js`、catalog test、`start-target.test.mjs`、`runtime-reuse.test.mjs`、validator | 定向与全仓测试全绿 |
| QA/沉淀 | 审查子代理 + 主线程 | bugs/learn、213 验收记录 | 静态矩阵、Chrome、独立提交 |

并行者不得提交、不得改 catalog 或体验目录。主线程负责审查、合并和每阶段提交。

## 2. 提交顺序

1. `docs: plan catalog local launch contracts`
2. `feat: enforce catalog local launch contracts`
3. `docs: verify catalog local launch contracts`

每次提交前执行：

```bash
git branch --show-current
git rev-parse --show-toplevel
git status --short
```

只暂存本阶段文件；hook 失败时修复后重新提交，不 amend。

## 3. 实现步骤

### 3.1 纯 helper 与 fixture

先实现 renderer、realpath 路径约束、严格仓库 HTML/CSS profile、引用提取和 data icon allowlist。用临时目录构造最小仓库，不复制真实体验内容；JS capability 不作为静态硬失败。

### 3.2 真实 catalog 集成

先增强共享 catalog schema，再由 `validate-repository.mjs` 调用新 validator 并聚合错误。catalog test 复用 renderer，删除内联的两份 expected 模板。验证当前 47 个 A 与 8 个 B/C/D 自动进入相应分支。

### 3.3 失败驱动修复

若通用合同暴露既有作品问题，先复现并写 `bugs/`，再只修触发问题的最小文件；每个独立 bug 单独提交。不得通过给作品加例外、忽略路径或缩小扫描面来让测试变绿。

## 4. 浏览器验收

首选 Browser/IAB 或 Chrome 插件；每次导航前安装监听并清空上一页事件，同一 tab 顺序加载 47 个 A 级 file URL，逐项采集：

- exact final file URL、readyState、非空标题与可见主内容；
- request/requestfailed、WebSocket、WebTransport、console error、pageerror 与 unhandledrejection；WebSocket 使用 Playwright `page.on("websocket")` 或 CDP `Network.webSocketCreated`，WebTransport 必须使用 Chromium CDP `Network.webTransportCreated`；
- 任意 `http/https/ws/wss/ftp` 等网络承载请求/连接或失败资源；`data/blob/about` 本地资源不误报；
- 固定 load timeout 与短 settle window 内的全部事件，并确认未停留在浏览器错误页。

再以作品启动器等价命令抽查：

- B：`panorama-memory`；
- C：`together-lock`；
- D：`i-heard-you`（不触发模型下载，只验证页面与能力缺失说明）。

浏览器验证不点击私密揭晓、不读取配置内容。若首选浏览器不可用，记录原因后才使用 Playwright Chromium fallback；普通 Chrome CLI 只有在能连接 CDP 并获取同等事件时才算等价证据。

另建不提交的临时页面分别触发 HTTP request、WebSocket 和 WebTransport，证明三类监听会失败；验证后删除临时页面，不把它留作仓库产品文件。

## 5. 审查清单

- validator import 无 I/O；
- 所有磁盘路径经 realpath containment 且不越出 root；
- 错误稳定、排序、去重、无绝对路径；
- 不用 JS capability token 推断联网；浏览器请求监听负责首屏动态证据；
- CSS 循环不会无限递归；
- 启动器 renderer 与现有八组文件逐字一致；
- POSIX 验证 `start.command` mode，Windows 验证路径与内容，Git 索引保留 `100755`；
- 不新增依赖或外部来源；
- `npm test`、`npm run verify`、Chrome 证据全部完成。

## 6. 学习与缺陷

至少新增一篇 `learn/`，解释静态合同、依赖图和真实浏览器各能证明什么、不能证明什么。只有发现真实缺陷时才新增 `bugs/`；不得把正常规划事项伪装成 bug。

最终验收记录使用 `docs/213-catalog-local-launch-verification.md`，写入精确计数、命令、浏览器方法、失败与修复、来源边界和提交哈希。
