# A 级“这一拍，刚好和你”实现规格

> 状态：玩法、配置、状态机、纯逻辑 API、阶段 DOM、音频降级与验收 Gate 冻结。来源和许可证边界见 [`91-four-hands-harmony-research.md`](./91-four-hands-harmony-research.md)。

## 1. 作品定义

“这一拍，刚好和你”是一款两人同机合作的短和声体验。低音席和高音席各看一组四音键，每个小节各按一个可见目标音；两次按下在 200ms 内会合并共同保持 300ms，就收下一枚和弦印记。

- 分类：`co-op`；
- 目录：`experiences/co-op/four-hands-harmony/`；
- 启动等级：A；
- 运行依赖：仓库已有 [`shared/audio/tone-player.js`](../shared/audio/tone-player.js)，缺失或失败时自动无声；
- 支持：`file://` 直接打开与仓库静态服务器；
- 网络、存储、账户、相机、麦克风、定位：均不使用；
- 乐句：五个固定原创双声部和弦，不随机、不计时追拍、不使用第三方曲谱或采样；
- 目标：共同完成五小节并展示一段可编辑的赠予文案，不设胜负、分数、连击、生命或排行榜。

这不是传统钢琴模拟器。界面不承诺真实钢琴音色、复音延音或自由演奏；按键只承担当前目标、共同保持和结果反馈。

## 2. 文件边界

```text
experiences/co-op/four-hands-harmony/
├── index.html
├── styles.css
├── config.js
├── logic.js
├── logic.test.js
├── app.js
├── README.md
├── ATTRIBUTION.md
└── assets/
    ├── harmony-table.webp
    └── favicon.svg
```

- `config.js`：玩家称呼、可编辑完成文案和 5–10 行学习 TODO；
- `logic.js`：音符、原创乐句、清洗、不可变 reducer、视图与重放；
- `app.js`：rAF tick、键盘/Pointer、AudioContext 渐进增强、阶段 DOM、焦点和渲染；
- `logic.test.js`：配置、时窗、保持、松手 Gate、生命周期、视图、重放和畸形输入；
- `ATTRIBUTION.md`：固定来源、许可证、ImageGen 与零复制声明；
- `assets/`：只放本项目原创无字资产；背景缺失时 CSS 纯色/纹理回退必须完整。

所有脚本使用经典 `<script>`，不得使用 module、`fetch()`、XHR、WebSocket、Worker、Service Worker 或浏览器存储。整个作品目录复制到任意相对路径后仍应可运行；唯一允许向上引用的是共享 tone player，缺失时必须由 app 内静音适配器接管。

## 3. 固定音符与原创乐句

```js
LOW_NOTES = [
  { id: "c3", label: "C3", key: "A", code: "KeyA", frequency: 130.81 },
  { id: "f3", label: "F3", key: "S", code: "KeyS", frequency: 174.61 },
  { id: "g3", label: "G3", key: "D", code: "KeyD", frequency: 196.00 },
  { id: "a3", label: "A3", key: "F", code: "KeyF", frequency: 220.00 }
];

HIGH_NOTES = [
  { id: "c5", label: "C5", key: "J", code: "KeyJ", frequency: 523.25 },
  { id: "d5", label: "D5", key: "K", code: "KeyK", frequency: 587.33 },
  { id: "e5", label: "E5", key: "L", code: "KeyL", frequency: 659.25 },
  { id: "g5", label: "G5", key: ";", code: "Semicolon", frequency: 783.99 }
];

PHRASE = [
  { id: "arrival", low: "c3", high: "e5", title: "靠近" },
  { id: "answer",  low: "g3", high: "d5", title: "回应" },
  { id: "turn",    low: "a3", high: "c5", title: "转身" },
  { id: "stay",    low: "f3", high: "d5", title: "停在这里" },
  { id: "home",    low: "c3", high: "g5", title: "回到我们" }
];
```

音符频率、顺序和 5 小节组合是首版固定规则，不接受运行时覆盖。乐句只构成项目原创的五个离散双音事件，不对应或声称复现任何既有音乐作品。

## 4. 配置契约

