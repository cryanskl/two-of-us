# Snow Globe Message 非视觉核心复验

- 日期：2026-07-25
- 项目 ID：`snow-globe-message`
- 对外公开标题：`等雪停下`
- 分类：`surprise`
- 等级目标：A
- worktree：`{worktree-base}/snow-globe-message-core-audit`
- 分支：`codex/exp-snow-globe-message-core-audit`
- 基线：`5d995630672668df6e1a4f356b5eef67606d89b0`
- 核心结论：**Core Go**
- 完整项目结论：**Conditional Go**

## 1. 复验结论

本轮从指定基线重新通读调研、规格、脑暴、视觉简报、实施计划、视觉提案、来源
维护记录，以及当前核心实现和历史提交。没有复现新的核心规则、确定性、输入 helper、
授权或资源缺口，因此没有修改生产代码，也没有新增 `bugs/` 或 `learn/` 记录。

当前纯逻辑核心仍满足：

- 上、右、下、左是任意顺序、每个只收一次的有限集合；
- 收齐四阵风只进入 `armed`，必须再显式执行 `BEGIN_SETTLE`；
- settling 使用 token 防止迟到、重复和旧轮完成源改变结果；
- 9×11、63 个 active cell 的默认心形和 target 均确定且可重放；
- 五个私密字段只在 `complete` 公开；
- hostile config、state、action 和原型污染均 fail closed；
- 核心不读取 DOM、Canvas、时间、随机、网络、存储或权限 API；
- 固定开源来源的许可证载体与借鉴声明完整，运行时第三方依赖为 0。

完整项目仍是 Conditional Go：视觉提案尚待用户明确确认，当前没有生产页面，
也没有浏览器、真实 `file://`、catalog 或启动器证据。

## 2. 范围与历史

### 2.1 已审阅文档

- `docs/181-snow-globe-message-research.md`
- `docs/182-snow-globe-message-spec.md`
- `docs/199-snow-globe-message-brainstorm.md`
- `docs/200-snow-globe-message-imagegen-brief.md`
- `docs/209-snow-globe-message-plan.md`
- `docs/210-snow-globe-message-design-proposal.md`
- `docs/233-snow-globe-message-source-refresh.md`
- `docs/210-catalog-local-launch-brainstorm.md`

### 2.2 已审阅实现

```text
experiences/surprises/snow-globe-message/
├── assets/
│   └── ATTRIBUTION.md
├── config.js
├── logic.js
└── logic.test.js
```

历史提交边界保持清楚：

| Commit | 内容 |
| --- | --- |
| `0984da4` | 配置、确定性纯逻辑、oracle 测试与两项已修复 bug 记录 |
| `54a35fd` | 核心进度记录 |
| `04d70a4` | 十张 docs-only 概念图、生成台账、视觉提案与点阵 fidelity 记录 |
| `8cfd6ef` | 来源维护复核 |
| `2ba1b10` | 体验级 `assets/ATTRIBUTION.md` |

本轮只新增本复验文档。没有修改核心、共享目录、根依赖、锁文件、launcher、
catalog、Board、根/分类 README 或其他体验。

## 3. 状态机、确定性与隐私

冻结主路径为：

```text
intro
  → START
gathering
  → 四个首次 ADD_WIND（任意顺序）
armed
  → BEGIN_SETTLE
settling
  → COMPLETE_SETTLE（token 精确匹配）
complete
  → RESTART
intro
```

复验确认：

- 24 种四方向排列全部唯一进入 `armed`；
- 16 种 winds 子集的数量、缺失方向与进度文案均由独立 oracle 校验；
- 重复方向、非法方向、额外字段、accessor、Symbol 和自定义原型均不推进状态；
- `revision` 为下一完整轮保留精确 headroom，不溢出也不复用 token；
- JSON clone 的合法 state/action log 可确定重放；
- 默认 pattern hash、target hash、`p00..p62` 和整数坐标与规格一致；
- settling 与 complete 才公开 target；图案说明、称呼、署名、最终标题和私信只在
  complete 公开；
- public view 与嵌套数据递归冻结，并与输入和 state 断开引用。

## 4. 输入与减少动态合同

### 4.1 已具备的纯逻辑合同

`classifyWindSample(latched, dx, dy)` 已冻结并测试：

- 只接受 boolean latch 与 `-1000..1000` 安全整数；
- 使用 `max(abs(dx), abs(dy))`；
- inner 为 100、outer 为 260；
- 对角平局固定归纵向；
- latch 必须回到 inner 才能再次分类；
- helper 不读取 winds，重复方向由 reducer 同引用 no-op。

`SETTLE_DURATION_MS=900`、`SETTLE_TIMEOUT_MS=1400`、`DISPLAY_FLAKES=72`
和 token 化完成动作也已冻结。逻辑层因此能让 rAF、timeout、页面生命周期、
Canvas 失败和 reduced-motion 最终汇入同一个 `COMPLETE_SETTLE`。

### 4.2 尚未实现、不得误报的页面合同

当前没有 `index.html`、`app.js` 或 `styles.css`，所以以下仍是后续 UI Gate：

- Pointer capture、generation、第二指、cancel/lost capture 与坐标投影；
- 四个原生按钮与 Pointer 派发同一 `ADD_WIND`；
- rAF、timeout、hidden、pagehide、blur、Canvas error 的统一清理；
- 初始或途中 `prefers-reduced-motion` 的快速完成；
- 真实 DOM 私密扫描、live region、焦点迁移和 CSS grid fallback；
- forced-colors、无 Canvas、无 JavaScript、响应式和缩放。

