# A 级“雪停以后，是你”分步实施计划

- 日期：2026-07-23
- 状态：执行中；纯逻辑已于 `0984da4` 提交，生产 UI 等待按视觉简报生成的完整概念获得用户明确确认
- 对应调研：[181-snow-globe-message-research.md](./181-snow-globe-message-research.md)
- 对应规格：[182-snow-globe-message-spec.md](./182-snow-globe-message-spec.md)
- 对应脑暴：[199-snow-globe-message-brainstorm.md](./199-snow-globe-message-brainstorm.md)
- 对应视觉简报：[200-snow-globe-message-imagegen-brief.md](./200-snow-globe-message-imagegen-brief.md)
- 目标目录：`experiences/surprises/snow-globe-message/`
- 启动等级：A（`file://` 直接打开、零安装、零服务、零公网、零第三方运行依赖）

## 1. 当前决策与执行边界

181、182、199 已冻结产品与规则：收礼者以任意顺序收齐上、右、下、左四阵风，之后必须主动按下“让雪落下”；一次 token 化 settling 后，雪点组成 9×11 图案，complete 才创建称呼、图案说明、标题、私信与署名。

200 已冻结十张完整状态概念的生成要求，但当前状态仍是“尚未生成概念”。因此实施分成两条有明确汇合点的路线：

1. 不依赖 DOM、Canvas、视觉资产或浏览器时钟的配置、点阵、方向 helper、reducer、public view 与纯逻辑测试已完成并提交为 `0984da4`；
2. 按 200 生成并逐张审阅 G1–G10，形成设计提案；
3. 只有用户对概念作出明确接受后，才冻结 design-system inventory，并开始生产 `index.html`、`app.js`、`styles.css` 与运行时资产；
4. UI 完成后再写 README/ATTRIBUTION、登记 catalog、记录 bugs/learn，并完成 Chrome 与真实 `file://` 验收。

视觉确认前不得创建生产 `index.html`、`app.js`、`styles.css`、favicon 或运行时图片。纯逻辑目录可以先建立，但不得借临时 UI、隐藏 DOM 或截图占位绕过视觉 Gate。

## 2. 独立提交边界

用户要求“每完成一个项目或者一部分，就提交一次”。本作按以下边界独立提交：

1. 181 调研、182 规格、199 脑暴、200 视觉简报：已分别独立提交；
2. 本实施计划：独立提交；
3. `config.js + logic.js + logic.test.js`：纯逻辑 Gate 全绿后独立提交；
4. G1–G10 概念原图、生成台账与初版设计提案：逐图审阅后独立提交；
5. 用户接受后的设计状态、token、组件、响应式规则与 fidelity ledger：独立提交；
6. semantic DOM、准备流程、四方向按钮、Pointer、token 完成器、Canvas/CSS 点阵、焦点与 live：独立提交；
7. styles、响应式、reduced-motion、forced-colors、无 Canvas 与无 JavaScript 降级：独立提交；
8. README 与 ATTRIBUTION：固定来源逐项核对后独立提交；
9. favicon、`experience.json`、catalog、门户、分类索引、docs 索引和创意池：按共享文件职责串行提交；
10. 独立 bug 的失败回归/修复/`bugs` 记录，以及有证据的 `learn` 主题：各自独立提交；
11. 最终浏览器验收与验证报告：独立提交。

每次提交前固定运行：

```bash
git branch --show-current && git rev-parse --show-toplevel
```

本计划编写时实测分支为 `main`、根目录为 `/Users/zenith/Desktop/two-of-us`。每次提交都必须重新确认当时分支与 worktree；不能把本次实测当作永久条件。子任务不 stage、不 commit，由主线程审阅、验证、暂存并提交。

## 3. 子任务、文件所有权与前置关系

