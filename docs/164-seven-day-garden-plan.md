# “把七天，养成一朵花”分步实施计划

- 日期：2026-07-21
- 状态：已执行（自动化策略限制下保留真实 `file://` 与设备辅助模式人工 Gate）
- 对应调研：[`161-seven-day-garden-research.md`](./161-seven-day-garden-research.md)
- 对应规格：[`162-seven-day-garden-spec.md`](./162-seven-day-garden-spec.md)
- 对应设计：[`163-seven-day-garden-design.md`](./163-seven-day-garden-design.md)
- 目标：A 级 `file://` 公开规划合作作品，零第三方运行依赖

## 1. 独立提交边界

用户要求“每完成一个项目或者一部分，就提交一次”。本作按以下边界提交：

1. 调研：已提交 `cc02570`；
2. 规格：已提交 `b765077`；
3. 视觉、ImageGen 源稿与生产资产：已提交 `82c5b79`；
4. 本实施计划：已提交 `713fc45`；
5. 规格不变量修复：已提交 `2e9fc74`；
6. 逻辑、配置与逻辑测试：已提交 `92e4d79`；
7. 前端、README、ATTRIBUTION 与 favicon：已提交 `9bf8f62`；
8. 浏览器发现的独立 bug：已提交 `653335c`；
9. catalog、分类索引、创意池与目录测试：已提交 `3937888`；
10. 目录 Gate 误报复盘：已提交 `cacd6f3`；
11. 可跨项目复用的 learn：已提交 `61a1db9`；
12. 最终验证报告与状态索引：本次提交。

每次 commit 前必须执行：

```bash
git branch --show-current && git rev-parse --show-toplevel
```

并确认分支为 `main`、根目录为 `/Users/zenith/Desktop/two-of-us`。子任务不 stage、不 commit；主线程审阅、验证并按上述边界提交。

## 2. 子任务与文件所有权

### 2.1 子任务 A：逻辑、配置与逻辑测试

唯一可写文件：

```text
experiences/co-op/seven-day-garden/config.js
experiences/co-op/seven-day-garden/logic.js
experiences/co-op/seven-day-garden/logic.test.js
```

职责：

- 精确实现 162 号规格的七日表、两篮库存、UMD/CommonJS API；
- 实现递归冻结、安全普通对象/精确字段校验与配置整项回退；
- 实现 `countSuffix`、`evaluateDay`、唯一完整路线与合法后缀计数；
- 实现八个权威 phase、逐日换先手、失败不扣卡、成功原子提交和七日严格前缀；
- 实现 exact action schema、hostile 输入 fail closed、MAX_SAFE revision 原引用保护；
- 实现公开 view、完成摘要、composition 隔离和 `KeyW/KeyS/KeyP` 分类；
- 测试 9 种有序组合、两个失败 code、全七日路线、双方各 7 次、JSON 重放、坏状态/动作、引用断开与无运行时副作用；
- 不创建 DOM，不读取图片，不修改 catalog、README、docs、bugs、learn 或现有资产。

完成 Gate：

```bash
node --check experiences/co-op/seven-day-garden/logic.js
node --test experiences/co-op/seven-day-garden/logic.test.js
npm test
git diff --check
```

### 2.2 子任务 B：前端、来源与本地直开

唯一可写文件：

```text
experiences/co-op/seven-day-garden/index.html
experiences/co-op/seven-day-garden/styles.css
experiences/co-op/seven-day-garden/app.js
experiences/co-op/seven-day-garden/README.md
experiences/co-op/seven-day-garden/ATTRIBUTION.md
experiences/co-op/seven-day-garden/assets/favicon.svg
```

现有三张 PNG 与 `assets/README.md` 是冻结只读输入，不得重生成、重编码或覆盖。

职责：

- 按 163 号设计实现真实 DOM 的 intro、day-intro、choosing、handoff、day-result、jammed、complete；
- app 只调用 `window.SevenDayGardenLogic` 的 state/view/dispatch API，不复制花签、库存、先手、solver 或失败判定；
- 使用经典脚本 `config.js → logic.js → app.js`，保证 `file://`；
- 实现公开交接、七签 4+3、两篮等权、两照料位、八阶段植物图集和 CSS 备用植物；
- 实现原生 button、W/S/P 快捷键、repeat/双击保护、阶段标题焦点与 polite live region；
- 实现 1728、1280、390、320、200% zoom、reduced-motion、forced-colors 与坏图降级；
- README 写直开方式、玩法、信任边界、配置、隐私和精确标题 `## 借鉴与来源声明`；
- ATTRIBUTION 写四个固定来源、版权/许可证、只借鉴机制、零复制、ImageGen 资产和排除范围；
- 不修改 logic/config/test、catalog、根 README、docs、bugs、learn 或三张 PNG。

完成 Gate：

```bash
node --check experiences/co-op/seven-day-garden/app.js
npm run verify
npm test
git diff --check
```

前端可按冻结公开 API 编写；如果逻辑导出与规格不一致，必须回报主线程，不得把规则复制进 app。

## 3. 主线程整合顺序

