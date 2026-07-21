# “把花语，系成一束”实现规格

规格日期：2026-07-21

对应调研：`docs/185-flower-language-bouquet-research.md`

目标目录：`experiences/surprises/flower-language-bouquet/`

启动等级：A（直接双击 `index.html`，无安装、服务、权限或公网）

## 1. 产品定义

这是一个给对象准备的有限单人惊喜。收礼者从同一组六种花材中依次选择三种不同花：第一枝是主花，第二枝是陪花，第三枝是点缀。选择顺序同时决定花束构图和三段私人花语的表达顺序；任何合法排列都成功。

页面固定公开题名：

> 把花语，系成一束

页面固定说明：

> 从六种花里依次挑三枝。第一枝做主花，第二枝陪在旁边，第三枝留作点缀；没有选错的花。

首版只做：

- intro 与主动开始；
- 同一花池六张花材卡；
- 三次不可重复、有序选择；
- 主花/陪花/点缀真实有序列表；
- 逐枝撤回上一项；
- 三枝 preview 与主动“系好这束花”；
- complete 私人标题、留言、署名；
- inline SVG 视觉与真实 DOM 等价语义；
- complete 后独立、显式、可重试的 standalone SVG 保存；
- reduced-motion、forced-colors、SVG/Blob/URL 不可用降级。

首版明确不做：

- 正确配方、失败、分数、价格、库存、购物车或推荐；
- 随机、每日花束、测验、关系判断、人格标签或“最适合你”；
- 任意删除、交换、排序、拖放、自由摆放或花束编辑器；
- Canvas、PNG、PDF、打印、截图、Web Share、clipboard 或自动下载；
- 图片、图标包、第三方字体、音频、粒子、循环摆动或常驻 RAF；
- storage、账号、云端画廊、链接分享、分析或联网；
- 任意配置 markup/path/href/style、脚本、foreignObject 或外部 SVG 资源。

## 2. 文件与职责

```text
experiences/surprises/flower-language-bouquet/
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

- `config.js`：称呼、署名、最终标题/留言、六种花名和私人花语；
- `logic.js`：hostile snapshot、配置、状态、reducer、public view、120 排列、scene、组合句、SVG 文本 layout 与 export model；
- `app.js`：DOM、SVG primitive registry、export controller、Blob URL、输入、焦点、live 与环境降级；
- `styles.css`：已接受视觉概念后的响应式实现；
- `logic.test.js`：纯 Node、零 DOM/SVG/Blob；
- README/ATTRIBUTION：玩法、配置、隐私、保存限制、固定来源、许可证、零复制与排除项。

`logic.js` 使用浏览器全局/CommonJS 双出口；导入时不得访问 DOM、SVG、Canvas、Blob、URL、XMLSerializer、crypto、Date、random、performance、timer、storage、network 或权限 API。

生产视觉仍受统一 ImageGen 偏好与概念确认 Gate 约束。本规格冻结结构性几何、逻辑和导出边界，不等于生产配色、质感或概念图已获接受。

## 3. 冻结常量

```js
VERSION = 1
FLOWER_COUNT = 6
REQUIRED_SELECTIONS = 3
ROLE_IDS = ["main", "companion", "accent"]
ROLE_LABELS = ["主花", "陪花", "点缀"]

EXPORT_FILENAME = "flower-language-bouquet.svg"
EXPORT_MIME_TYPE = "image/svg+xml;charset=utf-8"
EXPORT_WIDTH = 1000
EXPORT_HEIGHT = 1800
EXPORT_VIEW_BOX = "0 0 1000 1800"
EXPORT_TEXT_X = 80
EXPORT_TEXT_START_Y = 920
EXPORT_TEXT_MAX_BASELINE_Y = 1720
EXPORT_WRAP_CODE_POINTS = 22
EXPORT_BLOCK_GAP = 24
EXPORT_TITLE_FONT_SIZE = 30
EXPORT_TITLE_LINE_HEIGHT = 40
EXPORT_BODY_FONT_SIZE = 22
EXPORT_BODY_LINE_HEIGHT = 32
MAX_EXPORT_LINES = 22

