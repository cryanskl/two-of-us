# A 级“把影子，跳成我们”可执行规格

规格日期：2026-07-21

对应调研：`docs/171-shadow-duet-research.md`

目标目录：`experiences/co-op/shadow-duet/`

## 1. 完成定义

本作是一份双击 `index.html` 即可完整游玩的同机双人合作定格舞。左右两席各从四个姿势中持续选择，在公开定格窗内共同保持目标姿势对 6 个规则 tick；六幕都留下合照后共同完成。

只有同时满足以下条件才算完成：

- 四姿势、六幕目标、30Hz 规则时钟、定格窗 `[48,61]` 与 6 tick 稳定条件完全固定；
- 每幕成功都严格依赖左右席正确姿势，任一席缺席不能推进；
- 多键持有、释放回退、键盘 repeat、触控取消、失焦、隐藏和后台恢复都有确定语义；
- 纯规则层可在浏览器经典脚本与 CommonJS 中使用，页面不复制规则常量或判定；
- `file://` 下无网络、服务端、构建、存储、随机、音频、摄像头、模型或第三方运行依赖；
- 键盘、鼠标、双触点、屏幕阅读器、四档响应式和图片阻断均通过；
- 借鉴声明、测试、bug 记录、学习记录、目录入口和浏览器证据齐全。

## 2. 文件边界

| 文件 | 唯一职责 |
| --- | --- |
| `index.html` | 稳定语义结构、首屏文案、无脚本说明与经典脚本顺序 |
| `style.css` | 纸幕剧场视觉、剪影姿势、四档布局、焦点、降动效与高对比 |
| `logic.js` | 冻结姿势/六幕、持有栈、tick 结算、状态机、配置边界和公共视图 |
| `config.js` | 两席称呼与 5–10 行完成赠言函数；不能改规则 |
| `app.js` | DOM 渲染、固定步进循环、键盘/Pointer 生命周期、焦点与 ARIA |
| `logic.test.js` | 纯逻辑、重放、敌对输入和静态边界测试 |
| `README.md` | 本地打开、玩法、信任/隐私边界、定制、借鉴声明、测试 |
| `ATTRIBUTION.md` | 固定来源、许可证、版权、零复制范围与生成资产证据 |
| `assets/*` | 原创生成式背景和剪影图集；失败时不影响规则可读性 |

加载顺序必须是 `logic.js → config.js → app.js`。禁止 ES module、`fetch()`、Worker、CDN、远程字体、远程媒体和运行时包。

## 3. 冻结规则常量

### 3.1 席位与姿势

```js
SEATS = ["left", "right"];

POSES = [
  { id: "high", label: "举高", leftCode: "KeyW", rightCode: "ArrowUp" },
  { id: "wide", label: "展开", leftCode: "KeyA", rightCode: "ArrowRight" },
  { id: "low",  label: "低身", leftCode: "KeyS", rightCode: "ArrowDown" },
  { id: "near", label: "向内", leftCode: "KeyD", rightCode: "ArrowLeft" }
];
```

对象顺序和 ID 是稳定序列化合同。左席只接受 `leftCode`，右席只接受 `rightCode`；逻辑动作使用 pose ID，不接收浏览器 code。

### 3.2 六幕

```js
SCENES = [
  { id: "open-wings",  title: "开幕·展翼", leftPose: "wide", rightPose: "wide" },
  { id: "little-roof", title: "屋檐·相接", leftPose: "near", rightPose: "near" },
  { id: "moon-left",   title: "月钩·左起", leftPose: "high", rightPose: "low" },
  { id: "moon-right",  title: "月钩·右起", leftPose: "low", rightPose: "high" },
  { id: "offer-hand",  title: "窗边·递手", leftPose: "wide", rightPose: "near" },
  { id: "swap-hand",   title: "谢幕·换手", leftPose: "near", rightPose: "wide" }
];
```

每席姿势计数必须为 `wide:2 / near:2 / high:1 / low:1`；六个姿势对唯一；所有目标左右姿势都非空。

### 3.3 时钟

