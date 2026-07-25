# A 级“把秘密藏进这一圈”可执行规格

- 日期：2026-07-25
- 工作 ID：`vinyl-secret`
- 目标目录：`experiences/surprises/vinyl-secret/`
- 启动等级：A，`file://` 直接打开
- 上游：[调研](./267-vinyl-secret-research.md) / [脑暴](./268-vinyl-secret-brainstorm.md)
- 状态：冻结，可进入实现计划

## 1. 产品合同

接收者依次寻找三段秘密轨道。每轨给出一条私人线索；接收者在 12 圈沟槽之间移动唱针，读取由整数距离决定的四级信号，再主动按“落下唱针”。命中后揭开本轨文字，并可尝试播放一段准备者提供的本地音频；第三轨命中后打开最终封套。

完成条件唯一：

```text
foundTrackIds 按配置顺序恰好包含 3 个 ID
```

音频能否加载、`play()` 是否成功、播放进度、是否 `ended`、音量、动画、CSS 和媒体事件都不得进入完成条件。

首版不加入失败、计分、倒计时、直接揭晓、保存、分享、录音、上传、文件选择、歌词、波形、转速或物理模拟。

## 2. 文件合同

```text
experiences/surprises/vinyl-secret/
├── index.html
├── styles.css
├── config.js
├── logic.js
├── logic.test.js
├── app.js
├── README.md
├── ATTRIBUTION.md
└── assets/
    └── favicon.svg
```

- 脚本按 `config.js → logic.js → app.js` 加载经典脚本，不使用 module；
- `config.js` 与 `logic.js` 用 UMD 风格：浏览器挂全局，Node 可 `require()`；
- 目录独立复制后仍可运行，不引用 `shared/`、根运行时、CDN、远程字体或外部 URL；
- 不默认创建 `assets/private-audio/`，也不提交任何歌曲、录音、封面或纹理；
- 如准备者自备音频，可自行创建 `assets/private-audio/`，文件名和相对路径遵守第 4 节；
- `ATTRIBUTION.md` 必须声明默认代码、文案、CSS 图形和 favicon 的来源，列出一手资料，并写明没有第三方开源代码参考；
- 若实现阶段新增开源参考，必须先回改调研和 ATTRIBUTION，记录固定 commit/tag、许可证、权利主体、借用与未借用范围。

## 3. 冻结常量

```js
GROOVE_COUNT = 12
TRACK_COUNT = 3
TRACK_SETTLE_MS = 420

SIGNAL_CODES = ["quiet", "warm", "near", "clear"]
SIGNAL_LABELS = {
  quiet: "寂静",
  warm: "微响",
  near: "靠近",
  clear: "清晰",
}

DEFAULT_TARGETS = [3, 7, 11]
```

信号算法：

```js
distance = Math.abs(cursorGroove - targetGroove)

distance === 0       => "clear"
distance === 1       => "near"
distance === 2 || 3  => "warm"
distance >= 4        => "quiet"
```

所有常量、默认配置、sanitize 结果、状态、action 结果与 view model 递归冻结；不得和调用方共享可变引用。

## 4. 配置 schema

### 4.1 唯一允许结构

```js
globalThis.VINYL_SECRET_CONFIG = Object.freeze({
  recipientName: "给你",
  finalEyebrow: "SIDE US · PRIVATE PRESSING",
  finalTitle: "这一张，想一直和你听下去",
  finalMessage:
    "谢谢你把三段声音都找到。没有播放出来的部分，也已经被我们一起走过的日子填满。",
  signature: "留给愿意把针落在这里的你",
  tracks: Object.freeze([
    Object.freeze({
      id: "first-chat",
      targetGroove: 3,
      clue: "先从外圈找起，那里像我们第一次把话说慢。",
      note: "我最想重播的，不是哪一首歌，是第一次和你聊到忘记时间。",
      audioSrc: null,
    }),
    Object.freeze({
      id: "ordinary-day",
      targetGroove: 7,
      clue: "下一段在唱片中间，像普通日子忽然发亮。",
      note: "后来我才发现，最安静的日子也会因为你有了旋律。",
      audioSrc: null,
    }),
    Object.freeze({
      id: "many-tomorrows",
      targetGroove: 11,
      clue: "最后一段靠近标签，留给还没发生的以后。",
      note: "唱片会转到尽头，但我还想和你一起听很多个以后。",
      audioSrc: null,
    }),
  ]),
});
```