MAX_REVISION = Number.MAX_SAFE_INTEGER
```

角色 slot 固定：

```js
ROLE_SLOTS = [
  {
    role: "main",
    roleLabel: "主花",
    x: 500,
    y: 330,
    scaleMilli: 1000,
    rotationDeg: 0,
    stemEndX: 500,
    stemEndY: 850
  },
  {
    role: "companion",
    roleLabel: "陪花",
    x: 345,
    y: 430,
    scaleMilli: 820,
    rotationDeg: -12,
    stemEndX: 500,
    stemEndY: 850
  },
  {
    role: "accent",
    roleLabel: "点缀",
    x: 655,
    y: 465,
    scaleMilli: 720,
    rotationDeg: 14,
    stemEndX: 500,
    stemEndY: 850
  }
]
```

全部数值均为 primitive safe integer；`scaleMilli` 由 renderer 除以 1000，仅用于 SVG transform，不进入浮点业务判断。

## 4. 默认配置与 canonical hash

```js
window.FLOWER_LANGUAGE_BOUQUET_CONFIG = {
  recipient: "给最特别的你",
  sender: "总想把好事都留给你的人",
  finalTitle: "这束花，替我把心意放在这里",
  finalNote: "不用等某个特别的日子，我也想把认真、明亮和长久，都一枝一枝送给你。",
  flowers: [
    {
      id: "rose",
      name: "玫瑰",
      meaning: "偏爱这件事，我一直很认真"
    },
    {
      id: "tulip",
      name: "郁金香",
      meaning: "和你在一起，平常也值得期待"
    },
    {
      id: "daisy",
      name: "雏菊",
      meaning: "喜欢你让我放心做自己的样子"
    },
    {
      id: "sunflower",
      name: "向日葵",
      meaning: "有你在的方向，总会更明亮"
    },
    {
      id: "lisianthus",
      name: "洋桔梗",
      meaning: "温柔不是偶然，是我想给你的日常"
    },
    {
      id: "gypsophila",
      name: "满天星",
      meaning: "小小的好，都想和你慢慢攒起来"
    }
  ]
};
```

这些 meaning 是本仓库原创的私人表达，不是权威花语、植物学事实或统一文化结论。

Canonical 口径：validator 先创建普通、断引用、固定属性顺序的数据；测试对原生 `JSON.stringify(value)` 的 UTF-8 字节做 SHA-256，不加 BOM、空格、缩进或末尾换行，不调用输入对象 `toJSON`。生产不需要 crypto。

属性顺序固定：

```text
config: recipient, sender, finalTitle, finalNote, flowers
flower: id, name, meaning
slot: role, roleLabel, x, y, scaleMilli, rotationDeg, stemEndX, stemEndY
```

| Canonical 数据 | SHA-256 |
| --- | --- |
| `flowers` | `ef6599362c88e73a8e8105b5faa3048c4148edacb31c7073701df8ede95dc1b6` |
| 完整默认 config | `93e0bc7d5b783460e37f9a05d5401c45935d3198731d6730499de8aed7696b91` |
| `ROLE_SLOTS` | `0dae830137e3146444aea52e2b9636e16a3eef64deca6dd51c36fb2d404fbd87` |

测试必须从生产默认配置调用生产 validator 后计算，不维护第二份仅供测试的 config。

## 5. 配置合同

`sanitizeConfig(candidate)` 只接受 exact own-data schema：

- 顶层精确 `recipient / sender / finalTitle / finalNote / flowers`；
- 顶层与 flower object 原型精确为当前 realm `Object.prototype`；
- `flowers` 是当前 realm 原生 dense Array，精确六项；
- flower 精确 `id / name / meaning`，ID 与顺序只能是第 4 节六项；
- 顶层、array 与 flower 都拒绝 extra、symbol、accessor、custom/null prototype、array subclass、自定义 iterator/map；
- recipient/sender 清洗后各 `1..12` Unicode code point 且完整字符串不同；
- finalTitle `2..40`；
- finalNote `1..160`，最多三行；每个 LF 分隔的逻辑行 trim 后非空；
- name `1..8`，六项清洗后两两不同；
- meaning `2..32`；
- 任一字段非法、trap 抛错或复制失败，整份使用默认 config，不做字段混搭；
- 返回递归冻结、断引用的纯 content；不得冻结、修改或复用调用方对象。

文本处理顺序：

1. descriptor.value 必须是 primitive string；
2. 在 raw UTF-16 code units 上拒绝 lone surrogate；
3. finalNote 允许 LF，但拒绝 CR、U+2028/U+2029 和其他 C0/C1；其他字段拒绝 LF/CR、U+2028/U+2029 与 C0/C1；
4. 调用捕获的 `String.prototype.trim` intrinsic；finalNote 再逐行 trim，并用 LF 重组；
5. 用 UTF-16 索引循环计 Unicode code point，不用 iterator、`Array.from` 或 `Intl.Segmenter`；
6. finalNote 行数为重组值 LF 数加一；
7. 执行长度、name 唯一和 recipient/sender 不同判断。

`createStartAction(rawConfig)` 是 app 构造 START 的唯一入口：先 sanitize，非法整份回默认；默认也重新通过内部 validator；返回递归冻结、断引用的 `{type:"START",content}`，否则 null。Reducer 的 START 只严格验证 action content，不做默认回退。

`config.js` 在六段 meaning 与 finalNote 周围保留一个可选、约 5–10 行的学习 TODO 说明；默认值不修改也必须完整运行。用户只需改纯文本，不改状态机、SVG 或 export controller。

## 6. 通用 hostile snapshot

config、state、action、content、flowers、selectedIds、scene 输入共用实现合同：

1. 模块初始化时捕获 `Reflect.getPrototypeOf`、`Reflect.ownKeys`、`Reflect.getOwnPropertyDescriptor`、`Array.isArray` 等 intrinsic；每次反射调用只尝试一次，Proxy trap 抛错立即令整项非法；
2. object 原型精确为当前 realm `Object.prototype`；array 同时满足捕获的 Array.isArray 且原型精确为当前 realm `Array.prototype`；
3. object 只允许合同列出的 string own keys；array 只允许连续索引和普通 length，必须 dense；拒绝 symbol、extra、accessor、custom iterator/map；
4. 只读取 own descriptor.value；不执行 `value[key]`、getter、spread、iterator、Array method、toJSON、valueOf 或输入对象方法；
5. 按固定顺序复制到新普通 object/array，再验证 snapshot；不冻结、修改或复用输入；
6. 有效输出递归冻结、JSON-safe、断引用。

合法数据 Proxy 只有在全部反射结果满足合同且 trap 不抛错时才可接受；后续普通 get trap 不得被触发。

`reduce(state, action)` 先 snapshot/验证 state：合法 state 加非法 action 返回调用方原 state 引用；非法 state 不读取 action，返回一次新的 canonical 初态。`getPublicView` 与 `buildExportModel` 的非法 state 也从新初态安全派生。

## 7. 有序排列与组合句

固定 ID 顺序：

```js
FLOWER_IDS = [
  "rose",
  "tulip",
  "daisy",
  "sunflower",
  "lisianthus",
  "gypsophila"
]
```

Canonical 120 排列用三重循环生成：外层第一枝、中层第二枝、内层第三枝；只保留两两不同 ID，不调用 sort、shuffle、Set iterator 或输入方法。

```text
for a in FLOWER_IDS
  for b in FLOWER_IDS
    for c in FLOWER_IDS
      if a != b && a != c && b != c
        append [a,b,c]