本轮没有页面可开，因此刻意没有做 Chrome 或 `file://` 验收。

## 5. 来源、借鉴声明与资源

固定许可证载体于 2026-07-25 重新从固定 commit 下载并计算 SHA-256：

| 来源 | 固定 commit | 载体 | 结果 |
| --- | --- | --- | --- |
| tsParticles | `627b3fc7d1a0d0fe524e2fea5f89fa7589b18d59` | MIT `LICENSE` | `c5c18d…381a4`，匹配 |
| canvas-text-particle | `9ee144a548aad85275318b30891c71dcf6e10f7b` | ISC `LICENSE` | `2a9fec…3a122`，匹配 |
| canvas-confetti | `20eebad51dde793070c373d594099a7ed8d96e22` | ISC `LICENSE` | `fd4447…b2f7a`，匹配 |
| W3C Device Orientation | `70d42d5484db7fd1646e48cc17caa5ff1c9d92cb` | W3C `LICENSE.md` | `cd28c5…df3a`，匹配 |

排除项 `alexgibson/shake.js` 仍归档，GitHub SPDX 仍为 `NOASSERTION`；固定
`package.json` 与 `LICENSE.md` 哈希均匹配，继续不复制、不依赖、不作为正式来源。

实时远端复核发现 tsParticles 默认分支 HEAD 已前进到
`d38e87725cb0fa7108481b39064e067203068bac`。这不使 2026-07-24 的时间点记录、
固定 commit 或许可证证据失效，也不构成追版理由。其余三个正式来源的默认分支
仍停在记录的固定 commit。

`assets/ATTRIBUTION.md` 已逐项写明来源、固定 commit、许可证、版权所有者、实际
借鉴和未复制范围。当前实现不包含 vendor、CDN 或第三方运行时依赖。

十张 `docs/assets/snow-globe-message/*.png` 的文件数、原生尺寸和 SHA-256 全部与
`GENERATION.md` 匹配。它们仍是 docs-only 构图材料；生产目录没有 PNG，点阵也
没有从图片采样、描摹或 OCR。

## 6. 与现有作品的机制去重

对 catalog 中最接近的已安装作品重新检查后，雪球留言仍有独立规则身份：

| 已安装作品 | 既有主机制 | 雪球留言的差异 |
| --- | --- | --- |
| `scratch-surprise` | 擦除覆盖率达到门槛 | 不擦除、不计算覆盖率 |
| `fog-window-letter` | 自由书写后沿原锚点描回 | 不保存或复走轨迹 |
| `instant-photo` | 左右交替九次并分层显影 | 四方向 set；不交替、不累计次数、不分层显影 |
| `hand-crank-music-box` | 顺时针角度旅行、八圈、逐音展开 | 不计算角度、圈数或旋转方向 |
| `starlight-keepsake-search` | 移动光心并在隐藏目标持续停留 | 不搜索空间、不依赖 dwell 或秘密热点 |

尚未安装的 `wish-fireworks` 是蓄力后逐发爆炸并逐字/逐像素形成的候选核心；
雪球留言没有蓄力或多次爆炸，而是“四方向有限收集 → 主动落定 → 一次整体成形”。

因此不能把雪球留言退化为拍立得换皮、轨迹复走、驻留搜索、旋转计数或烟花蓄力。

## 7. 自动验证

环境准备：

```text
npm ci
55 packages installed
0 vulnerabilities
package.json / package-lock.json 未修改
```

定向验证：

```text
node --check experiences/surprises/snow-globe-message/config.js
node --check experiences/surprises/snow-globe-message/logic.js
node --test experiences/surprises/snow-globe-message/logic.test.js

17 tests
17 passed
0 failed
```

全仓验证：

```text
npm test

2269 tests
2269 passed
0 failed
```

```text
npm run verify

仓库验收通过：58 个作品入口（50 个 A 级直开、8 个非 A 启动器）、
1 个能力声明、资源与借鉴声明完整。
```

`git diff --check` 通过。上述 58 个入口不包含 `snow-globe-message`，不能用全仓
verify 的通过推导该项目已经安装或可以本地点开。

## 8. 缺陷与沉淀

本轮没有稳定复现新的产品缺陷，所以没有为了填记录而新增 `bugs/`。既有三条记录
仍准确：

- hostile input 合同缺口；
- settling oracle 缺口；
- ImageGen 离散点阵 fidelity 缺口。

前两条已在 `0984da4` 的测试和实现中修复；第三条通过把概念图永久限定为
docs-only、生产 target 只读冻结点阵来规避。

本轮也没有形成脱离现有规格和计划的新增通用结论，因此没有新增 `learn/`。

## 9. 未完成 Gate

在用户明确接受或修改 `docs/210-snow-globe-message-design-proposal.md` 前，仍不得
创建生产 UI。当前明确未完成：

- `index.html`、`app.js`、`styles.css`、favicon 和运行时资产；
- 项目 `README.md` 与 `experience.json`；
- Pointer、Canvas、reduced-motion、forced-colors 和无 JavaScript 实现；
- 六档视口、200%/400% 缩放、键盘、触摸、焦点、live 与降级验收；
- Chrome、真实 `file://`、console 0、network 0 和资源失败测试；
- catalog、launcher、门户、分类索引与 Board 接入。

结论保持：**非视觉核心可继续使用；完整作品尚未安装、尚不能宣称本地点开即用。**
