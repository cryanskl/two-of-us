# “转一点，推一点，刚好回家”ImageGen 完整视觉简报

- 日期：2026-07-21
- 状态：简报已冻结，尚未生成概念；等待统一图像工具、清晰度和配置作用域确认
- 对应调研：[176-capsule-docking-research.md](./176-capsule-docking-research.md)
- 对应规格：[177-capsule-docking-spec.md](./177-capsule-docking-spec.md)
- 对应 Brainstorm：[207-capsule-docking-brainstorm.md](./207-capsule-docking-brainstorm.md)
- 目标目录：`experiences/co-op/capsule-docking/`

## 1. 概念任务与验收角色

这不是一张太空主题 hero，而是一套可直接指导完整游戏页面实现的多状态产品概念。受众是共用一台电脑或平板的情侣、夫妻和伴侣：姿态席只管左右转，推进席只管主推/反推，两个人共同把同一艘舱体的六条安全条件稳定 30 个规则 tick。

概念必须让第一次打开的人在 30 秒内看懂：

1. 页面只有一艘共享舱体，不是两艘船竞速；
2. 左右两席等权，但权限不同；
3. 接口不是“碰到就成功”，必须位置、线速度、船头角差、角速度、四键松开、路径无碰撞同时安全；
4. 全绿后还要保持到 30 / 30；
5. 没有分数、燃料、倒计时、个人失误或真实航天训练暗示。

每张图都是完整页面或完整状态，不得只截标题、舞台或一块仪表。生成图中的文字只帮助锁定布局与视觉关系，生产实现逐字使用本简报的 code-native 文案，不 OCR 生成图。

## 2. 统一视觉方向

方向名：**纸质近地轨道训练台**。

- 核心意象：一块摊开的纸质训练台包住深炭蓝观察窗；舱体和空间站像精密但温和的教学模型，而不是军用或商业航天控制台。
- 创意强度：7 / 10；有明确作者感，但仍能由语义 HTML、CSS 与 SVG 忠实实现。
- 密度：中等；一个强舞台、两条等权控制轨、四项遥测和六条 Gate，避免卡片套卡片。
- 背景：深炭蓝、低噪点的无字轨道观察窗；不使用霓虹网格、银河 bokeh、紫蓝科技渐变或过量 glow。
- 材质：暖灰纸板、象牙白刻度、轻微丝网印刷错位、少量黄铜装订点；不做写实金属驾驶舱。
- 席位色：姿态席为低饱和珊瑚红；推进席为低饱和青绿色。颜色必须配合文字、位置和线型，不单独承担语义。
- 空间站：原创暖灰几何体，右侧接口朝左；不得接近 NASA/SpaceX/ISS 的真实接口、舱段或品牌轮廓。
- 舱体：原创简洁纸模轮廓，鼻端明确、两类喷口可区分；不是火箭、战斗机或 Lunar Lander 复刻。
- 字体气质：中文标题使用端正、温暖、略带编辑感的粗黑体；正文和控制使用清晰人文无衬线；遥测数字使用等宽系统回退。不得依赖远程字体。
- 容器模型：开放训练台、单一观察窗、遥测带、Gate 清单和两条控制轨；禁止默认 bento、导航栏、侧栏、徽章、药丸、假统计或多层浮动卡片。
- 圆角与阴影：小到中等圆角、短而克制的纸层阴影；不做玻璃拟态。
- 图标：只使用必要的 SVG 航向、喷口和状态符号；安全/未安全必须同时有文字与线型，不以勾叉图标替代全文。
- 动效暗示：轻微星流、短喷焰和稳定刻度推进；reduced-motion 概念中全部关闭，不改变任何规则位置。

色值、字号、spacing、radius、shadow 和 icon stroke 在用户接受候选后从原图提取；本简报只冻结色彩角色，不提前伪造精确 token。

## 3. 页面结构与首屏锁

`main` 直接子级顺序与视觉顺序固定：

1. 页头：H1 与固定短规则；
2. 阶段面板：当前标题、唯一 `statusText`、当前主动作；
3. 完整比例舞台；
4. 四项遥测；
5. 六条 Gate；
6. 姿态席控制；
7. 推进席控制；
8. 稳定进度；
9. 完成日志；
10. live region（视觉隐藏但不制造布局高度）。