```js
TICK_RATE = 30;
WINDOW_START_TICK = 48;
WINDOW_END_TICK = 61;
REQUIRED_STABLE_TICKS = 6;
MAX_STEP_TICKS = 5;
```

定格窗为闭区间 `[48,61]`。逻辑层不接收毫秒、时间戳或帧率，只接收 `STEP.ticks` 的安全整数 `1..5`。

### 3.4 加载时自检

模块初始化必须验证：

- 席位、姿势和幕对象均为规定精确字段、普通原型、唯一非空 ID；
- 键位 code 在八个控制中唯一，姿势引用都存在；
- 六个目标对唯一且左右非空；
- 每席四姿势覆盖计数为 `2/2/1/1`；
- tick 值为正安全整数，窗口至少能容纳稳定长度；
- 最早成功 tick 为 53，最晚起始 tick 为 56，tick 57 才开始无法成功。

常量、对象、数组与导出 API 全部递归冻结。

## 4. 纯规则 API

浏览器暴露冻结的 `window.ShadowDuetLogic`，CommonJS 暴露同一对象：

```js
{
  SEATS, POSES, SCENES, TICK_RATE, WINDOW_START_TICK,
  WINDOW_END_TICK, REQUIRED_STABLE_TICKS, MAX_STEP_TICKS,
  DEFAULT_CONFIG, normalizeConfig, resolveCompletionNote,
  createInitialState, reduce, getPublicView
}
```

所有返回数组和对象递归冻结，与输入和内部状态断开引用；不得返回 DOM、Promise、计时器、内部缓存或带污染原型的对象。非法 action 是同对象 no-op；非法 state 传入 `reduce()` 时回到全新合法初态；`getPublicView()` 遇到非法 state 时返回初态的安全视图，遇到非法 config 时使用整份默认配置，全程不得抛异常。

所有公开入口都必须先通过 own property descriptor 做一次性快照，再基于快照校验和计算；不得先验证后再次读取原对象。顶层或嵌套 Proxy 的 `ownKeys / getOwnPropertyDescriptor / getPrototypeOf` 抛错、accessor、数组子类、自定义原型、继承 iterator/map 和读取阶段变化都按非法输入处理。

## 5. 权威状态

合法状态只有精确字段：

```js
{
  phase,
  sceneIndex,
  tick,
  heldPoses: { left: [], right: [] },
  stableTicks,
  attempt,
  completedScenes,
  lastResult,
  revision
}
```

每项完成记录只有：

```js
{
  sceneId,
  leftPose,
  rightPose,
  attempts
}
```

`lastResult` 为 `null` 或以下精确对象之一：

```js
{ status: "captured", sceneId, tick }
{ status: "missed", sceneId, leftPose, rightPose }
```

其中 `leftPose/rightPose` 可为 `null` 或合法 pose ID，记录窗口结束时的当前姿势。

全局公共不变量：

- `phase` 只属于七阶段；`sceneIndex` 为 `0..5`；
- 每席持有数组只含唯一合法 pose ID，长度 `0..4`，且必须是原生 `Array.prototype` 的 own data property；最后一项是当前姿势；
- `completedScenes` 是 `SCENES` 从 0 开始的连续前缀，每条记录姿势与目标完全一致，`attempts` 为正安全整数；
- `completedScenes` 中 `attempts` 的累计和始终为安全整数；六幕终局 summary 的 `totalAttempts` 直接使用该精确和；
- `attempt` 为 `1..Number.MAX_SAFE_INTEGER`；revision 为 `0..Number.MAX_SAFE_INTEGER`；
- 每次有效动作 revision 加一；非法动作保持原对象与 revision；revision 或 attempt 溢出时 no-op。

逐阶段精确不变量：

