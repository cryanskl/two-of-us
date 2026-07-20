# “把七天，养成一朵花”产品与实现规格

- 日期：2026-07-21
- 状态：已冻结，待视觉与实现
- 对应调研：[`161-seven-day-garden-research.md`](./161-seven-day-garden-research.md)
- 目标等级：A，直接双击 `index.html`
- 主分类：双人合作
- 工作 ID：`seven-day-garden`
- 设备：单设备轮流，键盘或触屏

## 1. 产品结论

本作实现创意池 C16“七日小花园”，作品名冻结为「把七天，养成一朵花」。两个人各有一只公开的工具篮；七天中每天各出一张浇水、补光或修剪卡，让两张卡合上当日花签，同时为后面的日子留够工具。

最小版本只保留一个核心关系：**一起照顾今天，也一起为往后的日子留出余地。**

不加入真实日期、现实等待、随机天气、连续数值仪表、倒计时、分数、排名、个人贡献比较、秘密线索、存档、网络、账号、音频、摄像头、身份识别、编辑器或第三方运行依赖。失败只重试当天；此前完成的日期永久保留；完成页只呈现共同记录。

## 2. 首局体验与冻结文案

1. `intro` 展示题名、七日花签、两只工具篮和同机信任边界；
2. `day-intro` 说明当天需求、先手、完整周计划和当前库存；
3. 当前席位接手设备，从自己的公开篮中选择一张卡；
4. 页面保留第一张已选卡，交给第二席继续选择；
5. 两张卡不符合今天时进入 `jammed`，全部归还，只重试今天；
6. 两张卡符合今天但会让后缀无解时，也进入 `jammed`，只提示“后面会少一张卡”；
7. 通过日结时原子扣除两张卡、植物生长一层，再主动进入下一天；
8. 七天完成后显示成熟植物、七片压花日志和共同结语。

首屏文案：

```text
标题：把七天，养成一朵花
副标题：七天，一盆花，两只公开的工具篮。
规则：每天你们各出一张卡，让两张卡一起满足当天花签，也要为后面的日子留够工具。
信任边界：请在同一台设备上轮流操作。页面不联网、不保存，也不会识别是谁按下按钮。
按钮：开始这七天
```

规则列表：

```text
1. 七天花签和双方剩余卡始终公开。
2. 每天两席各选一张，先行动的人逐日交换。
3. 两张卡符合今天，并且后面的日子仍能完成，植物才会生长。
4. 没合上时，两张卡都会放回，只重新商量今天。
```

反馈文案：

```text
pair-mismatch：这两张卡没有合上今天的花签。卡已放回两只工具篮，请重新商量今天的搭配。
future-stranded：今天够了，但后面会少一张卡。卡已放回两只工具篮，请换一种分配。
单日成功：第 {N} 天完成：{花签名}。两张卡正好合上花签，后面的 {剩余天数} 天仍然可以完成。
第七日成功：第 7 天完成：开花。七张花签都被你们一起养成了。
全部完成：你们把七天，养成了一朵花。两只工具篮、十四次照料，没有排名，也不比较谁做得更多。
```

失败文案不得指出哪一席应该换成哪张牌，不得显示唯一完整路线。

## 3. 常量与冻结数据

```text
DAY_COUNT = 7
SEAT_A = 0
SEAT_B = 1
RESOURCE_WATER = "water"
RESOURCE_SUN = "sun"
RESOURCE_PRUNE = "prune"
```

七日表是规则数据，不允许配置覆盖：

```js
const DAYS = Object.freeze([
  Object.freeze({ id: "wake-soil", title: "醒土", resources: Object.freeze(["water", "sun"]), note: "一边润土，一边迎光" }),
  Object.freeze({ id: "support-sprout", title: "扶芽", resources: Object.freeze(["water", "prune"]), note: "给新芽水，也给它留出形状" }),
  Object.freeze({ id: "open-leaves", title: "展叶", resources: Object.freeze(["sun", "sun"]), note: "两份光让叶面舒展" }),
  Object.freeze({ id: "shape-branch", title: "定枝", resources: Object.freeze(["sun", "prune"]), note: "光照与修剪共同定下方向" }),
  Object.freeze({ id: "hold-rain", title: "蓄水", resources: Object.freeze(["water", "water"]), note: "两边一起为花期储水" }),
  Object.freeze({ id: "shape-crown", title: "整冠", resources: Object.freeze(["prune", "prune"]), note: "两次修剪完成花冠轮廓" }),
  Object.freeze({ id: "bloom-together", title: "开花", resources: Object.freeze(["water", "sun"]), note: "最后一份水与光让花开放" }),
]);

const INITIAL_INVENTORIES = Object.freeze([
  Object.freeze({ water: 3, sun: 1, prune: 3 }),
  Object.freeze({ water: 2, sun: 4, prune: 1 }),
]);
```

