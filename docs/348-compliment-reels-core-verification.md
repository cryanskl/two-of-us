# Compliment Reels 非视觉核心复验证明

- 复验日期：2026-07-25
- 基线：`44b5edc0457ac3b18fc069e52d06e54b9bc630c8`
- 分支：`codex/exp-compliment-reels-core-audit`
- worktree：`{worktree-base}/compliment-reels-core-audit`
- 范围：既有 research/copy audit/spec/plan/design、配置、纯逻辑、测试、来源、
  docs-only 资源与机制去重；不创建生产 UI

## 1. 结论

`compliment-reels` 的非视觉核心在本轮开始前已经存在于 main，且主体合同与
[`254-compliment-reels-plan.md`](./254-compliment-reels-plan.md) 子任务 A 一致。
本轮没有重写既有状态机、随机计划或文案，只修复了一个可稳定复现的兼容缺口：

- 规格要求按 Unicode 字素限制称呼、三列文本和终局结语；
- 原生路径使用 `Intl.Segmenter`，但无该 API 的回退路径错误地按码点计数；
- 合法的组合附加符、Hangul Jamo、emoji modifier、ZWJ emoji 和旗帜可能被误判
  为超长，进而触发整份配置回退；
- 现已增加显式无 Segmenter VM 回归，并用确定性无依赖字素回退修复；
- 未增加 dependency、运行时网络、存储、DOM、时钟或随机副作用。

修复后：

- 定向测试 24 / 24；
- 全仓测试 2271 / 2271；
- repository verify 通过；
- 四个固定研究来源、一个排除来源、许可证载体与版权主体仍一致；
- 八张 ImageGen 概念图仍只存在于 docs，不进入运行时；
- 没有修改 shared、根依赖、launcher、catalog、分类 README 或 orchestration board。

本轮仍不证明作品已经可以双击游玩。视觉提案没有用户确认，生产
`index.html / app.js / styles.css / README / experience.json` 仍不存在，故不得
把项目登记为 installed。

## 2. 历史实现证据

| Commit | 职责 |
| --- | --- |
| `b4ae9c0` | 定向调研、相邻机制比较、来源与零复制边界 |
| `67df67b` | 18 段默认文案和 216 个组合的逐项审计 |
| `3fadf0a` | 可执行规格、状态机、隐私、确定性与浏览器 Gate |
| `279597a` | ImageGen 视觉 brief 与冻结状态文案 |
| `4e06a43` | 视觉提案；明确仍等待用户确认 |
| `5e88758` | 固定来源、许可证与标准状态维护复核 |
| `8dce492` | 分步实施计划；冻结非视觉核心与 UI 的提交边界 |
| `b08be37` | 配置、纯逻辑、测试、借鉴声明与三个早期 bug 记录 |

基线中的运行目录精确只有：

```text
experiences/surprises/compliment-reels/
├── ATTRIBUTION.md
├── config.js
├── logic.js
├── logic.test.js
└── package.json
```

目录级 `package.json` 只有 CommonJS 类型声明，没有 dependencies、
devDependencies 或构建脚本。

## 3. 文档、文案与配置合同

### 3.1 文档一致性

逐份复核 178、179、180、197、198、230 与 254 后，未发现范围冲突：

- research 把作品冻结为单人准备/体验的本地惊喜；
- copy audit 冻结 18 段默认文本、signature 与 216 个组合；
- spec 冻结随机消费、状态、public view、隐私与 headroom；
- image brief 和 design proposal 只描述候选视觉，均不授权生产 UI；
- source refresh 固定四个研究来源与一个许可证冲突排除项；
- plan 的当前批次只允许配置、纯逻辑、测试和借鉴声明。

### 3.2 冻结内容

- 三列固定为 `moment / shine / echo`，每列六项；
- signature 固定为 `m_slow / s_safe / e_here`；
- 216 个完整句全部唯一，格式固定为
  `{moment}，{shine}，{echo}。`；
- 默认 inventory SHA-256 为
  `d399e92747960af6d0d281d77da0e39a4a2ad0f22f592b8ca511153cab8b6fb0`；
- 默认完整句为 32–39 字素，合法最大配置的完整句上限为 61 字素；
- 两个称呼、18 条短句和 composer 结果都只接受纯文本；
- 任一配置结构、ID、长度、列内唯一性或标点约束失败时整份原子回退，避免混用
  调用方私人字段和默认字段。

### 3.3 本轮 Unicode 修复

失败用例先在 `b13fab9` 提交，并在基线实现上得到 23 通过、1 失败。修复
`cb2ebcb` 保留 `Intl.Segmenter` 优先，在缺少该 API 时确定性处理：

