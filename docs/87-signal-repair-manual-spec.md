# A 级「把信号接回来」实现规格

> 状态：实施前冻结稿。上游调研见 [86-signal-repair-manual-research.md](./86-signal-repair-manual-research.md)。本文冻结首版产品范围、题库 DSL、状态机、配置、DOM、输入、视觉约束与验收标准；实现若偏离，必须先记录原因。

## 1. 产品一句话

两个人面对面把一台设备放在中间：操作员描述三条故障星路，领航员按自己的优先规则口述判断，操作员在 45 秒内接回唯一正确的分支；四轮逐轮交换角色后，一封私人传输被完整拼回。

作品是轻松的沟通推理，不是拆弹仿作、电气模拟或反应力竞速。失败不爆炸、不扣生命、不清空已完成进度。

## 2. 首版范围

### 2.1 必须有

- A 级 `file://` 直接打开，零第三方运行依赖、零公网请求；
- 12 张原创故障卡，无放回选择 4 张；
- 桌面面对面双朝向、窄屏单列交接两种布局；
- 操作员题面与领航员规则同时可见，但明确采用同桌荣誉制；
- 每轮 45 秒、错误选择锁定 900ms、超时同题重试；
- 每轮交换上下两位玩家的角色；
- 题库唯一解、无放回抽取、纯 reducer、整数 tick 与确定重放测试；
- 键盘、Pointer、reduced motion、无颜色与无背景资产降级；
- 本地可编辑双方称呼和最终私人传输；
- 作品内 README、借鉴声明与固定来源。

### 2.2 明确不做

- 炸弹、拆弹、电线、序列号、电池、指示灯、模块、爆炸、生命或失误次数；
- 打印手册、第二设备、局域网房间、联网语音或远程匹配；
- 运行时随机拼规则、玩家自定义题库、关卡编辑器或每日挑战；
- 分数、排行榜、胜负、惩罚性倒扣或医疗/关系效果声称；
- Canvas 作为主要交互、外部字体、音频、CDN、WebGL、框架或构建步骤。

## 3. 文件与公开接口

```text
experiences/co-op/signal-repair-manual/
├── index.html
├── styles.css
├── config.js
├── logic.js
├── logic.test.js
├── app.js
├── assets/
│   └── signal-dust.webp       # 可选装饰；缺失不影响玩法
├── README.md
└── ATTRIBUTION.md
```

- `config.js` 暴露 `window.SIGNAL_REPAIR_CONFIG`；
- `logic.js` 同时暴露浏览器全局 `window.SignalRepairLogic` 与 CommonJS `module.exports`，不得使用 ES Module，以保证 `file://`；
- `app.js` 只负责配置清洗、DOM、输入、计时驱动、随机源和渲染；不重复业务判定；
- `logic.test.js` 使用 Node 内置断言，不增加测试依赖。

`SignalRepairLogic` 至少公开：

```text
DEFAULT_PUZZLES, DEFAULT_CONFIG, TICKS_PER_SECOND,
sanitizeConfig, validatePuzzleBank, explainRule,
solvePuzzle, createSession, createInitialState,
reduce, getView, replay, classifyKey,
createUnbiasedRandomIndex
```

## 4. 配置 schema

```js
window.SIGNAL_REPAIR_CONFIG = {
  northName: "北席",
  southName: "南席",
  transmissionFragments: [
    "原来每次信号微弱时，",
    "都是你还在另一端回应。",
    "以后也请继续和我说话，",
    "我会一直把你接回来。"
  ]
};
```

清洗规则：

- `northName`、`southName` 去首尾空白后按 Unicode code point 限 12 字；空值或非字符串逐字段回退；
- `transmissionFragments` 必须是恰好 4 个非空字符串的数组，否则整组回退；每项去空白后限 48 字；
- 配置和运行状态递归冻结；清洗结果不共享调用方数组或对象引用；
- 文案只通过 `textContent` 写入，不使用 `innerHTML`；
- 题库、轮数、时间、规则和答案不开放给首版配置，避免私人定制破坏唯一解。

