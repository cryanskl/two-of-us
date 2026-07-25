# S19“万花筒名字”定向调研：把名字折成同一束光

- 调研日期：2026-07-25
- 对应创意：[`40-idea-backlog.md`](./40-idea-backlog.md) 的 S19“万花筒名字”
- 稳定工作 ID：`kaleidoscope-names`
- 建议目录：`experiences/surprises/kaleidoscope-names/`
- 建议启动等级：A（双击 `index.html`，无安装、服务、权限或公网）
- 本轮范围：候选审计、机制去重、平台边界、来源与许可证复核；不创建生产目录

## 1. 结论

**Go，但必须收窄成“二维离散校准 → 主动揭晓”的确定谜题。**

推荐体验名为“把名字折成同一束光”。准备者预先配置两枚称呼标记、两条公开
线索、正确镜面阶数和正确相位。体验者进入后：

1. 从 `4–9` 中选择镜面阶数；
2. 拖动 `0–23` 的离散相位控制；
3. 页面分别给出“未贴近 / 已贴近 / 已对齐”的非方向性文字反馈；
4. 两项同时精确命中时，花纹停止漂移并进入 `aligned`；
5. 体验者仍要主动按下“照见我们”，两枚标记和结尾留言才进入 DOM。

首版只提供一组确定答案，不计时、不扣分、不随机换题。Canvas 万花筒不是规则
载体：权威判定只比较整数档位，原生控件、文字状态和最终 DOM 标记才是可操作
与可访问路径。Canvas 初始化失败时，用户仍能依据线索完成校准并揭晓。

进入规格的五项条件成立：

1. 主分类唯一：一人准备，两人可共同观看，但核心是单人解锁惊喜；
2. A 级可行：经典脚本、原生按钮/range、Canvas 2D 与相对本地文件足够；
3. 首局可在 30 秒内解释：选折面、转相位、让两项都对齐；
4. 去掉动画、图片、音频和私人照片后，“二维校准 → 主动揭晓”仍成立；
5. 最小版只有一个入口、一个二维校准机制和一个结果页。

## 2. 当前 58 项去重

本轮重新读取了 `experiences/catalog.json` 的 58 个 installed 项，并对
`experiences/`、`docs/` 搜索了 mirror、name、symmetry、kaleidoscope 等相邻
机制。最接近但不相同的项目如下。

| 现有项目 | 已覆盖机制 | S19 必须保持的差异 |
| --- | --- | --- |
| `moon-phase-secret` | 月/日/月相三项拨盘校准，命中纪念日后解锁 | S19 不使用日期、天文模型或三项事实答案；镜面阶数会改变重复拓扑，相位只改变整体旋转 |
| `hand-crank-music-box` | 连续顺时针拖动累积角度并逐音推进 | S19 不累计路程或速度；每个输入都是可重复、可直接设置的离散绝对值 |
| `fog-window-letter` | Pointer 轨迹擦雾、复走同一轨迹后显字 | S19 不采样路径、不比较笔迹；任意输入方式都只产生相同整数档位 |
| `scratch-surprise` | 擦除 Canvas 遮罩达到面积阈值 | S19 不按像素覆盖率判定，也不要求自由绘制路径 |
| `star-code-unlock` | 根据私人线索选择三颗星点 | S19 的两个参数会共同生成一种连续可预览的几何状态，不是选择三个独立答案 |
| `origami-heart` | 按固定顺序折叠纸片形成爱心 | S19 没有步骤序列；两项可在校准阶段任意顺序修改 |
| `shared-color-studio` | 双人分别控制颜色通道、共同逼近目标色 | S19 是单人惊喜、没有倒计时或双席权限，且命中为两个离散 exact 值 |
| `wish-fireworks` / `snow-globe-message` 前置研究 | 粒子表现最终组成文字 | S19 不用粒子静止或点阵绘字；文字由最终 DOM 揭晓，花纹只提供对齐语义 |

