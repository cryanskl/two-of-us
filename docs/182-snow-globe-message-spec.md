# “雪停以后，是你”实现规格

规格日期：2026-07-21

对应调研：`docs/181-snow-globe-message-research.md`

目标目录：`experiences/surprises/snow-globe-message/`

启动等级：A（直接双击 `index.html`，无安装、服务、权限或公网）

## 1. 产品定义

这是一个给对象准备的有限单人惊喜。收礼者把雪球分别带向上、右、下、左，或直接点击四个方向按钮；四阵风任意顺序各收一次。风齐后，只有主动按下“让雪落下”才进入一次落定，雪花组成准备者配置的 9×11 点阵，随后创建昵称、标题、私信和署名。

页面固定公开题名：

> 等雪停下

作品名与默认 `finalTitle` 为“雪停以后，是你”。它属于 complete 后才创建的私密结果，完成前不得出现在 DOM、ARIA、attribute、Canvas text 或固定公开文案中。

固定说明：

> 把四阵风收进雪球里。等雪慢慢落下，会有一句话留在里面。

首版只做：

- 一个雪球拖动面；
- 上、右、下、左四个有限方向；
- 四个等价原生按钮；
- 一个主动落雪 Gate；
- 一次 token 化 settling；
- 一个可配置 9×11 点阵；
- 完成后才进入 DOM 的昵称、标题、私信与署名；
- 重新开始、降动效、forced-colors 和 Canvas 失败降级。

首版明确不做：

- DeviceMotion/DeviceOrientation、权限请求或“摇手机”提示；
- 左右交替次数、速度、力度、连击、计时、分数、失败或随机奖励；
- 权威粒子物理、碰撞、重力、浮点积分、WebGL、Worker 或第三方运行依赖；
- 字体转粒子、`fillText/getImageData` 文字采样、自动中文点阵；
- 音频、振动、摄像头、麦克风、定位、剪贴板、下载、分享或存储；
- 多图案选择、编辑器、历史、账号或联网。

## 2. 文件与职责

```text
experiences/surprises/snow-globe-message/
├── index.html
├── config.js
├── logic.js
├── logic.test.js
├── app.js
├── styles.css
├── README.md
└── assets/
    └── ATTRIBUTION.md
```

经典脚本顺序固定为 `config.js → logic.js → app.js`。不用 ES Module、dynamic import、bundler、运行时 fetch 或远程资源。

- `config.js`：称呼、9 行点阵、点阵说明、完成标题和私信；
- `logic.js`：配置快照、点阵目标、方向 helper、state validator、reducer 和 public view；
- `app.js`：Pointer 会话、四按钮、Canvas 表现、token 完成器、焦点和 live；
- `styles.css`：已接受视觉概念的响应式实现；
- `logic.test.js`：纯 Node、零 DOM/Canvas；
- README/ATTRIBUTION：玩法、配置、隐私、固定来源、许可证和零复制声明。

`logic.js` 使用浏览器全局/CommonJS 双出口；导入时不得访问 DOM、Canvas、crypto、Date、随机、timer、storage、network 或权限 API。

## 3. 冻结常量

```js
VERSION = 1
DIRECTIONS = ["up", "right", "down", "left"]
DIRECTION_LABELS = { up: "上", right: "右", down: "下", left: "左" }

GRID_ROWS = 9
GRID_COLUMNS = 11
MIN_ACTIVE_CELLS = 16
MAX_ACTIVE_CELLS = 72

COORD_SCALE = 1000
INNER_THRESHOLD = 100
OUTER_THRESHOLD = 260

TARGET_X_ORIGIN = 140
TARGET_X_STEP = 72
TARGET_Y_ORIGIN = 130
TARGET_Y_STEP = 78

DISPLAY_FLAKES = 72
SETTLE_DURATION_MS = 900
SETTLE_TIMEOUT_MS = 1400
MAX_REVISION = Number.MAX_SAFE_INTEGER
```

inner/outer 使用 `max(abs(dx), abs(dy))` 的正方形范数；不使用平方根、设备像素、Pointer 压力或事件时间。

## 4. 默认配置与 canonical 数据

```js
window.SNOW_GLOBE_MESSAGE_CONFIG = {
  recipient: "你",
  sender: "我",
  patternRows: [
    ".###...###.",
    "#####.#####",
    "###########",
    "###########",
    ".#########.",
    "..#######..",
    "...#####...",
    "....###....",
    ".....#....."
  ],
  patternLabel: "一颗由雪花拼成的心",
  finalTitle: "雪停以后，是你",
  finalNote: "风停下来的时候，我还是最想把这句话留给你。"
};
```

默认 `patternRows` 精确有 63 个 `#`。其 `JSON.stringify(patternRows)` SHA-256 固定为：

```text
8f09060956c7564b04df72eb464fa9f87dd9e5d6194d18d13d55d6bfccc9f270
```

