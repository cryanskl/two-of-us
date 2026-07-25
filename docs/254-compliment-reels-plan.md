# “每一格，都是喜欢你的理由”分步实施计划

- 日期：2026-07-25
- 稳定工作 ID：`compliment-reels`
- 调研：[`178-compliment-reels-research.md`](./178-compliment-reels-research.md)
- 文案审计：[`179-compliment-reels-copy-audit.md`](./179-compliment-reels-copy-audit.md)
- 规格：[`180-compliment-reels-spec.md`](./180-compliment-reels-spec.md)
- 视觉简报：[`197-compliment-reels-imagegen-brief.md`](./197-compliment-reels-imagegen-brief.md)
- 待确认视觉提案：[`198-compliment-reels-design-proposal.md`](./198-compliment-reels-design-proposal.md)
- 来源复核：[`230-compliment-reels-source-refresh.md`](./230-compliment-reels-source-refresh.md)
- 目标目录：`experiences/surprises/compliment-reels/`
- 启动等级：A（最终目标为真实 `file://` 直开）

## 1. 任务分类与冻结边界

这是非平凡功能：需要实现六格协调计划、随机降级、一次性 composer、exact schema、
hostile input、防旧回调状态机、public view、A 级页面与完整来源声明。已有
brainstorm、调研、文案审计和规格，本计划只拆执行顺序，不改变产品合同。

以下规则冻结：

1. 三列各六项，ID、signature、标点模板和默认 inventory 哈希以 179/180 为准；
2. 先选第 3–6 次特别同频位置，再按 `moment → shine → echo` 独立洗牌；
3. `buildSpinPlan` 只消费 64 项 uint32 entropy，并执行拒绝采样；
4. `createArmAction` 只调用 composer 一次，把安全结语写入纯数据 action；
5. reducer 只接受 exact action，revision/token 单调，`SUSPEND` 与正确
   `SETTLE` 产生相同下一状态；
6. public view 只公开已落定前缀，不泄漏 entropy、future stop、signature ID、
   jackpot 位置或未到终局的私人结语；
7. 最终作品为 A 级经典脚本、零网络、零第三方运行依赖、零额外持久化。

## 2. 视觉确认 Gate

逻辑批次可以先行，生产 UI 不可以先行。198 当前明确要求用户确认：

1. 深梅红桌面夸夸印刷机的整体方向；
2. 320px 的三条连接标签；
3. 终局独立标题 `特别同频`。

三项未明确接受前，不创建 `index.html`、`app.js`、`styles.css`、生产视觉资产或
宣称作品已安装/可玩。八张概念图只作设计证据，生产页面不得加载、裁切或 OCR。

## 3. 提交与文件所有权

用户要求每完成一个项目或一部分就提交一次。本作按以下边界提交：

1. 本实施计划；
2. 非视觉核心：`package.json`、`config.js`、`logic.js`、`logic.test.js` 与
   `ATTRIBUTION.md`；
3. 用户确认后的语义页面与应用生命周期；
4. 已接受视觉、响应式和无障碍样式；
5. README、catalog、门户、分类索引、创意池和共享合同；
6. 每个真实 bug 的最小修复、回归测试与唯一 `bugs/` 记录；
7. 每个有跨项目价值的结论及唯一 `learn/` 记录；
8. 最终浏览器验收与 verification。

每次 commit 前必须执行：

```bash
git branch --show-current && git rev-parse --show-toplevel
```

并确认当前分支、worktree 和文件所有权与任务一致。pre-commit hook 失败时修复后
重新暂存并创建新 commit，绝不使用 `--amend`。

建议提交主题：

```text
docs: plan compliment reels implementation
feat: add compliment reels core logic
feat: add compliment reels interaction
feat: style compliment reels
feat: catalog compliment reels
fix: <compliment-reels bug>
docs: capture <reusable learning>
docs: verify compliment reels
```

## 4. 批次一：非视觉核心

### 4.1 唯一写入

```text
experiences/surprises/compliment-reels/package.json
experiences/surprises/compliment-reels/config.js
experiences/surprises/compliment-reels/logic.js
experiences/surprises/compliment-reels/logic.test.js
experiences/surprises/compliment-reels/ATTRIBUTION.md
```

本批不得创建 HTML、app、CSS、README 或运行时资产，也不得修改 catalog、门户、
分类索引、共享 runtime/scripts、docs 索引、backlog、Board、bugs/learn 索引。

### 4.2 实现顺序