因此，题材“万花筒”本身不是差异。只有以下三点同时存在才值得收录：

- 镜面阶数改变重复单元数量；
- 相位在固定 24 档中旋转同一组重复单元；
- 两项 exact 命中后还需主动揭晓，不把私人标记藏在 Canvas 或初始 DOM。

若实现只剩一个旋钮、一个进度百分比或自动显字，应判为与既有校准/进度惊喜
重复，停止收录。

## 3. 方案比较

### 3.1 连续旋钮，转到隐藏角度

用户拖动一个圆盘，进入某个容差区间就显字。

**排除。** 这几乎等同“月相拨盘换皮”，且连续角度、Pointer 采样、容差和设备
精度会制造无意义误差。

### 3.2 摇晃或陀螺仪制造万花筒

读取 `DeviceMotion` / `DeviceOrientation` 改变图案。

**排除。** 需要权限和传感器兼容分支，无法给键盘提供自然等价输入，也没有可
推理的结束条件。

### 3.3 自由上传照片做万花筒

选择本机照片后切片、镜像并导出。

**排除首版。** 这会变成图片工具，落入 B 级文件导入、图片解码、方向信息、
隐私说明和导出许可范围；也与 `photo-swap-puzzle`、`panorama-memory` 的本机
照片路线相邻。

### 3.4 单一线性进度，花纹越来越清楚

每次操作都增加进度，100% 时显示名字。

**排除。** 它没有判断或重玩性，只是手势包装的等待页。

### 3.5 镜面阶数 + 离散相位

镜面阶数从 4–9 六档中选择；相位是 24 档环形值。每项有准备者写的公开线索，
规则只在两项都 exact 时进入对齐。

**采用。** 两个参数对几何有不同含义，键盘、触屏、鼠标可以共享同一整数状态；
答案空间只有 `6 × 24 = 144`，适合短惊喜，也足够避免一次误触完成。

## 4. 冻结机制草案

### 4.1 两项答案

```text
folds     = integer in [4, 9]
phaseStep = integer in [0, 23]
```

`folds` 表示一圈重复多少个镜面单元；`phaseStep` 表示一圈 24 等分中的整体
旋转位置。配置提供两条公开线索：

```text
foldHint  = “把折面调到我们第一次长途旅行经过的站数。”
phaseHint = “让缺口朝向十一点钟。”
```

默认示例必须自洽且不依赖私人知识。生产配置中的线索可以只对双方有意义，但
README 必须提醒准备者：答案和结尾文案都以明文保存在 `config.js`，不是加密。

### 4.2 精确整数角度

规则层不存弧度。取：

```text
TURN_UNITS = lcm(4, 5, 6, 7, 8, 9, 24) = 2520
PHASE_UNITS = 2520 / 24 = 105
WEDGE_UNITS = 2520 / folds
```

第 `i` 个重复单元的整数旋转为：

```text
rotationUnits = (phaseStep * 105 + i * (2520 / folds)) % 2520
mirrored = i % 2 === 1
```

这样所有允许的折面与相位都能用整数表达。Canvas renderer 最后才计算
`rotationUnits / 2520 * 2π`；像素差、设备像素比或浮点误差永远不参与是否
对齐的判定。

### 4.3 反馈

每项反馈只给距离等级，不给增减方向：

```text
foldDistance = abs(selectedFolds - targetFolds)
phaseDistance = min(abs(selectedPhase - targetPhase), 24 - abs(...))

exact: distance === 0
near:  folds distance === 1 / phase distance <= 2
far:   otherwise
```

页面必须用文字和图形共同表达，不能只从颜色、亮度、旋转速度或声音判断。
`role=status` 只在已提交的离散值变化后播报摘要，拖动过程中不得每帧刷 live
region。

### 4.4 四阶段

```text
intro → tuning → aligned → complete
```

