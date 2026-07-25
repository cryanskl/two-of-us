# “把名字折成同一束光”分步实施计划

- 日期：2026-07-25
- 稳定工作 ID：`kaleidoscope-names`
- 调研：[`259-kaleidoscope-names-research.md`](./259-kaleidoscope-names-research.md)
- Brainstorm：[`260-kaleidoscope-names-brainstorm.md`](./260-kaleidoscope-names-brainstorm.md)
- 规格：[`261-kaleidoscope-names-spec.md`](./261-kaleidoscope-names-spec.md)
- 目标目录：`experiences/surprises/kaleidoscope-names/`
- 启动等级：A（真实 `file://` 直开）
- 当前边界：只制定计划，不创建生产项目或 UI

## 1. 任务分类与冻结边界

这是非平凡新功能：新增一套单人惊喜、二维离散校准状态机、Canvas 投影、阶段
隐私、配置入口、浏览器验收、catalog/门户接入与借鉴声明，跨多个文件。

实施必须服从 261 的 exact 合同，尤其不能弱化：

1. `folds 4–9 × phase 0–23` 的唯一 exact 答案；
2. `TURN_UNITS=2520` 只用于整数 pattern model，Canvas 不参与判定；
3. 原生六按钮 + 原生 range 的键盘/触屏等价路径；
4. `intro → tuning → aligned → complete`；
5. aligned 前不创建 marks/final，主动 REVEAL 后才公开；
6. config 原子回退、exact action/revision 与 phase public DTO；
7. A 级经典脚本、零网络/权限/存储/第三方运行依赖；
8. reduced-motion、forced-colors、Canvas failure、no-JS；
9. 完全原创与零复制声明。

首版不加入照片、上传、导出、音频、主题、随机题、计时、得分、传感器、WebGL、
共享 runtime 或根依赖。

## 2. 生产 Gate

本计划完成后，允许先实现纯逻辑，但**不允许直接生产 UI**。

顺序：

```text
logic/config/tests/attribution
  → 独立 design proposal
  → 用户确认视觉方向
  → HTML/app
  → CSS/Canvas 视觉
  → 项目 README
  → 总控共享集成
  → 浏览器与 file:// 验收
```

若 design 提议改变阶段、控件、公开 DTO、隐私或规则，应返回 261 修订并独立提交，
不能在 app/CSS 中临时偏离。

## 3. 提交纪律

用户要求每完成一个项目或部分就提交。固定建议提交：

1. `docs: plan kaleidoscope names implementation`（本计划）；
2. `feat: add kaleidoscope names logic`；
3. `docs: design kaleidoscope names interface`；
4. `feat: add kaleidoscope names interaction`；
5. `feat: style kaleidoscope names`；
6. `docs: document kaleidoscope names`；
7. `feat: catalog kaleidoscope names`（总控共享集成）；
8. 每个真实 bug：`fix: <kaleidoscope names bug>`，带失败夹具与唯一 bug 记录；
9. 每个可复用结论：`docs: capture <learning>`；
10. `docs: verify kaleidoscope names`。

每次 commit 前精确运行：

```bash
git branch --show-current && git rev-parse --show-toplevel
```

并确认分支/worktree 是任务目标、没有混入其他 Session 或用户改动。每阶段：

```bash
git diff --check
npm run verify
```

代码阶段再运行定向测试与 `npm test`。pre-commit hook 失败时修复、重新 add、创建
新 commit，绝不 `--amend` 上一次提交。

禁止 `reset --hard`、`push --force`、`branch -D`、`clean -f`、`checkout --`
及覆盖未提交修改。默认不 push、发 PR、部署或发布。

## 4. Session 与文件所有权

### 4.1 执行 Session：纯逻辑

唯一写入：

```text
experiences/surprises/kaleidoscope-names/package.json
experiences/surprises/kaleidoscope-names/config.js
experiences/surprises/kaleidoscope-names/logic.js
experiences/surprises/kaleidoscope-names/logic.test.js
experiences/surprises/kaleidoscope-names/ATTRIBUTION.md
```

不得创建 HTML/CSS/app/README，不修改 catalog、根入口、分类 README、docs 索引、
backlog、共享 runtime、根依赖、bugs/learn 索引或 Board。

