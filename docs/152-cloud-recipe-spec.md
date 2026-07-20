# “这一场雨，我们一起接”产品与实现规格

- 日期：2026-07-20
- 状态：已冻结，待视觉与实现
- 对应调研：[`151-cloud-recipe-research.md`](./151-cloud-recipe-research.md)
- 目标等级：A，直接双击 `index.html`
- 主分类：双人合作
- 工作 ID：`cloud-recipe`
- 设备：单设备同屏，键盘或触屏

## 1. 产品结论

本作实现创意池 C13“云朵配方”，作品名冻结为「这一场雨，我们一起接」。两人共同控制一朵可伸缩的接雨云：左席只能移动左边缘，右席只能移动右边缘。每波要接住两颗同色配方滴，同时避开紧邻目标区间的灰滴。三份配方各有三波，九波全部完成后共同调成三瓶天气饮料。

最小版本只保留一条核心关系：**你守一边，我守一边，云朵只有调到刚刚好，才能把这一味完整接住。**

不加入随机落物、自由物理、惯性、分数、排名、生命、倒计时惩罚、音频、振动、存档、网络、编辑器、AI、真实天气 API 或第三方运行依赖。失败只重试当前原料；完成态不比较双方表现。

## 2. 首局体验与冻结文案

1. intro 展示两张席位牌、可伸缩云朵示意和“开始接雨”；
2. 第一份配方出现，展示名称、三种颜色顺序和一句风味说明；
3. 两人确认后进入 falling，云朵从中性区间 `[2,4]` 开始；
4. 左席用 `A/D` 或左侧按钮移动左边缘，右席用 `←/→` 或右侧按钮移动右边缘；
5. 雨滴落到云朵时一次性结算：恰好接住两颗彩滴且不接灰滴即成功；
6. 漏接时标出漏掉哪一边，接灰时标出污染雨道，点击“再接一次”重试同一波；
7. 每份三波完成后装满一只配方瓶；继续下一份；
8. 三只瓶都完成后显示共同结语与“再调一次”。

冻结短文案：

```text
标题：这一场雨，我们一起接
副标题：你守一边，我守一边，把云朵调到刚刚好。
规则：接齐两颗彩滴，不要让灰滴落进配方。
失败·漏接：还差一边没有接住。
失败·污染：云朵盛得太满，灰滴也落进来了。
单波成功：这一味，刚刚好。
配方完成：这瓶天气，被我们接住了。
全部完成：三场雨，都调成了我们的颜色。
```

## 3. 常量、雨道与术语

```text
LANE_COUNT = 7
FIRST_LANE = 0
LAST_LANE = 6
DEFAULT_LEFT_LANE = 2
DEFAULT_RIGHT_LANE = 4
TICKS_PER_SECOND = 30
WAVE_TICKS = 120
MAX_CATCH_UP_TICKS = 5
RECIPE_COUNT = 3
WAVES_PER_RECIPE = 3
```

- **云朵区间**：闭区间 `[leftLane, rightLane]`，左右端所在雨道都能接取；
- **目标滴**：同一波中位于 `targetLeft` 和 `targetRight` 的两颗同色雨滴；
- **灰滴**：位于目标区间外紧邻雨道的污染滴；贴边时不存在越界灰滴；
- **接住**：雨滴的 lane 满足 `leftLane <= lane <= rightLane`；
- **一波**：从 `waveTick = 0` 到第 120 个固定 tick 结算的一次落雨；
- **尝试**：同一波从默认区间重新开始的次数，从 1 起；
- **成功区间**：两颗目标滴均接住且灰滴接住数为 0 的合法区间。

内部 ID 只用 ASCII；界面颜色名称、配方名称和状态文案由固定 metadata 映射，不把显示文案写入 reducer 分支。

## 4. 冻结配方与波次

### 4.1 颜色

颜色 ID 冻结为：

```js
const INGREDIENTS = Object.freeze({
  blue: Object.freeze({ id: "blue", label: "晴蓝露", symbol: "水滴" }),
  gold: Object.freeze({ id: "gold", label: "日光蜜", symbol: "光滴" }),
  rose: Object.freeze({ id: "rose", label: "晚霞汁", symbol: "花滴" }),
});
```

符号必须同时以形状/纹理和文字区分，不能只依赖蓝、金、玫瑰颜色。

