# Photo Slider Race 产品与技术规格

## 1. 文档状态

- 项目 ID：`photo-slider-race`
- 中文名：**同一张，谁先拼回**
- 体验分类：`versus`
- 运行等级：A
- 推荐结论：Go，受本文验收门槛约束
- 上游文档：
  - `docs/287-photo-slider-race-research.md`
  - `docs/288-photo-slider-race-brainstorm.md`

本文冻结首版产品、逻辑、隐私和验收契约。实现若需要改变本文的公平性、照片处理或离线边界，必须先更新规格并单独提交。

## 2. 一句话产品定义

两个人在同一台设备上，用完全相同的 3×3 可解滑块局面，同时拼回同一张原创默认图或用户本地照片；最先完成者获胜，完成时间相差不超过 100 ms 则并列。

## 3. 范围

### 3.1 必须实现

- 双击 `index.html` 可直接运行。
- 原创代码生成默认图，无照片也可玩。
- 单张本地 JPEG、PNG 或 WebP 可选。
- 两块同时可见、状态独立的 3×3 棋盘。
- 相同且保证可解的初始排列。
- 3、2、1 同步倒计时。
- 左方 W/A/S/D；右方方向键。
- 鼠标和触控点击相邻方块。
- 单调时钟计时和 100 ms 并列窗口。
- 页面隐藏或失焦时双方同时暂停。
- 胜负、用时和步数反馈。
- 同图新局与换图。
- 响应式、键盘可达、减少动态支持。
- 照片零上传、零持久化、Object URL 及时清理。
- README 中的隐私、图片权利与借鉴声明。

### 3.2 明确不做

- 联网、后端、跨设备、账户、排行榜。
- 任何上传、下载、分享或持久化。
- 多张图片、相册、摄像头拍照。
- 2×2、4×4 或难度选择。
- 道具、提示、撤销、自动完成。
- 拖拽。
- 音频。
- 第三方运行时库、CDN、远程字体、远程素材。
- 自写 EXIF 解析器。
- 复制任何开源滑块项目的代码、样式、素材或规则文本。

## 4. 运行与目录契约

目标目录：

```text
experiences/versus/photo-slider-race/
├── index.html
├── style.css
├── app.js
├── logic.js
├── logic.test.js
└── README.md
```

约束：

- `index.html` 使用相对路径加载样式和经典脚本。
- `logic.js` 采用仓库既有可在浏览器和 Node 测试中使用的导出方式。
- 不引入 `package.json` 级新依赖。
- 不使用 ES Module、构建产物或服务端模板。
- 不修改共享入口、根 README 或 `catalog.json`；该集成属于独立任务。

## 5. 信息架构

页面由五个稳定区域组成：

1. `header`：标题、副标题、隐私短句。
2. `setup`：当前图片预览、开始、选择照片、恢复内置图、限制说明。
3. `instructions`：左右键位和“方向表示空格移动”的规则。
4. `arena`：左方状态、左棋盘、中央信息、右棋盘、右方状态。
5. `result`：胜负、双方用时/步数、再来一场、换图。

状态切换可以隐藏无关控件，但不能靠删除并重建整个页面丢失焦点上下文。图片处理错误显示在 setup 中，比赛状态显示在 arena 中，不能混用一个含糊的全局错误区。

## 6. 状态机

### 6.1 顶层状态

```text
SETUP
  └─ start ─> COUNTDOWN
COUNTDOWN
  ├─ completed ─> RACING
  └─ hidden/blur ─> PAUSED
RACING
  ├─ hidden/blur ─> PAUSED
  └─ first solved ─> SETTLING
SETTLING
  ├─ second solved within 100 ms ─> FINISHED_DRAW
  ├─ window expires ─> FINISHED_WIN
  └─ hidden/blur ─> PAUSED_SETTLING
PAUSED
  └─ explicit resume ─> RESUME_COUNTDOWN ─> prior active state
PAUSED_SETTLING
  └─ explicit resume ─> RESUME_COUNTDOWN ─> SETTLING
FINISHED_DRAW / FINISHED_WIN
  ├─ rematch ─> COUNTDOWN
  └─ change image ─> SETUP
```

### 6.2 状态定义

