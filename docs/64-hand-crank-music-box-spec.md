# A 级「把这首转给你」规格

## 1. 定位与 brainstorm 结论

- 创意池：S04「手摇音乐盒」；
- 产品名：把这首转给你；
- ID：`hand-crank-music-box`；
- 主分类：单人惊喜；
- 启动等级：A；
- 设备：同一台电脑或手机，一个人准备，另一人体验；
- 公网依赖、账号、照片、录音、存储与商业音乐：均无；
- 首版核心：顺时针转动摇柄，原创短旋律逐音响起，纸雕夜景按八圈进度展开，最后显露本地留言。

定向调研见 [`63-hand-crank-music-box-research.md`](./63-hand-crank-music-box-research.md)。本作填补的是“持续触摸才会展开”的惊喜，不是另一个点击翻卡页，也不是节奏评分游戏。

brainstorm 比较过三个方向：

| 方向 | 优点 | 首版结论 |
| --- | --- | --- |
| 点击按钮自动播放完整旋律 | 实现最简单 | 不采用；动作与结果脱节，且更容易触发自动播放限制 |
| 连续手摇、逐音与逐层展开 | 机械关系清楚，接收者亲手完成惊喜 | 采用 |
| 导入私人音乐并跟随波形 | 个性化强 | 不采用；引入授权、解码、文件选择和媒体体积问题 |

首版不加入曲库、节拍判定、速度评分、录音、歌词、照片导入、保存进度、分享、账号或自动播放。声音只增强反馈，不掌握完成权威。

## 2. 借鉴来源与原创边界

