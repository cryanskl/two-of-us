# A 级「把颜色调到一起」实现规格

> 状态：玩法、配置、状态、接口、阶段 DOM、视觉与验收 Gate 冻结。来源与许可证见 [`81-shared-color-studio-research.md`](./81-shared-color-studio-research.md)。

## 1. 作品定义

「把颜色调到一起」是一款两人同机合作的限时调色作品。玩家 1 只控制色相环，玩家 2 只控制明度尺；两条轴都落到目标刻度即共同完成一张色笺。

- 分类：`co-op`；
- 目录：`experiences/co-op/shared-color-studio/`；
- 启动等级：A；
- 运行依赖：无；
- 支持：`file://` 直接打开与仓库静态服务器；
- 网络、存储、相机、麦克风、定位、账户：均不使用；
- 赛程：五张固定色笺，每张 24 秒，超时可无惩罚重试；
- 目标：完成五张后展示共同色册，不设胜负、生命、排行榜或长期统计。

## 2. 文件边界

```text
experiences/co-op/shared-color-studio/
├── index.html
├── styles.css
├── config.js
├── logic.js
├── logic.test.js
├── app.js
├── README.md
├── ATTRIBUTION.md
└── assets/
    ├── pigment-table.webp
    └── favicon.svg
```

- `config.js`：五张色笺、规则常量、可编辑文案和结果文案组合；
- `logic.js`：不读取 DOM、CSS、时钟或随机数的纯状态机；
- `app.js`：rAF accumulator、键盘/按钮输入、颜色渲染、阶段 DOM 和焦点；
- `logic.test.js`：配置清洗、环/线边界、交换律、计时、阶段、重放和颜色回退测试；
- `ATTRIBUTION.md`：固定来源、许可证和原创零复制声明；
- `assets/`：仅放本项目生成的本地无字资产，CSS 必须提供无图回退。

## 3. 配置契约

```js
window.SHARED_COLOR_STUDIO_CONFIG = {
  tickMs: 100,
  countdownTicks: 30,
  roundTicks: 240,
  maxFrameGapMs: 500,
  chroma: 0.12,
  hueDegrees: [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330],
  lightness: [0.48, 0.52, 0.56, 0.60, 0.64, 0.68, 0.72, 0.76, 0.80],
  rounds: [
    {
      id: "sunset-letter",
      title: "晚霞信笺",
      note: "像那天回头时，天边刚好慢下来。",
      target: { hueIndex: 1, lightnessIndex: 7 },
      start: { hueIndex: 8, lightnessIndex: 2 }
    },
    {
      id: "sea-glass",
      title: "海玻璃",
      note: "把风和浪磨成一小块安静。",
      target: { hueIndex: 6, lightnessIndex: 6 },
      start: { hueIndex: 2, lightnessIndex: 1 }
    },
    {
      id: "berry-night",
      title: "莓果夜灯",
      note: "深一点，再留一盏只给彼此的灯。",
      target: { hueIndex: 11, lightnessIndex: 3 },
      start: { hueIndex: 4, lightnessIndex: 8 }
    },
    {
      id: "moss-letter",
      title: "苔痕小纸条",
      note: "被雨淋过的话，也会慢慢长出颜色。",
      target: { hueIndex: 4, lightnessIndex: 5 },
      start: { hueIndex: 9, lightnessIndex: 2 }
    },
    {
      id: "lavender-dawn",
      title: "薰衣草清晨",
      note: "最后一张，调成我们醒来时的光。",
      target: { hueIndex: 9, lightnessIndex: 8 },
      start: { hueIndex: 1, lightnessIndex: 4 }
    }
  ],
  copy: {
    title: "把颜色调到一起",
    intro: "你转色相，我调明暗。一起把五张色笺调到目标刻度。",
    start: "开始调色",
    retry: "再调一次",
    next: "收下这张",
    restart: "重新调一册"
  }
};
```

### 3.1 清洗与固定边界

