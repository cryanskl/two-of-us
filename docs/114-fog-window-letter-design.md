# “在雾上，写给你”视觉设计与资产说明

- 日期：2026-07-19
- 状态：视觉冻结，可进入逻辑与前端实现
- 生成方式：OpenAI 内置 ImageGen；无第三方图片输入
- 对应规格：[112-fog-window-letter-spec.md](./112-fog-window-letter-spec.md)
- 对应计划：[113-fog-window-letter-plan.md](./113-fog-window-letter-plan.md)

## 1. 已接受的完整概念

| 状态 | 文件 | 原生尺寸 | 用途 |
| --- | --- | --- | --- |
| 桌面书写态 | [`concept-desktop-writing.png`](../design/fog-window-letter/concept-desktop-writing.png) | 1536×1024 | 首屏层级、雾窗占比、底部控制带、材质和触摸暗示 |
| 移动描回态 | [`concept-mobile-tracing.png`](../design/fog-window-letter/concept-mobile-tracing.png) | 853×1844 | 窄屏重排、已走/未走路径、进度和拇指区操作 |
| 桌面完成态 | [`concept-desktop-complete.png`](../design/fog-window-letter/concept-desktop-complete.png) | 1536×1024 | 窗后揭信、克制完成感、重开与停留层级 |

三张图和生产背景都已用 `view_image` 按原生尺寸检查。概念图只用于设计核对，不由运行页面加载，也不作为笔迹、锚点或命中蒙版。

## 2. 视觉命题

视觉隐喻是“雨夜里的一扇旧窗：先在雾上写，再沿自己的心意走回来”。它应该像一段私密仪式，而不是签名板、刮刮卡、游戏 HUD 或婚礼请柬。

核心层级：

1. **窗先于界面**：书写面始终占据主要视野，控件贴近边缘且不遮挡路径；
2. **雾有真实触感**：冷灰雾、水滴、羽化擦痕和深墨蓝窗外分层绘制，不靠玻璃拟态卡片；
3. **第二遍有区别但不竞技**：原始路径、命中路径和当前触点用明度与细铜色边缘区分，不显示分数、连击或倒计时；
4. **完成是揭晓，不是庆祝**：私人信像藏在窗后，只有完成或主动直开后才创建 DOM，不用彩屑、奖杯或弹窗；
5. **用户笔迹不可美化**：生产实现忠实显示原始轨迹，不把它修成心形、字体或预制图案。

## 3. 设计令牌

```text
night            #0B1720
night-deep       #061018
fog              #C9D0CC
fog-dim          #8E9997
paper            #EFE4CF
ink              #182026
copper           #C58B58
copper-dark      #7D5234
amber            #E8B36E
warm-white       #F4EBDD
focus            #FFD49B
```

- 标题与信件优先使用系统中文衬线：`Songti SC, STSong, Noto Serif CJK SC, Georgia, serif`；控件使用 `system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`。
- 不下载字体；不使用外部图标。暂停图形、铜扣、水滴和装饰线由 CSS 或原生 SVG 生成。
- 运行背景是底层夜景；雾层、细滴、框体、笔迹、触点和信件都由 HTML/CSS/Canvas 叠加。
- 按钮圆角 4–8px，接近旧窗五金；不使用大胶囊、发光渐变边框或多层漂浮阴影。
- 焦点环为 3px `focus` 实线加 3px 外间距；forced colors 下使用系统 `Highlight`。

## 4. 运行资产

| 文件 | 尺寸 | 体积 | 角色 | 运行依赖 |
| --- | --- | --- | --- | --- |
| [`window-evening.jpg`](../experiences/surprises/fog-window-letter/assets/window-evening.jpg) | 1536×1024 | 约 320KB | 无字、无 UI、低细节中央、可裁切的雨夜窗外 | 可选；CSS 深蓝底色完整降级 |

背景由内置 ImageGen 生成 PNG 后，用 macOS 自带 `sips` 以质量 88 转为 JPEG；没有安装图片处理依赖。中央 70% 保持低细节，桌面和移动端可用 `object-fit: cover`。资源失效时仍应显示完整雾层、路径、控制和信件。

## 5. 页面结构

### 5.1 桌面（目标 1280×800）

```text
┌ 03 / 雾窗手写 ───────────────────── 本地 · 不保存 ┐
│ 标题 / 阶段短句                                      │
│ ┌────────────── 雾窗 Canvas 舞台 ───────────────┐ │
│ │ 背景夜景 → 雾层 → 原始/描回路径 → 触点         │ │
│ │                                              铜扣 │ │
│ └───────────────────────────────────────────────┘ │
│ [阶段提示 / 进度]        [次操作] [主操作]          │
└───────────────────────────────────────────────────┘
```

