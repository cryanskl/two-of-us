# “把愿望，放到夜空里”实现规格

规格日期：2026-07-21

对应调研：`docs/183-wish-fireworks-research.md`

输入修复记录：`bugs/2026-07-21-wish-fireworks-reduced-motion-double-activation.md`

目标目录：`experiences/surprises/wish-fireworks/`

启动等级：A（直接双击 `index.html`，无安装、服务、权限或公网）

## 1. 产品定义

这是一个给对象准备的有限单人惊喜。收礼者连续点燃三束烟火，每束必定成功，并按配置顺序形成一个 9×9 点阵字。默认三字为“我 / 爱 / 你”；第三字落定后才创建完整三字、称呼、私人标题、留言和署名。

页面固定公开题名：

> 今晚，点三束光

页面固定说明：

> 按住蓄光，松开就会发射；也可以选好高度后直接点燃。每一束都会成功。

首版只做：

- 一个 intro 与主动开始 Gate；
- 三个固定顺序的 9×9 点阵字；
- 一个按住/松开入口；
- 一个原生五档高度 select 与一个直接点燃入口；
- 五档爆点高度，任何档位都成功；
- 三次有限、token 化的上升、成字、保持和淡出；
- 已公开字列、束数、最终私信与重新开始；
- reduced-motion、forced-colors、Canvas 失败与 Pointer Events 缺失降级。

首版明确不做：

- 随机、无限点击、自动连放、循环背景烟花、常驻 RAF；
- 瞄准、角度、命中、碰撞、失败、分数、生命、排行榜或节奏窗口；
- 粒子物理积分、WebGL、Worker 或第三方运行依赖；
- 字体采样、`fillText/getImageData` 或任意文本自动转点阵；
- 音频、振动、权限、设备传感器、摄像头、麦克风、定位；
- 全屏白闪、flicker/twinkle/strobe、饱和红爆闪、屏幕震动或多重快速子爆；
- 编辑器、导出、截图、分享、账号、存储、分析或联网。

## 2. 文件与职责

```text
experiences/surprises/wish-fireworks/
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

- `config.js`：称呼、三份 9×9 点阵、点阵说明、最终标题与私信；
- `logic.js`：配置快照、蓄力量化、目标与表现帧、state/action validator、reducer 和 public view；
- `app.js`：Pointer/click generation、select、Canvas/CSS 表现、token 完成器、焦点、live 与环境降级；
- `styles.css`：已接受视觉概念后的响应式实现；
- `logic.test.js`：纯 Node、零 DOM/Canvas；
- README/ATTRIBUTION：玩法、配置、隐私、固定来源、许可证、排除项和零复制声明。

`logic.js` 使用浏览器全局/CommonJS 双出口；导入时不得访问 DOM、Canvas、crypto、Date、random、performance、timer、storage、network 或权限 API。

生产视觉实现仍受统一 ImageGen 概念确认 Gate 约束；本规格只冻结规则、数据、生命周期和验收，不视为视觉概念已获接受。

## 3. 冻结常量

```js
VERSION = 1
GLYPH_COUNT = 3
GLYPH_ROWS = 9
GLYPH_COLUMNS = 9
MIN_ACTIVE_CELLS = 16
MAX_ACTIVE_CELLS = 48

WORLD_SCALE = 1000
ROCKET_START_X = 500
ROCKET_START_Y = 900
TARGET_X_ORIGIN = -240
TARGET_Y_ORIGIN = -240
TARGET_STEP = 60

CHARGE_QUANTUM_MS = 50
MAX_HOLD_MS = 950
MIN_CHARGE_UNITS = 1
MAX_CHARGE_UNITS = 20
CHARGE_UNITS_BY_BAND = [4, 8, 12, 16, 20]
DEFAULT_CHARGE_BAND = 2
APEX_Y_BY_BAND = [430, 390, 350, 310, 270]

ASCENT_TICKS = 48
FORMATION_TICKS = 24
HOLD_TICKS = 36
FADE_TICKS = 12
TOTAL_PRESENTATION_TICKS = 120
ANIMATION_DURATION_MS = 1000
ANIMATION_TIMEOUT_MS = 1500
ALPHA_SCALE = 1000

