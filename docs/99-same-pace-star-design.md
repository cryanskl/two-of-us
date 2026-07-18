# “慢一点，也和你一起”视觉设计

- 日期：2026-07-18
- 对应规格：[`97-same-pace-star-spec.md`](./97-same-pace-star-spec.md)
- 概念方式：OpenAI 内置 ImageGen，`ui-mockup` / `stylized-concept`
- 状态：桌面进行、移动进行、桌面完成与生产背景已接受；本文件是前端实现视觉规格

## 1. 接受的概念与生产资产

| 资产 | 原生尺寸与体积 | 用途 |
| --- | --- | --- |
| [`../design/same-pace-star/concept-desktop-playing.png`](../design/same-pace-star/concept-desktop-playing.png) | 1536×1024，2,861,034 bytes | 桌面进行态的六星、双环、四格、双 pad 与材质依据 |
| [`../design/same-pace-star/concept-mobile-playing.png`](../design/same-pace-star/concept-mobile-playing.png) | 852×1846，2,719,014 bytes | 390×844 移动重排参考；两只 pad 必须横排，不照抄生成长图高度 |
| [`../design/same-pace-star/concept-desktop-complete.png`](../design/same-pace-star/concept-desktop-complete.png) | 1536×1024，2,891,509 bytes | 桌面完成态的六星弧、共享光环、信笺和后续动作依据 |
| [`../experiences/co-op/same-pace-star/assets/quiet-sky.webp`](../experiences/co-op/same-pace-star/assets/quiet-sky.webp) | 1717×916，187,864 bytes | 运行时无字夜空背景；缺失时 CSS fallback 不得影响玩法 |

四张资产在同一轮以 `view_image(detail=original)` 检查。生产 WebP 保留中央低细节纸纹、边缘暖金星点和几乎隐去的双圆轨，没有可见块状压缩损伤；转换工具链问题与回退证据见 [`../bugs/2026-07-18-same-pace-star-webp-encoder-unavailable.md`](../bugs/2026-07-18-same-pace-star-webp-encoder-unavailable.md)。

## 2. 视觉方向

核心句：**两个人在安静夜色里，把一圈光分成四拍交给彼此。**

- 主题：靛蓝手工纸夜空，不是冥想、呼吸训练或医疗健康界面；
- 背景：深墨靛蓝、轻纸纤维、边缘稀疏暖星，中央留给真实 DOM；
- 左席：低饱和蓝紫、双线圆弧与向左短标；
- 右席：柔和杏橙、单线圆弧与向右短标；
- 共同区域：月白光、暖黄铜、四枚不同内纹节拍格；
- 字体性格：标题和完成主句用克制衬线，动作、状态和按钮使用清楚系统无衬线；
- 动效：双环缓慢舒展、当前拍离散点亮、收到动作后边框收紧、完成星短暂显现；
- 视觉禁区：医疗圆环、真实肺部、心电图、呼吸秒表、瑜伽人物、心率数据、霓虹节奏轨、玻璃仪表盘、卡片网格、奖杯、彩纸屑和比赛评分。

## 3. 设计令牌

```css
:root {
  --night: #11152b;
  --night-soft: #1b203d;
  --night-raised: #252a50;
  --moon: #f4ecd8;
  --moon-muted: #c9c1ae;
  --brass: #e1ae62;
  --brass-dark: #9b6a31;
  --left: #8583ad;
  --left-soft: #353758;
  --right: #df966d;
  --right-soft: #503548;
  --line: rgb(244 236 216 / 28%);
  --surface: rgb(17 21 43 / 88%);
  --surface-solid: #171b34;
  --neutral-warning: #e8c79f;
  --shadow-glow: 0 0 32px rgb(225 174 98 / 18%);
  --shadow-pad: 0 12px 28px rgb(0 0 0 / 28%), inset 0 0 0 1px rgb(244 236 216 / 10%);
  --radius-small: 10px;
  --radius-medium: 18px;
  --radius-pad: 999px;
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 24px;
  --space-6: 32px;
  --space-7: 48px;
  --motion-fast: 140ms;
  --motion-halo: 900ms;
  --motion-star: 260ms;
}
```