本作借鉴传统圆筒音乐盒“旋转圆筒的凸点依次拨动音梳”的公共机械原理，并依据 [W3C Web Audio API](https://www.w3.org/TR/webaudio-1.0/)、[W3C Autoplay Policy Detection](https://www.w3.org/TR/autoplay-detection/) 与 [MDN Web Audio best practices](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Best_practices) 处理平台边界。

[Smithsonian Paillard & Cie. Cylinder Music Box](https://americanhistory.si.edu/collections/object/nmah_605759) 和 [Smithsonian 乐器目录研究](https://repository.si.edu/bitstreams/b8449723-a7f4-4b27-8ccb-f43ded30d579/download) 只用于确认“圆筒、凸点、音梳、连续转动”的机械类比。馆藏页面提示图片复用受限，本作没有下载、描摹或分发馆藏图片。

本作没有读取、运行、复制或改写任何第三方音乐盒项目源码，也没有引入 Tone.js。状态机、角度展开、原创八音动机、中文文案、界面代码和测试均为本仓库原创。唯一运行时复用是仓库自己的 [`shared/audio/tone-player.js`](../shared/audio/tone-player.js)。

三张视觉图由 OpenAI ImageGen 于 2026-07-18 生成：

| 文件 | 用途 | 是否运行时加载 |
| --- | --- | --- |
| [`concept-desktop.png`](assets/hand-crank-music-box/concept-desktop.png) | 1504×1046 桌面构图与材质基准 | 否 |
| [`concept-mobile.png`](assets/hand-crank-music-box/concept-mobile.png) | 853×1844 移动构图基准，验收时按 390×844 视口解释 | 否 |
| [`paper-diorama.png`](assets/hand-crank-music-box/paper-diorama.png) | 无文字纸雕夜景运行资产母版 | 是，复制到作品目录后加载 |

生成提示要求纸雕资产不含人像、品牌、文字、音乐符号、馆藏外观或第三方素材。作品 README 和文件级 `assets/ATTRIBUTION.md` 必须保留这一声明。以后若替换为私人图像、音乐或第三方素材，必须重新核权，不能沿用“零第三方素材”。

## 3. 核心流程

1. intro 显示完整音乐盒、玩法说明、声音开关与“开始转动”；最终留言不进入 DOM；
2. 首次开始或真实转动手势尝试 `tonePlayer.ensureReady()`，失败只切换为无声提示；
3. playing 中，指针围绕摇柄轴心顺时针移动；每累计四分之一圈跨过一个齿位；
4. 每个新齿位推进一个音符、点亮一个圆筒凸点，并按总进度揭开纸雕夜景；
5. 每四个齿位完成一圈，八圈共 32 个齿位；
6. 第 32 个齿位唯一进入 complete，盒盖纸雕向两侧退开并出现最终留言；
7. 完成页可以“再转一次”，回到 intro 并清空角度、音符与展开进度。

静音或 `AudioContext` 不可用时，第 3–7 步完全不变。页面不展示失败色或阻断弹窗，只把声音控制旁的说明改成“无声也能继续”。

## 4. 角度展开与防摆动规则

UI 只负责把指针坐标换算成相邻样本的有符号角度差；纯逻辑接收 `applyAngularDelta(state, deltaRadians)`：

1. 相邻角度先规范化到 `[-π, π]`，正确处理从 `179°` 到 `-179°` 的跨象限；
2. 单样本绝对值超过 `π / 2` 视为指针瞬移，保持原状态；
3. 状态保存 `currentAngle` 与历史最高 `peakAngle`；反向转动会降低当前角度，但不会降低历史最高值；
4. 只有当前角度重新超过历史最高值，才产生新的净顺时针进度；
5. `stepIndex = floor(peakAngle / (π / 2))`，最多 32；同一齿位不重复发音；
6. 指针松开只让 UI 忘记本次屏幕坐标基线，不清空规则角度；重新按下不会制造一次跳跃；
7. 键盘、辅助按钮调用 `advanceOneStep(state)`；若此前有反向拖动，先在内部对齐历史峰值，再通过同一规则出口严格推进 `π / 2`，因此每次离散操作都恰好新增一个齿位。

因此“顺时针一点—逆时针复位—再顺时针一点”的摆动只会回到旧峰值，不能反复刷圈。反向不是失败，也不倒扣已经展开的层景。

## 5. 权威状态机

```js
{
  phase: "intro" | "playing" | "complete",
  currentAngle: 0,
  peakAngle: 0,
  stepIndex: 0,
  completedTurns: 0,
  motif: ["c5", "e5", "g5", "e5", "d5", "f5", "a5", "g5"],
  lastNoteId: null,
  revision: 0
}
```

公开状态、旋律数组、配置策略上下文和 API 返回值递归冻结，不与调用方共享可变引用。

### 5.1 纯逻辑 API

- `createInitialState(config?)`：整份校验文案与动机策略，创建 intro；
- `start(state)`：只从 intro 进入 playing，不自动推进或发音；
- `normalizeAngularDelta(previous, next)`：返回跨象限安全的最短有符号角度差；
- `applyAngularDelta(state, deltaRadians)`：应用拖动增量，忽略非法、过大或非 playing 输入；
- `advanceOneStep(state)`：为键盘与按钮推进一个齿位；
- `getDerivedProgress(state)`：返回冻结的 `{ ratio, revealedLayers, activeTooth }`；
- `restart(state)`：只从 complete 返回全新 intro；
- `isMusicBoxState(value)`：拒绝畸形状态进入规则分支。

合法状态上的非法阶段动作保持同一引用；畸形状态经公开动作安全回到初始状态，不抛异常。`lastNoteId` 只是 UI 的单调播放信号：只有 `stepIndex` 新增时更新，声音层绝不回写规则状态。

## 6. 原创音高与配置贡献点

内置音高表只包含八个短促合成音：`c5 / d5 / e5 / f5 / g5 / a5 / c6 / d6`。默认八音动机为仓库原创，循环四次覆盖 32 个齿位；使用 triangle oscillator、短 attack 和低 gain，不模拟或引用任何已知歌曲。

`config.js` 提供：

```js
{
  recipientName: "给你",
  finalTitle: "这段路，想和你慢慢走",
  finalMessage: "谢谢你把这首小小的旋律转到最后。",
  composeMotif({ availableNoteIds, defaultMotif }) {
    // TODO: 返回 8–16 个合法 note ID，或保留 null 使用默认动机。
    return null;
  }
}
```

`composeMotif` 是准备者可以亲手写的 5–10 行业务策略，不是装饰配置。它可以根据音高集合重排一段私人动机；返回数组必须长 8–16、每项来自冻结的 `availableNoteIds`。返回 `null`、抛错、修改上下文或返回非法数组都安全回退到默认动机。页面按 32 齿位循环使用动机，不需要准备者理解 Web Audio 频率。

## 7. 设计系统与实现库存

### 7.1 设计令牌

- 真正的深蓝黑背景：`#111827`，无覆盖中央产品的渐变；
- 温润胡桃木：`#6f4933`，用于盒体与边框；
- 象牙纸：`#f2ead8`，用于层景与主要文字；
- 旧黄铜：`#b79254`，用于圆筒、音梳、进度与摇柄；
- 暗珊瑚：`#c56355`，只用于主动作、当前齿位和焦点；
- 温灰辅助字：`#d6cdbf`；
- 标题与留言使用本机中文 serif；说明和控件使用 system sans-serif；
- 盒体圆角 18–26px，按钮圆角 4px；不使用胶囊、玻璃拟态或卡片网格；
- 动效 180–420ms，纸层展开可以错峰；`prefers-reduced-motion` 下直接到目标位置。

### 7.2 允许的首屏文案

- `把这首转给你`；
- `顺时针转动摇柄，让一小段旋律慢慢展开。`（移动端可删去“一小段”）；
- `开始转动`；
- `声音` / `静音` / `无声也能继续`；
- `0 / 8 圈` 至 `8 / 8 圈`；
- `拖动摇柄，或按 → 转一格`。

不得擅自增加 eyebrow、玩法徽章、技术标签、统计、排行榜或营销副标题。

### 7.3 桌面 1504×1046

- 左侧约 31%：标题、说明、声音、主动作、圈数与八齿轨道；不套卡片；
- 右侧约 69%：一个打开的音乐盒，占据视觉焦点；盒盖显示纸雕，盒身显示圆筒、音梳和摇柄；
- 主动作区和完整音乐盒首屏可见，无滚动；
- 摇柄交互圆直径至少 96px，真实可见手柄不小于 72px；
- 完成态只替换盒盖内容与动作文案，不新增弹窗或第二套页面框架。

### 7.4 移动 390×844

- 标题与一句说明置顶，音乐盒居中，进度与摇柄进入下半区拇指可达区域；
- 16px 页面边距，主按钮至少 48px，高优先动作与摇柄不重叠；
- 纸雕图可按 `3 / 2` 比例缩放，保持两间房与路径完整；
- 允许短距离自然纵向滚动，不横向溢出；320×760 仍可到达所有动作；
- 圈数同时用文字和八齿轨道表达，不能只靠颜色。

### 7.5 图标与资产

- 返回使用与字体同重的 1.5px SVG 箭头；
- 声音用一个 1.5px 线性 SVG，开启/关闭改变斜线而不是换 emoji；
- 顺时针提示为单线 SVG 圆弧箭头；
- 进度齿位、圆筒凸点、音梳与摇柄结构由 HTML/CSS/SVG 原生渲染；
- 纸雕夜景加载独立 `paper-diorama.png`；加载失败时显示由 CSS 排版的“月亮—路径—两点灯”抽象降级，不出现破图图标。

## 8. 可访问性、隐私与阶段 DOM

- 所有动作使用原生 button；摇柄区域同时是有描述的 button/slider 语义入口，键盘 `ArrowRight` 与 `Space` 可转一格；
- 焦点环至少 2px，主触控目标至少 48px；
- `aria-live` 只播报整数圈完成、声音不可用和最终展开，不按 32 个齿位连续轰炸；
- 当前圈数同时有 `x / 8` 文字与八齿轨道；
- intro 与 playing 的 DOM 不包含 `finalTitle`、`finalMessage` 和 `recipientName`；完成后才创建留言节点；
- 页面没有输入框、网络请求、localStorage、cookie、IndexedDB 或 Service Worker；
- 页面隐藏时停止新的声音节点并取消当前指针会话，规则进度保持；
- 刷新会从 intro 重开，不恢复旧进度。

## 9. 测试与验收 Gate

### 9.1 纯逻辑

- 跨 `±π` 的角度规范化方向正确；
- 非有限值与超过 `π / 2` 的瞬移保持原引用；
- 反向后再次前进必须先追平旧峰值，不能重复发音；
- 离散转格在反向拖动后仍每次恰好新增一个齿位；
- 每 `π / 2` 唯一产生一个齿位，32 齿唯一完成八圈；
- 拖动与键盘走同一推进规则；
- 配置策略合法、非法、异常、修改冻结上下文均有覆盖；
- 状态递归冻结、非法阶段稳定、畸形状态安全回退。

### 9.2 集成与浏览器

- catalog/门户暴露一个已安装的 A 级 `hand-crank-music-box`；
- `file://` 双击直开，不产生 `http(s)`、WebSocket 或远程字体请求；
- intro/playing DOM 不含最终留言，complete 才出现；
- 有声、静音、AudioContext 不可用三条路径都能完成；
- 指针拖动、ArrowRight、Space、辅助按钮、重开均实玩；
- 1504×1046、390×844、320×760 无关键遮挡和横向溢出；
- 对桌面概念与最新桌面截图、移动概念与最新移动截图分别做至少五项 fidelity ledger；
- `prefers-reduced-motion` 与纸雕图加载失败降级可用。

## 10. 完成定义

- 作品目录可独立复制，双击 `index.html` 完整游玩；
- 运行资产、共享脚本、借鉴声明和配置入口齐全；
- 核心逻辑、目录、文件协议和隐私边界进入自动测试；
- 浏览器完成至少一轮拖动和一轮键盘实玩；
- 概念与浏览器截图在同一 QA 中经 `view_image` 比较，无未记录的重大偏差；
- 缺陷记录进入 `bugs/`，可复用角度与音频经验进入 `learn/`；
- 规格、实现、验收分别形成独立提交。