MAX_REVISION = Number.MAX_SAFE_INTEGER
```

五档 select 的 value/文字/units 固定：

| value / band | 可见文字 | canonical units | apexY |
| ---: | --- | ---: | ---: |
| `0` | 低 | 4 | 430 |
| `1` | 较低 | 8 | 390 |
| `2` | 中 | 12 | 350 |
| `3` | 较高 | 16 | 310 |
| `4` | 高 | 20 | 270 |

选项文字和束数必须存在，不能只靠颜色或进度条表达。

## 4. 默认配置、点阵与 canonical hash

```js
window.WISH_FIREWORKS_CONFIG = {
  recipient: "你",
  sender: "我",
  glyphs: [
    {
      id: "g0",
      label: "我",
      rows: [
        "..###....",
        "...#.....",
        "########.",
        "...#..#..",
        ".#####...",
        "...#.#...",
        "..##..#..",
        ".#.#...#.",
        "#..#....#"
      ]
    },
    {
      id: "g1",
      label: "爱",
      rows: [
        "..#####..",
        "...#.#...",
        ".#######.",
        ".#.....#.",
        "..#####..",
        "....#....",
        "...###...",
        "..#...#..",
        ".#.....#."
      ]
    },
    {
      id: "g2",
      label: "你",
      rows: [
        ".#..#....",
        ".#...#...",
        "##.#####.",
        ".#.#...#.",
        ".#...#...",
        ".#..###..",
        ".#.#.#.#.",
        ".#.#.#.#.",
        "#..#...#."
      ]
    }
  ],
  patternLabel: "烟火写出的三个字",
  finalTitle: "这三束光，都想送给你",
  finalNote: "愿望写完了，但我还想和你一起看很多很多次夜空。"
};
```

active count 固定：`g0=30 / g1=29 / g2=31`。

Canonical 口径：生产 validator 先创建普通、断引用、固定属性顺序的数据；测试再对原生 `JSON.stringify(value)` 的 UTF-8 字节做 SHA-256，不加 BOM、空格、缩进或末尾换行，不调用输入对象的 `toJSON`。生产逻辑不需要 crypto。

属性顺序固定：

```text
config: recipient, sender, glyphs, patternLabel, finalTitle, finalNote
glyph: id, label, rows
target: id, x, y
```

| Canonical 数据 | SHA-256 |
| --- | --- |
| `g0.rows` | `12767751bbb49a68fc6e2be36f5d8efd0f87619395136c5f7df16eb336f5fc8b` |
| `g1.rows` | `f7d71da102bbf70465f8f67ee721051aff0672f73b80cd68cd1b3abe443ad026` |
| `g2.rows` | `b29b2fc488004ce2252c858f5dd4e94ff845ec263bdbee8bf7759bf187d0dbe0` |
| `glyphs` | `2486a3253e586bddd69549d2628087ee61999f87e4c6a200c4062e7c721c0d10` |
| 完整默认 config | `18cf4cc536e8653e81ca83be6df101f2b1a2918b794fafb28eca5a5f135def92` |
| 三字默认 band 2 target 数组 | `cbac1979ddab2aab39ec30e91d5a77bc8e87bbb2e8d23f35844ad36815c50e8a` |

测试必须从生产默认配置调用生产 validator 与 `buildTargets(rows, 2)` 后计算哈希，不能维护第二份完整 target 答案。

## 5. 配置合同

`sanitizeConfig(candidate)` 只接受精确 own-data schema：

- 顶层精确 `recipient / sender / glyphs / patternLabel / finalTitle / finalNote`；
- 顶层与 glyph object 原型精确为当前 realm 的 `Object.prototype`；
- 只接受精确 own string keys 与 data descriptor；拒绝 extra、symbol、accessor、custom/null prototype；
- `glyphs` 是当前 realm 原生 dense Array，精确三项，无 extra key、symbol、accessor、自定义 prototype/iterator/map；
- glyph 精确 `id / label / rows`；ID 依次只能是 `g0 / g1 / g2`；
- `rows` 是当前 realm 原生 dense Array，精确九项；每行是 primitive string，精确九个 ASCII 字符且只能是 `.` / `#`，不 trim；
- 每个 glyph 的 `#` 数为 `16..48`；
- label 清洗后精确一个 Unicode code point，三项互不相同；
- recipient/sender 清洗后各 `1..12` code point 且完整字符串不得相同；
- patternLabel 清洗后 `2..32`；finalTitle `2..32`；
- finalNote 清洗后 `1..180` code point，最多四行；
- 任一项非法、trap 抛错或复制失败，整份使用默认配置，不做字段混搭；
- 返回递归冻结、与输入断开引用的纯数据 content；不得冻结、修改或复用调用方对象。

文本处理顺序固定：

1. descriptor.value 必须是 primitive string；
2. 在 raw UTF-16 code units 上先拒绝 lone surrogate 和该字段禁用的字符；
3. finalNote 允许 LF，但拒绝 CR、U+2028/U+2029 和其他 C0/C1；其他文本拒绝 CR/LF、U+2028/U+2029 与 C0/C1；
4. 调用捕获的 ECMAScript `String.prototype.trim` intrinsic；
5. 用 UTF-16 索引循环计数 Unicode code point，合法 surrogate pair 计一，BMP code unit 计一；不用 iterator、`Array.from` 或 `Intl.Segmenter`；
6. finalNote 行数为清洗值中的 LF 数量加一；
7. 再执行字段长度、label 唯一和 recipient/sender 不同判断。

`createStartAction(rawConfig)` 是正常应用构造 START 的唯一入口：先 sanitize，非法整份回默认；默认也必须重新通过内部 validator；返回递归冻结、断引用的 `{type:"START",content}`，否则返回 null。START reducer 本身只严格验证 action content，不做默认回退。

README 必须提供一个可选的九行学习入口：准备者可以只替换任意一个 glyph 的九行 `.` / `#`，运行测试观察 active count、hash 与 target 如何变化；不得要求用户修改状态机或隐私 Gate。

### 5.1 通用 hostile snapshot 合同

config、state、action、glyph、rows、currentShot 等所有公开 object/array 输入共用一个实现级合同：

1. 模块初始化时捕获 `Reflect.getPrototypeOf`、`Reflect.ownKeys`、`Reflect.getOwnPropertyDescriptor`、`Array.isArray` 等 intrinsic；每次反射调用只尝试一次，任何 Proxy trap 抛错都立即令整项非法；
2. object 原型必须精确为当前 realm `Object.prototype`；array 必须同时满足捕获的 `Array.isArray(value)` 与原型精确为当前 realm `Array.prototype`；
3. object 只允许合同列出的 string own keys，拒绝 symbol、extra、accessor；array 只允许连续索引与普通 `length`，必须 dense，拒绝 extra、symbol、accessor、custom iterator/map；
4. 每个字段只从捕获的 own property descriptor 的 `value` 读取，绝不执行 `value[key]`、getter、spread、iterator、Array method、`toJSON`、`valueOf` 或输入对象的方法；
5. 按固定属性顺序递归复制到全新的普通 object/array，再只验证这份 snapshot；不得冻结、修改或复用调用方对象；
6. 有效输出递归冻结且断引用。合法数据 Proxy 只有在全部反射结果都满足上述合同且 trap 不抛错时才可被接受；后续普通 `get` trap 不得被触发。

`reduce(state, action)` 必须先 snapshot/验证 state：合法 state 加非法 action 返回原 state 引用；非法 state 不读取 action，直接返回一次全新的 canonical 初态。`getPublicView` 的非法 state 也从同一新初态构造安全 view。

## 6. 蓄力量化 helper

公开纯函数：

```js
quantizeHold(startMs, endMs)
```

只接受非负 safe integer；`endMs < startMs`、fraction、NaN、Infinity、负数、超出 safe integer 或对象均返回 null。app 必须在调用前验证 `performance.now()` 为有限非负数并 `Math.trunc`，logic 不做隐式数值转换。