颜色锁：页面必须是深墨靛蓝，不改成纯黑、亮紫或蓝绿霓虹；左席偏蓝紫、右席偏杏橙，但方向、名字、键位和轮廓同时承担区分。生产背景不加整图色彩 tint；可在底层叠同色 CSS fallback，但不得洗掉纸纹与暖星。

### 3.1 字体

- 标题、当前星标题、完成主句：`"Iowan Old Style", "Songti SC", STSong, serif`；
- 正文、动作、状态、控件：`-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", sans-serif`；
- H1：desktop 48–58px / mobile 31–36px，1.08 行高，600；
- 当前动作：desktop 24–30px / mobile 19–23px，1.25 行高，650；
- pad 键位：desktop 44–56px / mobile 30–38px，1 行高；
- 状态/按钮：15–18px，600；辅助说明：12–14px，1.5 行高；
- 所有 button 显式声明字体、字号和行高，不依赖浏览器默认值。

## 4. 页面骨架与组件

### 4.1 页面骨架

使用开放夜空，不做整页大圆角卡：

1. 顶栏：返回作品库；右侧玩法帮助；
2. 标题区：H1、短副句与非健康说明；
3. 六星轨：六枚相同尺寸、当前与完成有多重状态；
4. 共同舞台：双环光圈、当前星标题、动作文字；
5. 四格节拍：四个固定 DOM 节点；
6. 左右 pad：桌面左右、手机仍左右横排；
7. 单一暂停动作；
8. 本地与隐私页脚。

页面主容器 desktop 最大宽 1280px，左右 gutter 32–48px；390px gutter 16px；320px gutter 12px。背景 full-bleed，交互全部位于语义 main。

### 4.2 顶栏

- 返回：文本“返回 Two of Us”+ 自制 18px outline 左箭头；
- 帮助：文本“玩法”+ 自制四格 outline 图标，打开原生 dialog 或页面内说明；
- 不加入声音、振动、主题、设置或全屏控制；
- 触控高度至少 48px；焦点使用 3px 月白 outline + 3px offset。

### 4.3 六星轨

- `ol` + 6 个 `li`，每颗星由 code-native SVG 或 CSS clip-path 绘制，不使用生产图中的星；
- 当前星使用 `aria-current="step"`、双黄铜轮廓与可见“当前”文本；
- 已完成使用实心月白/暖金、check 与屏幕可见完成状态；
- 等待使用空轮廓和序号；不能只靠发光区分；
- 1504/390/320 均保持单行六列，不使用横向滚动。

### 4.4 共同舞台

- 双环由两个 CSS/SVG outline 构成：左环有短双线标，右环有单线标；
- 光圈缩放只根据 `view.timing.zone` 表现 prepare/act/received，不读取 CSS 动画进度推进规则；
- 中央显示“第 N / 6 颗”、当前标题、领拍方和唯一动作；
- `prepare` 明确写“准备”，`act` 写“现在 · {席位}{按住/松开}”，`received` 写“接住了，等下一拍”；
- 光圈不是倒计时、肺部或生理波形，不显示秒数、心率、吸气/呼气和百分比。

### 4.5 四格节拍轨

- `ol` + 4 个 `li`，按当前 leader 派生完整动作文字；
- 每格包含序号、席位方向标、边沿形状和“按住/松开”；
- upcoming：空轮廓；current：3px 双轮廓 + `aria-current=step`；received：check + “接住”；
- 桌面四格横排；390/320 仍四格横排，长席位名只在当前动作区域完整显示；
- 概念图中的复杂宝石内纹仅作材质参考，生产 UI 使用简单线条，保证 forced-colors 和小尺寸清晰。

### 4.6 左右 pad

- 两席各一个原生 `<button>`，不是 div、Canvas 热区或图片映射；
- desktop 每个 pad 180–240px；390 每个 142–168px；320 每个 120–142px；最低交互尺寸始终大于 56px；
- pad 内显示配置称呼、`左边 / 右边`、大键位 `A / L` 和实时“松开 / 按住”；
- 左席使用双层内环和向左短标，右席使用单层内环和向右短标；
- pressed：下沉 3px、边框加粗、状态文字变化；expected：外侧短弧和“现在”；
- `touch-action:none` 只应用于 pad；pointerdown 不等待 click；
- inactive 阶段从 DOM 移除 pad，而不是只降低透明度。