| 状态 | 可移动 | 计入有效用时 | 可换图 | 说明 |
| --- | --- | --- | --- | --- |
| `setup` | 否 | 否 | 是 | 默认进入；可处理本地图片 |
| `countdown` | 否 | 否 | 否 | 3、2、1；输入全部忽略 |
| `racing` | 是 | 是 | 否 | 双方独立移动 |
| `settling` | 仅未完成方 | 是 | 否 | 第一方完成后的 100 ms 窗口 |
| `paused` | 否 | 否 | 否 | hidden/blur 触发 |
| `resume-countdown` | 否 | 否 | 否 | 明确恢复后的短倒计时 |
| `finished` | 否 | 否 | 通过“换图”返回 setup | 胜负已确定 |

### 6.3 暂停数据

暂停时必须记录：

- `pausedFrom`：暂停前状态。
- `pauseStartedAt`：单调时间。
- `accumulatedPausedMs`：累计暂停时间。
- 若从 `settling` 暂停，记录 `settlementRemainingMs`，恢复时不能把后台时间算入 100 ms。

窗口重新获得焦点但页面仍 hidden，或页面 visible 但尚未 focus 时，不自动恢复。用户点击“继续比赛”后才进入 3、2、1 的短倒计时；短倒计时不计入有效用时。

## 7. 数据模型

### 7.1 常量

```js
const GRID_SIZE = 3;
const TILE_COUNT = 9;
const BLANK_TILE = 0;
const SHUFFLE_STEPS = 96;
const MIN_MANHATTAN_DISTANCE = 12;
const SETTLEMENT_WINDOW_MS = 100;
const MAX_FILE_BYTES = 20 * 1024 * 1024;
const MAX_IMAGE_SIDE = 6000;
const MAX_IMAGE_PIXELS = 24_000_000;
const MIN_IMAGE_SHORT_SIDE = 600;
const OUTPUT_SIDE = 1200;
```

### 7.2 棋盘

```js
{
  tiles: [1, 2, 3, 4, 5, 6, 7, 8, 0],
  blankIndex: 8,
  moves: 0,
  solvedAt: null,
  locked: false
}
```

约束：

- `tiles` 恰有 9 个互不重复整数 0–8。
- `blankIndex === tiles.indexOf(0)`。
- 完成态严格为 `[1,2,3,4,5,6,7,8,0]`。
- 无效移动不改变数组、空格、步数或完成时间。
- 有效移动只交换空格和一个曼哈顿距离为 1 的相邻块。

### 7.3 比赛

```js
{
  phase: "setup",
  seed: null,
  initialTiles: null,
  left: createBoard(),
  right: createBoard(),
  raceStartedAt: null,
  accumulatedPausedMs: 0,
  firstFinisher: null,
  settlementDeadline: null,
  result: null
}
```

`result`：

```js
{
  outcome: "left" | "right" | "draw",
  left: { elapsedMs: number | null, moves: number },
  right: { elapsedMs: number | null, moves: number },
  settledAt: number
}
```

未完成方的 `elapsedMs` 为 `null`，界面显示“未完成”，不得显示成第一方用时或结算时长。

### 7.4 图片

```js
{
  kind: "builtin" | "local",
  activeUrl: string | null,
  generation: number,
  status: "ready" | "loading" | "error",
  errorCode: string | null
}
```

- `generation` 每次开始选择时递增。
- 异步解码完成时，只有任务持有的 generation 仍等于当前 generation 才可提交结果。
- 内置图也生成游戏专用 Blob URL，保证同一渲染路径。
- 页面内只允许一个 active URL；左右棋盘共享。

## 8. 纯逻辑 API

`logic.js` 至少导出：

```js
createSeededRandom(seed)
createSolvedTiles()
getLegalBlankMoves(blankIndex, size)
moveBlank(tiles, direction, size)
moveTileAt(tiles, tileIndex, size)
isSolved(tiles)
isValidPermutation(tiles)
manhattanDistance(tiles, size)
shuffleFromSolved(seed, options)
createBoard(tiles)
applyMove(board, direction, timestamp)
calculateElapsed(startedAt, solvedAt, pausedMs)
resolveFinish(first, second, windowMs)
```

语义：

