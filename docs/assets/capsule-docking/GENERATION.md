# “转一点，推一点，刚好回家”视觉概念生成记录

- 生成日期：2026-07-25
- 工具：OpenAI 内置 ImageGen
- 模型版本 / seed：工具未暴露；不猜测
- 用途：统一视觉方向确认；不是生产 UI、规则状态、碰撞几何或可访问性证据
- 第三方图片输入：无
- 对应简报：[208-capsule-docking-imagegen-brief.md](../../208-capsule-docking-imagegen-brief.md)

## 1. 当前可审阅概念

| 文件 | 原生尺寸 | SHA-256 | 审阅用途 |
| --- | ---: | --- | --- |
| `d05-desktop-approaching-partial.png` | 1586×992 | `4b43ddea95c03c8fc7d4890c4a0924f735c032ee1b11e4601a039b92862d5ab8` | desktop active：整体层级、训练台材质、舞台与 Gate 的桌面比例、两席色彩角色 |
| `d12-mobile-390-approaching.png` | 853×1844 | `7873660f5ee851207ce921243c2a5cb9511afab3897346d9779f4bbf4248efab` | mobile active：自然纵向顺序、完整信息密度、两席全宽堆叠与触控尺度 |

两张图属于同一个“纸质近地轨道训练台”方向，不是两个备选方案。两张图都只锁
视觉语言和响应式关系；所有运行状态仍以
`experiences/co-op/capsule-docking/logic.js` 的 public view 与冻结规格为准。

## 2. 生成链

1. desktop active 由纯文字提示生成，没有输入参考图；
2. 第一版 mobile active 参考 desktop active 的材质和组件语言生成；
3. 复核发现第一版移动稿把姿态席与推进席并排，违反移动端固定阅读顺序；
4. 最终 mobile active 以第一版移动稿为编辑输入，只修正两席布局并保持完整长页。

第一版移动稿未进入仓库：

- 工具输出：`call_9T7i1gi0ZqSTGqAZL9qEvYih.png`
- 原生尺寸：853×1844
- SHA-256：`35999a522346bfca3e5c24dcd6265fd4407943e77b803a1e402e1a3a239d3682`
- 拒绝原因：姿态席和推进席在同一行并排，不能作为 390px 生产布局依据

## 3. 生成提示

### 3.1 desktop active

```text
Create one complete, production-practical desktop UI concept screenshot for a
local same-device Chinese cooperative game called “转一点，推一点，刚好回家”.
This is the active approaching state, not a landing page and not a hero crop.

Visual direction: “纸质近地轨道训练台”. Use a warm gray paper training-table
frame around one deep charcoal-blue orbital observation window. Show one
original paper-model capsule on the left and one original warm-gray docking
station on the right, with the docking port facing left. The objects must not
resemble NASA, SpaceX, ISS, a real vehicle, or any commercial brand. Use ivory
marks, restrained brass fasteners and light silkscreen misregistration. The
attitude seat is muted coral; the thrust seat is muted teal. The visual should
feel authored, warm and precise, not military, neon, glassmorphic or sci-fi
dashboard-like.

Show the complete page at desktop scale with no cropping and no scroll:
- H1 “转一点，推一点，刚好回家”
- rule “姿态席只管转，推进席只管推。六条条件一起安全，并保持 30 格，就能稳稳接住。”
- phase “当前阶段（接近中）”
- status “接口就在右边；轻推、回正、收住余速。”
- one primary action “暂停这一段”
- a large playable observation stage
- exactly four telemetry groups: “位置 x / y”, “线速度 vx / vy”, “船头角差”, “角速度”
- exactly six Gate rows in this order: “位置进入接口”, “线速度收住”, “船头对准”,
  “角速度收住”, “四键已松开”, “路径无碰撞”
- each Gate says only “安全” or “未安全”; use this partial example:
  未安全, 未安全, 安全, 安全, 未安全, 安全
- control group “你 · 姿态席” with “向左转 A” and “向右转 D”
- control group “TA · 推进席” with “主推 J” and “反推 L”
- show A and J as currently pressed
- stable progress “稳定 0 / 30”
- a visible empty completion-log area
- footer “本地同机，不联网。这是归一化的合作游戏，不是航天训练或真实操作建议。”

Use an open training-table composition rather than a bento/card wall. No
navigation, logo, sidebar, badges, pills, settings, help drawer, score, fuel,
timer, leaderboard, share, trajectories, ghost paths, next-key coaching,
personal contribution, fake statistics, real units or extra controls. All
visible interface text, buttons and geometry are conceptual code-native UI,
not painted runtime assets. Prioritize one coherent full screen, legible
Chinese hierarchy, realistic HTML/CSS implementability and balanced control
groups.
```