- Unicode Mark；
- Hangul L/V/T/LV/LVT；
- emoji modifier 与变体选择符；
- 两两配对的区域指示符；
- 仅限 Extended Pictographic 的 ZWJ 序列。

后续 `15e0ded` 又固定非 emoji `a‍b` 不能被错误合并为单一 cluster。测试覆盖
称呼 12 / 13 与终局结语 120 / 121 边界。完整复现、根因和回归证据见
[`2026-07-25-compliment-reels-grapheme-fallback.md`](../bugs/2026-07-25-compliment-reels-grapheme-fallback.md)。

仓库已有
[`2026-07-21-grapheme-fallback-without-segmenter.md`](../learn/2026-07-21-grapheme-fallback-without-segmenter.md)
记录同类通用结论，因此本轮没有重复新增 learn。

## 4. 随机、状态与确定性

### 4.1 预提交计划

- entropy 必须是当前 realm 的原生 dense Array，精确 64 个 uint32；
- fallback entropy 固定为 0–63，SHA-256 为
  `a49d88051b2d2e5d1255d4f806a7569cda9b33a650a908566197031349ad8db4`；
- 先用 rejection sampling 等概率选择第 3–6 抽为 jackpot；
- 每列移出 signature，独立 Fisher–Yates 排列其余五项，再把 signature 插回
  jackpot 位置；
- 每列六个 ID 各出现一次，六个三元组全部唯一；
- signature 三元组精确出现一次且只在 jackpot；
- `createArmAction` 在 ARM 前一次性生成并冻结 content、entropy、mode 与最终结语，
  reducer 不读取浏览器随机源。

四个 jackpotSpin fixture 的独立探针确认第 3、4、5、6 抽都能命中唯一 signature。
极端拒绝序列耗尽会 fail closed；fallback mode 只接受冻结 fallback entropy。

### 4.2 Reducer 与 headroom

权威 state 精确九个键，阶段固定为
`intro / ready / spinning / result / jackpot`，动作固定为
`ARM / PULL / SETTLE / SUSPEND / RESTART`。

- 合法 state + 非法 action 保持原引用；
- 非法 state 通过公开入口回到全新安全初态；
- SETTLE 必须匹配当前 spinToken，旧回调不能命中新局；
- SUSPEND 与正确 SETTLE 的下一 state 字节等价；
- JSON 克隆后的 ARM action 不含 composer 函数，仍可重放到等价终态和 view；
- RESTART 保留单调 revision，不把版本归零。

额外边界探针分别从第 3–6 抽 ARM 的精确最大 revision 开始，全部恰好在
`MAX_REVISION` 完成；边界 +1 均保持原引用。jackpot 的 RESTART 精确边界也能
重开并完成最坏六抽，边界 +1 被拒绝。没有任何合法转换产生无法完成的
spinning 或溢出 revision。

### 4.3 Hostile input

实现只通过 `Reflect.ownKeys / getOwnPropertyDescriptor / getPrototypeOf` 快照
输入，并拒绝：

- extra key、Symbol、accessor、异常原型；
- 稀疏数组、数组子类、非法 uint32；
- 抛错的 descriptor/prototype trap；
- composer 修改 summary、抛错、thenable、空白或超长结果。

合法 data-descriptor Proxy 即使普通 `get` 会抛错也不会触发该 trap。配置、
action、state、plan 与 public view 都断开调用方引用并递归冻结。

## 5. Public view、隐私与副作用

逐阶段 sentinel 探针覆盖 jackpotSpin 3–6：

| 阶段 | 可公开 | 仍禁止公开 |
| --- | --- | --- |
| intro/ready | 默认或清洗后的称呼、列标签、能力标志 | 所有列文本、组合句、计划、entropy、结语 |
| spinning | 仅既有 settled prefix 与 animationToken | 当前 pending stop、所有 future stop、结语 |
| result | 最新 settled stop、历史前缀 | future stop、signature 位置、结语 |
| jackpot | 已揭晓前缀与终局结语 | plan、entropy、内部 item/signature ID |

四条路径均未在 public view 中发现 future phrase、`m_ / s_ / e_` 内部 ID、
jackpotSpin 或提前出现的终局私语。view 数组与对象递归冻结，页面无需也不应读取
config 或 state 内部字段自行推导结果。

生产 `logic.js` 不调用 DOM、crypto、`Math.random`、Date、timer、animation
frame、network、storage、clipboard、媒体或权限 API。浏览器随机采集与动画只属于
未来 app/controller 批次，不进入当前纯逻辑。