## 5. 题库 DSL

### 5.1 分支

```ts
type Branch = {
  id: "A" | "B" | "C";
  texture: "ripple" | "grain" | "lattice";
  nodeCount: 2 | 3 | 4 | 5 | 6 | 7;
  symbol: "moon" | "comet" | "ring";
  signal: "low" | "middle" | "high";
};
```

显示映射固定为：

| 字段 | token | 中文显示 | 冗余视觉 |
| --- | --- | --- | --- |
| texture | `ripple / grain / lattice` | 波纹 / 星砂 / 网格 | 三种 CSS 纹理和文字 |
| symbol | `moon / comet / ring` | 月弧 / 彗尾 / 星环 | 原创 CSS/SVG 几何符号和文字 |
| signal | `low / middle / high` | 微弱 / 平稳 / 明亮 | 1/2/3 格刻度和文字 |
| nodeCount | `2 .. 7` | `N 个节点` | 实际 N 个圆点和数字 |

### 5.2 规则

```ts
type Rule =
  | { kind: "parity"; value: "even" | "odd" }
  | { kind: "symbol"; value: Branch["symbol"] }
  | { kind: "texture"; value: Branch["texture"] }
  | { kind: "signal"; value: Branch["signal"] }
  | { kind: "node-extreme"; value: "min" | "max" }
  | { kind: "signal-extreme"; value: "min" | "max" };
```

`explainRule(rule)` 从 token 生成唯一中文模板；机器匹配也只读同一 token，不允许题卡另存自由文本。模板为：

- parity：`若恰有一条星路的节点数为偶数/奇数，接回它。`
- symbol：`若恰有一条星路带月弧/彗尾/星环，接回它。`
- texture：`若恰有一条星路呈波纹/星砂/网格，接回它。`
- signal：`若恰有一条星路的信号微弱/平稳/明亮，接回它。`
- node-extreme：`若只有一条星路的节点最少/最多，接回它。`
- signal-extreme：`若只有一条星路的信号最低/最高，接回它。`

求解器从第一条规则向下：某条规则匹配恰好一个分支时立即返回；匹配 0 个或多于 1 个时继续；全部不能唯一命中则题卡非法。`solvePuzzle` 返回 `{ branchId, ruleIndex, ruleText }`，不得接受题卡内预存答案。

### 5.3 题卡 schema

```ts
type Puzzle = {
  id: string;
  title: string;
  transmissionIndex: 0 | 1 | 2 | 3;
  branches: readonly [Branch, Branch, Branch];
  rules: readonly [Rule, Rule, Rule];
};
```

`validatePuzzleBank` 必须验证：恰好 12 张；ID 唯一；标题非空且不超过 12 code points；每张 A/B/C 各一次；所有 token 合法；三条分支字段对象不共享；三条规则恰好有一条按优先级首先唯一命中；求解结果为现有分支；题库递归冻结。

## 6. 十二张冻结题卡

紧凑分支格式为 `ID·纹理·节点·符号·信号`。规则从左到右按优先级执行；括号中的 `R1/R2/R3` 是首条唯一命中的规则，答案由求解器推导，不存入配置。