### 4.2 三份固定配方

```js
const RECIPES = Object.freeze([
  Object.freeze({
    id: "morning-dew",
    title: "晨光露",
    note: "给今天留一口亮晶晶的开始。",
    waves: Object.freeze([
      Object.freeze({ id: "morning-blue", ingredientId: "blue", targetLeft: 1, targetRight: 3 }),
      Object.freeze({ id: "morning-gold", ingredientId: "gold", targetLeft: 3, targetRight: 5 }),
      Object.freeze({ id: "morning-rose", ingredientId: "rose", targetLeft: 0, targetRight: 2 }),
    ]),
  }),
  Object.freeze({
    id: "sunset-syrup",
    title: "晚霞糖露",
    note: "把慢下来的傍晚装进同一只瓶子。",
    waves: Object.freeze([
      Object.freeze({ id: "sunset-rose", ingredientId: "rose", targetLeft: 4, targetRight: 6 }),
      Object.freeze({ id: "sunset-blue", ingredientId: "blue", targetLeft: 1, targetRight: 2 }),
      Object.freeze({ id: "sunset-gold", ingredientId: "gold", targetLeft: 3, targetRight: 6 }),
    ]),
  }),
  Object.freeze({
    id: "star-soda",
    title: "星夜汽水",
    note: "最后一口，留给一起抬头的夜晚。",
    waves: Object.freeze([
      Object.freeze({ id: "star-gold", ingredientId: "gold", targetLeft: 0, targetRight: 1 }),
      Object.freeze({ id: "star-rose", ingredientId: "rose", targetLeft: 1, targetRight: 5 }),
      Object.freeze({ id: "star-blue", ingredientId: "blue", targetLeft: 5, targetRight: 6 }),
    ]),
  }),
]);
```

`validateRecipes(recipes)` 必须整套校验、整套回退，拒绝：

- 非普通对象、额外字段、getter 抛错、重复 recipe/wave ID；
- 配方数或每方波数不等于 3；
- 非法 ingredientId，或一份配方未恰好使用三种颜色各一次；
- target 不是安全整数、越界、`targetLeft >= targetRight`；
- 任一端等于对应默认端，使该波不需要一位玩家动作；
- 任一波没有唯一成功区间；
- 九波区间与冻结表不完全一致。

运行时 config 不允许覆盖配方、雨道数、tick、默认区间或失败条件。

## 5. 雨滴生成与纯判定

### 5.1 `createWaveDrops(wave)`

对合法 wave 返回按 lane、kind、id 固定排序的冻结数组：

```js
[
  { id: `${wave.id}-target-left`, kind: "target", side: "left", lane: targetLeft, ingredientId },
  { id: `${wave.id}-target-right`, kind: "target", side: "right", lane: targetRight, ingredientId },
  { id: `${wave.id}-grey-left`, kind: "grey", side: "left", lane: targetLeft - 1, ingredientId: null },
  { id: `${wave.id}-grey-right`, kind: "grey", side: "right", lane: targetRight + 1, ingredientId: null },
]
```

越界灰滴必须从结果中移除；其余项目最终按 `lane` 升序，同 lane 时 target 在 grey 前、left 在 right 前。畸形 wave 返回冻结空数组，不部分猜测。

### 5.2 `resolveCatch(wave, leftLane, rightLane)`

只接受满足 `0 <= leftLane <= rightLane <= 6` 的安全整数。返回：

```js
{
  status: "success" | "missed" | "contamination" | "invalid",
  interval: { leftLane, rightLane },
  caughtIds: [],
  caughtTargetIds: [],
  caughtGreyIds: [],
  missedTargetIds: [],
  missedSides: [],
}
```

判定顺序冻结为：

1. 输入或 wave 非法：`invalid`，区间回落到 `[2,4]`，所有数组为空；
2. 以闭区间过滤 caughtIds；
3. 若 caughtGreyIds 非空：`contamination`，即使同时漏目标也不改为 missed；
4. 否则若 missedTargetIds 非空：`missed`；
5. 否则恰有两颗目标：`success`。

所有 ID 数组沿用 drops 固定顺序；`missedSides` 只含 `left/right` 且按 left、right 排序。返回对象递归冻结，与 wave 和调用方断开引用。

### 5.3 `enumerateIntervals()` 与唯一解