```js
window.FOUR_HANDS_HARMONY_CONFIG = {
  lowSeatName: "左边的你",
  highSeatName: "右边的你",
  intro: "你接住低音，我接住高音。五次同时落下，就把这一小段合在一起。",
  finalTitle: "这一拍，刚好和你",
  finalMessage: "不是谁跟上谁，是我们愿意在同一刻停下来。",
  signature: "留给我们"
};
```

清洗规则：

- 两个席位称呼各最多 12 个 Unicode code point；空值回退默认；
- intro 最多 72 个、finalTitle 最多 24 个、finalMessage 最多 96 个、signature 最多 24 个；
- 配置只接受字符串，去除首尾空白，不解释 HTML；
- 页面只经 `textContent` 输出配置；
- 清洗结果深拷贝并冻结，调用方后续修改原对象不得污染状态。

`config.js` 必须保留一个有可运行默认值的 5–10 行 `composeHarmonyMessage(view)` TODO。这里是本作唯一有意义的个人化练习：用户可根据 `view.completed` 和两个称呼改写结束文案；不修改时作品仍完整可玩，不能用 TODO 阻塞默认完成态。

## 5. 时间常量与权威状态

```js
TICK_MS = 50;
JOIN_WINDOW_TICKS = 4; // 200ms
HOLD_TICKS = 6;        // 300ms
MAX_FRAME_GAP_MS = 500;
```

```js
{
  phase: "intro" | "playing" | "measure-complete" | "paused" | "complete",
  measureIndex: 0,
  clockTick: 0,
  held: {
    low: null | { noteId, inputId, pressedAtTick },
    high: null | { noteId, inputId, pressedAtTick }
  },
  joinedAtTick: null | 12,
  joinGapTicks: null | 0,
  holdTicks: 0,
  completed: [
    { measureId: "arrival", joinGapTicks: 2, completedAtTick: 18 }
  ],
  feedback: null | "wrong-low" | "wrong-high" | "outside-window" |
    "released-early" | "joined" | "measure-complete",
  pauseReason: null | "manual" | "hidden" | "blur" | "stalled",
  pausedFrom: null | "playing" | "measure-complete",
  revision: 0,
  config: { /* 清洗并冻结 */ }
}
```

不变量：

1. 每个声部同时最多一个活动输入，同一 `inputId` 不能占据两个声部；
2. 低音席不能提交高音，反之亦然；错误音不进入 held；
3. 只有两个当前目标音都按住，且按下差 `<= JOIN_WINDOW_TICKS`，才能建立 join；
4. join 建立后，两个原始 inputId 都仍按住时 hold 才增长；提前松开清空 join 和 hold；
5. hold 达标只追加一次 completed，并进入 measure-complete；
6. measure-complete 必须双方都松开，才进入下一小节；最后一节双松手后才进入 complete；
7. completed 严格等于 PHRASE 的前缀，id 不重复，完成 tick 非递减；
8. paused/complete 不接受 PRESS 或 TICK 推进；
9. revision 只在有效状态变化时递增；非法 action 返回原状态引用；
10. reducer 不读取 DOM、CSS、真实时间、AudioContext 或随机数，不修改输入状态或嵌套对象。

## 6. 纯逻辑 API

`logic.js` 通过浏览器全局 `FOUR_HANDS_HARMONY_LOGIC` 和 CommonJS 暴露：

```js
TICK_MS
JOIN_WINDOW_TICKS
HOLD_TICKS
MAX_FRAME_GAP_MS
LOW_NOTES
HIGH_NOTES
PHRASE
DEFAULT_CONFIG
sanitizeHarmonyConfig(rawConfig)
validateHarmonyPhrase(phrase)
createHarmonyState(rawConfig)
reduceHarmony(state, action)
getHarmonyView(state)
classifyHarmonyKey(code, edge, repeat)
replayHarmony(rawConfig, actions)
```

### 6.1 Action

```text
START
PRESS { voice, noteId, inputId }
RELEASE { inputId }
TICK { ticks }
INTERRUPT { reason }
RESUME
RESTART
```

`ticks` 只接受正整数；其他 action 字段只接受白名单值。未知、畸形、阶段不允许或不会改变状态的动作返回原引用。

### 6.2 开始、按下与会合