- `tickMs` 限定 `50…250`，默认 100；
- `countdownTicks` 限定 `0…100`，默认 30；
- `roundTicks` 限定 `50…1200`，默认 240；
- `maxFrameGapMs` 限定 `250…2000`，默认 500；
- `chroma` 限定 `0.02…0.16`，默认 0.12；
- 色相和明度数组的长度、顺序与数值由首版固定，非法覆盖整组回退；
- 正式赛程固定五张；缺项、重复 `id`、越界索引或起点已完成时整组回退；
- 标题最多 16 个 Unicode code point，note 最多 48 个；空文案使用默认值；
- 配置文案只经 `textContent` 输出；
- 清洗结果深拷贝，调用方后改原配置不得污染状态。

`config.js` 必须保留一个 5–10 行的 `composeStudioResult(view)` TODO，邀请用户自行改写最终合作文案；缺省实现先完整可运行，TODO 不得阻塞测试或完成态。

## 4. 权威状态

```js
{
  phase: "ready" | "countdown" | "playing" | "paused" | "round-result" | "complete",
  roundIndex: 0,
  attemptNumber: 1,
  current: { hueIndex: 8, lightnessIndex: 2 },
  countdownTicks: 30,
  remainingTicks: 240,
  moves: { hue: 0, lightness: 0 },
  completed: [
    {
      id: "sunset-letter",
      moves: { hue: 5, lightness: 5 },
      attempts: 1,
      remainingTicks: 171
    }
  ],
  outcome: null | "success" | "timeout",
  pauseReason: null | "manual" | "hidden" | "blur" | "stalled",
  resumePhase: null | "countdown" | "playing",
  revision: 0,
  rules: { /* 清洗后的固定配置 */ }
}
```

不变量：

- `roundIndex` 始终指向配置中的有效色笺；complete 时仍指向最后一张；
- `current` 只保存整数索引，色相规范到 `0…11`，明度钳制到 `0…8`；
- `remainingTicks`、`countdownTicks`、步数和尝试次数均为非负整数；
- 只有有效且实际改变索引的动作增加对应步数；
- completed 的 `id` 顺序严格等于前缀赛程且不重复；
- success 只能追加一次 completed；timeout 不追加；
- `paused` 必须保存 resumePhase，其他阶段该字段为 null；
- revision 只在有效状态变化时加一；
- reducer 不原地修改输入状态或嵌套对象。

## 5. 纯逻辑 API

`logic.js` 以浏览器全局 `SHARED_COLOR_STUDIO_LOGIC` 和 CommonJS 暴露：

```js
createStudioState(rawConfig)
startStudio(state)
advanceCountdown(state, ticks)
applyAxisMove(state, { axis, direction })
advanceTimer(state, ticks)
retryRound(state)
advanceRound(state)
pauseStudio(state, reason)
resumeStudio(state)
restartStudio(state)
getView(state)
classifyControlCode(code)
getColorTokens(viewColor, supportsOklch)
replayStudio(rawConfig, events)
```

### 5.1 开始与倒计时

- `createStudioState` 清洗配置并返回 ready；
- `startStudio` 只在 ready/complete 有效，并从第一张固定起点进入 countdown；
- countdownTicks 为 0 时直接进入 playing；
- `advanceCountdown` 只接受非负整数 tick，扣到 0 时进入 playing，不顺带扣 round timer；
- countdown 期间动作与 round timer 均无效。

### 5.2 双轴动作

```text
axis: hue        direction: -1 | 1
axis: lightness  direction: -1 | 1
```

- hue 用模 12 循环；lightness 在 0/8 钳制；
- 未知 axis、非法 direction、非 playing 阶段返回原状态引用；
- 钳制后索引未改变则返回原状态引用；
- 每次有效动作后立即检查两轴是否都命中；
- 命中时 outcome=success、进入 round-result、追加一条 completed；
- 同一 success 后任何动作不得重复追加；
- 两轴动作写入正交字段：同一旧状态下，hue→lightness 与 lightness→hue 的索引、步数和结果必须等价。

### 5.3 计时、重试与下一张