| ID / 标题 | A / B / C | 规则 1 → 2 → 3 | 预期解释 |
| --- | --- | --- | --- |
| `echo-01` 初醒微光 | A·波纹·2·月弧·微弱 / B·星砂·3·彗尾·平稳 / C·网格·5·星环·明亮 | 偶数 → 月弧 → 信号最高 | R1 → A |
| `echo-02` 偏航薄雾 | A·波纹·3·月弧·微弱 / B·星砂·4·彗尾·平稳 / C·网格·6·星环·明亮 | 偶数 → 月弧 → 信号最高 | R2 → A |
| `echo-03` 静默潮汐 | A·波纹·2·月弧·微弱 / B·星砂·4·彗尾·明亮 / C·网格·6·星环·平稳 | 偶数 → 月弧 → 信号最低 | R2 → A |
| `echo-04` 深空回声 | A·波纹·3·月弧·平稳 / B·星砂·5·月弧·微弱 / C·网格·7·彗尾·明亮 | 奇数 → 月弧 → 信号最高 | R3 → C |
| `echo-05` 双星干涉 | A·波纹·4·月弧·微弱 / B·星砂·4·彗尾·明亮 / C·网格·5·星环·平稳 | 偶数 → 星环 → 节点最多 | R2 → C |
| `echo-06` 折返信标 | A·波纹·2·月弧·明亮 / B·波纹·5·彗尾·微弱 / C·网格·6·星环·平稳 | 波纹 → 偶数 → 信号最低 | R3 → B |
| `echo-07` 暗面漂移 | A·星砂·2·月弧·平稳 / B·网格·5·彗尾·平稳 / C·波纹·7·星环·微弱 | 信号平稳 → 奇数 → 节点最少 | R3 → A |
| `echo-08` 近日扰动 | A·网格·6·月弧·明亮 / B·星砂·3·彗尾·明亮 / C·波纹·5·星环·平稳 | 信号明亮 → 奇数 → 节点最多 | R3 → A |
| `echo-09` 远日衰减 | A·星砂·7·星环·明亮 / B·网格·2·月弧·微弱 / C·波纹·4·彗尾·微弱 | 信号微弱 → 偶数 → 节点最多 | R3 → A |
| `echo-10` 晶格噪声 | A·星砂·3·月弧·微弱 / B·星砂·5·彗尾·明亮 / C·网格·4·星环·平稳 | 星砂 → 奇数 → 星环 | R3 → C |
| `echo-11` 环带遮蔽 | A·波纹·2·星环·微弱 / B·星砂·3·星环·平稳 / C·网格·5·月弧·明亮 | 星环 → 奇数 → 信号最高 | R3 → C |
| `echo-12` 余波重叠 | A·网格·6·彗尾·明亮 / B·星砂·3·月弧·平稳 / C·波纹·5·星环·明亮 | 信号明亮 → 奇数 → 信号平稳 | R3 → B |

难度顺序通过规则深度建立：前三张解释跳过规则；后九张以两次不唯一后再命中为主。实际抽取无放回但不强制难度顺序，首版将卡片本身视为短谜题而非渐进教程。

## 7. 局计划与无偏随机

`createSession(puzzles, randomIndex, count = 4)`：

1. 先完整校验题库；
2. 复制 ID 池，不修改源数组；
3. 重复请求 `randomIndex(pool.length)`，取出对应项直到四张；
4. 随机函数抛错、返回非整数或越界时，安全采用当前池索引 0；
5. 返回四个唯一 ID 的冻结数组。

浏览器 `createUnbiasedRandomIndex(cryptoLike)` 使用 32 位 rejection sampling：对上界 `n`，拒绝 `uint32 >= floor(2^32 / n) * n`，再取模；若 `cryptoLike.getRandomValues` 不存在或抛错，调用方传入固定索引函数 `() => 0`，不使用 `Math.random()`。

重放和测试始终显式传入题目 ID 计划，不依赖浏览器随机结果。

## 8. 权威状态

```ts
type Phase =
  | "intro"
  | "handoff"
  | "playing"
  | "round-result"
  | "timeout"
  | "paused"
  | "complete";

type State = {
  phase: Phase;
  plan: readonly string[];
  roundIndex: number;
  northRole: "operator" | "navigator";
  ready: { north: boolean; south: boolean };
  remainingTicks: number;
  lockTicks: number;
  attempts: number;
  completed: readonly {
    puzzleId: string;
    operatorSeat: "north" | "south";
    attempts: number;
    remainingTicks: number;
    branchId: "A" | "B" | "C";
    ruleIndex: number;
  }[];
  outcome: null | {
    branchId: "A" | "B" | "C";
    ruleIndex: number;
    ruleText: string;
  };
  pausedFrom: null | "playing";
  revision: number;
};
```