桌面可以把 3–8 组合成“舞台居中、仪表和控制沿周边展开”的同一训练台，但 DOM/视觉阅读顺序不能反转。移动端按同一顺序自然堆叠，不用 CSS `order` 或 `display:contents`。

首屏禁止出现：导航、Logo、英文副标题、eyebrow/kicker、徽章、pill、设置、帮助抽屉、全屏按钮、音量、分数、燃料、计时器、排行榜或分享。

## 4. code-native 可见文案锁

### 4.1 固定页头与安全说明

- H1：`转一点，推一点，刚好回家`
- 固定短规则：`姿态席只管转，推进席只管推。六条条件一起安全，并保持 30 格，就能稳稳接住。`
- 固定边界：`本地同机，不联网。这是归一化的合作游戏，不是航天训练或真实操作建议。`

### 4.2 阶段主状态与主动作

| 状态 | `statusText` | 唯一主动作 |
| --- | --- | --- |
| intro | `一边只管转，一边只管推。把位置、速度、角度和旋转一起放进安全窗。` | `开始对接` |
| leg-intro 1 | `第 1 段：靠近·把船头转回来。先看船头和余速，再一起接近。` | `开始第 1 段` |
| leg-intro 2 | `第 2 段：修正·从上方落回轴线。先看船头和余速，再一起接近。` | `开始第 2 段` |
| leg-intro 3 | `第 3 段：回家·带着余速停稳。先看船头和余速，再一起接近。` | `开始第 3 段` |
| approaching | `接口就在右边；轻推、回正、收住余速。` | `暂停这一段` |
| failed / hull | `舱体碰到接口外壳了，这一段重新靠近。` | `重新靠近` |
| failed / drift | `舱体飘出近距安全区了，这一段重新靠近。` | `重新靠近` |
| docked 1–2 | `位置、速度和船头一起稳住了。` | `进入下一段` |
| docked 3 | `位置、速度和船头一起稳住了。` | `查看共同记录` |
| mission-result | `三次靠近，都被我们稳稳接住。` | `收下这次对接` |
| complete | `对接完成，这一程一起回家。` | `再对接一次` |

### 4.3 遥测、Gate 与控制

四项遥测标题和单位固定：

- `位置 x / y`，单位 `距离单位`
- `线速度 vx / vy`，单位 `距离单位/tick`
- `船头角差`，单位 `角度格`
- `角速度`，单位 `角度格/tick`

六条 Gate 固定：

1. `位置进入接口`
2. `线速度收住`
3. `船头对准`
4. `角速度收住`
5. `四键已松开`
6. `路径无碰撞`

每条只使用 `安全` 或 `未安全`。总提示只使用：

- `六条条件还没有同时安全。`
- `六条条件都安全，继续保持 0 / 30。`
- `六条条件都安全，继续保持 17 / 30。`
- `本次接近已经结束，路径未安全。`
- `已经稳定 30 / 30。`

`路径无碰撞` 表示当前 attempt 是否仍保持安全，而不只是最后保存坐标是否位于安全点。failed 虽停在最后安全位置，public view 仍按 lastResult 把该项与 allOk 置为 false；页面只投影 public view，不自行覆盖 `evaluateDockGate()`。

两席与控制固定：

- `你 · 姿态席`：`向左转 A`、`向右转 D`
- `TA · 推进席`：`主推 J`、`反推 L`

完整 accessible name 仍为“姿态席，向左转，A”等；概念需显示清楚的键位与动作，但生产键帽、文字和焦点均为代码。

### 4.4 完成日志与结果

日志示例只显示共同记录：

- `第 1 段 · 靠近·把船头转回来 · 共同完成 · 第 1 次尝试`
- `第 2 段 · 修正·从上方落回轴线 · 共同完成 · 第 2 次尝试`
- `第 3 段 · 回家·带着余速停稳 · 共同完成 · 第 1 次尝试`

mission-result 只显示三段汇总与 `总尝试 4 · 共同重试 1`。complete 才显示默认赠言：

