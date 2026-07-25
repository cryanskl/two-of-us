# 「七片同心」产品与技术规格

> 正式 ID：`seven-piece-duet`
>
> 历史候选代号：`tangram-heart-duet`
>
> 分类 / 等级：`co-op` / A
>
> 设备：同一设备、同屏，两席合作
>
> 状态：**Conditional Go**
>
> 上游文档：[`326 research`](./326-tangram-heart-duet-research.md)、[`327 brainstorm`](./327-tangram-heart-duet-brainstorm.md)

## 1. 产品定义

两位玩家各守 A、B 一席，只能通过本席 action 操作本局归属的三片或四片；双方在同一块公开板上以整数格点平移、90° 旋转和有限翻面，让全部七片无重叠、无越界地精确铺满四个原创轮廓。

“席位归属”是 UI 与 reducer 的权限隔离，不是自然人身份认证。页面不得宣称能阻止一个人伸手使用另一席控件。

## 2. 首版范围

### 2.1 必须实现

- 直接双击作品目录 `index.html` 可完整完成四形；
- 四个固定、原创、可解且在平移/旋转/镜像归一化后互异的目标；
- 七片固定凸多边形，全部由独立整数格元推导；
- 面积各半的 `fine` 四片组和 `bold` 三片组；
- 四局归属日程 `AB → BA → AB → BA`；
- 同一共享目标，无轮次、无计时、无个人分；
- 每席最多一个 draft，可同时预览；
- 选择、整数格点平移、四分之一转、平行四边形翻面、提交、取消；
- 已提交片可由所属席重新拿起调整；
- 越界、重叠、非法归属和非法动作无损失败；
- Pointer/鼠标和完整键盘路径；
- 语义状态、非颜色信息、焦点、reduced motion、forced colors；
- 零网络、零存储、零权限、零运行依赖；
- README、ATTRIBUTION、规则测试和浏览器验收。

### 2.2 明确不做

- 心形首关、心形主视觉或仅有一个心形题面；
- 照片、文件选择、摄像头、题面上传或关卡编辑器；
- 联网、房间、二维码、跨设备、账号、姓名输入；
- 计时、排行榜、个人分、移动数排名或“最后一片”奖励；
- 严格轮流、同步确认、共享一片的双人合力；
- 提示、自动求解、撤销历史、随机题面；
- 自由角度或 45° 旋转、连续物理、惯性、碰撞引擎；
- 音频、振动、第三方图标、字体、图片或代码；
- localStorage、sessionStorage、IndexedDB、Cache API、Service Worker；
- 对自然人身份或“绝对不可代操”的承诺；
- 共享 catalog、Board、根 README 的集成修改。

## 3. 目录与运行合同

目标目录：

```text
experiences/co-op/seven-piece-duet/
├── index.html
├── styles.css
├── geometry.js
├── targets.js
├── logic.js
├── app.js
├── config.js
├── geometry.test.js
├── logic.test.js
├── README.md
└── ATTRIBUTION.md
```

约束：

- HTML 使用相对路径和经典 `<script src>`，加载顺序为 `geometry.js`、`targets.js`、`logic.js`、`config.js`、`app.js`；
- `geometry.js`、`targets.js`、`logic.js` 以仓库既有 `globalThis` 工厂方式同时服务浏览器和 Node 测试；
- 无 ESM、动态 import、`fetch()`、XHR、WebSocket 或 Blob 模块；
- 无项目私有安装命令、构建步骤或 `package.json` 运行依赖；
- SVG/CSS 为完整视觉，不加载外部资产；
- 项目目录可脱离统一门户单独复制和运行；
- 首次实现不修改 `shared/`，待第二个项目证明整数三角格元接口稳定后再讨论提取。

## 4. 精确几何合同

### 4.1 坐标与原子三角形

逻辑坐标是整数笛卡尔格。最小规则单元是面积 `1/2` 的直角等腰三角形，三个顶点均为整数点。

顶点：

```js
{ x: integer, y: integer }
```

三角形 key：

1. 拒绝重复顶点、非整数和面积绝对值不等于 `1/2` 的输入；
2. 将三个顶点转为 `"x,y"`；
3. 以数值 `(x, y)` 升序排序，而不是依赖字符串字典序；
4. 连接为 `"x1,y1|x2,y2|x3,y3"`。