```

固定哈希：

| 数据 | SHA-256 |
| --- | --- |
| 120 个 ID 排列数组 | `1e7754c3c0094732cf8f86f811341926658deba4f753f14ba5c22bc6c11bb8ab` |

`composeBouquetMeaning(content, selectedIds)` 只接受合法 content 与长度 3 的有序唯一 ID。非法返回 null。合法返回 primitive string：

```text
这束花先用「{name0}」说“{meaning0}”，
再让「{name1}」接住“{meaning1}”，
最后由「{name2}」把“{meaning2}”留给以后。
```

两个 LF 构成三个固定逻辑行；不调用配置函数，不读取 catalog 之外字段。

默认 golden 选择：

```js
["rose", "sunflower", "gypsophila"]
```

默认组合句：

```text
这束花先用「玫瑰」说“偏爱这件事，我一直很认真”，
再让「向日葵」接住“有你在的方向，总会更明亮”，
最后由「满天星」把“小小的好，都想和你慢慢攒起来”留给以后。
```

| 数据 | SHA-256 |
| --- | --- |
| 默认组合句 JSON string | `bf8b3328d024cd86c36de88df4f6460311af8e1e4c57d8acb7b8b822d2f8a2f7` |
| 120 个组合句数组 | `bf183475d1ab000d4c5182c320b9d4777dd2dd9ed09cf408f0f390352a5ecb99` |

## 8. Scene model

`buildBouquetScene(selectedIds)` 接受长度 `0..3` 的 dense、有序、两两不同固定 ID 数组；非法返回 null。合法返回递归冻结：

```js
{
  version: 1,
  width: 1000,
  height: 1800,
  tieX: 500,
  tieY: 850,
  stems: [
    {
      ordinal,
      role,
      flowerId,
      shapeKey,
      x,
      y,
      scaleMilli,
      rotationDeg,
      stemEndX,
      stemEndY
    }
  ]
}
```

stem 属性顺序固定；`shapeKey===flowerId`，只能是六个内部 key。ordinal 是 `0..length−1`，slot 来自 ROLE_SLOTS 同 ordinal。返回值不含 name、meaning、颜色、path、DOM、SVG string 或 private final 字段。

默认 scene：

```js
{
  version: 1,
  width: 1000,
  height: 1800,
  tieX: 500,
  tieY: 850,
  stems: [
    {
      ordinal: 0,
      role: "main",
      flowerId: "rose",
      shapeKey: "rose",
      x: 500,
      y: 330,
      scaleMilli: 1000,
      rotationDeg: 0,
      stemEndX: 500,
      stemEndY: 850
    },
    {
      ordinal: 1,
      role: "companion",
      flowerId: "sunflower",
      shapeKey: "sunflower",
      x: 345,
      y: 430,
      scaleMilli: 820,
      rotationDeg: -12,
      stemEndX: 500,
      stemEndY: 850
    },
    {
      ordinal: 2,
      role: "accent",
      flowerId: "gypsophila",
      shapeKey: "gypsophila",
      x: 655,
      y: 465,
      scaleMilli: 720,
      rotationDeg: 14,
      stemEndX: 500,
      stemEndY: 850
    }
  ]
}
```

| 数据 | SHA-256 |
| --- | --- |
| 默认 scene | `f95b01fe4a671e384c25539a42afe0eda076b859f1bca4403e74bab41c7edaa7` |
| 120 个完整 scene 数组 | `34a43a165f3c5d5f8ae6fa529f85fdae6c959f2dd7e39aa25396a32374379c05` |

### 8.1 App SVG primitive registry

registry 只接受六个 shapeKey；每枝固定包含一条 stem、两片 leaf 与一个 head group。head 结构冻结：

| shapeKey | head primitive |
| --- | --- |
| rose | 8 outer ellipse + 5 inner ellipse + 1 circle |
| tulip | 1 closed cup path + 2 seam path |
| daisy | 12 ellipse + 1 circle |
| sunflower | 16 ellipse + 2 circle |
| lisianthus | 10 outer ellipse + 6 inner ellipse + 1 circle |
| gypsophila | 5 mini groups；每组 5 circle petal + 1 circle core |

所有局部坐标、path、fill/stroke token 与 DOM 创建顺序由 app 内部常量固定；不从 config、DOM dataset 或 URL 读取。实现时必须给每种 shape 建 exact element-count 测试。生产 palette/质感由视觉概念确认后冻结到实现与 ATTRIBUTION；改变 primitive 数量、shapeKey 或 slot 需先更新本规格和 hash。

## 9. SVG 文本 wrap 与 layout

`wrapSvgText(raw)` 接受清洗后配置字段或本模块纯 helper 派生的 primitive string；对象、空字符串、超过 192 code point、超过三个逻辑行、lone surrogate、CR/U+2028/U+2029、除 LF 外的 C0/C1 或空逻辑行均返回 null。算法：

1. LF 是硬换行；
2. 每个逻辑行用 UTF-16 索引读取 Unicode code point，合法 surrogate pair 作为一个单位；
3. 每 22 code point 截成一行；
4. 不 trim、不排序、不省略、不加 ellipsis；
5. 因 validator 拒绝空逻辑行，输出不含空字符串；
6. 返回递归冻结 dense string array。

`buildExportTextLayout(content, selectedIds)` 只接受合法 content 与长度 3 ID。block 固定：

```text
title       = wrap(finalTitle)
composition = wrap(composeBouquetMeaning(...))
note        = wrap(finalNote)
sender      = wrap("—— " + sender)
```

布局算法：

```text
y = 920
for block in [title, composition, note, sender]
  for each line
    append {block,lineIndex,text,x:80,y,fontSize}
    y += block lineHeight
  y += 24