| 子任务 | 唯一可写路径 | 前置条件 | 禁止越界 |
| --- | --- | --- | --- |
| A：配置、规则与 oracle | `experiences/surprises/snow-globe-message/config.js`、`logic.js`、`logic.test.js` | 209 已提交 | 不写 DOM、Canvas、CSS、文档、catalog |
| B：视觉概念与设计提案 | `docs/assets/snow-globe-message/**`、主线程锁定的下一可用 `docs/<NNN>-snow-globe-message-design-proposal.md` | 200 已冻结；统一图像偏好可用 | 不写生产体验目录 |
| C：DOM、输入与表现控制器 | `experiences/surprises/snow-globe-message/index.html`、`app.js` | A 已提交；用户明确接受 B | 不写 styles、README、catalog |
| D：样式与运行时资产 | `experiences/surprises/snow-globe-message/styles.css`、`assets/` 中除 ATTRIBUTION 外的原创资产 | C 已提交；设计 inventory 已冻结 | 不改 reducer、app 规则、共享 catalog |
| E：体验文档与归因 | `experiences/surprises/snow-globe-message/README.md`、`assets/ATTRIBUTION.md` | C/D 已提交 | 不改玩法与共享索引 |
| F：目录登记与最终报告 | `experience.json`、`experiences/catalog.json`、根门户、`experiences/surprises/README.md`、根 README、docs 索引、创意池、共享 catalog 测试、最终 verification 文档 | A–E 全部完成 | 仅主线程串行写共享文件 |
| G：bugs/learn | 新建或补充唯一根因对应的 `bugs/*.md`、有证据的 `learn/*.md` | 出现真实问题或跨项目证据 | 不为凑数量写空洞记录 |

同一时刻不得并发修改重叠文件。设计提案在“概念生成”和“用户接受后冻结”两个阶段串行更新；`app.js` 的 DOM/Pointer/Canvas/token/focus 必须由一个所有者完成或按已提交边界串行接力；共享 catalog 与索引永远最后由主线程修改。

## 4. 子任务 A：config、logic 与独立 oracle

唯一可写文件是体验目录内的 `config.js`、`logic.js`、`logic.test.js`。

### 4.1 config.js

- 以 classic script 暴露 `window.SNOW_GLOBE_MESSAGE_CONFIG`，默认六字段与 182 完全一致；
- `patternRows` 保留为可直接编辑的 9 行，并附 5–10 行 TODO：每行 11 个 `.`/`#`、总 active 16–72，可画首字母/月亮/星星/两人符号，非法时整份回默认；
- 不引入远程资源、模块、fetch、storage、时间、随机、权限或第三方依赖。

### 4.2 logic.js

- 浏览器 global/CommonJS 双出口，导入时零 DOM/Canvas/时间/随机/timer/storage/network/permission 副作用；
- 捕获必要 intrinsic，以 own-data descriptor snapshot、exact keys、dense native Array 与 fail-closed Proxy 处理 hostile 输入；
- 严格实现 raw UTF-16 控制字符/lone surrogate 检查、trim、Unicode code point/finalNote 行数顺序；任一字段非法时整份默认，返回冻结且断引用的 content；
- `buildTargets` 固定 9×11、16–72 active、row-major、`p00..p71`、整数逻辑坐标与递归冻结；
- `classifyWindSample` 固定 inner=100、outer=260、正方形范数、垂直平局、latch/hysteresis 与非法输入 null；
- 实现 canonical intro 初态、START、ADD_WIND、BEGIN_SETTLE、COMPLETE_SETTLE、RESTART、revision headroom 与 token 单调性；
- 合法 state 上非法 action 返回原引用；非法 state 返回全新安全初态；
- `getPublicView` 是页面唯一规则来源：固定方向顺序、progressText、can flags、missingLabels、targets；intro/gathering/armed 无 target，settling 仅 targets，五个私密字段只在 complete 公开；
- 不保存 Pointer、坐标轨迹、粒子位置、动画、时间戳、timer 或 Canvas。

### 4.3 logic.test.js 与 oracle

测试必须包含一个独立参考 oracle，但不能复制整份生产 reducer，也不能调用生产 reducer 自证：

- oracle 仅以四方向集合、阶段合同、revision 公式与 token 公式生成预期转移；
- 穷举四方向 24 种排列，证明每个方向只计一次、第四个方向唯一进入 armed；
- 穷举 16 个 winds 子集，独立生成 count、missing 顺序与精确 progressText，再与生产 public view 比较；
- 对 BEGIN/COMPLETE/RESTART 用独立 token/revision 表计算预期，覆盖旧 token、重复完成与 headroom；
- hash 测试调用生产 `sanitizeConfig/buildTargets` 生成 canonical JSON，只固定规格中的 SHA-256，不维护第二份完整 target 列表；
- 覆盖默认 63 active、p00/p62、pattern/target hash、16/72 边界、行列 ±1、非法字符；
- 覆盖 config/state/action/content/winds 的 getter、symbol、extra key、custom prototype、稀疏数组、Array subclass、custom iterator、Proxy descriptor 与 get late-throw；
- 覆盖 lone surrogate、C0/C1、CR、U+2028/U+2029、trim、code point 与 finalNote 最多四行；
- 覆盖 JSON clone 合法 state、action log 重放、冻结、断引用、非法 state 安全回退；
- 静态扫描生产 logic 不含 DOM、Canvas、Date、random、timer、network、storage、permission 或 HTML sink。