逻辑中的 shape 是无重复三角形 key 的有序冻结数组；构造时先去重，再按每个顶点数值序列排序。所有集合相等和 fingerprint 都基于此规范序列。

### 4.2 精确变换

变换顺序固定为：

1. 若 `flipped`，对原始局部点执行镜像 `(x, y) → (-x, y)`；
2. 执行 `quarterTurns` 次顺时针四分之一转 `(x, y) → (-y, x)`；
3. 执行整数平移 `(x, y) → (x + tx, y + ty)`；
4. 重新规范化三角形 key 和 shape 顺序。

`quarterTurns` 只接受整数 `0..3`，不得暗中取模畸形输入。`tx/ty` 只接受目标声明的有限 board bounds 内整数。`flipped === true` 只允许 `pieceId === "parallelogram"`；其他片的 true 输入是拒绝，不是忽略。

首版不允许 45° 旋转。四分之一转能保持整数格和原子三角形闭包，确保判定不依赖 `Math.sin`、`Math.cos`、epsilon 或像素舍入。

### 4.3 七片模板

模板必须由下列独立几何构造推导，不从任何上游源码、题面或坐标表复制：

| piece ID | 形状定义 | 原子三角形数 | 面积组 |
| --- | --- | ---: | --- |
| `large-a` | 直角边长 2 的轴对齐等腰直角三角形 | 4 | `fine` |
| `large-b` | 与 `large-a` 全等的独立片 | 4 | `bold` |
| `medium` | 直角边长 `√2`、整数顶点的等腰直角三角形 | 2 | `fine` |
| `small-a` | 单个原子三角形 | 1 | `fine` |
| `small-b` | 单个原子三角形 | 1 | `fine` |
| `square` | 边长 1 的轴对齐正方形 | 2 | `bold` |
| `parallelogram` | 底、高均为 1、斜移 1 的平行四边形 | 2 | `bold` |

总计 16 个原子三角形。`fine = 4 + 2 + 1 + 1 = 8`，`bold = 4 + 2 + 2 = 8`。

生产实现必须在 `geometry.test.js` 证明：

- 七个模板各自没有重复格元；
- 原子数为 `4,4,2,1,1,2,2`；
- 外边界凸且非退化；
- 四分之一转前后 key 数不变；
- 平行四边形翻面前后 key 数不变且不能只靠四分之一转得到；
- 其他片的镜像姿态不进入公开动作表；
- 两组面积严格相等。

表中定义是本项目的独立数学规格，不是对调研上游坐标的转写。

### 4.4 目标数据

每个目标：

```js
{
  id: "embrace",
  title: "相拥",
  board: { minX, minY, maxX, maxY },
  cells: ["canonical-triangle-key", "..."], // 恰好 16 个
  solution: {
    "large-a": { tx, ty, quarterTurns, flipped: false },
    "...": {}
  },
  fingerprint: "..."
}
```

目标冻结为：

1. `embrace` / 相拥：教学，紧凑；
2. `side-by-side` / 并肩：横向交错；
3. `echo` / 回响：要求平行四边形翻面；
4. `interlock` / 相扣：非对称综合题。

名称不授权临摹常见人物、船、动物或其他网络七巧板轮廓。实现阶段先组合七片的原创标准解，再从其并集生成 target；不能先下载轮廓再拟合。

每个目标必须通过：

- `cells.length === 16` 且无重复；
- solution 恰好包含七个 piece ID；
- 每个 solution pose 合法；
- 七片互不重叠且并集严格等于 target；
- target 以整条原子边 edge-connected；
- 无完全包围的内部空洞；
- bounding box 不超过冻结移动板范围；
- 标准解中 A/B 两组至少各有一条边与另一组接触；
- 至少一形使用 `parallelogram.flipped === true`；
- 不是简单正方形复原；
- 四个 fingerprint 互异。

### 4.5 目标 fingerprint

对 target cells 执行二面体群 D4 的八种变换：四次四分之一转，各自含/不含镜像。每种变换后：

1. 平移使全部顶点的最小 `x` 和最小 `y` 都为 0；
2. 规范化并排序全部 triangle key；
3. 用 `;` 连接为字符串。