- `advanceTimer` 只在 playing 有效；
- tick 先规范为非负整数，再一次性扣除并钳制到 0；
- 扣到 0 且尚未成功时 outcome=timeout、进入 round-result；
- timeout 的 `retryRound`：attemptNumber + 1，同一轮回到固定起点、完整倒计时和 24 秒、步数清零；
- success 的 `advanceRound`：若还有色笺，roundIndex + 1、attemptNumber=1、进入 countdown；
- 第五张 success 后不自动 complete，先停在 round-result；点击“收下这张”才由 `advanceRound` 进入 complete；
- timeout 不能 advanceRound，success 不能 retryRound；
- restart 从任意阶段回到全新 ready，清空完成记录。

### 5.4 暂停与恢复

- 只允许暂停 countdown/playing；
- pauseReason 只允许 manual/hidden/blur/stalled，默认 manual；
- 已暂停再次暂停返回原引用，不覆盖第一次原因；
- resume 回到 resumePhase，并清空原因；
- app 恢复后重设上一帧时间并清空 accumulator，不能补扣离开时长。

### 5.5 键位分类

```text
KeyA -> { axis: "hue", direction: -1 }
KeyD -> { axis: "hue", direction:  1 }
KeyJ -> { axis: "lightness", direction: -1 }
KeyL -> { axis: "lightness", direction:  1 }
other -> null
```

使用 `KeyboardEvent.code`；repeat、输入框来源、preventDefault 与阶段 Gate 由 app 层处理。

### 5.6 颜色令牌

`getColorTokens({ hueIndex, lightnessIndex }, supportsOklch)` 返回：

```js
{
  mode: "oklch" | "hsl",
  css: "oklch(76% 0.12 30)" | "hsl(30 76% 76%)",
  hueDegrees: 30,
  lightnessPercent: 76
}
```

- supportsOklch 由 app 通过 `CSS.supports` 注入，逻辑不得自己读取 CSS；
- HSL 饱和度用固定可测试公式由 chroma 映射，并钳制 `24%…88%`；
- 同一个索引在同一模式下永远得到同一字符串；
- 颜色令牌不参与成功判定。

### 5.7 重放

`replayStudio(rawConfig, events)` 从全新 ready 顺序执行：

```text
start | countdown(ticks) | move(axis,direction) | timer(ticks)
retry | next | pause(reason) | resume | restart
```

未知事件忽略。同配置与同事件序列必须深相等；事件数组与嵌套对象不得被修改。

## 6. 视图模型与提示方向

`getView(state)` 至少返回：

```js
{
  phase,
  roundNumber,
  roundCount: 5,
  attemptNumber,
  title,
  note,
  currentColor,
  targetColor,
  hueAxis: {
    currentIndex, targetIndex, distance,
    direction: "counterclockwise" | "clockwise" | "matched",
    label
  },
  lightnessAxis: {
    currentIndex, targetIndex, distance,
    direction: "darker" | "lighter" | "matched",
    label
  },
  remainingMs,
  countdownLabel,
  moves,
  completed,
  outcome,
  statusLabel,
  canStart, canMove, canPause, canResume,
  canRetry, canAdvance, canRestart
}
```

色相方向计算：

```text
clockwise = (target - current + 12) % 12
counter   = (current - target + 12) % 12
```

距离小者为提示方向。正式五题不出现 6 对 6 平局；若自定义非法状态出现平局，固定提示 clockwise，保证确定性。明度直接比较索引。示例文案：

- `色相还差 3 格，顺时针转`；
- `明度还差 2 格，再亮一点`；
- `色相已经合拍`；
- `两条刻度合拍，收下晚霞信笺。`；
- `时间到了，颜色没有丢。一起再调一次。`。

## 7. 阶段 DOM 与可访问性

### 7.1 持久骨架

```html
<main>
  <header>标题、轮次、倒计时</header>
  <section data-stage="studio">
    <article data-color="target">目标色笺</article>
    <article data-color="current">共享调色盘</article>
    <section data-axis="hue">色相刻度与玩家 1 状态</section>
    <section data-axis="lightness">明度刻度与玩家 2 状态</section>
  </section>
  <section data-controls>四个原生按钮</section>
  <section data-result hidden>成功或超时操作</section>
  <section data-album hidden>五张共同色册</section>
  <p role="status" aria-live="polite"></p>
</main>
```

