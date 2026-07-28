# “把愿望，放到夜空里”分批实施计划

- 日期：2026-07-24
- 状态：待执行；生产 UI 等待用户确认
- 对应调研：[`183-wish-fireworks-research.md`](./183-wish-fireworks-research.md)
- 对应规格：[`184-wish-fireworks-spec.md`](./184-wish-fireworks-spec.md)
- 对应 Brainstorm：[`201-wish-fireworks-brainstorm.md`](./201-wish-fireworks-brainstorm.md)
- 对应视觉简报：[`202-wish-fireworks-imagegen-brief.md`](./202-wish-fireworks-imagegen-brief.md)
- 对应来源复核：[`227-wish-fireworks-source-refresh.md`](./227-wish-fireworks-source-refresh.md)
- 待确认视觉提案：[`229-wish-fireworks-design-proposal.md`](./229-wish-fireworks-design-proposal.md)
- 目标目录：`experiences/surprises/wish-fireworks/`
- 目标：A 级 `file://` 单人惊喜；三束必成字；零网络、零额外持久化、零第三方运行依赖

## 1. 执行总则

### 1.1 冻结规格优先级

本计划只拆分执行顺序，不改写 183、184、201、202、227、229 已冻结的产品、数据、
输入、隐私、视觉与来源合同。遇到歧义时，以 184 的 exact schema、固定常量、
canonical hash、revision headroom、public view、Pointer/click 分流、token 完成器、
焦点恢复、降级和验收矩阵为准；不得在 app 或测试里另造一套较宽松规则。

尤其不得弱化以下三类硬 Gate：

1. **exact schema**：config、glyph、rows、state、currentShot、action、public view 都按
   当前 realm、精确 own-data keys、descriptor、prototype、dense array、primitive
   类型与断引用规则处理；hostile getter、Proxy、symbol、extra key、custom
   prototype、sparse array、boxed primitive 或 coercion 均不得悄悄接受；
2. **revision headroom**：`START`、三组 `LAUNCH → COMPLETE_BURST`、`RESTART` 与
   `Number.MAX_SAFE_INTEGER` 的余量完全按 184 第 10 节执行。ready/bursting 的最大
   revision 依次是 `M−6 / M−5 / M−4 / M−3 / M−2 / M−1`，complete 可到 `M`；
   不得以 clamp、回绕、重置 token 或放宽 safe integer 代替；
3. **阶段隐私**：intro/ready 不公开任何 glyph 或 final sentinel；bursting 只公开
   当前束的 target，不公开当前 label；落定后只公开严格前缀；complete 才创建全部
   final 字段。future 内容不得进入 hidden/template、DOM/ARIA/attribute、CSS
   `content`、SVG/Canvas text、离屏缓存、console、URL/history、storage、clipboard
   或 network。

配置文件和 reducer state 是本地磁盘/内存明文，不宣称加密；页面承诺仅为分阶段
呈现、零上传和零额外持久化。

### 1.2 视觉确认 Gate

逻辑批次可以先行；生产 UI 不可以先行。只有用户对 229 明确回复：

> 确认心愿烟火，按这套做

或给出等价的明确接受，才允许开始批次二和批次三。确认前不得创建生产
`index.html`、`app.js`、`styles.css` 或运行时视觉资产，也不得把 15 张概念 PNG
裁切、复制或加载到作品中。

若用户要求调整视觉，先只修改视觉提案/台账并重新确认；不得一边等待确认一边写
生产 UI。确认后也只实现已接受的“深靛午夜屋顶 + 暖金点阵 + 深梅红发射台 +
暖纸短笺”code-native 方向，不自行增加图片、音频、图标库、模式开关、分享、
保存、计分、自动连发或其他功能。

### 1.3 独立提交纪律

用户要求“每完成一个项目或者一部分，就提交一次”。本作按以下边界独立提交：