### 4.4 纯逻辑完成 Gate

```bash
node --check experiences/surprises/snow-globe-message/config.js
node --check experiences/surprises/snow-globe-message/logic.js
node --test experiences/surprises/snow-globe-message/logic.test.js
npm test
npm run verify
git diff --check
```

还必须人工核对：测试 oracle 没有调用生产 reducer、五个私密字段在 complete 前全为 null、旧 settleToken 在 RESTART 后不能命中新局。通过后独立提交纯逻辑；UI 是否就绪不影响此提交。

## 5. 子任务 B：G1–G10 视觉概念与确认 Gate

严格按 200 生成十张独立完整页面概念：desktop gathering/armed/settling/complete、390px gathering/complete、844×390 complete、320px 准备失败、reduced/forced/无 Canvas 对照、320px 无 JavaScript。

生成台账至少记录每张图的完整 prompt、工具/模型暴露状态、日期、原生尺寸、格式、SHA-256、处理链、用途、docs-only/运行时候选状态，以及逐张 `view_image(detail="original")` 的审阅与重做记录。第三方输入固定为“无”，不得使用人物、品牌雪球、截图、UI 模板、字体或外部素材。

初版设计提案必须提取：完整颜色 token、字体回退、字号/行高、spacing、玻璃与底座比例、方向/主按钮组件、箭头与勾选 SVG 规格、focus/pressed/disabled、信笺结构、六档视口重排、资产清单和至少十项 fidelity ledger。

生产 UI Gate：

1. G1–G10 全部通过 200 的接受检查；
2. 用户明确说接受某一套概念或明确指定修改后的版本；
3. 设计提案状态更新为“已接受/已冻结”；
4. 只有此后 C/D 才可创建生产页面与样式。

未收到明确接受时，可以继续规则层、测试、概念重做与台账，不得自行把“无反对”解释为确认。

## 6. 子任务 C：DOM、Pointer、Canvas、token 与焦点

唯一可写文件是体验目录内的 `index.html` 与 `app.js`。

### 6.1 semantic DOM 与准备流程

- classic script 顺序固定为 `config.js → logic.js → app.js`；
- main 直接子级顺序固定为页头、说明、雪球舞台、方向按钮、进度、结果、主动作、隐私说明、唯一 live；无 JavaScript 只显示五项安全静态内容；
- 首次 paint、失败重试、complete 后重播共用单一 `attemptPrepare()` 与 reentrancy guard；
- 页面只消费 public view，不读取 content/config 拼业务状态，不自行计算方向、targets、progress 或私密字段；
- persistent 主按钮复用四种文案；complete 才创建精确五节点结果子树，离开 complete 整棵移除；
- 动态内容只用 `textContent`，不使用 innerHTML、template、hidden 私密节点或字符串事件处理器。

### 6.2 Pointer 与四按钮 Gate

- 四个 persistent 原生方向按钮只在 click 派 ADD_WIND，保留上、右、下、左 DOM 顺序；
- 每个按钮至少 48×48px，`aria-pressed` 与可见“✓ / 已收好”同步；
- gathering-only Pointer：有限坐标、冻结 shortSide、成功 capture 后才建立会话；
- dx/dy 只作归一化并交给生产 helper；app 不复制阈值、方向分类或集合规则；
- 同一时刻只接收一个 pointer；第二指、重复方向、旧 generation、pointercancel、lost capture、blur、hidden、pagehide 均安全 no-op/清理；
- capture 失败不留下半会话、不派方向；离开 gathering 安全 release；
- `touch-action:none` 只在可收风的雪球交互面生效，其他阶段恢复页面滚动；
- 第四个按钮使方向组即将 disabled 时，若焦点在组内则转到主按钮；drag 完成不抢焦点。

### 6.3 Canvas 与 token 完成器 Gate