算法固定：

```text
elapsedMs = min(endMs - startMs, 950)
chargeUnits = 1 + floor(elapsedMs / 50)
chargeBand = floor((chargeUnits - 1) / 4)
apexY = APEX_Y_BY_BAND[chargeBand]
```

合法返回递归冻结：

```js
{ elapsedMs, chargeUnits, chargeBand, apexY }
```

固定 fixture：

| elapsed | units | band | apexY |
| ---: | ---: | ---: | ---: |
| 0 | 1 | 0 | 430 |
| 49 | 1 | 0 | 430 |
| 50 | 2 | 0 | 430 |
| 199 | 4 | 0 | 430 |
| 200 | 5 | 1 | 390 |
| 399 | 8 | 1 | 390 |
| 400 | 9 | 2 | 350 |
| 599 | 12 | 2 | 350 |
| 600 | 13 | 3 | 310 |
| 799 | 16 | 3 | 310 |
| 800 | 17 | 4 | 270 |
| 949 | 19 | 4 | 270 |
| 950 / 5000 | 20 | 4 | 270 |

`chargeBandFromUnits(units)` 只接受整数 `1..20`，返回 `0..4`；非法返回 null。`directUnitsForBand(band)` 只接受整数 `0..4`，返回 `[4,8,12,16,20][band]`；非法返回 null。DOM select 的非法值由 app 原子回退到 band 2 / units 12。

## 7. 点阵目标

公开：

```js
buildTargets(rows, chargeBand)
```

rows 使用配置合同中相同的严格 9×9 验证；chargeBand 只接受整数 `0..4`。非法返回 null。合法时按 row 0→8、column 0→8 遍历 `#`，ordinal 从零开始：

```js
dx = -240 + 60 * column
dy = -240 + 60 * row

{
  id: `p${String(ordinal).padStart(2, "0")}`,
  x: 500 + dx,
  y: APEX_Y_BY_BAND[chargeBand] + dy
}
```

返回递归冻结、dense、断引用的 row-major 数组；不返回 row、column、raw rows、label 或 glyph ID。

全局边界：x=`260..740`；band 0 y=`190..670`；band 4 y=`30..510`；所有坐标均为安全整数且在 `0..1000`。

默认 band 2：

| glyph | count | 首点 | 尾点 | target SHA-256 |
| --- | ---: | --- | --- | --- |
| g0 / 我 | 30 | `p00=(380,110)` | `p29=(740,590)` | `f40bbf74c83c28955d873a855d545dfb4d8bc566fffd32dc5d198670758d7978` |
| g1 / 爱 | 29 | `p00=(380,110)` | `p28=(680,590)` | `789acce9eae0f13c7bd3436238183595fe3d68ad82bff36394a3c915f6c3e530` |
| g2 / 你 | 31 | `p00=(320,110)` | `p30=(680,590)` | `953b130d90e674e927b7fe295c5ac2cebd2c9865e310e7e42e330de4ba57b181` |

## 8. 整数表现帧

内部舍入冻结为“最近整数、正负半值远离零”：

```js
roundDivSigned(n, d) {
  const half = Math.floor(d / 2);
  return n >= 0
    ? Math.floor((n + half) / d)
    : -Math.floor((-n + half) / d);
}

lerpInt(a, b, k, n) {
  return a + roundDivSigned((b - a) * k, n);
}
```

只对本规格的小整数调用；d 必须是正 safe integer，所有中间乘积必须是 safe integer。

`presentationTick(startMs, nowMs)` 接受非负 safe integer 且 `nowMs≥startMs`，否则 null：

```text
elapsedMs = min(nowMs - startMs, 1000)
tick = min(120, floor(elapsedMs * 120 / 1000))
```

固定时间 fixture：

```text
0→0, 399→47, 400→48, 599→71, 600→72,
899→107, 900→108, 950→114, 999→119, 1000/5000→120
```

公开 `getPresentationFrame(rows, chargeUnits, tick)` 只接受合法 rows、units `1..20` 与 tick `0..120`，非法返回 null。合法返回递归冻结：

```js
{
  phase: "ascent" | "formation" | "hold" | "fade",
  rocket: null | { x, y },
  points: [{ id, x, y, alpha }]
}
```

阶段固定：

- tick `0..47` ascent：rocket x=500，y 从 `(500,900)` 向 `(500,apexY)` 插值；points=[]；
- tick `48..72` formation：rocket=null；每个 point 从爆点向 `buildTargets` 目标插值，alpha=1000；
- tick `73..108` hold：point 在 target，alpha=1000；
- tick `109..120` fade：位置不变，`alpha=1000-roundDivSigned(1000*(tick-108),12)`；
- 不返回 label、rows、future glyph 或业务完成标志。

g0 / band 2 golden：

| tick | 结果 |
| ---: | --- |
| 0 | rocket `(500,900)` |
| 24 | rocket `(500,625)` |
| 47 | rocket `(500,361)` |
| 48 | p00/p29 都在爆点 `(500,350)` |
| 60 | p00 `(440,230)`；p29 `(620,470)` |
| 72 | p00 `(380,110)`；p29 `(740,590)` |
| 73 / 108 | target 不变，alpha=1000 |
| 114 | target 不变，alpha=500 |
| 120 | target 不变，alpha=0 |

表现 tick、alpha、rocket/point 坐标都不进入 reducer，不由粒子是否到位决定 COMPLETE。

## 9. State 与不变量

精确 state：

```js
{
  version,
  phase,
  content,
  completedCount,
  currentShot,
  revision
}
```

| phase | content | completedCount | currentShot |
| --- | --- | ---: | --- |
| intro | null | 0 | null |
| ready | 合法 content | 0..2 | null |
| bursting | 合法 content | 0..2 | `{index,chargeUnits,burstToken}` |
| complete | 合法 content | 3 | null |

