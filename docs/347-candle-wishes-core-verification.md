# Candle Wishes 非视觉核心复验证明

- 复验日期：2026-07-25
- 基线：`25aa56fc3a093983dc3a291460b9377c6f4a5c3b`
- 分支：`codex/exp-candle-wishes-core-audit`
- worktree：`/Users/zenith/Desktop/two-of-us-worktrees/candle-wishes-core-audit`
- 范围：既有配置、纯逻辑、来源/资产与重复机制再验收；不创建生产 UI

## 1. 结论

`candle-wishes` 的非视觉核心在本次任务开始前已经完整存在于 main，并与
[`216-candle-wishes-plan.md`](./216-candle-wishes-plan.md) 的批次一合同一致。
重复实现配置、路线、reducer、replay 或 public view 会覆盖已经通过回归的成果。

本轮没有发现可复现的核心缺口：

- 五支原创默认蜡烛、路线和固定展示排列完整；
- hostile config/state/action 快照、四动作 reducer、整轮 revision headroom 与
  120 种路线排列完整；
- intro、lighting、ready-to-receive、complete 四阶段 public view 按合同逐步
  公开线索、愿望和最终私信；
- 三个固定开源来源的 commit、许可证、版权/作者、证据哈希与零复制边界完整；
- 两张 ImageGen PNG 的尺寸、SHA-256、处理链和 docs-only 边界一致；
- 定向、全仓、仓库验收和差异检查全部通过。

本轮没有修改 `package.json`、`config.js`、`logic.js`、测试、借鉴声明、共享
运行时、根依赖、launcher、catalog 或 Board，也没有新增 bug/learn。唯一新增
文件是本复验证明。

## 2. 历史实现证据

| Commit | 职责 |
| --- | --- |
| `6a82160` | 定向调研、方案比较、来源和零复制边界 |
| `b147084` | 可执行规格、隐私、headroom 与验收合同 |
| `5e61454` | 四批次实施计划与独立提交边界 |
| `ea31a42` | 目录级 CommonJS、配置、纯逻辑与测试 |
| `d4b3c55` | docs-only 概念图、生成台账和视觉确认 Gate |
| `bebe6d9` | 体验目录借鉴声明与归因回归测试 |

`ea31a42` 已新增：

```text
experiences/surprises/candle-wishes/package.json
experiences/surprises/candle-wishes/config.js
experiences/surprises/candle-wishes/logic.js
experiences/surprises/candle-wishes/logic.test.js
```

后续 `bebe6d9` 增加
`experiences/surprises/candle-wishes/ATTRIBUTION.md`，同时增加固定来源、
许可证哈希、零依赖、零复制与本地明文边界的回归断言。当前项目测试共有 23 个
顶层用例。

## 3. 原创配置与核心合同

### 3.1 默认路线

默认路线固定为：

```text
rain → noodle → journey → quiet → home
```

公开按钮展示排列固定为 route index：

```text
[2, 4, 0, 3, 1]
```

因此默认可见顺序为：

```text
journey → home → rain → quiet → noodle
```

配置只接受 `recipient / finalTitle / finalMessage / signature / candles` 的
精确纯数据 schema。每支蜡烛精确含 `id / label / cue / wish`；ID 和 label 均
唯一。配置不能注入 HTML、SVG、CSS、URL、函数、事件或浏览器能力。

默认五段 cue/wish、最终标题、留言与署名的全仓精确搜索只命中本项目调研、
规格、概念台账、配置和测试，没有命中其他 installed 作品或 vendored 内容。
借鉴声明明确这些文案与状态机是本仓库独立设计，不使用候选项目文案。

### 3.2 状态、动作与重放

- 阶段固定为 `intro / lighting / ready-to-receive / complete`；
- 动作固定为 `START / TRY_CANDLE / REVEAL / RESTART`；
- 格式合法但错误、未来、已点亮或未知的 candle ID 是 same-reference no-op；
- 第五支只进入 ready，必须主动 REVEAL 才公开最终私信；
- RESTART 延续 revision，不把前后两轮日志混成一轮；
- intro、lighting 和 ready 的 headroom 一次性保留完成当前整轮所需的全部动作；
- complete 允许稳定停在最大 revision，只有还剩 8 次预算时才允许安全重开；
- `replaySession` 接受合法语义 no-op，但任一畸形 action schema 令整份日志返回
  `null`；
- 同一配置与 action JSON、深克隆和 JSON 往返得到深相等终态；
- 120 种配置路线都只能按自己的 route 完成，而 display permutation 始终固定。

配置、state、action 和 action log 拒绝 accessor、Symbol、extra key、稀疏数组、
数组子类、异常原型、自定义 iterator/map、lone surrogate、控制字符与抛错
Proxy。每层 descriptor 只快照一次；输出断开调用方引用并递归冻结。