- Canvas 固定绘制 72 枚装饰雪点，开局数量不泄露配置 active 数；
- Canvas `aria-hidden=true`，不调用 `fillText`，不从像素、位置、elapsed 或动画状态裁决业务；
- BEGIN 后只从 view 读取当前 settleToken 与 visibleTargets；
- rAF、1400ms timeout、hidden、pagehide、blur、reduced-motion 切换、Canvas null/throw 全部捕获启动时 token，并只调用同一个 `finishSettling(token, focusPolicy)`；
- finish 先清 RAF/timer/listener，再派唯一 COMPLETE_SETTLE；晚到、重复与旧 token 回调必须同引用 no-op；
- reduced-motion 初始开启时用 token 守卫的 microtask 完成，同一业务结果、无漂移/缩放/风暴；
- Canvas 失败用 9×11 CSS grid 显示同一静态点阵，DOM patternLabel 与私信不受影响。

### 6.4 私密、焦点与 live Gate

- 使用互不包含的五个 sentinel；complete 前 DOM 文本、ARIA、attribute、Canvas text、console 中各为 0；
- complete 后五字段各只进入规格指定的一个文本节点；
- 雪球舞台仅 complete 时取得 `role=img` 与 `aria-labelledby=pattern-label`，restart 后移除；
- 前台可见且仍聚焦的首次有效 complete 只聚焦一次 `h2#final-title`；
- hidden/pagehide/blur 收尾不聚焦，返回页面后不补移；
- BEGIN 后主按钮保持同一节点与焦点，用 `aria-disabled=true` 和 click guard 防重复；
- 唯一 live 只播首次方向、armed 和 complete，不逐帧、不重复朗读私信；
- restart 清理 Pointer、RAF、timer、listener、CSS grid、结果 DOM、舞台 role 与旧焦点 token。

### 6.5 DOM/表现完成 Gate

```bash
node --check experiences/surprises/snow-globe-message/app.js
node --test experiences/surprises/snow-globe-message/logic.test.js
npm test
npm run verify
git diff --check
```

并用 Chrome MCP 覆盖：

- 单靠四按钮的 click、Enter、Space 完整通关；
- 单靠 Pointer 依次收四方向，含 inner/outer、对角平局、重复、第二指、cancel/lost capture；
- 第四风后不自动揭晓，只有主按钮进入 settling；
- rAF/timeout/hidden/blur/reduced/Canvas error 竞态只完成一次；
- sentinel 隐私、结果五节点、前台/后台焦点、restart 与旧 token；
- Canvas null/throw 和 JavaScript 禁用。

## 7. 子任务 D：样式、响应式与降级

只依据已接受概念和已冻结 design inventory 实现，不用十张完整概念图作为运行时截图，不加载远程字体或远程资源。CSS 能表达时不增加图片；确需无字原创资产时，逐项记录 prompt、尺寸、格式、SHA-256、第三方输入“无”、使用位置与降级方式。

样式 Gate：

- `1504×1046` 与 `1280×800`：关键内容同屏，前者无横纵滚，后者无横向滚；
- `768×1024` 与 `390×844`：雪球居中、2×2 按钮；390px 雪球 280–320px、按钮 ≥48px；
- `320×568` 与 `844×390`：雪球分别 240–264px/约 210px，允许必要纵滚，零横溢且结果/主动作可达；
- 1504/1280 的 200% text 与约 320 CSS px 的 400% zoom；
- 最大合法五字段、16/72 active、safe-area、自然换行、3px focus 与按钮中心 `elementFromPoint()`；
- reduced-motion 去掉风暴、漂移、缩放和淡入，不改变状态机；
- forced-colors 使用系统色、真实 border/outline、方向文字与“✓ / 已收好”；
- Canvas、图片、字体与装饰资产失败时仍可完整完成；
- 零横向溢出、零 console error/warning、零公网/失败请求。

每次 UI/CSS 改动后用 Chrome MCP 验证受影响状态与视口。同一 QA pass 对接受概念与最新浏览器截图分别执行 `view_image(detail="original")`；fidelity ledger 至少比较文案、布局、玻璃比例、点阵、配色、字体、间距、控制状态、信笺、响应式和降级十一项。

## 8. README 与 ATTRIBUTION 固定声明

README 与 `assets/ATTRIBUTION.md` 都必须逐项写出来源、固定 commit、许可证、版权、实际借鉴、未复制范围和“零第三方运行依赖”。不能只互相链接或只写一份。