1. 本实施计划；
2. 批次一：`config.js + logic.js + logic.test.js`；
3. 批次二：用户确认视觉后的 `index.html + app.js`；
4. 批次三：`styles.css` 与视觉/响应式闭环；
5. 批次四：作品 README、完整借鉴声明、catalog、门户、分类索引与创意池；
6. 每个真实 bug：最小修复、回归测试和对应 `bugs/` 记录放在同一个独立 fix
   提交，不混入功能批；
7. 每个有跨项目证据的 learn：独立文档、独立提交，不混入 fix 或功能批；
8. 最终 verification：独立提交。

每次写操作和 commit 前都执行：

```bash
git branch --show-current && git rev-parse --show-toplevel
git status --short
```

必须确认分支与 `{repo-root}` worktree 属于当前任务，保留用户和
其他会话的改动。子任务只修改获分配文件，不 stage、不 commit；主线程审阅 diff、
跑完该批 Gate 后再提交。pre-commit hook 失败时修复、重新 add、创建新 commit，
绝不使用 `--amend` 补救。

建议提交主题：

```text
docs: plan wish fireworks implementation
feat: add wish fireworks logic
feat: add wish fireworks interaction
feat: style wish fireworks
feat: catalog wish fireworks
fix: <wish-fireworks bug>
docs: capture <reusable learning>
docs: verify wish fireworks
```

## 2. 批次一：配置、纯逻辑与 oracle 测试

### 唯一可写文件

```text
experiences/surprises/wish-fireworks/config.js
experiences/surprises/wish-fireworks/logic.js
experiences/surprises/wish-fireworks/logic.test.js
```

本批不得创建或修改 HTML、CSS、app、README、ATTRIBUTION、catalog、根门户、
docs、bugs、learn、package 文件或任何资产。

### 实现职责

1. 用经典脚本浏览器 global 与 CommonJS 测试出口共享同一冻结 API；不使用 ES
   Module、打包器或运行时依赖；
2. `config.js` 只承载 184 冻结的 canonical 默认配置：三份 9×9 dense rows、
   `30 / 29 / 31` active count、默认“我 / 爱 / 你”和五个最终字段；
3. 初始化时捕获规格要求的 reflection intrinsics；hostile snapshot 对每项反射
   只做一次，按固定顺序读取 descriptor value，不触发 getter、iterator、
   `toJSON` 或数组方法；
4. 实现整份 config 原子回退、`createStartAction`、递归冻结、断引用、Unicode、
   control、lone surrogate、trim、长度、行列、active count 与 exact schema；
5. 实现 `quantizeHold`、`buildTargets`、`presentationTick`、
   `getPresentationFrame` 及固定整数舍入；常量、五档边界、坐标、tick 和 alpha
   严格等于 184，不以浮点积分、随机粒子或浏览器时间替代；
6. 实现 canonical state、四类 exact action、reducer、invalid-state 安全初态、
   invalid-action 原引用、revision headroom 与 burst token；
7. `getPublicView` 只输出 184 第 11 节精确 keys、精确 `progressText` 和严格前缀；
   页面所需业务派生只来自 public view，不为 app 暴露 raw rows/content；
8. 测试默认 config/glyph/target hash、五档、整数帧 golden、hostile schema、
   action/state headroom、旧 token/重复 COMPLETE、JSON action log 等价、所有力度
   序列最终字节等价，以及 184 第 15 节 privacy sentinel；
9. 测试不得复制一份生产算法充当 oracle；固定 fixture/hash 与生产 helper 的职责
   分离；
10. 不读取 DOM、Date、random、storage、network、clipboard、history、权限或
    package 依赖，不产生副作用。

### 命令 Gate

```bash
node --check experiences/surprises/wish-fireworks/config.js
node --check experiences/surprises/wish-fireworks/logic.js
node --test experiences/surprises/wish-fireworks/logic.test.js
npm test
npm run verify
git diff --check
```

### 完成证据

- 定向测试列出通过数量，hash、headroom、hostile Proxy 与隐私 sentinel 均有命名
  用例；
- `npm test`、`npm run verify` 和 `git diff --check` 全绿；
- diff 只有本批三个文件；
- 无 `package.json`、`package-lock.json`、vendor、远程资源或生产 UI 变化；
- 主线程审阅 API 与 184 一致后独立提交。