| phase | `sceneIndex / completedScenes` | tick | held | stable | attempt | lastResult |
| --- | --- | ---: | --- | ---: | ---: | --- |
| `intro` | `0 / 0项` | 0 | 两席空 | 0 | 1 | `null` |
| `scene-intro` | `index === length`，长度 0..5 | 0 | 两席空 | 0 | 正安全整数 | `null` |
| `dancing` | `index === length`，长度 0..5 | 0..61 | 各 0..4 | 0..5 | 正安全整数 | `null` |
| `missed` | `index === length`，长度 0..5 | 62 | 两席空 | 0 | 正安全整数 | 当前幕 `missed` |
| `pose-result` | `index === length - 1`，长度 1..6 | 53..61 | 两席空 | 6 | 等于末条记录 attempts | 末条记录对应的 `captured` |
| `act-result` | `5 / 6项` | 0 | 两席空 | 0 | 1 | `null` |
| `complete` | `5 / 6项` | 0 | 两席空 | 0 | 1 | `null` |

`dancing` 的附加可达性约束：tick `< 48` 时 stable 必为 0；stable `> 0` 时 tick 必在 `48..61`、两席当前姿势必须匹配目标，且 `stableTicks <= Math.min(5, tick - 47)`。`missed.lastResult.sceneId` 必须是当前幕，姿势字段为 tick 61 最后一次窗口结算时的合法姿势或 `null`。`pose-result.lastResult` 的 sceneId/tick 必须与最后完成记录、当前幕和 state.tick 一致。

初态固定：

```js
{
  phase: "intro",
  sceneIndex: 0,
  tick: 0,
  heldPoses: { left: [], right: [] },
  stableTicks: 0,
  attempt: 1,
  completedScenes: [],
  lastResult: null,
  revision: 0
}
```

## 6. 持有栈契约

仅 `dancing` 且 `tick <= 60` 接受姿势动作；tick 61 已完成最后一次窗口结算，姿势冻结到 tick 62 的失败结算：

- `PRESS { seat, pose }`：若 pose 尚未在该席数组中，将其追加；若已存在则 no-op；
- `RELEASE { seat, pose }`：若存在则从数组中移除，其余顺序保持；不存在则 no-op；
- 当前姿势是数组最后一项；数组为空则为 `null`；
- `PRESS left/high → PRESS left/near → RELEASE left/near` 后当前姿势回到 `high`；
- `PRESS left/high → PRESS left/near → RELEASE left/high` 后当前姿势仍为 `near`；
- 一席不能修改另一席；非法 seat/pose、多余字段、数组 action、Proxy 读取异常、继承字段或未知动作不能改变状态；
- reducer 不信任 UI 的 repeat 过滤，重复 `PRESS` 自身也必须 no-op。

`SUSPEND` 是规则动作，不是直接修改 state：它清空两席持有、tick、stableTicks 和 lastResult，回到同一幕 `scene-intro`，不增加 attempt、不移除完成记录。

## 7. 单 tick 结算顺序

`STEP { ticks }` 必须逐 tick 处理，不能把 `ticks` 直接加到末尾后一次结算：

1. `tick += 1`；
2. 若新 tick 在 `[48,61]`，读取两席持有数组最后一项；
3. 两者都匹配当前幕目标，则 `stableTicks += 1`，否则归零；
4. 若 `stableTicks === 6`，原子追加完成记录，清空持有，进入 `pose-result`，停止处理本 action 剩余 tick；
5. 若新 tick `=== 62` 且尚未成功，记录 tick 61 后冻结的窗口末姿势，清空持有，stableTicks 归零，进入 `missed`；
6. `0..47` 的错误姿势不算失败，也不累计稳定；窗口内修正后仍可成功。

边界必须测试：

- tick 48–53 连续正确，在 53 成功；
- tick 55 错、56–61 连续正确，在 61 成功；
- tick 56–60 正确、61 错，stable 清零并在 62 失败；
- tick 57–61 连续正确只有 5，推进到 62 失败；
- tick 61 结算后到 tick 62 之前的 `PRESS/RELEASE` 是 no-op，missed 仍记录 tick 61 的窗口末姿势；
- `STEP {ticks:5}` 内第 2 个子 tick 成功后，不得继续推进或产生第二条记录；
- 在窗口中换到错误姿势再换回，必须重新连续保持 6 tick。

## 8. 动作闭包与七阶段

动作必须是普通对象、精确字段、无多余 key：