```

title `fontSize=30,lineHeight=40`；其余 `fontSize=22,lineHeight=32`。line 属性顺序固定为 `block,lineIndex,text,x,y,fontSize`。

合法上限：title≤2、composition≤9、note≤10、sender≤1，总数≤22，最后 baseline≤1720；否则 null。

默认 layout：

```js
[
  {block:"title",lineIndex:0,text:"这束花，替我把心意放在这里",x:80,y:920,fontSize:30},
  {block:"composition",lineIndex:0,text:"这束花先用「玫瑰」说“偏爱这件事，我一直很认",x:80,y:984,fontSize:22},
  {block:"composition",lineIndex:1,text:"真”，",x:80,y:1016,fontSize:22},
  {block:"composition",lineIndex:2,text:"再让「向日葵」接住“有你在的方向，总会更明亮",x:80,y:1048,fontSize:22},
  {block:"composition",lineIndex:3,text:"”，",x:80,y:1080,fontSize:22},
  {block:"composition",lineIndex:4,text:"最后由「满天星」把“小小的好，都想和你慢慢攒",x:80,y:1112,fontSize:22},
  {block:"composition",lineIndex:5,text:"起来”留给以后。",x:80,y:1144,fontSize:22},
  {block:"note",lineIndex:0,text:"不用等某个特别的日子，我也想把认真、明亮和长",x:80,y:1200,fontSize:22},
  {block:"note",lineIndex:1,text:"久，都一枝一枝送给你。",x:80,y:1232,fontSize:22},
  {block:"sender",lineIndex:0,text:"—— 总想把好事都留给你的人",x:80,y:1288,fontSize:22}
]
```

最大 fixture：title=40 个同类 CJK code point；三项 name=8、meaning=32；finalNote 为 `1 + LF + 1 + LF + 156` code point；sender=12。结果 block line count `2/9/10/1`，总 22，最后 sender baseline=1680。

| 数据 | SHA-256 |
| --- | --- |
| 默认 layout | `4acd8ed97e0b6c1550f12d9831e14f1e068d533340bee32052a4bb3dc758509b` |
| 120 个 layout 数组 | `addebe218b9ee074f47c62ee2f053865bea0672b75208f7e1c07a81e9c6edcf2` |

## 10. State 与不变量

精确 state：

```js
{
  version,
  phase,
  content,
  selectedIds,
  revision
}
```

| phase | content | selectedIds |
| --- | --- | --- |
| intro | null | dense `[]` |
| arranging | 合法 content | 长度 `0..2` 的任意有序、唯一固定 ID |
| preview | 合法 content | 长度精确 3 |
| complete | 合法 content | 长度精确 3 |

`version` 必须是 primitive number 1；phase 是表内 primitive string；revision 是 `0..M` primitive safe integer。selectedIds 每项 primitive string，任意顺序、两两不同；不存在 catalog prefix 要求。

Incoming state 经 hostile snapshot 后只要求结构、值与 headroom 合法，不要求 frozen；JSON clone 的合法 state 仍合法。模块创建的初态、有效输出和 view/export model 递归冻结、断开调用方输入。

`createInitialState()` 每次返回新引用、属性顺序固定的精确值：

```js
{
  version: 1,
  phase: "intro",
  content: null,
  selectedIds: [],
  revision: 0
}
```

## 11. Action、reducer 与 headroom

Action 是当前 realm exact own-data object：

```js
{type:"START",content}
{type:"ADD_FLOWER",flowerId}
{type:"UNDO_LAST"}
{type:"TIE_BOUQUET"}
{type:"RESTART"}
```

type/flowerId 必须 primitive string；禁止 extra/symbol/accessor/custom prototype/coercion。

事务：

- START：仅 intro 且 revision≤M−5；严格 snapshot content，进入 arranging/0，revision+1；
- ADD_FLOWER：仅 arranging；flowerId 是固定 ID 且未选；追加，长度 3 时进入 preview；revision+1；
- UNDO_LAST：arranging 非空或 preview，且满足下表额外 headroom；弹出末项，进入 arranging；revision+1；
- TIE_BOUQUET：仅 preview；selectedIds 不变，进入 complete；revision+1；
- RESTART：仅 complete 且 revision≤M−6；回 intro、content=null、selectedIds=[]，revision+1，不归零；
- 合法 state 上无效动作返回调用方原引用；
- 非法 state 不读取 action，返回新的 canonical 初态；
- 有效动作返回新的递归冻结 state。

合法 state 最大 revision：

| phase | count | 最大 revision |
| --- | ---: | ---: |
| intro | 0 | M−5 |
| arranging | 0 | M−4 |
| arranging | 1 | M−3 |
| arranging | 2 | M−2 |
| preview | 3 | M−1 |
| complete | 3 | M |

UNDO 条件：

```text
arranging/1: revision <= M−5
arranging/2: revision <= M−4
preview/3:   revision <= M−3
```

最晚路径：

```text
intro M−5
START → arranging/0 M−4
ADD   → arranging/1 M−3
ADD   → arranging/2 M−2
ADD   → preview/3    M−1
TIE   → complete/3   M
```

`canStart/canUndo/canRestart` 必须反映 headroom；当前 state 即使不能撤回/重开，仍保留前进完成能力。

## 12. Public view 与秘密 Gate

`getPublicView(state)` 精确返回：

```js
{
  phase,
  selectedCount,
  requiredCount: 3,
  catalog,
  selected,
  composition,
  scene,
  canStart,
  canAdd,
  canUndo,
  canTie,
  canRestart,
  canPrepareExport,
  recipient,
  sender,
  finalTitle,
  finalNote,
  revision
}
```

阶段：

- invalid/intro：catalog=[]、selected=[]、composition/scene/final fields=null；
- arranging：catalog 六项、selected 长度 0..2、composition=null、scene 是当前 progressive scene；
- preview：catalog 六项但全 `canAdd=false`、selected 长度 3、composition 非 null、完整 scene；final fields=null；
- complete：catalog=[]、selected 长度 3、composition/scene/final fields 非 null；
- recipient/sender/finalTitle/finalNote 仅 complete 非 null；
- canPrepareExport 仅 complete true；
- view 不含 raw content、SVG path、Blob、URL、controller、保存历史或 action log。

catalog item exact：

```js
{id,name,meaning,isSelected,canAdd}
```

selected item exact：

```js
{ordinal,role,roleLabel,id,name,meaning}
```

view 与嵌套数据递归冻结、断引用。正常页面只能消费 public view；export 是下一节唯一受控例外。

阶段外字段不得进入 hidden/template、ARIA、attribute、CSS content、SVG、Blob、href、console、URL/history、storage、clipboard 或网络。config.js/state 是磁盘/内存明文，不是密码学加密。

## 13. Export model

`buildExportModel(state)` 先 hostile snapshot state；仅合法 complete 返回递归冻结 model，其他 phase/非法 state 返回 null：

```js
{
  version: 1,
  filename: "flower-language-bouquet.svg",
  mimeType: "image/svg+xml;charset=utf-8",
  width: 1000,
  height: 1800,
  viewBox: "0 0 1000 1800",
  documentTitle,
  documentDescription,
  scene,
  textLines
}
```

documentTitle 精确等于 finalTitle。documentDescription 由纯 helper 固定为：

```text
一束由「{name0}」、「{name1}」和「{name2}」组成的花。
```

textLines 来自第 9 节；scene 是完整三枝。Model 不含未选 catalog、recipient、raw config、revision、action log、controller、URL、timestamp 或调试字段。Recipient 只在页面结果显示；文件只含已选花名、finalTitle、三段组合、finalNote 与 sender。

内存 export model 允许且只允许已选三枝的 flowerId/shapeKey，供受控 renderer 选择内部 registry；不得含未选 flowerId/shapeKey。序列化 SVG/Blob 不创建这些字符串的 id/data/class/metadata，也不输出内部角色 key。导出文件只用可见花名/花语文本和无标识几何。

## 14. Standalone SVG renderer

app 从 frozen export model 新建独立 SVG tree，不 clone 页面 DOM：

- 只用捕获的 `document.createElementNS`、`textContent`、白名单属性和 XMLSerializer；
- element whitelist：`svg / title / desc / rect / g / path / circle / ellipse / line / text / tspan`；
- root 的首两个子节点固定为 title 与 desc：分别使用 export model 的 documentTitle/documentDescription；desc 只概括三种已选可见花名，不从 recipient、finalNote、未选花材或内部 ID 字段额外生成文本；可见花名与内部 key 偶然同值合法；二者只经 textContent；
- attribute whitelist 精确为：`xmlns / version / viewBox / width / height / transform / fill / stroke / stroke-width / stroke-linecap / stroke-linejoin / x / y / d / r / rx / ry / cx / cy / x1 / y1 / x2 / y2 / font-family / font-size / font-weight / text-anchor`；xmlns 由对 SVG namespace 的 root 创建与 serializer 产生，app 不再手工拼接；
- 配置或其派生字符串只能进入 title/desc/text/tspan 的 textContent；不得进入属性或其他节点；
- 禁止 script、style element、foreignObject、use、image、a、metadata、event attribute、href、URL、animation、remote/local font 与外部资源；
- root 固定浅色 background rect；palette 只能来自概念确认后的内部 token；
- 每个 textLine 生成一个独立 text/tspan，x/y/fontSize 精确；
- 序列化前必须递归审计构造后的独立 DOM tree：节点与属性均在上述白名单内；根节点的唯一固定命名空间允许且必须为 `http://www.w3.org/2000/svg`；URL 型属性在本规格下没有合法成员，出现即拒绝；普通 text node 不做 URL 或禁词子串扫描；
- 序列化结果必须包含唯一固定 xmlns、viewBox 和全部可见 text sentinel；renderer 不得读取未选 catalog，也不得把 scene 的 flowerId/shapeKey/role 字段写入 element 名、属性、metadata 或 text；结构审计须保证不存在 script、style、foreignObject、use、image、a、metadata、事件属性、href、URL 型属性或额外命名空间。用户可见 textContent 偶然与内部 key 或未选字段同值合法，不做裸子串缺失断言；
- 任一 DOM/attribute/text/serialize/结构审计步骤抛错、结果为空、超长、缺 sentinel 或结构不合法，整个构造 fail closed，不产生 partial Blob。