### 4.2 执行 Session：design

由总控另行分配唯一文档编号，只写：

```text
docs/<allocated>-kaleidoscope-names-design.md
```

不生成生产 UI、图片或代码。提交后进入用户确认 Gate。

### 4.3 执行 Session：HTML/app

设计确认后，只写：

```text
experiences/surprises/kaleidoscope-names/index.html
experiences/surprises/kaleidoscope-names/app.js
```

不得修改 logic/config/test/attribution/styles/shared files。

### 4.4 执行 Session：视觉

交互提交后，只写：

```text
experiences/surprises/kaleidoscope-names/styles.css
```

首版无 assets。若 design 最终证明需要本地资产，必须先做独立来源/许可证复审和
计划修订；不能在 CSS 阶段临时下载。

### 4.5 执行 Session：项目文档

只写：

```text
experiences/surprises/kaleidoscope-names/README.md
```

ATTRIBUTION 的实质来源边界已在逻辑阶段完成；README 复述使用与隐私，不复制出
矛盾的来源版本。

### 4.6 仅总控

总控串行修改：

```text
experiences/catalog.json
experiences/surprises/README.md
README.md
index.html
docs/README.md
docs/40-idea-backlog.md
共享精确计数/合同测试
docs/<allocated>-kaleidoscope-names-verification.md
bugs/learn 汇总索引
docs/orchestration-board.md
```

只有全部项目 Gate 通过后才把 installed 数量从 58 增加到 59；数字必须以实际
catalog 重算，不能按计划预写。

## 5. 批次一：纯逻辑、配置、来源与测试

### 5.1 模块骨架

`package.json`：

```json
{ "type": "commonjs" }
```

`config.js`：

- 浏览器写 `window.KALEIDOSCOPE_NAMES_CONFIG`；
- CommonJS 导出同一可编辑候选；
- 只含 schema 字段，不含 DOM、函数、URL 或真实私人内容。

`logic.js`：

- IIFE / UMD 风格同时暴露浏览器全局与 `module.exports`；
- 顶层 exact API 按 261 顺序；
- 初始化零 side effect；
- 不读取 `window.KALEIDOSCOPE_NAMES_CONFIG`，配置由 app 显式传入
  `createInitialState()`。

### 5.2 实现顺序

按依赖从小到大：

1. exact plain record / dense array descriptor snapshot；
2. well-formed Unicode、NFC、空白与禁用控制字符；
3. deep freeze / safe ownership；
4. DEFAULT_CONFIG、CONSTANTS、ACTIONS；
5. `sanitizeConfig` 整份回退；
6. `evaluateSelection` 与环形距离；
7. `createPatternModel`；
8. state validator / JSON clone strategy；
9. `createInitialState`；
10. exact action validator；
11. `reduce` 与 revision headroom；
12. phase `getPublicView`。

不得先写 UI 再反推 logic，也不得在测试里复制一份生产 helper 来生成 expected。

### 5.3 独立 oracle

测试中的唯一解 oracle 使用直接四重整数比较，不调用生产
`evaluateSelection()` 生成 expected：

```text
for each target fold 4..9
  for each target phase 0..23
    enumerate 144 selections
    count selectedFold === targetFold && selectedPhase === targetPhase
```

pattern oracle 独立验证：

```text
wedgeUnits = 2520 / folds
expectedRotation = (phase * 105 + index * wedgeUnits) % 2520
```

可以在 test 文件里写简单算式，但不能 import 生产常量后原样重放实现。

### 5.4 定向 Gate

```bash
node --check experiences/surprises/kaleidoscope-names/config.js
node --check experiences/surprises/kaleidoscope-names/logic.js
node --test experiences/surprises/kaleidoscope-names/logic.test.js
npm test
npm run verify
git diff --check
```

额外审查：

- diff 只有五个授权文件；
- 144 × 144 target/selection 组合唯一解全绿；
- hostile getter/Proxy 不抛；
- phase sentinel 无 marks/final/target；
- zero network/storage/permission import；
- ATTRIBUTION 写明原创与标准文档边界。

完成后独立 commit，返回总控审查。该提交不等于 installed。

## 6. 批次二：design proposal

design 文档至少冻结：

