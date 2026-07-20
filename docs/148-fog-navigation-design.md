# “雾里，跟着你走”视觉设计冻结

- 日期：2026-07-20
- 状态：已冻结，待实现
- 对应调研：[`146-fog-navigation-research.md`](./146-fog-navigation-research.md)
- 对应规格：[`147-fog-navigation-spec.md`](./147-fog-navigation-spec.md)
- 视觉方法：先用 OpenAI 内置 ImageGen 生成三态完整概念，再提取为真实 DOM/CSS 与一张无文字生产背景

## 1. 冻结结论

视觉方向是“深夜木桌上的两人折叠地图”：briefing 是暖纸完整图，cover 是合拢地图的中性交接，driving 是深蓝 `5×5` 局部雾窗，complete 是两张合拢的共同路线卡。界面不做军事雷达、赛博控制台、商业 Roguelike 像素风或胜负庆典。

视觉资产只提供气氛，规则信息必须由 DOM/CSS 表达。生成概念中的文字、地图、步数和图标不进入运行时图片，避免错字、虚构数据与阶段隐私泄漏。

## 2. 概念与生产源稿

### 2.1 三态概念

| 状态 | 文件 | 原始尺寸 | SHA-256 | 用途 |
| --- | --- | ---: | --- | --- |
| 桌面 briefing | [`assets/fog-navigation/desktop-briefing-concept.png`](./assets/fog-navigation/desktop-briefing-concept.png) | 1586×992 | `87ed6741bc0a6bf612366bbe90e87783099b62685287a2d15597d3a54ef859b1` | 冻结桌面地图/计时双栏与纸图层级 |
| 移动 driving | [`assets/fog-navigation/mobile-driving-concept.png`](./assets/fog-navigation/mobile-driving-concept.png) | 852×1846 | `79a56e198ecf9cf5daef9ff67d963c2df162586ddeb8cbe2b181064dc6be6662` | 冻结 5×5 雾窗、单步状态与四向控制 |
| 桌面 complete | [`assets/fog-navigation/desktop-complete-concept.png`](./assets/fog-navigation/desktop-complete-concept.png) | 1586×992 | `1990748efdaa34b592f73c2f711667173eec3c629b370a2572d5e04a0cba3848` | 冻结四轮账页、角色对称与结语纸笺 |

三张图已用 `view_image(detail="original")` 原尺寸查看。接受其构图、材质、色彩与信息层级，不接受其中生成的字面地图、图标和文字错误。

### 2.2 生产背景源稿

| 文件 | 原始尺寸 | SHA-256 | 运行目标 |
| --- | ---: | --- | --- |
| [`assets/fog-navigation/fog-table-background-source.png`](./assets/fog-navigation/fog-table-background-source.png) | 1672×941 | `b2113ee1e74d6b8a6fa0a9af97affabb3dd95283be13d703a9e0567c8f216236` | `experiences/co-op/fog-navigation/assets/fog-table-background.png` |

生产背景必须是源稿的逐字节副本，不裁切、不重绘、不通过外部工具二次生成。CSS 使用 `background-size: cover`；中央交互层另加不透明纸张，不能依赖背景自身对比度。

### 2.3 生成与输入声明

- 工具：OpenAI 内置 ImageGen；
- 日期：2026-07-20；
- 输入：纯文字 prompt；
- 参考图片：无；
- 第三方图片、商业游戏截图或开源项目资产输入：无；
- 生成图不含被授权的第三方商标或角色；
- prompt 约束了中文本地情侣游戏、折叠纸图、夜雾、深木桌、无军事/赛博/商业游戏风格。

## 3. 生成稿审校：必须舍弃的内容

概念是设计输入，不是 UI 截图。实现不得复制以下生成偏差：

1. briefing 图中的地图与 147 号四张冻结地图不同；生产版只能从 `levels.js` 构造；
2. briefing 规则文字出现“看图的人不碰方向”的生成误字风险；生产版全部用冻结 DOM 文案；
3. 概念地图为近 13×9 但格数与坐标标注不严格；生产版必须精确 13×9；
4. mobile 概念的地标花图不是“蓝风铃”；生产版使用原创 CSS 符号与真实 label；
5. complete 概念步数/尝试为虚构样例；生产版只能读 reducer 冻结摘要；
6. complete 副标题“小游戏练习”等生成文案不在允许文案中；
7. 概念使用图案化山墙；生产版不能把墙体做成会误导格边界的连续插画；
8. 概念焦点蓝框只是视觉暗示；生产版按 `:focus-visible` 和 forced-colors 实现。

## 4. 设计令牌