按 `leftLane = 0…6`，内层 `rightLane = leftLane…6` 生成 28 个冻结区间。`findSuccessfulIntervals(wave)` 对每个区间调用 `resolveCatch`，九波都必须且只能返回自己的 `[targetLeft,targetRight]`。

合作 Gate 还必须证明：

- 九波的 `targetLeft !== 2` 且 `targetRight !== 4`；
- 固定左席为 2 时，没有一条完整九波成功路径；
- 固定右席为 4 时，没有一条完整九波成功路径；
- 对调两位席位的输入权限不能改变 state，席位身份不是仅供显示的 metadata。

## 6. 配置契约

`config.js` 暴露：

```js
window.CLOUD_RECIPE_CONFIG = Object.freeze({
  seats: Object.freeze(["你", "我"]),
  composeCompletionNote(summary) {
    return `${summary.seats[0]}和${summary.seats[1]}，往后的雨，也一起调成喜欢的颜色。`;
  },
});
```

`normalizeConfig(raw)`：

- `seats` 必须是恰含两个字符串的数组；
- 每个名字 trim 后按 Unicode code point 截至 12 字；
- 空白、重复名字、getter 抛错、非数组或额外元素时 seats 整项回退；
- composer 不进入 reducer/state，只在 complete 由 app 调用；
- composer 获得递归冻结、与真实状态断开引用的 summary；
- 返回值 trim 后最多 120 code points；非字符串、空白、超长、Promise、异常或修改 summary 均回退默认结语；
- 默认配置不修改即可完整游玩。

配置不得改变规则、配方、视觉资产路径、来源声明、状态文案或作品分类。

## 7. 权威状态与不变量

```js
{
  phase,             // intro | recipe-intro | falling | retry | wave-result | recipe-result | complete
  recipeIndex,       // 0..2
  waveIndex,         // 0..2
  waveTick,          // falling: 0..119；其他阶段为 0
  leftLane,          // 0..6
  rightLane,         // 0..6，且 leftLane <= rightLane
  attempt,           // 当前波从 1 起
  lastResult,        // retry/result 阶段的 canonical resolution；其他阶段 null
  completedWaves,    // [{ recipeId, waveId, attempts }]
  revision,
}
```

不变量：

- intro 恰为 `recipeIndex=0/waveIndex=0/waveTick=0/[2,4]/attempt=1/lastResult=null/completedWaves=[]`；
- recipe-intro 指向尚未完成的配方第 0 波，区间 `[2,4]`；
- falling 的 `waveTick` 只能是 0…119；开始、重试和下一波都从 0 开始；
- retry 的 lastResult 只能是 missed/contamination；wave-result 与 recipe-result 只能是 success；
- completedWaves 只能按 RECIPES 的前缀顺序增长，不能跳波、重复或伪造 attempts；
- wave-result 时当前成功波不是一份配方的最后一波；recipe-result 时当前成功波恰为该配方最后一波；
- complete 恰有九条 completedWaves，recipeIndex=2、waveIndex=2、lastResult 为第九波 success；
- 非 falling 阶段不得移动边界；所有新一波和重试都原子回到 `[2,4]`；
- revision 只在权威状态真实改变时加一；
- 所有合法返回状态递归冻结，不共享 action、config、wave 或调用方对象。

合法 state 上的非法/错阶段 action 返回同一引用。畸形 state 或 action 不抛异常；公开 reducer 对畸形 state 安全返回全新 intro，对畸形 action 保持原引用。

## 8. 状态转换 API

### 8.1 Action 精确 schema

```js
{ type: "START" }
{ type: "BEGIN_RECIPE" }
{ type: "MOVE_BOUNDARY", seat: 0 | 1, direction: -1 | 1 }
{ type: "STEP", ticks: 1..5 }
{ type: "RETRY" }
{ type: "NEXT_WAVE" }
{ type: "NEXT_RECIPE" }
{ type: "RESTART" }
```

每个 action 必须是普通对象、字段集合精确、无 symbol key、无 getter、无污染原型。数值不做字符串转换；未知 type 或额外字段拒绝。

### 8.2 阶段转换