1. 视觉目标与非目标；
2. 公共 intro、tuning、aligned、complete 四张状态构图；
3. 原生折面按钮/range 与 Canvas 的位置关系；
4. Canvas base motif 的 normalized path（数值与线宽）；
5. 颜色、文字、间距、边框、焦点令牌；
6. far/near/exact 的文字 + 非颜色视觉；
7. 两枚相同 marks 的左右位置区分；
8. 320/390/768/1280/1504 响应式；
9. 200% text、400% zoom、低高度横屏；
10. reduced-motion、forced-colors、no-CSS、no-JS、Canvas failure；
11. 零闪烁与一次性过渡；
12. 与月相拨盘/粒子显字作品的视觉差异；
13. 零外部素材与零复制边界；
14. 浏览器对照清单。

design 提交后必须等待用户确认。确认前不得开始批次三/四。

若用户希望参与最有意义的 5–10 行，应在逻辑脚手架完成后邀请其填写
`config.js` 的两条线索、两个 target 和两枚 marks；这决定惊喜内容。不要让用户
写 reducer、Canvas boilerplate 或测试机械代码。

## 7. 批次三：语义 HTML 与 app

### 7.1 `index.html`

- 标准语义、skip link、单一 main、noscript；
- 只含公共静态文案，不含 hint/marks/final；
- 经典脚本顺序固定；
- 不含 inline handler/style、模板、remote URL、module。

### 7.2 `app.js`

实现：

1. 安全读取全局 config 并创建 initial state；
2. phase subtree create/unmount；
3. six buttons、range、primary actions；
4. 当前 revision 绑定；
5. public view only rendering；
6. focus transition；
7. polite live region 去重；
8. Canvas init/failure；
9. resize/DPR 重绘；
10. render generation 与 rAF cancel；
11. visibility/pagehide/pageshow；
12. reduced-motion match change；
13. 私人 sentinel 生命周期。

不实现颜色/最终细节；可以使用最小未样式语义结构。

### 7.3 App Gate

除批次一命令外：

```bash
node --check experiences/surprises/kaleidoscope-names/app.js
```

临时浏览器最小验证：

- intro → tuning → aligned → complete → restart；
- 键盘和鼠标；
- aligned DOM 无私人 sentinel；
- Canvas null 仍完成；
- console 零 error；
- 不评价最终视觉。

完成后独立 commit。

## 8. 批次四：CSS 与 Canvas 视觉闭环

按已确认 design 忠实实现：

- 页面/控件/状态令牌；
- Canvas CSS 尺寸、fallback 与响应式；
- focus-visible、pressed、near、exact；
- 48px targets；
- reduced-motion/forced-colors；
- 320px/zoom/低高度；
- no infinite animation/flash；
- complete 静态标记呈现。

Canvas base motif 绘制代码属于 `app.js`。如果确认的 design 需要改变绘制数值，
应在批次三 app commit 前冻结；批次四不得以“做样式”为名越权改 JS。若浏览器
发现 JS 实际 bug，先停止 CSS 提交，另开失败夹具 + fix commit。

### 8.1 视觉 Gate

Chrome MCP / 真实浏览器检查：

- 四 phase 对照 design；
- 320×568、390×844、768×1024、1280×720、1504×1000；
- 200% text、400% zoom；
- reduced-motion、forced-colors；
- Canvas failure、CSS failure、no-JS；
- marks 相同、2 code point、最长文案；
- 焦点不被图案遮挡；
- 无横向溢出；
- 无闪烁/持续自转；
- console/Network。

完成后独立 commit。

## 9. 批次五：项目 README

README 必须说明：

- 一句话玩法与 30 秒规则；
- 真实双击 `index.html`；
- 键盘、鼠标、触屏；
- config 字段与 `phaseStep` 钟面换算示例；
- marks 1–2 Unicode code point 限制；
- 明文配置不是加密；
- 零网络/存储/权限；
- Canvas failure/reduced-motion；
- 定向测试命令；
- 借鉴/零复制摘要并链接 ATTRIBUTION；
- 不承诺 arbitrary grapheme 或私密加密。

文档不得写“已通过”尚未执行的浏览器/file Gate。完成后独立 commit。

## 10. 批次六：总控共享集成

总控先：

