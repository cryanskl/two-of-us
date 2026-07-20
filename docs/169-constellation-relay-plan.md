# “把星光，一笔一笔交给你”分步实施计划

- 日期：2026-07-21
- 状态：待执行
- 对应调研：[`166-constellation-relay-research.md`](./166-constellation-relay-research.md)
- 对应规格：[`167-constellation-relay-spec.md`](./167-constellation-relay-spec.md)
- 对应设计：[`168-constellation-relay-design.md`](./168-constellation-relay-design.md)
- 目标：A 级 `file://` 双人 Euler 接线合作作品，零第三方运行依赖

## 1. 独立提交边界

用户要求“每完成一个项目或者一部分，就提交一次”。本作按以下边界提交：

1. 调研：已提交 `b2b0764`；
2. 可执行规格：已提交 `fa028bd`；
3. 三态视觉、ImageGen 源稿与生产资产：已提交 `45e5c91`；
4. 本实施计划：独立提交；
5. 逻辑、配置与逻辑测试：独立提交；
6. 前端、README、ATTRIBUTION 与 favicon：独立提交；
7. 浏览器发现的每类独立 bug：修复、测试和 `bugs/` 记录一起提交；
8. catalog、分类索引、创意池与目录测试：独立提交；
9. 跨项目可复用经验：每个主题独立提交到 `learn/`；
10. 最终验证报告与状态索引：独立提交。

每次 commit 前必须执行：

```bash
git branch --show-current && git rev-parse --show-toplevel
```

并确认分支为 `main`、根目录为 `/Users/zenith/Desktop/two-of-us`。子任务不 stage、不 commit；主线程审阅、验证并按上述边界提交。

## 2. 子任务与文件所有权

### 2.1 子任务 A：逻辑、配置与 oracle 测试

唯一可写文件：

```text
experiences/co-op/constellation-relay/config.js
experiences/co-op/constellation-relay/logic.js
experiences/co-op/constellation-relay/logic.test.js
```

职责：

- 精确实现 167 号规格的 9 点、10 边、UMD/CommonJS API 与加载自检；
- 递归冻结、安全普通对象、精确字段、整份配置回退和 Unicode 字素边界；
- 独立实现整数叉积、六种线段关系、无向边查找和固定裁决优先级；
- 实现 10-bit 后缀 DFS/memo，初态恰 4 解，公开 view 不泄露答案；
- 实现七阶段 reducer、失败/重试、严格交替、5/5、MAX_SAFE 与坏状态回初态；
- 几何测试使用独立 oracle 覆盖 36 条线与 630 个线对；
- solver 测试使用独立 DFS 覆盖 9,216 个 `(cursor, mask)`；
- 测试四条完整路线、四种玩法失败、JSON action log 重放、 hostile 输入、引用断开和无运行时副作用；
- 不创建 DOM，不读取图片，不修改 catalog、README、docs、bugs、learn 或冻结资产。

完成 Gate：

```bash
node --check experiences/co-op/constellation-relay/logic.js
node --test experiences/co-op/constellation-relay/logic.test.js
npm test
git diff --check
```

### 2.2 子任务 B：前端、来源与本地直开

唯一可写文件：

```text
experiences/co-op/constellation-relay/index.html
experiences/co-op/constellation-relay/style.css
experiences/co-op/constellation-relay/app.js
experiences/co-op/constellation-relay/README.md
experiences/co-op/constellation-relay/ATTRIBUTION.md
experiences/co-op/constellation-relay/assets/favicon.svg
```

现有两张 PNG 与 `assets/README.md` 为冻结只读输入，不得重生成、重编码或覆盖。

职责：

- 按 168 号设计实现真实 DOM 的七阶段、9 个稳定 star button、SVG 线层和单一主动作；
- app 只调用 `ConstellationRelayLogic`，不复制点、边、相交、solver、当前席或失败裁决；
- 使用经典脚本 `logic.js → config.js → app.js`，保证 `file://`；
- 实现 click/tap、roving tabindex、方向键几何导航、Enter/Space、Escape、重复键与 editable 保护；
- 实现有序日志、polite live region、焦点归位、两席颜色+端帽双编码和图片失败降级；
- 实现 1504、1280、390、320、200% zoom、reduced-motion 与 forced-colors；
- README 写直开、玩法、同机信任边界、配置、隐私和精确标题 `## 借鉴与来源声明`；
- ATTRIBUTION 写五个固定来源、版权/许可证、只研究机制、零复制、ImageGen 资产和 Vanta 排除；
- 不修改 logic/config/test、catalog、根 README、docs、bugs、learn 或两张 PNG。

完成 Gate：

```bash
node --check experiences/co-op/constellation-relay/app.js
npm run verify
npm test
git diff --check
```

前端可按冻结公开 API 编写；若逻辑导出与规格不一致，必须回报主线程，不得把规则复制进 app。

## 3. 主线程整合顺序