> 你和TA，转一点，推一点，终于把这一程稳稳接回家。

个人 control tick、个人失误、最佳路线、用时、燃料、评分和未来动作永不出现。

## 5. ImageGen 设计锚点库存

以下 13 张是视觉设计锚点。每张都必须是新鲜生成的完整页面/状态，不得从总览裁切；所有锚点共享第 2 节视觉系统。文字用于判断信息层级、空间、换行和控件密度，不作为逐字正确、键帽行为、可访问树或浏览器功能通过证据；这些由第 6 节真实页面 QA 验证。

### D1 · 1504×1046 desktop intro

- 完整页头、intro statusText、`开始对接`、固定边界说明；
- 一艘共享舱体在左侧安全区，右侧原创接口；
- 两席控制等权可见但原生 disabled 的视觉状态；
- 初始遥测与六条 Gate 可见，稳定 0 / 30；
- 完成日志为空，不展示未来航段或赠言；
- 无横纵滚动，禁止把舞台缩成卡片缩略图。

### D2 · 1504×1046 leg-intro 1

- 精确 leg 1 文案与 `开始第 1 段`；尝试 `1`；
- 初态示例：位置 `180.00 / 310.00`、速度 `0.00 / 0.00`、角差 `32`、角速度 `0`；
- Gate：位置未安全、速度安全、船头未安全、角速度安全、四键安全、路径安全；
- 船头明显向右下偏，但不画修正路线、下一按键或 ghost path。

### D3 · 1504×1046 leg-intro 2

- 精确 leg 2 文案与 `开始第 2 段`；尝试 `1`；
- 初态示例：位置 `180.00 / 180.00`、速度 `0.00 / 0.30`、角差 `16`、角速度 `0`；
- 舱体在轴线上方且有公开向下漂移；不能复用 D2 只改标题；
- 已完成日志有第一段共同记录。

### D4 · 1504×1046 leg-intro 3

- 精确 leg 3 文案与 `开始第 3 段`；尝试 `1`；
- 初态示例：位置 `220.00 / 420.00`、速度 `0.90 / -0.35`、角差 `-16`、角速度 `0`；
- 舱体从轴线下方带向上/向右余速，视觉必须与前两段有明显空间差异；
- 日志已有前两段共同记录，不显示第三段未来结果。

### D5 · 1280×800 approaching · 部分 Gate

- statusText 与 `暂停这一段`；舞台至少 720×446；
- 姿态席 `向左转 A` 与推进席 `主推 J` 处于真实 pressed 投影视觉；
- Gate 示例：位置未安全、线速度未安全、船头安全、角速度安全、四键未安全、路径安全；
- stable 0 / 30，总提示 `六条条件还没有同时安全。`；
- 不显示下一步提示、最佳轨迹、燃料或倒计时。

### D6 · 1280×800 approaching · 稳定窗中

- 六条全安全，四键全部 released，stable `17 / 30`；
- 总提示 `六条条件都安全，继续保持 17 / 30。`；
- 用克制的纸质刻度推进，不用闪烁、脉冲、全屏 glow 或提前庆祝；
- 遥测保持可读，控制仍 enabled 但未按下。

### D7 · 1280×800 failed · hull-contact

- hull statusText、`重新靠近`、尝试次数不自动增加；
- 舱体停在最后安全位置，不穿入站体；速度和角速度显示 0；
- Gate 的 `路径无碰撞` 必须为 `未安全`，总提示为 `本次接近已经结束，路径未安全。`；
- 四控制 disabled，稳定 0 / 30；不责怪某一席。

### D8 · 1280×800 failed · drifted

- drift statusText、`重新靠近`；
- 用安全区边界和最后安全位置解释“飘出”，但不画红色死亡区、扣分或生命；
- `路径无碰撞` 为未安全，其余 Gate 可保留最后位置的真实状态；
- 构图必须明显不同于 hull-contact，不能只换一句文案；`路径无碰撞=未安全` 来自本次 attempt 的 public 呈现覆盖，不代表权威坐标穿模。

### D9 · 1280×800 docked

