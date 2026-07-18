# A 级「这一颗我先到」实现规格

> 状态：规则、数据、交互、视觉边界与验收 Gate 冻结。来源与许可证见 [`73-orbit-star-race-research.md`](./73-orbit-star-race-research.md)。

## 1. 产品定义

「这一颗我先到」是一款两人同机同时操作的短局轨道对抗。两颗卫星沿相反方向自动绕行；玩家不能直接控制前后，只能逐层升轨或降轨。内轨更快、外轨更慢，双方通过调节角速度，在目标星所在轨道完成拦截。

### 1.1 完成定义

- 入口：`experiences/versus/orbit-star-race/index.html`；
- 启动等级：A；完整作品目录直接 `file://` 打开；
- 玩家：固定两人，默认名为“朱方 / 蓝方”；
- 设备：桌面键盘与手机/平板触控均可；
- 赛制：先得 5 分且比分不相等者获胜；共享捕获导致同分时继续加赛；
- 核心状态：intro → preview → live → finished；
- 不使用服务、模块脚本、网络、存储、音频、AI、账号、排行榜或第三方运行依赖。

### 1.2 首版不做

- 真实轨道单位、质量、燃料、自由推力、椭圆、霍曼转移或 N 体引力；
- 卫星互撞、射击、道具、生命值、电脑对手或难度选择；
- 自定义轨道数量、目标分数、速度或命中窗口；
- 保存战绩、回放界面、在线匹配或局域网版本；
- 音乐、远程字体、云端星图或真实天文数据。

## 2. 核心常量

逻辑模块导出并冻结：

```js
const FIXED_DT = 1 / 120;
const RING_RADII = [0.82, 1, 1.22];
const BASE_ANGULAR_SPEED = 0.6;
const PLAYER_DIRECTIONS = [1, -1];
const START_ANGLES = [Math.PI * 1.5, Math.PI * 0.5];
const START_LANE = 1;
const PREVIEW_STEPS = 96;          // 0.8 秒
const SHIFT_COOLDOWN_STEPS = 30;   // 0.25 秒
const CAPTURE_ANGLE = 0.11;
const SHARED_EPSILON = 1e-5;
const TARGET_SCORE = 5;
```

角速度只由轨道半径派生：

```js
angularSpeedForLane(lane) = BASE_ANGULAR_SPEED * RING_RADII[lane] ** -1.5
```

禁止把角速度复制进 player state。三层速度必须严格满足 `inner > middle > outer`。

## 3. 配置契约

`config.js` 暴露：

```js
globalThis.ORBIT_STAR_RACE_CONFIG = {
  playerNames: ["朱方", "蓝方"],
  composeResult({ winnerIndex, playerNames, scores, sharedClaims }) {
    return null;
  },
};
```

约束：

- 配置只允许 `playerNames` 与 `composeResult` 两个键；多余键使整份配置回退；
- 名字逐个清洗空白，限制为 1–12 个 Unicode code points；任一非法则整份回退；
- formatter 上下文递归冻结，只允许返回 `{ title, body }`；字符串清洗后各限制 80 / 180 code points；
- formatter 抛错、返回 Promise、返回额外键或非法值时使用内置中性文案；
- 配置不能改变 seed、速度、轨道、目标分、方向、判定、赢家或比分；
- 配置清洗结果、状态与 view model 都不能共享调用方可变引用。

这是准备者唯一需要接触的代码区域。formatter 只塑造赛后语气，不改变公平规则。

## 4. Seed 与星流

### 4.1 Seed

- `startGame(state, seed)` 与 `restartGame(state, seed)` 只接受 `1..0xffffffff` 的整数；
- app 优先通过 `crypto.getRandomValues(new Uint32Array(1))` 取得非零 seed；
- 若浏览器能力缺失或连续得到 0，使用固定非零 fallback seed；
- 逻辑模块不调用 `Math.random`、Date、performance 或 crypto。

### 4.2 星体派生

`deriveStar(seed, starIndex)` 是纯函数，返回递归冻结的：

```js
{
  id: `star-${String(starIndex + 1).padStart(3, "0")}`,
  index: starIndex,
  lane: 0 | 1 | 2,
  sector: 0..11,
  angle: ((sector + 0.5) / 12) * TAU,
}
```