`firstSeat(dayIndex)` 只由 `dayIndex % 2` 派生：偶数日序为 A 先手，奇数日序为 B 先手。状态中不重复保存先手或当前席位。

冻结的唯一完整席位路线只用于测试，不进入页面 view：

```text
第 1 天 AW / BS
第 2 天 AP / BW
第 3 天 AS / BS
第 4 天 AP / BS
第 5 天 AW / BW
第 6 天 AP / BP
第 7 天 AW / BS
```

## 4. 公开信息与交接边界

本作是公开规划合作，不是秘密猜测：

- 七日花签、双方库存、植物状态、已完成日期和当天已选卡始终可见；
- `handoff` 不是遮屏，不隐藏第一席的选择，也不模拟身份验证；
- 交接只防止同一人连续误触，并清楚标明下一位操作者；
- 完整唯一路线、后缀解数和“正确下一张卡”不进入公开 view；
- 同机页面无法证明现实中有两个人，README 必须诚实说明这个信任边界。

合作必要性只由规则保证：每天需要两个不同席位各提交一次，各席只能消耗自己的篮子；任一席缺席时当天无法结算。

## 5. 有限状态求解器 `countSuffix`

签名：

```js
countSuffix(dayIndex, inventories)
```

输入：

- `dayIndex` 必须是 `0..7` 的安全整数；
- `inventories` 必须恰有两个普通对象；
- 每个对象必须精确包含 `water / sun / prune`，值为 `0..7` 的安全整数；
- 拒绝额外字段、symbol key、getter、污染原型、稀疏数组、共享可变引用和数值字符串。

返回：

- 合法输入返回从 `dayIndex` 开始、保持席位库存边界的完整路线数量；
- 非法输入返回 `null`，不抛异常；
- `dayIndex === 7` 且两篮全为零时返回 `1`，否则返回 `0`；
- 初始输入必须返回 `1`。

算法要求：

1. 枚举当前日 A/B 各三种资源的 9 种有序组合；
2. 过滤任一库存不足的组合；
3. 对两张资源排序后与当天无序需求对比较；
4. 对匹配组合复制并扣除库存，递归下一日；
5. 以 `dayIndex + 两篮六个整数` 构成规范 key 记忆化；
6. 只统计完整后缀，不把“今天匹配”误计为一条路线；
7. 不导出具体路线，不读取随机数、时间、DOM 或配置。

生产 evaluator 与 reducer 必须调用同一 `countSuffix`；测试可以另写穷举 oracle 交叉验证，但 UI 不得复制算法。

## 6. 纯判定 `evaluateDay`

签名：

```js
evaluateDay(dayIndex, inventories, commitments)
```

合法 `commitments` 必须恰含 A/B 两个资源字符串。返回递归冻结、与入参断开引用的 DTO：

```js
{
  status: "accepted" | "pair-mismatch" | "future-stranded" | "invalid",
  dayId: string | null,
  commitments: [string | null, string | null],
  requiredPair: [string, string] | null,
  nextInventories: [{ water, sun, prune }, { water, sun, prune }] | null,
  suffixSolutions: number | null,
}
```

判定顺序：

1. 任一输入非法，返回 `invalid`；
2. 任一席对应库存为零，返回 `invalid`；
3. 两张卡的规范无序对不等于今日需求，返回 `pair-mismatch`；
4. 在副本上扣除两张卡，调用 `countSuffix(dayIndex + 1, tentativeInventories)`；
5. 解数为 `0` 时返回 `future-stranded`；
6. 解数大于 `0` 时返回 `accepted`。

