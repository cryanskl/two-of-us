# “把两边，拉成我们”产品与实现规格

- 日期：2026-07-21
- 状态：已冻结，待视觉与实现
- 对应调研：[`156-together-zipper-research.md`](./156-together-zipper-research.md)
- 目标等级：A，直接双击 `index.html`
- 主分类：双人合作
- 工作 ID：`together-zipper`
- 设备：单设备同屏，键盘或触屏

## 1. 产品结论

本作实现创意池 C14“同心拉链”，作品名冻结为「把两边，拉成我们」。左席守住布面左边，右席守住布面右边；每颗链齿都要两个人在同一段时间窗内各拉一次，并且彼此足够接近，才能把两边逐段合成一条完整拉链。

最小版本只保留一条关系：**不是抢同一个完美时刻，而是等到彼此都在附近，一起把这一齿合上。**

不加入音乐、音效、振动、连续拖拽、物理模拟、随机谱面、分数、连击、评级、生命、排名、存档、网络、编辑器、AI 或第三方运行依赖。失败只重试当前齿；此前合好的齿永久保留；完成态只总结共同尝试。

## 2. 首局体验与冻结文案

1. intro 展示两侧布面、左右席位、`F/J` 与“拿好两边”；
2. 第一段说明“窗口较宽”，点击“开始这一段”进入第 1 齿；
3. 刻度光点从起点走向目标，进入亮起的同步窗后，两人各按一次；
4. 两次拉动足够接近时链齿合上，短反馈后自动进入下一齿；
5. 过早、缺一边或相隔太远时拉链卡住，说明原因，短反馈后自动重试同一齿；
6. 每段完成显示该段尝试次数，玩家主动进入下一段；
7. 三段 15 齿全部完成后，布面合拢并显示共同结语与“再拉一次”。

冻结短文案：

```text
标题：把两边，拉成我们
副标题：你守左边，我守右边，等同一个节拍把两侧拉到一起。
规则：光点进入亮起的窗口后，两边各拉一次。
过早：还没到这一齿，先等一等彼此。
缺左：左边还没有拉住。
缺右：右边还没有拉住。
两边都缺：这一齿还在等我们。
相隔太远：听见彼此了，再靠近同一拍。
单齿成功：这一齿，合上了。
段落完成：这一段，被我们拉到了一起。
全部完成：原来两边，真的可以慢慢变成我们。
```

文案不得把卡顿归咎于某一位玩家，不显示“谁拖累谁”、个人命中率或个人统计。

## 3. 常量与术语

```text
TICKS_PER_SECOND = 30
MAX_STEP_TICKS = 5
FEEDBACK_TICKS = 12
SECTION_COUNT = 3
TOTAL_TEETH = 15
SEAT_LEFT = 0
SEAT_RIGHT = 1
```

- **目标 tick**：当前齿建议共同拉动的中心时刻；
- **允许窗**：闭区间 `[targetTick - timingRadius, targetTick + timingRadius]`；
- **同步阈值**：两席第一次有效拉动 tick 的最大绝对差；
- **尝试**：当前齿从 `beatTick = 0` 开始，到成功或卡住的一次过程，从 1 起；
- **合齿**：两席都在允许窗内拉动，且 tick 差不大于同步阈值；
- **卡住**：过早、窗口结束仍缺输入，或两次有效输入相隔过远；
- **规则 tick**：只由 reducer 消费的安全整数时间单位；CSS 动画帧与墙上时钟都不是规则真相。

内部 ID 只用 ASCII；中文标题、原因和提示由 metadata 映射，不把显示文案写入 reducer 分支。

## 4. 冻结段落与 15 颗齿

```js
const SECTIONS = Object.freeze([
  Object.freeze({
    id: "first-stitch",
    title: "起针·并肩",
    note: "先不用着急，让两边找到彼此。",
    toothCount: 4,
    targetTick: 42,
    timingRadius: 9,
    syncThreshold: 5,
  }),
  Object.freeze({
    id: "through-rain",
    title: "穿雨·同拍",
    note: "雨声近一点，我们也近一点。",
    toothCount: 5,
    targetTick: 36,
    timingRadius: 8,
    syncThreshold: 4,
  }),
  Object.freeze({
    id: "coming-home",
    title: "收尾·归心",
    note: "最后几齿，把两边稳稳带回家。",
    toothCount: 6,
    targetTick: 30,
    timingRadius: 7,
    syncThreshold: 3,
  }),
]);
```

每颗齿的 ID 为 `${section.id}-tooth-${1..toothCount}`。段内各齿规则相同，难度只在进入下一段时改变，避免玩家在未获说明时遇到隐性变化。