默认 target 数组的 canonical JSON SHA-256 固定为：

```text
0091bf6cb08c824260f851918eb1323a0e7fb54a1e0637ec9656c5928dac81a1
```

测试从生产默认配置调用生产 `buildTargets` 后计算哈希，不维护第二份 target 答案。

## 5. 配置合同

`sanitizeConfig(candidate)` 只接受精确 own-data schema：

- 顶层精确 `recipient / sender / patternRows / patternLabel / finalTitle / finalNote`；
- object 原型精确为当前 realm 的 `Object.prototype`；
- `patternRows` 是当前 realm 原生 dense Array，精确 9 项，无 extra key、symbol、accessor、custom prototype 或自定义 iterator/map；
- 每行是精确 11 个 ASCII 字符，只能是 `.` / `#`，不 trim；
- active `#` 总数为 `16..72`；
- recipient/sender ECMAScript trim 后各 `1..12` Unicode code point 且不得相同；
- patternLabel trim 后 `2..32` code point；finalTitle `2..24` code point；
- finalNote trim 后 `1..180` code point，最多 4 行；允许 LF，拒绝 CR、U+2028/U+2029、C0/C1 其他控制字符和 lone surrogate；
- 其他字符串拒绝 CR/LF、U+2028/U+2029、C0/C1 控制字符和 lone surrogate；
- 任一项非法、trap 抛错或复制失败，整份使用默认配置，不做字段混搭。

文本处理顺序精确为：

1. descriptor.value 必须是 primitive string；
2. 在 raw UTF-16 code units 上先拒绝 lone surrogate 与该字段禁用的 control/line separator，不能先 trim；
3. 调用捕获的 ECMAScript `String.prototype.trim` intrinsic，得到清洗值；
4. 用 UTF-16 索引循环计数 Unicode code point：合法 surrogate pair 计 1，BMP code unit 计 1；不调用 iterator、`Array.from` 或 `Intl.Segmenter`；
5. finalNote 的行数精确为 `1 + 第 3 步所得清洗值中的 LF 数量`；再执行字段长度/行数范围；
6. recipient/sender 的不同判断使用清洗后的完整字符串。

返回递归冻结、与输入断开引用的纯数据 content。不得冻结、修改或复用调用方对象。

## 6. 点阵目标

公开 `buildTargets(patternRows)` 对输入执行与配置相同的严格 pattern 验证；非法返回 `null`。合法时按 row 0→8、column 0→10 遍历每个 `#`，active ordinal 从 0 开始：

```js
{
  id: `p${String(ordinal).padStart(2, "0")}`,
  x: 140 + 72 * column,
  y: 130 + 78 * row
}
```

返回按 row-major 排序的递归冻结 dense Array。不得返回 row、column、原始字符行或文本。

默认首尾点固定为：

```text
p00 = (212, 130)
p62 = (500, 754)
```

所有坐标是 `0..1000` 逻辑世界整数；Canvas、DPR 和 CSS 尺寸只投影，不改变 target。

## 7. 方向分类 helper

公开纯函数：

```js
classifyWindSample(latched, dx, dy)
```

输入只接受 boolean latched 与 `-1000..1000` 整数 dx/dy；非法返回 `null`。合法返回递归冻结：

```js
{ latched: boolean, direction: null | "up" | "right" | "down" | "left" }
```

算法冻结：

1. `reach = max(abs(dx), abs(dy))`；
2. 若 latched=true：reach≤100 时返回 `{latched:false,direction:null}`，否则保持 true/null；
3. 若 latched=false 且 reach<260：保持 false/null；
4. 否则 latch=true，并按主轴返回一个方向；
5. 仅当 `abs(dx) > abs(dy)` 时走水平：dx>0 为 right，否则 left；
6. 平局归垂直：dy>0 为 down，否则 up。

固定边界 fixture：

| latched | dx/dy | 结果 |
| --- | --- | --- |
| false | 259/0 | false/null |
| false | 260/259 | true/right |
| false | 259/260 | true/down |
| false | 260/260 | true/down |
| false | -260/-260 | true/up |
| true | 101/0 | true/null |
| true | 100/100 | false/null |

helper 不读取 winds，不决定重复方向是否计数；重复由 reducer 处理。

## 8. 浏览器坐标适配

pointerdown 先检查当前 public view 的 `canAddWind === true`，且不存在活动会话；非 gathering 阶段不 capture、不 `preventDefault`、不创建会话。随后读取并验证有限坐标与正数 `shortSide`，在 `try` 中成功执行 `setPointerCapture(pointerId)` 后，app 才冻结本会话：

```js
{
  pointerId,
  generation,
  anchorX,
  anchorY,
  shortSide,
  latched: false
}
```

`shortSide = min(rect.width, rect.height)`，必须是有限正数。每个 pointermove：

