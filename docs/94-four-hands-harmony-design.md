# “这一拍，刚好和你”视觉设计

- 日期：2026-07-18
- 对应规格：[`92-four-hands-harmony-spec.md`](./92-four-hands-harmony-spec.md)
- 概念方式：OpenAI 内置 ImageGen，`ui-mockup` / `stylized-concept`
- 状态：桌面进行、移动进行、桌面完成和生产背景已接受；本文件是前端实现视觉规格

## 1. 接受的概念与生产资产

| 资产 | 原生尺寸 | 用途 |
| --- | --- | --- |
| [`../design/four-hands-harmony/concept-desktop-playing.png`](../design/four-hands-harmony/concept-desktop-playing.png) | 1504×1046 | 桌面进行态的构图、材质、组件与第一视口依据 |
| [`../design/four-hands-harmony/concept-mobile-playing.png`](../design/four-hands-harmony/concept-mobile-playing.png) | 853×1844 | 390×844 移动重排的高分辨率视觉系统参考，不作像素高度照抄 |
| [`../design/four-hands-harmony/concept-desktop-complete.png`](../design/four-hands-harmony/concept-desktop-complete.png) | 1504×1046 | 桌面完成态的五枚印记、信纸层级和后续动作依据 |
| [`../experiences/co-op/four-hands-harmony/assets/harmony-table.webp`](../experiences/co-op/four-hands-harmony/assets/harmony-table.webp) | 1504×1046，65,080 bytes | 运行时无字晨光背景，CSS 背景失败时不得影响玩法 |

四张资产已在同一轮以 `view_image(detail=original)` 检查。生产 WebP 保留中央低对比留白、左右叶影、边缘薄荷/杏色织物和黄铜物件，没有可见块状压缩损伤。

## 2. 视觉方向

核心句：**两条柔软声部在一张晨光桌上合成同一枚和弦印记。**

- 主题：明亮晨光排练角，不是夜店、录音棚或传统钢琴教室；
- 背景：象牙墙面、浅白蜡木桌、柔叶影；中央 70% 低对比；
- 低音席：灰薄荷织物、深苔绿文字与轮廓；
- 高音席：浅杏织物、暖橙文字与轮廓；
- 共同区域：象牙纸、细黄铜线、折页/印记轮廓；
- 字体性格：标题与大音名使用克制宋体/衬线，按钮与状态使用清楚系统无衬线；
- 动效：琴键轻微下沉、和声线从两边向中央填充、完成印记短暂显现；
- 视觉禁区：磁带、打孔纸带、16 位轨道、比分台、暗色模拟机箱、霓虹落键轨、写实 88 键钢琴、DAW、奖杯、彩纸屑和评分星星。

## 3. 设计令牌

```css
:root {
  --bg-fallback: #f4efe6;
  --paper: #fffdf8;
  --paper-soft: #f8f3ea;
  --ink: #2d2b27;
  --ink-muted: #69645b;
  --line: #d8c9ad;
  --brass: #b68a43;
  --brass-dark: #7e5b27;
  --low: #667b5f;
  --low-soft: #dce4d7;
  --high: #c86e2c;
  --high-soft: #f3dfc9;
  --danger-neutral: #7b5948;
  --shadow-paper: 0 10px 28px rgb(71 55 34 / 12%);
  --shadow-key: 0 5px 0 #d6cfc2, 0 8px 18px rgb(57 47 34 / 12%);
  --radius-small: 10px;
  --radius-medium: 18px;
  --radius-seal: 34% 34% 44% 44% / 24% 24% 50% 50%;
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 24px;
  --space-6: 32px;
  --space-7: 48px;
  --motion-fast: 140ms;
  --motion-mark: 260ms;
}
```

颜色锁：背景是暖象牙而非纯白；不得改成冷灰或深色。生产图不加整图色彩 overlay/tint；只能用匹配背景色的边缘渐变帮助图片与页面延伸融合，不能洗掉图像色温。

### 3.1 字体

- 标题、大键位、完成主句：`"Iowan Old Style", "Songti SC", STSong, serif`；
- 正文、状态、控件：`-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", sans-serif`；
- H1：desktop 46–56px / mobile 30–36px，1.1 行高，600；
- 当前键位：desktop 64–80px / mobile 34–46px，1 行高；
- 状态/按钮：15–18px，600；
- 辅助说明：12–14px，1.5 行高；
- 所有 button/switch 显式声明字体、字号和行高，不依赖浏览器默认值。

## 4. 容器与组件

### 4.1 页面骨架