取八个字符串中字典序最小者作为 fingerprint。这里字典序只用于已经规范化的最终字符串；顶点排序仍用数值比较。

四目标 fingerprint 必须不同。内容审计还需人工排除知名角色、标志和仓库已有强识别轮廓；数学不同不等于表达一定安全。

## 5. 权威状态

```js
{
  phase: "intro" | "playing" | "round-complete" | "match-complete",
  roundIndex: 0,
  revision: 0,
  pieces: [
    {
      id: "large-a",
      owner: "A",
      committedPose: null
    }
  ],
  drafts: {
    A: null,
    B: null
  },
  completedRounds: [],
  noticeSerial: 0,
  notice: null
}
```

draft：

```js
{
  pieceId: "large-a",
  pose: { tx: 0, ty: 0, quarterTurns: 0, flipped: false },
  origin: "tray" | "board"
}
```

notice：

```js
{
  seat: "A" | "B" | null,
  code: "selected" | "placed" | "cancelled" | "wrong-owner" |
        "out-of-bounds" | "overlap" | "invalid-action" |
        "round-complete" | "match-complete",
  pieceId: string | null,
  conflictPieceId: string | null
}
```

不进入权威状态：

- DOM/SVG 节点、CSS 像素、DPR、Pointer 坐标；
- pointerId、capture、generation、hover；
- 真实时间、动画帧、随机数；
- `Set`、`Map`、函数、Error 或浏览器对象；
- live region 文本和本地化后的句子。

state 和所有嵌套值深冻结。公开构造与 transition 不修改输入。`revision` 每次有效状态变化加 1；畸形或完全无效 action 返回同一 state 引用，且不增加 revision。

## 6. 归属日程

组：

```text
fine = large-a, medium, small-a, small-b
bold = large-b, square, parallelogram
```

四局：

| roundIndex | A 席 | B 席 | target |
| ---: | --- | --- | --- |
| 0 | fine | bold | `embrace` |
| 1 | bold | fine | `side-by-side` |
| 2 | fine | bold | `echo` |
| 3 | bold | fine | `interlock` |

`createInitialState()` 使用第 0 局归属。`NEXT_ROUND` 只在 `round-complete` 接受，并从目标标准初始托盘状态新建 pieces/drafts；上一局 pose 不继承。第四局完成进入 `match-complete`。

## 7. Action 与 transition

### 7.1 Action 形状

```js
{
  type: "START" | "SELECT" | "MOVE_DRAFT" | "ROTATE_DRAFT" |
        "FLIP_DRAFT" | "COMMIT_DRAFT" | "CANCEL_DRAFT" |
        "RESTART_ROUND" | "NEXT_ROUND" | "RESTART_MATCH",
  revision: integer,
  seat: "A" | "B",
  pieceId: string,
  dx: integer,
  dy: integer,
  direction: -1 | 1
}
```

只读取该 type 白名单字段；未知字段、getter、污染原型或非普通记录拒绝。`revision` 必须等于当前 state revision，防止 Pointer 迟到提交覆盖新状态。

### 7.2 状态转换

- `START`：仅 `intro → playing`，建立第 0 局；
- `SELECT`：仅 playing；piece owner 必须等于 seat；本席已有另一 draft 时拒绝；选择已放片时 draft 复制 committedPose，但原 committedPose 暂时保留；
- `MOVE_DRAFT`：仅本席 draft；`dx/dy` 必须各为 `-1/0/1` 且不同时为 0；一次移动一个格点；
- `ROTATE_DRAFT`：`direction` 为 `-1/1`，更新四分之一转；
- `FLIP_DRAFT`：只对平行四边形；
- `COMMIT_DRAFT`：候选合法则替换该片 committedPose 并清 draft；非法则 committedPose 不变、清 draft，并产生稳定 notice；
- `CANCEL_DRAFT`：清本席 draft，committedPose 不变；
- `RESTART_ROUND`：playing 或 round-complete 可用，重建本局且保留 roundIndex；
- `NEXT_ROUND`：只在 round-complete；进入下一局或拒绝；
- `RESTART_MATCH`：任何 phase 可用，深相等回到首次加载状态。

同席不能同时持有两片；两席可以各有一个 draft。同一个 piece 永远只能由其 owner 席建立 draft。

### 7.3 提交合法性

验证候选片时：