```css
:root {
  --ink-950: #10191d;
  --ink-900: #17252b;
  --ink-800: #24373d;
  --mist-700: #425f66;
  --mist-400: #8ba1a0;
  --paper-50: #f4ead2;
  --paper-100: #e9d8b7;
  --paper-300: #c7ad7f;
  --pine-700: #2f513f;
  --pine-500: #58765c;
  --amber-600: #b8752d;
  --amber-400: #dda85a;
  --danger-700: #8b3e33;
  --focus: #9dc8ff;
  --shadow-strong: 0 24px 70px rgb(5 10 12 / 48%);
  --shadow-paper: 0 12px 28px rgb(4 9 11 / 28%);
  --radius-small: 4px;
  --radius-medium: 10px;
  --content-max: 1320px;
}
```

### 4.1 字体

- 标题：`Iowan Old Style`, `Songti SC`, `STSong`, serif；
- 正文：`Avenir Next`, `PingFang SC`, `Microsoft YaHei`, sans-serif；
- 数字：`ui-monospace`, `SFMono-Regular`, monospace；
- 不加载远程字体；中文必须依赖系统字体稳定回退；
- 正文桌面不小于 16px，移动不小于 16px，辅助说明不小于 13px。

### 4.2 形状与纹理

- 主纸张最多 10px 圆角，结果账页 4px；不用大量胶囊卡；
- 纸纹用 CSS 多重线性/径向渐变，不能另加不可追踪纹理图；
- 墙体使用深墨底 + 斜线纹理；安全路使用纸色 + 点状颗粒；
- 雾使用伪元素渐变，不用 Canvas 像素擦除；
- 图标优先用简单 Unicode/文本符号与 CSS 形状，不引入图标库。

## 5. 全局页面骨架

```text
body.fog-navigation
└── main.app-shell
    ├── header.app-header
    │   ├── brand（灯符号、标题、副标题）
    │   └── round-status（轮次、地图、领航/驾驶）
    ├── section.stage-shell
    │   └── #stage（phase-owned DOM）
    ├── #controls（仅 driving）
    └── #live-status.sr-only
```

- body 使用生产背景与 `--ink-950` 回退；
- app shell 桌面宽 `min(1320px, calc(100% - 40px))`；
- header 高度控制在 72–92px；
- stage 为唯一主要视觉焦点；
- 不加入全局侧栏、汉堡菜单、音量、设置、教程抽屉或主题切换。

## 6. briefing

### 6.1 桌面 1440×900 / 1280×800

布局：

```text
┌ brand ─────────────── round / roles ┐
├─────────────────────────────────────┤
│ complete 13×9 map       7-second    │
│ paper (minmax 0, 1fr)   briefing    │
│                           panel     │
└─────────────────────────────────────┘
```

- stage grid：`minmax(0, 1fr) minmax(250px, 300px)`；gap 16px；
- 地图纸最大高 `calc(100vh - 150px)`，13/9 aspect ratio；
- 13×9 grid 用 `display:grid`，每格 `min-width:0; min-height:0`；
- 安全路径用格内四边 CSS 线段或绝对定位 DOM 连接，不能用背景截图；
- 当前起点、目标、地标、危险有符号 + label；
- 危险用 `×`、边框和“雾陷阱”，不只用红色；
- 计时环用 CSS `conic-gradient` 做表现，DOM 同时显示整数秒；
- 主动作“我记住了，折好地图”至少 48px 高；
- 时间到自动遮盖提示在按钮下，不与 live region 重复。

### 6.2 移动

- 390px 下改为单列，计时 panel 放地图上方的紧凑横条；
- 完整图仍显示全部 13×9，不横向滚动；格内只保留符号，地标全名放地图下方图例；
- 320px 下 header、副标题、状态行压缩间距，不缩小正文；
- briefing 可以纵向滚动，但 390×844 首屏至少看见完整地图上半部、计时和主动作入口；
- 不能为塞进首屏把格子变成不可辨认的 8px 字号。

## 7. cover 与 retry

- stage 中央是一张合拢纸图，最大宽 620px；
- cover 标题“把地图折好，交给要走路的人”；
- 显示“领航：X / 驾驶：Y”和原因对应的中性一句话；
- 主动作“我只看脚边，出发”至少 52px 高；
- 背景不显示任何地图格、路线、危险、地标或上一轮摘要；
- retry 使用同一构图，标题“没关系，我们再看一次”，主动作“重新看 7 秒”；
- retry 可显示尝试次数，不能显示陷阱方向或坐标。

## 8. driving

### 8.1 5×5 雾窗