## 3. 批次二：语义页面、输入协议、token 生命周期与功能降级

**前置条件：用户已通过第 1.2 节视觉确认 Gate，且批次一已独立提交。**

### 唯一可写文件

```text
experiences/surprises/wish-fireworks/index.html
experiences/surprises/wish-fireworks/app.js
```

本批不得修改 config/logic/test、styles、README、ATTRIBUTION、catalog、门户、
docs、bugs、learn、package 文件或资产。若发现逻辑 API 不足，停止本批并回到一个
独立的逻辑修订/bug 批次，不把 reducer 复制进 app。

### 实现职责

1. `index.html` 使用 `config.js → logic.js → app.js` 经典相对脚本，默认无 JS 只
   显示冻结五项；app 初始化成功后才启用交互区；
2. `main` 直接子级、persistent 主动作、persistent `ol#revealed-glyphs`、
   persistent 发射控制和 complete-only 五节点结果严格按 184 第 11.1 节；
3. 唯一 `attemptStart({focusOnSuccess})` 负责开始、整份配置回退、helper
   null/throw、固定安全提示、重试 guard 与
   `RESTART → attemptStart`；异常和私密配置不得进入 console/DOM；
4. app 只消费 public view 和表现 helper，不从 state/content 拼文案或读取未来
   label/rows/final 字段；
5. 实现原生 select 白名单、按住与直接入口、physical activation 去重，以及
   184 第 12 节固定 Pointer/click 分流优先级；
6. Pointer session 必须包含 generation、pointer identity、整数 start time、
   frozen rect、expected index/revision、candidate 与 cleanup；pointerup 只形成
   awaiting-click candidate，原生 click 是唯一 LAUNCH 提交点；
7. suppressed click tombstone 按规范化 pointerType 四桶封顶；exact tombstone
   身份判断先于 normal/reduced candidate；不得用 `isTrusted`、全局时间锁、
   pressure、tilt、raw/coalesced/predicted events；
8. direct、pointercancel、lost capture、capture throw fallback、blur、hidden、
   pagehide、下一 generation 与 detail 0/1/>1 完全按规格清理/保留 candidate 和
   tombstone；
9. 每束只创建一个 token 化完成器；rAF 每帧从整数 start/tick 重算，1000ms
   正常完成、1500ms timeout、异常/media change/lifecycle 共用幂等 finish，迟到
   callback no-op；
10. reduced-motion 在 microtask 完成同一 token；Canvas/context/尺寸失败用 CSS
    9×9 grid 的语义无关结构即时表达后完成当前束；不一次解锁全部；
11. forced-colors、Canvas 与 no-JS 的 DOM/功能钩子在本批建立，具体视觉由批次三
    完成；不得增加技术错误卡或模式开关；
12. 实现前两束单次 live、第三束前台焦点和后台 `pendingResultFocus` 一次性
    flush；token/revision、visible/focused、activeElement 任一不符即永久放弃；
13. 所有 phase/revision、候选、token、动画与焦点清理幂等；不访问公网、
    storage、clipboard、history、Service Worker 或权限 API。

### 命令与浏览器 Gate

```bash
node --check experiences/surprises/wish-fireworks/app.js
node --test experiences/surprises/wish-fireworks/logic.test.js
npm test
npm run verify
git diff --check
```

使用 Chrome MCP / 浏览器工具验证：

- 主动 START、失败重试、三束完整流程与 replay；
- pointer 量化边界、inside/outside、capture throw、cancel、lost capture、direct
  打断 hold、迟到旧 generation 与跨 pointerType ghost click；
- select 五档、键盘/AT detail 0、双击/repeat 去重；
- normal/reduced/Canvas null/throw、blur/hidden/pagehide 与 token 幂等完成；
- 每阶段 DOM、attributes、ARIA、Canvas text spy、console、URL、storage 与
  network 的 privacy sentinel；
- no-JS 只有冻结五项，`file://` 经典脚本可直开且零公网请求。