- 函数不读写 DOM、计时器、存储或网络。
- 不修改传入数组和对象；返回新值或明确失败结果。
- 随机函数只由显式 seed 决定。
- `moveBlank` 的方向为 `up/down/left/right`，描述空格移动。
- `moveTileAt` 只在目标块与空格相邻时成功。
- `applyMove` 在锁定或已完成棋盘上返回无变化。

推荐返回形式：

```js
{
  changed: true,
  value: nextBoard,
  reason: null
}
```

无效时：

```js
{
  changed: false,
  value: originalBoard,
  reason: "out-of-bounds" | "not-adjacent" | "locked" | "solved"
}
```

## 9. 可解洗牌协议

### 9.1 算法

1. 从完成态开始。
2. 用 seed 初始化确定性伪随机数。
3. 执行 96 个合法空格移动。
4. 候选方向中排除“立即反向”方向；若排除后为空才允许全部方向。
5. 检查候选排列：
   - 不是完成态。
   - `manhattanDistance >= 12`。
6. 不满足则从派生 seed 再试，最多 32 次。
7. 仍失败属于逻辑错误，返回受控失败；不能静默使用完成态。

### 9.2 公平复制

- 一局只调用一次洗牌生成 `initialTiles`。
- 左右棋盘分别以 `initialTiles.slice()` 初始化。
- UI 不得为两方分别洗牌。
- 测试需证明两个数组内容相同但引用不同。

### 9.3 不声称最优解

曼哈顿距离只用于排除过近局面，不代表局面的最少步数，也不在界面显示“难度分”。首版不实现求解器。

## 10. 输入契约

### 10.1 键盘映射

| 玩家 | 按键 | 空格方向 |
| --- | --- | --- |
| 左方 | W | up |
| 左方 | A | left |
| 左方 | S | down |
| 左方 | D | right |
| 右方 | ArrowUp | up |
| 右方 | ArrowLeft | left |
| 右方 | ArrowDown | down |
| 右方 | ArrowRight | right |

规则：

- 只在 `racing` 或允许未完成方输入的 `settling` 处理。
- `event.repeat === true` 时忽略。
- `metaKey`、`ctrlKey` 或 `altKey` 任一为 true 时忽略。
- 事件目标为 `input`、`button`、`select`、`textarea` 或可编辑内容时，不作为全局快捷键。
- 确认被比赛处理后才调用 `preventDefault()`。
- 每个 `keydown` 最多产生一步。

### 10.2 点击与触控

- 八个有图方块为原生 `button`，空格是非交互占位。
- 只有与空格相邻的按钮点击后移动。
- 非相邻按钮保持可聚焦，用其名称表达不可移动；激活时仅给受控反馈，不计步。
- 不监听拖拽手势。
- 不在 `pointerdown` 直接提交移动；由原生 click 激活，保证按下后移出可取消。

### 10.3 同时输入

浏览器会顺序派发事件。只要双方在 `racing`，各自事件只修改自己的棋盘；第一方完成并进入 `settling` 后，另一方仍可在窗口内移动。不能因第一方完成就同步锁住另一方。

## 11. 完成与计时

### 11.1 有效用时

```text
elapsed = solvedAt - raceStartedAt - accumulatedPausedMs
```

使用 `performance.now()` 产生所有比赛时间戳。不得混用 `Date.now()`。

### 11.2 完成检测

每次有效移动后：

1. 检查该方是否完成。
2. 若未完成，渲染并结束。
3. 若完成，记录这次事件的 `timestamp` 为 `solvedAt` 并锁住该方。
4. 若没有第一完成者，进入 `settling`，设 deadline。
5. 若已有第一完成者，计算时间差并立即结算并列或胜者。

### 11.3 结算计时器

`setTimeout` 只负责唤醒检查，不作为事实来源。回调执行时再次读取 `performance.now()` 并与 deadline 比较；若未到 deadline，重新安排剩余时间。暂停时取消计时器并保存剩余窗口。

### 11.4 显示

- 进行中计时器更新可使用 `requestAnimationFrame`。
- 只显示到 0.1 秒，例如 `12.3 秒`。
- 逻辑保留浮点毫秒，不用显示值决定胜负。
- 结果同时显示步数。

## 12. 图片处理规格

### 12.1 选择与预检查

文件输入：