派生值：

| 段落 | 窗口开始 | 窗口结束 | `playing` 合法 beatTick |
| --- | ---: | ---: | --- |
| 起针·并肩 | 33 | 51 | 0…51 |
| 穿雨·同拍 | 28 | 44 | 0…44 |
| 收尾·归心 | 23 | 37 | 0…37 |

`validateSections(value)` 必须整套校验、整套回退。拒绝非数组、非普通对象、额外字段、getter、重复 ID、非安全整数、总齿数不等于 15、窗口越界、阈值大于半径，以及与冻结表不完全一致的数据。运行时 config 不允许覆盖段落、tick、齿数或成功条件。

## 5. 纯判定 `resolvePulls`

签名：

```js
resolvePulls(section, beatTick, leftPullTick, rightPullTick)
```

只接受合法冻结段落、当前合法 beatTick，以及 `null` 或位于允许窗内的安全整数拉动 tick。返回递归冻结、与入参断开引用的规范结果：

```js
{
  status: "waiting" | "success" | "apart" | "invalid",
  leftPullTick: null | number,
  rightPullTick: null | number,
  gap: null | number,
}
```

判定顺序：

1. 任一输入非法：`invalid`，两个 tick 与 gap 都返回 null；
2. 任一席尚未拉动：`waiting`；
3. 两席都有 tick，计算绝对差；
4. gap 小于等于 `syncThreshold`：`success`；
5. 否则：`apart`。

“过早”和“漏接”依赖动作发生顺序，属于 reducer 转换结果，不伪装成静态 `resolvePulls` 的输入组合。

## 6. 配置契约

`config.js` 暴露：

```js
window.TOGETHER_ZIPPER_CONFIG = Object.freeze({
  seats: Object.freeze(["你", "我"]),
  composeCompletionNote(summary) {
    return `${summary.seats[0]}和${summary.seats[1]}，往后的日子，也把两边慢慢拉成我们。`;
  },
});
```

`normalizeConfig(raw)`：

- `seats` 必须是恰含两个字符串的数组；
- 每个名字 trim 后按 Unicode code point 截至 12 字；
- 空白、重复名字、getter 抛错、非数组或额外元素时 seats 整项回退；
- composer 不进入 reducer/state，只在 complete 由 app 调用；
- composer 获得递归冻结、与真实状态断开引用的 summary；
- summary 只包含 seats、totalTeeth、totalAttempts、jams、sections；
- 返回值 trim 后最多 120 code points；非字符串、空白、超长、Promise、异常或修改 summary 均回退默认结语；
- 默认配置不修改即可完整游玩。

配置不得改变规则、段落、视觉资产路径、来源声明、状态文案或作品分类。

## 7. 权威状态与不变量

```js
{
  phase,             // intro | section-intro | playing | tooth-result | jammed | section-result | complete
  sectionIndex,      // 0..2
  toothIndex,        // 当前段内 0..toothCount-1
  beatTick,          // playing: 0..windowEnd；其他阶段 0
  pullTicks,         // playing: [null|tick, null|tick]；其他阶段 [null,null]
  resultTick,        // tooth-result/jammed: 0..11；其他阶段 0
  attempt,           // 当前齿从 1 起
  lastResult,        // 结果阶段或 complete 的规范结果；其他阶段 null
  completedTeeth,    // 成功前缀 [{ sectionId, toothId, attempts, leftPullTick, rightPullTick, gap }]
  revision,
}
```

不变量：

- intro 恰为 section/tooth 0、所有 tick 0、两席 null、attempt 1、无结果、空前缀、revision 0；
- section-intro 指向当前尚未完成段的第 0 齿；playing 指向尚未完成的当前齿；
- playing 的 pull tick 只能为 null 或当前允许窗内不大于 beatTick 的整数；
- tooth-result 的 lastResult 只能是 success，jammed 只能是五种失败原因；
- `completedTeeth` 只能是冻结 15 齿路线的严格前缀，不能跳齿、重复或伪造 attempts/tick/gap；
- tooth-result 已把当前成功齿追加到前缀；jammed 不改变前缀；
- section-result 的前缀恰好结束于当前段最后一齿；complete 恰好包含 15 条；
- 非 playing 阶段不得接收 PULL；只有 playing、tooth-result、jammed 消费 STEP；
- 每次进入 playing 都原子重置 beatTick、pullTicks、resultTick 与 lastResult；
- revision 只在权威状态真实改变时加一；若 `revision + 1` 不再是安全整数，任何本应改变状态的 action 都返回原引用；
- 所有合法返回状态递归冻结，不共享 action、config、section 或调用方对象。