- statusText、六条全安全、稳定 `30 / 30`；
- 第一或第二段使用 `进入下一段`；
- 日志新增当前段共同记录；
- 允许一个克制的纸质接口锁定变化，不用烟花、奖杯、分数或个人贡献图。

### D10 · 1504×1046 mission-result

- 标准纪念姿态，三段共同汇总与精确日志；
- `三次靠近，都被我们稳稳接住。`、`收下这次对接`；
- Gate 和稳定区 hidden，不出现全绿 + 0/30；
- 两席控制 disabled，可作为视觉下层，但不得抢过共同记录；
- 不显示完成赠言。

### D11 · 1504×1046 complete

- `对接完成，这一程一起回家。`、默认赠言与 `再对接一次`；
- 三段记录仍可见，Gate/stable hidden；
- 温暖收束但继续使用同一纸质训练台，不切成通用贺卡或浪漫星空海报；
- 不增加分享、下载、排行榜、彩蛋或导航。

### D12 · 390×844 mobile approaching

- 顺序保持页头 → 阶段 → 舞台 → 遥测 → Gate → 姿态席 → 推进席 → stable → 日志；
- 舞台保持完整宽高比，不裁掉接口或安全区；
- 两席上下排列，四按钮都至少 44px，主动作至少 48px；
- 遥测保留全称和单位，六条 Gate 不缩成图标；
- stable 17/30 或部分 Gate 均可；概念必须足够清楚以判断层级和密度，逐字可读性、真实触控尺寸与零横向溢出由浏览器 QA 证明。

### D13 · 320×568 small-screen failed

- 使用 hull 或 drift 失败态，内容宽 296–304px；
- 允许纵滚，但首屏必须看到阶段原因、舞台关键区域与 `重新靠近`；
- Gate、控制和日志按 DOM 顺序继续向下，不使用横向滚动或双列微缩；
- 全称、单位、按钮和焦点环不能被设计构图裁切；真实文字和目标尺寸由浏览器截图取证。

## 6. 实现后真实浏览器证据

以下不是 ImageGen 任务，也不得用概念图替代。生产实现完成后由 Browser/IAB 首选、不可用时由明确记录的 Playwright Chromium fallback 生成：

| QA | 真实证据 |
| --- | --- |
| Q1 action boundary | 1280×800，六项全安全、四键 released、stable 精确 `0 / 30`；仍为 approaching，无庆祝/结果/下一段 |
| Q2 desktop native | 1504×1046 与 1280×800 的 intro、approaching、failed、docked、mission-result、complete；100% zoom 尺寸与滚动 Gate |
| Q3 mobile native | 390×844 approaching 与 320×568 failed；真实 computed touch target、DOM/视觉顺序、零横向溢出 |
| Q4 zoom | 1280×800 与 1504×1046 各做 200% zoom；单列、允许纵滚、零横向滚、完整文字；不套用桌面舞台最小值 |
| Q5 reduced-motion | 四档适用视口全部实测；1280×800 和 390×844 留存代表截图。无星流/喷焰抖动/缓动/脉冲，规则、Gate、stable 与布局不变 |
| Q6 forced-colors | 四档适用视口全部实测；1280×800 和 390×844 留存代表截图。系统色、线型、文字、站体/接口/安全框、焦点环与六 Gate 全部可读 |
| Q7 image blocked | 四档适用视口全部实测；1280×800 和 390×844 留存代表截图。纯色世界、code-native SVG 与全部功能保留，无破图/布局洞 |
| Q8 no JavaScript | 320×568；只显示 H1、固定短规则、静态观察窗轮廓、启用 JS 说明、非训练说明五项；其余全部 absence |

Q1 证明 RELEASE 与首次稳定 TICK 之间的状态；D6 只定义稳定窗的视觉语言。Q5–Q7 的两张代表截图不缩小 177 规定的四档完整实测矩阵。Q5–Q8 验证真实 CSS、媒体查询、资源失败和脚本禁用，任何生成图只能作为方向说明，不能列为通过证据。

若额外检查 844×390 横屏，只要求零横向溢出、允许必要纵滚、阶段面板保持阅读顺序在舞台之前、两席控制仍为两个等权分组；它不是 177 的冻结首版 Gate，不得反向扩大完成定义。