序列化字节上限冻结为 256 KiB；超出即 error。不得用 regex 对用户文本拼接/修补 XML。

## 15. Export controller 与 Blob URL

app-local controller 初态：

```js
{
  generation: 0,
  phase: "idle",
  objectUrl: null
}
```

phase 只为 `idle / unsupported / preparing / ready / error`。controller 不进入 reducer、view、DOM attribute、storage 或日志；render 只映射为可见状态。

流程：

1. 非 complete 为 idle；
2. complete 首 render 能力检测 Blob、XMLSerializer、URL.createObjectURL/revokeObjectURL 与 SVG DOM；缺失进入 unsupported；
3. 支持时 generation++，进入 preparing，捕获当前 frozen export model；
4. 同步建 standalone SVG、serialize、Blob、object URL；
5. 只有 generation/phase 仍匹配才进入 ready；否则 revoke 新 URL；
6. 任一步异常先 revoke 本次已创建 URL，再进 error；
7. error 总显示非技术失败说明；仅当 `generation < M` 时显示原生“重新准备保存文件”，retry guard 精确为 `phase === "error" && generation < M`，只重跑 3–6，不派 action；`generation === M` 时不渲染 retry；
8. ready 显示真实 `<a download="flower-language-bouquet.svg">保存含留言的 SVG</a>`；
9. link 必须由用户真实激活，不 `.click()`；detail>1 与 keyboard repeat preventDefault；
10. link 激活后只播“已交给浏览器处理”，不说保存成功；
11. 不在 click、blur、hidden、pagehide 立即 revoke；
12. 新 generation/RESTART 先 revoke 旧 URL；真正 unload 交 File API 自动清理；
13. unsupported 只显示能力说明，无 retry；
14. revoke/cleanup 幂等。