`pair-mismatch` 与 `future-stranded` 都不得修改调用方库存。只有 `accepted` 返回可提交的 `nextInventories`。`invalid` 不泄露部分校验结果。

## 7. 配置契约

`config.js` 暴露：

```js
window.SEVEN_DAY_GARDEN_CONFIG = Object.freeze({
  seats: Object.freeze(["你", "我"]),
  composeCompletionNote(summary) {
    return `${summary.seats[0]}和${summary.seats[1]}，把七天的水、光和修剪，慢慢养成了同一朵花。`;
  },
});
```

`normalizeConfig(raw)`：

- `seats` 必须是恰含两个字符串的数组；
- 名字 trim 后按 Unicode code point 截至 12 字；
- 空白、重复、getter 抛错、非数组、稀疏数组或额外元素时 seats 整项回退；
- composer 不进入 reducer/state，只在 complete 由 app 调用；
- composer 获得递归冻结、与真实状态断开引用的 summary；
- 返回值 trim 后最多 120 code points；非字符串、空白、超长、Promise、异常或修改 summary 均回退默认结语；
- 默认配置不修改即可完整游玩。

配置不得覆盖七日表、初始库存、先手、资源、solver、失败条件、资产路径、来源声明或作品分类。

## 8. 权威状态与不变量

```js
{
  phase,              // intro | day-intro | first-pick | handoff | second-pick | day-result | jammed | complete
  dayIndex,           // 0..6；complete 时固定 6
  inventories,        // 两席当前已提交库存
  commitments,        // [null|resource, null|resource]
  attempt,            // 当前日从 1 起
  lastResult,         // 仅 day-result / jammed / complete 存在
  completedDays,      // accepted 日的严格前缀
  revision,
}
```

虽然产品信息架构归纳为七种可见页面，规则层把两次选择拆为 `first-pick / second-pick`，并将两种结果拆为 `day-result / jammed`，因此权威 phase 共八种。

不变量：

- intro 恰为第 0 日、初始库存、空 commitments、attempt 1、空结果、空前缀、revision 0；
- `completedDays.length === dayIndex`，complete 例外为 7 条且 `dayIndex === 6`；
- completed days 必须是冻结七日表的严格前缀，记录的两张卡必须能重算为 accepted；
- 非结果阶段 `lastResult === null`；
- `first-pick` 两席均未选，`handoff / second-pick` 只有当天先手已选；
- `day-result` 的 lastResult 只能是 accepted，jammed 只能是两种失败；
- 失败状态库存与当天开始时完全相同；成功状态已原子提交 `nextInventories`；
- commitments 在当天结果页保留以供说明，进入重试或下一日时原子清空；
- 每个 completed day 保存 `{ dayId, leftResource, rightResource, attempts }`；
- accepted 前缀重算后必须与当前库存深度相等；
- complete 恰含 7 天、14 张卡、两篮全零；不存在第八日；
- revision 只在真实改变时加一；如果 `revision + 1` 不再是安全整数，任何本应改变状态的 action 都返回原引用；
- 所有合法返回状态递归冻结，不共享 action、config、evaluator DTO 或调用方对象。

合法 state 上的非法或错阶段 action 返回同一引用。畸形 state 不抛异常；公开 reducer 收到畸形 state 时安全返回全新 intro，收到畸形 action 时保持合法原引用。

## 9. Action 精确 schema 与阶段转换

### 9.1 Action

```js
{ type: "START" }
{ type: "BEGIN_DAY" }
{ type: "PICK", seat: 0 | 1, resource: "water" | "sun" | "prune" }
{ type: "HANDOFF_READY" }
{ type: "RETRY_DAY" }
{ type: "NEXT_DAY" }
{ type: "RESTART" }
```

每个 action 必须是普通对象、字段集合精确、无 symbol key、无 getter、无污染原型。数值和资源名不做隐式转换；未知 type 或额外字段拒绝。

### 9.2 转换表

