# “每一格，都是喜欢你的理由”实现规格

规格日期：2026-07-21

对应调研：`docs/178-compliment-reels-research.md`

默认文案审计：`docs/179-compliment-reels-copy-audit.md`

目标目录：`experiences/surprises/compliment-reels/`

启动等级：A（直接双击 `index.html`，无安装、服务或公网）

## 1. 产品定义

这是一台给对象准备的本地“夸夸印刷机”。收礼者按下一个原生把手，每次得到由三段专属短句组成的完整夸奖。一轮在第 3–6 次之间出现唯一“特别同频”，随即展开准备者写好的私人结语。

首版只做：

- 一个入口；
- 三列固定语法槽；
- 一次预提交的六格计划；
- 一个原生拉动按钮；
- 普通结果、特别同频终局与重新开始；
- 本地配置、无障碍、降动效和离线降级。

首版明确不做：

- 付费、下注、硬币、余额、筹码、赔率、赔付、兑换、现金奖励；
- 输赢、分数、等级、连胜、near-miss、自动连抽或单轮无限抽取；终局仍允许用户主动开始新一轮；
- 锁轴、重转单列、用户选择词条或编辑器；
- 账号、分享、复制、截图导出、排行榜或持久历史；
- 音频、振动、权限请求、远程字体或第三方运行依赖。

页面固定说明：

> 这一轮最多六次，会遇到一组特别同频；顺序在开始时已经排好。每一次，都只是认真夸你。

不得把它描述为每拉独立随机、所有三元组同概率或赌博公平性证明。

## 2. 文件与职责

```text
experiences/surprises/compliment-reels/
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

经典脚本顺序固定为 `config.js → logic.js → app.js`。不用 ES Module、dynamic import、bundler 或运行时 fetch。

- `config.js`：两个称呼、18 条纯文本与 5–10 行结语 composer；
- `logic.js`：配置清洗、entropy 映射、计划、reducer、public view 和一次性 ARM helper；
- `app.js`：DOM 渲染、原生 click、activation gate、动画 token、焦点、live 与环境降级；
- `styles.css`：已接受视觉概念的响应式实现；
- `logic.test.js`：纯 Node，零 DOM；
- README/ATTRIBUTION：玩法、隐私、配置、固定来源、许可证与零复制声明。

`logic.js` 使用浏览器全局/CommonJS 双出口；导入时不得访问 DOM、crypto、Date、存储、网络或启动计时器。

## 3. 冻结常量与内容

```js
VERSION = 1
PLAN_LENGTH = 6
JACKPOT_MIN_SPIN = 3
JACKPOT_MAX_SPIN = 6
ENTROPY_LENGTH = 64
UINT32_RANGE = 4294967296
MAX_REVISION = Number.MAX_SAFE_INTEGER
```

列顺序、标签和条目 ID 固定：

```js
COLUMN_IDS = ["moment", "shine", "echo"]
COLUMN_LABELS = {
  moment: "我看见的你",
  shine: "发亮的样子",
  echo: "留给我的感觉"
}

ITEM_IDS = {
  moment: ["m_listen", "m_remember", "m_finish", "m_slow", "m_notice", "m_care"],
  shine: ["s_gentle", "s_light", "s_safe", "s_steady", "s_lovely", "s_true"],
  echo: ["e_beside", "e_here", "e_closer", "e_strength", "e_future", "e_smile"]
}