### 4.2 清洗约束

`sanitizeConfig(candidate)` 只接受普通对象及精确白名单字段：

| 字段 | 约束 |
| --- | --- |
| `recipientName` | trim 后 1–20 Unicode code points |
| `finalEyebrow` | trim 后 1–36 code points |
| `finalTitle` | trim 后 1–40 code points |
| `finalMessage` | trim 后 1–220 code points |
| `signature` | trim 后 1–48 code points |
| `tracks` | 恰好 3 个普通对象 |
| `track.id` | `/^[a-z][a-z0-9-]{0,31}$/`，三项唯一 |
| `track.targetGroove` | 安全整数 1..12，三项唯一 |
| `track.clue` | trim 后 1–72 code points，三项唯一 |
| `track.note` | trim 后 1–160 code points，三项唯一 |
| `track.audioSrc` | `null`，或满足 4.3 的字符串 |

候选有额外/缺失字段、symbol key、访问器、代理读取抛错、非普通原型、循环引用、非法 Unicode 长度、重复值或任何子字段非法时，**整份配置**回退到递归冻结的默认配置。禁止“部分采用”，避免目标与文案错配。

### 4.3 音频路径

非空 `audioSrc` trim 后必须：

```text
长度 1..120 code points
匹配：
^\.\/assets\/private-audio\/[A-Za-z0-9][A-Za-z0-9._-]*\.(mp3|wav|ogg)$
```

路径区分大小写，不接受反斜杠、空格、`..`、额外目录、百分号编码、查询、fragment、绝对 URL、`data:`、`blob:` 或非小写扩展名。该校验只缩小访问范围，不保证文件存在或浏览器能解码。

`audioSrc` 不得出现在静态 HTML、catalog、CSS 或 README 示例的真实私人文件名中。

## 5. 权威状态

```js
{
  version: 1,
  phase: "intro" | "seeking" | "playing" | "track-result" | "complete",
  trackIndex: 0 | 1 | 2,
  cursorGroove: integer 1..12,
  foundTrackIds: [], // 配置顺序的严格前缀
  pendingTrackId: null | current track ID,
  pendingToken: null | positive safe integer,
  lastToken: non-negative safe integer,
  noticeSerial: non-negative safe integer,
  lastNotice: null | "started" | "miss" | "hit" | "settled" |
    "advanced" | "completed" | "restarted",
  revision: non-negative safe integer,
}
```

### 5.1 全局不变量

- 状态只含上述白名单字段，JSON 可往返；
- `foundTrackIds` 必须是配置 `tracks[].id` 的严格前缀，唯一且同序；
- `pendingToken === null` 当且仅当 `pendingTrackId === null`；
- 非空 pending token 必须等于 `lastToken`；
- `noticeSerial <= revision`；
- `lastToken`、`noticeSerial` 与 `revision` 只增不减；restart 不把 token 清零，避免旧定时器与新局 token 相撞；
- `assertState(state, config)` 对任何额外字段、错误枚举、非安全整数、错误前缀或 phase 组合抛 `TypeError`。

### 5.2 phase 不变量

| phase | `trackIndex` | `foundTrackIds.length` | pending | 说明 |
| --- | ---: | ---: | --- | --- |
| `intro` | 0 | 0 | 空 | `cursorGroove === 1` |
| `seeking` | `0..2` | 等于 index | 空 | 当前轨未找到 |
| `playing` | `0..2` | 等于 index | 当前轨 ID + token | 正确落针已发生，等待 token 结算 |
| `track-result` | 0 或 1 | 等于 index + 1 | 空 | 当前轨已找到，等待 NEXT |
| `complete` | 2 | 3 | 空 | 三轨全部找到 |

初态：

```js
{
  version: 1,
  phase: "intro",
  trackIndex: 0,
  cursorGroove: 1,
  foundTrackIds: [],
  pendingTrackId: null,
  pendingToken: null,
  lastToken: 0,
  noticeSerial: 0,
  lastNotice: null,
  revision: 0,
}
```

## 6. 公开 action 与精确转移

统一入口：