| 当前阶段 | 动作 | 前置 | 成功后 |
| --- | --- | --- | --- |
| `intro` | `{type:"START"}` | 无 | `scene-intro` |
| `scene-intro` | `{type:"BEGIN_SCENE"}` | 当前幕未完成 | `dancing`，tick 归 0 |
| `dancing` | `{type:"PRESS", seat, pose}` | tick ≤60、合法且未持有 | 追加持有，留在本阶段 |
| `dancing` | `{type:"RELEASE", seat, pose}` | tick ≤60、合法且已持有 | 移除持有，留在本阶段 |
| `dancing` | `{type:"STEP", ticks}` | `ticks` 为 1..5 | 逐 tick 推进，可能进入 `pose-result/missed` |
| `dancing` | `{type:"SUSPEND"}` | 无 | 清输入并回 `scene-intro`，attempt 不变 |
| `missed` | `{type:"RETRY_SCENE"}` | attempt 未到上限 | attempt + 1，清结果，回 `scene-intro` |
| `pose-result` | `{type:"NEXT_SCENE"}` | 已完成 1..5 幕 | sceneIndex + 1，tick/stable 归 0，attempt 归 1，清 lastResult，进 `scene-intro` |
| `pose-result` | `{type:"NEXT_SCENE"}` | 已完成 6 幕 | tick/stable 归 0，attempt 归 1，清 lastResult，进 `act-result` |
| `act-result` | `{type:"FINISH"}` | 六幕记录完整 | `complete` |
| `complete` | `{type:"RESTART"}` | 无 | 全新初态，revision 为旧值 + 1 |

revision 或 attempt 再加一会越过安全整数时动作无效。`RESTART` 不保留名字以外的本局数据；名字来自配置而非 state。

## 9. 公共视图与完成摘要

`getPublicView(state, config)` 是页面唯一可依赖的规则视图，返回：

```js
{
  phase, sceneIndex, sceneCount, currentScene,
  tick, windowStartTick, windowEndTick, requiredStableTicks,
  heldPoses, activePoses, stableTicks, attempt,
  completedScenes, completedCount, lastResult,
  seats, poses, isComplete, summary, revision
}
```

`currentScene`、`poses`、`heldPoses`、记录与 summary 都是冻结安全副本，不与常量/state/config 共享可变引用。

完成 summary 仅在 `act-result/complete` 非空：

```js
{
  seats: [leftName, rightName],
  sceneCount: 6,
  totalAttempts,
  retries: totalAttempts - 6,
  captures: ["开幕·展翼", "屋檐·相接", "月钩·左起", "月钩·右起", "窗边·递手", "谢幕·换手"]
}
```

不公开个人分数、各席失误数、精度、平均 tick、评级、赢家或健康推断。

## 10. 配置与学习钩子

`config.js` 固定形状：

```js
window.SHADOW_DUET_CONFIG = {
  seats: ["你", "TA"],
  composeCompletionNote(summary) {
    return `${summary.seats[0]}和${summary.seats[1]}，六次定格以后，影子也记住了我们。`;
  }
};
```

- `normalizeConfig(raw)` 对席位名去首尾 Unicode 空白，长度各 1–12 个字素，二者不得相同；
- composer 必须是函数，否则整份原子回退到默认配置；
- 归一化结果递归冻结，但不提前调用用户函数；
- `resolveCompletionNote(composer, summary)` 用冻结、断开引用的 summary 调用 composer；
- composer 抛错、返回 thenable/非字符串、空白或超过 120 个字素时回退默认结语；
- 返回值只作为 `textContent`，不得作为 HTML、选择器、URL、样式或资源路径；
- 配置不能覆盖姿势、键位、六幕、tick、完成条件、素材、安全文案或作品分类。

这段 5–10 行 composer 是给仓库主人留下的学习贡献点；不修改也必须能完整游玩。

## 11. 页面与 DOM 合约

页面至少包含：

