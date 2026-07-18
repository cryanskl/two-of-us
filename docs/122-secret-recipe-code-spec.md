# A 级“藏好这一味”可执行规格

- 日期：2026-07-19
- 状态：冻结，可进入视觉与实施计划
- 工作 ID：`secret-recipe-code`
- 目录：`experiences/versus/secret-recipe-code/`
- 调研依据：[121-secret-recipe-code-research.md](./121-secret-recipe-code-research.md)
- 启动等级：A，经典脚本、相对资源、`file://` 直开

## 1. 产品合同

两个人共用一台设备。每轮由配方师藏好四格配方并交接，破译者根据每次返回的“同位 / 有料”数量在七次内推断；第二轮交换角色，较少试配次数者获胜。

| 相近作品 | 权威规则 | 本作边界 |
| --- | --- | --- |
| 密封猜拳 | 双设备秘密提交，一次性同时揭晓 | 单设备交接；秘密由玩家定义，另一人通过多轮约束推断 |
| 和你一样 | 双设备密封二选一，匹配数量累积 | 四格序列、位置关系、重复元素与逐轮历史都参与推理 |
| 默契电报码 | 公开码本下发送/译码图形 | 没有公开答案；反馈只给计数，不指出具体位置 |
| 数字凑靶 | 公开市场草拟并比较算式距离 | 输入与历史公开；本作必须在阶段间删除秘密 DOM |

比赛结果只由两份合法 round result 派生；界面、动画、颜色、背景和真实时间不得修改反馈或 winner。

## 2. 冻结文案与配料

### 2.1 默认文本

```text
标题：藏好这一味
副题：你藏四味，我用七次慢慢猜到。
开场：每人各藏一次四格配方。猜中得越快，越先尝到胜利；同位是配料和位置都对，有料是配料对了但位置不对。
开始：开始第一轮
藏好：藏好配方
遮住：先盖住配方
恢复：只有我在看，继续设置
交接：把设备交给 {breaker}
接手：我接好了
提交猜测：试这一杯
清空：倒掉重调
下一轮：交换角色
最终：看看谁先尝到
重开：再藏一回
隐私：只在本机内存，刷新即清空
```

不得新增倒计时、电脑解法、候选列表、胜率、评分等级、连胜、排行榜、分享、保存、复制、羞辱或“智商”措辞。

### 2.2 六种固定配料

逻辑 ID 与序号冻结；config 可安全修改显示名和说明，但不能增加、删除、重排或改 ID：

| 序号 | ID | 默认名称 | 图形语义 | 默认色 |
| --- | --- | --- | --- | --- |
| 1 | `berry` | 红莓 | 三颗圆果与一片叶 | `#c9656b` |
| 2 | `citrus` | 柑橘 | 六瓣切片 | `#dfa547` |
| 3 | `mint` | 薄荷 | 双叶 | `#67a483` |
| 4 | `cocoa` | 可可 | 中缝豆形 | `#8b604f` |
| 5 | `honey` | 蜂蜜 | 单滴 | `#d2ae59` |
| 6 | `salt` | 海盐 | 菱形晶体 | `#88a6b5` |

按钮可用小型内联 SVG 实现固定图形；编号、名称与图形必须同时存在，颜色不是唯一身份。SVG 只是 UI 图标，不含规则、秘密或位图素材。

## 3. 文件合同

```text
experiences/versus/secret-recipe-code/
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
    └── apothecary-table.jpg
```

- `index.html` 按 `config.js → logic.js → app.js` 加载经典脚本，不使用 module；
- `config.js` 与 `logic.js` 采用 UMD 风格，浏览器挂全局，Node 测试可 `require()`；
- 作品目录可独立复制，不引用 `shared/`、根运行时、CDN、远程字体或外部 URL；
- 背景是可选装饰资产，失败时 CSS 深色工作台、原生按钮、反馈、历史、结果与重开仍完整；
- README 与 ATTRIBUTION 必须包含“借鉴与来源声明”、固定 commit/许可证/权利主体、商业边界、ImageGen 输入链与零复制说明。