目录级 `package.json` 精确为 `{"type":"commonjs"}`，真实 `require()` 与浏览器
全局导出指向同一冻结 API。模块加载不访问 DOM、Canvas、时间、随机、timer、
storage、网络、audio、permissions 或 HTML sink。

## 4. Public view 与本地隐私

以默认路线独立执行得到：

| 阶段 | 公开内容 | 继续遮蔽 |
| --- | --- | --- |
| intro | 固定标题、说明、隐私文本、进度与 START | 全部 candle 配置和 final 字段 |
| lighting | 五个 label、当前 cue、已点亮状态和愿望前缀 | 未来 cue/wish 与 final 字段 |
| ready-to-receive | 五个 label、五句 wish 与 REVEAL | recipient、finalTitle、finalMessage、signature |
| complete | 前述内容及四字段 result | 无额外路线元数据 |

每个 lighting view 的按钮顺序都保持
`journey/home/rain/quiet/noodle`；`revealedWishes` 只增长一个真实路线前缀。
view 不含 `routeIndex / displayIndex / target / content / cursor / revision`。

这只证明纯逻辑数据边界。`config.js` 仍是本地明文，不是加密保险箱；能够读取
目录的人仍可查看全部线索、愿望和最终留言。

当前没有生产 HTML/app，因此还不能证明未来 cue/wish/final 不会进入 hidden
DOM、ARIA、attribute、CSS content、console 或页面历史，也没有真实焦点、live
region、错误播报或 disabled button 证据。

## 5. 与 58 个 installed 作品去重

S17 仍只在 `docs/40-idea-backlog.md` 中保留为未实现创意，没有
`experiences/catalog.json` 条目、生产入口或 surprises 分类登记。

本作不是全新的“私人线索判断”类型；研究文档已明确它属于
`star-code-unlock` 建立的同一家族。保留价值来自组合机制，而非蛋糕题材：

| 相邻作品 | 已有机制 | Candle Wishes 的独立边界 |
| --- | --- | --- |
| `star-code-unlock` | 三条文本答案、错次计数、分级提示与第三次救援、星图连接 | 五个始终可见的实体标签按钮；错误不计数、不进入 state、无救援；正确后持续追加五句 wish |
| `nested-gift` | 四种不同输入依次打开唯一当前层 | 每一步都要在同一组五对象中用当前 cue 识别目标 |
| `future-cookie-notes` | 三枚固定语义签可任意顺序打开，再主动合成邀请 | 路线由准备者冻结，只有当前项有效；展示顺序和路线顺序刻意分离 |
| `memory-letter` | 依次阅读三段固定回忆 | 不是“下一页”；每步都包含语义匹配与错误 no-op |
| `wish-fireworks` | 三次确定性蓄力、Canvas 表现 token 与最终私信 | 没有蓄力、计时、Canvas 或表现 token；核心是五选一直接按钮判断 |

独立增量可精确表述为：**五个并列、有文字标签的实体对象始终公开；准备者路线
与固定展示排列分离；当前 cue 只接受一个对象；每次正确选择永久点亮并追加愿望
前缀；五句齐备后仍需主动收下最终私信。**

## 6. 固定来源、许可证与版权

### 6.1 2026-07-25 远端快照

通过 GitHub 仓库元数据和默认分支 commit API 复核：

| 来源 | 当前 HEAD | 固定 commit | 状态 |
| --- | --- | --- | --- |
| `ololx/birthday-cake` | `d51cd5c73c3171d6b769b5da1b9072beca691ce6` | 相同 | 未归档、未禁用 |
| `VIDAKHOSHPEY22/Birthday-Cake-Blow-Candle` | `3d364f985b2d96057f30d3fc67c5ee71ec37556f` | 相同 | 未归档、未禁用 |
| `elixpo/wish.elixpo` | `bf6ec8cae8c756203e059940d42089504ae43ec8` | 相同 | 未归档、未禁用 |

旧 `Circuit-Overtime/Birthday` GitHub API 路径继续以 301 指向同一 repository
对象，与借鉴声明的改名记录一致。

### 6.2 固定许可证证据

重新下载固定 commit 的许可证载体后，SHA-256 全部与
`ATTRIBUTION.md` 一致：

| 来源 | 许可证、权利主体 | 载体 SHA-256 |
| --- | --- | --- |
| `ololx/birthday-cake` | Unlicense 公有领域奉献；README 记 Alexander A. Kropotin 为初始作者 | `6b0382b16279f26ff69014300541967a356a666eb0b91b422f6862f6b7dad17e` |
| `Birthday-Cake-Blow-Candle` | MIT；Copyright (c) 2025 Vida Khoshpey | `0f294f61515a3d1116feca7a014c6b9e1e4bbe4e0044425157cdca51e166f38b` |
| `wish.elixpo` | MIT；Copyright (c) 2024 Ayushman Bhattacharya | `5e9a87b81ca59f8f1e350c673ba55cc59cca9264582c7cca763cdaba3d159f1c` |