1. 派发逻辑与前端两个互斥文件子任务；
2. 审查逻辑 diff、oracle 独立性、状态闭包与测试，拒绝越权和规格漂移；
3. 跑定向、全仓、静态和副作用 Gate，必要修正后提交逻辑部分；
4. 审查前端 diff、七阶段 DOM、键盘焦点、坏图兜底、README 与来源；
5. 跑语法、静态、全仓 Gate，必要修正后提交前端部分；
6. 更新 `experiences/catalog.json`、根 `index.html` 内置目录、`experiences/co-op/README.md`、根 README、`docs/README.md` 与 `docs/40-idea-backlog.md` 的 C18；
7. 在 `shared/runtime/catalog.test.js` 增加目录、经典脚本、离线、来源、阶段和资产测试；
8. 独立提交 catalog 部分。

目录预计从 54 增至 55；所有数量以 `npm run verify` 与测试实测为准，不提前手写未经验证的总数。

## 4. 浏览器验证顺序

### 4.1 玩法路径

1. 通过统一服务和真实 `file://` 分别打开作品；
2. 检查 console、network、两张 PNG 和经典脚本加载；
3. 开局接尾线，再过早接桥，验证 `future-stranded` 不推进；
4. 构造 `west-tip → east-top`，验证 `wire-crossed` 优先于 `off-outline`；
5. 分别触发 `off-outline` 和 `edge-used`，确认线头、席位和前缀不变；
6. 完整走规格金路径，核对十根线严格交替、A/B 各 5；
7. 第十根停在 `constellation-result`，主动 FINISH 后才进入 complete；
8. 核对共同瓷白、5/5、配置结语、十行日志和纪念图；
9. complete 重开回 exact intro，刷新不恢复旧局。

### 4.2 输入与可访问性

- click/tap 完成一次，纯键盘方向键 + Enter/Space 完成一次；
- 检查 roving tabindex 始终只有一个 0，Escape 回当前线头；
- 快速双击、repeat keydown、错误 seat、错 phase 与 editable target 不重复推进；
- choosing、成功、失败、complete 的焦点目标正确；
- live region 只播动作，不播 hover；日志能独立读出路径；
- 200% zoom、reduced-motion、forced-colors；
- 阻断两张 PNG，验证纯色面板和 DOM/SVG 仍可完整通关；
- console 无异常、404、远程请求或存储访问。

### 4.3 视口与视觉

- 1504×1046：棋盘 620–760px、无滚动、主动作同屏；
- 1280×800：棋盘 ≥520px、无横向滚动；
- 390×844：棋盘 350–366px、不裁切、触点 ≥44px；
- 320×568：棋盘 ≥296px、零横向溢出、允许纵滚；
- 每颗星中心用 `elementFromPoint()` 验证命中真实 button；
- 截图保存临时目录，用 `view_image(detail="original")` 与三张概念和 fidelity ledger 对照；
- 最后同时 `view_image` 已接受概念与最终截图，提供至少 5 条可见 fidelity 证据。

若自动化浏览器禁止直接导航 `file://`，记录工具限制并以经典相对脚本、零 fetch/module/network、目录 Gate 与人工双击验证共同证明 A 级；统一服务路径仍必须完成全交互。

## 5. Bug 记录规则

任何新可复现问题写入：

```text
bugs/YYYY-MM-DD-constellation-relay-<slug>.md
```

必须包含环境、复现、预期、实际、根因、修复、回归验证与相关提交。修复前优先增加回归测试；视觉问题记录视口、节点 ID 与实测尺寸。已有同根因记录则补充，不建立重复文件。

## 6. Learn 候选

完成后至少评估：

1. **整数线段相交分类**：为什么端点、T 接和共线重叠要从 boolean 相交升级为稳定分类；
2. **Euler 前缀的可解性 Gate**：局部合法边为何仍可能切断全局完整路径；
3. **公开轮廓但不泄漏解**：题面可展示完整边集，公开 view 仍不应暴露下一步和解数；
4. **SVG 表现层 + HTML 命中层**：如何同时获得精确视觉、触控尺寸、键盘焦点和读屏语义；
5. **同机轮流的可证明合作**：席位由记录长度派生，而不是依赖可伪造身份。

只有跨项目可复用且有真实实现/测试证据时才写入 `learn/`。

## 7. 完成条件

- 167/168 的冻结规格与设计全部实现；
- 逻辑、前端、bug、catalog、learn、验证按计划分别提交；
- 定向测试、全仓测试、目录 Gate、四条完整路线、四种失败、双输入、四档响应式与坏图降级通过；
- 五个调研来源、许可证、版权、ImageGen 与零复制声明在研究、README、ATTRIBUTION 一致；
- 最终验证记录测试总数、目录总数、浏览器路径、截图、资产哈希、fidelity ledger、限制和相关 commits；
- worktree clean。

本作品完成不等于长期目标完成；完成后继续选择下一候选，不调用 goal complete。

## 8. 执行状态

2026-07-21 已按本计划完成调研、规格、视觉、逻辑、前端、bugs、catalog、learn 与浏览器闭环。最终证据、限制和独立提交见 [170-constellation-relay-verification.md](./170-constellation-relay-verification.md)。长期目标继续保持进行中。