```js
transition(state, action, config)
```

每个 action 必须是普通对象，只允许以下精确字段；缺字段、多字段、symbol key、访问器、非法类型或未知 `type` 抛 `TypeError`。action 先校验，再判断 phase；因此错 phase 的畸形 action 仍然抛错，结构合法的错 phase action 返回同一状态引用。

```text
START
MOVE { groove }
DROP
SETTLE_TRACK { token, reason }
NEXT
RESTART
```

`SETTLE_TRACK.reason` 只允许：

```text
"timer" | "reduced-motion" | "hidden" | "pagehide"
```

### 6.1 `START`

`intro → seeking`：

- 其余规则字段不变；
- `lastNotice = "started"`；
- `noticeSerial += 1`，`revision += 1`。

其他 phase 同引用幂等。

### 6.2 `MOVE {groove}`

- `groove` 必须为 1..12 安全整数；
- 只在 seeking 生效；
- 与当前圈相同时同引用幂等；
- 否则只改 `cursorGroove`，`revision += 1`；
- 不写 notice，不自动提交，不播放任何声音。

### 6.3 `DROP`

只在 seeking 生效，计算当前轨目标与信号。

若不是 `clear`：

- phase 和位置不变；
- `lastNotice = "miss"`；
- `noticeSerial += 1`，`revision += 1`；
- 同一错误圈可重复落针，每次都产生新的 notice serial。

若为 `clear`：

- `phase = "playing"`；
- `pendingTrackId = currentTrack.id`；
- `lastToken += 1`，并令 `pendingToken = lastToken`；
- `lastNotice = "hit"`；
- `noticeSerial += 1`，`revision += 1`；
- 此时尚不追加 `foundTrackIds`。

### 6.4 `SETTLE_TRACK {token, reason}`

- token 必须是正安全整数，reason 必须在白名单；
- 只在 playing 且 token 精确等于 `pendingToken` 时生效；
- 旧 token、未来 token或错 phase结构合法 action 同引用幂等；
- 将 `pendingTrackId` 追加到 `foundTrackIds`，清 pending；
- 若当前是第 1 或第 2 轨：`phase = "track-result"`，`lastNotice = "settled"`；
- 若当前是第 3 轨：`phase = "complete"`，`lastNotice = "completed"`；
- `noticeSerial += 1`，`revision += 1`；
- reason 只记录在 action 日志，不进入状态；四种 reason 结果深相等。

### 6.5 `NEXT`

只在 track-result 生效：

- `trackIndex += 1`；
- `cursorGroove = 1`；
- `phase = "seeking"`；
- `lastNotice = "advanced"`；
- `noticeSerial += 1`，`revision += 1`。

重置到外圈是公开规则，不根据下一目标选择近点。

### 6.6 `RESTART`

只在 complete 生效：

- 回到 intro 的规则字段；
- 保留 `lastToken`；
- `noticeSerial += 1`；
- `lastNotice = "restarted"`；
- `revision += 1`。

complete 除 RESTART 外的合法 action 同引用幂等。restart 后旧的 `SETTLE_TRACK` token 永远不能命中新一局。

## 7. 公开投影与秘密 Gate

```js
getViewModel(state, config)
```

只返回当前 phase 所需的递归冻结数据：

| phase | 可公开 |
| --- | --- |
| intro | 固定标题、说明、开始按钮文本；不含配置秘密 |
| seeking | `trackNumber/3`、当前 clue、cursor、signal code/label；不含 target/note/audio/final |
| playing | seeking 字段 + 当前 note + 当前 `audioSrc` + pendingToken |
| track-result | 当前 clue/note、已找进度；`audioSrc:null` |
| complete | recipient、final 字段、三条已找到 note；`audioSrc:null` |

永不公开：

- 当前或未来 `targetGroove`；
- 未来 clue 和 note；
- 未命中轨道的 `audioSrc`；
- 整份配置对象。

`getSignal(cursorGroove, targetGroove)` 可以作为纯逻辑导出供 reducer 与测试使用，但 app 只能经 view model 得到信号，不直接读取 config target。

DOM Gate：