1. 用第 4 节精确变换生成 `candidateCells`；
2. 数量必须等于该片模板数；
3. 每个 cell 必须存在于 target cells；
4. 汇总其他所有 committed piece cells，排除正在提交片的旧 committedPose；
5. candidate 与其他 committed cells 的交集必须为空。

合法则提交。非法 reason 优先级冻结为：

```text
invalid-action
wrong-owner
out-of-bounds
overlap
```

若既越界又重叠，报告 `out-of-bounds`。不以对象遍历顺序决定 reason。重叠时 `conflictPieceId` 取固定 piece 顺序中第一个发生交集的 ID。

### 7.4 完成

每次合法 COMMIT 后检查：

1. 七片 committedPose 均非 null；
2. 每片 transformed cells 均是 target 子集；
3. 任意两片 cells 交集为空；
4. 七片 cells 并集规范序列与 target cells 深相等。

满足则进入 `round-complete`、清两席 draft 并锁定拼片动作。前三局等待显式 NEXT_ROUND；第四局进入 `match-complete`。

完成不依赖动画结束、时间、像素覆盖率或面积 epsilon。

## 8. 纯逻辑 API

### 8.1 `geometry.js`

至少导出：

```js
canonicalVertex(vertex)
triangleArea2(vertices)
canonicalTriangle(vertices)
canonicalShape(triangles)
transformVertex(vertex, pose)
transformShape(shape, pose)
intersectShape(left, right)
isSubsetShape(candidate, target)
unionShapes(shapes)
fingerprintShape(shape)
getPieceTemplate(pieceId)
validatePieceTemplates()
validateTarget(target)
```

约束：

- 不读 DOM、环境、时间、随机或网络；
- 输入畸形返回稳定错误结果或抛规格冻结的 `TypeError/RangeError`，同一 API 不混用两种策略；
- 返回数组与内部常量断开并深冻结；
- 不使用 JSON stringify 假装验证 getter/原型污染；
- 不导出可修改内部模板的引用。

### 8.2 `targets.js`

至少导出：

```js
getTargets()
getTargetById(id)
getRoundSchedule()
validateAllTargets()
```

公开目标不需要隐藏 solution。作品是公开协作拼形，不存在阶段隐私；但 UI 不把标准解作为提示渲染。

### 8.3 `logic.js`

至少导出：

```js
createInitialState()
transition(state, action)
createAction(state, type, fields)
getPublicView(state)
getCommittedCells(state)
canCommitDraft(state, seat)
isRoundComplete(state)
```

`getPublicView` 可公开目标、片 owner、committedPose、draft pose、phase、round 和 notice；不得暴露内部可修改引用。由于没有秘密状态，public view 的目的只是隔离 UI 与 reducer，而不是安全边界。

## 9. Pointer、鼠标和触摸

### 9.1 会话

app 层每个活跃 Pointer 保存：

```js
{
  pointerId,
  generation,
  seat,
  pieceId,
  revisionAtDown,
  lastQuantizedCell
}
```

- `pointerdown` 只接受主按钮或触摸，并在成功 SELECT 后 capture；
- 同一 seat 已有 Pointer 会话时，新 Pointer 不接管；
- 同一 pointerId 的旧 generation 迟到事件不能释放新会话；
- `pointermove` 将 SVG client 坐标通过冻结 viewBox 逆变换量化到整数格点，仅派发达到新格点所需的离散 MOVE_DRAFT；
- 不把 CSS transform 后像素直接写入 state；
- `pointerup` 先核对会话 generation 和当前 draft，再 COMMIT；
- `pointercancel`、lost capture、blur、hidden、重开和换局只 CANCEL，不提交；
- 第三根手指不改变已有两席会话；
- 两席 Pointer 的 action 串行进入同一 reducer，revision 让迟到动作安全 no-op。

### 9.2 命中与滚动

- 拼片可见命中框在 320×568 与 390×844 至少 48×48 CSS px；
- 小三角形可使用透明但语义属于同一按钮的扩展 hit area，不能遮挡相邻片；
- 只在目标板的活跃拖动区设置必要 `touch-action`；
- 页面其他区域仍可纵向滚动和缩放；
- 不依赖 hover、双击、长按、右键或手势方向。

鼠标使用相同 Pointer 路径。单鼠标交错操作符合产品合同，不要求同时拖两片。