合法 state 上的非法/错阶段 action 返回同一引用。畸形 state 或 action 不抛异常；公开 reducer 对畸形 state 安全返回全新 intro，对畸形 action 保持原引用。

## 8. Action 精确 schema 与阶段转换

### 8.1 Action

```js
{ type: "START" }
{ type: "BEGIN_SECTION" }
{ type: "PULL", seat: 0 | 1 }
{ type: "STEP", ticks: 1..5 }
{ type: "NEXT_SECTION" }
{ type: "RESTART" }
```

每个 action 必须是普通对象、字段集合精确、无 symbol key、无 getter、无污染原型。数值不做字符串转换；未知 type、额外字段或 native-style hostile 对象拒绝。

### 8.2 转换表

| 当前阶段 | action | 结果 |
| --- | --- | --- |
| intro | START | section-intro，第 0 段 |
| section-intro | BEGIN_SECTION | playing，当前段第 0 齿、attempt 1 |
| playing | PULL | 按第 9 节判定，可能保持 playing、进入 tooth-result 或 jammed |
| playing | STEP | 逐 tick 前进；跨过窗口结束时原子进入对应 missed jammed |
| tooth-result | STEP | 反馈达到 12 tick 后，进入下一齿 playing 或 section-result |
| jammed | STEP | 反馈达到 12 tick 后，同一齿 attempt + 1 并进入 playing |
| section-result（前两段） | NEXT_SECTION | 下一段 section-intro |
| section-result（第三段） | NEXT_SECTION | complete |
| 任意合法阶段 | RESTART | 全新 intro；intro 上保持同一引用 |

批量 STEP 必须逐 tick 消费，但一旦发生阶段转换即丢弃本 action 剩余 tick；不能穿透反馈、进入下一齿或结算多个结果。

## 9. PULL 与窗口边界

冻结规则：

1. `beatTick < windowStart` 时 PULL 立即进入 jammed，原因按席位为 `early-left` 或 `early-right`；
2. `windowStart <= beatTick <= windowEnd` 时，记录该席第一次 pull tick；
3. 同席已有 pull tick 时再次 PULL 是 no-op，不加 revision；
4. 记录第二席后立即调用 `resolvePulls`：success 进入 tooth-result，apart 进入 jammed；
5. `beatTick === windowEnd` 的 PULL 仍有效；
6. STEP 从 windowEnd 跨到 windowEnd + 1 时，若尚未成功，依缺席情况进入 `missed-left`、`missed-right` 或 `missed-both`；
7. 如果两席都有输入，第二次输入已经立即得到 success/apart，不会留到窗口结束；
8. 失败结果保存当时已存在的 pull tick，但进入下一次 playing 时全部清空。

规范 `lastResult`：

```js
// success
{ status: "success", reason: null, leftPullTick, rightPullTick, gap }

// jammed
{ status: "jammed", reason: "early-left" | "early-right" | "apart" |
  "missed-left" | "missed-right" | "missed-both",
  leftPullTick: null | number, rightPullTick: null | number, gap: null | number }
```

early 结果不记录过早 tick（对应席位仍为 null）；apart 的 gap 必须大于本段阈值；missed 的 gap 必须为 null。

## 10. 反馈、进度与完成摘要

- 进入 tooth-result 时，把当前齿的成功记录追加到 `completedTeeth`，其中 `attempts = state.attempt`；
- 进入 jammed 时不追加记录，attempt 仍表示刚失败的本次；反馈结束进入重试才加一；
- success/jammed 的 resultTick 从 0 开始；STEP 消费到第 12 tick 时转换；
- 成功最后一齿后仍展示 12 tick tooth-result，再进入 section-result；
- section-result 不自动前进，避免玩家来不及阅读；
- complete 不再消费 STEP。

完成摘要由 15 条成功记录纯推导：

```js
{
  seats: [string, string],       // 只由 app/config 注入
  totalTeeth: 15,
  totalAttempts: sum(attempts),
  jams: sum(attempts - 1),
  sections: [{ id, title, teeth, attempts, jams }],
}
```

不保存或展示个人失败数、个人平均 tick、个人命中率、最佳/最差玩家。

## 11. 键盘、触控与时钟

`classifyPullKey(eventLike)` 精确映射：

| `code` | action |
| --- | --- |
| `KeyF` | `{ type: "PULL", seat: 0 }` |
| `KeyJ` | `{ type: "PULL", seat: 1 }` |

`repeat === true`、未知 code、畸形对象、getter 抛错返回 null。app 只在 playing 且分类成功时 `preventDefault()`。原生按钮在 `pointerdown` 时派发相同 PULL；随后兼容性 click 必须被抑制，保证一次手势恰有一次 action。按钮不得依赖持续按住。