## 6. 与相邻机制去重

`compliment-reels` 不在 `experiences/catalog.json`、根门户或 surprises 分类
README 中，符合尚无生产 UI 的状态。相邻 installed/core-only 作品没有重复它的
完整机制：

| 相邻作品 | 已有机制 | 本作的独立边界 |
| --- | --- | --- |
| `date-wheel` | 每次独立等概率选一个约会候选；允许连续重复 | 一次 ARM 预提交三列六停；列内无重复；第 3–6 抽保证唯一 signature |
| `future-ticket` | 三个固定类别各盲选一次，共 27 种车票 | 同一轮连续输出完整夸赞，保留历史前缀并在保证区间开放私语 |
| `future-cookie-notes` | 三枚固定内容可按任意顺序打开，再主动合成邀请 | 不是固定三段揭晓；每抽同时从三列预提交排列中取一个三元组 |
| `flower-language-bouquet` | 同池六选三；用户选择顺序决定花束和花语 | 无用户选花、撤回、scene 或导出；核心差异是随机协调排列与有限保证 |

独立增量是：**一次安全随机动作预提交三列协调的六抽排列，每列无重复、每个三元
组合唯一，并保证唯一 signature 在第 3–6 抽出现；public view 只逐抽释放既定前缀，
终局才开放私人结语。**

## 7. 固定来源、许可证、版权与零复制

### 7.1 2026-07-25 在线复核

通过 `git ls-remote` 复核，四个研究来源和一个排除来源的当前 HEAD 仍等于文档
固定对象：

| 来源 | 当前 HEAD / 固定 commit | 许可证与权利主体 |
| --- | --- | --- |
| `nuxy/slot-machine-gen` | `56c9017e839583dcb8fcb5cc88b08b30ed63f66a` | MIT；Marc S. Brooks |
| `davidbau/seedrandom` | `4460ad325a0a15273a211e509f03ae0beb99511a` | README 内 MIT；David Bau |
| `tweenjs/tween.js` | `20079e65f77bb2b8e52cc9d7dbed044b86e537d3` | MIT；Tween.js authors 与 Robert Penner |
| `catdad/canvas-confetti` | `20eebad51dde793070c373d594099a7ed8d96e22` | ISC；Kiril Vatev |
| `josex2r/jQuery-SlotMachine`（排除） | `bf436495aaf84cea5808734371649850e9704325` | 根 LICENSE/package 为 GPL-3.0-only，README 却写 MIT |

重新下载固定载体后，SHA-256 与
[`230-compliment-reels-source-refresh.md`](./230-compliment-reels-source-refresh.md)
逐项一致：

```text
slot LICENSE       7987bf8e3a61b7053c90564efbe4f99b2d2460b6d89eb930509fd96b67bc5e27
seedrandom README  4f42a296eee4f5ae3a8dadba94c2b0b5fb57662b96b8749f4d5288d4629b6240
tween LICENSE      c95fecd88f2709bfc34e4d1f1ccc36d17048990e6ba26c283cfecdef0432936b
confetti LICENSE   fd44477c30a832a1dee9ef0b6cfb34677fbe5ef58c0cf655d27c646f11bb2f7a
excluded LICENSE   fce02ebb691c768cde194afbe91b8025fd7b1f49031f33996deb246a5926f0e2
excluded package   70efbb38b61df4fd42a42ebd773e43ccb1b5fd51d2331eece54c402bfe7d8c77
excluded README    1d6eb21cb3125030533ff6b89caf2c450869620531e69e2920b4a2e0655ef484
```

### 7.2 借鉴和未复制边界

体验目录
[`ATTRIBUTION.md`](../experiences/surprises/compliment-reels/ATTRIBUTION.md)
已独立列出每个来源的固定 commit、许可证载体、版权主体、只研究的抽象机制和
明确未采用内容：

- 只研究 reel 职责分层、结果预选、局部可重现随机、动画生命周期与
  reduced-motion 原则；
- 不复制源码、API、算法、参数、测试、DOM、CSS、文案、图片、音频、字体、
  Logo、品牌或 trade dress；
- 四个来源不是 dependency、vendor 或运行时 script；
- GPL/MIT 元数据冲突的 jQuery-SlotMachine 完全排除。

本轮把当前项目三份 JS 与四个固定上游的 103 个源码文件做 20-token 连续窗口
扫描：Slot Machine Generator、seedrandom 与 Tween.js 为零匹配；canvas-confetti
只有两个匹配，均是通用 `0, 1, 2, ...` 数字序列，未发现代码级长片段重合。
项目内冻结的 0–63 fallback entropy 是独立、显式且由哈希固定的测试/降级数据，
不构成上游算法或实现复制。