```js
dx = clamp(Math.trunc((clientX - anchorX) * 1000 / shortSide), -1000, 1000)
dy = clamp(Math.trunc((clientY - anchorY) * 1000 / shortSide), -1000, 1000)
```

- 只处理匹配 pointerId/generation 的有限坐标；
- 使用 pointerdown 时冻结的 rect/shortSide，resize 不改变当前会话判定；
- helper 返回 direction 时先更新 latch，再派 exact ADD_WIND；
- direction 已收集仍保持 latch，必须回 inner 才能再分类；
- 第四阵风使 state armed 后立即安全 release capture、清会话；
- pointerup/cancel/lost capture/blur/pagehide 清会话，不补方向；
- 不使用 movementX/Y、event 数量、coalesced/predicted events、pressure 或 Date。

app 维护单调递增的 `pointerGeneration`；准备成功、restart、离开 gathering、blur、pagehide 与显式清理都会使旧 generation 失效。render 发现 `canAddWind=false` 时，必须在 `try/catch` 中安全 release capture 并清会话；capture 失败也只清理，不派动作、不留下半会话。只有 `canAddWind=true` 时拖动面使用 `touch-action:none`，其他阶段恢复正常滚动。所有迟到的旧 generation 事件一律忽略。

pointer 会话只存在 app 内存，不进入 reducer、view、console、storage 或 action log。

## 9. createStartAction

公开 `createStartAction(rawConfig)` 是正常应用构造 START 的唯一入口：

1. 调用 sanitizeConfig，非法整份回默认；
2. 重新验证默认也必须成功，否则返回 null；
3. 返回递归冻结、断引用的 exact action：

```js
{
  type: "START",
  content: {
    recipient,
    sender,
    patternRows,
    patternLabel,
    finalTitle,
    finalNote
  }
}
```

它不访问 DOM、Canvas、时间、随机或权限。

## 10. 权威 state

精确 state：

```js
{
  version: 1,
  phase,
  content,
  winds: { up, right, down, left },
  settleToken,
  revision
}
```

初态：

```js
{
  version: 1,
  phase: "intro",
  content: null,
  winds: { up:false, right:false, down:false, left:false },
  settleToken: null,
  revision: 0
}
```

阶段不变量：

| phase | content | windCount | settleToken |
| --- | --- | ---: | --- |
| intro | null | 0 | null |
| gathering | 合法 | 0..3 | null |
| armed | 合法 | 4 | null |
| settling | 合法 | 4 | 等于当前 revision |
| complete | 合法 | 4 | null |

revision headroom 不变量：

- gathering：`revision <= MAX_REVISION - (6 - windCount)`，为剩余首次 ADD、BEGIN 和 COMPLETE 留空间；
- armed：`revision <= MAX_REVISION - 2`；
- settling：`revision <= MAX_REVISION - 1`；
- intro/complete 本身无未来承诺，但动作各自检查完整下一事务 headroom。

其他不变量：

- version 精确 1；revision 是 `0..MAX_REVISION` 安全整数；
- winds 是精确 own-data object，四键顺序与值固定；
- content 通过严格结构和值 validator；incoming state 不要求预先冻结，也不尝试判断其引用来源；
- state 不保存 target、Pointer、轨迹、粒子、Canvas、timer、Animation、RAF、Date、随机或权限状态。

“合法 state”只表示 snapshot 后的普通数据满足精确 schema、阶段和值不变量。`Object.isFrozen`、是否由本模块创建、是否曾与某 action 共用引用都不是可验证的合法条件。模块自己创建的初态和每个有效动作输出必须递归冻结、与调用方输入断开；JSON clone 的合法 state 仍是合法 state，遇到非法动作也返回该 clone 原引用。

## 11. Reducer 动作

公开 `reduce(state, action)`。有效动作返回全新递归冻结 state；合法 state 上非法/无效动作返回原引用；非法 state 返回全新初态。

### 11.1 START

action 精确 `{type:"START",content}`。仅 intro 且 `revision <= MAX_REVISION - 7` 接受：

- 严格验证并快照 action.content，不回退默认；
- phase=gathering；winds 全 false；settleToken=null；revision+1。

7 次空间精确对应 START + 四个首次 ADD + BEGIN_SETTLE + COMPLETE_SETTLE。

### 11.2 ADD_WIND

action 精确 `{type:"ADD_WIND",direction}`。仅 gathering 接受：

- direction 必须是四个固定 ID；
- 已收集方向返回原引用，不增加 revision；
- 首次方向置 true，revision+1；
- 新 count=4 时 phase=armed，否则仍 gathering；
- state headroom validator 保证整轮可完成。

### 11.3 BEGIN_SETTLE

action 精确 `{type:"BEGIN_SETTLE"}`。仅 armed 且 `revision <= MAX_REVISION - 2` 接受：