- intro 前不得创建线索、内页、最终留言或带私人路径的 `<audio src>`；
- seeking 只创建当前 clue；
- playing/track-result 只创建已命中的当前 note；
- complete 才创建最终 recipient/title/message/signature 与三条 note；
- phase 退出时销毁不再允许的节点，不以 `display:none` 代替；
- 扫描 `textContent`、属性名值、`aria-*`、`data-*`、style 和媒体 `src/currentSrc` 都不得提前发现秘密；
- `config.js` 明文不属于 DOM Gate，README 明示查看源文件可读。

## 8. app 与媒体生命周期

### 8.1 一个媒体元素

静态 HTML 只包含：

```html
<audio id="track-audio" preload="none"></audio>
```

不得有 `autoplay`、`loop`、`src` 或 `<source>`。三轨复用该元素，不创建 `new Audio()`。

### 8.2 正确落针的同步调用顺序

“落下唱针” click handler 必须同步：

1. `transition(..., {type:"DROP"})`；
2. 渲染新 view；
3. 若进入 playing 且 `audioSrc !== null`，在该 click task 内调用 `attemptAudio(audioSrc, pendingToken)`；
4. 安排独立的 token 结算。

`attemptAudio`：

```text
audioGeneration += 1
保存本次 generation 与 pendingToken
pause 旧媒体
removeAttribute("src")
load()
设置新的相对 src
currentTime 尝试归零
立即调用 play()
捕获同步异常
Promise.resolve(playResult).then(success, failure)
```

回调只有在 generation 和 pendingToken 仍匹配时才可改 app 层音频 UI。`play()` 成功/失败不派发 reducer action。

### 8.3 app 层音频 UI

音频瞬态只允许：

```text
none | loading | playing | ended | stopped | failed
```

- `audioSrc === null`：`none`，显示“这一轨没有附声音，文字已经展开。”；
- Promise resolve / `playing`：`playing`，显示“停止声音”；
- `ended`：只更新为 ended；
- Promise reject、`error` 或同步异常：failed，显示“这段声音没有播放，文字已经为你留下。”；
- 用户按“停止声音”：stopped；
- 这些状态不写入 logic state，不改变 NEXT/complete。

### 8.4 清理

`stopAndReleaseAudio()`：

```text
audioGeneration += 1
audio.pause()
audio.removeAttribute("src")
audio.load()
```

在以下时机调用：

- NEXT 之前；
- RESTART 之前；
- `document.visibilityState === "hidden"`；
- `pagehide`；
- 用户按“停止声音”。

若 hidden/pagehide 时 phase 仍为 playing，先用当前 token 派发相应 reason 的 `SETTLE_TRACK`，再清 timer 与音频。恢复可见时不自动重播。

## 9. 结算 timer 与 reduced motion

正确 DROP 后：

- 默认在 `TRACK_SETTLE_MS = 420` 后派发 `{type:"SETTLE_TRACK", token, reason:"timer"}`；
- `prefers-reduced-motion: reduce` 时不用 420ms timer，使用 `queueMicrotask` 派发相同 token、reason `reduced-motion`；
- preference 在 playing 中改为 reduce 时，清 timer 并立即以当前 token 结算；
- 新 DROP、NEXT、RESTART、hidden、pagehide 和卸载都清旧 timer；
- timer 回调必须携带创建时的 token；禁止读取“当前 token”后补发；
- 动画完成事件不驱动逻辑，CSS 关闭或丢帧不影响结算。

## 10. DOM 与输入

### 10.1 必需控件

```html
<button id="start-button">开始寻声</button>
<button id="outward-button">向外一圈</button>
<input id="groove-control" type="range" min="1" max="12" step="1">
<button id="inward-button">向内一圈</button>
<button id="drop-button">落下唱针</button>
<button id="stop-audio-button">停止声音</button>
<button id="next-button">继续听下一面</button>
<button id="restart-button">重新开始</button>
```

phase 不需要的按钮不创建，而不只是 disabled/hidden；唯一例外是静态 audio 元素。

### 10.2 range 是唯一位置源

- range 的 `input` 事件把 `valueAsNumber` 转成 `MOVE`；
- app 不实现自定义 pointer 坐标、拖拽、capture 或 Canvas 命中；
- CSS 唱臂位置只由公开 `cursorGroove` 映射；
- 原生方向键、Home、End 保持默认行为；
- `aria-valuetext = "第 N 圈，共 12 圈"`；
- “向外一圈”派发 `MOVE(max(1, current - 1))`；
- “向内一圈”派发 `MOVE(min(12, current + 1))`；
- 到边界的对应按钮 disabled；
- 所有交互按钮最小 `48 × 48 CSS px`。