```html
<input type="file" accept="image/jpeg,image/png,image/webp">
```

运行时：

1. 没有文件：视为用户取消，不报错。
2. MIME 不在允许列表：`unsupported-type`。
3. 大于 20 MiB：`file-too-large`。
4. 递增 generation，状态设为 loading。
5. 禁用开始按钮，当前图片继续可见。

`accept` 不是安全校验。

### 12.2 解码

要求：

```js
createImageBitmap(file, { imageOrientation: "from-image" })
```

若 API 缺失或抛错：

- `decode-failed` 或 `unsupported-browser`。
- 关闭已产生的 bitmap。
- 不替换 active URL。
- 保留当前图和可玩性。

尺寸校验基于方向处理后的 bitmap：

- `Math.min(width, height) >= 600`
- `Math.max(width, height) <= 6000`
- `width * height <= 24_000_000`

### 12.3 中心裁切与输出

- `sourceSide = min(width, height)`。
- `sourceX = (width - sourceSide) / 2`。
- `sourceY = (height - sourceSide) / 2`。
- 输出 Canvas 设为 `min(1200, sourceSide)` 的正方形。
- 使用 `drawImage` 一次完成中心裁切和缩放。
- 使用 `toBlob` 输出 JPEG，quality 0.9。
- `toBlob` 返回 null 视为 `encode-failed`。
- Canvas 输出只取位图像素，不主动复制源文件元数据。

### 12.4 提交与清理

成功候选：

1. 为新 Blob 创建 `candidateUrl`。
2. 再次检查 generation。
3. 若已过期，立即 revoke candidate。
4. 若有效，先让预览和棋盘引用 candidate。
5. 下一帧确认引用切换后，解除旧 URL 的元素引用并 revoke 旧 URL。
6. 更新 active URL 和 kind。

所有路径在 `finally` 中调用 `bitmap.close()`。清理函数允许重复调用，不抛错。

事件：

- “恢复内置图”：重新生成内置图，成功后替换。
- 再次选图：旧图保持直到新图成功。
- `pagehide` / `beforeunload`：解除引用并 revoke。

### 12.5 隐私静态禁令

生产目录中不得出现：

- `fetch(`
- `XMLHttpRequest`
- `WebSocket`
- `<form action=`
- `navigator.sendBeacon`
- `localStorage`
- `sessionStorage`
- `indexedDB`
- `caches.`
- `serviceWorker`
- 远程 `http://` 或 `https://` 资源 URL

README 的来源链接可以是文本链接，但运行时页面不得加载它们。

## 13. 原创默认图规格

默认图通过 Canvas 程序绘制，不存放第三方位图资源。

必须包含：

- 1200×1200 正方形。
- 深色渐变背景。
- 左下暖金行星、右上珊瑚行星。
- 至少两条跨多个格子的轨道曲线。
- 各九宫格区域有不同可定位细节。
- 中心双星标记。

不得：

- 使用外部字体、图标、贴图或复制现有作品构图。
- 依赖随机到每次都不同；同一版本默认图应稳定，便于截图验收。

## 14. UI 与响应式规格

### 14.1 桌面

- arena 为三列：左棋盘 / 中央信息 / 右棋盘，或在视觉上等价的对称布局。
- 两块棋盘边长相同。
- 双方标签、计时和步数占位尺寸相同，内容变化不得使棋盘位移。

### 14.2 窄屏

在 390×844 和 320×568：

- 两块棋盘仍左右并列。
- 页面无横向滚动。
- 比赛开始后无需滚动即可同时看到两块完整棋盘和当前状态。
- 每个图块点击目标至少 44×44 CSS px；若 320 px 实际布局无法满足，本项目验收为 Conditional，不得静默降到更小。
- 可缩短玩家文案和装饰，但不能隐藏一方计时、胜负或棋盘。

### 14.3 视觉反馈

- 左方暖金、右方珊瑚，同时辅以文字和不同徽记。
- 可移动块可有轻微边框提示，不改变点击目标。
- 非法移动不抖动整个页面；可短暂高亮空格或显示“只能移动空格旁边的一块”。
- 完成方棋盘显示完成边框并锁定。
- 胜负不能只靠颜色表达。

### 14.4 动效

默认：