- phase=settling；
- `settleToken = revision + 1`；
- revision+1；
- 不读取 Canvas、动画、时间或 target 位置。

### 11.4 COMPLETE_SETTLE

action 精确 `{type:"COMPLETE_SETTLE",settleToken}`。仅 settling 且 token 精确匹配 state 接受：

- phase=complete；settleToken=null；revision+1；
- animation、timeout、hidden、pagehide、blur、reduced-motion 和 Canvas fallback 都只能派这一种动作。

### 11.5 RESTART

action 精确 `{type:"RESTART"}`。仅 complete 且 `revision <= MAX_REVISION - 8` 接受：

- 回到 intro，content=null，winds 全 false，settleToken=null；
- revision=旧 revision+1，不归零；
- app 在同一个“再看一次”click 内重新读取 window config、createStartAction 并派 START；
- 8 次空间对应 RESTART 加下一完整轮 7 次。

任何动作缺少 headroom 都返回原引用；不得溢出、饱和复用 token 或进入无法完成本轮的 phase。

## 12. Public view

公开 `getPublicView(state)`，是页面唯一规则来源：

```js
{
  phase,
  windControls: [
    { id:"up", label:"上", collected },
    { id:"right", label:"右", collected },
    { id:"down", label:"下", collected },
    { id:"left", label:"左", collected }
  ],
  collectedCount,
  progressText,
  missingLabels,
  canStart,
  canAddWind,
  canBeginSettle,
  canRestart,
  isSettling,
  settleToken,
  visibleTargets,
  patternLabel,
  recipient,
  sender,
  finalTitle,
  finalNote,
  revision
}
```

规则：

- invalid state 返回默认安全 intro view，不抛；
- windControls/missingLabels 始终由 state winds 与固定顺序投影，不由页面计算；
- progressText 是唯一主状态文案，由 view 冻结生成：intro 精确为 `正在把这只雪球准备好。`；gathering 精确为 `已收好 n / 4 阵风；还差：{missingLabels 按上、右、下、左顺序用“、”连接}`；armed 精确为 `四阵风都在了。准备好，就让雪落下。`；settling 精确为 `雪正在慢慢找到位置。`；complete 精确为 `雪已经停下，留言在这里。`；页面只渲染该字符串，不自行拼接；
- canStart 仅 intro 且 revision≤MAX-7；
- canAddWind 仅 gathering；canBeginSettle 仅 armed 且 revision≤MAX-2；
- canRestart 仅 complete 且 revision≤MAX-8；
- settleToken 仅 settling 公开，其他阶段 null；
- visibleTargets 仅 settling/complete 由 content.patternRows 调生产 buildTargets，其他阶段为空数组；
- patternLabel/recipient/sender/finalTitle/finalNote 仅 complete 公开，其他阶段精确 null；
- 不公开 patternRows、未来 point、config、Pointer、粒子、完整 content 或 action log；
- 返回值与嵌套数组/对象全部递归冻结、与 state 断开引用。

页面不得自行读取 config、计算方向完成数、拼进度或 missing label、构造 target、判断阶段或越过字段遮蔽。

## 13. Hostile input

state/action/config/content/patternRows/winds 全部遵守同一 snapshot 边界：

- object：精确 own string keys、当前 realm `Object.prototype`、data descriptors；
- array：当前 realm 原生 dense Array、精确索引+length、`Array.prototype`；
- 拒绝 null/custom prototype、array subclass、稀疏、extra key、symbol、accessor；
- 不调用输入 iterator/map/forEach/toJSON/valueOf/toString；
- 每层先一次性读取 `ownKeys/getOwnPropertyDescriptor/getPrototypeOf`，复制只消费 descriptor.value；
- snapshot trap 抛错即 fail closed；
- 合法 data-descriptor Proxy 即使 get late-throw，也不得触发 get；
- 字符串严格按第 5 节的 raw control/lone-surrogate → trim → code-point/line-count 顺序清洗；
- 数值先验证整数/安全范围，再加减、abs、索引或乘法；
- 不修改、冻结或复用调用方输入。

测试至少覆盖：config 顶层/嵌套 getter、symbol、extra、custom prototype；pattern sparse/subclass/custom iterator；state winds accessor；action direction object；revision MAX；Proxy descriptor 合法但 get late-throw；lone surrogate；finalNote 行数与控制字符。

## 14. 页面、输入与焦点

main 直接子级 DOM 顺序固定：

```text
页头 → 固定说明 → 雪球舞台 → 四方向按钮 → 进度状态
→ 完成结果 → 主动作 → 隐私说明 → live region
```

固定公开隐私说明精确为：

> 这只雪球只在本机运行，留言会在雪停后才出现。