| 当前阶段 | action | 结果 |
| --- | --- | --- |
| intro | START | recipe-intro，第 0 份配方 |
| recipe-intro | BEGIN_RECIPE | falling，当前波 tick 0、区间 `[2,4]` |
| falling | MOVE_BOUNDARY | 仅合法席位与不越界时移动一格 |
| falling | STEP | 最多推进 5 tick；到第 120 tick 原子结算 |
| falling 结算失败 | 内部转换 | retry，attempt 不变，保留 lastResult |
| falling 结算成功且非本方末波 | 内部转换 | wave-result，追加 completedWaves |
| falling 结算成功且本方末波 | 内部转换 | recipe-result，追加 completedWaves |
| retry | RETRY | falling，同一波、attempt + 1、区间 `[2,4]` |
| wave-result | NEXT_WAVE | falling，waveIndex + 1、attempt 1、区间 `[2,4]` |
| recipe-result（非第三方） | NEXT_RECIPE | recipe-intro，recipeIndex + 1、waveIndex 0 |
| recipe-result（第三方） | NEXT_RECIPE | complete |
| 任意合法阶段 | RESTART | 全新 intro；intro 上保持同一引用 |

STEP 若 ticks 大于当前波剩余 tick，只消费到第 120 tick 并结算一次，不把多余 tick 带入结果阶段或下一波。`MAX_CATCH_UP_TICKS=5` 同时限制公开 action，避免失焦恢复后大步跳过画面。

### 8.3 边界权限

- seat 0 只改变 `leftLane`；`direction=-1/+1` 分别向左/右；
- seat 1 只改变 `rightLane`；方向语义相同；
- left 向右时若新值大于 right，no-op；right 向左时若新值小于 left，no-op；
- 到 0/6 外的输入 no-op；
- no-op 不增加 revision；
- 同一 tick 的两个离散动作按日志顺序应用，但双方不写同一字段；在不触碰交叉边界的情况下满足交换律；
- UI 不得绕过 reducer 直接修正、动画或保存边界。

## 9. 键盘、触控与时钟

`classifyBoundaryKey(eventLike)` 精确映射：

| `code` | action |
| --- | --- |
| `KeyA` | seat 0, direction -1 |
| `KeyD` | seat 0, direction +1 |
| `ArrowLeft` | seat 1, direction -1 |
| `ArrowRight` | seat 1, direction +1 |

`repeat === true`、未知 code、畸形对象、getter 抛错返回 null。app 仅在 falling 且分类成功时 `preventDefault()`；按钮每次 click 派发一个相同 MOVE_BOUNDARY。按住不连续移动，避免键盘重复率和触摸长按差异。

浏览器时钟：

- `requestAnimationFrame` 累积真实时间，每 `1000/30ms` 派发一个 `{type:"STEP",ticks:1}`；
- 单帧最多补 5 tick，超出时间丢弃，不形成后台追赶；
- `visibilitychange` hidden、`pagehide`、blur 时停止循环并清空 accumulator/lastTimestamp；
- visible/focus 只从当前 state 的 waveTick 继续，不补离开期间时间；
- 非 falling 阶段不运行 STEP 循环；RESTART 与阶段切换必须取消旧 RAF token；
- reduced motion 不改变 tick 和判定，只关闭云朵漂浮、瓶子闪光与结算摇摆。

## 10. 公开视图与阶段 DOM

### 10.1 `getPublicView(state)`

只返回渲染所需、与 state 断开引用的冻结数据：

```js
{
  phase,
  recipe: { index, total, id, title, note },
  wave: { index, total, id, ingredientId, ingredientLabel, ingredientSymbol },
  timing: { tick, totalTicks, progressPermille },
  cloud: { leftLane, rightLane, widthLanes },
  drops: [{ id, kind, side, lane, ingredientId, caughtAtCurrentInterval }],
  attempt,
  lastResult,
  completedRecipes: [{ id, title, totalAttempts }],
  completedWaveCount,
  controls: { canStart, canBeginRecipe, canMove, canRetry, canNextWave, canNextRecipe, canRestart },
  announcementCode,
}
```

`progressPermille = floor(waveTick * 1000 / WAVE_TICKS)`，非 falling 为 0；CSS 使用这一整数值计算视觉位置。`widthLanes = rightLane - leftLane + 1`。

`completedRecipes` 只包含真正完成的配方，totalAttempts 由对应三条 completedWaves 求和，不在 state 重复存储。announcementCode 由 phase、lastResult、missedSides 和完成进度纯派生，app 再映射中文。

