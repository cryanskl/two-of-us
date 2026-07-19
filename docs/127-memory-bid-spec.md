# A 级“这一串，我还记得”可执行规格

- 日期：2026-07-19
- 状态：冻结，可进入视觉与实施计划
- 工作 ID：`memory-bid`
- 目录：`experiences/versus/memory-bid/`
- 调研依据：[126-memory-bid-research.md](./126-memory-bid-research.md)
- 启动等级：A，经典脚本、相对资源、`file://` 直开

## 1. 产品合同

两个人共用一台设备，共同观看一串八件旅行纪念物，然后轮流公开报价：“我能按顺序记住前 N 件。”后手只能报更高的整数或退出；最高报价者必须复述对应前缀。复述完全正确则自己得分，错误或主动认输则对手得分。

比赛固定四轮：玩家 0 在第 1、3 轮先开价，玩家 1 在第 2、4 轮先开价。四轮后总分高者获胜，2–2 为平局，不加赛。

界面、真实时间、动画、背景、屏幕尺寸和播放模式不得修改序列、合法报价、计分或胜负。不得新增倒计时、金币、下注、电脑玩家、连胜、排行榜、存档、分享、惩罚、羞辱性措辞或商业游戏相似声光表达。

## 2. 冻结文案与纪念物

### 2.1 默认文案

```text
标题：这一串，我还记得
副题：看过八件旧物，再把记得的数量报得更高。
开场：四轮里，你们各先开价两次。最高报价的人按顺序证明；全对自己得分，错一件或认输则对方得分。
自动模式：让旧物自己经过
手动模式：我们自己翻下一件
开始：开始看第一串
暂停：先停一下
继续：继续看这一件
下一件：收好，下一件
开价：我记得前 {amount} 件
退出：就到这里
证明：按顺序点出前 {amount} 件
撤回：撤回上一件
清空：重新摆
提交：就按这一串
认输：这轮认输
下一轮：换人先开价
总结果：看看四轮总分
重开：再记四轮
隐私：序列只在本机内存，刷新即清空
```

动态文案只能用 `textContent` 写入。玩家名、物件名、结语或配置文本均不得进入 `innerHTML`。

### 2.2 六件固定纪念物

逻辑 ID、编号、默认名称和形状语义冻结；颜色不是唯一识别方式：

| 编号 | ID | 默认名称 | 形状语义 | 默认强调色 |
| ---: | --- | --- | --- | --- |
| 1 | `ticket` | 旧车票 | 两端缺口的长票根 | `#d79a62` |
| 2 | `camera` | 小相机 | 方机身与圆镜头 | `#88a5ad` |
| 3 | `shell` | 海边贝壳 | 扇形放射纹 | `#d98484` |
| 4 | `key` | 房间钥匙 | 圆环与单齿 | `#c8ae68` |
| 5 | `mug` | 搪瓷杯 | 圆杯与侧把 | `#7da58b` |
| 6 | `map` | 折叠地图 | 三折锯齿轮廓 | `#8f83aa` |

生产界面使用同一张 ImageGen 原创纪念物图集切片；编号和名称保持代码原生，图集失效时以 CSS 轮廓占位、编号和名称继续完整游玩。

## 3. 文件合同

```text
experiences/versus/memory-bid/
├── index.html
├── styles.css
├── config.js
├── logic.js
├── logic.test.js
├── app.js
├── README.md
├── ATTRIBUTION.md
└── assets/
    ├── favicon.svg
    ├── keepsake-atlas.png
    └── auction-table.jpg
```

- `index.html` 以 `config.js → logic.js → app.js` 顺序加载经典脚本；
- `config.js` 和 `logic.js` 使用 UMD 风格：浏览器经典脚本挂载全局；本仓库因根 `package.json` 为 `type: module`，Node 测试以 dynamic import 执行后读取 `globalThis`；复制到 CommonJS 边界时保留 `module.exports`；
- 不使用 ESM、fetch、XHR、WebSocket、Worker、Service Worker、浏览器存储、CDN、外部字体、音频、摄像头、麦克风或传感器；
- 目录可单独复制，不读取仓库 `shared/`；
- 所有资源使用相对路径；图片失败时规则、文字、焦点与按钮仍完整；
- README 与 ATTRIBUTION 固定来源版本、许可证、权利主体、零复制范围、商业边界和 ImageGen 输入链。