- `intro`：公开标题、固定说明与“开始折光”；不创建线索、标记或结尾留言；
- `tuning`：公开两条线索、当前两个值与两项距离等级；不创建两枚标记或结尾；
- `aligned`：控制锁定，提示“图案已对齐”和“照见我们”；仍不创建标记或结尾；
- `complete`：主动确认后才创建两枚标记、结尾标题、留言与署名。

对齐后锁定控制，避免成功状态被偶然拖离。重开从完整页返回新的 `intro`，并移除
所有私人节点。

## 5. A 级 `file://` 可行性

建议生产目录只包含：

```text
index.html
styles.css
config.js
logic.js
app.js
README.md
ATTRIBUTION.md
package.json
logic.test.js
```

运行路径使用经典相对脚本：

```text
config.js → logic.js → app.js
```

首版不使用 ES modules、`fetch()`、XHR、WebSocket、Worker、Service Worker、
动态 import、远程字体、CDN、图片、音频、视频或构建产物。所有默认图形由
HTML/CSS/Canvas 2D 生成，作品目录单独复制后仍有完整默认内容。

A 级最终证据必须分三层：

1. **静态合同**：无模块、网络 API、仓库外资源、服务端或根依赖；
2. **真实系统直开**：从 Finder 双击 `index.html`，完成一轮并重开；
3. **localhost 浏览器验收**：只用于自动化交互、响应式、控制台与截图，不能替代
   第 2 层的 `file://` 事实。

当前阶段只证明架构可达 A 级；未创建入口，也未冒充已经通过真实双击。

## 6. Canvas、输入与语义边界

### 6.1 Canvas 只做投影