| 当前阶段 | action | 结果 |
| --- | --- | --- |
| intro | START | day-intro，第 1 天 |
| day-intro | BEGIN_DAY | first-pick，清空当天 commitments |
| first-pick | PICK（仅当天先手） | 保存公开选择，进入 handoff |
| handoff | HANDOFF_READY | second-pick |
| second-pick | PICK（仅当天后手） | 调用 evaluator；accepted 进入 day-result，两个失败进入 jammed |
| jammed | RETRY_DAY | 同日、同先手、attempt + 1、清空 commitments，进入 first-pick |
| day-result（前六日） | NEXT_DAY | dayIndex + 1、attempt 1、进入 day-intro |
| day-result（第七日） | NEXT_DAY | complete |
| 任意合法阶段 | RESTART | 全新 intro；intro 上保持同一引用 |

只有 accepted 分支原子替换库存并追加 completed day。失败不扣卡、不增长前缀；attempt 只在 `RETRY_DAY` 时增加。第七日 accepted 后仍保留日结页，必须由用户选择“留下这朵花”才进入 complete。

PICK 规则：

- seat 必须等于派生的当前席位；
- 对应库存必须大于零；
- 每席当天最多选择一次；
- 快速双击、重复席位、错误 seat、耗尽资源和错阶段均为 no-op；
- UI 只 dispatch，不自行预扣、补回、比较或预测。

## 10. 公开 view 与完成摘要

`getPublicView(state, config)` 返回递归冻结、与 state/config 断开引用的规范 DTO。至少包含：

```js
{
  phase,
  day: { index, number, id, title, note, resources },
  weekPlan: [{ number, id, title, note, resources, status }],
  seats: [{ id, name, inventory, isFirst, isActive, hasPicked }],
  commitments: [{ seat, resource }],
  attempt,
  plantStage,
  result: null | { status, dayId, commitments, requiredPair },
  controls: [{ action, seat, resource, enabled }],
  announcementCode,
  summary: null | { seats, totalDays, totalCards, totalAttempts, replans, resourceTotals, days },
}
```

- weekPlan 只标记 `complete / current / upcoming`，不包含路线答案；
- commitments 在 handoff 与 second-pick 中公开第一席选择；
- `suffixSolutions` 永不进入公开 view；
- enabled、active seat、结果 code、植物层级、完成数和摘要均来自逻辑层；
- summary 仅在 complete 非 null，`totalDays=7`、`totalCards=14`、`replans=sum(attempts-1)`；
- summary 的 `resourceTotals` 固定为 water 5、sun 5、prune 4；
- 不生成个人正确率、个人贡献、速度、胜负或排名字段。

## 11. DOM、焦点与键盘

全局骨架：

```html
<main id="garden-app">
  <header>
    <p>七日共同照料</p>
    <h1>把七天，养成一朵花</h1>
    <ol aria-label="七日养成进度"></ol>
  </header>
  <section id="stage" aria-labelledby="phase-heading"></section>
  <nav aria-label="体验导航"></nav>
  <p id="live-status" class="sr-only" role="status" aria-live="polite" aria-atomic="true"></p>
</main>
```

- 阶段内容用 `replaceChildren()` 替换，页面只消费 public view；
- 每阶段只有一个 `h2#phase-heading[tabindex="-1"]`；阶段切换后用微任务聚焦标题；
- `#stage` 不设 live region；独立 status 只播交接、选牌、日结、退卡、完成；
- 重复播报前先清空，下一微任务写入；不用 assertive；
- 当前席工具使用原生 button；耗尽项原生 disabled 且显示“剩余 0 张”；
- 工具名必须有完整可见文字和图形，不能只显示 W/S/P 或只靠颜色；
- 键盘快捷键：`W` 浇水、`S` 补光、`P` 修剪；仅在 second/first-pick 且焦点不在可编辑控件时生效；
- Enter/Space 走原生按钮，不拦截 Tab、浏览器快捷键或输入法组合；
- 同一 keydown 或 click 最多 dispatch 一次。

前端不得自行判断花签、排序资源、扣还库存、计算先手、调用 `countSuffix`、推断失败 code、维护完成前缀或依赖动画结束事件推进规则。

## 12. 可见阶段与布局