- 舞台在视口内占宽度约 72% 以上、高度约 68% 以上，写入区不得被 DOM 控件覆盖。
- 标题只在 `intro/writing/ready` 保持完整；`tracing/paused` 可收成一行阶段标题，避免抢路径空间。
- 两个 Canvas 都是视觉层且 `aria-hidden="true"`；稳定 live region、阶段说明、按钮和完成信均为 DOM。
- 完成态在同一窗体中创建信件节点，不弹模态框；底部动作改为“再写一次”和“留在这里”。

### 5.2 移动（390×844 与 320×700）

- 顶栏只留阶段短题和整数百分比；完整说明移到底部控制带。
- 舞台优先占可用高度，右侧铜扣缩为边缘暗示；不因装饰压缩 44×44px 触控目标。
- 底部控制可两列；320px 下允许次操作缩短文字，但“直接打开”不可隐藏。
- 页面不得横向滚动；Pointer 区设置 `touch-action: none`，其他按钮仍可正常点击和键盘聚焦。

## 6. 雾窗分层

从后到前：

1. `window-evening.jpg` 或 `night` 底色；
2. 夜景色温与暗角 CSS 层；
3. 静态窗框、旧铜扣和边缘木纹 CSS/SVG；
4. 雾面 Canvas：冷灰实体层、确定性细滴与擦除笔迹；
5. 轨迹 Canvas：原始路线、已命中路线、当前触点和暂停冻结提示；
6. DOM 标题、控制带、live region；
7. 仅在 `complete` 时创建的信件 DOM。

Canvas 若无法取得 2D context，界面立即提供“直接打开”，不把空白舞台伪装成可玩状态。forced colors 下背景和装饰隐藏，路径改为系统色实线/虚线，所有阶段仍可从 DOM 文本理解。

## 7. 状态投影

| phase | 雾面 | 路径 | DOM 文案与操作 |
| --- | --- | --- | --- |
| `intro` | 完整覆雾 | 无 | 标题、短说明、“开始写” |
| `writing` | 随原始笔迹擦开 | 用户真实笔迹 | “写好了”“清掉重写” |
| `ready` | 保留笔迹 | 原始路径低亮显示 | Gate 通过提示、“沿原路走回来” |
| `tracing` | 保留原始擦痕 | 原始低亮、命中段清晰、触点铜色 | 进度、“暂停”“直接打开” |
| `paused` | 完全冻结 | 完全冻结 | 原因文案、“继续”与“直接打开” |
| `complete` | 路径周围略退雾 | 路径退为安静边缘 | 只此时创建信件、“再写一次”“留在这里” |

## 8. 冻结文案与 copy diff

允许的首屏及阶段文案以 [112 规格](./112-fog-window-letter-spec.md) 为真源。视觉概念与生产版差异如下：

- 桌面概念把完整标题叠在玻璃左上；生产版在低高度视口允许收紧字号和上下间距，但不得省略主标题。
- 移动概念用“沿着它，再走一遍”；生产 DOM 使用规格冻结的阶段短句，并在 live region 提供同义进度，不逐 Pointer tick 播报。
- 概念图中的中文、手指和轨迹只用于构图；生产版全部由 DOM/Canvas 实时生成，图片文字不进入运行时。
- 概念完成态使用安全示例信；生产版调用 `composeFogWindowLetter(view)`，仅传冻结的安全摘要，不传原始坐标。
- “本地 · 不保存”是持续隐私提示；页面不新增导出、上传、分享或自动保存。

## 9. 动效、响应式与无障碍

- 水滴可有极慢的透明度呼吸，但不做持续大面积位移；reduced motion 下完全静止。
- 命中锚点只允许 120–180ms 的轻微铜色亮度变化；完成态最长 600ms 淡入，不缩放信件。
- 页面失焦、隐藏、`pointercancel` 或超过 250ms 帧间隔时，权威逻辑按规格进入/保持暂停；视觉不得继续假动画。
- 进度用可见整数百分比与稳定文本表达，颜色不是唯一信息。Canvas `aria-hidden`，可操作等价路径始终由原生按钮和状态文本提供。
- 320px、390px、1280px 三档均要求零横向溢出、无控件遮挡路径、主动作可见、完成信可读。

## 10. Fidelity ledger 与刻意偏离