所有标量都禁止 coercion 与 boxed primitive：`version` 必须是 primitive number `1`；`phase` 必须是表内 primitive string；`completedCount` 必须是与 phase 行一致的非负 safe integer；`revision` 必须是 `0..Number.MAX_SAFE_INTEGER` 的 safe integer。content 只能是 null 或通过第 5.1 节 snapshot 的合法 content。

bursting 额外要求：

- `currentShot.index` 是非负 safe integer 且 `=== completedCount`；
- chargeUnits 是 primitive safe integer `1..20`；
- `burstToken` 是非负 safe integer且 `=== revision`；
- currentShot 精确 own-data schema，无 derived band/apex 或额外键。

Incoming state 经 hostile snapshot 后只要求结构、值与下节 headroom 合法，不要求 frozen；JSON clone 的合法 state 仍合法。不得试图验证“是否由本模块创建”。模块创建的初态、有效动作输出和 public view 必须递归冻结、断开调用方输入。

`createInitialState()` 每次都返回一个新引用、递归冻结且属性顺序固定的精确值：

```js
{
  version: 1,
  phase: "intro",
  content: null,
  completedCount: 0,
  currentShot: null,
  revision: 0
}
```

所有“非法 state 返回安全初态”都指这一个 canonical 值，但每次调用必须是新对象，不能复用单例引用。

## 10. Action、reducer 与 revision headroom

action 都必须是当前 realm、精确 own-data object，无 extra/symbol/accessor/custom prototype：

```js
{ type: "START", content }
{ type: "LAUNCH", index, expectedRevision, chargeUnits }
{ type: "COMPLETE_BURST", burstToken }
{ type: "RESTART" }
```

`type` 必须是表内 primitive string；`index / expectedRevision / chargeUnits / burstToken` 必须是 primitive safe integer，再分别执行下列范围与相等性判断。禁止字符串数字、boxed number、NaN、Infinity、小数、负数或隐式转换。

事务：

- START：仅 intro 且 revision≤M−7；严格快照 content，进入 ready，revision+1；
- LAUNCH：仅 ready；index=completedCount、expectedRevision=state.revision、units=`1..20`；进入 bursting，token=revision+1，revision+1；
- COMPLETE_BURST：仅 bursting 且 token 匹配；count+1、shot=null；未满回 ready，满三进入 complete；revision+1；
- RESTART：仅 complete 且 revision≤M−8；回 intro、content=null、count=0，revision+1；
- 合法 state 上的无效动作返回原引用；
- 非法 state 返回全新冻结初态；
- 有效动作返回全新递归冻结 state。

设 `M=Number.MAX_SAFE_INTEGER`，合法 ready/bursting state 必须保留完成当前轮所需 headroom：

| phase | count | 最大 revision |
| --- | ---: | ---: |
| ready | 0 | M−6 |
| bursting | 0 | M−5 |
| ready | 1 | M−4 |
| bursting | 1 | M−3 |
| ready | 2 | M−2 |
| bursting | 2 | M−1 |
| complete | 3 | M |

边界完整轮：

```text
intro M−7
START       → ready M−6
LAUNCH 0    → bursting M−5
COMPLETE 0  → ready M−4
LAUNCH 1    → bursting M−3
COMPLETE 1  → ready M−2
LAUNCH 2    → bursting M−1
COMPLETE 2  → complete M
```

重开边界：`complete M−8 → RESTART → intro M−7 → 下一完整轮 complete M`。

因此：

```text
canStart   = intro && revision <= M−7
canLaunch  = ready
canRestart = complete && revision <= M−8
```

不同 chargeUnits 的三轮最终 complete state 必须字节等价：currentShot 在 COMPLETE 时清除，不保存力度、时间或高度历史。

## 11. Public view 与秘密 Gate

`getPublicView(state)` 精确返回：

```js
{
  phase,
  completedCount,
  totalCount: 3,
  progressText,
  revealedGlyphs,
  currentTargets,
  currentChargeBand,
  burstToken,
  canStart,
  canLaunch,
  canRestart,
  isBursting,
  recipient,
  sender,
  patternLabel,
  finalTitle,
  finalNote,
  revision
}
```

- invalid state 返回安全初态 view；
- `progressText` 是页面唯一动态主状态文案：intro 精确为 `还没点亮第一束。`；ready0/1/2 分别为 `准备点燃第 1 / 3 束。`、`第 1 束已经留下；准备第 2 / 3 束。`、`前两束已经留下；准备第 3 / 3 束。`；bursting0/1/2 分别为 `第 1 / 3 束正在升空。`、`第 2 / 3 束正在升空。`、`第 3 / 3 束正在升空。`；complete 精确为 `三束光都留在夜空里。`；
- `revealedGlyphs` 只含 index `< completedCount` 的前缀；每项精确 `{id,label,targets}`；
- revealedGlyph targets 固定使用 band 2，使稳定三字列不受实际蓄力影响；
- bursting 的 currentTargets 使用 currentShot 实际 band；currentChargeBand 与 burstToken 仅此阶段非 null；
- 当前 label 在 COMPLETE 前不进入 revealedGlyphs、DOM、ARIA 或 Canvas text；
- future label/rows/targets 永不公开；
- recipient/sender/patternLabel/finalTitle/finalNote 仅 complete 非 null；
- view 永不返回 raw rows、完整 content、timestamp、pointer、candidate、selectedBand 或 action log；
- view 与全部嵌套对象递归冻结、与 state 断引用。

正常页面只能消费 public view；页面只渲染 `progressText`，不按 phase/count 另拼主状态。未到阶段的内容不得进入 hidden/template、ARIA、class/id/data/title/style、CSS `content`、SVG text、Canvas `fillText`、离屏缓存、console、URL/history、storage、clipboard 或网络。

`config.js` 与 reducer state 仍是本地内存/磁盘明文，不是密码学加密；承诺只限正常页面分阶段呈现、不上传、不额外持久化。

### 11.1 页面、结果与开始流程

`main` 直接子级 DOM 顺序固定：

```text
页头 → 固定说明 → 夜空舞台 → 已公开三字列 → 进度状态
→ 发射控制 → 完成结果 → 主动作 → 固定隐私说明 → live region
```