## 4. 冻结常量、配置与公开 API

```js
VERSION = 1
ROUND_COUNT = 4
SEQUENCE_LENGTH = 8
MIN_BID = 2
MAX_BID = 8
ITEM_IDS = ["ticket", "camera", "shell", "key", "mug", "map"]
PHASES = ["intro", "reveal", "bidding", "proof", "round-result", "match-result"]
PLAYBACK_MODES = ["auto", "manual"]
PAUSE_REASONS = ["manual", "blur", "hidden"]
AUTO_ITEM_MS = 900
AUTO_GAP_MS = 250
FALLBACK_SEED = 0x6d2b79f5
```

`logic.js` 精确导出：

```js
VERSION
ROUND_COUNT
SEQUENCE_LENGTH
MIN_BID
MAX_BID
ITEM_IDS
PHASES
PLAYBACK_MODES
ACTION_TYPES
generateSequences(seed)
createInitialState(config)
sanitizeConfig(config)
reduceMemoryBid(state, action, config)
assertState(state)
getMemoryBidView(state, config)
summarizeMatch(state, config)
deepFreeze(value)
```

导出的常量、默认配置、状态、view、摘要和返回数组全部递归冻结且与调用方输入断开引用。

`config.js` 暴露完整冻结默认配置：

```js
{
  title,
  subtitle,
  intro,
  playerNames: ["你", "TA"],
  itemText: {
    ticket: { label: "旧车票", description: "去过的地方，留下一道缺口" },
    camera: { label: "小相机", description: "把一秒钟收进镜头" },
    shell: { label: "海边贝壳", description: "带回一小段潮声" },
    key: { label: "房间钥匙", description: "住过一晚的门牌记忆" },
    mug: { label: "搪瓷杯", description: "清晨一起喝过的热气" },
    map: { label: "折叠地图", description: "绕远也算旅程的一部分" }
  },
  defaultMatchNote
}
```

并暴露准备者可选策略：

```js
function composeMatchNote(summary) {
  // TODO（准备者可选，5–10 行）：按胜者或平局返回一段纯文本结语。
  return summary.defaultNote;
}
```

策略输入是冻结、无答案的摘要；异常、非字符串、空白或超长返回逐字段回退到 `defaultMatchNote`。

## 5. 确定性序列生成

`generateSequences(seed)` 只接受 `1..0xffffffff` 的安全整数，不接受 0、浮点、字符串、NaN、Infinity、额外参数或 getter 对象；非法输入抛 `TypeError`。

算法合同：

1. 使用冻结的 32 位 xorshift PRNG；不调用 `Math.random()`、时间或 Web Crypto；
2. 每轮先放入六个 `ITEM_IDS` 各一次；
3. 用拒绝采样从六件中无偏选出两个不同 ID，各追加一次；
4. 用拒绝采样驱动 Fisher–Yates 洗牌；
5. 若出现相邻相同，从左到右把后一件与其右侧第一个不会制造新相邻重复的位置交换；若右侧不存在，从左侧选择最近合法位置；
6. 生成恰好四轮，每轮八件、六种齐全、恰有两种出现两次、没有相邻相同；
7. 相同 seed 永远生成深相等结果；不同 seed 不承诺每次都不同，但测试固定一组已知向量。

UI 只在开始时用 `crypto.getRandomValues()` 生成非零 32 位 seed；不可用时采用 `FALLBACK_SEED`。Web Crypto 不进入 reducer，也不构成安全或公平性宣传。

## 6. Phase 与权威状态

### 6.1 精确状态形状

```js
{
  version: 1,
  phase,
  seed: null | uint32,
  playbackMode: null | "auto" | "manual",
  roundIndex,                 // 0..3
  revealIndex,                // reveal 时 0..7，其余为 0
  revealVisible,              // reveal 时有效
  revealPaused,               // reveal 时有效
  pauseReason,                // null | PAUSE_REASONS
  playbackGeneration,         // 非负安全整数，单调增加
  sequences: [],              // intro 为空；开局后恰好四轮
  bids: [],                   // 当前轮合法报价历史
  currentBid: null | 2..8,
  highBidderIndex: null | 0 | 1,
  activeBidderIndex: null | 0 | 1,
  proofDraft: [],
  scores: [0, 0],
  roundResults: [],
  announcementSerial,
  lastNotice
}
```