Controller generation 是 app 内非负 safe integer；若已到 M，下一次 prepare 进入不可重试 error `generation-exhausted`，不 wrap。可见 UI 只给通用说明，不泄漏 error code。

浏览器可能下载、打开预览、改变文件名或交给系统 Files；页面无法获知真正落盘。Safari/iOS 必须记录实际结果，不能承诺相册或磁盘保存。

## 16. 输入、焦点与 live

### 16.1 花材卡与动作

- 花材卡、START、UNDO、TIE、retry、RESTART 是原生 button；保存是原生 link；
- 不绑定 drag/drop、pointer capture、long press、double click、hover-only 或特定时长；
- card click 只用 view 中 id 构造 exact ADD_FLOWER；
- selected/preview card 保留同一 DOM node/tabindex，设 `aria-disabled=true` 并由 guard no-op，不 native-disable；
- pointer click.detail>1 no-op；Enter/Space 非 repeat 走原生 activation；repeat/held-key preventDefault；
- keyup 清 key；window blur、hidden、pagehide 清 held-key；带 Ctrl/Meta/Alt 快捷键不吞；
- reducer 幂等是第二层，物理去重在 action 前。

### 16.2 焦点

- START：render 后聚焦 catalog 第一张 card；
- ADD1/2：按 catalog index 从激活项之后扫描并 wrap，聚焦第一张未选 card；
- ADD3：只聚焦 `tabindex=-1` preview heading，describedby 指向三枝 role list 与 composition；
- UNDO：聚焦被弹出的 card；
- TIE：只聚焦 `tabindex=-1` result heading，describedby 指向 composition 与 finalNote；
- retry error：激活后焦点留在 retry；ready 后 link 进入正常 Tab 顺序；
- RESTART：聚焦 START。

所有成功 reducer action 共用同一焦点调度器。派发前捕获原 activeElement；render 后递增 app-local safe-integer `focusRequestToken`，记录 `{token,target,origin}`，并用一次 `queueMicrotask` 尝试聚焦；新请求使旧 token 失效。若 document hidden 或 window 失焦，保留最新 pending request；window.focus 与 visibilitychange(visible) 共用同一 flush。只有 token 仍最新、目标仍 connected、页面 visible、document.hasFocus，且 activeElement 仍为 body/原 action（原 action 已移除时 body 合法）才聚焦；否则丢弃请求，不能抢走用户已移动的焦点。普通与 reduced-motion 使用完全相同的微任务路径，不使用 RAF、timeout 或动画结束事件调度焦点。

### 16.3 Live 单通道

- ADD1/2：各播一次 `已选第 n 枝：{name}`；
- UNDO：播一次 `已撤回：{name}`；
- ADD3：只用 preview heading focus，不写 live；
- TIE：只用 result heading focus，不写 live；
- initial export ready：不播、不抢焦；
- export error：播一次非技术说明；
- retry ready：播一次 `保存文件已重新准备`；
- link click：播一次 `已交给浏览器处理`；
- 不逐帧、逐 SVG primitive 或连续清写 status。

## 17. DOM、SVG 与 privacy sentinel

DOM 顺序固定：header → intro 或 workspace → result → export → footer。视觉双列不能改变 DOM/Tab 顺序。

页面 SVG `aria-hidden=true`；真实 DOM 必须包含：

- fieldset/legend 或等价分组标题；
- 六花 card 名称/meaning/selected 状态；
- `<ol>` role/name/meaning；
- preview composition；
- complete recipient/title/note/sender；
- export phase 与链接/重试/不支持说明。

隐私 sentinel：

```text
flower names: 花-A1 / 花-B2 / 花-C3 / 花-D4 / 花-E5 / 花-F6
meanings: 意-A7 / 意-B8 / 意-C9 / 意-D0 / 意-E1 / 意-F2
recipient: 收件-R3
sender: 署名-S4
finalTitle: 标题-T5
finalNote: 留言-N6
```