固定公开隐私说明精确为：

> 内容写在本地文件里；页面不上传、不另存，愿望会在最后一束落定后出现。

它不读取或拼接配置字段，也不得改写为“已加密”或“源文件不可见”。已公开三字列是 persistent `ol#revealed-glyphs`，固定 `aria-label="已经留在夜空里的字"`，只为 public view 中的 `revealedGlyphs` 创建按序 `li`；当前与未来 label 不预置。

发射控制精确包含：label `烟火高度`、持久原生 select（`低 / 较低 / 中 / 较高 / 高`）、持久原生按钮 `按住蓄光` 与 `直接点燃`，以及固定提示 `无需蓄满，每一束都会成功。`。intro 隐藏整组；ready 显示并可操作；bursting 保留同一节点，select 仍 enabled，两按钮 `aria-disabled=true`；complete 隐藏整组。

complete 才创建的结果子树精确为：

```text
section#final-message.result-letter
├── p#pattern-label.pattern-label[data-field="patternLabel"]
├── p.recipient-line：固定前缀“给 ” + span[data-field="recipient"]
├── h2#final-title[data-field="finalTitle"][tabindex="-1"]
├── p.final-note[data-field="finalNote"]
└── p.signature：固定前缀“——” + span[data-field="sender"]
```

`h2#final-title` 精确设置 `aria-describedby="revealed-glyphs pattern-label"`。五个配置字段各自只进入上述一个指定文本节点，以 `textContent` 写入；`finalNote` 使用 `white-space:pre-line` 保留 LF。离开 complete 时移除整棵结果子树。夜空 Canvas/CSS grid 始终 `aria-hidden=true`，最终含义由已公开三字列、patternLabel 和结果文本共同表达。

主动作复用一个 persistent native button：intro 正常显示 `开始点光`，准备失败显示 `重新准备`；ready/bursting 隐藏；complete 显示 `再看一次`。结果在 DOM 顺序上位于主动作前，因此聚焦结果标题后的下一次 Tab 可到达 `再看一次`。

唯一 `attemptStart({focusOnSuccess})` 只允许在 intro 且未运行时进入，并有 app-local reentrancy guard：

1. 用户点击 `开始点光` 或 `重新准备` 后调用 `createStartAction(window.WISH_FIREWORKS_CONFIG)`；非法用户配置由 helper 整份回默认，不算失败；
2. 合法 START 同步 reduce/render ready，清准备失败提示；`focusOnSuccess=true` 时聚焦 `按住蓄光`；
3. helper 返回 null 或抛错时仍留在 intro，app-local `preparationFailed=true`，在同一进度节点以 `暂时没准备好，请重新准备。` 覆盖 intro `progressText`，主动作显示 `重新准备`；不得输出异常、配置或私密字段；
4. 重试走同一按钮、同一 guard 与同一路径；失败保留焦点与固定提示；重复点击在 guard 期间 no-op；
5. complete 点击 `再看一次` 先派 exact RESTART，再调用 `attemptStart({focusOnSuccess:true})`；成功直接回 ready，失败留在 intro 重试。

`preparationFailed` 与 guard 只属于 app，不进入 reducer、public view、DOM attribute、storage 或 action log。页面不自动 START；首次打开必须由用户主动点击开始 Gate。

## 12. Pointer、click 与 select 适配

输入会话只存在于 app，最少保存：

```js
{
  phase: "holding" | "awaiting-click",
  pointerId,
  pointerType,
  generation,
  startMs,
  rect,
  expectedIndex,
  expectedRevision,
  candidate,
  cleanup
}
```

app 另保存 `suppressedMainPointerClicks` 与 `reducedPointerCandidate`。前者按规范化后的 `mouse / touch / pen / other` 分桶，每桶最多一个 `{generation,pointerId,pointerType}`，因此总数最多四项；新 tombstone 只覆盖同桶旧项。后者在 reduced 且 Pointer Events 可用时精确保存本次 primary pointerdown 的 generation、pointerId/type、index 与 expectedRevision；二者均不进入 reducer。

### 12.1 pointerdown / pointerup

- ready 且 Pointer Events 可用时接受 primary pointer，mouse 还要求 button=0：正常模式建立 holding；reduced 模式只建立 `reducedPointerCandidate`，不 capture、preventDefault、计时或播放蓄力 UI；
- generation 先递增；快照 `performance.now()` 的整数毫秒、按钮 rect、completedCount 与 revision；
- `performance.now()` 必须有限且非负，再 `Math.trunc` 为 safe integer；rect 四边与 clientX/Y 只要求 `Number.isFinite` 且绝对值不超过 `Number.MAX_SAFE_INTEGER`，允许小数、不截断，并要求 `left<=right`、`top<=bottom`；inside 使用冻结 rect 的闭区间；
- `setPointerCapture` 失败时，只为本 generation 安装 document pointerup/cancel fallback；
- matching pointerup 先停计时/RAF，把 holding 原子改成 awaiting-click candidate，再释放 capture；pointerup 不派 LAUNCH；
- candidate 精确保存 generation、pointerId/type、accepted、chargeUnits、index、expectedRevision；非法/倒退时间或 outside 令 accepted=false；
- pointercancel 原子取消 matching holding/awaiting-click/reduced candidate，并删除同 pointerType/pointerId 墓碑；lostpointercapture 只取消仍为 holding 且 generation/pointerId 匹配者，implicit lost capture 不删除 awaiting-click 或墓碑；
- `touch-action:none` 只在 normal-motion + ready 且本次可以建立 holding 时覆盖按住按钮；reduced-motion、intro、bursting、complete 与准备失败时恢复 `touch-action:auto`，页面其他区域始终可滚动；
- 右键、第二指、压力、倾角、twist、raw/coalesced/predicted events 全忽略。

### 12.2 主按钮 click 分流

分流优先级固定，不能由 listener 注册顺序决定：