它在所有 JavaScript 阶段与无 JavaScript 降级中可见，不读取或拼接配置字段，也不得改写为“已加密”“不会留在磁盘”等超出实际边界的承诺。

`progressText` 与主动作的固定阶段合同：

| phase | 主状态 | 主动作 |
| --- | --- | --- |
| intro | `正在把这只雪球准备好。` | 无；失败时 `重新准备` |
| gathering | `已收好 n / 4 阵风；还差…` | 四方向按钮 |
| armed | `四阵风都在了。准备好，就让雪落下。` | `让雪落下` |
| settling | `雪正在慢慢找到位置。` | `正在落下…`，`aria-disabled=true` |
| complete | `雪已经停下，留言在这里。` | `再看一次` |

主动作始终复用同一个 persistent native button：正常 intro/gathering 隐藏；准备失败的 intro 显示“重新准备”；armed 显示“让雪落下”；settling 保持同一节点并显示“正在落下…”、`aria-disabled=true`；complete 显示“再看一次”。

四方向按钮是 persistent native button：

- 只在 click 派 ADD_WIND，不在 pointerdown/touchend/keydown 派；
- `aria-pressed` 与可见 `已收好` 同步；重复 click reducer no-op；
- gathering 外使用 native disabled，但保留节点和方向顺序；若这次首次 ADD 使 armed，且焦点当前位于任一方向按钮，render 后必须把焦点移到已启用的“让雪落下”；来自 drag 且焦点不在方向组时不抢焦点；
- 每个至少 48×48px，焦点环使用 outline，不依赖阴影；
- 拖动面是 pointer-only 装饰控制，不自造 role、不进 Tab；真实说明和四按钮提供全部语义。

complete 才创建的结果子树必须精确为：

```text
section#final-message.result-letter
├── p#pattern-label.pattern-label[data-field="patternLabel"]
├── p.recipient-line：固定前缀“给 ” + span[data-field="recipient"]
├── h2#final-title[data-field="finalTitle"][tabindex="-1"]
├── p.final-note[data-field="finalNote"]
└── p.signature：固定前缀“——” + span[data-field="sender"]
```

五个配置字段各自只进入上述一个指定文本节点，以 `textContent` 写入；`finalNote` 用 `white-space:pre-line` 保留 LF。既有“雪球舞台”在 complete 时成为可见完成图案容器，设置 `role="img" aria-labelledby="pattern-label"`；其他阶段移除这两个 attribute。它不进入结果 section，Canvas 或 CSS grid 子层一律 `aria-hidden=true`。离开 complete 时整棵结果子树移除，`h2#final-title` 是唯一允许程序化聚焦的结果节点。

焦点：

- 正常 ADD 后保留刚点击按钮焦点；若来自 drag，不抢焦点；
- armed 后仅按上一条“方向按钮即将 disabled”规则修复焦点；其他来源不自动聚焦“让雪落下”；
- BEGIN 后主动作保留同一 button 节点和焦点，改为 `aria-disabled=true` 并由 click guard 拒绝重复动作，不设置 native disabled，不跳进 Canvas；
- 前台可见且窗口仍有焦点时，第一次接受 COMPLETE 后只把焦点移动一次到 `h2#final-title`；结果在 DOM 顺序上位于“再看一次”之前，因此下一次 Tab 可到达重播按钮；
- hidden/pagehide/window blur 触发的收尾绝不移动焦点，回到页面后也不补移；
- restart 并重新准备成功后，焦点落到第一个未收集方向按钮；
- visibility/blur 不主动抢回焦点。

### 14.1 浏览器准备流程

app 在首次 paint 前同步调用唯一的 `attemptPrepare()`。它只允许在 intro 且未运行时进入，并用 app-local reentrancy guard 拒绝重复点击：

1. 调用 `createStartAction(window.SNOW_GLOBE_MESSAGE_CONFIG)`；用户配置非法由 helper 整份回默认，不视为准备失败；
2. 返回合法 START 时 reduce/render gathering，清除失败提示并递增 `pointerGeneration`；
3. helper 返回 null 或抛错时仍停在 intro，app-local `preparationFailed=true`，在同一个进度状态节点以固定提示 `暂时没准备好，请重新准备。` 覆盖 view 的 intro `progressText`，并显示同一个主按钮“重新准备”；这是唯一允许的 app-local 状态文案覆盖，不得输出异常、配置或私密字段；
4. 重试仍走同一按钮、同一 guard 与同一路径；成功后聚焦第一个方向按钮，失败则保留焦点与提示；
5. complete 点击“再看一次”先派 exact RESTART，再调用同一个 `attemptPrepare()`；连续点击在 guard 期间 no-op。

`preparationFailed` 只属于 app，不进入 reducer、public view、storage 或 action log。

## 15. Canvas 与 settling 完成器