[WHATWG HTML Standard 的 Canvas 章节](https://html.spec.whatwg.org/multipage/canvas.html)
规定了 2D context 的旋转、缩放与 current transformation matrix，也明确 Canvas
应提供 fallback content；交互区域与可聚焦 fallback 元素需要一一对应。

本作进一步收紧：

- Canvas 设置为装饰性图案，不承载唯一按钮、线索、数值或标记；
- 真实控件是 Canvas 外的原生 `<button>` 与 `<input type="range">`；
- Canvas 内不做 hit test，不读取像素判断成功；
- Canvas context 不可用时显示静态 CSS 环与同一组文字状态，玩法不变；
- 两枚标记在 complete 阶段以 DOM text 出现，不依赖系统字体的 Canvas
  `measureText()` 或逐像素轮廓。

### 6.2 Pointer、触屏与键盘

[W3C Pointer Events Level 3](https://www.w3.org/TR/pointerevents3/) 说明
`touch-action` 用于声明直接操控区域是否交给浏览器平移/缩放，并说明 pointer
capture 可在自定义滑块拖出元素边界后继续接收事件。

首版不需要自定义 Pointer dial：

- 六个折面值用原生按钮组；
- 24 档相位用原生 `input[type=range]`；
- Arrow keys 操作相位，Tab/Enter/Space 操作折面与动作按钮；
- Canvas 不阻止页面滚动；只有真实 range 的浏览器原生手势生效；
- 若未来改成圆形自绘旋钮，必须保留同一原生 range 等价路径，并单独验证
  `pointercancel`、capture 与滚动冲突，不能在本规格外偷偷替换。

[WHATWG Range state](https://html.spec.whatwg.org/multipage/input.html#range-state-(type=range))
定义 `min`、`max`、`step` 和数值修正边界，适合把相位冻结为离散值。

### 6.3 可访问状态

[WCAG 2.2 Keyboard](https://www.w3.org/WAI/WCAG22/Understanding/keyboard.html)
要求 Pointer 功能有键盘等价路径；官方示例也明确拖放可提供表单控件等价操作。
[Status Messages](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html)
要求不抢焦点的结果/进度变化可被辅助技术识别。

因此：

- DOM/视觉顺序固定为：说明 → 折面 → 相位 → 状态 → 主动作；
- 每个目标至少 48×48 CSS px，高于 WCAG 2.2 的 24×24 最低尺寸；
- active、near、exact 均有文字，不只靠色彩；
- tuning 时 live region 只读“折面已贴近，相位未贴近”等稳定摘要；
- aligned 后焦点移到“照见我们”，complete 后移到结尾标题；
- Canvas 使用简短替代描述；详细当前状态来自相邻 DOM，不重复播报每个花瓣。

## 7. 动效、闪烁与响应式

[Media Queries Level 5](https://www.w3.org/TR/mediaqueries-5/#prefers-reduced-motion)
定义 `prefers-reduced-motion: reduce` 用于识别用户希望减少非必要运动的偏好；
[WCAG Animation from Interactions](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html)
建议允许关闭交互触发的非必要运动。

冻结边界：

- 正常模式只在离散值变化时用 `<= 240ms` 的一次过渡到新构图；
- 不做持续自转、视差、缩放穿越、屏幕摇动或自动粒子；
- reduced-motion 下立即重绘目标状态，所有 transform transition 为 `0ms`；
- 规则推进不等待 `transitionend` 或 `requestAnimationFrame`；
- 页面隐藏、恢复或 BFCache 返回后不补播旧动画。

[WCAG Three Flashes](https://www.w3.org/WAI/WCAG22/Understanding/three-flashes-or-below-threshold.html)
要求避免超过阈值的闪烁。首版采用更严格的零闪烁合同：

- 不交替反转全屏明暗；
- 不做频闪、爆闪、红闪或快速高反差脉冲；
- exact 只用一次静态边框/文字变化；
- 自动测试扫描 CSS 中 `blink`、无限闪烁 animation 和高频 keyframes，浏览器
  人工观察仍是最终 Gate。

响应式基线：

- 320×568、390×844、768×1024、1280×720、1504×1000；
- 320px 下控件单列，Canvas/CSS 图案缩到可视区域，不产生页面横向溢出；
- 200% text 不遮挡线索、状态或主动作；
- 400% zoom 时允许图案区域自身缩小，但文字和控件按文档流重排；
- 横屏低高度下不固定整屏，不让图案挤走操作区。

## 8. 隐私、安全与内容边界

- 不使用 storage、cookie、URL query/hash、剪贴板、分享 API 或日志保存标记；
- 不申请摄像头、麦克风、位置、传感器、通知或文件权限；
- 不发出任何网络请求；
- 配置只接受纯文本和整数，不接受 HTML、SVG path、CSS、URL、函数或事件名；
- 页面输出一律使用 `textContent`，不把配置拼进 `innerHTML`、style 或 attribute；
- 初始 HTML、隐藏模板、ARIA、`data-*`、Canvas、CSS content 均不得提前包含两枚
  标记、结尾标题、留言或署名；
- `config.js` 是本机明文，不提供安全保密承诺；拿到目录的人可以查看源码；
- 默认配置使用虚构标记与中性称呼，不提交真实姓名、纪念日或私人消息。

建议每枚标记规范化为 NFC 后允许 1–2 个 Unicode code point，拒绝控制字符、
双向控制符、孤立 surrogate、空白和超长内容。两枚标记可以相同，避免排除同名
伴侣；视觉还要用“左/右标记”文本位置区分，不能只靠字符差异。

## 9. 权威状态与测试方向

建议 action：

```text
START
SET_FOLDS { value }
SET_PHASE { value }
REVEAL
RESTART
```

建议 state：

```js
{
  version: 1,
  phase: "intro" | "tuning" | "aligned" | "complete",
  content,
  selectedFolds,
  selectedPhase,
  revision
}
```

测试必须覆盖：

1. `4–9` 与 `0–23` 全域、非法值、coercion、额外字段与 hostile getter；
2. 环形距离 `0↔23`、near/exact/far 边界；
3. 144 组答案空间中只有一组进入 aligned；
4. `TURN_UNITS=2520` 对 4–9 与 24 全部整除，wedge 数量与交替 mirror 正确；
5. 调整顺序交换后结果一致；
6. aligned 前无标记/final sentinel，REVEAL 前后 exact public DTO；
7. restart 清除私人 public view、旧 action/revision 不重放；
8. Canvas failure、no-JS、reduced-motion、forced-colors、200% text；
9. Pointer/触屏、键盘和真实 range 行为；
10. `file://`、断网、零公网请求、零 console error。

## 10. 来源、许可证与借鉴声明

本候选**没有参考任何开源万花筒项目、示例代码、视觉作品或素材**。没有复制、
修改、链接、vendoring 或改写第三方源码，也没有使用第三方图片、字体、图标、
纹样、文案或品牌表达。

| 一手来源 | 本轮用途 | 不构成什么 |
| --- | --- | --- |
| [WHATWG HTML Standard：Canvas](https://html.spec.whatwg.org/multipage/canvas.html)（Living Standard，2026-07-25 复核） | 确认 2D transform、Canvas fallback 与可访问交互边界 | 不复制示例，不作为视觉来源 |
| [WHATWG HTML Standard：Range state](https://html.spec.whatwg.org/multipage/input.html#range-state-(type=range))（Living Standard，2026-07-25 复核） | 确认离散 range 的 min/max/step 数值模型 | 不复制控件皮肤或代码 |
| [W3C Pointer Events Level 3](https://www.w3.org/TR/pointerevents3/)（Recommendation，2026-06-30） | 确认 touch-action、pointer capture 与直接操控边界 | 首版不实现自定义 pointer dial |
| [WCAG 2.2](https://www.w3.org/TR/WCAG22/) 与 WAI Understanding pages（2026-07-25 复核） | 校准键盘、状态消息、目标尺寸、动效与闪烁 Gate | 不是运行依赖或素材许可证 |
| [Media Queries Level 5](https://www.w3.org/TR/mediaqueries-5/)（2026-02-19 Working Draft） | 校准 reduced-motion 的平台偏好语义 | 不复制样式或示例 |

后续正式作品必须在 `ATTRIBUTION.md` 和 README 复述：

1. “玩法状态机、整数角度模型、默认内容、Canvas 图案、DOM、CSS 与测试由本仓库
   独立设计和编写”；
2. “仅使用 Web 标准与 WAI 文档校准平台/无障碍边界”；
3. “未参考或复制任何第三方万花筒实现、源码、素材、纹样或视觉”；
4. 若实施阶段后来打开了任何开源实现，必须先回到 research 固定 commit/tag、
   核对许可证与版权人，再更新借鉴/未复制范围，不能事后补写模糊声明。

因为本轮没有参考开源项目，所以不存在可合理虚构的 commit、许可证哈希或版权人。

## 11. Go / No-Go Gate

**Go，进入 brainstorm。**

必须保持：

- A 级经典脚本、零运行依赖、零网络/权限/存储；
- `4–9 × 0–23` 二维离散 exact 答案；
- 规则整数与 Canvas 浮点渲染分层；
- 原生控件和文字等价路径；
- aligned 前不出现标记/结尾，主动 REVEAL 后才创建；
- 零持续自转、零闪烁、reduced-motion 立即投影；
- 原创实现和清楚的零复制声明。

以下任一发生则应 No-Go 或返回研究：

- 产品退化为单旋钮/单进度；
- 需要照片、传感器、WebGL、第三方库或服务才能完成；
- 以 Canvas 像素或动画结束事件作为权威判定；
- 无法为键盘/读屏提供完整等价路径；
- 借用了无法固定来源或许可证不清的代码、纹样、字体或素材；
- 与 `moon-phase-secret` 的实际首局流程只剩题材差异。

本研究完成不等于作品完成，也不增加 catalog installed 数量。