- 方块移动 120–180 ms。
- 倒计时可有轻微缩放。
- 结果进入可淡入。

`prefers-reduced-motion: reduce`：

- 方块无位移动画。
- 倒计时不缩放。
- 结果直接出现。
- 不改变倒计时长度、结算窗口或胜负。

## 15. 可访问性规格

- 文档语言为 `zh-CN`。
- 标题层级连续。
- 所有操作使用原生按钮或输入控件。
- 每块棋盘由独立命名的 `section` 包裹。
- 不使用 `role="grid"`；首版保留原生 Tab 行为。
- 图块名称格式：

```text
原图第 2 行第 3 列；现在第 1 行第 2 列；可移动
```

- 空格以 `aria-hidden="true"` 的视觉占位实现，棋盘说明另行告知空格位置。
- 状态 live region 使用 `aria-live="polite"`、`aria-atomic="true"`。
- 倒计时视觉变化之外同步提供可读文本。
- 焦点指示至少 2 px，不能被 overflow 裁掉。
- 正文、按钮和状态文本达到 WCAG AA 对比度目标。
- 200% 浏览器缩放下功能可用。
- 页面不禁用缩放。

## 16. 文案契约

必须出现：

- 标题：“同一张，谁先拼回”
- 规则：“方向键表示空格移动方向。”
- 隐私：“照片只在当前页面处理，不上传，也不保存。”
- 权利提示：“请选择你自己拍摄、已获授权或有权使用的照片。”
- 支持格式与上限：“JPEG / PNG / WebP，最大 20 MiB。”
- 并列：“十分之一秒内，同时拼回来了。”

错误信息必须告诉用户下一步：

| 错误码 | 用户信息 |
| --- | --- |
| `unsupported-type` | 请选择 JPEG、PNG 或 WebP 图片。当前图片没有改变。 |
| `file-too-large` | 图片超过 20 MiB，请换一张更小的。当前图片没有改变。 |
| `dimensions-too-small` | 图片短边至少需要 600 像素。当前图片没有改变。 |
| `dimensions-too-large` | 图片边长或总像素过大，请先缩小。当前图片没有改变。 |
| `unsupported-browser` | 当前浏览器不能可靠处理这张照片，你仍可使用内置图比赛。 |
| `decode-failed` | 没能读取这张图片，请换一张。当前图片没有改变。 |
| `encode-failed` | 没能准备游戏图片，请重试。当前图片没有改变。 |

不向用户显示堆栈、Blob URL、原文件名或内部异常文本。

## 17. 借鉴与权利声明

README 必须包含：

```text
## 借鉴声明

本项目为独立实现。首版未复制或改编任何开源滑块拼图项目的代码、视觉素材或规则文本。
实现依据为公开的 Web 标准；标准链接仅用于说明浏览器能力，不构成项目代码来源。
```

同时包含：

- 内置图由本项目代码原创生成。
- 用户只能选择自己有权使用的照片。
- 照片本地处理不改变原有权利归属。

若实现阶段确实引入参考，必须在合并前替换上述声明，逐项写明：

- 项目名和 URL。
- 许可证。
- 借鉴内容。
- 本项目的改写边界。
- 是否包含代码或素材。

没有事实依据时不得虚构开源参考。

## 18. 逻辑测试验收

`logic.test.js` 至少覆盖：

### 18.1 排列

- 完成态合法。
- 重复、缺失、越界、长度错误的排列不合法。
- 空格四角、四边、中心的合法方向正确。
- 越界移动无变化。
- 相邻点击成功，非相邻点击失败。
- 每个有效移动保持合法排列。

### 18.2 完成与距离

- 只认精确完成顺序。
- 曼哈顿距离忽略空格。
- 已完成棋盘距离为 0。

### 18.3 洗牌

- 相同 seed 得到相同结果。
- 不同代表 seed 至少产生两个不同结果。
- 结果合法、可由合法轨迹到达。
- 结果不是完成态。
- 距离达到门槛。
- 左右初始化内容相同但数组/对象引用独立。
- 1000 个固定 seed 不返回失败。

### 18.4 移动

- 有效移动步数加一。
- 无效移动步数不变。
- 锁定和已完成状态拒绝移动。
- 输入方向语义与空格一致。