- START 只在 intro 有效，进入第一小节 playing；
- PRESS 只在 playing 有效；同 inputId 重复按下、声部已占用、越权声部、未知音和非目标音不占据 held；
- 非目标但属于本声部的音只更新中性 `wrong-low/high` 反馈；
- 第一席正确按下后等待另一席，TICK 只推进 `clockTick`；
- 第二席正确按下时计算绝对 tick 差；`<= 4` 建立 join，`> 4` 反馈 outside-window，双方松开后才能重新尝试；
- join 建立当下 `holdTicks=0`，不会把等待另一席的时间算进保持；
- low→high 和 high→low 对 joinGap、hold 与结果必须交换等价。

### 6.3 TICK 与保持

- 只有 playing 接受 TICK；
- 无活动输入时 TICK 返回原引用，app 不需要持续制造空 revision；
- 有输入时 clockTick 增加；join 存在时 holdTicks 同步增加并钳制到 HOLD_TICKS；
- 达到第 6 tick 的同一次转移追加完成记录并进入 measure-complete；超大批量 tick 也只能完成当前一节一次；
- TICK 不播放声音、不读取帧时间，也不自动进入下一节。

### 6.4 松开与防跨节

- RELEASE 通过 inputId 精确匹配，过期 keyup/pointerup 不得释放新的物理输入；
- playing 中 join 前松开只清除对应 held；join 后未达标松开清空 join/hold，并反馈 released-early；
- outside-window 后任一席松开不会让另一席旧按下重新参与新 join；只有 held 两边都清空后才可开始新尝试；
- measure-complete 中 RELEASE 只清理匹配输入；一边仍按住时保持本节；双方都空后进入下一节 playing，最后一节则进入 complete；
- completed 不会因松开、暂停、重启前的无效动作而重复追加。

### 6.5 暂停与恢复

- INTERRUPT 仅对 playing/measure-complete 有效，清空 held、join 和 hold，保存 pauseReason 与 pausedFrom；
- playing 中断会丢弃当前未完成尝试；RESUME 回同一小节重新按；
- measure-complete 中断不撤销 completed；RESUME 视为安全释放已完成和弦，直接进入下一节或 complete；
- manual/hidden/blur/stalled 之外的原因规范为 manual；重复中断不覆盖第一次原因；
- RESTART 从任意阶段返回全新 intro，清空完成记录与时钟。

### 6.6 键位分类

```js
classifyHarmonyKey("KeyA", "down", false)
// { type: "PRESS", voice: "low", noteId: "c3", inputId: "key:KeyA" }

classifyHarmonyKey("KeyA", "up", false)
// { type: "RELEASE", inputId: "key:KeyA" }
```

- edge 只接受 down/up；
- repeat 为 true 的 down 返回 null；keyup 仍必须生成 RELEASE；
- 使用 `KeyboardEvent.code`，Semicolon 显示为 `;`；
- 未知 code 返回 null；修饰键和输入框来源由 app 层拒绝。

### 6.7 重放

`replayHarmony(rawConfig, actions)` 从全新 intro 顺序调用 reducer；同配置和同 action 序列必须深相等，不能修改 action 数组或嵌套对象。音频可用性不进入 action 日志，因此有声、静音和音频失败都产生同一状态。

## 7. 视图模型

`getHarmonyView(state)` 至少返回：

```js
{
  phase,
  measureNumber,
  measureCount: 5,
  measureTitle,
  lowSeat: { name, notes, target, held, stateLabel },
  highSeat: { name, notes, target, held, stateLabel },
  joinGapMs,
  holdProgress,
  completed,
  progressLabel,
  instruction,
  feedback,
  finalTitle,
  finalMessage,
  signature,
  canStart, canPress, canPause, canResume, canRestart
}
```

- `notes` 返回供按钮渲染的只读副本，含 id/label/key/isTarget/isHeld；
- holdProgress 为 `0…1`，只用于视觉，不参与 reducer 判定；
- instruction 必须明确“按什么”“是否要松开/重试”，不只用颜色；
- getView 的数组和嵌套对象与 state 隔离，调用方修改不得污染权威状态；
- complete 的 finalMessage 由 `composeHarmonyMessage(view)` 在 app 层生成并以 textContent 输出。

## 8. 音频适配器