### 8.1 必须固定的四项来源

1. **tsParticles** `627b3fc7d1a0d0fe524e2fea5f89fa7589b18d59`，MIT，`Copyright (c) 2020 Matteo Bruni`：只借鉴雪花表现状态分层与统一清理；不复制源码、API、preset、配置、参数、素材或依赖。
2. **canvas-text-particle** `9ee144a548aad85275318b30891c71dcf6e10f7b`，ISC，`Copyright (c) 2026, dango0812`：只借鉴粒子 ID 到目标点抽象；不用文字 Canvas/alpha/字体轮廓，不复制源码、公式、参数、字体或演示。
3. **canvas-confetti** `20eebad51dde793070c373d594099a7ed8d96e22`，ISC，`Copyright (c) 2020, Kiril Vatev`：只借鉴 reduced-motion 同结果与动画清理；不复制物理、Worker、Promise、参数、Canvas 或素材。
4. **W3C Device Orientation and Motion** `70d42d5484db7fd1646e48cc17caa5ff1c9d92cb`，W3C Software and Document License 2023：只确认权限/隐私边界并排除设备动作，不复制规范示例或措辞。

### 8.2 排除项与标准校准

- `alexgibson/shake.js` 固定 commit `d232eee7a5f31e9fd37aa79aa83f1f206035ccc9`：包元数据声称 MIT，但许可证文本含未解释的 `except as noted below`，GitHub License API 为 `NOASSERTION`；仅作为排除项，不复制、不依赖；
- NextParticle、无许可证 CodePen/Gist、远程雪花图、字体、音效、商业贺卡与品牌雪球 trade dress 全部排除；
- README 另列 Pointer Events、WCAG 2.5.7、2.5.4、2.3.3、1.3.1、1.4.10，明确它们只是交互/无障碍校准，不是代码、素材或运行依赖；
- 生产代码、9×11 pattern、中文文案、UI 与基本图形独立实现；
- ImageGen 概念和运行时资产逐文件列生成台账；docs-only 概念不得被误写成运行依赖。

README 还必须说明：双击打开、四按钮与拖动玩法、9 行配置方法、磁盘明文与阶段延迟呈现的真实隐私边界、无存储/联网/权限、Canvas/CSS 降级、重播行为和已知浏览器限制。

## 9. catalog、门户与共享验证

体验完成后新增规格要求的 `experience.json`：A、surprise、1 人、offline、本地直开、经典相对脚本，且无 module/fetch/remote/storage/权限。入口、标题、简介、标签与分类索引一致。

主线程串行更新 `experiences/catalog.json`、根 `index.html`、`experiences/surprises/README.md`、根 README、`docs/README.md`、`docs/40-idea-backlog.md` 与 `shared/runtime/catalog.test.js`。

目录总数、测试数与入口数只写实测结果，不提前硬编码推测值。登记 Gate：

```bash
node --test shared/runtime/catalog.test.js
npm test
npm run verify
git diff --check
```

还要核对 catalog 搜索/分类/计数、根门户链接、`file://` 相对脚本与资产、README/ATTRIBUTION 来源一致、零外链运行依赖。

## 10. bugs 与 learn

### 10.1 Bug 记录

新问题写入 `bugs/YYYY-MM-DD-snow-globe-message-<slug>.md`。

必须包含环境、复现、预期、实际、根因、修复、失败回归、修复后证据和相关提交。按问题类型补充：

- Pointer：pointerId、generation、capture 状态、latched、dx/dy 与 phase；
- settling：captured/current token、完成来源、RAF/timer/listener 清理状态与 focusPolicy；
- 隐私：泄露字段、出现位置、阶段与 sentinel 计数；
- 视觉：视口、zoom、computed size、横溢节点与概念对照；
- `file://`：浏览器/OS、入口、console/network 与失败资源。

同根因已有记录时补充原文件，不创建重复记录。修复前优先增加能稳定失败的回归测试；修复与记录同一提交。

### 10.2 Learn 候选

只有获得真实实现、测试或浏览器证据后，才在 `/learn` 沉淀：