1. 核对 branch/worktree/baseline/commits；
2. 审查每个 diff 与授权范围；
3. 在执行 worktree 重跑定向/full/verify；
4. 确认 design 用户 Gate 有明确证据；
5. 集成项目 commits 到本地 main；
6. 再修改共享文件。

Catalog 建议字段：

```json
{
  "id": "kaleidoscope-names",
  "title": "把名字折成同一束光",
  "category": "surprise",
  "level": "A",
  "players": "1 人准备，1 人体验",
  "devices": "单设备",
  "entry": "experiences/surprises/kaleidoscope-names/index.html",
  "readme": "experiences/surprises/kaleidoscope-names/README.md",
  "description": "根据两条线索校准镜面阶数与相位，对齐后主动照见两枚名字标记与留言。",
  "installed": true,
  "networkRequired": false
}
```

以届时真实 schema 为准，不在执行分支直接写。共享集成独立 commit。

## 11. 批次七：最终验收

### 11.1 逻辑与仓库

```bash
node --check experiences/surprises/kaleidoscope-names/config.js
node --check experiences/surprises/kaleidoscope-names/logic.js
node --check experiences/surprises/kaleidoscope-names/app.js
node --test experiences/surprises/kaleidoscope-names/logic.test.js
npm test
npm run verify
git diff --check
```

### 11.2 A 级三层启动证据

1. **静态闭包**：经典脚本、相对引用、零网络/存储/权限/外部资源；
2. **Finder 真实双击**：`file://` 完整一轮、REVEAL、restart；
3. **门户/localhost**：从统一目录进入，完成自动化响应式与控制台验收。

三层分开记录。当前 Chrome MCP 若策略拒绝 `file://`，不得绕过或把 localhost
写成双击成功；由可观察真实 Finder/系统浏览器的路径补足。

### 11.3 完整玩法矩阵

- phase-first / folds-first 两种顺序；
- 144 组合唯一成功；
- far/near/exact；
- aligned 锁定；
- aligned 私密 sentinel；
- reveal/restart；
- stale revision；
- 鼠标/触屏/键盘；
- Canvas null；
- reduced-motion/forced-colors/no-JS；
- 视口/zoom/text；
- Network/console；
- 目录独立复制；
- 默认与自定义 config；
- attribution/README/catalog/门户一致。

### 11.4 Verification 文档

总控分配新编号并记录：

- commits/SHA；
- 项目测试、全仓测试、verify；
- A 级三层证据；
- 浏览器步骤与截图；
- a11y/响应式/隐私/控制台；
- 来源与许可证；
- 实际 bug/learn；
- catalog 精确计数变化；
- 已知工具限制和保留人工 Gate。

verification 独立 commit。所有 Gate 通过后才计 installed。

## 12. Bug 与 learn

只记录真实发生的问题。

Bug 文件建议：

```text
bugs/kaleidoscope-names-<root-cause>.md
```

包含复现、影响、根因、修复、失败夹具与回归命令；bug fix 与记录同一独立 commit。

可复用 learn 候选只有在被实践证明后再写：

- 用 LCM 整数圈把多种对称阶数从 Canvas 浮点判定中分离；
- phase public DTO 如何避免“隐藏 DOM 仍泄密”；
- 原生 range + code-native 圆环视觉的等价输入模式；
- Canvas failure 不影响规则的测试方法。

不要把计划中的假设冒充 learn。

## 13. 完成定义

只有以下全部成立才算 `kaleidoscope-names` 完成：

- research/brainstorm/spec/plan 与用户确认的 design 可追踪；
- 逻辑、配置、测试、交互、视觉、README、ATTRIBUTION 已独立提交；
- 唯一 exact、隐私、restart、revision 与 hostile input 测试通过；
- Finder `file://`、统一门户与目录独立复制通过；
- 桌面/移动/zoom/键盘/触屏/reduced-motion/forced-colors/Canvas failure 通过；
- 零公网请求、零未解释 console error；
- catalog、门户、分类/根/docs/backlog/合同计数一致；
- 实际 bug/learn 已记录；
- main 上 `npm test` 与 `npm run verify` 全绿；
- verification 独立提交；
- 本地 main 无未解释改动。

当前前置阶段完成后仍不是 installed，也不应修改 catalog 或 58 项计数。