### 18.5 时间与结算

- 暂停时间从有效用时扣除。
- 负用时被拒绝或规范为逻辑错误。
- 时间差 `<100`、`=100` 按规格边界测试；定义为 `<=100 ms` 并列。
- 超过 100 ms 第一方获胜。
- 左右交换输入得到对称结果。
- 未完成方 elapsed 为 null。

## 19. 浏览器测试验收

使用项目既有浏览器测试方式，至少覆盖：

1. 默认图无需文件即可开局。
2. 倒计时前按键不移动。
3. 左键位只移动左棋盘，右键位只移动右棋盘。
4. `event.repeat` 不连移。
5. 点击相邻块有效，点击非相邻块无效。
6. 双方初始排列 DOM 表达相同。
7. 第一方完成后另一方在窗口内仍可输入。
8. 胜、负、并列三种结果可通过受控时间或逻辑注入验证。
9. hidden/blur 进入暂停；未明确恢复不继续。
10. 恢复短倒计时不计时。
11. 有效本地图片被中心裁切并用于两块棋盘。
12. 错误格式、超限和解码失败不替换当前图。
13. 快速连续选图只有最后一次生效。
14. 重复换图时旧 Object URL 被 revoke，当前 URL 未提前 revoke。
15. `pagehide` 清理当前 URL。
16. 结果后 rematch 保持图片但生成新共同局面。
17. 换图返回 setup，比赛输入失效。

如果自动化无法直接导航 `file://`，可在 localhost 完成上述交互，但仍需单独做人工双击验收。

## 20. 响应式与可访问性验收

视口：

- 1440×900
- 1024×768
- 390×844
- 320×568

逐个验证：

- 无横向滚动。
- 左右棋盘等大、同时完整可见。
- 320 px 下点击目标不小于 44×44。
- 焦点环清晰且不裁切。
- 仅键盘可完成两方棋盘操作。
- Tab 能到达所有设置、图块和结果操作。
- live region 会宣告倒计时、暂停和结果。
- 减少动态模式无移动动画。
- 200% 缩放仍可开始、操作和重开。

## 21. 本地点开验收

人工从文件管理器双击目标 `index.html`，在断网条件下：

1. 页面无缺失资源。
2. 使用内置图完成一次比赛。
3. 使用一张含方向元数据的竖图开始一次比赛，显示方向正确。
4. 换图后再来一场。
5. 刷新页面，确认没有恢复照片或成绩。
6. 开发者工具确认无网络请求错误或远程资源尝试。

需要保留验收记录。HTTP 自动化通过不能替代这一步。

## 22. 仓库级验证

实现完成后必须通过：

```bash
npm run verify
git diff --check
```

另外对生产目录做静态扫描：

```bash
rg -n \
  'https?://|fetch\\(|XMLHttpRequest|WebSocket|sendBeacon|localStorage|sessionStorage|indexedDB|serviceWorker|caches\\.' \
  experiences/versus/photo-slider-race
```

允许 README 中存在说明性标准链接；必须人工确认命中只属于文档，不是运行时资源或 API。

## 23. 验收判定

### Go

所有逻辑、浏览器、响应式、隐私扫描和人工 `file://` 验收通过；没有高严重度未解决缺陷。

### Conditional

核心玩法可用，但出现以下任一项：

- 照片方向只在部分目标浏览器可靠。
- 320 px 点击目标无法达到 44×44。
- 自动化不能证明 Blob URL 清理或后台暂停。
- 人工 `file://` 尚未执行。

Conditional 项目不得标为完全完成，必须在 bugs 中记录真实问题及复现/解决状态。

### No-Go

- 默认开局依赖网络。
- 用户照片被上传或持久化。
- 双方局面不同或存在输入串线。
- 洗牌可能不可解。
- 使用未声明、无权或许可证不兼容的第三方代码/素材。

## 24. 规格冻结摘要

首版只有一个玩法：原创默认图或单张本地照片、固定 3×3、同局双板、同时竞速。公平性由同一可解排列、隔离输入、单调时钟、暂停协议与 100 ms 并列窗口共同定义。隐私由无网络、无存储、受限解码、派生图和 Object URL 生命周期共同定义。任何新增功能都不能绕过这些契约。