## 4. 冻结常量与类型

```js
VERSION = 1
SLOT_COUNT = 4
MAX_GUESSES = 7
ROUND_COUNT = 2
FAILED_SCORE = 8
MAX_PER_SECRET_INGREDIENT = 2
MIN_UNIQUE_SECRET_INGREDIENTS = 3
MAX_NAME_POINTS = 16
MAX_LABEL_POINTS = 12
MAX_DESCRIPTION_POINTS = 48
MAX_NOTE_POINTS = 240

INGREDIENT_IDS = [
  "berry", "citrus", "mint", "cocoa", "honey", "salt"
]
```

全部常量、默认配置、导出数组与返回对象递归冻结。ingredient ID 只允许上面六个精确字符串；数组顺序就是编号顺序。

secret 合法条件：

```text
length == 4
all IDs valid
max(count(id)) <= 2
unique count >= 3
```

guess 合法条件只要求长度 4 且 ID 合法，允许同一种出现 0–4 次。

## 5. 两遍多重集合反馈

公开函数：

```js
scoreGuess(secret, guess) -> { exact, misplaced }
```

输入必须是两份合法长度 4 数组；`secret` 还必须满足秘密约束，畸形输入抛 `TypeError`。函数不得修改输入，输出递归冻结。

算法合同：

1. 扫描四个位置；相同 ID 计入 `exact`，不再进入剩余计数；
2. 对不同位置分别累计 secret 和 guess 的剩余频数；
3. `misplaced = Σ min(secretRemaining[id], guessRemaining[id])`；
4. 返回两个安全整数，满足 `exact + misplaced <= 4`；
5. `exact === 4` 是唯一 solved 条件。

冻结边界表：

| secret | guess | exact | misplaced |
| --- | --- | ---: | ---: |
| B B M H | B M B S | 1 | 2 |
| B B M H | B B H M | 2 | 2 |
| B B M H | B B M H | 4 | 0 |
| B B M H | B B B B | 2 | 0 |
| B C M H | H M C B | 0 | 4 |
| B C M H | S S S S | 0 | 0 |

测试中使用真实 ingredient ID，不使用调研项目的枚举、输入表、变量名或实现结构。

## 6. Phase 与权威状态

### 6.1 Phase

```text
intro
setting
handoff
guessing
round-result
match-result
```

`setting` 内的 `covered` 是隐私子状态，不增加独立 phase；covered 时 public view 不返回 draft。

### 6.2 精确状态形状

```js
{
  version: 1,
  phase,
  roundIndex,               // 0..1
  setterIndex,              // round 0 -> 0, round 1 -> 1
  breakerIndex,             // round 0 -> 1, round 1 -> 0
  covered,                  // boolean，仅 setting 可 true
  draft: [],                // 仅 setting；covered 时 state 保留、view 隐藏
  secret: null | [],        // handoff/guessing/round-result
  guessDraft: [],           // 仅 guessing
  guesses: [],              // 当前轮已提交行
  roundResults: [],         // 已完成轮次，0..2 项
  announcementSerial,
  lastNotice
}
```

guess row：

```js
{
  values: [ingredientId × 4],
  exact: integer 0..4,
  misplaced: integer 0..4
}
```

round result：

```js
{
  roundIndex: 0 | 1,
  setterIndex: 0 | 1,
  breakerIndex: 0 | 1,
  secret: [ingredientId × 4],
  attempts: null | integer 1..7,
  failed: boolean
}
```

若 `failed === false`，attempts 必须等于当前 guesses 长度且最后一行 exact=4；若 true，attempts 必须 null、guesses 恰好 7 行且没有 exact=4。

状态必须 JSON 可往返、递归冻结、只含白名单字段。`assertState` 必须重算每一条反馈、轮次结果、角色、phase 和胜负派生关系，拒绝多余字段、错误 key 顺序、非法 ID、数组引用复用、secret/draft 同时存在、covered 泄漏、伪造 exact/misplaced、提前 round result、跳轮和非法成绩。