浏览器工具若拒绝 `file://`，如实记录限制；用 localhost 实玩同一文件，同时以
人工双击、相对经典脚本和静态零网络 Gate 证明 A 级合同，不能把 localhost 结果
冒充真实 `file://` 证据。

### 完成证据

- 命令全绿，Chrome 记录完整三束、replay、输入取消、token 与 privacy 结果；
- `intro → ready ↔ bursting → complete` 只有 reducer 权威状态；
- reduced/Canvas failure 每次只完成当前 glyph，重复 callback 不推进；
- diff 只有本批两个文件，视觉样式不在本批夹带；
- 主线程审阅后独立提交。

## 4. 批次三：已确认视觉、响应式与无障碍样式

**前置条件：用户已通过第 1.2 节视觉确认 Gate，且批次二已独立提交。**

### 唯一可写文件

```text
experiences/surprises/wish-fireworks/styles.css
```

本批不得修改 HTML、app、logic/config/test、README、ATTRIBUTION、catalog、门户、
docs、bugs、learn、package 文件或资产。视觉验证发现结构/行为缺陷时，另开独立
bug 批次，不在 CSS 提交中顺手改 JS。

### 实现职责

1. code-native 实现 229 已接受的深靛夜空、低矮屋顶、暖金点光、开放留字轨、
   深梅红/氧化铜发射台和 complete 暖纸短笺；
2. 只使用系统字体栈、CSS/Canvas 基本几何和冻结 token；不加载 15 张 docs-only
   PNG、远程字体、第三方图标、图片、音频或纹理；
3. intro 不画未来槽位；revealed rail 只呈现真实前缀；holding 只有单向非闪烁
   蓄光；bursting 同时最多一束；complete 不覆盖夜空；
4. focus 至少 3px 实线，pressed/`aria-disabled`/complete 不只靠颜色或 glow；
   原生 select 和按钮触控高度按规格至少 56px；
5. 覆盖 `1504×1046`、`1280×800`、`768×1024`、`390×844`、
   `320×568`、`844×390`，允许必要纵滚、禁止横向溢出；
6. 覆盖 200% text、约 320 CSS px 的 400% zoom、safe-area 和最大四行留言；
7. reduced-motion 不恢复旧动画；forced-colors 隐藏 Canvas、使用系统色、真实
   border/outline 和 CSS grid，移除 gradient/filter/blend/shadow/image；
8. normal-ready 且确实可 holding 时才有主按住按钮 `touch-action:none`，其他
   phase、reduced、准备失败和页面其他区域均可滚动；
9. 不出现 infinite/alternate、twinkle/flicker/strobe、全屏闪白、brightness
   切换、shake、自动连发或常驻 RAF 对应样式。

### 命令与 Chrome Gate

```bash
npm test
npm run verify
git diff --check
```

用 Chrome MCP 对六档视口、200% text、400% zoom、intro/ready/holding/bursting/
complete、失败、reduced、forced-colors、Canvas null/throw 和 no-JS 截图。对 229
的原尺寸概念与最新浏览器截图分别做原尺寸检查，并维护 fidelity 对照：文案、phase
内容、公开前缀、DOM 顺序、夜空比例、点阵、配色、字体、间距、原生 select、两
入口、pressed/disabled/focus、短笺、移动/横屏与三类降级。

### 完成证据

- 六档视口零横溢，交互尺寸、焦点、文本缩放与系统模式符合 Gate；
- 没有概念 PNG 或新生产资产进入运行时；
- Chrome 截图与 fidelity 对照无未处理的可修问题；
- 命令全绿，diff 只有 `styles.css`；
- 主线程审阅后独立提交。

## 5. 批次四：作品说明、借鉴声明与目录接入

### 唯一可写文件

```text
experiences/surprises/wish-fireworks/README.md
experiences/surprises/wish-fireworks/assets/ATTRIBUTION.md
experiences/catalog.json
index.html
experiences/surprises/README.md
README.md
docs/README.md
docs/40-idea-backlog.md
shared/runtime/catalog.test.js
scripts/experience-contracts.test.mjs
```