断言：

- intro：无全部 config sentinel；
- arranging：允许六 name/meaning，禁止 final sentinel；
- preview：允许 name/meaning/composition，禁止 final sentinel；
- complete：允许 final sentinel；
- export model：只允许已选三组 name/meaning/flowerId/shapeKey 与 finalTitle/finalNote/sender；禁止 recipient、未选三组内部键与其他字段；
- SVG/Blob：可见文本数据来源只允许已选三组 name/meaning 与 finalTitle/finalNote/sender；允许读取已选 scene 的 flowerId/shapeKey/role 仅用于选择 registry 与定位几何，但不得把这些字段值写入结构或 text；禁止读取 recipient、未选 catalog 与其他字段；用户可见文本与禁用字段偶然同值不算泄漏；
- DOM 阶段搜索 document text、attributes、hidden/template、SVG、href、console、URL/history、storage、clipboard 与 network；SVG/Blob 另以 renderer 访问轨迹、结构审计和互不相同 sentinel fixture 断言字段来源，并增加可见文本故意等于内部 key/未选值的 collision fixture，证明不会裸子串误判。

## 18. 动效、forced-colors 与焦点可见

普通模式最多一次有限插入和一次系带收束；总时长≤600ms，不循环、不常驻 RAF、不依赖 animationend 进入业务阶段。

reduced-motion：

- scene/state/export 字节不变；
- 插入、位移、旋转、缩放、淡入和系带动画全部禁用；
- 焦点/live 立即按 action 执行。

forced-colors：

- 隐藏装饰 SVG，DOM role list 与 composition 保持完整；
- 使用 Canvas/CanvasText/ButtonFace/ButtonText/Highlight/HighlightText 与真实 border/outline；
- 移除 gradient/filter/mix-blend/shadow/background-image；
- 不使用 `forced-color-adjust:none` 强保色；
- selected/guard 状态有文字与边框，不只靠 fill。

所有 card/action/retry/link 保留 UA ring，或使用至少 3px solid outline + 3px offset；禁止只有 color/shadow/transform，禁止无等价的 outline:none。normal/selected/guard/link/forced 均验 Tab 可见。

所有 button/link 六档至少 56×56 CSS px；长花语使用 overflow-wrap:anywhere。

## 19. 响应式 Gate

| 视口 | Gate |
| --- | --- |
| 1504×1046 | catalog/controls 与 bouquet 双列；题名、三槽、主动作同屏，无滚动 |
| 1280×800 | 双列紧凑，无横向滚；preview/result/export 可达 |
| 768×1024 | 单列；preview 不 sticky 挡控件，DOM/Tab 顺序一致 |
| 390×844 | card 两列或一列；所有 action/link≥56px |
| 320×568 | 允许纵滚、零横溢；最大文字换行；safe-area 不遮动作 |
| 844×390 | 左预览右控制或单列纵滚；不锁方向；export 可达 |

另验 200% text、约 320 CSS px 的 400% zoom、最大配置、reduced、forced、SVG/Blob/URL/XMLSerializer 缺失/抛错、零网络和零 console error/warning。

## 20. 纯逻辑测试 Gate

至少覆盖：

- 默认 flowers/config/slots canonical hash；
- hostile config/object/array/getter/symbol/extra/sparse/custom prototype/iterator/map/Proxy trap；
- Unicode/lone surrogate/control/trim/finalNote 逐行与整份回退；
- canonical 初态、每次新引用、递归冻结；
- 五 action exact schema、非法 action 原引用、非法 state 新初态；
- revision/headroom、三条 UNDO、RESTART 边界；
- selectedIds 任意顺序、唯一、dense、JSON clone；
- canonical 120 ID permutation hash、全部可达；
- 默认/120 composition hash；
- progressive/full scene、默认/120 scene hash；
- wrap 0/1/21/22/23/44、派生 composition/sender、LF、多字节、surrogate pair、192/193 与非法输入；
- 默认/最大 layout、line count、baseline 与默认/120 layout hash；
- public view 四阶段 exact fields 与 sentinel；
- export model 仅 complete、documentTitle/Description 精确、无 recipient/未选/history，仅含已选三枝的 flowerId/shapeKey；
- 序列化 renderer 不读取未选 catalog，不把 flowerId/shapeKey/角色 key 写入结构或 text；DOM tree 白名单审计覆盖额外 namespace、element、attribute 与 URL 型属性；collision fixture 允许可见文本偶然等于内部 key/未选值；
- 同一 config+action log、JSON-cloned log 深相等；
- 全部输出断引用、递归冻结。

测试计算 hash 必须调用生产 helper；不得维护第二份完整 permutations/scenes/layouts。

## 21. 浏览器验收 Gate