### 6.3 Phase 不变量

| phase | 当前秘密 | 输入/历史 | results |
| --- | --- | --- | --- |
| intro | draft/secret 空，covered false | guessDraft/guesses 空 | 空 |
| setting | secret 空；draft 0..4；covered 可 true | guessDraft/guesses 空 | 长度等于 roundIndex |
| handoff | secret 合法；draft 空；covered false | guessDraft/guesses 空 | 长度等于 roundIndex |
| guessing | secret 合法；draft 空；covered false | guessDraft 0..4；guesses 0..6 | 长度等于 roundIndex |
| round-result | secret 合法且已公开；输入 draft 空 | guessDraft 空；guesses 1..7 | 长度等于 roundIndex+1 |
| match-result | draft/secret/guessDraft/guesses 空 | 只通过 results 展示历史摘要 | 恰好 2 |

角色始终从 roundIndex 唯一派生：round 0 是 setter 0 / breaker 1，round 1 是 setter 1 / breaker 0，不接受调用方自定义角色顺序。

## 7. Public actions

每个 action 只允许下列精确字段；缺字段、多字段、非法枚举或非法索引抛 `TypeError`：

```text
START_MATCH
ADD_SECRET { ingredientId }
REMOVE_SECRET_SLOT { index }
CLEAR_SECRET
SUBMIT_SECRET
COVER_SECRET { reason }
RESUME_SECRET
CONFIRM_HANDOFF
ADD_GUESS { ingredientId }
REMOVE_GUESS_SLOT { index }
CLEAR_GUESS
SUBMIT_GUESS
ADVANCE_ROUND
RESTART_MATCH
```

- `START_MATCH`：intro → setting round 0，其他 phase 引用幂等；
- `ADD_SECRET`：仅 setting 且未 covered；draft 未满时追加合法 ID。若追加会超过同种两份，引用幂等并令 notice=`secret-duplicate-limit`；
- `REMOVE_SECRET_SLOT`：仅 setting 未 covered 且 index 指向现有格；删除该格并左移。合法但不存在的 index 引用幂等；
- `CLEAR_SECRET`：setting 未 covered 且 draft 非空时清空；已空引用幂等；
- `SUBMIT_SECRET`：仅 setting 未 covered，draft 满足四格/最多两份/至少三种时进入 handoff，把深拷贝写入 secret 并清 draft；不合法引用幂等且 notice 指明 `secret-incomplete` 或 `secret-not-varied`；
- `COVER_SECRET`：reason 只允许 `manual/escape/blur/hidden`；setting 且未 covered 时 covered=true，保留 draft 但 public view 隐藏；其他 phase 引用幂等；
- `RESUME_SECRET`：setting covered → uncovered；其他情况引用幂等；
- `CONFIRM_HANDOFF`：handoff → guessing，secret 保留在权威状态但不进入 view；
- `ADD_GUESS`：仅 guessing，guessDraft 未满时追加合法 ID；
- `REMOVE_GUESS_SLOT`：仅 guessing 且 index 指向现有格时删除并左移；
- `CLEAR_GUESS`：guessing 且草稿非空时清空；
- `SUBMIT_GUESS`：仅 guessing 且 guessDraft 恰好四格；计算反馈、追加冻结 row 并清草稿。exact=4 或追加后达到第 7 行时，同一 action 创建 round result 并进入 round-result；
- `ADVANCE_ROUND`：第一轮 round-result → round 1 setting，清当前 secret/guesses；第二轮 round-result → match-result，并清当前运行字段；
- `RESTART_MATCH`：任意 phase → 与首次加载深相等的 intro；intro 自身引用幂等；
- match-result 除 RESTART 外所有结构合法 action 引用幂等。

未知 action type、非对象、getter 抛错、symbol、数组或原型污染对象抛 `TypeError`；结构合法但错 phase 的 action 引用幂等，不增 announcement。