- 一个 `main`、作品标题、短规则和无脚本提示；
- 当前幕编号/标题、两席目标姿势文本、`已定格 x/6` 和当前尝试；
- 一个具名舞台区域；背景、拍灯和人物剪影均不承担唯一语义；
- 两个始终存在的席位控制区，每席四个原生 `button`，姿势名与键位可见；
- 当前姿势、定格窗和稳定计数的文本状态；
- `aria-live="polite"`，以及有序的六幕共同记录；
- 每阶段最多一个 `.primary-action` 可见且可聚焦。

固定主文案：

| 场景 | 文案 |
| --- | --- |
| intro | `四个姿势，两道影子。看准目标，在亮起的这一拍一起定格。` |
| scene-intro | `第 {n} 幕：{title}。左边做“{left}”，右边做“{right}”。` |
| dancing 准备 | `先试动作。拍灯亮起时，把正确姿势留住六小拍。` |
| dancing 窗口 | `定格窗亮了——一起把姿势留住。` |
| pose-result | `这一幕接住了。` |
| missed | `影子还没在同一拍站稳，再排这一幕。` |
| act-result | `六道影子，刚好跳成一支舞。` |
| complete | `幕布落下，合照留在这里。` |

失败文案可以说哪一席为空或姿势未对，但目标本来公开，不存在答案泄漏；措辞不得责怪某个人、比较快慢或显示个人失败次数。

## 12. 浏览器计时与生命周期

应用层使用单一 `requestAnimationFrame` 循环：

- 只在 `dancing` 且页面可见、窗口活跃时累积；
- 每 tick 时长为 `1000 / 30` ms，使用 accumulator 转换为 `STEP`；
- 单帧最多派发 `STEP {ticks:5}`，超出部分丢弃并重置基准，禁止追赶风暴；
- 首次帧、切回标签、resize 和 resume 只重置时间基准；
- `blur`、`visibilitychange(hidden)`、`pagehide` 派发一次 `SUSPEND`，清所有 DOM pressed/pointer 映射；
- `prefers-reduced-motion` 只减少 CSS 位移、闪动和过渡，不改变 30Hz 规则时钟或窗口；
- 页面不得用 CSS `animationend`、音频、图片帧、`Date.now()` 或 DOM 坐标裁决。

## 13. 键盘、Pointer 与焦点

键盘：

- 使用 `KeyboardEvent.code` 的八个固定键；`keydown` 派发 `PRESS`，`keyup` 派发 `RELEASE`；
- repeat、Ctrl/Meta/Alt、IME composing 和 editable target 不进入全局玩法；
- 仅在 `dancing` 且事件属于玩法键时 `preventDefault()`；方向键在其他阶段仍可滚动；
- Escape 在 `dancing` 派发 `SUSPEND`，其余阶段不抢占；
- 进入 `scene-intro` 聚焦标题，开始后聚焦舞台说明；成功/失败聚焦结果标题，完成聚焦完成标题。

Pointer：

- 每个姿势 button 的 `pointerdown` 仅接受 primary button，并调用 `setPointerCapture`；
- 每个 pointer ID 绑定一个席位/姿势，`pointerup/cancel/lostpointercapture` 只释放自身；
- 同一席第二个 pointer 可按另一姿势，规则持有栈决定当前项；
- click 不重复派发；不依赖 hover、拖动距离、压力、双击或长按计时；
- 每个姿势按钮最小 `44×44px`，主动作最小高度 `48px`。

## 14. 可访问性

- 目标姿势和当前姿势始终有中文文本，剪影图片对读屏隐藏；
- 两席控制使用 `fieldset/legend` 或等价分组语义，按钮用 `aria-pressed` 表示持有；
- 定格进度用文本 `稳定 x/6`，拍灯颜色与移动不是唯一信息；
- 六幕日志读出“第 n 幕、目标名、共同完成、尝试次数”；
- live region 只播开始定格窗、成功、失败、暂停、换幕和完成，不逐 tick 播报；
- `:focus-visible` 高对比且不被 overflow 裁切；
- forced-colors 下用系统色、边框、虚实线与文字保留两席/窗口状态；
- DOM 与视觉顺序一致，200% zoom 仍可完成；
- 图片阻断后保留 CSS 轮廓、目标文本、控制和完整规则。

## 15. 视觉与响应式 Gate