用户移动 range 不自动落针、不触发 live region、不播放提示音。

### 10.3 焦点

- START 后聚焦 range；
- SETTLE 到 track-result 后聚焦该轨结果标题，再让 NEXT 成为下一个 Tab stop；
- NEXT 后聚焦 range；
- complete 后聚焦最终标题；
- RESTART 后聚焦开始标题，开始按钮随后可 Tab 到达；
- 不使用正 `tabindex`，标题临时用 `tabindex="-1"` 接收程序化焦点；
- 移除阶段节点前，先把焦点转移到新阶段安全节点。

## 11. 可访问性与响应式

- 页面 `lang="zh-CN"`，标题描述具体作品；
- range 有可见 `<label>`；当前圈和信号都有可见文字；
- 四段信号仪表 `aria-hidden="true"`，不作为唯一信息；
- 一个 `role="status" aria-live="polite" aria-atomic="true"` 只播报 started/miss/hit/settled/completed 与音频软失败；
- MOVE 不播报 status，range 自己通过 value text 表达位置；
- 错误落针文案固定：“还不是这一圈，再听听附近的信号。”；
- 正确文案固定：“找到了，这一轨已经为你展开。”；
- 颜色对比满足 WCAG AA；焦点环至少 2px 且不被裁切；
- 320 CSS px 宽仍无页面级横向滚动；唱片缩小，控件纵向排列；
- 200% 文本缩放不遮挡线索、按钮或结果；
- `forced-colors: active` 下用系统色、边框与 outline 表达唱针/信号；
- `prefers-reduced-motion: reduce` 下禁止唱片旋转、唱臂补间、封套翻转和背景漂移；
- 关闭 CSS、favicon 加载失败、音频缺失时仍能按文本控件通关。

## 12. 视觉规格

- 画面只允许 CSS/HTML 与自写 SVG favicon；
- 桌面采用“封套 / 唱片工作台 / 当前内页”三段式，移动端按该顺序纵向；
- 唱片 12 条可见同心沟槽只作标尺；当前圈用高对比描边；
- 唱臂角度/位移是 `cursorGroove` 的确定性函数，不进入逻辑；
- 字体只用系统栈：

```css
font-family:
  ui-serif, "Songti SC", "Noto Serif CJK SC", Georgia, serif;
font-family:
  ui-sans-serif, system-ui, -apple-system, "PingFang SC", sans-serif;
```

`Noto Serif CJK SC` 只是本机候选，不下载字体文件。

禁止专辑封面、唱片公司 logo、品牌商标、抓取纹理、歌词、影视台词与第三方图标包。

## 13. 逻辑测试合同

`logic.test.js` 至少覆盖：

### 配置

- 默认配置冻结、深冻结、sanitize 幂等；
- 每个字段边界和 Unicode code point 长度；
- 缺字段、额外字段、symbol、访问器、错误原型、抛错 getter；
- 轨道数量、ID/target/clue/note 唯一性；
- 路径白名单正例：`.mp3/.wav/.ogg`；
- 拒绝 `..`、反斜杠、空格、子目录、绝对 URL、协议、query、fragment、percent、大小写扩展；
- 任一非法项整份回退且不共享引用。

### 信号

- 12 × 12 全组合信号；
- 阈值 `0 / 1 / 2 / 3 / 4 / 11`；
- 对称性；
- 非整数、越界、NaN、Infinity 抛错。

### 状态与 action

- 初态深相等、冻结、JSON 往返；
- 每个 phase 的正向路径和 phase 矩阵；
- 三轨命中顺序与最终完成；
- 36 个错误落针组合不推进；
- 重复错误 noticeSerial 递增；
- MOVE 同值与错 phase同引用幂等；
- DROP 正确只进 playing，未提前 append；
- 精确 token 才 settle；旧/未来 token 幂等；
- 四种 settle reason 结果除 action 日志外深相等；
- NEXT 重置 groove 1；
- restart 保留 lastToken，旧 token 不能污染新局；
- complete 除 restart 外封闭；
- action 缺/多字段、symbol、访问器、非法值均抛错；
- assertState 对每个字段和不变量的突变拒绝；
- 所有返回递归冻结且输入无突变。