## 10. 键盘合同

- 页面加载后焦点先在“开始”按钮，不自动送入棋盘；
- 每片有原生按钮；Tab 可进入 A/B 托盘和已放片；
- Enter/Space 对未选片执行 SELECT，对本席已选片执行 COMMIT；
- 选中片后方向键每次移动一个逻辑格点，并阻止该次页面滚动；
- 左转、右转、翻面、放下、取消均为本席控制区中的原生按钮；
- 翻面按钮仅在选中平行四边形时可用，其他状态 disabled；
- Escape 在棋盘 draft 存在时 CANCEL；无 draft 时不劫持页面；
- 不设置全局 WASD/字母快捷键，不与输入法、浏览器查找或辅助技术争抢；
- action 的 seat 来自当前控制区/片 owner，不从颜色或最后触摸位置推断；
- 重渲染不替换已聚焦按钮；若片从托盘进入板，焦点在提交后转到该片新的板上按钮；
- round complete 后焦点移动到可见标题，再由用户 Tab 到“下一形”，不抢读屏浏览焦点。

只用键盘必须能完成四形，不要求物理键盘同时为两席输入。

## 11. DOM 与无障碍语义

稳定区域：

1. `header`：标题、规则、A 级隐私短句；
2. `round-summary`：第几形、目标名、当前归属；
3. `seat-a-panel`：A 席托盘和控制；
4. `board`：共享目标和已放片；
5. `seat-b-panel`：B 席托盘和控制；
6. `notice`：`role="status"` / polite live；
7. `round-result`：共同完成与下一形；
8. `help`：操作、同机席位说明、借鉴入口。

要求：

- 每片名称包含片名、所属席、当前位置状态和当前姿态；
- 目标剩余量可报告为“还差 N 个格元”，但拖动中不逐步播报；
- A/B 归属使用文字、圆点/短横标记、纹理、边框和颜色；
- 合法、越界、重叠和焦点不只用颜色；
- notice 只在 serial 改变时更新，不因每次 render 重复播报；
- 目标 SVG 有标题和当前完成摘要，不把每条内部格线暴露为可聚焦节点；
- 无障碍树中不存在视觉隐藏的标准解；
- `aria-disabled` 不能替代真正的 action 拒绝；reducer 始终验证权限和 phase。

## 12. 响应式、动效与视觉

### 12.1 布局

- `≥ 900px`：A 托盘 / 中央板 / B 托盘三列；
- `600..899px`：中央板在上，两席控制等宽双列在下；
- `< 600px`：A 托盘、中央板、B 托盘单列；选片时粘性小控制条可以出现，但不能遮住目标；
- 320×568 首屏可看到标题缩写、当前形、完整目标板和至少当前席控制入口；
- 横屏 844×390 可使用紧凑三列，不能把一席推到折叠面板后；
- 不出现玩法区横向滚动，不设置 `user-scalable=no`。

目标板 SVG 使用固定逻辑 viewBox；视觉缩放不改变 board bounds 或格元判定。

### 12.2 动效

允许：

- 120–180ms 的合法吸附；
- 非法提交的短轮廓提示；
- 完成时一次片缝收束。

禁止：

- 依赖动画完成回调推进 phase；
- 持续漂浮、摇屏、粒子雨；
- 颜色闪烁作为唯一错误反馈。

`prefers-reduced-motion: reduce` 下取消吸附插值、抖动和庆祝位移，状态即时投影。forced colors 下使用系统色、边框样式、标记和文字保持区分。

### 12.3 视觉去重

不得复用：

- `photo-swap-puzzle` 的照片九宫格；
- `moving-home-together` 的家居/纸箱/S 形路线；
- `dual-maze-race` 的双盘、跑道、计时牌；
- `tethered-heart` 的丝带、布艺心、针脚、刺绣绷；
- `constellation-relay` 的星点连线。

生产视觉只用本项目原创 SVG 几何、纹理和文案。

## 13. Config

`config.js` 只允许：

```js
{
  seatALabel: "A 席",
  seatBLabel: "B 席",
  intro: "各守一组片，一起铺满同一个轮廓。",
  completion: "七片刚好合上了。"
}
```