规则：

- 每连续三颗星必须恰好覆盖内、中、外三条轨道；seed 只改变每组三颗的排列；
- angle 量化为十二个扇区中心，避免浮点随机角难以复核；
- 同一 seed 与 starIndex 必须永远派生同一结果；
- 相邻星允许位于同一扇区，但不能由 DOM 或当前玩家位置修改星流；
- `starIndex` 不存入 state，始终等于 `claims.length`。

星流不声称密码学随机；它只提供每局变化、轨道平衡和可重放性。

## 5. 权威状态

```js
{
  phase: "intro" | "preview" | "live" | "finished",
  seed: 0 | uint32,
  stepCount: integer >= 0,
  previewSteps: integer >= 0,
  revision: integer >= 0,
  playerNames: [string, string],
  players: [
    { angle: number, lane: 0 | 1 | 2, cooldownSteps: integer >= 0 },
    { angle: number, lane: 0 | 1 | 2, cooldownSteps: integer >= 0 },
  ],
  claims: [
    {
      starIndex: integer >= 0,
      stepCount: integer > 0,
      winners: [0] | [1] | [0, 1],
    },
  ],
}
```

### 5.1 不存入 state 的派生值

- 角速度与方向；
- `starIndex`、active star 与星位置；
- 双方分数、领先方、共享捕获数与赢家；
- CSS 像素坐标、轨迹、视觉切轨进度；
- 当前状态文案、结果文案和按钮可用性；
- RAF timestamp、accumulator、Pointer/Keyboard 按下状态。

### 5.2 不变量

1. state 递归冻结；角度规范在 `[0, TAU)`；
2. players 固定两项，lane 只能为 `0..2`，cooldown 不超过 `SHIFT_COOLDOWN_STEPS`；
3. playerNames 固定两个合法且不同的清洗后名字，重开时保留；
4. claims 的 `starIndex` 必须从 0 连续递增且不重复；
5. claim stepCount 严格递增且不大于 state.stepCount；
6. winners 只能是 `[0]`、`[1]` 或 `[0, 1]`，顺序固定；
7. 分数只能从 claims 计数：共享 claim 给双方各一分；
8. intro 必须 `seed=0`、`stepCount=0`、`claims=[]`、中轨起始位置；
9. preview 必须 `seed>0`、`previewSteps=1..PREVIEW_STEPS`；
10. live 必须 `seed>0` 且 `previewSteps=0`；
11. finished 必须 `previewSteps=0`，至少一方达到 TARGET_SCORE 且双方分数不等；
12. preview / live 中不得已经满足 finished 条件；
13. 所有公开 reducer 遇到畸形 state 都安全回到新的 intro；合法 state 的非法动作返回同一引用。

## 6. Reducer API

逻辑模块至少导出：

```js
createGameState(rawConfig?)
sanitizeConfig(rawConfig?)
startGame(state, seed)
shiftOrbit(state, playerIndex, direction)
stepGame(state)
restartGame(state, seed)
deriveStar(seed, starIndex)
deriveScores(state)
getViewModel(state)
resolveResultCopy(state, config?)
normalizeAngle(angle)
shortestAngleDifference(target, current)
angularSpeedForLane(lane)
replaySession({ seed, shifts, totalSteps, config })
```

### 6.1 `startGame`

- 仅 intro 接受；seed 非法时返回同一 state；
- 进入 preview，previewSteps=96；
- 两位玩家仍在中轨与起始角；claims 为空；revision 加一。

### 6.2 `shiftOrbit`

- 只在 preview / live 接受；
- `playerIndex` 只能为 0 / 1，`direction` 只能为 `-1 / 1`；
- cooldown 大于 0、目标越界、finished / intro 或非法输入都返回同一引用；
- 合法动作把 lane 加 direction，并把 cooldownSteps 设为 30；
- 不修改 angle、stepCount、claims、previewSteps 或另一位玩家；
- 键盘/触控层负责忽略 key repeat，逻辑仍以 cooldown 作为最终 Gate。

### 6.3 `stepGame`

每次调用只推进一个 `FIXED_DT`：