## 8. 配置与个性化策略

`config.js` 暴露递归冻结的完整默认配置：

```js
{
  title,
  subtitle,
  intro,
  playerNames: ["你", "TA"],
  ingredientText: {
    berry: { label: "红莓", description: "微酸，醒得快" },
    citrus: { label: "柑橘", description: "明亮，先闻见" },
    mint: { label: "薄荷", description: "清凉，留得久" },
    cocoa: { label: "可可", description: "温厚，慢慢化" },
    honey: { label: "蜂蜜", description: "柔甜，黏住余味" },
    salt: { label: "海盐", description: "清醒，托住其他味道" }
  },
  defaultMatchNote
}
```

并暴露准备者可选策略：

```js
function composeMatchNote(summary) {
  // TODO（准备者可选，5–10 行）：按平局、胜者或一试命中返回纯文本结语。
  return summary.defaultNote;
}
```

输入是精确冻结摘要：

```js
{
  playerNames: [string, string],
  scores: [integer 1..8, integer 1..8],
  solved: [boolean, boolean],
  winnerIndex: null | 0 | 1,
  tied: boolean,
  defaultNote: string
}
```

策略不接触 secret、guesses、ingredient ID、state 或 config 引用。返回 trim 后 1..240 code points 的字符串才采用；空白、非字符串、超长、抛错或修改冻结摘要全部回退。

配置清洗逐字段回退：玩家名 1..16、label 1..12、description 1..48、普通文案按规格上限；缺 ID、多 ID、错误 key 顺序、getter 抛错或非法值只回退对应字段。动态内容一律用 `textContent`，不得解释为 HTML、URL、CSS 或 selector。

## 9. View model 与阶段秘密

`getRecipeView(state, safeConfig)` 返回递归冻结、无共享引用的投影：

```js
{
  phase,
  round: { index, number, total },
  roles: { setterIndex, breakerIndex, setterName, breakerName },
  privacy: { covered, secretVisible, secretStoredInMemory },
  ingredients: [{ id, number, label, description, color, iconKey }],
  draft: [],
  guessDraft: [],
  history: [{ number, values, exact, misplaced }],
  revealedSecret: [],
  score: { values, solved, winnerIndex, tied },
  results: [],
  controls: {
    canStart, canEditSecret, canSubmitSecret, canCover, canResume,
    canConfirmHandoff, canEditGuess, canSubmitGuess,
    canAdvanceRound, canRestart
  },
  notice,
  text: { title, subtitle, instruction, primaryLabel, matchNote }
}
```

阶段投影：

- intro：draft/guess/history/revealed/results 为空；
- setting uncovered：draft 只含当前草稿 ID，可供真实槽位 DOM；
- setting covered：draft 必须为空，`secretVisible=false`；恢复前不得通过 view 反推草稿长度、计数或内容；
- handoff：draft/secret/guess/history/revealed 为空；只保留角色、轮次与交接文案；
- guessing：guessDraft 与历史公开；secret/revealed 为空；history 只含玩家已经知道的猜测和反馈；
- round-result：revealedSecret 含当前 secret，results 含已完成公开轮次；
- match-result：revealedSecret 空，results 含两轮已公开配方与成绩，score/matchNote 完整；
- 任意 view 不返回权威 state、announcementSerial、notice 原始枚举以外的调试字段或可变引用。

DOM Gate：

- handoff/guessing 的 DOM、dataset、style attribute、aria-label、title、hidden/template、注释与 JSON 不得包含 secret 顺序；
- setting cover 发生时先从 DOM 删除四个草稿内容节点，再显示盖布；不能只设透明、blur、visibility 或 aria-hidden；
- round-result 才创建秘密揭晓节点；ADVANCE 后第一轮 secret 只通过公开 result 摘要存在；
- match-result 只在到达时创建最终结语和重开按钮；重开全部删除；
- stable `aria-live` 始终存在，但设置草稿的每次变化不播报具体配料，避免旁边的破译者听见。