### 4.7 ready、暂停与完成

- release-gate 保留 pad，显式显示各席“已松开 / 还按着”，共同标题“先都松开”；
- ready 移除 pad，显示一行中性提示和“再试这颗”；
- measure-complete 移除 pad，当前星增亮，显示“下一颗”；
- paused 移除 pad 与节拍 tick，仅显示暂停原因、清理说明和“继续”；
- complete 移除共同舞台、四格、pad 和暂停，六星放大成浅弧；
- 最终文案在一个开放的月白纸面 DOM 中，主动作“再来一次”、次链接“返回作品库”；
- 不复刻概念中占据大半屏的纯空圆盘，不做 modal、奖杯、比分或 confetti。

## 5. 图标清单

| 图标 | 语义 | 实现 |
| --- | --- | --- |
| 返回箭头 | 返回作品库 | 18px 自制 outline SVG，2px round stroke，currentColor |
| 四格 | 打开玩法 | 四个不同内纹的 18px outline 方格；另有“玩法”文字 |
| star/check | 等待、当前、完成 | 18–24px 自制 SVG；序号与文字冗余 |
| left/right mark | 左右席 | 双线左标 / 单线右标，currentColor；席位名冗余 |
| press/release | 按住/松开 | 向内实心点 / 向外空心环；动作文字冗余 |
| pause | 暂停 | 两根圆角竖线；按钮另有“暂停”文字 |
| focus/pressed | 交互状态 | 不用图标；outline、下沉和状态文字 |

真实肺、鼻口、心脏、ECG、莲花、瑜伽人物和医疗十字不进入图标集。

## 6. 允许文案

### 持久区

- `返回 Two of Us`
- `玩法`
- `慢一点，也和你一起`
- `光圈只是节拍提示，不需要配合真实呼吸。`
- `不录音、不联网、不保存。`

### intro

- 配置 intro；
- `左边按 A，右边按 L。每颗星按住两次，再依次松开。`
- `不用憋气或刻意调整呼吸；如果感到不适，请停下来。`
- `开始接光`

### playing / release-gate / ready

- `第 N / 6 颗 · {title}`
- `{左/右席位名}领拍`
- `准备`
- `现在 · {席位名}按住` / `现在 · {席位名}松开`
- `接住了，等下一拍`
- `左边`、`右边`、`A`、`L`、`松开`、`按住`
- `光没接上，松开再来`
- `先都松开`
- `再试这颗`
- `暂停`

### measure-complete

- `这一颗接好了`
- `不用赶，准备好再点下一颗。`
- `下一颗`

### paused

- `星光停在这里`
- `按键和触点已经清空，继续后从这颗星重新开始。`
- `继续`

### complete

- 配置 finalTitle、composeSamePaceMessage 结果和 signature；
- `六次交接，刚好成了一片属于我们的光。`
- `再来一次`
- `返回作品库`

不得新增 hero eyebrow、badge、pill、倒数秒数、反应评价、健康效果、默契分数、错误席位、失败次数或“谁没跟上”类文案。

## 7. 响应式规格

### 7.1 1504×1046

- 无横向或纵向滚动；顶栏、标题、六星、双环、四格、双 pad、暂停和页脚同屏；
- 双环 250–310px；四格总宽 420–520px；pad 位于左右下方并保持同权；
- 顶栏和标题合计不超过 142px，六星不超过 70px，共同舞台约 360px，pad 区约 250px；
- complete 的六星弧、信笺和两个动作同屏。

### 7.2 390×844

- 核心 playing 控件无滚动同屏；隐私页脚可紧随首屏；
- 标题压为 31–36px，短说明一行或两行；六星高度不超过 50px；
- 双环 190–230px；四格约 62–72px 高；
- 两个 pad 横排，每个 142–168px，间距 10–14px；不得改成上下堆叠；
- 概念中的双环视觉高度明显压缩，不照抄 1846px 长图比例。

### 7.3 320×700