- 正方形 `driver-grid`，桌面 `min(58vh, 620px)`，移动 `min(88vw, 520px)`；
- 精确 5×5，gap 2px，外框双线；
- 每格最小语义类：`void / wall / floor / landmark / goal / player`；
- `void` 与边缘雾融合但保留斜线轮廓；
- `wall` 深墨底、斜线与 `▲` 山墙符号；
- `floor` 雾蓝纸格；
- `landmark` 有圆章、短 symbol 和 DOM label；
- `goal` 有灯符号与“终点”；
- 中心 `player` 用脚印 + 小灯双符号，不能只靠发光；
- H 在 driver view 中是 floor，CSS 不存在 hazard class。

雾层仅覆盖格外与窗口边缘，不遮住当前 25 格的边线与可访问文本。

### 8.2 控制

桌面可放在网格右侧窄栏；移动放在网格下：

```text
      [ ↑ 上 ]
[ ← 左 ][ ↓ 下 ][ → 右 ]
```

- 桌面按钮 64×64px 起；移动 56×56px 起，390px 不小于 56px，320px 不小于 52px；
- 使用原生 button，箭头与中文双重标记；
- 深墨蓝底、纸白字、琥珀 active、`--focus` 双线 focus；
- hover 只在 `(hover:hover)` 启用，避免触屏 sticky hover；
- 不实现按住连发，pressed 只作短暂视觉反馈。

### 8.3 状态与密度

- 地图下显示一句事实反馈，例如“到了蓝风铃旁，等领航员说下一步”；
- 统计一行：`步数 08 · 尝试 1 · 撞墙 0`；
- 不显示完整地图坐标、目标方向、危险距离或路线缩略图；
- 移动 390×844 首屏包含标题、角色、完整 5×5、反馈、统计和全部方向按钮；
- 320×700 可以出现纵向滚动，但打开时至少看见完整 5×5 与上方向按钮。

## 9. round-result 与 complete

### 9.1 round-result

- 单张路线卡，标题“这一段，走到了灯下”；
- 显示地图名、领航/驾驶、真实 steps、attempts、bumps；
- 下一轮角色对换用一句话说明；
- 主动作“交换角色，走下一段”；
- 不显示分数、评级、星级或“最佳”。

### 9.2 complete

- 桌面两栏：左 `minmax(0, 1fr)` 四轮账页，右 320px 结语纸笺；
- 四行摘要严格来自 completedRounds；每行显示地图、领航、驾驶、步数、尝试；
- 角色对称证明单独显示：双方均 `领航 2 次 · 驾驶 2 次`；
- 右侧结语只用 `textContent`，可配置但不解释为得分；
- 底部主按钮“再走四段雾路”，次链接“返回体验目录”；
- 不做烟花、彩带、奖杯、排行榜或自动播放音频；
- 1440×900、1280×800 complete 无纵向滚动；移动允许自然滚动，摘要保持单行语义不做横向表格。

## 10. 允许文案

实现只能从以下冻结文案与 147 号关卡/配置数据组合：

```text
雾里，跟着你走
你记住整条路，我只看见脚边。
看图的人不碰方向，走路的人不看全图。
第 {n} / 4 段 · {title}
领航：{name}
驾驶：{name}
还剩 {seconds} 秒
我记住了，折好地图
时间到会自动遮盖
把地图折好，交给要走路的人
我只看脚边，出发
每次只走一格，慢一点也没关系
前面走不通，问问领航员
到了{landmark}旁，等领航员说下一步
没关系，我们再看一次
重新看 7 秒
这一段，走到了灯下
交换角色，走下一段
4 段雾路，都走到了灯下
再走四段雾路
返回体验目录
```

cover reason 文案：

- timer：`看图时间到了，现在只留脚边的雾窗。`
- manual：`地图已经折好，可以交接了。`
- hidden：`页面离开过视线，地图已经安全遮盖。`
- blur：`窗口失去焦点，地图已经安全遮盖。`

## 11. 动效与生命周期

- briefing 计时环线性缩短；规则 tick 仍由 reducer 决定；
- 雾可做 12–18 秒低幅漂移，transform 不超过 8px；
- cover 纸图合拢 240ms；
- 移动成功只做中心灯 160ms 呼吸，不平移整张 grid；
- 撞墙做 120ms、2px 抖动；
- 陷阱直接切 retry，不播放惊吓闪屏；
- `prefers-reduced-motion: reduce` 关闭漂移、合拢、呼吸和抖动，阶段与反馈即时出现；
- hidden/blur 时立即停止表现动画和 rAF accumulator。

## 12. 响应式冻结