Canvas `aria-hidden=true`，生产前先绘制固定 72 枚装饰雪点，与配置 pattern/active 数无关；intro/gathering/armed 不读取 visibleTargets，因此不能提前推断点阵。

装饰雪点的初始坐标、大小和四方向雪旋可以按固定 index/revision 公式生成，但只属表现，不进入 state、view 或测试结果。不得使用 Math.random 生成需要重放的规则数据。

BEGIN_SETTLE 后：

1. 同步 reduce/render settling；
2. 从 view 读取 settleToken 与 visibleTargets；
3. 最多前 N 枚装饰雪点归位 N 个 target，剩余雪点落到底部；
4. rAF 只按 elapsed 绘制 900ms 表现，不派 tick action；
5. rAF 到时、1400ms timeout、hidden、pagehide、window blur、偏好切为 reduce、Canvas exception 任一先到，调用 `finishSettling(capturedToken, focusPolicy)`；
6. finish 先清 RAF/timer/listener，再派 exact COMPLETE_SETTLE；
7. 后到路径、旧 token、重复回调由 phase/token 同引用 no-op。

第一个被接受的前台完成路径只有在 `document.visibilityState === "visible"` 且 `document.hasFocus()` 时记录 `moveFocus=true`；hidden/pagehide/blur 一律传 false。render complete 仅在本次 action 被接受且 `moveFocus=true` 时聚焦结果标题。正常 rAF、前台 timeout、Canvas error 与 reduced-motion 快速完成可以聚焦；后台收尾返回页面后不补焦点。

Promise/Animation rejection 必须 catch；Canvas context null 或 draw 抛错直接走 token 化 microtask complete。不得用动画位置、像素采样或 elapsed 判断业务结果。

初始 `prefers-reduced-motion: reduce` 时，BEGIN 后用受 token 守卫的 microtask 完成；Canvas/CSS 直接显示静态点阵，不做风暴、摇屏、抛物、缩放、漂移、模糊或淡入。

## 16. Live、语义与降级

预先存在唯一：

```html
<p role="status" aria-live="polite" aria-atomic="true"></p>
```

- 首次方向：`收好一阵{方向}风。现在是 n / 4。`；
- 重复方向不写 live；
- armed：`四阵风都收好了。可以让雪落下。`；
- complete：`雪已经停下，留言已展开。`；不重复朗读整封私信；
- 同文本重播先以 token/revision 守卫的 microtask 清空再写，不能双播。

最终点阵同时有可见 patternLabel；Canvas 不作为唯一信息。forced-colors 使用 Canvas/CanvasText/ButtonText/Highlight 等系统色、真实 border、方向文字、✓ 与“已收好”；不依赖渐变、透明度、box-shadow 或颜色。

无 Canvas：完成时用 9×11 CSS grid 画 active cells，`aria-hidden=true`，真实 patternLabel/私信仍可读。无 JS：只显示公开 H1、固定说明、固定隐私说明、一个无语义静态雪球轮廓与 `请开启 JavaScript 后再收集四阵风`；隐藏方向按钮、进度、主动作与结果，不显示心形或声称已经解锁。

## 17. 隐私与安全

- `config.js` 与全部私密字段是本地磁盘明文，刷新不会删除；编辑/删除必须修改该文件；
- 运行时 content、winds、token 与 Pointer 会话只在内存，不写 localStorage/sessionStorage/IndexedDB；
- 应用不联网、不上传、不分析、不复制到剪贴板、不请求权限；
- complete 前不得把 recipient/sender/patternLabel/finalTitle/finalNote 从 config 注入结果 DOM、ARIA、attribute、Canvas text 或 console；固定公开文案不得复用默认 finalTitle；
- settling 前不公开 targets，complete 前不绘制任何文字；
- 动态文字只用 textContent，不使用 innerHTML/insertAdjacentHTML/字符串事件处理器；
- 不把 config、action log、Pointer、点阵或私信写入 URL、日志或错误消息。

## 18. 视觉与响应式 Gate

视觉方向暂定“冬夜桌上的玻璃雪球”：冷蓝玻璃、奶油雪点、深莓底座、少量暖金标签；不做圣诞品牌、商业贺卡、卡通角色或真实收藏雪球 trade dress。

完整视觉概念必须在用户确认 ImageGen 模型/质量/作用域后生成并接受；设计文档需提取 token、字体、组件、装饰资产、允许文案、移动重排和至少五项 fidelity ledger。未接受概念前不写生产页面。

响应式硬 Gate：

| 视口 | 必须通过 |
| --- | --- |
| 1504×1046 | 标题、说明、雪球、四方向、主动作同屏；无横纵滚 |
| 1280×800 | 雪球、四方向与主动作同屏；无横向滚 |
| 768×1024 | 雪球居中、2×2 按钮、状态完整 |
| 390×844 | 雪球 280–320px；2×2 按钮≥48px |
| 320×568 | 雪球 240–264px；允许纵滚、零横溢 |
| 844×390 | 雪球约 210px；控制侧置/下置，不锁方向 |