bid row：

```js
{ playerIndex: 0 | 1, amount: integer 2..8 }
```

round result：

```js
{
  roundIndex: 0..3,
  openerIndex: 0 | 1,
  bids: [bid row...],
  bidAmount: 2..8,
  proverIndex: 0 | 1,
  sequence: [itemId × 8],
  proof: [itemId × 0..8],
  forfeited: boolean,
  success: boolean,
  mismatchIndex: null | integer 0..7,
  pointWinnerIndex: 0 | 1,
  scoreAfter: [integer, integer]
}
```

- 正常提交时 `proof.length === bidAmount`，`forfeited === false`；全对时 `success === true` 且 `mismatchIndex === null`，否则 `mismatchIndex` 是首个错误位置；
- 主动认输时 `proof` 保存当时 0..bidAmount 项草稿，`forfeited === true`、`success === false`、`mismatchIndex === null`；
- 每个 result 恰好让 `pointWinnerIndex` 的累计分数增加 1；四轮分数和恒等于 4。

### 6.2 Phase 不变量

| phase | 当前轮私密数据 | 当前动作 | 公开条件 |
| --- | --- | --- | --- |
| intro | seed、mode、sequences 均空 | 选择模式并开始 | 无序列 |
| reveal | sequences 已封存 | 自动显隐/暂停或手动下一件 | 只公开当前可见一件 |
| bidding | 当前轮序列仍私密 | 严格升价或退出 | 不公开答案 |
| proof | 当前轮序列仍私密 | 组装前缀、提交或认输 | 不公开答案 |
| round-result | 当前轮已结算 | 查看对照、进入下一轮/总结果 | 只公开已结算轮 |
| match-result | 四轮已结算 | 查看摘要、重开 | 公开四轮结果 |

开价者唯一派生为 `roundIndex % 2`。进入 bidding 时 `activeBidderIndex` 是开价者；合法报价后切到对手。状态不接受调用方指定 opener、prover、得分或答案。

`assertState` 必须重算并验证 phase、四轮序列生成结果、报价轮换、最高报价者、证明前缀、首错、逐轮得分、累计分、先手、终局和平局；拒绝多余字段、非法 ID、伪造结果、提前公开、引用复用、错误 generation、跳轮、JSON 不安全值和原型污染对象。

## 7. Public actions

每个 action 只允许精确字段；缺字段、多字段、非法枚举、非法索引或非法数字抛 `TypeError`：

```text
START_MATCH { seed, playbackMode }
SHOW_REVEAL_ITEM { generation }
HIDE_REVEAL_ITEM { generation }
ADVANCE_MANUAL_REVEAL
PAUSE_REVEAL { reason }
RESUME_REVEAL
PLACE_BID { playerIndex, amount }
PASS_BID { playerIndex }
ADD_PROOF { itemId }
REMOVE_PROOF_SLOT { index }
CLEAR_PROOF
SUBMIT_PROOF
FORFEIT_PROOF
ADVANCE_ROUND
RESTART_MATCH
```

### 7.1 开始与展示

- `START_MATCH`：仅 intro 生效；校验 seed 与模式，生成四轮序列，进入 reveal，generation 加 1。auto 从遮挡开始，manual 从第 0 件可见开始；
- `SHOW_REVEAL_ITEM`：仅 auto reveal、未暂停、当前遮挡且 generation 精确匹配时显示当前件；
- `HIDE_REVEAL_ITEM`：仅 auto reveal、未暂停、当前可见且 generation 精确匹配时遮挡；若当前为第 8 件则进入 bidding，否则 index 加 1；每次合法显隐都增加 generation；
- `ADVANCE_MANUAL_REVEAL`：仅 manual reveal、未暂停且当前可见；第 1–7 件时先把当前件从 view 删除、index 加 1，再立即公开下一件；第 8 件后进入 bidding；每次增加 generation；
- `PAUSE_REVEAL`：仅 reveal 且未暂停，reason 只允许 `manual/blur/hidden`；立即从 view 删除当前物件、记录原因并增加 generation；
- `RESUME_REVEAL`：仅暂停 reveal；清原因并增加 generation。manual 重新完整显示同一件，auto 从同一件的遮挡状态重新开始；返回页面不会自动派发该动作；
- 任何旧 generation 回调、重复暂停/继续、错模式或错 phase 动作返回原引用。