| 视口 | 目标 |
| --- | --- |
| 1440×900 | briefing 与 complete 无滚动；driving 舞台与控制同屏 |
| 1280×800 | header 压缩；主舞台、状态、主动作仍完整首屏 |
| 390×844 | 单列；driving 全部主控制首屏；briefing/complete 可纵向滚动 |
| 320×700 | 无横向溢出；正文 16px；按钮 ≥52px；完整 5×5 与上键首屏可见 |

断点建议：

- `@media (max-width: 900px)`：briefing/complete 双栏变单列；
- `@media (max-width: 560px)`：header 纵向、纸张内边距 14px、driver grid `calc(100vw - 32px)`；
- `@media (max-height: 820px) and (min-width: 901px)`：压缩 header、stage gap、纸张 padding；
- 不用 JS 判断 viewport，不让 responsive 影响规则 view。

## 13. 可访问性与降级

### 13.1 forced-colors

- 移除生产背景和纸纹，body 用 Canvas，文本用 CanvasText；
- 所有格使用 1px ButtonText 边框；墙使用 `▲`，player 使用 `●`，goal 使用 `◎`；
- `forced-color-adjust: none` 只限必须保留状态的极小符号，默认尊重系统色；
- focus 使用 `Highlight` 3px outline。

### 13.2 背景失败

- body 回退为 `--ink-950` + CSS 木纹渐变；
- stage 纸张、网格、符号、控制和文案全部仍存在；
- 不通过 JS 检测图片加载，不显示错误弹窗；
- 浏览器验收必须阻断背景请求后完成至少一轮。

### 13.3 文本与键盘

- 200% 字体下允许纵向滚动，不覆盖按钮或裁切 live 文案；
- direction buttons 有 `aria-label="向上走一格"` 等完整名称；
- 25 格 grid 的可访问名不泄露 H；
- briefing 全图替代文本只存在 briefing DOM，cover 前真实移除；
- 重渲染不夺走方向键按钮焦点；如 phase 改变，焦点移到新阶段标题/主动作。

## 14. 组件到实现映射

| 视觉组件 | DOM/CSS 实现 | 数据来源 |
| --- | --- | --- |
| 品牌与小灯 | header + CSS/Unicode 灯符号 | 冻结文案 |
| 轮次与角色条 | definition list / status row | public view |
| 13×9 导航图 | 117 个 DOM cells | navigator view |
| 安全路线 | cell edge classes | navigator `safePath` |
| 7 秒环 | progress + conic-gradient | `briefingTicks` |
| cover/retry 纸图 | phase card + CSS fold | public view |
| 5×5 雾窗 | 25 个 DOM gridcells | driver view |
| 四向控制 | 4 个 native buttons | app action dispatch |
| 单轮摘要 | semantic dl | completed round |
| 四轮账页 | ordered list of 4 summaries | complete public view |
| 个性结语 | blockquote-like paper note | sanitized composer result |
| 木桌/提灯 | ImageGen background | local PNG |

## 15. Fidelity ledger

最终浏览器验收逐项对照：

| Gate | briefing 桌面 | driving 移动 | complete 桌面 |
| --- | --- | --- | --- |
| 深木桌 + 边缘松枝/灯 | 必须 | 必须 | 必须 |
| 暖纸主舞台 | 必须 | 必须 | 必须 |
| 主要信息层级 | 地图 > 计时 > 规则 | 5×5 > 反馈 > 控制 | 四轮摘要 > 对称 > 结语 |
| 概念文字逐字复制 | 禁止 | 禁止 | 禁止 |
| 概念地图/数据复制 | 禁止 | 禁止 | 禁止 |
| 真实 DOM 文案 | 必须 | 必须 | 必须 |
| 主动作首屏可见 | 必须 | 必须 | 必须 |
| 背景禁用仍可玩 | 必须 | 必须 | 必须 |
| reduced-motion 无规则变化 | 必须 | 必须 | 必须 |
| forced-colors 非颜色冗余 | 必须 | 必须 | 必须 |

允许实现因真实 13×9 数据、中文系统字体、浏览器原生控件和可访问性需要调整细节；不允许改变整体色彩、纸图/雾窗主隐喻、信息优先级或三态构图。

## 16. 实现前 Gate

1. 生产背景从冻结 source 逐字节复制并进入作品资产目录；
2. favicon 使用原创 SVG，小灯图形不复制概念像素；
3. HTML 只包含初始壳，不内置完整地图或完成摘要；
4. CSS 实现全部网格与状态，不把三态概念当背景；
5. app 每阶段 `replaceChildren()`，briefing 离开后完整图节点不可查询；
6. 视觉实现由前端子任务负责，逻辑子任务不得修改 design/概念资产；
7. 最终截图与本文件三张概念均用原尺寸查看；
8. 任何视觉偏差写入验收记录；真实 bug 写入 `/bugs`。