### 10.2 阶段最小 DOM

- intro：规则、席位牌、开始按钮；不得挂载未来雨滴；
- recipe-intro：当前配方卡和本方三色顺序，不挂载其他配方内容；
- falling：七雨道、当前波 drops、云朵、双席控制和进度；
- retry：仅当前失败原因、失败雨道、重试按钮；不以 CSS 隐藏 falling 舞台后继续计时；
- wave-result：当前原料成功卡和下一味按钮；
- recipe-result：当前完成瓶、已完成瓶列和下一瓶/完成按钮；
- complete：三瓶、九波/尝试摘要、结语、重开按钮；不保留活动雨滴或控制按钮。

本作没有秘密信息，但仍采用阶段真实增删节点，避免不可见动画、旧按钮焦点和测试歧义。

## 11. 视觉与响应式约束

视觉方向在独立设计文档冻结；规格先规定不可破坏的语义：

- 主舞台像“天空里的天气调饮台”，不是儿童博彩机、街机计分板或现实气象仪表；
- 七条雨道、两颗目标滴、灰滴、云朵闭区间和两只权限把手始终高对比；
- 左把手与左席使用暖金/方形纹，右把手与右席使用莓红/圆点纹；两者不能只靠颜色区分；
- 目标滴使用颜色 + 内部纹样 + 文字标签；灰滴使用斜纹与“灰滴”辅助文本；
- 390px 移动端按钮至少 56px，320px 至少 52px；桌面至少 48px；
- 320px 无水平滚动，七道可压缩但把手不得重叠；
- 触控控制在舞台下方左右分列，不能覆盖落雨；
- focus-visible、forced-colors、200% zoom 和 reduced-motion 均需可操作；
- 生成式资产失败时，CSS 天空渐变、纯色云朵和语义 SVG/DOM 滴形仍能完整游玩。

## 12. 目录与文件边界

```text
experiences/co-op/cloud-recipe/
├── index.html
├── styles.css
├── config.js
├── logic.js
├── app.js
├── README.md
├── ATTRIBUTION.md
└── assets/
    ├── README.md
    ├── weather-kitchen-background.png
    ├── cloud-ribbon.png
    └── weather-ingredients.png

test/
├── cloud-recipe.test.mjs
└── cloud-recipe-catalog.test.mjs
```

- `logic.js`：UMD/IIFE 双暴露 `window.CloudRecipeLogic` 与 `module.exports`，纯规则、校验、配置和 view；
- `config.js`：唯一私人化入口，默认值可直接游玩；
- `app.js`：唯一 DOM、RAF、事件、文案和资产加载层，不复制规则；
- `assets/`：只放本项目纯文本提示生成的生产资产与生成记录；
- `ATTRIBUTION.md`：写明三个固定 MIT 来源只作机制研究、零代码/素材复制；
- 不创建 package 子项目，不增加 npm 依赖，不修改统一启动方式。

脚本顺序冻结为：`config.js → logic.js → app.js`，全部使用经典脚本，保证 `file://`。

## 13. 自动测试矩阵

### 13.1 逻辑测试

至少覆盖：

1. 常量、INGREDIENTS、RECIPES、默认配置、导出 API 递归冻结；
2. UMD 浏览器全局与 CommonJS 导出一致；
3. validateRecipes 拒绝所有 schema、顺序和唯一解破坏；
4. 九波 createWaveDrops 精确；贴边灰滴正确省略；
5. enumerateIntervals 恰为 28，顺序稳定；
6. 九波各恰好一个 success 且等于目标区间；
7. contamination 优先于 missed，invalid 统一回落；
8. 默认两端在九波都必须改变，单席固定无法完成；
9. config Unicode、重复名、getter、Promise、composer 异常与断引用；
10. 初态 exact keys、JSON 往返、冻结与 state assert；
11. START/BEGIN_RECIPE 只在正确阶段生效；
12. 两席边界权限、四方向、越界、交叉、no-op revision；
13. KeyA/KeyD/箭头映射与 repeat/畸形过滤；
14. STEP 1..5、119/120 边界、超量不跨阶段；
15. missed 与 contamination 进入 retry，重试 attempt + 1 并重置区间；
16. success 只追加一次，非末波/末波进入正确结果阶段；
17. 九波完整黄金回放得到三方 complete；
18. completedWaves 前缀、attempts、phase 与 lastResult 防伪造；
19. 任意阶段 RESTART 与 intro 幂等；
20. 相同 action 日志、深克隆日志与 JSON 中间态完全确定；
21. public view exact keys、进度、controls、完成配方派生与断引用；
22. 生产逻辑不包含网络、存储、随机、音频和第三方 runtime hook。