只有实测证明精确计数需要变化时才修改
`scripts/experience-contracts.test.mjs`；不得预写猜测计数。本批不得修改生产
logic/UI/styles、bugs、learn、verification、package 文件或任何资产。

### 实现职责

1. 作品 README 说明双击入口、三束玩法、五档高度、配置定制、无 JS/reduced/
   Canvas 降级、阶段隐私边界和本地明文限制；
2. README 与 `assets/ATTRIBUTION.md` 都写“借鉴与来源声明”，列出五个固定来源
   的完整 40 位 SHA、许可证、版权/授权主体、实际借鉴抽象与未复制范围；
3. 明确 9×9 点阵、target、state/reducer、token、量化、整数表现帧、输入适配、
   DOM、CSS、测试和视觉均为本仓库独立实现；
4. 明确未复制或引入参考项目的源码、测试、API、参数、公式、默认配置、UI、
   图片、字体、音频、品牌或素材；三个参考库不是依赖、script、vendor 或构建
   产物；
5. ATTRIBUTION 写明“生成资产：无”；15 张 ImageGen 概念仅属 docs 评审资产，
   以 202/229/生成台账记录，不进入运行时。未来若增加生产资产，先重新审计并
   记录 prompt、日期、尺寸、格式、SHA-256 与第三方输入；
6. catalog 与门户内置 fallback 新增唯一、同值、A 级、离线
   `wish-fireworks` 入口；同步单人惊喜分类、根 README 与 docs 索引；
7. 只有三束主线、五档等价入口、privacy sentinel、reduced/Canvas/Pointer
   降级、闪烁、真实 touch 与零网络 Gate 全部通过后，才把创意池 S12 标为已实现；
8. 共享测试覆盖 catalog/portal 一致、经典脚本、相对本地资源、无 module/公网
   URL/fetch/storage/Service Worker、来源标题、no-JS/隐私静态边界与实测计数。

### 固定来源

| 来源 | 2026-07-24 再验证 HEAD | 许可证 / 主体 |
| --- | --- | --- |
| Fireworks.js | `8f01eeaef422c1f0880e94ce99040025a1b74d7e` | MIT；Copyright (c) 2021-2023 Vitalij Ryndin |
| W3C Pointer Events | `238e8273305bb2e3c76f9f0bb289fb127c3dff74` | W3C Software and Document License；仓库贡献者授权，工作组维护 |
| canvas-text-particle | `9ee144a548aad85275318b30891c71dcf6e10f7b` | ISC；Copyright (c) 2026, dango0812 |
| canvas-confetti | `20eebad51dde793070c373d594099a7ed8d96e22` | ISC；Copyright (c) 2020, Kiril Vatev |
| W3C WCAG | `07123b871c103268375880980fd715b2b26b2ff0` | W3C Document License；仓库贡献者授权 |

五个默认分支 HEAD 已于 2026-07-24 再验证且无漂移；只要未触发 227 第 5 节条件，
本轮执行不重复扩大来源范围。若要引入任何代码片段、测试、公式、素材、依赖或
外部资产，必须先暂停实现、重新复核许可证并改写声明，不能继续沿用“零复制”。

### 命令 Gate

```bash
node --test experiences/surprises/wish-fireworks/logic.test.js
node --test shared/runtime/catalog.test.js
node --test scripts/experience-contracts.test.mjs
npm test
npm run verify
git diff --check
```

### 完成证据

- catalog 与门户各有且仅有一个 `wish-fireworks`，字段和入口一致；
- 分类、根 README、docs 索引与 S12 状态一致，所有计数来自实测；
- README/ATTRIBUTION 五项固定来源、SHA、许可证、主体、借鉴与零复制逐项一致；
- 零新增依赖、零 package 变化、零运行时图片/字体/音频；
- 命令全绿，diff 只有本批清单内文件；
- 主线程审阅后独立提交。

## 6. Bug 与 learn 的独立处理

### 6.1 真实 bug

只有能够复现、违反冻结规格或验收 Gate 的问题才建立 bug。文件名：