南席角色始终是北席相反角色。第 0、2 轮南席为操作员，第 1、3 轮北席为操作员。派生字段不进入状态；当前题、南席角色、剩余秒数、按钮能力和传输片段通过 `getView` 计算。

所有合法新状态递归冻结；非法 action、阶段不允许的 action、未知 ID、畸形状态一律安全返回原引用，不抛异常。reducer 不读取 Date、DOM、CSS、随机源或全局配置。

## 9. Action 与状态转移

| Action | 允许阶段 | 行为 |
| --- | --- | --- |
| `START { plan }` | intro | 校验四个唯一题 ID，进入 handoff，装载第 0 轮 |
| `READY { seat }` | handoff | 将对应席位设 ready；两边均 ready 后进入 playing、450 ticks |
| `SELECT { branchId }` | playing 且 lockTicks=0 | 正确则写一条 completed 并进入 round-result；错误则 attempts + 1、lockTicks=9 |
| `TICK { ticks }` | playing | 只接受正整数；同时递减 remainingTicks 与 lockTicks；时间归零优先进入 timeout |
| `PAUSE { reason }` | playing | 进入 paused，保留所有计时和题面状态 |
| `RESUME` | paused | 回到 playing，不补扣离开期间的 tick |
| `RETRY` | timeout | 同题回 handoff，ready 清零、450 ticks、lock=0；attempts 保留 |
| `NEXT` | round-result | 若不是第 4 轮则换角色进 handoff；否则进入 complete |
| `RESTART` | complete | 回到 intro，清计划、进度、结果和尝试 |

同一条 `TICK` 若同时让 `remainingTicks` 归零和 `lockTicks` 解锁，超时优先。`SELECT` 正确后只写一次记录；round-result、timeout、paused、complete 中的 SELECT/TICK 都保持原引用。

`revision` 只在合法状态变化时加一；ready 重复确认、锁定期选择、边界外 tick 和未知 action 不增加。

## 10. 计时驱动

- 单逻辑 tick = 100ms，`TICKS_PER_SECOND = 10`，每轮 `450` ticks；
- `requestAnimationFrame` 驱动持有真实时间 accumulator；每积满 100ms 派发整数 ticks；
- 单帧 delta 钳制到 500ms，超过阈值不追赶；
- `visibilitychange` hidden、`window.blur` 和页面冻结触发 `PAUSE`；回到前台不自动恢复，显示共享「继续这一轮」按钮；
- `RESUME` 前清空 accumulator 和上次时间戳；
- 选错锁定由状态中的 9 ticks 随正常时间一起消耗，不另开 `setTimeout`；
- 倒计时只在整数秒变化时更新可见文本，不向 live region 逐秒播报。

## 11. DOM 与信息边界

每个 phase 只保留当前需要的主要区块；`hidden` 区块不得残留题面或答案文本。playing 的两类信息刻意同时存在于 DOM，这属于面对面荣誉制，不宣称 DOM 隐私。

```text
main
├── intro-panel
├── handoff-panel
│   ├── north-ready
│   └── south-ready
├── game-table
│   ├── north-workspace
│   ├── shared-gauge
│   └── south-workspace
├── result-panel
├── paused-panel
├── complete-panel
└── live-status [role=status, aria-live=polite]
```

- navigator workspace：标题、三条编号规则、当前身份；没有可选择分支；
- operator workspace：题卡标题、三条真实 `<button>` 分支、字段文字和几何图；
- shared gauge：轮次、剩余时间、双方称呼、当前操作员、暂停；
- round-result：显示正确分支和首条命中规则；
- timeout：不输出正确分支、规则索引或答案属性，只显示「信号淡出了，再听一次」；
- complete：四段传输按完成顺序出现，并显示四轮中性记录。

桌面上北席 workspace 用 CSS 视觉旋转 180°；DOM 顺序仍遵循 intro→北席→共享→南席→结果。北席整个容器内部只旋转一次，禁止对子元素重复反转。窄屏取消旋转，handoff 文案提示把设备递给当前角色；不锁定浏览器方向。