| 可见页面 | 必须呈现 | 主操作 |
| --- | --- | --- |
| intro | 植物预览、规则、七日花签、两篮预览、信任边界 | 开始这七天 |
| day-intro | 当前日/先手、植物、今日花签、完整计划、两篮、已完成日 | 开始第 N 天 |
| choosing | 当前席位、今日花签、双方公开篮、照料位、当前席三张按钮 | 浇水 / 补光 / 修剪 |
| handoff | 花园、花签、两篮、第一席已选卡、纸签交接说明；无工具按钮 | 我接好了 |
| day-result | 新生长部分、成功说明、扣除后两篮、进度 | 去看下一天 / 留下这朵花 |
| jammed | 未变化植物、尝试的两张卡、“已归还”、原因、恢复库存 | 重新商量今天 |
| complete | 成熟植物、七片压花日志、共同摘要、结语 | 再养一次 |

公开卡牌不得退化为数据表：七日计划使用 `<ol>` 和叶形纸签；两篮用等权 `<article>`；已选卡放到花签旁两个带席位名的照料位。植物始终比库存块更大、更靠近视觉中心。

响应式冻结：

- `>=960px`：最大宽约 1180px，两篮各 220–260px，植物区不小于 360px；
- `600–959px`：植物与花签占整行，两篮在下一行等宽并列；
- `<=599px`：日期/席位 → 植物 → 花签 → 当前篮/按钮 → 另一篮 → 七日计划；
- `390x844`：植物高约 220–260px，三个工具按钮可一行；
- `320x568`：允许纵向滚动，不横溢；按钮至少 56px 高、间距至少 8px；
- 200% 缩放不丢失内容或操作；
- `prefers-reduced-motion` 取消叶片、浮尘和卡位动画；
- `forced-colors` 保留系统边框、焦点环、文字与状态图形。

## 13. 视觉资产与降级

图片只负责：

- 窗边花桌背景；
- 花盆与叶片的质感叠层；
- 完成页纪念插画。

DOM/CSS 必须负责：

- 可玩的植物轮廓和七层生长状态；
- 日序、花签、工具名称、库存数字；
- 席位、已选卡、失败原因、完成摘要；
- 所有按钮、焦点、可访问名称与状态文字。

生产资产必须是本地原创文件，装饰图片 `alt=""` 或 `aria-hidden="true"`。图片删除、路径损坏或加载失败后，完整规则、植物阶段和所有操作仍可读可玩。任何关键文字、库存或结果不得烘焙在图片中。

## 14. 文件与运行边界

```text
experiences/co-op/seven-day-garden/
├── index.html
├── styles.css
├── config.js
├── logic.js
├── logic.test.js
├── app.js
├── README.md
├── ATTRIBUTION.md
└── assets/
    ├── garden-table-background.png
    ├── plant-states.png
    ├── completion-keepsake.png
    ├── favicon.svg
    └── README.md
```

- 经典脚本顺序固定为 `config.js → logic.js → app.js`；
- `logic.js` 同时提供 CommonJS 与浏览器全局导出；
- 零运行依赖、零 fetch、零 worker、零模块脚本、零 service worker；
- 不调用 `Date`、`Math.random`、`crypto.getRandomValues`、网络、存储、音频或规则帧循环；
- 双击 `index.html` 的 `file://` 环境即可从 intro 完整通关并重开；
- 本作品不新增 experience manifest；根目录 catalog 是唯一注册入口。

## 15. 自动测试验收矩阵

`logic.test.js` 至少覆盖以下 30 组行为：