- 目标和当前色同时有名称、`H x/12 · L y/9`、刻度和背景色；
- 两位玩家以“玩家 1/2”、不同线型/图形和文字区分，不只靠颜色；
- 四按钮是 `<button type="button">`，最小 56px，键盘焦点可见；
- 只有 playing 的 KeyA/KeyD/KeyJ/KeyL 调用 preventDefault；
- 输入/textarea/contenteditable 内不响应全局游戏键；
- 阶段变更才更新 live region，不逐 tick 宣读；
- success/timeout 后焦点移到结果标题，next/retry 后回到对应玩家首个控制；
- complete 后焦点移到色册标题；restart 回到开始按钮；
- hidden 属性是真实阶段边界，隐藏的私人 note 不残留在可见 DOM 阶段之外。

### 7.2 Pointer 与生命周期

- 原生 click 是统一动作入口；可选 pointerdown 只负责按下视觉，不提前重复派发；
- pointerup、pointercancel、lostpointercapture 必须清理 pressed 状态；
- 控制按钮 `touch-action: manipulation`；页面仍可自然垂直滚动；
- visibilitychange=hidden、window.blur 和超过 maxFrameGapMs 自动暂停；
- reduced motion 关闭颜料流动、盖章弹性和背景漂移，不改变计时或状态。

## 8. 视觉契约

### 8.1 方向

“夜间纸上调色桌”：深墨蓝桌面、未涂布纸张、两只并排色碟与一条横向色相环/纵向明度尺。颜色是唯一高饱和焦点，其他 UI 使用低彩度纸灰、石墨与黄铜。避免渐变霓虹仪表盘、卡片墙、玻璃拟态和默认 SaaS 面板。

### 8.2 ImageGen 概念与资产

编码前必须生成并审查：

1. `1504 × 1046` 桌面 playing 完整界面；
2. `390 × 844` 手机 playing 完整界面；
3. `1504 × 1046` 桌面 complete 色册；
4. 一张无字、无 UI、可裁切的纸上颜料桌生产背景 `pigment-table.webp`。

目标/当前色、刻度、文字、按钮和状态必须是代码原生 UI；生产背景只承担材质与氛围。资产加载失败时使用纯 CSS 深墨桌面和纸纹理近似，核心层级不能塌陷。

### 8.3 响应式

- `1504 × 1046`：内容最大宽约 1120px；目标/当前色并排；两轴控制等权；首屏可见主舞台和四键；
- `390 × 844`：目标/当前色并排或紧凑上下；四键 2×2；关键玩法尽量一屏；
- `320 × 700`：允许自然纵向滚动；无横向溢出；四键不小于 52px；结果按钮一次滚动可达；
- 200% 文字缩放仍能操作，不以固定高度裁切正文；
- 所有尺寸中主色盘是单一视觉中心，不添加无关统计卡。

## 9. 运行边界与安全

- 经典 `<script>` 顺序：config → logic → app；不使用 ES Module、fetch 或动态 import；
- 不使用 CDN、远程字体、远程图像、远程音频、Service Worker 或 localStorage；
- app.js 启动失败时显示可见错误文案，不留空白页；
- 所有配置文本经 textContent，不接受 innerHTML；
- 没有 eval、Function 构造器、URL 参数注入或跨窗口消息；
- 图片有 CSS 回退，favicon 为本地原创 SVG；
- 作品目录单独复制到离线机器后仍可运行。

## 10. 自动测试 Gate

`logic.test.js` 至少覆盖：