1. 两位 angle 加上 `direction × angularSpeedForLane(lane) × FIXED_DT` 并规范化；
2. 两位 cooldownSteps 各自减一，不低于 0；
3. stepCount 加一；
4. preview 只递减 previewSteps；减到 0 时进入 live，本步不执行捕获；
5. live 派生当前星，计算双方最短角距离；不同轨道视为不可命中；
6. 无人命中则保持 live；
7. 一人命中则追加单 winner claim；
8. 两人命中时比较距离；差值大于 epsilon 时只给更近者，否则追加 `[0, 1]`；
9. 追加 claim 后派生分数；若至少一方达到 5 且比分不等，进入 finished；否则进入下一颗星的 preview；
10. finished 后调用保持同一引用。

捕获发生在本步角更新后；测试、文案与浏览器验收都以这个顺序为准。

### 6.4 `restartGame`

- 只在 finished 接受合法非零 seed；
- 直接进入新一局 preview，不经过 intro；
- players 回到中轨起始角，stepCount、claims 清零；
- 保留 state 中已经清洗的 playerNames；
- revision 加一，用于 UI 作废上一局异步焦点/庆祝任务。

### 6.5 `replaySession`

输入：

```js
{
  seed,
  totalSteps,
  shifts: [{ step, playerIndex, direction }],
  config,
}
```

- step 从 0 开始，先应用该 step 的 shifts，再执行一次 stepGame；
- shifts 必须按 step 非递减，字段严格且不能含额外键；
- 同一步多项动作按数组顺序执行，但 cooldown 保证同一玩家最多一个生效；
- 非法日志抛出 TypeError / RangeError，不静默篡改；
- 输出与实时 reducer 路径完全相同的冻结 state；
- 用于测试与未来调试，不在首版 UI 暴露回放入口。

## 7. 捕获几何

对玩家 `p`：

```text
eligible = p.lane === star.lane
distance = abs(shortestAngleDifference(star.angle, p.angle))
captured = eligible && distance <= CAPTURE_ANGLE
```

同时命中：

```text
if abs(distance0 - distance1) <= SHARED_EPSILON:
  winners = [0, 1]
else:
  winners = [distance0 < distance1 ? 0 : 1]
```

不得使用 DOM 碰撞盒、sprite 像素边缘、CSS transform 的读回值或事件回调先后来裁决。

## 8. View model

`getViewModel(state)` 返回递归冻结的新对象：

```js
{
  phase,
  stepCount,
  revision,
  playerNames,
  players: [{ angle, lane, direction, cooldownRatio, score, canRise, canDrop }],
  star: { id, index, lane, sector, angle, status: "preview" | "live" } | null,
  scores: [number, number],
  sharedClaims,
  targetScore: 5,
  leaderIndex: 0 | 1 | null,
  winnerIndex: 0 | 1 | null,
  result: { winnerIndex, sharedClaims } | null,
  status: {
    title,
    body,
    remainingPreviewSteps,
  },
}
```

- intro 的 star 为 null；finished 保留最后一个已捕获星的结果摘要，但不显示可捕获 active star；
- canRise / canDrop 同时考虑边界、phase 与 cooldown；
- UI 不自行推断 winner、score、文案或按钮可用性；
- 每次调用返回新数组/对象，不共享 state 或 config 引用；
- `resolveResultCopy(state, config)` 只在 finished 返回 `{ title, body }`，使用 state 中的 playerNames 与 claims 派生冻结 formatter 上下文；异常或非法结果安全回默认文案。

## 9. 默认文案

### 9.1 首屏允许文案

- H1：`这一颗我先到`；
- 规则：`只管升轨和降轨。内轨更快，先碰到五颗星的人赢。`；
- 玩家：`朱方`、`蓝方`；
- 键位：`W / S`、`↑ / ↓`；
- 状态：`两颗卫星已经就位`、`看准星轨，再一起出发。`；
- 主动作：`开始抢星`；
- 导航仅保留无文字返回箭头。

不添加 A 级徽章、英文副标题、教程卡、速度数字、物理公式、设置、难度、音量或假指标。

### 9.2 动态文案