本轮 Unicode 修复复用的是本仓库已经沉淀和测试的原创确定性策略，没有新增外部
研究来源或第三方代码。

## 8. docs-only ImageGen 资源

`docs/assets/compliment-reels/` 精确包含八张 PNG 与一份 `GENERATION.md`。实际尺寸
与台账一致：

| 文件 | 尺寸 |
| --- | ---: |
| `desktop-ready-concept.png` | 1503×1047 |
| `desktop-spinning-concept.png` | 1586×992 |
| `desktop-result-concept.png` | 1503×1047 |
| `desktop-jackpot-concept.png` | 1504×1046 |
| `mobile-result-concept.png` | 852×1846 |
| `narrow-result-concept.png` | 941×1672 |
| `tablet-result-concept.png` | 1086×1448 |
| `narrow-failure-concept.png` | 941×1671 |

八个实际 SHA-256 均与生成台账逐项一致。PNG chunk 都只有
`IHDR / caBX / IDAT / IEND`，没有 `tEXt / zTXt / iTXt / eXIf`；简单字符串扫描
未发现用户名、本机路径或 prompt。`caBX` 是生成来源凭证信号，不证明权利、
准确性或未编辑。

生产目录和根脚本没有引用 docs 图片路径、文件名、fetch、preload 或 CSS
background。当前纯逻辑不会加载、复制或导出这些概念图。

## 9. 实测命令与结果

新 worktree 初始没有 `node_modules`，首次全仓测试因 `qrcode` 和 vendored
Pannellum 尚未安装而出现环境失败。按现有 lockfile 执行 `npm ci` 后安装 55 个
package、审计 56 个 package、0 vulnerability；没有修改
`package.json / package-lock.json`。

### 9.1 定向

```sh
node --check experiences/surprises/compliment-reels/config.js
node --check experiences/surprises/compliment-reels/logic.js
node --test experiences/surprises/compliment-reels/logic.test.js
```

结果：24 / 24 通过，覆盖 CommonJS/经典脚本、inventory hash、216 句、四个
jackpot fixture、rejection sampling、hostile schema、原子配置回退、原生与回退
字素、composer 隔离、状态机、token、SUSPEND、replay、headroom、fallback
计划绑定、public view 隐私和零宿主副作用。

### 9.2 全仓

```sh
npm test
```

结果：

```text
tests 2271
pass 2271
fail 0
cancelled 0
skipped 0
todo 0
```

```sh
npm run verify
```

结果：

```text
仓库验收通过：58 个作品入口（50 个 A 级直开、8 个非 A 启动器）、
1 个能力声明、资源与借鉴声明完整。
```

58 个入口不包含 `compliment-reels`，与本轮不登记 installed 的边界一致。

## 10. 本轮提交与范围

| Commit | 内容 |
| --- | --- |
| `b13fab9` | 先提交无 Segmenter 字素失败用例 |
| `cb2ebcb` | 修复确定性字素回退 |
| `1f48e12` | 新增 bug 复现、根因和修复记录 |
| `15e0ded` | 加固非 emoji ZWJ 边界 |
| `e9c7ee5` | 补齐 bug 的全仓关闭证据 |

除本证明外，range 内只修改
`logic.js / logic.test.js / bugs/2026-07-25-compliment-reels-grapheme-fallback.md`。
没有修改生产 UI、shared、根依赖、launcher、catalog 或 board。

## 11. 仍未验收的 Gate

本文件只证明非视觉核心、来源、docs-only 资源和纯逻辑合同。以下内容仍未完成：

- 用户尚未明确接受
  [`198-compliment-reels-design-proposal.md`](./198-compliment-reels-design-proposal.md)；
- 没有生产 `index.html / app.js / styles.css / README / experience.json / favicon`；
- 没有浏览器 crypto 获取、fallback 提示、动画 token controller、hidden/pagehide/
  blur/reduced-motion settle 接线；
- 没有真实 DOM privacy sentinel、live region、焦点、单一按钮与 disabled 生命周期；
- 没有 `file://`、鼠标、触屏、Enter、Space、五档视口、200%/400% zoom、
  forced-colors、无图与无动画浏览器验收；
- 没有 catalog、根门户、surprises 分类、创意池 installed 或 launcher 登记。

只有视觉确认、生产 UI、真实浏览器/file 协议 Gate、最终归因复核和目录登记全部
完成后，`compliment-reels` 才能标记为 installed。本轮严格不越过该边界。