页面 `visibilitychange` hidden 与 `blur` 只派发 `PAUSE_REVEAL`；清除所有 UI timer。可见/聚焦后必须由玩家点击继续，不自动恢复。

### 7.2 竞价

- 第一份报价只能由本轮 opener 发出，amount 为 2..8；无人报价时不能 PASS；
- 每次合法报价只能由 active bidder 发出，且严格大于 currentBid；成功后记录 bid、更新 high bidder，并把 active bidder 切到对手；
- 报到 8 时在同一 action 进入 proof，不再等待 PASS；
- `PASS_BID` 只在至少一份报价后由 active bidder 执行；同一 action 进入 proof，证明者是 high bidder；
- 平价、降价、越界、错误玩家、连续替自己报价或伪造字段抛 `TypeError`；结构合法但错 phase 返回原引用。

### 7.3 证明、结算与重开

- `ADD_PROOF`：仅 proof，草稿未达 bid 时追加合法 item ID；同一物件可重复；
- `REMOVE_PROOF_SLOT`：删除指定现有格并左移；合法但不存在的 index 返回原引用；
- `CLEAR_PROOF`：非空时清空；已空返回原引用；
- `SUBMIT_PROOF`：只在草稿长度恰等于 bid 时生效，比较原序列前缀，在同一 action 创建 result、给一方加 1 分并进入 round-result；长度不足返回原引用并置 `proof-incomplete` notice；
- `FORFEIT_PROOF`：proof 中随时生效，保存当前草稿，以失败结算并让对手得 1 分；
- `ADVANCE_ROUND`：第 1–3 轮 round-result 进入下一轮 reveal，清当前 bids/proof，按冻结模式从本轮第 0 件开始；第 4 轮 round-result 进入 match-result；
- `RESTART_MATCH`：仅 match-result 生效，回到与首次加载深相等的 intro；其他 phase 返回原引用，避免误触抹掉进行中比赛；
- match-result 除 RESTART 外所有结构合法 action 返回原引用。

未知 action、非对象、数组、getter 抛错、symbol、非普通原型或污染 key 抛 `TypeError`。所有合法状态上的非法动作不改变权威规则字段；只有明确的可恢复反馈可以增加 `announcementSerial`。

## 8. Public view 与隐私

UI 只能调用 `getMemoryBidView(state, config)`，不得直接读取权威 state：

- intro：标题、说明、玩家名与模式，不含 seed/sequences；
- reveal：轮次、当前序号、总数、暂停状态；仅 `revealVisible === true` 时返回单个 `currentItem`；
- bidding：轮次、分数、开价者、active bidder、合法可选金额、报价历史；不含 sequence、seed 或当前物件；
- proof：证明者、bid、候选纪念物和草稿；不含 sequence、正确前缀或匹配提示；
- round-result：本轮完整 sequence、proof、首错、得分与已完成轮次；不含未来轮；
- match-result：四轮摘要、总分、winnerIndex 或 null、tie、结语；不返回 seed。

阶段变化必须重建主区域。未公开序列不能留在 `hidden`、`aria-hidden`、`data-*`、注释、模板、CSS content、预加载 alt 或屏幕外 DOM。日志不得输出 state、seed、sequence 或 proof。

## 9. 前端与无障碍合同

- 每次 render 只用公开 view；所有交互为原生 `<button>`，不把 div 伪装成按钮；
- 物件始终同时显示编号、名称和图形，成功/失败同时显示文字与形状，不只靠颜色；
- `1–6` 只在 proof 阶段且非输入控件焦点时选择对应纪念物；Backspace 撤回末项；Escape 在 reveal 只暂停，在 proof 只清空且需按钮文案可见；
- 阶段切换后焦点落到新标题或首个合法主动作；状态变化进入 `aria-live="polite"`，错误使用可读文本；
- `prefers-reduced-motion` 取消装饰运动，但自动模式仍按同一 900/250 毫秒规则运行；选择手动模式可完全避免内容自动切换；
- `forced-colors` 下保留边框、编号、当前玩家和首错标记；
- 320×700、390×844、768×1024、1280×800 不出现横向溢出，主动作无需横向滚动；
- 图集和背景加载失败时，CSS 占位、编号、名称、按钮和结算可达性不变。