### 3.2 第一版 mobile active（已拒绝）

```text
Using the desktop concept only as the style reference, create one complete
tall mobile active-state concept for the same “纸质近地轨道训练台” cooperative
docking game. Preserve the warm paper, charcoal observation window, ivory,
brass, muted coral attitude seat and muted teal thrust seat. Do not introduce
a new direction.

Show the whole page, not a crop. Keep the exact natural reading order:
header, phase/status/action, stage, four telemetry groups, exactly six Gate
rows, attitude controls, thrust controls, stable 0/30, empty completion log,
and the local/offline disclaimer. Keep the same partial Gate example and show
A and J pressed. Make touch controls generous and keep every required region
visible. No navigation, bento wall, badges, pills, score, fuel, timer,
trajectory, hints, fake statistics or extra actions.
```

### 3.3 mobile active 定向修正（当前采用）

```text
Edit this mobile UI concept without changing its visual direction. Preserve
the warm paper training table, charcoal observation window, one shared
capsule, right-side original docking port, four telemetry groups, exactly six
Gate rows, muted coral and teal roles, status/action, stable 0/30, empty log,
and local/offline disclaimer.

The only structural correction is mandatory: on mobile, place the complete
“你 · 姿态席” control group first as one full-width row, then place the
complete “TA · 推进席” control group below it as a second full-width row.
Never put the two seat groups side by side. Inside each group its two large
buttons may remain side by side. Keep A and J visibly pressed. Preserve the
natural vertical order and render the complete tall page with no cropped
bottom content. Do not add or remove any UI region, control, Gate, statistic,
navigation or decorative panel.
```

## 4. 原尺寸人工复核

两张采用稿均以原尺寸打开复核，而不是只看缩略图。

可采纳：

- 一艘共享舱体、一个右侧接口，没有被误画成双船竞速；
- 桌面把舞台作为主视觉，Gate 与控制仍保持可读；
- 移动端严格按阶段、舞台、遥测、Gate、姿态席、推进席、稳定、日志堆叠；
- 六条 Gate 数量正确，部分安全状态与 active 示例一致；
- 珊瑚与青绿只区分席位，同时仍有席位名、动作名和键位文字；
- 没有导航、品牌、分数、燃料、计时器、下一键提示或轨迹泄漏；
- 空白日志和本地边界说明仍在完整页面中。

## 5. 必须隔离的生成幻觉

| 概念图现象 | 生产边界 |
| --- | --- |
| 中文、英文 `Gate 1`—`Gate 6`、标点或字形可能有生成误差 | 所有文案逐字来自冻结规格，由 HTML 输出；不 OCR、不把英文编号当新增文案 |
| 角度示例被画成 `°` | 生产单位固定为 `角度格` 与 `角度格/tick` |
| 遥测数值是静态视觉示例 | 数值只来自 public view，不从图片抄录 |
| 舱体、接口、观察窗比例是视觉构图 | 生产碰撞体、接口体积和离散运动只来自 core；概念像素不参与命中判定 |
| A / J 的按下描边只是视觉示例 | `pressed`、焦点、键盘和 Pointer Events 状态全部由 DOM/CSS/JS 实现 |
| Gate 颜色与线型只是设计提示 | 每条必须同时输出“安全 / 未安全”文字，不能只靠颜色 |
| 图片尺寸不是 CSS viewport | 生产必须在目标浏览器视口重新截图和做溢出检查 |
| 纸纹、黄铜点和阴影属于概念气氛 | 未经后续资产审计，不把整图或局部裁切成运行时界面 |

## 6. 权利与来源声明

- 本次没有第三方图片、品牌图形、真实空间站照片或仓库外艺术作品作为输入。
- 输出是生成式概念，可能与其他输出不唯一；本记录不作独占性或绝对不侵权保证。
- 两张 PNG 只存放于 `docs/assets/capsule-docking/`，用于评审和未来 fidelity
  对照，不作为生产页面背景、精灵图、碰撞遮罩或隐藏提示。
- 如用户确认后再生成可平铺纸纹或透明模型资产，必须另开资产阶段，逐项补充来源、
  提示、尺寸、hash、授权边界与是否真正进入运行时。