使用开放桌面，不用“整页大圆角卡”：

1. 顶栏：返回链接；右侧声音 switch；
2. 标题区：H1 和一句分工说明；
3. 五节谱带：一条折页纸轨，五枚圆形 step；
4. 共同区域：中央和弦印记、目标键/音名、保持线；
5. 两席琴键：桌面左右同权，移动上下同权；
6. 单一暂停动作；
7. 隐私页脚。

页面主容器 desktop 最大宽 1400px，左右 gutter 32–48px；390px gutter 16px；320px gutter 12px。背景 full-bleed，所有交互在语义 main 内。

### 4.2 顶栏

- 返回：文本“返回 Two of Us”+ 自制 18px SVG 左箭头；无独立圆形 icon button；
- 声音：原生 button `role=switch`，文本“声音：开 / 关 / 视觉模式”，配 18px 自制 speaker SVG；
- 不使用概念中的下拉 chevron，首版没有声音菜单；
- 触控高度 >=48px；焦点使用 3px 当前色 outline。

### 4.3 五节谱带

- `ol` + 5 个 `li`，不是图片；
- 每步包含序号和标题：靠近、回应、转身、停在这里、回到我们；
- 当前：`aria-current=step`、粗黄铜轮廓和可见“当前”文本；
- 完成：check SVG + “完成”可访问文本；等待：普通序号；
- desktop 单行；390/320 保持 5 列紧凑单行，不做横向滚动；标题在 320 可只显示当前完整标题，其余保留序号与读屏名称。

### 4.4 中央和弦印记

- 使用单一开放 paper surface，轮廓取概念的花瓣/折页感，但几何由 CSS 实现；
- 左右目标分栏，中线用细黄铜线；中间不用装饰图片；
- 显示实体键大字、音名、`低音 + 高音` 和 instruction；
- 进度条使用原生语义 `role=progressbar`，左半低音色、右半高音色向中央/全长合拢；同时显示百分比或“保持中”；
- measure-complete 将 instruction 改成“和弦收好了，双方松开”，并显示真实“完成”文字；
- 不能仅靠心形、发光或颜色表达 join。

### 4.5 两席声部轨

- 每席一个 `fieldset` + `legend`，不是四张独立卡；
- 低音标题包括配置称呼和“低音席”，高音同理；
- 每席四个原生 button，等宽、最低 64px（desktop 112–144px 高）；
- 每键显示实体键与音名；目标键有“目标键”文字、双层轮廓；held 另用下沉和“按住”文字；
- disabled/paused 不保留演奏按钮在 DOM；
- `touch-action:none` 只施加到琴键，不阻止页面其他区域滚动。

### 4.6 暂停与完成

- 暂停是小型次级圆形/文字按钮，位于双席下方中央；不与琴键争夺主层级；
- complete 移除中央目标、两席琴键和暂停；
- 五枚完成印记由谱带放大/重排而来，含数字、标题、check 和“完成”；
- 最终文案位于一张开放折页信纸，不做 modal；
- 主动作“再合一次”，次链接“返回作品库”；
- 无 confetti、奖杯、评分或性能统计。

## 5. 图标清单

| 图标 | 语义 | 实现 |
| --- | --- | --- |
| 返回箭头 | 返回作品库 | 18px 自制 outline SVG，2px round stroke，currentColor |
| speaker on/off | 声音状态 | 18px 自制 outline SVG，同一 stroke 系统；状态另有文字 |
| pause | 暂停 | 两根 3px 圆角竖线 SVG；按钮另有“暂停合奏” |
| check | 完成一节 | 16px outline SVG；同节点另有“完成”文字 |
| focus/pressed | 交互状态 | 不用图标；outline、边框和状态文字 |

叶片、锁、爱心和节拍器不进入功能图标集；它们在概念中只是氛围。生产页面不需要用粗糙 SVG 重建这些装饰。

## 6. 允许文案

首屏/阶段可见文案白名单：

### 持久区

- `返回 Two of Us`
- `声音：开` / `声音：关` / `声音未开启，视觉模式仍可完成`
- `这一拍，刚好和你`
- `你接住低音，我接住高音。`
- `声音由浏览器即时合成；不录音、不联网、不保存。`

### intro

- 配置 intro；
- `谱一直在这里，不用背。找到各自的键，一起按住。`
- `开始合奏`

### playing / measure-complete