## 7. 生产资产与 Intentional Deviation

### 7.1 概念图不是运行资产

D1–D13 只作为布局、材料、色彩、组件与响应式设计证据，保存在 `docs/assets/capsule-docking/`。不得把整张概念、裁切按钮、仪表、舱体或空间站直接放进运行目录。

### 7.2 允许的生成资产

接受概念后只在确有保真收益时单独生成：

- 无字深炭蓝轨道观察窗背景；
- 无文字、无品牌、无真实机构造型的暖灰纸质站体表面材质；它必须可平铺或安全裁切、没有接口开口/突出物/投影轮廓/碰撞边缘，只能由 code-native AABB/SVG mask 裁剪；
- 可选的无字终局柔和光层。

每项必须有稳定比例、无文字、无键位、无 Gate、无轨迹答案、无 Logo/水印，并记录 prompt、日期、原始尺寸、格式、SHA-256 与 `第三方输入：无`。终局柔光不得承担成功语义、不得降低文字对比度，并须能在图片阻断和 forced-colors 下完全移除。

### 7.3 为什么舱体与站体几何使用 code-native SVG

本作对一般游戏“生成角色/地形资产”的做法有一个明确偏离：舱体碰撞圆、空间站 AABB、接口、安全框、航向、速度向量与喷口状态必须由生产 SVG/DOM 按规则坐标投影，而不是用位图替代。

原因是这些图形同时承担可访问语义、碰撞对账、forced-colors、图片阻断和精确几何验收；位图轮廓会制造不可证明的 hitbox 漂移。生成图仍决定纸模风格、材质与色彩，但生产 SVG 的可见轮廓必须落在规格允许的几何内。这一偏离需进入最终 fidelity ledger，不得用粗糙占位图形降低视觉质量。

## 8. ImageGen 总简报

每张状态图携带以下共同自然语言方向，再附加第 5 节精确状态：

> Design a complete, production-practical local-first cooperative docking game screen for two partners sharing one device. The art direction is a tactile paper near-orbit training desk: one dominant charcoal-blue observation window, original warm-gray station geometry on the right, one shared paper-model capsule, restrained coral attitude controls and teal thrust controls, ivory instrument markings, subtle screen-print texture and a few brass binding details. The experience must read as two equal seats controlling different axes of the same craft, never as a solo cockpit or competition. Use an open canvas/training-rail layout, not a bento dashboard or nested card grid. Preserve generous spacing and excellent readable Chinese typography for title, status, telemetry, six safety gates, controls, progress and shared log. Keep real UI text, keycaps, buttons, telemetry, safety states, spacecraft geometry, dock geometry and focus states code-native and implementation-ready. No navigation, eyebrow, badges, pills, fake metrics, fuel, timer, score, leaderboard, share, audio, settings or extra product areas. No neon sci-fi grid, glassmorphism, purple glow, NASA/SpaceX/ISS branding, flags, mission patches, real docking hardware, trajectory answer, ghost route, next-key hint, logo or watermark. The whole requested viewport must be visible and readable; do not return a hero crop.

附加要求：

- Chinese text should be readable enough to judge hierarchy, likely line wrapping, button size and density. Exact copy fidelity, keycap behavior, touch size, accessibility state and responsive overflow will be verified only in code-rendered browser screenshots.
- The observation background may be fully rendered as an atmospheric asset, but every true game control and rule signal remains separable from it.
- Keep one consistent palette, typography mood, paper geometry, button family, telemetry family, Gate row family and spacing system across all 13 design anchors.
- Do not add decorative cockpit chrome, mini maps, charts, tabs, toolbars, status chips or unrelated panels.

## 9. 生成批次与文件命名

统一图像偏好确认后按三批生成，任何一批不清晰就先迭代，不用后续图掩盖问题：

1. 核心桌面：D1–D6；
2. 失败与结果：D7–D11；
3. 响应式：D12–D13。

文件名建议：