1. 审查逻辑 diff 与测试，拒绝文件越权和规格漂移；
2. 跑定向测试、全仓测试和独立 oracle，修正后提交逻辑部分；
3. 审查前端 diff、所有阶段 DOM、坏图兜底、README 与来源声明；
4. 跑语法、静态 Gate、全仓测试，修正后提交前端部分；
5. 更新 `experiences/catalog.json`、根 `index.html` 内置目录、`experiences/co-op/README.md`、根 README 状态、`docs/README.md` 和 `docs/40-idea-backlog.md` 的 C16；
6. 在 `shared/runtime/catalog.test.js` 增加目录、经典脚本、离线、来源、阶段和资产测试；
7. 独立提交 catalog 部分。

目录预计从 53 增至 54；所有数量以 `npm run verify` 与测试实测为准，不提前手写未经验证的总数。

## 4. 浏览器验证顺序

使用浏览器工具进行真实交互，不能只依赖静态检查。

### 4.1 玩法路径

1. 通过仓库统一服务打开 `experiences/co-op/seven-day-garden/index.html`；
2. 检查 console、network、三张 PNG 与经典脚本加载；
3. 日 1 先走 `AW/BW`，验证 pair-mismatch、库存归还、attempt 只在重试时增加；
4. 重开后走 `AS/BW`，验证 future-stranded、库存归还且不提示正确分工；
5. 完整走 `AW/BS → AP/BW → AS/BS → AP/BS → AW/BW → AP/BP → AW/BS`；
6. 每日确认先手交替、handoff 公开首张卡、成功原子扣卡、已完成前缀不回退；
7. 第七日先停在 day-result，再主动进入 complete；
8. 核对 7 天、14 张卡、attempt/replans 与配置结语；
9. complete 重开回 exact intro，刷新不恢复旧局。

### 4.2 输入、可访问性与边界

- 全程只用 Tab、Enter/Space 与 W/S/P 完成一次；
- 快速双击、重复 keydown、错误席位和耗尽工具均只提交一次或 no-op；
- 阶段切换焦点到标题，同阶段局部更新不丢当前按钮焦点；
- live region 只播交接、选择、日结、退卡与完成；
- 原生 disabled 同时显示“剩余 0 张”；
- 200% zoom、reduced-motion、forced-colors；
- 阻断三张图片，验证 CSS 植物、纯色纸面与全部操作；
- console 无异常、404、网络请求或存储访问。

### 4.3 视口与视觉

- 1728×906：植物主导、两篮等权、主要动作首屏可见；
- 1280×800：植物不低于 300px 宽；
- 390×844：植物 220–260px、工具一行、七签 4+3；
- 320×568：无横向溢出、按钮至少 56px、允许纵滚；
- 截图保存到临时目录，用 `view_image(detail="original")` 与三张概念及 fidelity ledger 对照；
- 最后必须同时 `view_image` 概念图和浏览器最终截图，留下至少 5 条可见 fidelity 证据；
- 浏览器工具按其技能要求正常结束会话。

真实 `file://` 若受自动化工具导航策略限制，只记录能力边界；A 级仍必须由经典相对脚本、零 fetch/module/network、目录 Gate 与人工双击验证共同证明。

## 5. Bug 记录规则

任何新可复现问题写入：

```text
bugs/YYYY-MM-DD-seven-day-garden-<slug>.md
```

必须包含环境、复现、预期、实际、根因、修复、回归验证与相关提交。修复前优先增加回归测试；视觉问题记录视口与实测尺寸。

系统 Python 缺 Pillow 已复用并补记于 [`2026-07-19-memory-bid-chroma-python-runtime.md`](../bugs/2026-07-19-memory-bid-chroma-python-runtime.md)，不得为同根因建立重复文件。

## 6. Learn 候选

完成后至少评估：

1. **有限库存的前缀原子提交**：失败不扣卡、成功才提交副本，为什么比扣除后回滚更可证明；
2. **精确覆盖合作题的后缀 Gate**：当天匹配与全局可解为何必须由同一 evaluator 分层；
3. **公开规划而非私密线索**：如何公开花签、库存、第一张卡，同时不泄露唯一席位路线；
4. **生成式八阶段图集**：规则阶段、图集格位、CSS 兜底和 reduced motion 如何共享一个 `plantStage`。

只有跨项目可复用且有真实实现/测试证据时才写入 `learn/`。

## 7. 完成条件

- 162/163 的冻结规格和设计全部实现；
- 逻辑、前端、catalog、bugs、learn、验证按计划分别提交；
- 定向测试、全仓测试、目录 Gate、完整七日路线、两种失败、双输入、四档响应式与坏图降级通过；
- 四个调研来源、许可证、版权、ImageGen 与零复制声明在研究、README、ATTRIBUTION 一致；
- 最终验证文档记录测试总数、目录总数、浏览器路径、截图、资产哈希、fidelity ledger、限制和相关 commits；
- worktree clean。

执行结果与保留的人工 Gate 见 [`165-seven-day-garden-verification.md`](./165-seven-day-garden-verification.md)。本作品完成不等于长期目标完成；完成后继续选择下一候选，不调用 goal complete。
