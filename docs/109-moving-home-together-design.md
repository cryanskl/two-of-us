# “一起，把家搬进来”视觉设计与资产说明

- 日期：2026-07-19
- 状态：视觉冻结，可进入逻辑与前端实现
- 生成方式：OpenAI 内置 ImageGen；无第三方图片输入
- 对应规格：[107-moving-home-together-spec.md](./107-moving-home-together-spec.md)
- 对应计划：[108-moving-home-together-plan.md](./108-moving-home-together-plan.md)

## 1. 已接受的完整概念

| 状态 | 文件 | 原生尺寸 | 用途 |
| --- | --- | --- | --- |
| 桌面进行态 | [`concept-desktop-playing.png`](../design/moving-home-together/concept-desktop-playing.png) | 1568×1003 | 桌面层级、地图占比、双控制区、颜色和纸艺材质 |
| 移动进行态 | [`concept-mobile-playing.png`](../design/moving-home-together/concept-mobile-playing.png) | 853×1844 | 窄屏纵向重排、地图优先、状态与双盘同时可见 |
| 桌面完成态 | [`concept-desktop-complete.png`](../design/moving-home-together/concept-desktop-complete.png) | 1568×1003 | 完成文案层级、控制区退后、克制庆祝和重开入口 |

三张图均已用 `view_image` 按原生尺寸检查。它们是内部设计概念，不由运行页面加载，不是碰撞地图或可点击热区。

## 2. 视觉命题

视觉隐喻是“把一张搬家平面图做成可以一起推动的纸艺桌游”。它应该有温度、轻微笨拙感和共同协商的空间，但不能像商业搬家游戏、地产户型图或街机摇杆界面。

核心层级：

1. **地图先读懂**：直角 S 形路线、沙发长轴、目标地毯和当前路线段一眼可辨；
2. **双方同等重要**：左端灰蓝、右端陶土红，控制盘尺寸和视觉重量完全对等；
3. **反馈不责备**：碰撞只让纸墙边缘轻压、出现“先回一点，再一起转”的中性短句；
4. **完成是放稳**：沙发完整躺进地毯，黄铜路线针少量变亮，控制区降饱和，不出现分数、赢家或爆炸彩屑。

## 3. 设计令牌

```text
paper            #F3EBDD
paper-raised     #FBF6EA
ink              #292A2D
ink-soft         #615E58
terracotta       #C7634C
terracotta-dark  #8E3F32
sage             #7B9270
sage-dark        #53654C
dusty-blue       #61788A
dusty-blue-dark  #405563
brass            #B78A4A
wall-kraft       #B79A72
danger-neutral   #7A5B45
focus            #174E72
```

- 页面背景用生产纸张图叠加 `paper` 底色；背景失效时仍保持对比与全部功能。
- 标题优先使用系统书写感衬线：`STKaiti, KaiTi, Songti SC, Georgia, serif`；正文和控件使用 `system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`。
- 不下载字体，不使用渐变作为结构，不使用玻璃拟态。纸张层级靠 1–2px 墨线、轻阴影、虚线缝边和实体色完成。
- 圆角：大纸卡 18px、按钮 10px、状态签 999px；阴影只表达纸层，不超过两级。
- 焦点环为 3px 实线加 3px 外间距；forced colors 下改用系统 `CanvasText/Highlight`。

## 4. 运行资产

| 文件 | 尺寸 | 角色 | 运行依赖 |
| --- | --- | --- | --- |
| [`moving-day-paper.jpg`](../experiences/co-op/moving-home-together/assets/moving-day-paper.jpg) | 1568×1003，约 176KB | 无字、低细节、可裁切的亚麻纸页面背景 | 可选；CSS 底色完整降级 |

背景由内置 ImageGen 生成 PNG 后，在本机用现有 ffmpeg 转为高质量 JPEG。当前环境没有 WebP 编码器，因此不安装 Pillow、ImageMagick 或额外包；这一格式变化不影响 A 级直开。

没有生成沙发 sprite、墙体贴图、地毯图、箭头图标或摇杆图。它们需要与 reducer 状态、forced colors 和响应式尺寸同步，使用原生 SVG/HTML/CSS 比位图更清晰、更可访问。

## 5. 页面结构

### 5.1 桌面（目标 1280×800）

```text
┌ 标题 / 一句话说明 ───────────────────────── 暂停 ┐
│  ┌──────────── 1000×680 SVG 场景 ────────────┐ │
│  │ 左上封闭区  ┐  中央转角  ┌  目标地毯       │ │
│  │              沙发          右下封闭区       │ │
│  └───────────────────────────────────────────┘ │
│  [路线段签] [当前协作提示 / 碰撞提示 / 完成文案] │
│  [左端 · WASD / 触控盘]      [右端 · 方向键 / 触控盘] │
└────────────────────────────────────────────────┘
```