```text
docs/assets/capsule-docking/
  d01-desktop-intro.png
  d02-desktop-leg1-intro.png
  d03-desktop-leg2-intro.png
  d04-desktop-leg3-intro.png
  d05-desktop-approaching-partial.png
  d06-desktop-stable-window.png
  d07-desktop-failed-hull.png
  d08-desktop-failed-drift.png
  d09-desktop-docked.png
  d10-desktop-mission-result.png
  d11-desktop-complete.png
  d12-mobile-390-approaching.png
  d13-mobile-320-failed.png
  GENERATION.md
```

不创建上述路径的占位图或空台账。生成时才逐项写实际模型、配置、prompt、日期、尺寸、格式、SHA-256、审阅结论和第三方输入。

## 10. 概念审阅与拒绝条件

每张原图都用 `view_image` 原尺寸检查。以下任一项出现即拒绝或重生：

- 页面退化为单人驾驶舱、两艘船或对抗；
- 对 D1–D9、D12–D13：只有 hero/舞台，没有完整遥测、Gate、两席控制、stable 和当前日志；
- 对 `gateVisible=true` 的 D1–D9、D12–D13：少于或多于六条 Gate，或把 allOk 画成第七条；
- stable 0..29 被画成完成，或 docked 仍显示未完成；
- failed 穿模、责怪某一席，或把碰壳画成成功捕获；
- mission-result/complete 没有按合同隐藏 Gate/stable；
- 移动端逆序、缩写仪表、横向滚动或触控目标过小；
- 生成图烘焙金路径、未来按键、个人统计、真实单位或航天建议；
- NASA/SpaceX/ISS/国旗/任务徽章/真实接口、Logo、水印或第三方角色；
- 霓虹网格、玻璃拟态、默认卡片阵列、过量 glow、bokeh、徽章/pill 或浏览器默认控件字形；
- 文字/按钮太小、被裁、不可判断层级，或整页被压成不可实现的总览；生成图文字的逐字正确不作为拒绝理由，生产 copy diff 由浏览器证据负责；
- 背景/材质无法分离，图片阻断后必然破坏规则几何。

无 JavaScript、zoom、reduced-motion、forced-colors 与图片阻断不在 ImageGen 锚点拒绝表中；它们严格按第 6 节真实浏览器证据验收。

## 11. 用户接受后的设计系统提取

只有用户明确接受某组原图后，才创建/更新 `docs/209-capsule-docking-design-proposal.md` 并提取：

- 每张接受原图、原生尺寸、对应状态与用途；
- 允许首屏文案和完整 copy diff 清单；
- true background color、surface/text/muted/border/shadow/accent/semantic colors；
- 中文内容字体与 UI chrome/数字字体、字号、字重、行高和 responsive type；
- spacing scale、容器宽度、观察窗比例、舞台/遥测/Gate/控制/日志几何；
- button、control、Gate row、telemetry、log、phase panel 的组件家族和 variants；
- 全部 icon 的 metaphor、stroke/fill、尺寸、颜色、对齐和状态；
- 背景是否无 overlay、是否只用 edge fade/mask，以及图片阻断 fallback；
- desktop/mobile/landscape/zoom 重排规则；
- 运行资产清单与 intentional SVG deviation；
- 至少五项 fidelity ledger：文案、布局、字体、色彩、材质、容器、控件、图标、响应式和 motion。

接受前不得创建生产目录、实现计划或运行资产；“简报完成”不等于“概念已接受”。

## 12. 来源与借鉴声明

Gymnasium、p2.js、SAT.js 与 Phaser 只用于 176/177 已固定的机制研究，不是运行依赖或图像输入。NASA 资料只说明对接会关注位置、速度、姿态和姿态率四类状态，不提供本作参数、代码、素材或训练结论。

本作的双席权限、三航段、整数物理、碰撞、六项 Gate、状态机、中文文案、页面、SVG 与生成资产均独立实现。概念与资产不得复制、改写、翻译、链接或打包上述来源的源码、API、物理常量、动作/观察空间、奖励、求解器、测试、界面、品牌、图形或素材。最终 README/ATTRIBUTION 必须保留完整 40 位 commit、许可证、版权主体、实际借鉴点和未复制范围。