```text
detail 1 且缺 pointerId/type，同时墓碑表非空：
  → fail closed，保留全部墓碑并 no-op

detail 1 且同 pointerType 桶存在墓碑：
  pointerId 匹配   → 删除该桶墓碑、清同身份 candidate 并 no-op
  pointerId 不匹配且精确匹配当前 normal/reduced candidate
                   → 保留旧墓碑，继续 candidate 提交
  两者都不匹配     → 保留墓碑并 no-op；不得清其他身份 candidate

detail 0：
  → 不消费任何墓碑，清普通/reduced candidate，继续作为独立 AT/键盘 activation

reduced-motion 或无 Pointer Events：
  有 Pointer Events：detail 1 仅匹配 reducedPointerCandidate 后使用当前 select
  无 Pointer Events：detail 0/1 使用当前 select
  detail >1  → no-op

正常动效且有 Pointer Events：
  detail 0   → 清旧 candidate，使用当前 select
  detail 1   → 仅 pointerId/type 匹配 accepted candidate；使用 candidate units
  detail >1  → no-op
```

canceled、缺失、不匹配、旧 generation 或 phase/revision 已改变的 pointer click 都 no-op。不得依赖 `isTrusted`。支持 Pointer Events 的浏览器若 click 缺失 pointerId/type，则该 pointer click fail closed；“直接点燃”仍是完整入口。

精确墓碑身份判断永远早于 normal/reduced candidate。新 primary pointerdown 只替换当前 candidate，绝不删除墓碑：不同 pointerType 或同类型不同 pointerId 的 matching candidate 都可提交并保留无关旧墓碑；同类型同 pointerId 复用时，首个 click 精确还债并 no-op，下一手势恢复。matching `pointercancel` 原子清普通/reduced candidate 与同桶同 pointerId 墓碑，因为该输入流不会再合成 click；lost capture 不具备这个保证。墓碑与 reduced candidate 不进入 reducer、public view、DOM、日志或存储。

### 12.3 直接入口与 select

- select value 白名单精确为字符串 `"0".."4"`；非法/缺失时原子重置到 `"2"`，使用 units 12；
- direct click 的 detail 0/1 使用当前选项，detail>1 no-op；
- 任一入口提交前先快照 index/revision/units；若正在取消 active main pointer，先写入对应 pointerType 墓碑桶，再 generation++、清 holding、普通/reduced candidate 与 fallback listener，最后派 LAUNCH；
- direct 在 hold 中提交后，旧 pointerup/click 必须 no-op；
- select 在 bursting 仍 enabled，可选择下一束；当前 shot 已锁定，change 不回写 state；
- phase/revision 变化、下一次 pointerdown、detail=0 activation、direct、window blur、hidden、pagehide 都清旧 candidate；下一次 pointerdown 随即建立本次模式的新 candidate，但不清墓碑。除 detail=0 独立 activation 外，可能仍补 pointer click 的取消路径须先写对应桶；清理幂等。

### 12.4 物理激活去重

- 两个按钮都忽略 pointer `click.detail>1`；去重发生在 LAUNCH 与即时 COMPLETE microtask 之前；
- Enter/Space 非 repeat keydown 交给原生 click；repeat 或仍在 held-key set 的 keydown 只 preventDefault；
- keyup 清对应 key；window blur、hidden 与 pagehide 清全部；带 Ctrl/Meta/Alt 的组合不吞浏览器快捷键；
- 独立的 detail=0 AT/语音 activation 仍接受，不加基于 Date 的全局时间锁；
- reduced、Canvas 失败、正常动画都走同一 activation guard。

## 13. 动画与生命周期完成器

正常 burst：

1. LAUNCH 已锁定 index/units/token；
2. app 捕获 token 与整数 `performance.now()` 起点；
3. 每个 rAF 用 `presentationTick` 与 `getPresentationFrame` 从头计算，不按帧积分；
4. elapsed≥1000ms 时 finish；另设 1500ms timeout；
5. finish 先清 RAF/timer/listener，再派唯一 `COMPLETE_BURST {burstToken}`；
6. animation end、timeout、hidden、pagehide、window blur、异常与 media change 都调用同一 token finish；迟到回调 no-op。

`window.blur`、`visibilitychange(hidden)` 与 `pagehide` 还必须执行同一个完整输入取消器：若存在 active main pointer，先写对应 pointerType 墓碑桶；随后 generation++，释放 capture，移除 document fallback，清 holding/awaiting-click、普通/reduced candidate、蓄力 RAF、timer、held-key 与蓄力 UI。该取消器与 burst token finish 分离、都幂等；控件自身 blur 不得绑定这条窗口级路径。

reduced-motion：

- 初始 reduced 时 pointerdown 不 capture、不 preventDefault、不建 holding 或蓄力 RAF；两个按钮用 select；
- LAUNCH 后捕获相同 token，用 microtask 完成当前束；
- holding/awaiting 中切入 reduce：先把 active main pointer 写入对应 pointerType 墓碑桶，再 generation++、清 capture/计时/fallback/candidate 与蓄力 UI；旧手势随后补发的 detail=1 click 只清同桶墓碑；新 pointerdown 另建 reduced candidate，不能删除任何墓碑；
- bursting 中切入 reduce：不换 token、不重放，原 token 用 microtask 完成；
- 切回 no-preference 不恢复旧 hold/动画，也不重启当前 shot。

Canvas/context/尺寸失败：

- 当前 public targets 用 CSS 9×9 grid 即时表达；
- 同 token microtask COMPLETE；每次只完成当前 glyph，不一次解锁全部；
- DOM label 仍只在 COMPLETE 后创建；
- Canvas/SVG 装饰始终 `aria-hidden=true`。

## 14. 闪烁、焦点、live 与 forced-colors

闪烁 Gate：

- 同时最多一束；一束只一次上升、径向成字和单调淡出；
- 背景亮度固定；不做 full-screen flash、alternate、steps、strobe、twinkle/flicker、饱和红爆闪、shake 或自动连发；
- 不依赖面积/亮度阈值豁免，也不声称未经工具验证的 WCAG 合规认证；
- CSS/JS 审计不得出现常驻 RAF、infinite/alternate 闪烁或高频 brightness 切换。