## 12. 输入与焦点

- READY、分支、暂停、继续、重试、下一轮和重开全部使用原生 `<button>`；
- 分支按钮支持 Enter/Space，并额外将 `A/B/C` 映射为当前操作员选择；`event.repeat` 不触发；
- `Escape` 只在 playing 阶段暂停；游戏外输入不 `preventDefault()`；
- 每次 phase 变化把焦点移到新阶段标题（`tabindex="-1"`），随后 Tab 进入该阶段首个按钮；
- hidden/inert 的上一阶段不能收焦点；
- 选错不移动焦点，`aria-disabled` 与真实 `disabled` 同步锁定三个分支；解锁后焦点仍停在原按钮；
- 触控目标至少 48 × 48 CSS px，分支卡在 320px 宽下至少 64px 高；
- `classifyKey` 只把 A/B/C、Escape 分类为 action，未知键返回 null。

## 13. 视觉与资产方向

关键词：午夜观测台、压印纸卡、黄铜刻度、蓝紫信号、珊瑚色确认、无字星尘纹理。界面应像两个人真的把一块通讯盘放在桌上，而不是 SaaS dashboard、科幻驾驶舱或商业游戏手册。

- 主信息用 HTML/CSS；节点、纹理、符号用 CSS 或自有 inline SVG，保证语义和精确状态；
- ImageGen 必须先产出桌面 playing、移动 handoff、桌面 complete 三态概念；
- 生产资产只允许无文字、无 UI 的 `signal-dust.webp` 装饰背景；CSS 有完整纯色/渐变回退；
- 不使用炸弹、剪线钳、电线、警示条、军事字体、七段数码管、说明书复印件或工业危险符号；
- 不在生成图中依赖可读中文，所有用户文案由 HTML 渲染；
- `prefers-reduced-motion` 关闭星尘、扫描线、脉冲、翻卡和片段浮现；
- 1504px 桌面首屏必须看见两边身份、三条规则/三条分支、共享时间和暂停；不做卡片墙。

## 14. 响应式约束

### 14.1 `1504 × 1046`

- 页面最小可见高度不依赖固定 `100vh`；使用动态 viewport 并允许安全纵向滚动；
- 游戏桌上下各一块 workspace，中间共享仪表不超过首屏高度的 18%；
- 北席旋转后文字不裁切，规则最多三行 × 三条；
- 分支三个横排或等宽网格，不越过 1180px 主舞台宽度。

### 14.2 `390 × 844`

- 取消 180° 旋转，按当前角色单列显示；handoff 明确交接设备；
- playing 默认先显示当前操作员面板，领航员规则可在同页上方完整看到，不折叠答案相关信息；
- 三个分支纵排，关键操作尽量一屏，允许规则区和结果页自然滚动；
- 安全区、浏览器底栏和 200% 文本缩放下仍可操作。

### 14.3 `320 × 700`

- 无横向滚动，最长标题、规则和私人片段可换行；
- 身份、轮次、时间不与按钮重叠；
- 纯 320px 宽时不强求装饰背景或双栏；
- 完成页四段传输可纵向滚动，不压缩到不可读。

## 15. 安全、隐私与降级

- 所有内容只在内存中运行，不写 localStorage、cookie、IndexedDB、剪贴板或网络；
- 不采集两人的语音或答案；荣誉制信息差不等于安全秘密，README 必须说明；
- 配置中的私人传输会随目录公开分发，README 提醒提交前检查；
- 背景资产 404、CSS 图形不支持、`crypto` 缺失、reduced motion、静音和离线都不能阻断玩法；
- `crypto` 缺失仅让题序固定，不改变答案；
- 无 JS 时显示 `<noscript>` 说明，不伪装成可玩；
- 页面标题、按钮名、状态消息和结果解释均为中文纯文本，图形有 `aria-hidden="true"`。

## 16. 自动测试清单