另在 1280×800 与 1504×1046 做 200%，在 1280 宽做 400% zoom；检查合法最大文案、safe-area、焦点环、按钮中心 elementFromPoint、无图/无 Canvas、reduced、forced-colors、零横向溢出、console 与 network。

## 19. 借鉴与许可证声明

开源借鉴层必须固定以下事实和零复制范围：

- [tsParticles `627b3fc7d1a0d0fe524e2fea5f89fa7589b18d59`](https://github.com/tsparticles/tsparticles/commit/627b3fc7d1a0d0fe524e2fea5f89fa7589b18d59)，[MIT](https://github.com/tsparticles/tsparticles/blob/627b3fc7d1a0d0fe524e2fea5f89fa7589b18d59/LICENSE)，`Copyright (c) 2020 Matteo Bruni`；只参考雪花表现状态分层与统一清理，不复制源码/API/配置/默认参数/预设/素材/依赖；
- [canvas-text-particle `9ee144a548aad85275318b30891c71dcf6e10f7b`](https://github.com/dango0812/canvas-text-particle/commit/9ee144a548aad85275318b30891c71dcf6e10f7b)，[ISC](https://github.com/dango0812/canvas-text-particle/blob/9ee144a548aad85275318b30891c71dcf6e10f7b/LICENSE)，`Copyright (c) 2026, dango0812`；只参考粒子 ID 到目标点抽象，本作明确不用文字 Canvas/alpha 采样，不复制源码/公式/字体/参数/演示；
- [canvas-confetti `20eebad51dde793070c373d594099a7ed8d96e22`](https://github.com/catdad/canvas-confetti/commit/20eebad51dde793070c373d594099a7ed8d96e22)，[ISC](https://github.com/catdad/canvas-confetti/blob/20eebad51dde793070c373d594099a7ed8d96e22/LICENSE)，`Copyright (c) 2020, Kiril Vatev`；只参考 reduced-motion 跳过表现仍完成结果与动画清理，不复制物理/Worker/Promise/参数/形状/素材；
- [W3C Device Orientation and Motion `70d42d5484db7fd1646e48cc17caa5ff1c9d92cb`](https://github.com/w3c/deviceorientation/commit/70d42d5484db7fd1646e48cc17caa5ff1c9d92cb)，[W3C Software and Document License 2023](https://www.w3.org/copyright/software-license-2023/)，由仓库贡献者授权；用于确认权限/隐私边界并排除设备动作，不复制规范示例/措辞；
- `alexgibson/shake.js` 固定 commit [`d232eee7a5f31e9fd37aa79aa83f1f206035ccc9`](https://github.com/alexgibson/shake.js/commit/d232eee7a5f31e9fd37aa79aa83f1f206035ccc9)：[`package.json`](https://github.com/alexgibson/shake.js/blob/d232eee7a5f31e9fd37aa79aa83f1f206035ccc9/package.json) 声称 MIT，但 GitHub License API 为 `NOASSERTION`；其 [LICENSE.md](https://github.com/alexgibson/shake.js/blob/d232eee7a5f31e9fd37aa79aa83f1f206035ccc9/LICENSE.md) 加入没有对应下文的 `except as noted below`。作为排除项，不复制或依赖；NextParticle、无许可证 CodePen/Gist、远程雪花图/字体/音效与商业 trade dress 全排除。

生产代码、点阵、UI、文案与图形独立实现；零第三方运行依赖。ImageGen 资产逐项记录提示词、日期、尺寸、格式、SHA-256 和第三方输入“无”。

声明分两层：README 为以上每个固定开源项目提供来源、commit、许可证、借鉴摘要与零运行依赖声明，并另列用于校准交互与无障碍的 [Pointer Events](https://www.w3.org/TR/pointerevents/)、[WCAG 2.5.7 Dragging Movements](https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements.html)、[WCAG 2.5.4 Motion Actuation](https://www.w3.org/WAI/WCAG22/Understanding/motion-actuation.html)、[WCAG 2.3.3 Animation from Interactions](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html)、[WCAG 1.3.1 Info and Relationships](https://www.w3.org/WAI/WCAG22/Understanding/info-and-relationships.html) 与 [WCAG 1.4.10 Reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html)；`assets/ATTRIBUTION.md` 再完整展开许可证、版权、实际借鉴和排除边界。标准页必须明确不是代码、素材或运行依赖。

## 20. 纯逻辑测试矩阵

至少覆盖：

1. 默认配置、pattern hash、63 active、target hash、p00/p62；
2. config exact schema、raw control/lone surrogate → trim → code point/行数的固定顺序、pattern 行列±1/字符/active 边界、整份回退；
3. buildTargets row-major、ID padding、坐标、冻结/断引用、非法 null；
4. direction helper 全边界、垂直 tie、inner/outer hysteresis、非法整数；
5. 初态、START 与四方向 24 种排列全部唯一进入 armed；
6. 重复方向同引用、非法方向/action extra/symbol/accessor 拒绝；
7. BEGIN/COMPLETE 正确 token、错/旧 token、重复完成、错误 phase；
8. RESTART revision 不归零；START/各阶段/RESTART headroom 边界；
9. hostile ready/gathering/armed/settling 不足 headroom 判 invalid，转换永不产生半途锁死；
10. public view 每阶段 collected/missing/progressText/can flags；穷举 16 个 winds 子集验证固定顺序与精确进度文案；settling 只 targets；complete 前五个私密字段全 null；
11. invalid state 安全 intro view；invalid state reduce 全新初态；合法 state+非法 action 原引用；JSON clone 合法 state 仍合法且 no-op 返回 clone 原引用；
12. descriptor snapshot/Proxy/get late-throw、array subclass/custom iterator、winds accessor 等 hostile 矩阵；
13. action log 与 JSON clone log 重放到字节等价 complete state/view；
14. 生产 logic 无 DOM/Canvas/random/Date/timer/network/storage/permission/HTML sink。

## 21. 浏览器与目录验收

浏览器：

- 首次准备、非法用户配置整份默认、helper null/throw、稳定失败提示、同按钮重试、reentrancy guard 与 restart→prepare 同路径；
- 真实 `file://` 仅靠 Pointer 完成 up/right/down/left；outer/inner、对角 tie、重复、第二指、cancel/lost capture；
- 非 gathering 的 pointerdown 不 capture/不阻止滚动；capture 失败无半会话；离开 gathering 释放；旧 generation 迟到事件 no-op；
- 仅靠四按钮的 click/tap/Enter/Space，以 24 种顺序抽样完成；与 pointer golden sequence state 等价；
- 第四次 Enter/Space 后 activeElement 是“让雪落下”；BEGIN 后 settling 期间仍是同一主按钮；前台 complete 后唯一转到结果标题且下一次 Tab 到“再看一次”；hidden/pagehide/blur 收尾与返回后都不移动焦点；
- 四风齐不自动揭晓，只有“让雪落下”进入 settling；
- rAF/timeout/hidden/pagehide/blur/reduced/Canvas error 多路径只 COMPLETE 一次；旧 token/重开回调 no-op；
- 使用互不包含、也不出现在固定公开文案中的 sentinel 配置（recipient=`小雪-X7`、sender=`北风-Q2`、patternLabel=`图案-P9`、finalTitle=`标题-T4`、finalNote=`留言-N6`）：complete 前五值在 DOM/ARIA/attribute/Canvas text/console 为 0；complete 后各自只进入指定结果文本节点一次；Canvas 从未 fillText；
- complete 结果 section 精确五个直接子节点、固定前缀、LF 保留；既有雪球舞台只在 complete 取得 `role=img` 并关联 patternLabel，restart 后移除 role/关联和整棵结果子树；
- settling 前不含 target 坐标/点阵 data 属性；开局固定 72 雪点与 config active 无关；
- Canvas null/throw 用 CSS 点阵完成；无 JS 不伪造完成；
- 禁用 JavaScript 后只出现冻结的五项静态内容，不含方向按钮、进度、主动作、心形或结果；
- 单一 live、焦点、aria-pressed、≥48px、forced-colors、reduced-motion；
- 六档视口、200%/400% zoom、最大合法文案、safe-area、零横溢；
- 零 console error/warning、零公网/失败请求、零 storage/permission。

目录/全仓：

- experience.json exact schema：A、surprise、1 人、offline；
- catalog 入口、分类、计数、搜索、无 remote/Module/fetch/storage；
- README/ATTRIBUTION 固定来源、许可证、版权、零复制与排除项；
- 项目 logic test、catalog test、`npm test`、`npm run verify` 全绿；
- bug 写入 `bugs/`，包含环境、复现、预期、实际、根因、修复与回归证据；
- 至少把“四方向集合与粒子表现解耦”“分阶段私密 view”沉淀到 `learn/`；
- 调研、规格、视觉、逻辑、接口、bug、catalog、learn、verification 各自独立提交。

## 22. 学习贡献点

实现时在 `config.js` 把默认 `patternRows` 保留为 9 行，并加 5–10 行 TODO 注释。它是用户可以真正贡献的业务核心：

- 每行精确 11 个 `.` / `#`；
- 共 9 行；
- `#` 总数 16–72；
- 可以画首字母、月亮、星星或两人的符号；
- 不改也能完整游玩，错误会整份安全回默认。

邀请用户只改这 9 行，不让用户承担 boilerplate、状态机、Pointer、token 或输入验证。