### view model

- 每个 phase 精确 key 集；
- intro 没有任何配置秘密；
- seeking 仅当前 clue，无 target/note/audio/final；
- playing 只暴露当前 note/audio/token；
- track-result 不再暴露 audioSrc；
- complete 才暴露 final 和三条已找到 note；
- 恶意输入不能通过属性、原型或引用泄漏配置。

## 14. 浏览器验收合同

### 14.1 `file://` 默认无音频

在 Chrome 与 Safari 各直接打开绝对 `file:///…/vinyl-secret/index.html`：

1. 无控制台 error、无网络请求、无外部资源；
2. intro DOM 无 clue/note/final/audio src；
3. 三轨分别在 3、7、11 圈命中；
4. 错误落针不推进，正确落针不等音频即可推进；
5. 完成后显示三条 note 与最终封套；
6. restart 后回 intro，旧 timer 不改变新局；
7. 刷新回初态。

### 14.2 输入与 DOM Gate

- 鼠标拖 range、触摸拖 range、方向键、Home/End、两个逐圈按钮分别通关；
- 每 phase 扫描 `textContent`、全部属性、ARIA、data、style、`audio.src/currentSrc`；
- Tab 顺序、焦点转移、visible focus、live 播报和按钮尺寸符合第 10–11 节；
- 320 / 390 / 768 / 1440 CSS px、200% zoom、forced colors、reduced motion；
- reduced motion 正确落针在 microtask 后结算，规则结果与 timer 路线相同。

### 14.3 可选音频

使用开发者自有的短测试录音，且不提交：

- 命中 click 内触发 `play()`，不在 load/START/MOVE/NEXT 自动播；
- 单个 audio 元素三轨换 src；
- `play()` resolve、reject、同步抛错、`error`、`ended`；
- 不存在路径和不支持格式均显示软失败且可继续；
- stop、NEXT、hidden、pagehide、restart 会 pause、清 src、load；
- 过期 Promise 回调不改变当前音频 UI；
- 最后一轨音频未结束也能完成。

若自动化浏览器无法打开 `file://`，必须如实记录：静态 A 合同与真实本地浏览器手验 `file://`；自动化 UI 可在无缓存 localhost 镜像验证，但不能把 localhost 结果冒充 file 结果。

## 15. 来源与版权验收

README 与 ATTRIBUTION 至少列出：

- [Library of Congress: The Gramophone](https://www.loc.gov/collections/emile-berliner/articles-and-essays/gramophone/)
- [WHATWG HTML: Media elements](https://html.spec.whatwg.org/multipage/media.html)
- [W3C WAI-ARIA APG: Slider Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/slider/)
- [W3C WCAG 2.2](https://www.w3.org/TR/WCAG22/)
- [U.S. Copyright Office: Circular 56](https://www.copyright.gov/circs/circ56.pdf)

并写明：

- 参考仅用于公开事实、Web 行为和可访问性边界；
- 没有复制其代码、界面、文案或素材；
- 默认代码、文案、CSS 唱片/封套和 favicon 为本仓库原创；
- 默认无音频；
- 用户自备音频需分别确认底层词曲、具体录音、声音参与者同意和分发范围；
- 封面、照片、字体、纹理另行授权，不能由音频许可覆盖；
- 当前没有第三方开源仓库参考；若未来加入，必须固定 commit/tag/license。

## 16. 交付 Gate

实现只有同时满足以下条件才可进入 catalog：

1. 所有逻辑、配置和 DOM Gate 测试通过；
2. `npm run verify`、`git diff --check` 通过；
3. 默认无音频 `file://` 在 Chrome 与 Safari 可完整通关；
4. 音频拒绝、缺失、不支持和后台清理均为软失败；
5. 键盘、Pointer 替代按钮、reduced motion、forced colors 与窄屏通过；
6. 与 `hand-crank-music-box` 和 `starlight-keepsake-search` 的机制差异仍成立；
7. README/ATTRIBUTION 权利边界完整；
8. 没有新增根依赖、共享文件、远程请求或未声明资产。