- 允许自然纵向滚动但无横向溢出；当前动作、四格和双 pad 应在最小必要滚动内连续出现；
- 双环 150–180px；pad 120–142px；gutter 12px；
- 六星只显示序号/形状，完整当前标题移到共同舞台；
- 不通过把 pad 缩到 56px 以下换取高度；
- 玩法长说明只放 intro/dialog，playing 不重复占高。

## 8. 状态与动效

| 状态 | 视觉 | 文字/语义 |
| --- | --- | --- |
| prepare | 双环安静、当前格双轮廓 | “准备” |
| act | 当前环短促增亮、expected pad 外弧 | “现在 · {席位}{按住/松开}” |
| received | 当前格 check、环回到中性 | “接住了，等下一拍” |
| active | 对应 pad 下沉、内环加粗 | “按住” |
| release-gate | 两 pad 保留、未松席位有粗边 | “先都松开”及各席状态 |
| ready | pad 移除、共同纸面提示 | “光没接上，松开再来” |
| measure-complete | 当前星实心、舞台收拢 | “这一颗接好了” |
| paused | 节拍 DOM 移除、单一恢复面板 | 暂停原因与“继续” |
| complete | 六星弧 + 共享光环 + 信笺 | 最终文案与后续动作 |

默认动效：140ms pad 下沉，260ms 完成星显现，900ms 以内的双环舒展/收拢；光环只在 zone 变化时切换，不用连续旋转或逐 tick 重启动画。状态推进不得等待 `animationend`。

`prefers-reduced-motion: reduce`：取消缩放、位移、光晕扩散、粒子和渐进填充；四格、outline、check 与文字即时切换。600ms 接光窗口和完整 reducer 规则不变。

`forced-colors: active`：移除背景图、阴影和座位填充；使用 Canvas/CanvasText/ButtonFace/ButtonText/Highlight；left/right 依靠席位名、键位、双线/单线和方向标区分；current/received/complete 使用 outline 样式和真实文字。

## 9. 媒体处理

- `quiet-sky.webp` 使用 `background-image`，`center / cover no-repeat`；
- 页面底色固定 `--night`，图片加载失败时仍是完整夜色层级；
- 不加整图色彩 overlay/tint；文字区域通过自身 `--surface` 或 text-shadow 保证对比；
- cover 可裁掉边缘星点，中央低细节区必须保留；
- forced-colors 直接 `background-image:none`；
- 所有规则性星星、光圈、节拍格、pad、方向标和文字由 DOM/CSS/SVG 实现，不从背景图取样或定位。

## 10. ImageGen 提示词与来源

四次调用均使用 OpenAI 内置 ImageGen，没有输入第三方图片，也没有使用前述开源项目的截图、素材或界面作为参考。最终文件从 `$CODEX_HOME/generated_images/` 复制到工作区；原始生成文件按工具约定保留。

### 10.1 桌面进行态

```text
Use case: ui-mockup. Asset type: desktop web game visual concept, 3:2 landscape.
Polished shippable playing state for a tender local two-player rhythm cooperation game.
Full-screen quiet indigo tactile paper night; top header; centered six-star progress;
large moon-white two-outline halo; four discrete beat cells; two very large symmetric
lower control pads. Crafted paper, frosted enamel, warm brass; code-buildable.
Deep #11152b/#252a50, #f4ecd8, #e1ae62, muted blue-violet and apricot.
No legible text, letters, numbers, people, hands, logos or watermark. Avoid medical
breathing app, meditation timer, ECG, arcade/neon HUD, glass dashboard and card grid.
```

### 10.2 移动进行态

```text
Use case: ui-mockup. Asset type: mobile web game visual concept, tall portrait about
390x844. Same tender local two-player game: compact header, six-star progress, large
interlocking double halo, four beat cells, then two equally large left/right pads
arranged horizontally at the bottom. Full core flow visible, practical large targets.
Indigo tactile paper, moon ivory, warm brass, muted blue-violet and apricot.
No legible text, people, hands, phone frame, logos or watermark. Avoid medical/meditation,
ECG, neon rhythm game, glassmorphism and card grids. Pads must stay side by side.
```

### 10.3 桌面完成态