### 13.2 目录测试

- catalog 存在 `cloud-recipe`，分类 co-op、level A、installed true；
- href、assets、README、ATTRIBUTION 全部本地存在；
- HTML 经典脚本顺序正确，无 module、CDN、远程 URL、内联事件和自动音频；
- README 与 ATTRIBUTION 包含 `file://`、双席权限、固定来源 commit 和零复制声明；
- config 是唯一允许私人化的规则外入口；
- 页面存在语义七道、双席四按钮、aria-live、focus-visible、reduced-motion、forced-colors；
- 未来配方不靠 hidden DOM 预挂载；
- 根门户直开路径与本地服务路径均可解析。

## 14. 浏览器验收矩阵

### 14.1 完整流程

1. `file://` 双击进入；
2. 键盘完成至少一波，触控按钮完成至少一波；
3. 分别制造 missed、contamination，确认原因、雨道标记和同波重试；
4. 完成九波并核对三瓶、配方顺序、总尝试与结语；
5. complete 重开回 exact intro；
6. localhost 重复最小完整流程，结果与 file 一致。

### 14.2 生命周期

- falling 时切后台再回来，不补时间、不自动结算；
- blur/focus 后第一个 RAF 不产生 catch-up；
- 反复重试/重开不残留多个 RAF；
- 结果阶段按方向键不移动隐藏边界；
- reduced motion 下逻辑 tick 与完整模式一致。

### 14.3 响应式与可访问

- 桌面 `1440×1000`；
- 移动 `390×844`；
- 窄屏 `320×568`；
- 200% zoom、键盘 Tab、focus-visible、aria-live；
- forced-colors 下仍可区分目标/灰滴与左右权限；
- 三档截图与视觉概念做忠实度 ledger。

## 15. 借鉴声明与发布边界

作品目录必须包含：

```text
本作的规则、代码、关卡、界面、文案与生成式视觉资产均为独立实现。
定向调研曾参考三个 MIT 项目的公开说明与源码，用于理解“落物接取”
“正负目标区分”和“不同角色共同作用于一个对象”等通用机制；
未复制其源码、素材、关卡或界面。固定来源、commit 与版权信息见
docs/151-cloud-recipe-research.md 和本目录 ATTRIBUTION.md。
```

三个固定来源为：

- `Kartik0211/Catching-the-objects` @ `65e8fa086d40233295615a2bf1d8aa255dc0eb84`，MIT；
- `ankitwarbhe/Basketcatcher` @ `67b56217bce938baafa2c133a221c4a715e13cd5`，MIT；
- `pemmyz/js_thrustvector` @ `0b5300749c310f52e793493d50f0e4734db888b2`，MIT。

不得把 MIT 当作“无需署名”。首版是机制研究零复制，因此不把第三方 LICENSE 文件复制进作品；如果未来复制任一受保护表达，必须先重新审计、保留原版权与许可文本，并更新 ATTRIBUTION。

## 16. 完成定义

只有以下条件全部满足，项目才可从“已冻结”改为“已完成”：

- 视觉概念、生产资产、规格、计划、逻辑、前端、目录、bugs、learn、验收分别按计划独立提交；
- logic 与 catalog 测试全部通过，全仓无回归；
- 28 区间 × 9 波证明唯一解；完整黄金回放可确定重现；
- 真实 `file://` 与 localhost 均完成九波；
- 三种失败/成功路径、失焦恢复、重开和资产失败降级已验证；
- 1440、390、320 三档无水平溢出，触控目标达标；
- Browser/Chrome 检查无 console error、网络依赖或残留 RAF；
- 生产截图与概念图已用视觉检查工具对照；
- README、ATTRIBUTION、assets 生成记录、bugs、learn 和最终验证报告齐全；
- 每完成一个部分都有独立 git commit，且提交前确认分支与 worktree。