焦点与 live：

- START 后聚焦主按住按钮；select change 不移焦；
- bursting 时两个按钮保留相同节点/tabindex，设 `aria-disabled=true` 并由 handler early-return；不用 native disabled；
- 束一、二 LAUNCH/COMPLETE 不主动移动焦点；一个预先存在的 polite status 仅在落定时写一次 `第 n 束留下：{label}`；
- 第三束 complete 创建完整三字、标题和私信；不再连续写 status。若完成发生时文档 visible 且窗口有焦点，立刻把焦点一次性移到 `h2#final-title`；
- hidden、window blur 或 pagehide 完成只记录一次性 `pendingResultFocus={burstToken,launcher}`，绝不当场聚焦；`window.focus`、`visibilitychange(visible)` 与 `pageshow` 都调用同一个幂等 `flushPendingResultFocus()`。首次满足 visible+focused 时必须先原子取出并清除 pending：仅当当前 public view 为 complete、`view.revision === burstToken + 1`，且 activeElement 是 body 或原 launcher 时聚焦结果，否则永久放弃；以后不得迟到或重复聚焦；控件 blur 不触发完成或冲刷；
- `再看一次` 的 RESTART 在派动作前清 pending，随后同 click 走 `attemptStart`；成功聚焦按住按钮，失败保留重试按钮焦点；focus-visible 使用系统 outline；
- Canvas 不承载语义，已公开字是真实 DOM 列表/字符节点。

触控尺寸：start、主按住点燃、直接点燃、restart 等全部原生 button 在六档视口都至少 56×56 CSS px；触控环境中的原生 select 可操作高度也至少 56px。尺寸 Gate 不得因横屏、safe-area、文本缩放或 forced-colors 被压缩。

forced-colors：

- `forced-colors:active` 隐藏 Canvas 装饰并启用 CSS 9×9 grid；
- 使用 `Canvas/CanvasText/ButtonFace/ButtonText/Highlight/HighlightText` 与真实 border/outline；
- 移除 gradient、filter、mix-blend-mode、box-shadow、background-image；
- 不使用 `forced-color-adjust:none` 强保色；
- select 保持原生外观；aria-disabled 按钮同时有文字/边框状态，不能只变色。

无 JavaScript 时只显示五项静态内容：公开 H1、固定说明、一个无语义静态夜空轮廓、`请开启 JavaScript 后再点燃三束光` 与固定隐私说明。默认 HTML/CSS 隐藏已公开三字列、进度、发射控制、完成结果和主动作；app 成功初始化后才显式启用交互区。静态夜空不得出现点阵字、火箭、已完成束数或私信轮廓，也不得声称愿望已经解锁。

## 15. 隐私 sentinel

浏览器隐私测试固定使用互不包含且不出现在公开 copy 的内容：

```text
labels: 岚 / 屿 / 棠
recipient: 收件-X7
sender: 署名-Q2
patternLabel: 图案-P9
finalTitle: 标题-T4
finalNote: 留言-N6
```

三份最小 16 点 rows：

```text
g0: 左上 4×4
####.....
####.....
####.....
####.....
......... × 5

g1: 中部 4×4
......... × 2
..####... × 4
......... × 3

g2: 右下 4×4
......... × 5
.....#### × 4
```

默认 band 2 target hash：

```text
g0 1abeff1f8bd048e80666e6fa93d66bd041692098f3fbc9a845ba43a3f5de439d
g1 596cbf8212a40bf7a7d5f566644fee3cbf740bc9d5fe08d16ba61bb6a04d850f
g2 8eb8deb1179ec1a0c70232234cac68e04b304b3aa79306ec41fd38b99827e45b
all b1901a25789c9c412d35eab1b3466cf57fd2dcb8e833f33f8c22a317594c401b
```

阶段断言：

- intro/ready0：无 glyph/final sentinel；
- bursting n：只允许 currentTargets 的第 n 个 target hash；当前 label 仍不进入 DOM/ARIA，future label/rows/targets/final 全无；
- COMPLETE n：只允许已完成前缀的 label 与 band-2 target hash；
- complete：才允许所有 final 字段；
- 搜索 document text、全部 attributes/template/SVG、Canvas fillText spy、console、URL/history、storage、clipboard 与 network；
- config.js/state 内存明文不属于正常页面 DOM 分阶段承诺。

## 16. 测试与浏览器验收

纯逻辑至少覆盖：

- 默认 config/glyph/rows/target canonical hash 与 active count；
- hostile object/array、getter、symbol、extra、sparse、custom prototype/iterator/map、Proxy trap；
- Unicode、lone surrogate、control、trim、行数与整份回退；
- quantize 全边界、五档 direct、倒退/非法时间；
- target count、首尾点、全局坐标边界、五档 hash 差异；
- presentation tick 与 g0 golden；
- 四 action exact schema、无效同引用、非法 state 安全初态；
- revision 全边界与 headroom；
- 错 index/revision/token、旧 token、重复 COMPLETE；
- 三束前缀遮蔽、五档 currentTargets、最终 band-2 targets；
- intro、ready0/1/2、bursting0/1/2 与 complete 的精确 `progressText`；
- 所有力度序列得到字节等价 complete state/view；
- action log 与 JSON-cloned log 字节等价。

浏览器至少覆盖：