```text
Use case: ui-mockup. Asset type: desktop completion concept, 3:2 landscape.
Six fully lit outlined stars in a calm shallow arc, one resting shared warm ring,
an elegant blank paper area for code-rendered final message, and two restrained actions.
Crafted indigo paper, matte enamel, thin brass, quiet satisfaction, no celebration blast.
No legible text, people, hands, confetti, logos or watermark. Avoid wellness/medical UI,
meditation app, heart monitor, neon arcade, trophy screen, glass panels and card grids.
```

### 10.4 生产背景

```text
Use case: stylized-concept. Full-bleed responsive website background. Deep ink-indigo
handmade paper with subtle fiber grain, moon-ivory haze near center, sparse warm gold
pinprick stars toward outer edges, faint two-part circular traces almost disappearing.
Wide crop-safe composition with low-detail center, intimate and still. #11152b/#252a50,
#f4ecd8 and #e1ae62. No text, UI, people, hands, hearts, logos or watermark; no medical
symbols, ECG, galaxies, planets, nebulae, neon, glassmorphism or central starburst.
```

生产 PNG 通过 Codex 工作区内置 Pillow 以 quality 82、method 6 转为 WebP。该工具只参与制作，不进入 package.json、作品运行时或浏览器依赖。

## 11. 概念到实装 fidelity ledger

| 比较点 | 概念证据 | 实装要求 | 已接受偏离 |
| --- | --- | --- | --- |
| 第一视口 | 桌面图同屏六星、双环、四格和双 pad | 1504×1046 无滚动，390×844 核心同屏 | 顶栏装饰线减少，为真实标题和说明留高 |
| 信息层级 | 双环最大，四拍居中，pad 左右同权 | 当前动作 > 四拍 > pad 状态 > 六星/暂停 | 当前动作以 DOM 文字占据环内，不留纯空圆 |
| 容器模型 | 开放夜空，无卡片墙 | 禁止整页大卡、dashboard 与 glassmorphism | intro/ready 可有一个开放纸面，不泛化成卡片网格 |
| 色板 | 靛蓝、月白、暖金、蓝紫/杏橙 | 令牌锁定，背景不加 tint | forced-colors 完全替换色板 |
| 光环 | 两个不同线型圆相交 | CSS/SVG 双环 + 席位方向标 + 状态文字 | 缩小光晕与拟物厚度，避免被误解为健康仪表 |
| 四拍 | 四枚宝石质感节点 | 四个原生列表项、序号、形状、文字 | 删除复杂内纹，提升 320px 与高对比清晰度 |
| pad | 两个大型圆形盘 | 两个原生 button、键位/称呼/状态 | 减少分瓣与装饰铆钉，保留触感和双/单线区别 |
| 移动 | pad 横排，中心纵向层级 | 390 仍横排且核心无滚动 | 双环与星空占高压缩约一半，不照抄长图比例 |
| 完成 | 六星弧、中心纸面、两动作 | 移除玩法控件，真实信笺 DOM 与两动作 | 纯空大圆盘改为可选中/可读屏的文案区 |
| 背景 | 纸纹、边缘星、中央安静 | 原创 WebP + `--night` fallback | cover 可裁边缘星，不影响任何语义 |
| 文案 | 概念无可读文字 | 只用第 6 节白名单与配置 textContent | 不复用任何生成文字或装饰符号 |

## 12. 编码前验收

- [x] 完整桌面进行态，而非单独 hero；
- [x] 完整移动进行态，双 pad 横排；
- [x] 完整桌面完成态，移除节拍输入；
- [x] 独立无字生产背景；
- [x] 设计令牌、字体、图标、组件与容器模型；
- [x] 允许首屏/阶段文案与健康禁区；
- [x] 背景处理与 CSS fallback；
- [x] 1504/390/320 重排；
- [x] reduced-motion 与 forced-colors；
- [x] 十一项 fidelity ledger；
- [x] 每张资产原生 `view_image` 检查；
- [x] ImageGen 提示词、方式和本地保存路径。

前端不得新增未列出的主要组件、首屏文案或健康暗示。若真实浏览器高度、焦点或可访问性要求与概念冲突，先采用本文件列出的已接受偏离；仍无法解决时再修订设计规格。