### 16.1 题库与配置

- 12 张、ID/标题、三分支、三规则、所有 token 与递归冻结；
- 12 张逐一得到唯一 `{branchId, ruleIndex}`，与第 6 节表格一致；
- 人读规则由 token 生成，非法 token 无法悄悄回退成答案；
- 配置逐字段/整组回退、code point 截断、恶意字符串惰性；
- 调用方后续修改配置或题卡副本不能污染结果。

### 16.2 局计划与随机

- 固定索引产生四张唯一计划，源池不变；
- 越界、浮点、NaN、抛错随机函数安全取当前首项；
- rejection sampling 的阈值、边界、重试和 `n=1`；
- 无 crypto 固定顺序仍完整。

### 16.3 reducer

- intro/handoff/playing/result/timeout/paused/complete 全路径；
- 单边 ready 不揭示、双边 ready 才开始；
- 错误锁定、锁定期拒绝、解锁、正确唯一结算；
- 超时优先、同题 retry、角色严格交替、第四轮完成；
- pause/resume 不扣时，非法阶段动作保持原引用；
- restart 清空，畸形状态安全，revision 只随合法改变；
- replay 两次逐字段一致且不修改 action 日志。

### 16.4 view/input

- operator/navigator、北/南朝向、按钮权限、秒数和 live status 派生正确；
- timeout view 不含答案或命中规则；
- complete 恰含四段私人传输；
- A/B/C/Escape 分类、repeat 拒绝、未知键忽略；
- 恶意配置只作为普通文本。

## 17. 浏览器验收

1. 真正以 `file:///.../signal-repair-manual/index.html` 打开，外部请求 0、console error 0、page error 0；
2. 以 localhost 从统一门户打开同一作品；
3. 完成：单边准备、双边准备、故意选错、900ms 解锁、正确选择、四轮角色交换、最终传输、重开；
4. 超时：最后一 tick、答案不泄露、同题重试、已完成轮次保留；
5. 暂停：blur/hidden 进入 paused，停留后不补扣，必须显式继续；
6. 输入：Pointer、Tab/Enter/Space、A/B/C、Escape 汇入同一 action；
7. 三档原生 viewport 截图：320×700、390×844、1504×1046；无横向溢出，目标不小于 48px；
8. 强制背景 404、关闭颜色差异、reduced motion，完整玩法仍可完成；
9. 同一次最终 QA 用 `view_image` 原生查看获选概念与最新浏览器截图，输出至少五项 Fidelity ledger、首屏 copy diff 和有意偏离；
10. 运行作品测试、全仓 `npm test` 与 `npm run verify`。

## 18. 借鉴声明验收

`ATTRIBUTION.md` 必须列出：

- `tridpt/TwoPlayerGames@542c57a...`，MIT，Copyright © 2026 tridpt，只参考角色分离机制；
- `keeptalkinggame/ktanemodkit@e379d86...` 的专用许可证限制，并明确零使用；
- Steel Crate Games 官方玩法与手册页面，只用于识别机制和避让表达；
- W3C WCAG 2.2 的颜色、方向、焦点、点击目标与状态消息资料；
- ImageGen 资产生成日期、用途、最终提示词、文件路径与 CSS 降级；
- 完整零复制声明：代码、规则表、题卡、术语、中文文案、视觉、声音和素材均未从上述来源复制或改写。

## 19. Definition of Done

- 第 2.1 节全部完成，第 2.2 节没有越界；
- 第 6 节十二张题卡全部由程序证明唯一解；
- file/localhost、四轮、选错、超时、重试、暂停、重开和三档响应式均有证据；
- 作品测试、全仓测试和仓库校验全绿；
- 目录入口、README、ATTRIBUTION、bugs、learn 与 verification 文档完整；
- 每个实现部分和修复单独提交，提交前确认 `main` 与 `/Users/zenith/Desktop/two-of-us`；
- 没有第三方运行代码、框架、字体、音频、图像、远程请求或未声明参考。