浏览器时钟：

- `requestAnimationFrame` 累积真实时间，每 `1000/30ms` 派发一个 `{type:"STEP",ticks:1}`；
- 单帧最多补 5 tick，超出时间丢弃，不形成后台追赶；
- `visibilitychange` hidden、`pagehide`、blur 时停止循环并清空 accumulator/lastTimestamp 与临时手势标记；
- visible/focus 只从当前规则 state 继续，不补离开期间时间；
- 仅 playing、tooth-result 与 jammed 运转循环，其他阶段取消旧 RAF token；
- reduced motion 不改变 tick、窗口和判定，只关闭布料呼吸、光点尾迹、齿闪光与卡顿晃动。

## 12. 公开视图与阶段 DOM

### 12.1 `getPublicView(state)`

返回与 state 断开引用的递归冻结数据：

```js
{
  phase,
  section: { index, total, id, title, note, toothCount },
  tooth: { index, number, totalInSection, completedTotal, total: 15 },
  timing: {
    beatTick, targetTick, windowStart, windowEnd, syncThreshold,
    trackEndTick, progressPermille, isWindowOpen,
  },
  pulls: { left: "waiting" | "ready", right: "waiting" | "ready", leftTick, rightTick },
  attempt,
  resultTick,
  feedbackProgressPermille,
  lastResult,
  completedSections: [{ id, title, teeth, attempts, jams }],
  totalAttempts,
  jams,
  controls: { canStart, canBeginSection, canPull, canNextSection, canRestart },
  announcementCode,
}
```

`progressPermille = floor(beatTick * 1000 / windowEnd)`，范围钳在 0…1000；非 playing 为 0。`feedbackProgressPermille = floor(resultTick * 1000 / 12)`，只在 tooth-result/jammed 非零。announcementCode 由 phase、结果原因与进度纯派生，app 再映射冻结中文。

### 12.2 阶段最小 DOM

| 阶段 | 必须出现 | 必须隐藏/禁用 |
| --- | --- | --- |
| intro | 标题、规则、双席键位、开始按钮、目录返回 | 运行刻度与两侧拉动按钮 |
| section-intro | 段名、齿数、窗口提示、开始段按钮 | 运行 RAF 与拉动按钮 |
| playing | 15 齿进度、当前齿、节拍刻度、亮窗、左右席按钮与 live 状态 | 下一段按钮 |
| tooth-result | 合齿反馈、共同成功文案 | 拉动按钮 |
| jammed | 明确失败原因、自动重试提示 | 拉动按钮与归责性统计 |
| section-result | 本段共同尝试数、下一段/收好按钮 | RAF 与拉动按钮 |
| complete | 完成插画、三段摘要、结语、重开与目录 | 运行控制 |

阶段容器使用 `hidden` 真正退出可访问树。切换到交互阶段后焦点落到第一个可用主动作；playing 优先左席按钮，结果阶段落到阶段标题。`aria-live` 只朗读离散阶段/结果，不在每 tick 刷新。

## 13. 视觉、响应式与降级

- 视觉方向：午夜裁缝桌、深靛蓝与酒红织物、暖黄铜拉链、奶油纸签；不模仿任何参考音游；
- 15 颗齿、拉链头位置、节拍窗、两席 ready 状态和结果由 DOM/CSS 生成；
- ImageGen 资产只承担背景布景、黄铜拉链头氛围物和完成纪念布片，图片缺失时规则与文字仍完整；
- 1728×906：舞台居中，两席控制左右并列，主流程尽量首屏完成；
- 390×844：舞台在上、控制在下，两席按钮并排，complete 插画与摘要纵向排列；
- 320×568：允许纵向滚动，禁止横向溢出，主要按钮至少 56×56px；
- `prefers-reduced-motion` 关闭装饰运动；`forced-colors` 保留系统边框、原生按钮和文字状态；
- 200% 文本缩放时不遮挡主动作；颜色之外始终有左/右、等待/已拉和原因文字；
- 生产代码禁止外链字体、CDN、远程图片、base64 内嵌资源与模块脚本。

## 14. 文件边界与依赖统一

```text
experiences/co-op/together-zipper/
├── index.html
├── styles.css
├── config.js
├── logic.js
├── app.js
├── logic.test.js
├── README.md
├── ATTRIBUTION.md
└── assets/
    ├── tailor-table-background.png
    ├── brass-zipper-pull.png
    └── completed-keepsake.png
```