app 优先调用 `window.TWO_OF_US_AUDIO.createTonePlayer()`；共享脚本缺失、构造异常或方法不可用时，创建同接口静音对象：

```js
{ ensureReady: async () => false, playTone: () => false, close: async () => {} }
```

规则：

- 只在“开始合奏”“继续合奏”真实用户手势中异步 `ensureReady()`；先同步 dispatch，再尝试音频，不能等待声音后才改变规则；
- 页面提供“声音开/关”控制；默认开，但不可用时显示“声音未开启，视觉模式仍可完成”；
- completed 长度增长时播放目标低音和高音，各 420ms，低音 `triangle`、高音 `sine`，两次调用必须能重叠；
- 同一 completed 记录只播放一次；重渲染、重复 RELEASE 和失败 Promise 不得重播；
- pause/hidden/blur/restart/beforeunload 关闭播放器；恢复时创建新实例并等待用户手势；
- 音频成功、静音、ensureReady=false、playTone=false/throw 四种路径的逻辑状态必须一致。

## 9. DOM、输入与焦点

### 9.1 持久骨架

```html
<main>
  <header>标题、声音、帮助</header>
  <section data-phase-host></section>
  <p role="status" aria-live="polite"></p>
</main>
```

### 9.2 阶段 DOM

- intro：标题、两席分工、五枚空和弦印记、主按钮“开始合奏”；
- playing：当前小节、中央会合标记、两组四音按钮、保持进度、暂停按钮；
- measure-complete：仍显示当前目标与双方按下状态，明确“和弦收好了，双方松开”；
- paused：从 DOM 移除可演奏按钮，显示暂停原因与“继续合奏”；
- complete：从 DOM 移除整套键盘，显示五枚和弦印记、最终文案、“再合一次”和“返回作品库”。

隐藏阶段不能只靠 CSS `display:none` 常驻 DOM，避免暂停/完成后旧按键仍可聚焦或被辅助技术访问。

### 9.3 输入接线

- keydown 先 `classifyHarmonyKey`，同步 dispatch PRESS，再异步确保声音；不得等待音频；
- keyup 即使失焦边缘到达，也按 inputId dispatch RELEASE；
- 修饰键、可编辑元素来源和 repeat keydown 不参与；对已识别且阶段可用的键阻止默认行为；
- 每个音是原生 button，pointerdown 使用 `pointerId` 形成 `pointer:<id>`，setPointerCapture 后 dispatch PRESS；
- pointerup/cancel/lostpointercapture 只释放自己的 inputId；不监听合成 click 再次派发；不读取 `isPrimary`；
- 一个 pointerId 不能同时占两个声部；两指可以同时占据不同声部；
- window blur、document hidden 与 Escape 触发 INTERRUPT，并清空 app 的 key/pointer 集合；
- app 用 rAF accumulator 把经过时间换成整数 tick；帧间隔超过 500ms 触发 stalled 暂停，不补算后台时间。

### 9.4 焦点

- 每次阶段变化后只在结构真正变化时重建并移动焦点；普通 TICK 不替换整个键盘 DOM；
- intro 聚焦开始按钮；playing 聚焦低音席当前目标；paused 聚焦继续按钮；complete 聚焦完成标题；
- 错误和保持 tick 不抢走当前按键焦点；
- Pointer 操作不强制把焦点搬到另一席；
- `:focus-visible`、forced-colors 和键盘全流程必须可见可用。

## 10. 视觉与响应式边界

视觉核心是“两条不同材质的声部带在中央合成一枚黄铜/纸质和弦印记”，不是写实钢琴、DAW、霓虹节奏轨道或默认卡片网格。

- 桌面 1504×1046：两席左右对称，目标与中央会合线同屏；不旋转任何一席；
- 手机 390×844：两席上下排布，但两组四键在当前小节首屏内可触达；
- 窄屏 320×700：允许纵向滚动，不允许横向溢出；按钮最小 48px；
- 页面文本和控件 code-native；中央背景可使用一张无字 ImageGen 生产图，CSS 必须提供同层级回退；
- 不使用第三方字体、图标或图片；方向和声音图标使用项目原生 SVG；
- reduced motion 删除按键弹跳、印记缩放和光粒；forced colors 保留边框、进度和按下状态；
- 背景、装饰、音频和颜色缺失都不能隐藏目标音、保持进度或下一步文字。