1. 四方向有限集合与 Pointer/粒子表现解耦；
2. 分阶段 public view 如何阻止私密 DOM/ARIA 提前出现；
3. 多完成源共享 settleToken 与幂等清理；
4. Pointer capture、generation 与 hysteresis 的职责分离；
5. 固定表现粒子数如何避免从开局数量泄露图案复杂度；
6. Canvas 语义与 CSS grid 降级如何共享同一规则结果；
7. 前台完成焦点与后台生命周期收尾为何必须分开。

若本作没有发现新 bug，最终报告明确“无新增 bug 记录”；若候选知识点没有达到跨项目可复用证据门槛，明确“无新增 learn 记录”，不为完成清单制造空文档。

## 11. Chrome 与真实 file:// 验收顺序

### 11.1 核心玩法

1. 统一本地服务打开，分别用按钮、Pointer、混合输入完成；
2. 四方向任意顺序只计一次，第四风后保持 armed，不自动揭晓；
3. 点击“让雪落下”进入 settling，最终完成并显示正确 9×11 点阵与五节点结果；
4. “再看一次”回 exact intro→gathering 新局，revision/token 单调，旧回调无效；
5. 使用非法配置验证整份默认；注入 helper null/throw 验证固定失败提示与同按钮重试。

### 11.2 输入、生命周期、隐私与焦点

- Pointer inner/outer 边界、垂直平局、重复方向、第二指、capture throw、cancel/lost capture、blur/hidden/pagehide；
- 四按钮 click/tap/Enter/Space 与 ≥48px 命中；
- rAF、timeout、hidden、pagehide、blur、初始/途中 reduced、Canvas null/throw 任意竞态只 complete 一次；
- 五 sentinel 在 complete 前 DOM/ARIA/attribute/Canvas text/console 为 0，complete 后各只在指定节点出现一次；
- 前台 complete 聚焦标题一次，后台收尾不聚焦且返回后不补；
- 单一 live、pressed/disabled 可见文字、restart 清理完整；
- 无 storage、history、clipboard、权限、传感器、网络或失败请求。

### 11.3 响应式、降级与保真

- 六档视口、200% text、400% zoom、safe-area、最大合法文案、16/72 active；
- reduced-motion、forced-colors、Canvas null/throw、图片/字体阻断与 JavaScript 禁用；
- 零横向溢出、焦点环不裁切、按钮中心命中、console 零 error/warning；
- Chrome MCP 完整游玩并截图，与已接受概念原图在同一轮用 `view_image(detail="original")` 更新 fidelity ledger。

### 11.4 file://

最终必须真实双击或以真实 `file://` URL 打开，不以 localhost 代替 A 级证据：

- classic 相对脚本与资产全部加载；
- 按钮和 Pointer 至少各完成一次；
- settling、CSS grid fallback、restart 与私密 Gate 正常；
- DevTools/可用证据确认零公网请求、零失败请求、零 storage、零权限、零 console error/warning。

若 Chrome MCP/IAB 因工具策略不能导航 `file://`，要在验证报告中明确工具限制，并补充人工真实双击记录、静态启动合同和 localhost 全流程证据；不能把工具限制写成体验已通过的替代证明。条件允许时再记录 Safari/Firefox desktop 的真实 `file://` 结果。

## 12. 最终完成条件

- 181、182、199、200 与用户接受后的设计提案全部落实；
- config/logic/oracle、DOM/Pointer/Canvas/token/focus、styles/degradation、README/ATTRIBUTION、catalog、bugs/learn、verification 均按边界独立提交；
- 默认 pattern/target hash、63 active、p00/p62、24 排列、16 winds 子集、hostile input、revision headroom、旧 token 与 JSON 重放全绿；
- 按钮、Pointer、混合输入、准备失败、settling 多完成源、Canvas fallback、无 JavaScript、隐私 sentinel、live 与焦点合同通过；
- 六档视口、200/400%、reduced、forced、最大文案、16/72 active、零横溢通过；
- README 与 ATTRIBUTION 的四项固定来源、shake.js 排除项、标准校准、零复制与零运行依赖逐项一致；
- catalog、门户、分类、创意池、共享测试与实测计数一致；
- Chrome localhost 与真实 `file://` 有可审计证据；其他浏览器若未实测，作为明确限制而非通过项；
- 最终验证报告包含 commits、测试数、入口数、浏览器路径、截图、fidelity ledger、asset hash、bugs/learn 与已知限制；
- 每次提交前分支/worktree 复核完成，最终 worktree clean。

本作品完成不等于长期目标完成；完成后继续下一候选，不调用 goal complete。