- 主容器最大宽 1180px，外边距最小 16px；场景是首要视觉对象。
- 场景保持 1000:680，不把控制盘叠在 SVG 内。
- 状态签与一句短提示位于场景和控制间；提示变化不改变控制盘位置。
- 两个控制卡使用等宽两列，各自含称呼、键盘提示、八向圆盘、当前方向 DOM 文本。

### 5.2 移动（390×844 与 320×700）

- 标题缩为一行短标题；暂停保持 48px 目标。
- 场景在上、状态在中、两个盘在下；390px 可并排，320px 仍优先并排但缩小装饰留白，盘面可操作区域不得小于 120px。
- 页面可以纵向滚动，但首屏必须看到完整场景、当前提示、两个盘的标题和至少 120px 盘面；不得横向滚动。
- 地图不按概念图的高纵深重绘；仍使用同一 `viewBox="0 0 1000 680"`，通过容器宽度缩放。

## 6. SVG 场景组件

- **背景地板**：纸白矩形加极淡 40 单位网格；网格是装饰，forced colors 可隐藏。
- **六个障碍**：按规格矩形绘制。外墙用石墨双线；两个封闭区用 kraft 色、对角绳线和“封闭区”文字。装饰不增加碰撞。
- **目标地毯**：规格 `[690,90,950,230]`；sage 实体色、虚线缝边、中央沙发轮廓与文字“把它放在这里”。
- **沙发**：一个随 `centerX/centerY/angleIndex` 变换的 `<g>`；主体为 220×76 圆角矩形，三段坐垫线、两端握点、长轴朝向箭头和文字替代描述。
- **路线针**：只沿规格安全路线放少量圆点；route stage 到达后改变填充与描边，不参与碰撞。
- **碰撞反馈**：命中墙只短暂增加 2px 轮廓或状态签，不摇屏、不计算推开动画。

SVG 所有几何只读取 reducer 公开状态。概念中的弧形墙、门扇、植物、电视柜、信封封印和地毯流苏均不是生产碰撞或必要组件。

## 7. 控制盘与状态

### 7.1 盘面

- 原生 `<button>` 承担聚焦与可访问名称，内部圆盘是视觉；Pointer 拖动整个圆面，不需要逐箭头点击。
- 八个扇区用 CSS/SVG 箭头显示方向；中心 18% 死区显示圆点，当前方向扇区加深并在盘外显示文字，例如“左端：右上”。
- 左盘 dusty blue、右盘 terracotta；颜色之外用 `L/R` 小标、不同边线纹样与文字区分。
- Pointer 会话存在时使用 `aria-pressed="true"`；键盘仍由页面级物理键处理，聚焦盘按 Enter/Space 不模拟持续移动。

### 7.2 phase 投影

| phase | 场景 | 控制 | 主文案 |
| --- | --- | --- | --- |
| `intro` | 初始门厅姿态、路线针未亮 | 可见但未激活 | “同一个转角，一起给方向。” + “开始一起搬” |
| `playing` | 权威姿态、路线段、碰撞轮廓 | 激活 | 门厅/转角/客厅短提示 |
| `paused` | 姿态保留、覆一张小纸签 | 禁用、方向归零 | 原因文案 + “继续一起搬” |
| `complete` | 沙发水平落在地毯、少量黄铜针亮 | 保留位置、禁用、降饱和 | “家放稳了” + 完成句 + “再搬一次” |

## 8. 冻结文案

### 8.1 允许的产品文案

```text
标题：一起，把家搬进来
副题：同一个转角，一起给方向。
说明：左边握住左端，右边握住右端。一起给方向，沙发才会动；同向往前，错开一点就能转弯。
门厅：先一起往右，把长边送到转角。
转角：慢一点，让两端朝相反方向发力。
客厅：回正，再一起送进地毯。
等待左侧：还差左边给一个方向。
等待右侧：还差右边给一个方向。
碰撞：碰到边了，先回一点，再一起转。
暂停按钮：暂停
继续按钮：继续一起搬
开始按钮：开始一起搬
完成标题：家放稳了
完成正文：难的从来不是那道门，是我们愿意一起慢一点。
重开按钮：再搬一次
```

个性化 `config.js` 可以改变双方称呼和最终落款，但默认文案必须完整。页面不得新增分数、计时、失败数、最佳成绩、责任方或“你拖后腿”等措辞。

### 8.2 概念 copy diff

- 桌面进行态完整显示标题、路线段、协作短句、左右键位和暂停；生产版补充副题、路线三段提示和方向文字。
- 移动概念为控制高度省略键位后缀与说明；生产版在可折行的辅助文本中保留键位，不烘焙进图片。
- 完成概念与冻结完成文案一致；生产版把所有文字作为 DOM，并允许 `config.js` 在正文后追加个性化落款。
- 概念图片里的书法字形仅是构图参考；生产版使用系统字体，不复制或提取图片字形。

## 9. 响应式、动效与强制颜色