## 10. 逻辑与静态测试 Gate

### 10.1 逻辑测试

1. 常量、默认配置、导出对象与全部返回值递归冻结；
2. 相同 seed 生成相同四轮；每轮八件、六种齐全、两种不同重复、无相邻相同；
3. 非法 seed、偏置边界、畸形 config、getter、原型与额外字段均被拒绝或逐字段安全回退；
4. auto/manual 展示全路径、暂停/继续、hidden/blur、旧 generation、最后一件到 bidding；
5. 双方各两次先手；首次 2..8，之后严格升价，PASS 前置、错误席位、8 自动进入证明；
6. proof 追加、重复物件、按格撤回、清空、不足提交、全对、首错与主动认输；
7. 成功给证明者 1 分，失败/认输给对手 1 分；四轮后覆盖 4–0、3–1、2–2 与双方胜利；
8. intro/reveal/bidding/proof view 不泄露未来答案；round-result 只泄露当前已结算轮；
9. 相同 seed + action log、深克隆日志和 JSON 往返得到深相等终态；
10. 任意阶段畸形 state 安全拒绝，错阶段结构合法动作引用幂等，match-result 只允许重开；
11. config 文本 Unicode code point 截断、HTML 作为纯文本、结语策略异常/空白/越界回退；
12. 状态、view、摘要、result 和配置不共享调用方可变引用。

### 10.2 静态与浏览器 Gate

1. `file://` 经典脚本、相对资源和目录独立复制；
2. Network 为 0，无模块 MIME、CDN、联网/存储 API、共享目录或第三方运行时；
3. 自动展示暂停/继续、手动逐件、完整升价、PASS、8 自动证明、正确/错误/认输、四轮终局和重开；
4. 页面隐藏或失焦后物件立即离开 DOM，返回后不自动继续；
5. 320×700、390×844、768×1024、1280×800 无溢出或主动作裁切；
6. 键盘完成一整轮，焦点顺序、状态消息、非颜色信息、减少动态和强制颜色通过；
7. 背景与图集故障注入后仍可完整完成比赛；
8. 概念图和实际截图逐状态 `view_image` 对照，记录至少五项 fidelity ledger；
9. README、ATTRIBUTION、bugs、learn 与目录索引完整，固定来源和 ImageGen 输入链；
10. 临时服务器、浏览器会话、生成中间图和 QA 截图在最终提交前清理。

## 11. 借鉴声明冻结

最终 `ATTRIBUTION.md` 必须明确：

- 旅行纪念物题材、公开升价、四轮对称先手、证明责任、计分、状态机、中文文案、界面、测试和视觉资产均为独立原创；
- `sergiss/simon`、`lowssy/SimonColors`、`TimPietrusky/asdf`、`ooki/dnd_auction_game` 只用于研究序列播放、索引推进、键盘路径与结构化竞价；
- 没有复制、改写、翻译、移植、打包或依赖这些项目的代码、字段、测试、规则原句、页面、颜色、声音、图片、字体、图标或题材；
- 每个研究来源列出固定 commit、许可证和权利主体；根许可证不自动证明仓库内每个素材的权利，因此零素材复制；
- Hasbro 官方页面只用于确认商业名称与 trade dress 边界，本作不使用相关名称、四色圆盘、灯光节奏或声效；
- CodePen、教程、无清晰许可证仓库、商业云嵌入与应用商店截图未进入实现来源；
- ImageGen 概念图、背景和图集没有第三方图片输入；记录生成提示、生成文件、裁切/去背步骤和最终文件哈希。

## 12. 完成定义

本规格完成不等于作品完成。只有逻辑、前端、原创生产素材、目录接入、借鉴声明、bugs、learn、全量测试、浏览器路径、响应式、故障注入、视觉 fidelity 和清理都通过，并按“每个项目或部分一个提交”保留独立历史后，`memory-bid` 才可标记为完成。