- 不提供姓名输入 UI；
- 缺失、畸形或抛错 formatter 使用完整默认值；
- 输出只经 `textContent`；
- config 不改变 piece owner、目标、规则、顺序或测试；
- 不读取 URL query/hash、存储或远程数据。

## 14. A 级、依赖和隐私

### 14.1 依赖

运行依赖：**0**。开发依赖：**不新增**。

使用原生 HTML/CSS/SVG/JavaScript、Pointer Events 和仓库现有 Node/浏览器验收工具。禁止引入 jQuery、jQuery UI、Konva、多边形布尔库、物理引擎、拖拽库、图标库或构建器。

### 14.2 本地合同

- `file://` 下经典脚本正常加载；
- 不需要 localhost 才能使用的 API；
- 无远程 URL、模块 MIME、CORS 或服务器路由；
- 统一门户和 catalog 不存在时，作品仍完整；
- 自动化 localhost 验收不能替代人工双击 `file://` 四局。

### 14.3 隐私

- 不收集文件、姓名、按键、Pointer 轨迹、完成状态或设备信息；
- 不联网、不上传、不提交表单；
- 不持久化、不缓存、不写 cookie；
- 不请求摄像头、麦克风、定位、通知、剪贴板、振动或全屏权限；
- 页面关闭后没有本项目持有的数据；
- README 不使用“绝对安全”等超范围表述。

## 15. 借鉴与原创声明

生产 README 和 ATTRIBUTION 必须写明：