| 维度 | 概念意图 | 生产约束 | 决策 |
| --- | --- | --- | --- |
| 布局 | 大雾窗 + 窄控制带 | 三档尺寸与 44px 触控目标 | 保留舞台优先，按真实安全区重排 |
| 色彩 | 墨蓝、冷雾、远琥珀、旧铜 | 对比与 forced colors | 保留色温，增加系统色线型冗余 |
| 材质 | 真实旧窗、水滴、羽化擦痕 | 320KB 背景 + 零依赖 | 夜景用位图，雾/滴/框/扣用代码 |
| 书写 | 概念有自然手指与宽擦痕 | 真实 Pointer/键盘、整数坐标 | 省略人物，忠实渲染用户输入 |
| 描回 | 清晰段与浅雾痕区分 | 锚点命中才是权威 | Canvas 投影 anchors/hits，不按透明像素计分 |
| 进度 | 顶栏 62% | 命中数整数比值 | 保留整数百分比，不加分数/连击 |
| 完成 | 暖色窗后信 | 完成前 DOM 不含私信 | 只在完成/直开后创建，非预藏节点 |
| 心形 | 概念用心形开窗表达亲密 | 原始轨迹不可篡改 | **明确省略**心形修正，绝不自动美化 |
| 控件 | 铜色主按钮、深色次按钮 | 原生按钮、键盘与焦点 | 保留层级，使用可访问 DOM 控件 |
| 移动 | 顶栏进度、底部双操作 | 320px 无溢出 | 保留结构，必要时缩短次级标签而非隐藏 |
| 文案 | 概念安全示例 | 112 规格与 config 为真源 | 图片文案不复制，DOM 使用冻结中文 |
| 隐私 | 本地不保存 | 不持久化、不上传 | 持续显示隐私提示，不增加导出 |

## 11. ImageGen 提示词与来源边界

四次生成均使用 OpenAI 内置 ImageGen，未提供参考图。完整结构化提示词的核心要求如下：

### 11.1 桌面书写态

```text
Use case: ui-mockup. Shippable 3:2 desktop experience “在雾上，写给你”.
Old wood window, tactile cool condensation, deep ink-blue rainy night and distant amber light;
one unfinished finger trail and a restrained hand. Top-left title/instruction, narrow bottom controls
“写好了 / 清掉重写 / 本地 · 不保存”. Practical HTML/CSS/canvas layout. No SaaS dashboard,
signature pad, glassmorphism, pink romance cliché, logo or watermark.
```

### 11.2 移动描回态

```text
Use case: ui-mockup. Portrait mobile tracing state of the same experience.
Original low-contrast fog trail, about 62% retraced as a clear dark path with subtle copper edge,
small current touch point, top title/progress, bottom instruction and “暂停 / 直接打开”.
Keep the central path unobstructed and touch targets plausible. No game HUD, score, neon,
confetti, glass cards, logo or watermark.
```

### 11.3 桌面完成态

```text
Use case: ui-mockup. Desktop completion state in the same rainy old window.
A short safe-example letter feels revealed behind the warm cleared glass, not a floating modal;
bottom controls “再写一次 / 留在这里 / 本地 · 不保存”. Quiet amber relief, no celebration effects,
trophy, score, wedding ornament, pink palette, logo or watermark.
```

### 11.4 生产背景

```text
Use case: photorealistic-natural. Wide 3:2 clear-window rainy-night background.
Quiet residential garden and distant homes, deep ink-blue atmosphere, a few warm amber lights,
central 70% calm and low-detail, edge foliage, crop-safe for portrait. No foreground fog, droplets,
window frame, hand, trail, text, UI, heart, logo, people or watermark.
```

上述提示词为本项目原创。三个概念和生产背景均由 OpenAI 内置 ImageGen 在 2026-07-19 生成，没有使用第三方图片、商业页面截图或开源项目资产。运行作品只加载 `window-evening.jpg`；概念图片只用于内部 fidelity 对照。

## 12. 实现放行 Gate

- [x] 三个完整状态概念已生成并按原生尺寸 `view_image`；
- [x] 一张无字生产背景已生成、转码并按原生尺寸复核；
- [x] 背景无文字、UI、人物、前景雾、窗框、笔迹、品牌与水印；
- [x] 设计令牌、分层、状态、移动重排、copy diff 与刻意偏离已冻结；
- [x] 概念的心形与人物不会改变生产逻辑；
- [ ] 最终实现后，必须在同一 QA 轮同时查看最新浏览器截图与已接受概念，并记录至少五项保真对照。

结论：**可以进入逻辑与前端子任务实现。**