## 10. Focus、键盘与页面生命周期

- START 后聚焦第一枚配料章；添加满四格后不自动提交，焦点保持配料区；
- SUBMIT_SECRET 后聚焦 handoff 标题，随后聚焦唯一“我接好了”；
- CONFIRM_HANDOFF 后聚焦第一枚配料章；每次 SUBMIT_GUESS 后仍聚焦第一枚，历史更新不抢焦点；
- round-result 聚焦结果标题；ADVANCE 第一轮后聚焦第一枚配料章，第二轮后聚焦比赛标题；RESTART 聚焦开始按钮；
- Tab/Shift+Tab、Enter/Space 使用原生按钮；数字键 1–6 可在 setting/guessing 追加对应配料，Backspace 删除草稿末格，Escape 遵守阶段动作；
- 键盘 shortcut 只在 body/作品区域且没有修饰键时接管，不能干扰浏览器快捷键；`event.repeat` 对追加动作忽略；
- setting 时 `window.blur`、`document.hidden` 或 Escape 派发 COVER_SECRET；恢复页面不会自动揭开；
- guessing 时 blur/hidden 不改变权威状态，因为没有倒计时，Escape 只映射 CLEAR_GUESS；
- `pageshow/pagehide` 不保存或恢复比赛；刷新产生全新 intro。

## 11. 视觉与资产合同

方向：**午夜配方室 + 黄铜压印配料章 + 两本对称试配册**。它不是商业塑料棋盘、炼金术 RPG HUD、赌场、实验室仪表盘或餐厅点单页。

生产背景 `apothecary-table.jpg` 只承载深蓝黑桌面、胡桃木、磨砂玻璃、压花纸、黄铜和无字瓶罐；不得包含四格秘密、六种配料 UI、提示数量、玩家名、按钮、官方棋盘、红白提示钉、品牌、可读标签或水印。

代码层负责：

- 两本相对的配方册构图与当前角色标题；
- 四格槽位、六枚配料章、同位/有料反馈、七行历史与双轮比分；
- setting 的深色盖布、handoff 的中性封签、round result 的揭晓条和 match result 的结语；
- 原生按钮、焦点、所有文字与无障碍语义。

不得用 Canvas 像素、背景物体位置或图片成功加载参与反馈和完成；首版无需 Canvas。

## 12. 响应式、降级与非颜色信息

- 1280×800：左侧规则/角色/比分约 28%，右侧试配册约 72%；首屏完整看到四格、六枚配料章、主动作和隐私说明；
- 390×844：单列顺序为短标题 → 轮次/角色 → 四格 → 六配料 3×2 → 主动作 → 历史；至少当前输入与主动作在首屏；
- 320×700：六配料保持 3×2，每枚不低于 48px；辅助说明可收敛但名称/编号不能隐藏，无横向溢出；
- 历史在桌面右册或移动下方独立滚动，新增行不推动当前输入或主动作改变屏幕位置；
- `prefers-reduced-motion` 取消章落槽、封签滑入、历史淡入与结果升起；
- `forced-colors` 隐藏背景图与纯装饰 SVG，使用系统色边框、编号、名称、文字和不同线型区分槽位/配料/反馈；
- 背景失败显示 CSS 深蓝黑与胡桃木渐变，不改变任何控件、规则、焦点或完成路径；
- JavaScript 不可用时只显示明确说明，不展示可点击的假棋盘。

## 13. Golden replay

固定 40-action 公开日志：

```text
START_MATCH

# round 0: 玩家 0 设置 B B M H，玩家 1 三次猜中
ADD_SECRET B, B, M, H
SUBMIT_SECRET
CONFIRM_HANDOFF
ADD_GUESS B, M, B, S; SUBMIT_GUESS   # 1 / 2
ADD_GUESS B, B, H, M; SUBMIT_GUESS   # 2 / 2
ADD_GUESS B, B, M, H; SUBMIT_GUESS   # 4 / 0 -> result
ADVANCE_ROUND

# round 1: 玩家 1 设置 S C O S，玩家 0 两次猜中
ADD_SECRET S, C, O, S
SUBMIT_SECRET
CONFIRM_HANDOFF
ADD_GUESS S, S, C, O; SUBMIT_GUESS   # 1 / 3
ADD_GUESS S, C, O, S; SUBMIT_GUESS   # 4 / 0 -> result
ADVANCE_ROUND                         # match result
```