- 关键布局断点只设 `720px`；大于时控制卡两列并排，小于时压缩间距但仍保持双盘同屏。
- 沙发移动可用最多 80ms 的视觉插值，但 SVG `data-x/y/angle` 和所有判定立即反映权威状态；暂停、截图和测试读取权威值。
- 碰撞轮廓 180ms 后消退，route pin 300ms 淡入，完成态最多 600ms；reduced motion 下全部改为无位移、无缩放的即时状态。
- forced colors 下隐藏生产背景和装饰网格；墙、目标、沙发、路线与焦点分别使用 `CanvasText`、`Highlight`、`ButtonText`、虚线/实线和文字维持区分。

## 10. Fidelity ledger 与刻意偏离

| 维度 | 概念意图 | 生产约束 | 决策 |
| --- | --- | --- | --- |
| 布局 | 大地图 + 状态签 + 对等双盘 | 三档尺寸均看见核心 | 保留层级，按真实容器重排 |
| 地图 | 弧形纸墙和深度较强 | 碰撞必须是六个冻结 AABB | 视觉用直角双线墙，绝不追随弧线 |
| 沙发 | 三段陶土红坐垫 | 220×76 OBB、方向可读 | 保留三段线与握点，外轮廓严格跟碰撞尺寸 |
| 目标 | 绿色流苏地毯 | `[690,90,950,230]` 四角包含 | 保留缝边，省略可能遮挡边界的流苏 |
| 控制 | 八扇区纸艺圆盘 | 整盘拖动、双 Pointer、120px | 保留视觉扇区，不建立八个独立按钮 |
| 色彩 | 米白/灰蓝/陶土/鼠尾草/黄铜 | 对比、forced colors | 保留色组，并加文字/线型冗余 |
| 状态 | 中央纸签与完成卡 | live region 稳定、不逐 tick | 保留固定容器，仅替换文本节点 |
| 完成 | 少量发光路线针 | reduced motion 不改变规则 | 默认轻微淡入，降动效即时显示 |
| 装饰 | 信封封闭区、植物与电视柜 | 不新增碰撞或第三方素材 | 用原生简化绳线/箱印；省略植物、电视柜 |
| 文案 | 概念中的短句 | 107 规格为真源 | DOM 使用冻结中文，图片文字不进入运行时 |

## 11. ImageGen 提示词与来源边界

### 11.1 桌面进行态

```text
Use case: ui-mockup. High-fidelity desktop Chinese local two-player cooperative web game.
Top-down S-shaped paper apartment, terracotta long sofa angled in central turn, sage target
rug, equal dusty-blue WASD and terracotta arrow-key eight-way controls. Premium editorial
paper-cut UI, linen ivory, graphite, muted brass. Exact title/status/control text only.
No score, timer, winner, brand, people, hearts, glass, neon, real-estate blueprint,
commercial moving-game characters, isometric room or watermark.
```

### 11.2 移动进行态

```text
Use case: ui-mockup. Portrait 390×844 responsive state using the accepted desktop image as
style reference only. Compact title, readable S-shaped map in upper half, status immediately
below, two equal simultaneous eight-way touch pads fully visible without horizontal overflow.
Same paper craft palette and materials. No tiny body text, extra text, brand or watermark.
```

### 11.3 桌面完成态

```text
Use case: ui-mockup. Desktop completion variant using the accepted desktop image as identity
reference. Sofa perfectly horizontal and fully inside the sage rug; controls resting and
secondary; prominent exact Chinese completion copy and one replay button; few soft brass route
lights, no confetti, score, timer, people, brand or watermark.
```

### 11.4 生产背景

```text
Use case: stylized-concept. Full-bleed crop-safe web game background. Uninterrupted linen-ivory
handmade paper, subtle fibers, sparse stitched seam fragments and tiny brass pin impressions only
near outer edges, faint dusty-blue/terracotta extreme-corner accents, uniform low-detail center.
No text, symbols, logo, watermark, sofa, furniture, boxes, room, floor plan, walls, path, rug,
controls, cards, icons, people, hearts, central object, vignette or strong shadow.
```

上述提示词为本项目原创。三个概念和生产背景均由 OpenAI 内置 ImageGen 在 2026-07-19 生成，没有使用第三方图片、商业游戏截图或开源项目资产。运行作品只加载 `moving-day-paper.jpg`；完整概念只用于内部 fidelity 对照。

## 12. 实现放行 Gate

- [x] 三个完整状态概念已生成并按原生尺寸 `view_image`；
- [x] 一张无字生产背景已生成、转码、按原生尺寸复核；
- [x] 背景无文字、UI、地图、沙发、人物、品牌和水印；
- [x] 设计令牌、组件、状态、移动重排、文案、copy diff 和刻意偏离已冻结；
- [x] 玩法几何与概念装饰的优先级明确；
- [ ] 最终实现后，必须在同一 QA 轮比较已接受概念与最新浏览器截图，至少记录五项视觉对照。

结论：**可以进入逻辑与前端子任务实现。**