```text
bugs/YYYY-MM-DD-wish-fireworks-<slug>.md
```

每条记录至少包含环境、复现步骤、预期、实际、根因、最小修复、回归测试、验证
命令和相关 commit。修复批开始前先声明唯一可写文件；该清单只包含 bug 记录、
最小生产修复和直接回归测试。一个独立根因一个 fix 提交；同根因追加原记录，不
重复建档，也不把无真实复现的开发笔记包装成 bug。

规格已引用的
[`2026-07-21-wish-fireworks-reduced-motion-double-activation.md`](../bugs/2026-07-21-wish-fireworks-reduced-motion-double-activation.md)
继续作为既有输入修复记录；若同根因复现则更新它，不另开重复文件。

每个 fix 至少重跑定向测试、`npm test`、`npm run verify`、`git diff --check`；
UI/输入/视觉 bug 还必须用 Chrome MCP 复现旧行为并证明修复。

### 6.2 可复用 learn

仅当有本作代码、测试或浏览器证据，并且结论可复用于至少两个项目时，才写入：

```text
learn/<topic>.md
```

候选包括 hostile snapshot、revision headroom、pointer click tombstone、token
完成器、后台一次性焦点恢复、阶段隐私 sentinel、Canvas/forced-colors 正式降级。
每个主题独立提交；learn 批只写该文档，不顺手改功能、bug、catalog 或验证报告。

## 7. 最终 verification

### 唯一可写文件

```text
docs/247-wish-fireworks-verification.md
```

若该编号在执行前已被占用，先选择当时下一个未占用编号并在开工前固定；最终验证
批不修改功能、catalog、索引、bugs、learn 或 package 文件。发现失败就返回对应
独立 bug/fix 批，全部重新通过后再写 verification。

### 最终命令

```bash
node --check experiences/surprises/wish-fireworks/config.js
node --check experiences/surprises/wish-fireworks/logic.js
node --check experiences/surprises/wish-fireworks/app.js
node --test experiences/surprises/wish-fireworks/logic.test.js
node --test shared/runtime/catalog.test.js
node --test scripts/experience-contracts.test.mjs
npm test
npm run verify
git diff --check
git status --short
```

### 最终浏览器矩阵

1. Chrome desktop 与 Safari desktop 完整三束、五档、hold/direct、键盘/AT、
   replay；
2. 至少一次 iOS Safari 与 Android Chrome 真实 touch 序列，记录
   `click.detail`、pointer identity 与 lost capture；模拟器不能替代；
3. 六档冻结视口、200% text、400% zoom、最大合法配置与 16/48 active 两端；
4. intro、ready0/1/2、holding、bursting0/1/2、complete、准备失败；
5. initial/dynamic reduced-motion、forced-colors、Canvas null/throw、无 Pointer
   Events、禁用 JavaScript；
6. blur、hidden、pagehide/pageshow、capture throw、cancel、lost capture、
   timeout/animation-end 竞争、旧 generation/token 与 ghost click；
7. privacy sentinel 搜索 text、attributes、ARIA、template/SVG/Canvas text、
   console、URL/history、storage、clipboard 与 network；
8. `file://` 真实直开、零公网/失败请求、零 storage、零 console error/warning；
9. 与 229 概念做最终 fidelity 对照，不把概念图当成真实 9×9、forced-colors 或
   Canvas 行为证据。

### 完成证据

verification 必须记录：

- 每条命令、日期、通过数量和最终目录计数；
- 实际浏览器/系统/设备、入口方式、视口、截图与关键 computed 值；
- canonical hash、headroom、privacy、Pointer、token、焦点、闪烁与降级结论；
- catalog/门户/分类/创意池一致性；
- 五个来源的固定 SHA、许可证、版权/授权主体与零复制结论；
- 每个阶段提交、bug/fix 提交、learn 提交和已知限制；
- 最终 `git status --short` 为空。

最终报告独立提交。只有上述全部通过，才可称 `wish-fireworks` 已实现；本作品完成
不等于长期项目目标完成，随后继续选择下一候选，不调用长期目标 complete。