冻结摘要：

```text
actions: 40
round 0 breaker/player 1: solved in 3
round 1 breaker/player 0: solved in 2
scores by player: [2, 3]
winnerIndex: 0
phase: match-result
```

同一日志深克隆后重放必须得到深相等状态；每步 state 都通过 `assertState`。另有七次失败、双方失败平局、同次数平局、cover/resume、任意阶段重开的独立日志。

## 14. 自动检查与静态 Gate

至少覆盖：

1. 常量、ingredient 顺序、默认配置与递归冻结；
2. secret 四格、最多两份、至少三种的全部边界；
3. scoreGuess 的零/全/交叉/重复/多余重复/输入不变；
4. action 精确字段、非法原型、getter 抛错、错 phase 幂等；
5. phase/角色/secret/draft/guess/history/results 的全矩阵；
6. handoff、covered、guessing view 无秘密，round-result 才揭晓；
7. 每条伪造 feedback 与 round result 均被重算拒绝；
8. 成功 1..7、失败 8、双方胜与平局纯派生；
9. 40-action golden replay、JSON 往返、深冻结、输入不变；
10. 配置逐字段回退、策略摘要冻结与安全回退；
11. HTML 经典脚本顺序、无 module/远程 URL/网络/存储/共享路径；
12. 初始 DOM 不含结果或秘密容器内容，app 不用 innerHTML/eval/debug 全局；
13. CSS 含 48px、320/390 断点、reduced motion、forced colors 和背景回退；
14. README/ATTRIBUTION 含五个固定 MIT commit、官方商标边界、论文边界、ImageGen 与零复制。

## 15. 浏览器验收

- 1280×800 完成 setting → cover/resume → handoff → 三次猜中 → swap → 两次猜中 → match result；
- setting 草稿在 Escape、blur、hidden 后从 DOM 消失，显式恢复才重新创建；
- handoff/guessing DOM 全文与属性扫描不含 secret 顺序，round result 才出现；
- 重复边界实际反馈为 1/2、2/2、1/3，最终两轮比分 2–3；
- 七次失败路径、双方同次数平局与任意阶段重开至少用逻辑测试完整覆盖，浏览器补走一条失败或平局路径；
- 数字键、Backspace、Escape、Tab/Enter 与 Pointer 按钮均能完成对应动作，历史新增不抢焦点；
- 1280×800、390×844、320×700 无横向溢出、按钮不低于 48px、当前输入与主动作不被历史推走；
- 背景失败、reduced motion、forced colors 只作 CODE/STATIC Gate 时必须在验收报告明确，不冒充动态截图；
- 根门户唯一找到作品并进入正确 URL；作品与门户无 console error/warning；
- IAB 若因安全策略拒绝 `file://`，不绕过，改以经典脚本/相对资源 Gate 证明并记录自动化边界。

## 16. 完成与提交标准

- 调研、规格、视觉设计、实施计划、纯逻辑、前端、目录、bugs、learn 与最终验收各自独立提交；
- 逻辑与前端由非重叠子任务实现，主线程复核接口、整合并负责最终浏览器；
- 每次实现改动后运行对应 Node 测试、全仓测试、`npm run verify`、语法检查与 `git diff --check`；
- 浏览器实玩、三档响应式、概念/实机 `view_image` 同轮对照、至少五项 fidelity ledger、above-fold copy diff 全部通过；
- 修复的真实问题一个 bug 一个文件写入 `bugs/`，稳定可复用结论写入 `learn/`；
- 工作区最终干净，临时截图和未使用生成资产删除，本地服务安全停止。