1. 初态递归冻结且符合 schema；
2. 初始 `countSuffix` 等于 1；
3. 终态全零库存解数为 1；
4. 终态非零库存解数为 0；
5. 每日 9 种有序组合与独立 oracle 一致；
6. 完整路线恰好 1 条；
7. 唯一路线顺序与冻结表一致；
8. `evaluateDay` pair-mismatch 不扣库存；
9. 日 1 `AW/BW` 为 pair-mismatch；
10. 日 1 `AS/BW` 为 future-stranded；
11. future-stranded 不扣库存；
12. accepted 返回断开引用的新库存；
13. 七日 accepted 路线库存最终全零；
14. accepted days 始终是严格前缀；
15. 双方最终各提交 7 次；
16. 首行动席逐日交替；
17. 错 seat PICK 为同引用 no-op；
18. 重复 seat PICK 为 no-op；
19. 耗尽资源 PICK 为 no-op；
20. 快速重复 PICK 只提交一次；
21. 两种失败都只在 RETRY_DAY 时 attempt + 1；
22. 失败后同日同先手且 commitments 清空；
23. 成功只在 NEXT_DAY 后进入下一日；
24. 第七日先停在 day-result，再进入 complete；
25. complete 拒绝 PICK/NEXT_DAY 等第八日动作；
26. RESTART 恢复完全一致初态；
27. action log 重放得到深度相等状态；
28. malformed/hostile action fail closed；
29. malformed/hostile state 安全回初态；
30. MAX_SAFE revision 不发生部分转换；
31. config 名称规范化、整项回退与 Unicode 截断；
32. composer 获得冻结副本，异常/Promise/超长均回退；
33. public view 断开引用且不包含 suffixSolutions/唯一路线；
34. 所有合法返回对象递归冻结；
35. 生产逻辑不读取真实时间、随机、DOM、网络或存储。

全仓必须继续通过 `npm test` 与 `npm run verify`。

## 16. 浏览器验收

- 直接双击 `index.html`，离线完整通关；
- 用路线 `AW/BS → AP/BW → AS/BS → AP/BS → AW/BW → AP/BP → AW/BS` 完成七天；
- 先触发日 1 `AW/BW`，确认 pair-mismatch 且两张卡归还；
- 重开后触发日 1 `AS/BW`，确认 future-stranded 且不泄露答案；
- 验证 intro、day-intro、两次 choosing、handoff、day-result、jammed、complete DOM；
- 交接页保持花园、花签、双方库存和第一张卡可见；
- 全程只用键盘完成，阶段切换焦点到标题，原生按钮顺序合理；
- 快速双击和按键重复不会一次提交两张；
- 在 1180px、390x844、320x568、200% 缩放下无横向溢出或遮挡；
- reduced motion、forced colors 下规则与焦点仍清晰；
- 阻断全部图片后仍可完整通关；
- 完成页没有个人贡献、排名或比较；
- “再养一次”得到完全一致初态，刷新不恢复旧局；
- DevTools 无未处理异常、网络请求或资源缺失。

## 17. 借鉴与来源声明

本作的规则、代码、关卡、求解器、界面、文案与生成式视觉资产均为独立实现。定向调研曾参考：

- [TransmediaLab/SmartFarm](https://github.com/TransmediaLab/SmartFarm/tree/bea42244c39298f0ba451265700836d0eac5064e)，Apache-2.0，用于理解离散日推进与显式状态；
- [boardgameio/boardgame.io](https://github.com/boardgameio/boardgame.io/tree/55200a6aead258d94601093572b6fafde44058b1)，MIT，用于理解每席有限行动、阶段和终止条件；
- [trekhleb/javascript-algorithms](https://github.com/trekhleb/javascript-algorithms/tree/0f52fbaced5d33041a5a834f72f880a9262bcb82)，MIT，用于理解有限状态枚举和记忆化；
- [w3labkr/js-growing-tree](https://github.com/w3labkr/js-growing-tree/tree/11cf7e8759ad8c46418c26057182225d10260795)，MIT，用于理解生长状态与动画表现分离。

只借鉴上述通用机制，没有复制其源码、算法实现、测试、参数、数据、DOM、样式、素材或文案。固定版本、版权主体、许可证和明确排除范围见调研文档。若实现阶段实际复制任何第三方内容，必须暂停并重新审计许可证，在 README、ATTRIBUTION 和必要许可文件中补齐版权、许可、修改说明与资产来源。

## 18. 规格 Gate

进入视觉与实现前，以下内容视为冻结：题名、A 级、公开规划、七日表、两篮库存、唯一完整路线、逐日交换先手、失败不扣卡、后缀无解当场拒绝、八个权威 phase、七种可见页面、action schema、公开 view、配置边界、完成摘要、响应式底线、零依赖和借鉴声明。

任何需要秘密遮屏、真实七天、存档、随机天气、连续数值、联网、音频、个人排名或规则变更的想法都属于后续新规格，不在本次实现中顺带加入。