SIGNATURE_IDS = {
  moment: "m_slow",
  shine: "s_safe",
  echo: "e_here"
}
```

默认 18 条文本与顺序以 `docs/179-compliment-reels-copy-audit.md` 为唯一内容依据。canonical inventory SHA-256 固定为：

```text
d399e92747960af6d0d281d77da0e39a4a2ad0f22f592b8ca511153cab8b6fb0
```

生产逻辑导出的默认 inventory 必须重新构造同一 canonical JSON 并通过该哈希，测试不能维护第二份库存答案。

固定合成函数：

```js
composePraise(moment, shine, echo) {
  return `${moment}，${shine}，${echo}。`;
}
```

配置文本不得含 `，`、`。`、换行或控制字符，标点只由合成器添加。

## 4. 配置合同

默认形状：

```js
window.COMPLIMENT_REELS_CONFIG = {
  recipient: "你",
  sender: "我",
  columns: {
    moment: [
      { id: "m_listen", text: "你认真听我说话的时候" },
      // 其余五项按冻结顺序
    ],
    shine: [
      { id: "s_gentle", text: "总有一种很温柔的认真" },
      // 其余五项按冻结顺序
    ],
    echo: [
      { id: "e_beside", text: "让我更喜欢和你并肩的日子" },
      // 其余五项按冻结顺序
    ]
  },
  composeJackpotNote(summary) {
    // TODO（可选学习入口）：按已经封好的本轮夸奖，写 5–10 行纯文本策略。
    return `${summary.recipient}，这些不是碰巧，是我真的一直这样看见你。——${summary.sender}`;
  }
};
```

`sanitizeConfig(candidate)` 只接受精确 own-data schema：

- 顶层精确 `recipient / sender / columns / composeJackpotNote`；
- `columns` 精确 `moment / shine / echo`；
- 每列是当前 realm 原生 dense Array，长度 6；
- 每个 item 精确 `id / text`，ID 与冻结顺序逐项相等；
- 两个称呼 Unicode trim 后各 `1..12` 字素且不得相同；
- moment 每项 `4..18`，shine `4..18`，echo `4..22` 字素；
- 每列 trim 后文本唯一；文本不得含全角逗号/句号、CR/LF 或 C0/C1 控制字符；
- composer 必须是函数；任何一项非法则整份使用默认配置；
- 返回值为递归冻结、与输入断开引用的 `{content, composeJackpotNote}`；content 不含函数。

程序只保证结构、长度、唯一性和纯文本边界，不声称理解用户自定义语义。README 必须提醒准备者预览全部 `6³=216` 组合；不增加跨列白名单。

## 5. Entropy 与无偏整数

公开 `buildSpinPlan(entropy)` 只接受：

- 当前 realm 原生 dense Array；
- 精确 64 项；
- 每项是整数 `0..4294967295`；
- 无 extra key、symbol、accessor、custom prototype 或自定义 iterator/map。

内部 cursor 从 index 0 顺序消费。`bounded(maxExclusive)` 冻结为：

```js
limit = 4294967296 - (4294967296 % maxExclusive)

while (还有 entropy) {
  word = entropy[nextIndex++]
  if (word < limit) return word % maxExclusive
}