1. 建立目录级 CommonJS 边界，以及浏览器 global/CommonJS 双出口；
2. 冻结常量、默认 inventory、fallback entropy 和默认配置；
3. 实现 descriptor snapshot、递归冻结、Unicode 字素与整份配置回退；
4. 实现拒绝采样、固定消费顺序、Fisher–Yates 和 plan validator；
5. 实现 mutation-guard summary、一次性 composer 与纯数据 ARM action；
6. 实现初态、state validator、reducer、revision headroom 和 token；
7. 实现只公开 settled prefix 的 public view；
8. 用 production export 构造 canonical inventory，核对固定 SHA-256；
9. 覆盖 216 句、四个 jackpot fixture、fallback、拒绝耗尽与 hostile matrix；
10. 覆盖 action log JSON clone 重放、终局、restart、旧 token 与 MAX 边界。

### 4.3 测试 Gate

```bash
node --check experiences/surprises/compliment-reels/config.js
node --check experiences/surprises/compliment-reels/logic.js
node --test experiences/surprises/compliment-reels/logic.test.js
npm test
npm run verify
git diff --check
```

完成条件：

- 定向测试证明 canonical hash、固定 fallback plan、四个特别同频位置和拒绝采样；
- config/action/state/public view 的 exact schema 与 hostile Proxy 均有命名用例；
- composer 只调用一次，JSON action log 重放不再次调用函数；
- production logic 不读取 DOM、crypto、random、Date、timer、network 或 storage；
- ATTRIBUTION 写明四个固定来源、许可证、版权主体、实际借鉴与未复制范围；
- diff 只含本批五个项目文件，项目仍明确标为非 UI、未 installed。

## 5. 批次二：语义页面与应用生命周期

**前置条件：用户明确通过第 2 节三项视觉确认，且批次一已独立提交。**

唯一写入：

```text
experiences/surprises/compliment-reels/index.html
experiences/surprises/compliment-reels/app.js
```

职责：

- 按 `config.js → logic.js → app.js` 加载经典相对脚本；
- 只消费 public view，不在 app 拼句、判断终局或读取 future plan；
- 用持久原生按钮统一鼠标、触屏、Enter、Space；
- 实现 350ms pointer activation gate、held key 去重和 token 化完成器；
- reduced motion、hidden、pagehide、blur 都 settle 同一个已锁定 stop；
- crypto 失败走冻结 fallback；双路径失败保留 intro 和可见重试；
- DOM、ARIA、console、storage 与 network 不提前泄漏 future 内容。

本批完成后运行定向测试、`npm test`、`npm run verify`，并使用 Chrome 完成核心输入、
生命周期、隐私和 `file://`/localhost 证据。若浏览器工具拒绝 `file://`，如实记录，
不能把 localhost 冒充双击证据。

## 6. 批次三：已确认视觉与响应式

**前置条件：批次二通过，且只实现用户已接受的 198 提案。**

唯一写入：

```text
experiences/surprises/compliment-reels/styles.css
```

职责：

- code-native 实现浅粉陶土纸面、深梅红机身、奶油纸卷、珊瑚把手和黄铜压边；
- 不加载八张概念 PNG、远程字体、图标库或第三方素材；
- ready 不泄漏文本，spinning 只移动无语义纸纹，jackpot 不用赌场庆祝；
- 通过 forced-colors、reduced-motion、focus、48px 命中区与图片阻断；
- 通过 1504、1280、768、390、320 五档以及 200%/400% zoom 的零横溢 Gate。

视觉复核至少包含 ready、spinning、result、jackpot、320 result 和 320 failure，
逐项更新 fidelity ledger；结构或规则缺陷另开独立修复提交。

## 7. 批次四：文档、集成与最终验收

由总控独占更新 README、catalog、门户、分类索引、backlog、共享测试、bugs/learn
索引与 verification。只有以下 Gate 同时通过才可标记 installed：

- 核心流程从 ready 完成到唯一特别同频并可重新开始；
- 真实 `file://` A 级合同、断网、零公网请求和零依赖；
- 鼠标、触屏、键盘、焦点、live region、降动效和五档响应式；
- README/ATTRIBUTION 与 178/180/230 的固定来源事实一致；
- 项目测试、全仓测试、`npm run verify`、门户启动与浏览器验收全绿；
- 每个阶段均有独立可追踪 commit。

## 8. 借鉴声明边界

本作独立实现文字夸奖生成器。开发前只研究：

- Slot Machine Generator 的独立转轮与结果预选；
- seedrandom 的局部、可重现随机源边界；
- Tween.js 的动画与规则分层；
- canvas-confetti 的动画清理与 reduced-motion 原则。

不复制、翻译、改写、链接或打包上述项目的源码、API、随机算法、缓动公式、
默认参数、测试、界面、文案、Logo、截图、字体、图案、音频或其他素材。四项均
不是运行依赖；固定 commit、许可证载体、版权主体和排除来源必须在项目
`ATTRIBUTION.md` 完整展开。