1. 指针、Tab/Enter/Space 各完成六花选择、重复 no-op、UNDO、preview、TIE、RESTART；
2. ADD1/2 next-card、ADD3 preview heading、UNDO returned card、TIE result heading、RESTART START；
3. ADD3/TIE 在 blur/hidden 后 pending focus 与 window.focus/visible flush；
4. live 单通道：ADD1/2、UNDO；heading 单通道：ADD3/TIE；
5. main/direct 不存在；所有 card 无拖动、长按或时间依赖；
6. progressive scene role、反序 scene 与 DOM role list 一致；
7. six shape registry exact primitive count，页面 SVG aria-hidden；
8. export controller idle/unsupported/preparing/ready/error、retry、generation stale callback 与 exhaustion；
9. standalone SVG whitelist、title/desc、xmlns/viewBox/size/line/scene、256 KiB、无外链/脚本/foreignObject；无来自内部 ID/shapeKey/角色字段的结构或文本输出，collision fixture 允许可见文本偶然同值；
10. 最大 fixture 22 行、最后 baseline 1680；重新打开 SVG，全部 sentinel 实际可见、不裁切；
11. Blob/URL/XMLSerializer/createElementNS/serialize/createObjectURL/revoke 抛错与可重试；state/revision 不变；
12. link 真实激活、detail/repeat、无自动 click、不立即/pagehide revoke、新 generation/RESTART cleanup；
13. Safari/iOS 记录 download/preview/Files，不说“保存成功”；
14. privacy sentinel 四阶段与 export 只含已选/已公开字段；
15. reduced、forced、SVG hidden/unsupported 仍完成；
16. normal/selected/guard/link/forced 每项 3px focus ring；
17. 六档视口、200/400%、最大文字、56px、safe-area、零横溢；
18. Chrome/Firefox/Safari desktop `file://`、Android Chrome/iOS Safari 实机；
19. 双击 index、根门户、零公网请求、零 storage、零 console error/warning。

命令 Gate：

```bash
node --test experiences/surprises/flower-language-bouquet/logic.test.js
npm test
npm run verify
```

## 22. README、归因与零依赖 Gate

README 必须说明：

- 双击运行、选三枝、顺序角色、UNDO、preview/TIE、重开；
- 六段 meaning/finalNote 的纯文本个性化 TODO；
- 花语是私人表达，不是权威事实；
- 阶段隐私只是 DOM/导出呈现边界，config.js 仍明文；
- SVG 保存含 visible finalTitle/composition/finalNote/sender，不含 recipient；
- download 可能保存、预览或进入系统文件，页面不能确认落盘；
- 零网络、零 storage、零第三方运行依赖。

README 与 `assets/ATTRIBUTION.md` 必须各自完整列出仓库 URL、固定 commit URL、固定 license URL、SHA、许可证、版权/授权主体、研究抽象与不复制范围；不得只链接回 research 代替这些成品内声明：

| 来源 | 固定 SHA | 许可证 / 权利主体 |
| --- | --- | --- |
| Emoji bouquet generator | `8db7a51b4b4bfc4b9a0b05df1cf5d4dda4d923c9` | MIT；Copyright (c) 2016 Kyle He |
| Procedural-Flower | `d857fbe846d5899cd5cf8ea6a47d37e6030f53c0` | MIT；Copyright (c) 2012 Arthur Brongniart |
| SVG.js | `6f58d4b2aa10e2d7ed6e38ff84caeb04b210af4e` | MIT 形式；Copyright (c) 2012–2018 Wout Fierens |
| Fabric.js | `723838fcbb9feaa87c8840082640de2ed82383da` | MIT；Copyright (c) 2008–2015 Printio（Juriy Zaytsev、Maxim Chernyak）；Copyright (c) 2016–present Andrea Bogazzi、Shachar Nen 与 Fabric.js contributors |
| d3-hierarchy | `c4ae7066d5a52e8aeaab24b3f7113e25c38183f2` | ISC；Copyright 2010–2021 Mike Bostock |
| FileSaver.js | `cea522bc41bfadc364837293d0c4dc585a65ac46` | MIT；Copyright © 2016 Eli Grey |
| WHATWG HTML | `24c5e48bf66ea61bc199ec6338c81258275ba9c6` | CC BY 4.0 / code BSD 3-Clause；Copyright © WHATWG（Apple、Google、Mozilla、Microsoft） |
| W3C File API | `cd1d1da9a5375af0622af4b36e76c6e6bd9d130b` | W3C Software and Document License；contributors |
| W3C SVG 2 | `8b521081b0c65490c9b80633be68871f7bf441fa` | W3C Document License；contributors |
| W3C WCAG | `07123b871c103268375880980fd715b2b26b2ff0` | W3C Document License；contributors |
| CSSWG Drafts | `c7573530343759ace8e46438a1fa2c44515b5554` | W3C Software and Document License；contributors |

两个成品文件中的仓库、commit 与 license URL 必须与 `docs/185-flower-language-bouquet-research.md` 第 15–17 节逐项一致；research 只作复核依据，不代替成品声明。

必须写明：

- 不复制任何研究项目源码、API、布局表、算法、文案、测试、演示、图片或构建产物；
- 不安装或打包这些库；
- 状态机、120 排列、scene slot、primitive registry、组合句、SVG tree、导出和测试为本仓库独立实现；
- 当前生成资产为无；若概念确认后使用 ImageGen，记录 prompt、工具、日期、尺寸、处理链、SHA-256 与第三方输入；
- 若未来实际复制代码/素材，重新审计并保留许可证、版权通知与修改说明。

## 23. 实现顺序与完成定义

后续按独立提交阶段：

1. 视觉偏好/概念确认；
2. config + logic + 纯逻辑测试；
3. DOM/app 输入、public view、焦点与隐私；
4. standalone SVG renderer + export controller；
5. 已接受视觉的 styles/inline SVG；
6. README/ATTRIBUTION、根入口/分类/创意池登记；
7. npm test/verify、Chrome MCP 与真实浏览器/触屏保存矩阵；
8. bug 写 `/bugs`，可复用导出/scene/Blob/安全经验写 `/learn`；
9. 每阶段检查 branch/worktree 后独立提交。

S13 只有在 120 排列、隐私 sentinel、SVG 最大文本、export error/retry、Safari/iOS 实际保存降级、forced/reduced、六档视口和零网络全部通过后，才可在 `docs/40-idea-backlog.md` 标记已实现。