- `第 N / 5 节 · {title}`
- `一起按住，让这一小节合上`
- `左边的你 · 低音席` / 配置称呼；
- `右边的你 · 高音席` / 配置称呼；
- `目标键`、`按住`、`等待另一边`、`保持中`；
- `和弦收好了，双方松开`
- `差一点没关系，双方松开再来`
- `这个音在旁边，看看目标键`
- `暂停合奏`

### paused

- `琴键已经松开`
- `回来后从这一小节继续。`
- `继续合奏`

### complete

- 配置 finalTitle、composeHarmonyMessage 结果和 signature；
- `五次相遇，成了我们的小曲`
- `再合一次`
- `返回作品库`

不得新增 hero eyebrow、kicker、badge、pill、假数据、音准评价、手速评价或“谁拖后腿”类文案。

## 7. 响应式规格

### 7.1 1504×1046

- 目标：无页面横向/纵向滚动，标题、五节谱带、共同区域、左右八键、暂停和页脚同屏；
- 两席左右并排，各占约 32–34%；中央印记约 30–34%；
- 琴键约 96–118px 宽、124–154px 高；
- 顶栏和标题合计不超过 122px，谱带不超过 126px，共同/琴键主区约 470px；
- 完成态五印记单行，信纸和两个动作在首屏。

### 7.2 390×844

- 两席上下排列，每席四键一行；不横向滚动；
- 标题、谱带、缩小后的中央目标、两席键盘与暂停必须在 844px 内；隐私页脚可在首屏底缘或紧随其后；
- 五节谱带高度 <=72px；中央印记改为横向折页，不照抄概念中占高过大的圆形；
- 琴键最小约 76×58px；席位说明与四键组成一个开放 rail；
- 植物/边缘物件由 cover 自然裁切，不补额外装饰。

### 7.3 320×700

- 允许自然纵向滚动但无横向溢出；
- 两席上下排列，四键保持一行，每键最小 64×56px；
- 当前目标、两席琴键和暂停按 DOM 顺序可达；
- 非当前 step 的长标题视觉隐藏但保留可访问名称；
- 标题 30px，gutter 12px，组件间距压到 8–12px，不通过缩小控件到 48px 以下换高度。

## 8. 状态与动效

| 状态 | 视觉 | 文字/语义 |
| --- | --- | --- |
| target | 双层席位色轮廓、顶部短标 | “目标键” |
| held-one | 对应键下沉、半边进度着色 | “等待另一边” |
| joined | 两键都下沉、进度增长 | “保持中”，progressbar 数值 |
| outside-window | 进度归零、两键保留按下轮廓 | “差一点没关系，双方松开再来” |
| measure-complete | 印记 check、两键完成边框 | “和弦收好了，双方松开” |
| paused | 演奏 DOM 移除、单一恢复面板 | 标题与继续按钮 |
| complete | 五印记 + 信纸 | 完成标题、文案、签名 |

默认动效：120–140ms 键位下沉，260ms 印记显现，保持条由 reducer 值驱动。不得等待 animationend 推进状态。

`prefers-reduced-motion: reduce`：全部取消位移、缩放、光晕扩散和漂浮；使用即时边框/文字切换。300ms 保持是规则信息，不是 CSS 动画，保持不变。

`forced-colors: active`：移除背景图、纸张阴影与席位填色；使用 Canvas/CanvasText/ButtonFace/ButtonText/Highlight；target、held、complete 依靠 outline 样式和真实文字区分。

## 9. 媒体处理

- `harmony-table.webp` 使用 `background-image`，`center / cover no-repeat`；
- 不在图片上加全屏颜色 overlay/tint；
- 页面延伸区使用 `--bg-fallback`，必要时在图片边缘使用同色渐变 mask/edge fade；
- UI surface 自己拥有不透明或高透明度 paper 背景，保证正文对比，不用给整图加蒙层；
- 图片 404 时纯象牙/浅木 CSS 背景仍完成全部信息层级；
- forced colors 直接 `background-image:none`。

## 10. ImageGen 提示词与来源

四次调用均使用 OpenAI 内置 ImageGen；没有输入第三方图片。后三张以本批桌面概念作为视觉系统参考，属于本项目内的连续生成。

### 10.1 桌面进行态

```text
Use case: ui-mockup. Full desktop primary playing screen, native 1504x1046.
Chinese cooperative game “这一拍，刚好和你”; low A/S/D/F and high J/K/L/;,
current A+L, five public steps, no score/timer/winner. Bright morning conservatory,
pale ash wood, ivory linen, mint low voice, apricot high voice, brass details.
Complete top navigation, title, five-step strip, central meeting marker, equal seat rails,
eight large code-native controls and pause. Avoid realistic piano, dark studio, neon rhythm
track, cassette, DAW, cards, badges, pills, people, hands and watermark.
```