- `开始点光` 主动 Gate、非法用户配置整份回默认、helper null/throw、固定安全提示、同按钮重试、reentrancy guard 与 `再看一次 → RESTART → attemptStart` 同路径；
- pointer 0/49/50/199/200/949/950/5000ms、inside/outside、cancel、up 前 lost capture；
- 200%/400% zoom 下 fractional rect/client 坐标、倒置 rect、NaN/Infinity 与越界坐标；
- `pointerup → implicit lostpointercapture → click` 精确一次；capture throw 的 document fallback；第二指/右键；
- direct 在 hold 中提交、旧 up/click、新 generation 迟到事件；
- accepted candidate 后 detail=0 使用 select，不消费旧 units；
- main/direct 双击在 reduced/Canvas 失败下都只完成一束；重复 Enter 不连开；
- select+direct、select+主键盘、无 Pointer Events 三条路径逐档得到五个 apex；非法 select 回中档；burst 中改 select 只影响下一束；
- 初始 reduce；holding/awaiting 途中切入后旧 pointerup/click no-op；同类型不同 pointerId 的新 candidate 可提交且旧 exact click 迟到仍 no-op；同类型同 pointerId 首 click 清债、下一手势成功；touch→mouse 与 mouse→touch 后旧 click 仍 no-op；bursting 途中切入；切出不恢复；每 token 最多 COMPLETE 一次；
- holding/awaiting/bursting 分别遇到 window blur、hidden、pagehide；capture、RAF、timer、fallback、candidate、held-key 与 UI 全清；timeout/animation-end 同时到达仍只完成一次；
- `main` 精确直接子级顺序、persistent 三字列/主动作/发射控制、complete-only 五节点结果、字段唯一落点、LF、`aria-describedby` 与 restart 移除；
- 两入口 activeElement、burst 中 Tab、前两束 live、第三束完整短句、前台 final focus 一次；hidden/blur/pagehide 不当场聚焦，window focus/visible/pageshow 共用 flush；token/revision 匹配才允许首次恢复聚焦，用户已移焦或 token 失配则永久放弃；
- normal-ready 才有 `touch-action:none`；reduced、intro、bursting、complete、准备失败与页面其余区域可正常滚动；
- forced-colors 隐藏 Canvas、CSS grid 可辨、系统色/outline/select/aria-disabled button；
- 隐私 sentinel 每阶段与 Canvas/context/尺寸失败；
- 禁用 JavaScript 后只出现冻结的五项静态内容，不含三字列、进度、发射控制、完成结果或主动作；
- `file://` 零公网请求、零 storage、零 console error/warning。

视口：

| 视口 | Gate |
| --- | --- |
| 1504×1046 | 题名、夜空、三字、进度、select、两按钮、隐私说明同屏；无滚动 |
| 1280×800 | 夜空、三字、控制同屏；无横向滚 |
| 768×1024 | 单列居中，三字和控制完整 |
| 390×844 | 夜空 280–320px；三字单行；全部按钮与触控 select≥56px |
| 320×568 | 夜空 220–240px；允许纵滚、零横溢；全部按钮与触控 select≥56px 且不被 safe-area 遮挡 |
| 844×390 | 夜空约 230px 左置，进度与控制右置；不锁方向；全部按钮与触控 select≥56px |

另验 200% 文本、约 320 CSS px 的 400% zoom、最大四行私信、Chrome desktop、Safari desktop，以及至少一次 iOS Safari/Android Chrome 真实 touch 序列；移动仿真不能替代真实 `click.detail/pointerId/lostcapture` 验证。

命令 Gate：

```bash
node --test experiences/surprises/wish-fireworks/logic.test.js
npm test
npm run verify
```

## 17. README、归因与零依赖 Gate

README 与 `assets/ATTRIBUTION.md` 必须同时列出完整 40 位 SHA、许可证、版权/授权主体、实际研究抽象和不复制范围：

| 来源 | 固定 SHA | 许可证 / 版权 |
| --- | --- | --- |
| Fireworks.js | `8f01eeaef422c1f0880e94ce99040025a1b74d7e` | MIT；Copyright (c) 2021-2023 Vitalij Ryndin |
| W3C Pointer Events | `238e8273305bb2e3c76f9f0bb289fb127c3dff74` | W3C Software and Document License；仓库贡献者授权，工作组维护 |
| canvas-text-particle | `9ee144a548aad85275318b30891c71dcf6e10f7b` | ISC；Copyright (c) 2026, dango0812 |
| canvas-confetti | `20eebad51dde793070c373d594099a7ed8d96e22` | ISC；Copyright (c) 2020, Kiril Vatev |
| W3C WCAG | `07123b871c103268375880980fd715b2b26b2ff0` | W3C Document License；仓库贡献者授权 |

固定链接、详细借鉴边界与排除来源以 `docs/183-wish-fireworks-research.md` 第 14–15 节为准。

必须明确：

- 9×9 点阵、target、状态机、token、输入量化与动画公式为本仓库独立实现；
- 不复制参考项目源码、类名、API、参数、公式、配置、测试、UI 或素材；
- Fireworks.js、canvas-text-particle、canvas-confetti 不得出现在依赖、script、vendor 或构建产物；
- 无第三方字体、音频、图片；基本 Canvas/CSS 几何由代码生成；
- 排除无许可证仓库、CodePen/Gist、来源不明素材、频闪实现；
- 不复制 W3C 正文/示例/图片/测试，不声称合规认证；
- 若未来实际复制代码或素材，立即停止“独立实现”结论，重新审计并保留完整许可证、版权通知和修改说明；
- 无 ImageGen 资产时 ATTRIBUTION 写“生成资产：无”；若后续使用，记录 prompt、日期、尺寸、格式、SHA-256 和“第三方输入：无”。

## 18. 实现顺序与完成定义

实现必须按独立可提交阶段推进：

1. visual Gate：完成 ImageGen 偏好与概念确认；
2. `config.js + logic.js + logic.test.js`，先通过纯逻辑 Gate；
3. `index.html + app.js`，完成输入、生命周期、隐私与降级；
4. `styles.css`，实现已接受概念并通过视口/缩放/forced-colors；
5. README/ATTRIBUTION、根入口/分类/创意池登记；
6. `npm test`、`npm run verify` 与真实浏览器验收；
7. 发现 bug 写入 `/bugs`，可复用知识写入 `/learn`；
8. 每个完整阶段检查分支/worktree 后独立提交。

S12 只有在三束主线、五档等价入口、隐私 sentinel、降动效/Canvas/Pointer 降级、闪烁 Gate、真实 touch 与零网络全部通过后，才可在 `docs/40-idea-backlog.md` 标记为已实现。