1. 默认配置与状态确定、无共享引用；
2. 非法配置整组回退；
3. start 进入 countdown，0 倒计时直达 playing；
4. countdown 动作和 timer 无效；
5. 色相 11→0 与 0→11；
6. 明度上下界钳制且不加步数；
7. hue 动作不改 lightness，反之亦然；
8. 两轴动作交换律；
9. 未知 axis/direction 返回原引用；
10. 单轴命中不结束；
11. 最后动作双轴命中只追加一次 success；
12. success 后动作/timer 幂等；
13. timer 整数扣减、钳制与 timeout；
14. timeout 不写 completed；
15. retry 同题复位且 attempts + 1；
16. success next 进入下一题固定起点；
17. 第五题 success→next→complete；
18. restart 清空历史回 ready；
19. pause/resume 保留阶段且暂停期间不推进；
20. 非法 pause reason 回退 manual；
21. getView 色相最短方向和明度方向；
22. getView matched 与超时文案不只返回颜色；
23. classifyControlCode 四键与未知键；
24. OKLCH 与 HSL fallback 令牌稳定；
25. 颜色令牌不参与结果；
26. 同配置 + 同事件日志重放深相等；
27. replay 不修改事件数组；
28. 返回对象修改不污染后续 getView；
29. 恶意配置文案只作为普通字符串；
30. 全部 reducer 不修改输入状态。

还必须运行：

```bash
node experiences/co-op/shared-color-studio/logic.test.js
npm test
npm run verify
git diff --check
```

## 11. 浏览器验收 Gate

### 11.1 核心路径

- file 直开、localhost 各一次；
- ready→countdown→成功→下一张；
- 制造 timeout→retry→成功；
- 完成第五张→complete→restart；
- KeyA/KeyD/KeyJ/KeyL 与四按钮走同一逻辑；
- 两个 pointerId 分别操作两组按钮；
- hidden/blur/长帧暂停，恢复不补扣；
- OKLCH 正常与强制 HSL fallback；
- 资产故障回退与 reduced motion。

### 11.2 三档尺寸

- `320 × 700`：无横向溢出、四键不重叠、最小热区、结果可达；
- `390 × 844`：关键玩法尽量一屏、目标/当前色清楚、双人控制等权；
- `1504 × 1046`：完整五张、色册、重开、焦点与最大宽度；
- console error 0、page error 0、外部网络请求 0；
- 截取 ready、playing、timeout、complete，并与三个概念原生尺寸对照。

### 11.3 Fidelity ledger

最终验收至少记录：

1. 允许文案与首屏 copy diff；
2. 目标/当前色的布局、尺寸与层级；
3. 色相/明度轴、四按钮和图形反馈；
4. 背景资产裁切、颜色与 CSS fallback；
5. 标题、正文、控制文字的字号/行高；
6. 桌面/手机/窄屏响应式；
7. playing/timeout/complete 状态变化；
8. reduced motion 与焦点状态。

最终必须在同一 QA 轮次用 `view_image` 查看概念和最新浏览器截图。任何会收到设计评审意见的可修复偏差都不能留到交付。

## 12. 借鉴声明模板

README 简版：

> 「把颜色调到一起」是本仓库的原创零依赖实现。设计调研参考了 Colorfle 的“目标色与反馈”抽象回路、RGB Color Matching Game 的明确目标与文字反馈，以及 Coloris 的颜色控件可用性。最终实现没有复制这些项目的代码、算法、素材、题面、文案或依赖。完整固定提交、许可证与采用边界见 `ATTRIBUTION.md`。

ATTRIBUTION 必须逐项写入研究文档第 6 节的固定 commit、许可证、研究用途和未采用内容，并补充 W3C CSS Color 4、WCAG 2.2 与 Pointer Events 只作为标准依据；任何规范示例代码均不进入运行时。

## 13. 停止条件

出现以下情况时暂停对应切片并先修订规格：

- 需要复制来源或许可不清的第三方代码/素材；
- 连续浮点颜色值进入权威规则；
- 一名玩家能够绕过分工修改两条轴；
- 结果依赖浏览器是否支持 OKLCH；
- `file://` 触发模块、fetch 或跨域限制；
- 倒计时依赖 rAF 帧数而不是整数 tick；
- 视觉实现偏离已接受概念，需要新增状态、文案或组件；
- 必须引入网络、持久化、照片、音频或构建链才能完成首版。
