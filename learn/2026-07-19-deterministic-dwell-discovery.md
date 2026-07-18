# 确定性连续停留：整数 tick、生命周期断点与稳定舞台

## 适用范围

适用于“把指针或光心留在目标上片刻才确认”的本地互动：寻物惊喜、凝视式揭晓、共同守住区域、长按辨认、地图探索和不希望误触即完成的仪式型体验。它不适合要求真实计时精度、后台持续计时或高风险生物识别的场景。

## 关键结论

### 1. 浏览器时间不是业务状态

`requestAnimationFrame` 的时间戳和 Pointer 事件频率会随设备、刷新率、后台切换与性能变化。不要把“累计了 703.42ms”直接写进权威状态；让浏览器层只维护一个短命 accumulator，并按固定步长派发整数 `TICK`：

```text
accumulator += min(frameDelta, maxFrameGap)
ticks = min(floor(accumulator / tickMs), maxTicksPerAction)
dispatch({ type: "TICK", ticks })
accumulator -= ticks * tickMs
```

状态机只知道某目标已连续获得多少 tick。例如 14 个 50ms tick 表示至少 700ms，不依赖 60Hz、120Hz 或一次合并了多少 pointermove。

### 2. 每个 TICK 必须有严格上限

页面恢复、调试器暂停或设备卡顿可能产生很大的帧间隔。仅限制单帧差值还不够；一次 action 的 tick 数也要冻结上限，否则恢复瞬间可能直接完成目标。

推荐同时具备：

- `MAX_FRAME_GAP_MS`：大于该间隔时清空 accumulator，本帧不补算；
- `MAX_TICKS_PER_ACTION`：状态机拒绝或截断超大 tick 载荷；
- 页面 `visibilitychange`、窗口失焦和显式暂停都结束当前连续段。

这不是为了模拟秒表，而是保证“人在目标上连续停留”这个交互语义。

### 3. 切换目标清零，同一目标内移动保留

连续停留进度应绑定目标 ID，而不是绑定像素点：

- 从空白进入目标 A：设置 `focusTargetId=A`，进度从 0 开始；
- 在 A 的半径内移动：继续累计，不因手抖清零；
- 离开 A：清掉目标与累计 tick；
- 从 A 直接进入 B：A 的进度不能带给 B；
- 已发现目标不再成为可累计目标。

命中应使用冻结的整数世界坐标与半径；Canvas 光效、图片像素和 DOM 动画都不参与裁决。

### 4. 输入所有权要用 generation 截断迟到事件

Pointer capture、`pointercancel`、`lostpointercapture`、键盘接管、暂停和重开会产生交错事件。状态中保存当前输入来源与 `generation`，每次接管或失效都递增；旧 generation 的 MOVE/TICK/END 一律无效。

这样可以证明：触摸取消后迟到的移动不会继续照明，重开前的动画帧不会把新一局推进，键盘接管后旧 pointer capture 也不能抢回光心。

### 5. 空间容器矩形也是输入协议

屏幕点映射到世界点通常依赖舞台的 `getBoundingClientRect()`：

```text
worldX = round((clientX - rect.left) * worldWidth / rect.width)
worldY = round((clientY - rect.top)  * worldHeight / rect.height)
```

如果发现列表增长后把舞台重新居中，即使目标地图完全确定，后续屏幕输入也会映射到错误位置。桌面空间玩法应在一局中固定舞台所在网格的高度，让旁栏内容在自身区域滚动；移动端可以在断点后恢复自然文档流。

浏览器回归不能只量一次矩形。至少在初始态、部分进度和完成态分别读取 `rect`，并用同一套屏幕坐标完成一条生产动作重放。

### 6. 公开 view 与秘密 DOM 分开

权威状态可以保存已发现 ID 与顺序，但公开 view 在完成前只暴露已经发现的文案。尚未发现的名称、完整信件和默认完成列表不应预埋在初始 DOM；只有对应阶段到达时才创建文本节点，重开时删除。

这仍是渐进揭晓而非加密：静态 `config.js` 中的本机明文可被查看。文档要明确这个边界，并提供不依赖视觉搜索的等价“直接点亮”入口。

### 7. Canvas 只做可替换投影

暗幕、光圈、进度环和标记可以画在 Canvas，但状态机不能读取像素。Canvas context 失败、背景图片失败、`forced-colors` 或 `prefers-reduced-motion` 都只能改变呈现，不能改变完成规则。

推荐保留原生 DOM：阶段说明、发现数量、已发现列表、暂停/恢复、直接完成和重开。Canvas 无法使用时停用搜索面，但直接完成仍可达。

## 反例

- 每个 `pointermove` 增加 1 点：高采样设备比低采样设备更快完成。
- 直接累加 rAF 毫秒：后台恢复的一帧把目标瞬间点亮。
- 只在 UI 层限制 tick：伪造 action 仍可一次注入无限进度。
- 进入目标 B 时保留 A 的余数：在多个目标间快速扫过也能累计成功。
- 发现列表自然撑高整个桌面网格：舞台移动后固定目标的屏幕映射失效。
- 初始 HTML 预埋五件纪念物再用 CSS 隐藏：读屏、页面搜索或源代码检查提前泄露内容。
- Canvas context 失败就隐藏所有动作：无法精细操作的用户被永久锁在开场。

## 验证清单

- 13 tick 未完成，14 tick 恰好发现；0、负数、非整数和超上限 tick 被拒绝；
- 同目标内 MOVE 保留累计，离开、换目标、暂停、隐藏和失焦清零；
- pointer、touch/pen capture、cancel/lost 与键盘接管都有 generation 迟到事件测试；
- 相同 action 日志在 Node 与浏览器得到深相等终态；
- resize 与 DPR 变化只重绘，不派发规则 action；
- 初始 DOM 不含未发现文案，direct 之前真实状态仍保持部分进度；
- Canvas/图片失败、减少动态和强制颜色不改变规则可达性；
- 桌面初始、部分发现与完成态舞台矩形稳定，移动端无横向溢出；
- 鼠标生产路径能按固定坐标发现全部目标，浏览器控制台无错误。

## 本仓库实例

“把夜晚照成我们”使用 1000×620 整数世界、50ms 固定 tick、14 tick 连续停留、每 action 最多 5 tick、250ms 最大帧间隔和五个固定圆形目标。逻辑测试覆盖 153 项；一段 21 action 的黄金日志依次完成五件纪念物，完整仓库回归为 1161 项。

对应实现位于 [`../experiences/surprises/starlight-keepsake-search/logic.js`](../experiences/surprises/starlight-keepsake-search/logic.js)、[`app.js`](../experiences/surprises/starlight-keepsake-search/app.js) 与 [`logic.test.js`](../experiences/surprises/starlight-keepsake-search/logic.test.js)。固定调研来源、许可证、ImageGen 输入链与零复制声明见 [`ATTRIBUTION.md`](../experiences/surprises/starlight-keepsake-search/ATTRIBUTION.md)。