MDN `getUserMedia()`、W3C Pointer Events Level 3、WCAG Target Size 与
Animation from Interactions 四个官方校准页面均返回 HTTP 200。它们只是权限、
统一指针输入、命中区和交互动效的标准依据，不是代码、素材或运行依赖。

### 6.3 实际借鉴和未复制范围

- `birthday-cake` 只用于确认单 HTML、本地打开和逐支点击能力；
- `Birthday-Cake-Blow-Candle` 只用于排除麦克风、图片、音频、Canvas 与外部
  Lottie 庆祝依赖；
- `wish.elixpo` 只用于比较个性化贺卡、最终私信、云端、数据库和权限边界；
- 没有复制、修改、链接或 vendoring 三个项目的代码；
- 没有使用其图片、SVG、音频、生日歌、Lottie、字体、截图、文案、配色、
  参数、CSS 蛋糕、动画、素材或 trade dress；
- 当前目录没有第三方运行依赖。

## 7. docs-only 概念图与隐私

`docs/assets/candle-wishes/` 精确包含两张 PNG：

| 文件 | 实际尺寸 | 实际 SHA-256 |
| --- | ---: | --- |
| `concept-lighting-desktop.png` | `1503×1046` | `863483363f5a8606577cedffe658847d8d311e5261f27d816c6791f751dc2419` |
| `concept-complete-mobile.png` | `853×1844` | `149ad923870f14a65530a2852ae68ed255dce7c569e04fc12439adcd42eba86d` |

尺寸、SHA-256 和处理链均与 `GENERATION.md` 及视觉提案一致。两张图都包含
OpenAI 生成流程的 `caBX` C2PA/JUMBF 来源凭证；没有
`tEXt / zTXt / iTXt / eXIf` chunk，字符串扫描未发现用户名、本机路径或 prompt。
凭证可识别 `gpt-image 2.0`、`OpenAI Media Service API` 与 trained
algorithmic media 来源；这是来源信号，不是准确性、所有权或未编辑证明。

体验目录只有 `package.json / config.js / logic.js / logic.test.js /
ATTRIBUTION.md`。除声明文字外，核心代码没有引用 PNG、docs 图片路径、fetch、
preload 或 CSS background；两图没有进入 runtime、state 或 public view。

## 8. 实测命令与结果

### 8.1 定向核心

```sh
node --check experiences/surprises/candle-wishes/config.js
node --check experiences/surprises/candle-wishes/logic.js
node --test experiences/surprises/candle-wishes/logic.test.js
git diff --check
```

结果：23/23 通过；语法与差异检查通过。覆盖真实 CommonJS/browser global、
canonical hash、NFC/code point、hostile snapshot、五步路线、错误 no-op、单次
descriptor、headroom、120 路线、replay、四阶段 exact public view、隐私
sentinel、零宿主副作用和归因声明。

### 8.2 全仓

新 worktree 初始没有 `node_modules`。按现有 lockfile 执行 `npm ci`，安装 55
个已声明 package，审计 56 个 package，0 vulnerability；没有修改根
`package.json` 或 `package-lock.json`。

```sh
npm test
```

结果：

```text
tests 2269
pass 2269
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

58 个入口不包含 `candle-wishes`，与本轮不登记 installed 的边界一致。

## 9. bug 与 learn

本轮没有发现新的可复现产品 bug，因此不新增 `bugs/`。路线/展示顺序分离、
app-local 错误反馈、阶段 public view 与整轮 headroom 已经冻结在调研、规格和
计划中；本轮没有形成需要脱离既有文档单独维护的新通用结论，因此不新增
`learn/`。

## 10. 仍未验收的 Gate

本文件只证明非视觉核心，不证明作品已经可打开、可玩或 installed。以下内容仍
未完成：

- 用户尚未明确接受
  [`217-candle-wishes-design-proposal.md`](./217-candle-wishes-design-proposal.md)
  的视觉方向；
- 没有生产 `index.html`、`app.js`、`styles.css`、README 或 experience
  metadata；
- 没有 phase-owned DOM、五个真实 button、app-local 错误 live、焦点迁移、
  preparation failure 或 no-JS 接线；
- 没有 CSS/SVG 蛋糕、火焰、disabled 文字状态、reduced-motion 或
  forced-colors 验收；
- 没有 1504/1280/768/390/320/844×390、200%/400%、48px target、safe-area
  或零横溢证据；
- 没有 localhost 完整玩法、真实 `file://` 双击、键盘/Pointer、console、
  network、storage 或 permission 浏览器证据；
- 没有 catalog、根门户、surprises 分类索引、创意池 installed 状态、launcher
  或 Board 登记；
- 当前 ATTRIBUTION 已覆盖核心来源，但计划要求的生产 README 仍须在 UI/登记
  批次各自完整复述来源、许可证、实际借鉴与未复制范围。

只有视觉确认、生产 UI、浏览器/file Gate、README/归因终审和目录登记全部完成
后，`candle-wishes` 才能标记为 installed。本轮严格不越过该边界。