- preview：`第 N 颗星正在亮起` / `先看清它在哪条轨道。`；
- live：`第 N 颗星可以争了` / `内轨更快，外轨更稳。`；
- 单人捕获：`{name}先碰到了` / `比分 X 比 Y，下一颗正在亮起。`；
- 共享捕获：`这一颗同时到达` / `两边都加一分，继续。`；
- 领先但未结束：比分明确，不使用“碾压”“失败”或关系评价；
- 终局胜者：`{winner}抢先一步` / `{winner} X 颗，{other} Y 颗。今晚的星轨先记这一局。`；
- 重开动作：`再绕一圈`。

## 10. DOM 与可访问性

建议结构：

```text
main.orbit-shell
├── nav.topbar
│   └── a.back-link
├── section.score-rail
│   ├── article.player-summary[player=0]
│   ├── div.match-status[aria-live=polite]
│   └── article.player-summary[player=1]
├── section.game-layout
│   ├── section.story-panel
│   │   ├── h1
│   │   ├── p.rule-copy
│   │   ├── div.dynamic-status
│   │   └── div.action-stage
│   └── section.orbit-stage[aria-label]
│       ├── img.space-background[alt=""]
│       ├── div.orbit-rings[aria-hidden=true]
│       ├── img.star-target
│       ├── img.satellite[player=0]
│       ├── img.satellite[player=1]
│       └── p.stage-description.visually-hidden
├── section.controls[aria-label="双方轨道控制"]
│   ├── fieldset.player-controls[player=0]
│   │   ├── button 升轨
│   │   └── button 降轨
│   └── fieldset.player-controls[player=1]
│       ├── button 升轨
│       └── button 降轨
└── p.live-region[aria-live=polite]
```

要求：

- 所有动作使用原生 link/button/fieldset/legend，不伪造 slider；
- 四个控制按钮至少 48px 高，disabled 与 cooldown 都可读；
- 舞台提供持续更新但节流的隐藏说明，例如“朱方在内轨三点方向，蓝方在外轨九点方向，目标在中轨十二点方向”；
- 每次切轨只播报玩家名与新轨道，不逐帧播报角度；
- preview → live、claim、finished 更新 live region；
- 开始后焦点落到朱方“降轨”，终局聚焦结果标题，重开后再次落到朱方合法控制；
- 颜色之外同时使用“朱 / 蓝”、名字、方向与比分；
- 卫星和星体图片是装饰/状态投影，规则信息必须在文本语义中等价表达。

## 11. App 时间与输入契约

```js
const MAX_FRAME_DELTA = 0.1;
const MAX_STEPS_PER_FRAME = 12;
```

- RAF delta 钳制到 0.1 秒；每帧最多执行 12 个固定步；
- `visibilitychange` hidden、window blur 与 pagehide 都清空 accumulator 和 lastTimestamp；
- 页面回来后等待新 timestamp，不补算离开时间；
- keydown 仅在 preview / live 拦截 `W/S/ArrowUp/ArrowDown`；
- `event.repeat` 为 true 时不 dispatch shift；输入框不存在；
- touch/click 与 keyboard 共用 `shiftOrbit`；
- UI render 只从 view model 更新 DOM，不从 CSS animationend 或 setTimeout 推进规则；
- preview 的 0.8 秒、cooldown 和捕获全部由 step 数决定。

## 12. 视觉方向约束

视觉概念阶段必须生成桌面进行态、手机进行态和桌面终局三张完整界面：

- 主意象：午夜天文台中的一张大型发光轨道盘，而不是通用太空射击 HUD；
- 构图：桌面左侧标题/状态，右侧单一大圆轨；比分是一条开放横向 rail，不做卡片网格；
- 色彩：墨黑蓝背景、低亮星尘、朱红卫星、钴蓝卫星、暖金目标星；
- 字体：中文标题使用本机 serif，状态和控制使用克制 sans；
- 轨道是细铜线/刻度，目标星和卫星使用本地生成的无字透明资产；
- 不添加玻璃拟态卡片、霓虹渐变按钮、胶囊标签、英文 telemetry、假雷达、复杂设置或装饰仪表；
- 生产背景、卫星和星体必须独立生成并有无图回退；所有文字、分数、按钮、轨道位置与命中区保持代码原生。

响应式：