return null
```

完整调用序列精确为 `4, 5, 4, 3, 2, 5, 4, 3, 2, 5, 4, 3, 2`：先决定 Jackpot 位置，再依次洗牌 moment、shine、echo。不得用浮点缩放、`Math.random` 或余数直接接受超出 limit 的 word。任一次拒绝采样耗尽都让完整 build 返回 `null`。

## 6. 六格协调计划

计划精确形状：

```js
{
  jackpotSpin: 3 | 4 | 5 | 6,
  stops: [
    [momentId, shineId, echoId],
    // 精确 6 个 dense triple
  ]
}
```

构造顺序不可交换：

1. `jackpotSpin = 3 + bounded(4)`；
2. 按 `moment → shine → echo` 顺序处理列；
3. 每列从冻结 ID 顺序移除 signature，得到五项 remaining；
4. 对 remaining 做 Fisher–Yates：`i=4..1`，每步 `j=bounded(i+1)`，交换 `i/j`；
5. 在 zero-based `jackpotSpin - 1` 放 signature，其余位置按洗牌后顺序填入；
6. 按位置合并三列为六个 stop；
7. 运行完整 plan validator 后才返回递归冻结结果。

合法 plan 必须同时满足：

- 精确 own-data object/array schema；
- 每列投影都是冻结 ID 的完整排列；
- signature triple 只在 `jackpotSpin - 1` 出现一次；
- 前两格不是 signature triple；
- 六个 triple 唯一；
- 不包含 text、entropy、randomMode 或未来结语。

## 7. Fallback 与固定 fixtures

`FALLBACK_ENTROPY` 精确为普通数组 `[0,1,2,…,63]`。其 canonical `JSON.stringify` SHA-256 为：

```text
a49d88051b2d2e5d1255d4f806a7569cda9b33a650a908566197031349ad8db4
```

该数组消费 13 项，生成 `jackpotSpin=3` 和以下 plan：

```text
1 m_care     / s_lovely / e_closer
2 m_notice   / s_true   / e_beside
3 m_slow     / s_safe   / e_here      ← signature
4 m_listen   / s_light  / e_future
5 m_finish   / s_steady / e_strength
6 m_remember / s_gentle / e_smile
```

四个最小位置 fixture 都是长度 64 的普通数组；除第一项外全部为 0：

| 第一项 | jackpotSpin | signature 位置 | consumed |
| ---: | ---: | ---: | ---: |
| 0 | 3 | stop 3 | 13 |
| 1 | 4 | stop 4 | 13 |
| 2 | 5 | stop 5 | 13 |
| 3 | 6 | stop 6 | 13 |

拒绝采样另冻结两个 fixture：

1. 耗尽：`entropy[0] = 0`，`entropy[1..63] = 4294967295`；第一个 `bounded(5)` 持续拒绝并耗尽，完整 build 返回 `null`；
2. 拒绝后继续：`entropy[0] = 0`，`entropy[1] = 4294967295`，`entropy[2..63] = 0`；第一个 `bounded(5)` 拒绝 index 1、接受 index 2，后续从 index 3 消费，不能复用拒绝值，完整 build 总消费 14 项。

## 8. ARM helper 与一次性 composer

公开 `createArmAction(rawConfig, entropy, randomMode)` 是正常应用创建 ARM 的唯一入口：

1. `sanitizeConfig`，非法整份回默认；
2. mode 只接受 `"crypto" / "fallback"`；
3. fallback 模式要求 entropy 与 `FALLBACK_ENTROPY` 逐项相等；crypto 模式接受任意合法 entropy，包括内容恰等于 fallback；
4. 调用 `buildSpinPlan`；null 则 helper 返回 null；
5. 用清洗 content 把 plan 从 stop 1 投影到 jackpotSpin，得到将来完成摘要；
6. 用断开引用、递归冻结、递归 mutation-guard Proxy 的 summary 调用 composer 一次；
7. 若 composer 尝试 set/delete/defineProperty/setPrototypeOf、抛错、返回 thenable/非字符串、trim 后空白或超过 120 字素，使用默认结语；
8. 返回递归冻结、断引用的纯数据 action：

```js
{
  type: "ARM",
  entropy: [/* 64 uint32 */],
  randomMode: "crypto" | "fallback",
  content: {
    recipient,
    sender,
    columns: { moment: [...], shine: [...], echo: [...] }
  },
  jackpotNote: "已经解析的纯文本"
}
```

summary 精确为：

```js
{
  recipient,
  sender,
  pullCount: jackpotSpin,
  revealedPraises: [/* stop 1 到 signature 的完整句 */],
  jackpotPhrase: "signature 完整句"
}
```

reducer、public view 与日志重放绝不再次调用 composer。action log 包含已解析 note 与 content snapshot，因此同一 JSON action log 可脱离原函数重放。

## 9. 权威 state

精确 state：

```js
{
  version: 1,
  phase,
  content,
  plan,
  settledCount,
  randomMode,
  jackpotNote,
  spinToken,
  revision
}
```

初态：

```js
{
  version: 1,
  phase: "intro",
  content: null,
  plan: null,
  settledCount: 0,
  randomMode: null,
  jackpotNote: null,
  spinToken: null,
  revision: 0
}
```

阶段不变量：

| phase | content/plan/mode/note | settledCount | spinToken |
| --- | --- | ---: | --- |
| intro | 全部 null | 0 | null |
| ready | 全部合法非 null | 0 | null |
| spinning | 全部合法非 null | `0..jackpotSpin-1` | 等于当前 revision |
| result | 全部合法非 null | `1..jackpotSpin-1` | null |
| jackpot | 全部合法非 null | 精确 jackpotSpin | null |

通用不变量：

- version 精确 1；
- revision 是 `0..MAX_REVISION` 安全整数；
- 合法 ready/result 必须满足 `revision <= MAX_REVISION - 2 * (plan.jackpotSpin - settledCount)`，为全部剩余 stop 的 PULL/SETTLE 预留空间；
- 合法 spinning 必须满足 `revision <= MAX_REVISION - (2 * (plan.jackpotSpin - settledCount) - 1)`，为当前 SETTLE/SUSPEND 和后续 stop 预留空间；
- content、plan、note 与 action 输入断开；
- 非 intro 的 plan 通过完整 validator；
- settled prefix 内没有重复列项；
- result 的最新 stop 不是 signature；jackpot 的最新 stop 精确 signature；
- state 中不保存 entropy、composer、DOM、Animation、timer、Date 或随机源。

## 10. Reducer 动作

公开 `reduce(state, action)`；有效动作返回全新递归冻结 state，合法 state 上无效/非法动作返回原引用，非法 state 返回全新初态。

### 10.1 ARM

仅 intro 接受第 8 节精确 ARM action：

- 重新从 action.entropy 构建 plan，不能信任 action 传入 future stops；
- fallback/mode/content/note 全部验证；
- 仅当 `revision <= MAX_REVISION - (1 + 2 * plan.jackpotSpin)` 时接受，确保 ARM 自身以及本轮全部 PULL/SETTLE 都有单调 revision 空间；
- 写 content/plan/mode/note，phase=ready；
- settledCount=0、spinToken=null、revision+1。

### 10.2 PULL

action 精确为 `{type:"PULL"}`。仅合法 ready/result 且 `revision <= MAX_REVISION - 2 * (plan.jackpotSpin - settledCount)` 接受：

- `settledCount < plan.jackpotSpin`；
- 不增加 settledCount；
- phase=spinning；
- `spinToken = revision + 1`；
- `revision += 1`；
- 下一 stop 只由内部 `plan.stops[settledCount]` 锁定，public view 不公开。

### 10.3 SETTLE

action 精确 `{type:"SETTLE", spinToken}`。仅 spinning 且 token 精确等于 state.spinToken 接受：

- `nextCount = settledCount + 1`；
- 若 `nextCount === plan.jackpotSpin`，phase=jackpot；否则 phase=result；
- settledCount=nextCount、spinToken=null、revision+1；
- 不读取随机、时间、动画位置或 DOM。

### 10.4 SUSPEND

action 精确 `{type:"SUSPEND"}`。仅 spinning 接受，并调用同一个 settle 核心：

- 当前已锁定 stop 必须公开；
- 不能回 ready、丢弃 stop 或重抽；
- 与正确 token 的 SETTLE 产生完全相同的下一 state，包括相同的 `revision+1`；只有 action log 中的动作类型不同；
- 非 spinning 为同引用 no-op。

### 10.5 RESTART

action 精确 `{type:"RESTART"}`。仅 jackpot 接受：

- 还必须满足 `revision <= MAX_REVISION - (2 + 2 * JACKPOT_MAX_SPIN)`，为 RESTART、新 ARM 和最坏六次 PULL/SETTLE 预留 14 次递增；空间不足时保持原引用；
- 回到 intro 的 null 字段与 count=0；
- revision=旧 revision+1，不归零；
- spinToken=null；
- app 在同一次“再夸一局”click 内立即创建并派发新 ARM；
- crypto 失败时改用 fallback；若 fallback 也异常，保持 intro、显示“暂时没排好，请重试准备”，按钮为“重试准备”且焦点不丢。

任何动作只要没有上述所需 revision headroom，就必须返回原引用；不得溢出、饱和复用 token，或进入无法完成当前 stop/本轮的中间 phase。

## 11. Public view

公开 `getPublicView(state)`，是页面唯一规则来源：

```js
{
  phase,
  recipient,
  sender,
  columns: [
    { id: "moment", label: "我看见的你", text },
    { id: "shine", label: "发亮的样子", text },
    { id: "echo", label: "留给我的感觉", text }
  ],
  praise,
  revealedPraises,
  spinCount,
  maxSpins: 6,
  guaranteedBy: 6,
  isSpinning,
  canPull,
  canRestart,
  isJackpot,
  jackpotNote,
  animationToken,
  randomMode,
  revision
}
```

投影规则：

- invalid state 返回基于默认称呼的安全初态 view，不抛；
- intro/ready：三列 text、praise 为 null，revealedPraises 为空；
- spinning：若已有 settled prefix，保留上一条公开三列与 praise；首次 spinning 仍为 null；绝不投影 pending stop；
- result/jackpot：三列与 praise 为最新 settled stop；
- revealedPraises 只含 `plan.stops.slice(0, settledCount)` 的完整句；
- jackpotNote 仅 jackpot 返回 state 文本，其余阶段精确 null；
- animationToken 仅 spinning 返回 token，其余 null；
- randomMode 仅非 intro 返回；fallback 提示完全由该字段驱动；
- canPull 仅合法 ready/result 且 `revision <= MAX_REVISION - 2 * (plan.jackpotSpin - settledCount)` 为 true；
- canRestart 仅 jackpot 且 `revision <= MAX_REVISION - (2 + 2 * JACKPOT_MAX_SPIN)` 为 true；
- 不公开 item IDs、signature IDs、plan、jackpotSpin、精确剩余次数、future stops、entropy 或测试 fixture；
- 所有数组/对象递归冻结、断开内部引用。

页面不得自行拼句、判断 jackpot、切片历史、计算次数、决定下一 stop 或读取 config.js 绕过 view。

## 12. Hostile input

state/action/config/content/plan/entropy/summary 全部遵守同一快照边界：

- object：精确 own string keys、`Object.prototype`、data descriptors；
- array：当前 realm 原生 dense Array、精确索引+length、`Array.prototype`；
- 拒绝 null/custom prototype、array subclass、稀疏、extra key、symbol、accessor；
- 不调用输入的 iterator/map/forEach/toJSON/valueOf/toString；
- 顶层和每层先一次性读取 `ownKeys / getOwnPropertyDescriptor / getPrototypeOf`，验证与复制只消费 descriptor.value；
- 任一 snapshot trap 抛错即 fail closed；
- 合法 data-descriptor Proxy 即使 `get` late-throw，也不得触发 get；
- 所有数值先验证整数/安全范围，再参与加法、索引、乘法或模运算；
- 不修改、冻结或复用调用方输入。

测试至少含：action getter/symbol/extra；entropy sparse/subclass/custom iterator；plan stops custom map；state Proxy descriptor 合法但 get late-throw；content 嵌套 accessor；revision MAX；composer summary 深层 set/delete/define/setPrototype；返回 thenable getter 不得读取。

## 13. 浏览器准备与动画生命周期

初次加载：

1. 读取 `window.COMPLIMENT_REELS_CONFIG`；
2. 尝试 `Array.from(crypto.getRandomValues(new Uint32Array(64)))`；
3. `createArmAction(config, entropy, "crypto")`；
4. 若缺少 crypto 或 helper 返回 null，改用 `FALLBACK_ENTROPY / "fallback"`；
5. 派 ARM，渲染 ready；
6. 两条路径都失败时保持 intro 并给可重试诊断。

点击有效 PULL 后，先同步 reduce/render spinning，再启动三列纯表现动画：

- 动画条目只用无语义纸纹/短横，全部 `aria-hidden=true`；未来配置短句不得进入 DOM；
- 三列可错峰停止，但只有一个 token 化会话完成器；
- Web Animations `finished`、过滤后的 finish 事件和 timeout fallback 任一路先到，统一调用 `finishSpin(token)`；
- `finishSpin` 先清 listener/timer/Animation，再派 `{type:"SETTLE",spinToken:token}`；
- cancel 导致 rejected Promise 必须 catch，不产生 unhandled rejection；
- 后到回调、重复事件、错误 target/name、重开前 token 都因 reducer phase/token 成为 no-op；
- 视觉动画不得使用 forwards fill 长期占用；结束/取消后恢复 code-native DOM 状态。

初始 `prefers-reduced-motion: reduce` 时，PULL 后用受 token 守卫的 microtask settle，不做高速纵移、把手甩动、缩放、模糊或粒子。旋转中偏好切为 reduce、document hidden、pagehide 或 window blur 时，立即清视觉资源并派 SUSPEND；不重抽，不追赶时间。

## 14. Activation gate

把手是持久原生 `<button type="button">`，PULL 唯一入口是它的 `click`：

- 不在 pointerdown/touchend/keydown 直接派 PULL；
- 视觉子元素 `pointer-events:none`；
- 聚焦按钮的 Enter/Space keydown 只维护 held set；首次保留原生行为，repeat 或仍 held 的同 code 只 preventDefault；
- keyup、button blur、window blur、pagehide 清 held；
- click.detail=0 视为键盘/辅助技术路径，不套 pointer 冷却；
- click.detail>1 直接忽略；
- 对 detail>0 的已接受 click 记录 monotonic event.timeStamp，350ms 内后续 pointer/touch click 忽略；
- event.timeStamp 非有限数或倒退时 fail closed 忽略该 pointer click；
- gate 不进入 reducer、不使用 Date/random/动画时长，也不改变 plan；
- spinning 时按钮 disabled 只是语义/视觉补充，phase 仍是权威门。

必须分别验证 normal、初始 reduced、旋转中切 reduce、hidden 同步 settle 下，长按 Enter/Space、快速双击和双击 tap 都只消费一个 stop。

## 15. 页面与无障碍

main 直接子级 DOM 顺序固定：

```text
页头 → 有限保证说明 → 三列压纸框 → 完整结果 → 阶段说明 → 已揭晓列表
→ 特别结语 → 主把手 → fallback 提示 → live region
```

移动端不使用 CSS order 或 display:contents 反转。

阶段说明是稳定的 `main` 直接子级 `<p class="stage-copy">`，位于完整结果之后、已揭晓列表之前。准备失败时，其主文字后追加唯一条件性 `<span class="failure-diagnostic">暂时没排好，请重试准备</span>`；其他阶段不创建诊断副本。`stage-copy` 是持续可见正文，不复用 live region，也不把诊断塞进完整结果 `output`。

固定阶段文案：

| phase | 主说明 | 主按钮 |
| --- | --- | --- |
| intro/准备失败 | `正在把这一轮排好。` / 诊断 | `重试准备` |
| ready | `第一句，等你来拉。` | `拉一下，夸夸你` |
| spinning | `正在把三段心意排在一起。` | `正在组合…`（disabled） |
| result | `这一句已经印好了。` | `再拉一句` |
| jackpot | `特别同频到了，这些都是真心话。` | `再夸一局` |

可访问合同：

- 三列不是用户选择控件，不使用 listbox/option 或自造 slotmachine role；
- 每列稳定标签和最终 text 是普通文本；装饰动画 `aria-hidden`；
- reel 容器 spinning 时 `aria-busy=true`，按钮不用 aria-pressed；
- 页面预先存在唯一 `<p role="status" aria-live="polite" aria-atomic="true">`；
- 普通 settle 一次写 `本局第 n 次：{完整句}`；
- jackpot settle 一次写 `特别同频已出现：{完整句}。私人结语已展开。`；
- 同文本再次出现时以 token 守卫的 microtask 清空再写，不能产生双播；
- 正常流程复用同一个按钮节点并保留焦点；disabled 导致焦点丢失的浏览器在 settle 后只恢复到该按钮；
- 特别同频有标题、星形压印/双线结构和文字，不只依靠颜色、声音或动画；
- forced-colors 使用系统色、边框和文本；
- 无 JS 时显示静态说明与开启 JavaScript 提示，不显示结果或保证已实现。

## 16. 隐私与安全文案

- `config.js` 与其中的称呼、短句和 composer 是本地磁盘明文，刷新或重开不会删除；要删除或修改这些内容必须编辑该文件；
- 清洗后的运行时配置副本、entropy、六格计划、当前轮历史和已解析结语只在本机内存，不写浏览器存储；刷新或关闭页面会清空本轮状态；
- 应用不联网、不上传、不额外写入浏览器存储、不分析、不复制到剪贴板；
- config.js 是本地明文，会查看源文件的人能读到全部短句与 composer；这不是密码学保密；
- 正常页面流程不在 DOM、data 属性、ARIA 文本或 console 提前暴露 future stop、signature ID 或结语；
- 动态配置只写 textContent；不使用 innerHTML、insertAdjacentHTML 或字符串事件处理器；
- 不记录 entropy、计划、私人文本或 action log 到 console/storage；测试 fixture 只使用默认内容。

## 17. 视觉与响应式 Gate

视觉方向冻结为“桌面夸夸印刷机”：深梅红机身、奶油纸卷、珊瑚把手、墨蓝正文、少量黄铜压边与静态星形压印。它不是赌场机柜，不出现 BAR、7、铃铛、樱桃、金币、筹码、余额、赔率、payline、现金或真实品牌 trade dress。

完整视觉概念仍需在图像偏好确认后生成并接受；设计文档必须提取 token、字体、组件、装饰资产、允许文案、移动重排与至少五项 fidelity ledger。未接受概念前不编写页面实现。

响应式硬 Gate：

| 视口 | 100% zoom 必须通过 |
| --- | --- |
| 1504×1046 | 无横纵滚；题名、保证、三列、结果和把手同屏 |
| 1280×800 | 无横向滚；压纸框≥720×300；结果与把手同屏 |
| 768×1024 | 三列并排、完整句全宽、主按钮≥48px |
| 390×844 | 三列优先并排且可换行；合法最大配置不截断、不横溢 |
| 320×568 | 允许按 moment→shine→echo 堆叠；保留段标签/完整句；允许纵滚、零横溢 |

另在 1280×800 与 1504×1046 做 200% zoom，在 1280 宽做 400% zoom；布局视口约 320 CSS px 时允许同顺序堆叠、允许纵滚、禁止二维滚动。所有档位使用两个称呼和 18 条短句同时达到合法最大字素的配置，并检查：图片阻断、reduced-motion、forced-colors、焦点环、safe-area、文本截断、按钮中心 elementFromPoint、console 与 network。

## 18. 借鉴与资产声明

README/ATTRIBUTION 必须与 `docs/178-compliment-reels-research.md` 一致固定，不得缩写以下事实：

- Slot Machine Generator commit [`56c9017e839583dcb8fcb5cc88b08b30ed63f66a`](https://github.com/nuxy/slot-machine-gen/commit/56c9017e839583dcb8fcb5cc88b08b30ed63f66a)，[MIT LICENSE](https://github.com/nuxy/slot-machine-gen/blob/56c9017e839583dcb8fcb5cc88b08b30ed63f66a/LICENSE)，`Copyright (c) 2020-2025 Marc S. Brooks (https://mbrooks.info)`；
- seedrandom commit [`4460ad325a0a15273a211e509f03ae0beb99511a`](https://github.com/davidbau/seedrandom/commit/4460ad325a0a15273a211e509f03ae0beb99511a)，仓库没有独立 LICENSE 文件，MIT 全文位于 [README 的 LICENSE 章节](https://github.com/davidbau/seedrandom/blob/4460ad325a0a15273a211e509f03ae0beb99511a/README.md)，`Copyright 2019 David Bau.`；
- Tween.js commit [`20079e65f77bb2b8e52cc9d7dbed044b86e537d3`](https://github.com/tweenjs/tween.js/commit/20079e65f77bb2b8e52cc9d7dbed044b86e537d3)，[MIT LICENSE](https://github.com/tweenjs/tween.js/blob/20079e65f77bb2b8e52cc9d7dbed044b86e537d3/LICENSE)，`Copyright (c) 2010-2012 Tween.js authors.`，`Easing equations Copyright (c) 2001 Robert Penner http://robertpenner.com/easing/`；
- canvas-confetti commit [`20eebad51dde793070c373d594099a7ed8d96e22`](https://github.com/catdad/canvas-confetti/commit/20eebad51dde793070c373d594099a7ed8d96e22)，[ISC LICENSE](https://github.com/catdad/canvas-confetti/blob/20eebad51dde793070c373d594099a7ed8d96e22/LICENSE)，`Copyright (c) 2020, Kiril Vatev`；
- 每项只写实际研究的抽象机制和明确未复制范围；
- jQuery-SlotMachine 的 LICENSE/package GPL 与 README MIT 冲突，作为排除项；
- 未许可 Gist、来源不明图片/音效、赌场品牌与 trade dress 全排除；
- 本作零第三方运行依赖，不复制源码、API、随机算法、缓动公式、参数、测试、UI、文案或素材；
- ImageGen 资产逐项记录提示词、日期、尺寸、格式、SHA-256 与第三方输入“无”；不得烘焙 UI 文字、按钮、答案或品牌。

## 19. 纯逻辑测试矩阵

至少覆盖：

1. 默认 inventory 哈希、18 项、signature、216 句数量/唯一/标点/字素；
2. config exact schema、trim、字素 ±1、重复、标点、控制字符、extra/accessor/prototype、整份回退；
3. buildSpinPlan entropy 长度/uint32 边界、拒绝值、耗尽、不修改输入；
4. Fisher–Yates 消费顺序、四个 jackpot fixture、fallback hash/精确 plan；
5. 每列完整排列、六 triple 唯一、signature 唯一、前两次普通；
6. createArmAction crypto/fallback、fallback 内容匹配、composer 一次调用、summary 精确/冻结/断引用；
7. composer mutation、throw、thenable、空白、超长、非字符串全部默认；合法闭包结果只写 action 一次；
8. 初态、ARM、PULL、SETTLE、SUSPEND、RESTART 全阶段与 revision/token/count 不变量；
9. 错 token、重复 settle、spinning 重复 pull、终局继续拉、非法 phase，以及 ARM/PULL/RESTART 各自 headroom 边界同引用；
10. ready/result/spinning 的剩余整轮 headroom 不变量；只剩一个 stop 时 `MAX_REVISION-2` 可完成一次 PULL+SETTLE；合法转换永不产生 revision 为 MAX 的 spinning；
11. SUSPEND 与正确 SETTLE 的下一 state 完全相等；RESTART 不归零 revision；旧 token 无法命中新局；
12. public view 每阶段：pending/future 隐藏、历史前缀、note 遮蔽、fallback mode、冻结/断引用；
13. invalid state 安全初态 view；invalid state reduce 全新初态；合法 state+非法 action 原引用；
14. descriptor snapshot/Proxy/get late-throw、symbol/accessor/array subclass/custom iterator/map 等 hostile 矩阵；
15. JSON action log 与 clone log 在无 composer 函数时重放到字节等价 jackpot state/view；
16. 生产 logic 无 DOM/crypto/random/Date/timer/network/storage/HTML sink。

## 20. 浏览器与目录验收

浏览器：

- 真实 `file://` 完成 jackpotSpin=3/4/5/6 fixture 与重新开始；
- 鼠标 click、触屏 tap、Enter、Space 单次消费；四路径 activation gate；
- 三 reel 多 completion、错误事件、fallback 后迟到事件、重开旧回调只 settle 一次；
- spinning 中 reduced/hidden/pagehide/blur 立即 settle 同一 stop；
- 每阶段 DOM 不含 future text/signature ID/note；终局才出现 note；
- 焦点、单一 live、aria-busy、无 aria-pressed、forced-colors、无图与无动画完成；
- 五档视口、200%/400% zoom、最大配置、零横溢、命中盒≥48px；
- 零 console error/warning、零失败/公网请求、无 storage/permission；
- 接受概念与最新浏览器截图都用 view_image 检查，至少五项 fidelity ledger 无未解释漂移。

目录/全仓：

- experience.json exact schema、A 级、surprise、1 人、offline；
- catalog 入口、分类、计数、搜索、无远程资源/Module/fetch/storage；
- README/ATTRIBUTION 来源与许可证测试；
- 项目逻辑测试、catalog 测试、`npm test`、`npm run verify` 全绿；
- 若发现 bug，先在 `bugs/` 写复现、根因、修复和回归证据，再提交；
- 至少把“预提交协调洗牌与动画 token 分离”沉淀到 `learn/`；
- 文案审计、规格、视觉、逻辑、接口、bug、catalog、learn、verification 各自独立提交。

## 21. 学习贡献点

实现时在 `config.js` 保留可直接运行的默认 `composeJackpotNote(summary)` 和 5–10 行 TODO 注释。它是用户真正能改变惊喜语气的业务逻辑：

- 可以依据 pullCount、jackpotPhrase 或 revealedPraises 选择不同结尾；
- 应只返回 1–120 字素纯文本；
- 不应修改 summary、读取 DOM、改变计划或返回 HTML；
- 不修改也能完整游玩，错误会安全回默认。

代码骨架建立后再邀请用户贡献这 5–10 行，不让用户承担 boilerplate、输入验证或状态机实现。