### 10.2 移动进行态

```text
Use case: ui-mockup. Fresh standalone 390x844 mobile playing state, using the desktop
concept only as a style-system reference. Recompose the complete screen: compact nav,
title, five steps, central A+L hold panel, two vertically stacked four-key rails, pause
and privacy. Same ivory/ash/mint/apricot/brass identity, >=48px controls, no horizontal
scroll. Avoid cropped desktop layout, tiny keys, carousel, overlap, dark/neon music UI.
```

### 10.3 桌面完成态

```text
Use case: ui-mockup. Fresh standalone 1504x1046 completion state in the same system.
Remove playable keys, hold progress and pause. Show five completed paper/brass seals
labeled 靠近/回应/转身/停在这里/回到我们, then an open folded letter with the final
dedication, “再合一次” and “返回作品库”. No game-over modal, score, stars, trophy,
confetti, badges, piano keys, people or watermark.
```

### 10.4 生产背景

```text
Use case: stylized-concept. Production 1504x1046 responsive web background.
Bright morning conservatory, pale ash desk, matte ivory wall, soft leaf shadows,
restrained brass/glass props only at far edges, muted mint fabric left and apricot
fabric right. Center 70% empty, low contrast and crop-safe. Background only: no UI,
panels, cards, controls, keyboard, piano keys, sheet music, notation, symbols, hearts,
text, letters, numbers, logo, watermark, hands or people.
```

生产 PNG 经 `baoyu-compress-image` 的临时 Sharp 回退以 quality 82 转为 WebP；完整工具链缺陷和验证见 [`../bugs/2026-07-18-four-hands-harmony-webp-encoder-unavailable.md`](../bugs/2026-07-18-four-hands-harmony-webp-encoder-unavailable.md)。运行项目没有新增压缩依赖。

## 11. 概念到实装 Fidelity ledger

| 比较点 | 概念证据 | 实装要求 | 已接受偏离 |
| --- | --- | --- | --- |
| 第一视口 | 桌面图完整显示标题、谱带、中央目标、左右八键和暂停 | 1504×1046 同屏，无滚动 | 删除多余叶片/心形装饰 |
| 信息层级 | A+L 中央最大，席位同权 | 当前目标 > 键位 > 谱带/暂停 | 目标音名用 DOM，不照抄生成排版 |
| 容器模型 | 开放桌面 + 单一折页谱带/印记 | 禁止默认卡片网格和整页大卡 | 席位阴影减轻，提高文字对比 |
| 色板 | 象牙、薄荷、杏、黄铜 | 令牌锁定，背景不加色罩 | forced colors 完全替换色板 |
| 琴键 | 大型纸质按键，目标双轮廓 | 原生 button、键位+音名+状态文字 | 减少拟物厚度以稳定响应式 |
| 移动 | 两席上下、目标在前 | 390×844 压缩同屏；320 自然滚动 | 中央圆形改横向折页，避免长图过高 |
| 完成 | 五印记、信纸主文案、两个后续动作 | 移除全部演奏控件和暂停 | 叶片图案改 check+文字，避免装饰承载语义 |
| 背景 | 晨光排练角、中央安静 | 原创 WebP + CSS fallback | edge props 可被 cover 裁切 |
| 图标 | 概念有返回/声音/暂停 | 同风格自制 outline SVG + 文字 | 删除概念声音下拉 chevron |
| 文案 | 概念生成文字作为空间参考 | 只用第 6 节白名单与配置 textContent | 不复用任何非白名单生成中文 |

## 12. 编码前验收

- [x] 完整桌面进行态，而非单独 hero；
- [x] 完整移动进行态，包含两席和全部八键；
- [x] 完整桌面完成态，删除演奏控件；
- [x] 独立无字生产背景；
- [x] 设计令牌、字体、图标、组件与容器模型；
- [x] 允许首屏/阶段文案；
- [x] 背景 overlay 策略与 CSS fallback；
- [x] 1504/390/320 重排；
- [x] reduced motion 与 forced colors；
- [x] 至少五项 Fidelity ledger；
- [x] 每张资产原生 `view_image` 检查；
- [x] ImageGen 提示词与本地保存路径。

前端实现不得新增未列出的主要组件、首屏文案或视觉范式。若真实浏览器高度、焦点或可访问性要求与概念冲突，先采用本文件列出的已接受偏离；仍无法解决时才修订本设计规格。