- 主机制参考 [`shgalus/tangram@a5cdfdc9a85894bf58829fb4f4dbddcf22b41764`](https://github.com/shgalus/tangram/tree/a5cdfdc9a85894bf58829fb4f4dbddcf22b41764)，[MIT](https://github.com/shgalus/tangram/blob/a5cdfdc9a85894bf58829fb4f4dbddcf22b41764/LICENSE)，Copyright (c) 2018 Stanisław Galus；只借鉴“七块几何片组成目标轮廓”的抽象机制；
- 工程边界对照 [`JozefJarosciak/BlockPuzzleSolver@f49e89f576186ec773ca21d0ee173175f36f75e9`](https://github.com/JozefJarosciak/BlockPuzzleSolver/tree/f49e89f576186ec773ca21d0ee173175f36f75e9)，[MIT](https://github.com/JozefJarosciak/BlockPuzzleSolver/blob/f49e89f576186ec773ca21d0ee173175f36f75e9/LICENSE.txt)，Copyright (c) Jozef Jarosciak；只比较 README 所述格约束、旋转和反射问题；
- Pointer 生命周期参考 [`w3c/pointerevents@238e8273305bb2e3c76f9f0bb289fb127c3dff74`](https://github.com/w3c/pointerevents/tree/238e8273305bb2e3c76f9f0bb289fb127c3dff74)，W3C Software and Document License，W3C contributors；
- 无障碍基线参考 [`w3c/wcag@07123b871c103268375880980fd715b2b26b2ff0`](https://github.com/w3c/wcag/tree/07123b871c103268375880980fd715b2b26b2ff0)，W3C Document License，W3C contributors。

明确声明没有复制、翻译、改写、打包或依赖上述来源的：

- 源码、API、算法实现、测试和参数；
- 片坐标、比例常量、目标轮廓、标准解、关卡和初始布局；
- HTML、CSS、DOM、UI、文案、名称和视觉；
- 图片、图标、字体、音频、截图和其他素材；
- jQuery、jQuery UI、Konva 或求解器依赖。

七片模板由本文整数几何独立推导，四个目标由本仓库生成并审计。若实施发现实质借用，写入生产代码前暂停，保存许可证正文、版权、notice、复制范围和修改说明，再重新执行权利与离线审查。

## 16. 自动测试 Gate

### 16.1 `geometry.test.js`

- 顶点、三角形、shape 畸形输入；
- 数值排序覆盖负数和两位数，禁止字符串排序错误；
- 三角形 key 对顶点排列不敏感；
- 七片数量、面积、凸性和两组面积；
- 四分之一转四次回到原 shape；
- translate/rotate/flip 不改原输入；
- 平行四边形 flip 独立，其他片拒绝 flip；
- subset、intersection、union 的空集、边接触和正面积重叠；
- D4 fingerprint 对平移、四分之一转和镜像不变；
- 四目标验证和 fingerprint 互异；
- 每个标准解精确覆盖目标。

### 16.2 `logic.test.js`

- 初态、深冻结、状态/目标引用隔离；
- START phase；
- 四局 owner 日程；
- A action 不能选 B 片，B action 不能选 A 片；
- 同席第二 draft 拒绝，两席 draft 可并存；
- MOVE/ROTATE/FLIP 边界和畸形输入；
- 迟到 revision、未知 action、getter/原型污染安全；
- 从 tray 和 board 选择、取消均保持 committedPose；
- 合法提交、越界、重叠和 reason 优先级；
- 冲突 piece ID 按固定顺序；
- 七片不全、留空、重叠、越界均不完成；
- 四个 golden replay 只用公开生产 action 完成；
- NEXT_ROUND、四局换组、最终完成；
- RESTART_ROUND 与 RESTART_MATCH；
- 同一 action log 深相等；
- public view 不泄露可修改引用。

### 16.3 静态扫描

- 无 `http://`、`https://` 运行资源；文档链接除外；
- 无 fetch/XHR/WebSocket/EventSource/sendBeacon；
- 无 local/sessionStorage、IndexedDB、Cache、Service Worker、cookie 写入；
- 无 ES Module、动态 import、CDN 或新增依赖；
- 无调研上游源码、文件名、函数名、坐标、题面、截图或素材；
- ATTRIBUTION 固定 URL、commit、license、copyright、借鉴/未借鉴边界齐全。

## 17. 浏览器验收 Gate

### 17.1 功能

- 鼠标从 intro 完成第一形；
- 只用键盘完成至少一形，并验证 Tab、Enter/Space、方向键、旋转、翻面、取消；
- 两枚真实触点分别操作 A/B 一片并同时形成 draft；
- 一枚 pointercancel 不提交且不清除另一席 draft；
- 两片争用同一区域，先提交合法、后提交无损失败；
- 已放片重新拿起、非法释放回原姿态；
- 四个 golden replay 在实际 UI 投影完成四局并换组；
- 重开本形和全部重玩。

### 17.2 生命周期

- blur、hidden、pointercancel、lost capture 清全部 Pointer 会话并 CANCEL draft；
- 返回页面不补交旧动作；
- 迟到 pointerup/revision 不改变新状态；
- round complete 后旧 Pointer 不进入下一局；
- 重开后 DOM、状态和焦点无陈旧引用。

### 17.3 可访问性与视口

- 320×568、390×844、844×390、768×1024、1440×900；
- 200% 与 400% 缩放；
- 键盘可见焦点、无焦点陷阱、焦点提交后落点合理；
- live 文案不逐格轰炸；
- 48×48 项目命中区 Gate；
- reduced motion、forced colors、非颜色归属/错误/完成；
- 中文 200% 文本不遮挡目标或控制；
- 页面允许正常缩放和非玩法区滚动。

### 17.4 A 级实证

- 从 Finder 双击 `experiences/co-op/seven-piece-duet/index.html`；
- 完整完成四形；
- 控制台无错误；
- Network 无远程请求；
- Application 中无本项目存储、缓存或 Service Worker；
- 断网状态结果一致；
- 把作品目录复制到另一处后仍能直开。

受控浏览器若拒绝导航 `file://`，记录为工具边界，并另做真实双击；不得用 localhost 成功冒充 file 直开证据。

## 18. Go / No-Go

实现可以按下一份 plan 启动，但安装状态保持 **Conditional Go**。

转为 Go 的必要条件：

1. 七片整数模板和四分之一转闭包通过；
2. 四个原创目标有标准解、fingerprint、人工内容审计；
3. 四个 golden replay 只用生产 action 完成；
4. seat owner 隔离、Pointer 取消/迟到和冲突顺序通过；
5. 鼠标、完整键盘、真实双触控通过；
6. 五档视口、200%/400%、reduced motion、forced colors 通过；
7. `file://` 四局、零依赖、零网络、零存储、零权限通过；
8. 测试、仓库 verify、ATTRIBUTION 和差异审计通过。

如果必须恢复 45°/自由旋转、引入多边形/物理库、复制上游坐标或网络题面才能获得四个可玩目标，判 **No-Go**。首版不以扩依赖、弱化原创声明或改成竞速来掩盖。