完整概念、设计令牌、允许文案、资产提示词、移动重排和 Fidelity ledger 在后续设计文档冻结，并独立提交。

## 11. 自动测试 Gate

定向逻辑测试不少于 36 项，至少覆盖：

1. 固定音符与五小节 id/白名单/顺序/深冻结；
2. 配置类型、Unicode 截断、HTML 惰性、深拷贝与默认回退；
3. START 阶段与重复开始；
4. 两席正确首键、错误音、越权音、未知音；
5. repeat keydown、重复 inputId、声部占用和过期 RELEASE；
6. 同 tick、低后高、高后低、恰好 4 tick、5 tick 超窗；
7. hold 第 5/6 tick、超大 TICK 和唯一 completed；
8. join 前松开、hold 中提前松开、outside-window 双松开重试；
9. measure-complete 单边松开、双松开、最后一节 complete 和防跨节；
10. manual/blur/hidden/stalled 中断、幂等中断、playing/measure-complete 恢复；
11. complete 后输入无效与 restart 清零；
12. getView 的文字冗余、hold 比例、目标/键位、嵌套隔离；
13. replay 确定性和不修改 action；
14. 畸形 action/tick/state 安全拒绝；
15. 有声/静音/初始化失败/播放失败通过 app 适配器测试得到相同 reducer 日志。

作品提交前至少运行：

```bash
node --check experiences/co-op/four-hands-harmony/config.js
node --check experiences/co-op/four-hands-harmony/logic.js
node --check experiences/co-op/four-hands-harmony/app.js
node --test experiences/co-op/four-hands-harmony/logic.test.js
npm test
npm run verify
git diff --check
```

## 12. 浏览器验收 Gate

- Browser/IAB 优先验证；不可用或不可靠时记录原因再使用 Playwright；
- 真正 `file://` 与 localhost 门户各跑一次；
- 尺寸：1504×1046、390×844、320×700；
- 完整五节：键盘同按、两指 Pointer、200ms 边界、300ms 保持、单边/双边松开；
- 错误：错音、过窗、提前松开、重复键、pointercancel/lost capture；
- 生命周期：手动暂停、Escape、blur、hidden、stalled、返回继续和重开；
- 降级：静音、无 AudioContext、共享脚本缺失、背景缺失、reduced motion、forced colors；
- DOM：paused/complete 不残留演奏按钮，普通 tick 不丢焦点，live region 不刷屏；
- 资源：无公网请求、无音频文件、无外部字体/图标、控制台无错误；
- 视觉：同轮使用 `view_image` 对比已接受概念与最新浏览器截图，记录至少五项 fidelity ledger 和首屏 copy diff。

## 13. 借鉴与原创声明 Gate

README 与 ATTRIBUTION 必须包含：

- Tone.js、MDN Web Audio Examples、ptcollab、pianco 的固定提交、许可证和权利声明主体；
- 每个来源只研究的抽象机制；
- 没有复制代码、协议、键盘 UI、示例曲、MIDI、采样、字体、图标、截图或页面结构；
- 乐句、规则、状态机、文字、界面和测试均为独立创作；
- ImageGen 资产的最终提示词、生成方式、保存路径和无第三方输入声明；
- 运行声音由原生 OscillatorNode 实时生成，零音频文件、零远程请求。

缺少正式借鉴声明、资源归属不清、引入第三方旋律/采样，或需要新增未冻结运行依赖，均为 No-Go。

## 14. 完成定义

只有同时满足以下条件才算完成：

- 五小节状态机、键盘与双 Pointer 均真实完成；
- 逻辑测试、全仓测试、repository verify 和 diff check 全部通过；
- file/localhost、三档响应式、音频/资产/生命周期降级已验收；
- 概念与运行截图经同轮 `view_image` 忠实度比较，无未记录的可修复偏差；
- 真实 bug 写入 `bugs/`，验证过的通用结论写入 `learn/`；
- catalog、创意池、README 和文档索引同步；
- 每个完成部分拥有独立提交，最终验收文档列出完整提交链。