视觉冻结为“午夜背光纸幕剧场”：靛蓝幕边、琥珀背光、粉灰纸纤维、深墨人物剪影、少量胶片齿孔和场记标签。不得退回霓虹四轨音游、玻璃卡片仪表盘、写实人物照片、摄像头取景框或仓库已有的黄铜同心圆/墨蓝星盘。

| 视口 | 必须通过 |
| --- | --- |
| 1504×1046 | 无横纵滚动；标题、目标、完整舞台、两席四键和主动作同屏 |
| 1280×800 | 无横向滚动；舞台 ≥500px；目标、两席当前姿势和可见主动作同屏 |
| 390×844 | 内容约 366px；舞台完整不裁切；八个按钮均 ≥44px；允许必要纵滚 |
| 320×568 | 内容约 296–304px；零横向溢出；舞台 ≥296px；姿势名不可只剩图标 |

每档还验证 200% zoom、图片阻断、reduced-motion、forced-colors、文本截断、焦点环、双触点和八个按钮中心的 `elementFromPoint()` 命中归属。

## 16. 借鉴与资产声明

`README.md` 与 `ATTRIBUTION.md` 必须显式写明：

- 本作规则、六幕、数值、状态机、代码、HTML、CSS、中文文案与视觉资产独立实现；
- Bemuse、osu!、PixiJS 与 MediaPipe 只用于研究通用机制或排除边界，不是运行依赖；
- 固定 commit、许可证、版权主体、可借鉴点和未复制范围与 `docs/171-shadow-duet-research.md` 一致；
- 不复制或打包源码、算法表达、判定参数、谱面、模型、WASM、landmark、素材、音频、字体、品牌、界面或测试；
- ImageGen 资产逐项记录用途、提示词、生成日期、尺寸、格式、SHA-256 和第三方输入“无”；
- 运行图不得包含文字、键帽、Logo、水印、规则答案或第三方角色。

## 17. 测试矩阵

逻辑测试：

- 常量精确值、递归冻结、加载自检、浏览器/CommonJS 同构；
- 六幕姿势覆盖/唯一性、窗口长度与最早/最晚成功数学边界；
- PRESS 去重、RELEASE 回退、跨席隔离、四键全持有、全释放；
- tick 48/53/56/57/61/62 边界、窗口内打断、批量 STEP 中途停止；
- 七阶段金路径、每幕失败/重试、暂停不增 attempt、六幕/重开；
- 两席缺一不可，单席穷举永远不能完成任一幕；
- action schema、原型污染、数组子类/null/custom prototype、accessor、畸形 state、安全整数上界；
- `completedScenes/heldPoses` 的继承 iterator/map 抛错；顶层/嵌套 Proxy 的 `ownKeys/getOwnPropertyDescriptor/getPrototypeOf` 抛错；descriptor 校验后 `get` late-throw；
- `reduce` 遇非法 state 回全新初态；`getPublicView` 遇非法 state 返回初态安全视图、非法 config 原子回默认，以上路径全部不抛；
- JSON action log 从初态重放到字节等价公共完成视图；
- 配置原子回退、Unicode 字素、重复名、composer 异常/thenable/超长/summary 篡改；
- 公共 view 无内部引用、无个人失误/分数/未来输入泄漏；
- 生产逻辑无网络、存储、随机、Date、DOM、音频、相机、模型和 runtime hook。

浏览器验收：

- `file://` 从 intro 完成六幕、至少一次失败/重试、act-result、complete 和重开；
- 纯键盘与双 pointer 分别完成；多键换姿势和 pointercancel 不 stuck；
- blur/hidden/pagehide 清输入、回说明态且不增加 attempt；
- 焦点、live region、日志、aria-pressed、主动作唯一与 DOM/视觉顺序；
- 四档视口、200% zoom、图片阻断、reduced-motion、forced-colors；
- 八个按钮的 `elementFromPoint()`、零横向溢出、控制台零错误、零失败请求；
- 最新浏览器截图与三张接受概念图逐项走 fidelity ledger；
- 项目逻辑测试、catalog 测试、`npm test` 和 `npm run verify` 全绿。