- ≥980px：左文右盘，轨道盘占主视觉；控制组在底部两侧与玩家对齐；
- 390×844：标题、比分、轨道盘、状态、双控制组均在单页或极短自然滚动内；
- 320×700：轨道盘不低于 286px，四个按钮仍至少 48px，无水平滚动；
- 低高度桌面优先缩小外边距与标题，不缩到无法辨识卫星；
- reduced motion 关闭星闪、拖尾、claim 爆发和 lane transition；逻辑轨道位置仍按固定步更新。

## 13. 目录与边界测试

需要新增/更新：

- `experiences/versus/orbit-star-race/` 完整作品目录；
- `experiences/catalog.json` A / versus 条目；
- 根 `index.html` 对抗卡；
- 根 `README.md`、`experiences/versus/README.md`、`docs/README.md`；
- `shared/runtime/catalog.test.js` 的入口与边界测试；
- 作品 `README.md` 与 `assets/ATTRIBUTION.md` 固定来源和零复制声明。

静态 Gate：

- 经典相对脚本，无 `type="module"`、远程 URL、fetch、XHR、WebSocket、storage、Service Worker、Worker 或 WASM；
- 不依赖 shared JS；完整作品目录可单独复制运行；
- 运行素材全部为相对路径，并提供纯 CSS/DOM 无图回退；
- HTML 不硬编码 seed、星流、赢家、比分或最终 formatter 文案；
- app 不调用 `Math.random`；seed 只从 crypto 或固定 fallback 进入 start/restart；
- 归属声明包含 NASA/JPL、四个固定开源提交、ImageGen 资产和零复制边界。

## 14. 测试矩阵

### 14.1 纯逻辑

1. 常量、三层速度单调性、角度规范与最短角差；
2. 配置白名单、Unicode 清洗、整份回退、formatter 冻结与异常回退；
3. 同 seed 星流稳定，每三颗覆盖三条轨道，十二扇区合法；
4. intro、start、非法 seed、state 递归冻结与引用隔离；
5. 合法升降轨、边界、cooldown、非法玩家/方向与 repeat 终审；
6. 120 步角运动与方向相反，内/中/外速度准确；
7. preview 96 步不捕获，第 97 个固定步才允许 live 捕获；
8. 只有朱方、只有蓝方、同一步不同距离与 epsilon 共享捕获；
9. claim 连续索引、递增 step、分数派生与下一颗 preview；
10. 先到 5 的普通终局、5–5 共享加赛、6–5 加赛终局；
11. finished 幂等、restart 新 seed、revision、清盘与起点；
12. 畸形 phase/seed/player/claim/preview/finished 安全回 intro；
13. 同 seed + shift log 在不同 RAF 分组下得到完全相同 state；
14. view model 不共享 state/config 引用，文案与 canRise/canDrop 正确。

### 14.2 浏览器实玩

1. 直接 `file://` 打开，所有本地资源成功，控制台 0 error / warning；
2. intro 控制禁用；开始后焦点、preview 文案和 0.8 秒 Gate 正确；
3. 朱方 W/S、蓝方方向键和四个触控按钮分别只移动自己一层；
4. repeat 与 cooldown 不能连续跨层；
5. 真实等待/切轨完成单人捕获与共享捕获；
6. 实际得到 5 分进入唯一终局、结果聚焦、按钮与键盘不再改状态；
7. 重开使用新 seed、清空 claim 与比分并回起点；
8. hidden / blur 后返回无角度大跳、无粘键；
9. 背景、两颗卫星、目标星分别加载失败时，CSS/DOM 回退仍可辨识并完成比赛；
10. reduced motion 下规则轨迹一致，装饰 motion 接近 0；
11. 1504×1046、390×844、320×700 无横向溢出，按钮至少 48px；
12. concept 与最终截图在同一 QA 中 `view_image`，完成至少八项 fidelity ledger 与首屏文案 diff。

## 15. 完成提交边界

1. 调研独立提交；
2. 本规格独立提交；
3. 视觉概念、设计提取与生成资产独立提交；
4. 纯逻辑与测试独立提交；
5. UI、目录、README、归属声明与静态 Gate 独立提交；
6. 每个真实 bug 独立或随对应修复提交，并记录复现与解决；
7. 浏览器验收、运行截图与保真账本独立提交；
8. 通用固定步/seed/共享裁决知识写入 `learn/` 并独立提交。