加载顺序固定为 `config.js → logic.js → app.js`，全部经典脚本。逻辑层仅暴露 `window.TogetherZipperLogic`；测试通过 VM 注入最小 window，不引入 jsdom、打包器或新 npm 依赖。作品沿用仓库统一 `npm test`、`npm run verify` 与本地启动器。

## 15. 自动测试 Gate

逻辑测试至少覆盖：

1. 常量、三段 4/5/6 齿和 15 齿路线冻结；
2. `validateSections` 对 hostile/额外字段/重复/窗口/总数整套回退；
3. `resolvePulls` waiting、阈值内边界、阈值外、非法输入与冻结/断引用；
4. 配置姓名规范化、Unicode 截断、重复/异常回退；
5. composer summary 隔离、异常/Promise/超长/恶意修改回退；
6. 七阶段初始结构与全路径；
7. 第一段窗口 start/end 闭区间成功；
8. 过早左右原因、missed-left/right/both 与 apart；
9. 同席重复 PULL no-op，另一席权限不可替代；
10. STEP 逐 tick、最大 5、跨窗口与剩余 tick 丢弃；
11. success/jammed 12 tick 反馈，不穿透下一齿；
12. 失败只加当前齿 attempt，成功前缀保留；
13. 4/5/6 齿段落边界与最终 complete；
14. 15 齿最短全成功路线的 totalAttempts=15、jams=0；
15. 混合失败路线的 per-section/总摘要；
16. 固定任一席无输入不能完成任意齿；
17. `getPublicView` 推导、冻结、断引用与不泄露内部可变对象；
18. action 精确 schema、getter/symbol/污染原型/未知字段；
19. 畸形 state 回到全新 intro，非法 action 保持原引用；
20. revision 只随真实变化递增，MAX_SAFE_INTEGER 时拒绝变化；
21. RESTART 从各阶段安全复位，intro 上 no-op；
22. `classifyPullKey` 支持 native-style KeyboardEvent getter、拒绝 repeat/hostile；
23. 同一 action 日志重放结果深相等；
24. 生产逻辑无 Date、Math.random、RAF、DOM、存储、网络或测试后门。

目录测试还必须证明：经典相对脚本、资产存在、零网络、零存储、无模块、README/ATTRIBUTION 完整、入口进入 catalog 与根门户。

## 16. Chrome 与人工验收 Gate

真实 Chrome 必须覆盖：

- 默认配置从 intro 完成三段 15 齿并重开；
- 第一段用触控按钮，后两段用 `F/J`，证明两条输入路径；
- 至少制造 early、apart、missed-left、missed-right 与 missed-both，并确认只重试当前齿；
- 边界 tick 的最后时刻输入仍有效；按住/重复键不制造第二次 PULL；
- blur/hidden 恢复不追赶、不瞬间失败、不粘键；
- 1728×906、390×844、320×568 无横向溢出，核心按钮尺寸合格；
- 阶段 hidden/focus/live region、键盘默认行为、reduced-motion、forced-colors 与 200% 文本缩放；
- 三张图片阻断时仍能看懂、操作并完成；
- 自动化 URL 安全策略若禁止 `file://`，必须诚实保留真实双击为人工 Gate，不绕过或冒充通过。

最终需用 `view_image` 同时检查已选概念图与最新生产截图，并写至少 5 条 fidelity ledger：构图、色彩、材质、主物件、层级、移动重排和有意偏差。

## 17. 来源、bugs、learn 与提交 Gate

- `ATTRIBUTION.md` 固定列出 ChloeLiang/rhythm-game、straker/kontra、Pixofield/keyshapejs 的 commit、MIT、版权主体、只研究范围与零复制范围；
- 同时列出 webosu 的混合许可排除，明确没有打包其代码或资产；
- ImageGen 只接收原创文字提示，不输入第三方图片；
- 发现的每个真实 bug 与解决方案写入 `bugs/`，重复已知问题也记录“再次复现”；
- 值得跨项目复用的确定性时间窗/双席证明方法写入 `learn/`；
- 调研、规格、视觉资产、实施计划、逻辑、前端、目录、bug 修复、learn 与验收分别提交；
- 每次 commit 前执行 `git branch --show-current && git rev-parse --show-toplevel`；
- 完成本作不等于完成长期目标，验收后继续下一个未实现候选。

## 18. 规格冻结结论

这份规格冻结了题名、三段 15 齿、30Hz 时钟、闭窗口、最后一 tick、双席第一次输入、同步阈值、12 tick 反馈、七阶段 reducer、配置边界、完成摘要、DOM、资产职责与验收方法。后续视觉和实现不得自行加入音乐、分数、随机、个人评价或在线能力；若改变任一规则常量，必须先更新本规格与测试。
