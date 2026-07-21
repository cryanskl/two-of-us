# “每一格，都是喜欢你的理由”视觉概念提案

- 日期：2026-07-21
- 状态：**待用户确认，未获准进入生产 UI**
- 对应调研：[`178-compliment-reels-research.md`](./178-compliment-reels-research.md)
- 文案审计：[`179-compliment-reels-copy-audit.md`](./179-compliment-reels-copy-audit.md)
- 可执行规格：[`180-compliment-reels-spec.md`](./180-compliment-reels-spec.md)
- 视觉简报：[`197-compliment-reels-imagegen-brief.md`](./197-compliment-reels-imagegen-brief.md)
- 生成台账：[`assets/compliment-reels/GENERATION.md`](./assets/compliment-reels/GENERATION.md)

## 1. 提案结论

建议采用 **安静书桌上的私人夸夸印刷机**：柔和浅粉陶土纸面托住一台深梅红哑光机器，三条奶油纸卷负责拼句，珊瑚色实体把手承担唯一主动作，少量旧黄铜只用于压边和铆钉。完整夸奖像连续纸条从机器下方印出，历史是开放纸条，特别同频则展开为与机器相连的私人信笺。

这套方向刻意避开赌场刺激：没有 BAR、7、金币、筹码、payline、中奖数字、霓虹和庆祝粒子。终局只用静态星形压印、双线和私人结语表达“特别”，也没有输赢、分数或付费暗示。

八张 PNG 是构图、材料、状态和响应式的设计证据，只保存在 `docs/`，不会被生产页面加载。生产实现使用 HTML、CSS 和 code-native 中文；不从位图 OCR 文案，不裁切位图作为机身，不复制生成图像素。

## 2. 八态候选

| 状态 | 文件 | 原生尺寸 | 验收角色 |
| --- | --- | ---: | --- |
| C1 桌面 ready | [`desktop-ready-concept.png`](./assets/compliment-reels/desktop-ready-concept.png) | 1503×1047 | 首屏层级、空纸卷、焦点态和单一主动作 |
| C2 桌面 spinning | [`desktop-spinning-concept.png`](./assets/compliment-reels/desktop-spinning-concept.png) | 1586×992 | 错峰运动提示、保留上一结果、disabled 原位 |
| C3 桌面 result | [`desktop-result-concept.png`](./assets/compliment-reels/desktop-result-concept.png) | 1503×1047 | 三段停稳、连续纸输出、开放历史顺序 |
| C4 桌面 jackpot | [`desktop-jackpot-concept.png`](./assets/compliment-reels/desktop-jackpot-concept.png) | 1504×1046 | signature、三句历史、信笺、静态终局 |
| C5 390px result | [`mobile-result-concept.png`](./assets/compliment-reels/mobile-result-concept.png) | 852×1846 | 三列并排、61 字素句、历史和大触控动作 |
| C6 320px result | [`narrow-result-concept.png`](./assets/compliment-reels/narrow-result-concept.png) | 941×1672 | 三段纵向堆叠、长文、历史和纵向滚动 |
| C7 768px result | [`tablet-result-concept.png`](./assets/compliment-reels/tablet-result-concept.png) | 1086×1448 | 平板三列、全宽输出、开放历史和按钮关系 |
| C8 320px failure | [`narrow-failure-concept.png`](./assets/compliment-reels/narrow-failure-concept.png) | 941×1671 | 空纸卷、准备诊断、按钮级焦点和唯一重试动作 |

所有候选均已用 `view_image(detail="original")` 原尺寸检查。ImageGen 输出尺寸不总与请求像素一一相等；C5–C8 锁定的是对应 CSS 视口的重排意图，真实 390×844、320×568 和 768×1024 仍必须在浏览器里测量。

## 3. 可见文案边界

生产文案唯一真相仍是 `docs/197-compliment-reels-imagegen-brief.md` 第 4 节和 `docs/179-compliment-reels-copy-audit.md`。生成图存在少量字体转写、空格和标点偏差，这些偏差明确舍弃；不能把图片 OCR 结果、图片里的断行或近似短句写回代码。

本轮有两项需要随视觉方向一起确认：

1. 320px 堆叠标签使用 `第一段 · 我看见的你`、`第二段 · 发亮的样子`、`第三段 · 留给我的感觉`；宽屏仍只显示原三个列标签。
2. 终局在完整句下方显示独立结构标题 `特别同频`；它不是分数、中奖标签或可操作徽章。

其余标题、按钮、保证、诊断、历史句和私人结语均不得新增或改写。概念中的空白黄铜铭牌保持无字，生产也不放 Logo、英文副标题或伪编号。

## 4. 提议设计令牌

以下令牌在用户接受后才进入实现：

```css
:root {
  --clay-50: #f8ebe7;
  --clay-100: #f3dfda;
  --clay-300: #d9bdb8;
  --plum-900: #351022;
  --plum-750: #5b1837;
  --paper-50: #fffaf0;
  --paper-100: #fff3d6;
  --paper-line: #dbc8a6;
  --coral-500: #ef776b;
  --coral-650: #d85d54;
  --ink-950: #17243c;
  --ink-650: #67555c;
  --brass-600: #b48a4a;
  --button-ink: #17243c;
  --focus: #17243c;
  --danger: #7b273d;
  --shadow-machine: 0 20px 48px rgb(53 16 34 / 24%);
  --shadow-paper: 0 10px 24px rgb(53 16 34 / 12%);
  --radius-small: 8px;
  --radius-medium: 14px;
  --radius-machine: 30px;
  --content-max: 1504px;
}
```

- 题名：`Iowan Old Style`, `Songti SC`, `STSong`, serif；
- 正文和控件：`Avenir Next`, `PingFang SC`, `Microsoft YaHei`, sans-serif；
- 不加载远程字体；正文不小于 16px，辅助文字不小于 13px；
- 主按钮不做胶囊，使用墨蓝文字而不是低对比白字，命中区不小于 48×48 CSS px，保留 3px 墨蓝可见焦点轮廓；
- 纸纤维、漆面微纹和黄铜磨损优先用低对比 CSS pattern，不能牺牲 forced-colors。

## 5. 页面骨架

```text
main.compliment-reels
├── header.page-heading > h1
├── p.round-guarantee
├── section.reel-frame[aria-labelledby]
│   ├── div.machine-body[aria-hidden decorations]
│   └── ol.reels
│       └── li × 3: label + code-native reel text
├── output.current-praise
├── p.stage-copy
│   └── span.failure-diagnostic（准备失败时唯一存在）
├── ol.history-strip
├── section.jackpot-letter
├── button.pull-handle
├── p.fallback-copy
└── p.live-region[role=status]
```

- 上述节点保持规格冻结的 `main` 直接子级和阅读顺序；CSS grid 可让把手在桌面视觉上贴近机身，但不得改 DOM 顺序；
- `stage-copy` 是持续可见正文，位于完整结果之后、历史之前；它不借用 `output` 或 live region，只有准备失败时包含唯一诊断 `span`；
- intro、result、jackpot、fallback 与 live region 服从规格中的固定 DOM/隐私边界；CSS 只改变视觉排布；
- 三列共享一个压纸框，不能变成三张浮动卡；
- `output` 是一张连续纸，历史是开放清单，私人结语是与机器相连的信笺；
- 装饰铆钉、压线、纸纹、星形都 `aria-hidden=true`；
- 生产只保留一个连续的“实体把手按钮”：珊瑚矩形按面、短黄铜轴和机身连接为同一真实 `<button>`；删除候选早稿中独立悬在机身侧面的长摇杆，不能用伪元素另造第二个看似可操作但不可达的控制。

## 6. 状态实现边界

### ready

- 纸卷只显示无语义压痕，不泄漏未来答案；
- 结果、历史和结语不创建空壳占位；
- 主按钮有实体把手姿态、hover/active 和键盘焦点。

### spinning

- 三条纸卷只做可实现的错峰 `translateY`/纸纹位移，不渲染未来 stop 文本；
- 已公开的上一完整句保持可见；
- 同一按钮原位 disabled，文案为 `正在组合…`；
- 舍弃概念早稿中阶段文字上方的三个圆点和虚线，不实现分页、剩余次数或进度指标；
- reduced-motion 直接进入结果，不靠模糊或旋转传达状态。

### result

- 三段先停稳，再由同一份文本数据合成完整句；
- 当前句只追加一次到历史，顺序与 reducer 一致；
- 机器、输出纸、阶段文字、历史和动作形成单向阅读流。

### jackpot

- signature 三段、完整句、三句历史和私人结语由状态机同时决定；
- 静态星形与双线只作冗余视觉提示；`特别同频` 和阶段文字才是语义；
- 不弹 modal、不自动开始新一轮、不播放声音或粒子。

### failure

- 保留题名、有限保证、三个空纸卷、诊断和唯一重试按钮；
- 不显示技术错误码、网络建议、第二动作或帮助链接。

## 7. 响应式提案

| 逻辑视口 | 布局 Gate |
| --- | --- |
| 1504×1046 | 开放页头 + 单一机器；ready、spinning、result、jackpot 在 100% zoom 均无横纵滚 |
| 1280×800 | 压纸框至少 720×300；题名、保证、机器、上一结果和 disabled 动作同屏 |
| 768×1024 | 三列并排；输出和历史全宽；动作 ≥48px；零横溢 |
| 390×844 | 三列优先并排并自然换行；题名不缩成海报小字；顺序严格遵循简报 |
| 320×568 | 三段按 moment → shine → echo 堆叠；允许纵滚；内容宽约 288–304px；零横溢 |

200% 文本、约 320 CSS px 的 400% zoom、横屏 844×390、safe-area 和软键盘均需由真实浏览器验证；概念图不能代替 computed geometry。

## 8. 动效与无障碍

- 一次拉动只触发 360–520ms 的三列错峰，终局信笺展开 240–320ms；没有循环动画或常驻 RAF；
- `prefers-reduced-motion: reduce` 下所有状态立即落定；
- `forced-colors: active` 下隐藏材质纹理，保留机身边界、纸卷、按钮、星形、双线和真实文字；
- disabled、错误、特别同频与 fallback 都有文字，不只靠颜色；
- live region 每次结算只写规格冻结的一条完整消息：普通为 `本局第 n 次：{完整句}`，jackpot 为 `特别同频已出现：{完整句}。私人结语已展开。`；不额外重复播报整页；
- CSS 图片和 PNG 全部阻断时，完整玩法和完成路径仍存在。

## 9. 运行时资产决定

当前建议 **不生成、不引入任何生产位图**：纸纤维、梅红漆面、黄铜边和星形压印都可由 CSS gradient、border、box-shadow 和伪元素忠实表达。八张概念 PNG 只用于提案与实现后的 fidelity 对比。

若浏览器实现证明某一材质无法达到接受图的层级，再单独打开资产 Gate，逐项生成无字、可降级素材，并新增运行时 SHA、格式、尺寸、用途、失败降级和 `assets/ATTRIBUTION.md`；不能为了使用 ImageGen 而增加运行依赖。

## 10. 来源与借鉴声明

- 本提案未输入第三方图片、开源截图、商业素材、照片、字体、Logo 或品牌；
- 未复制 `178` 调研中任何候选仓库的代码、文案、trade dress 或素材；只沿用已公开声明的抽象机制边界，并由本仓库重新定义状态机、文案与视觉；
- 八张概念由 OpenAI 内置 ImageGen 生成，具体模型/版本未暴露；逐图来源、引用链、尺寸和 SHA 见生成台账；
- 生成图不称为排他原创，不构成唯一性或不侵权保证；运行时的许可证和借鉴声明仍以作品 README 与 `assets/ATTRIBUTION.md` 为准。

## 11. Fidelity ledger

| 概念锚点 | 实现要求 | 后续证据 |
| --- | --- | --- |
| 机器是唯一大形体 | 不套 dashboard 外壳，不拆三张卡 | desktop/mobile 截图、容器审计 |
| 纸卷是真实文本容器 | 三段 code-native，spinning 不泄漏未来 stop | DOM 扫描、阶段截图 |
| 输出是一张连续纸 | 完整句来自合成器，不从图片或第二份库存读取 | 逻辑测试、DOM 文本 |
| 历史是开放清单 | 顺序稳定、不重复、不变卡片网格 | reducer 测试、result 截图 |
| jackpot 安静收束 | 文字 + 星形 + 双线 + 信笺，无赌场庆祝 | jackpot 截图、禁用词/资源审计 |
| 把手即真实按钮 | 删除独立侧摇杆；按面、短轴、disabled 与焦点均属于同一 hit target | 键盘测试、computed rect |
| 320px 真实堆叠 | moment → shine → echo，历史和按钮可达 | 320×568 截图、scrollWidth |
| 图片阻断可完成 | 运行时零概念 PNG 依赖 | network/resource audit |
| 精确文案不受 OCR 污染 | 所有可见文字与冻结 inventory 对比 | 自动文本快照、浏览器扫描 |

实现完成后，至少对 ready、spinning、result、jackpot、320 result 和 320 failure 做概念/浏览器并排复核；不能以测试通过替代视觉忠实度。

## 12. 用户确认 Gate

进入实现前需要明确确认：

1. 是否接受“深梅红桌面夸夸印刷机”作为整体视觉方向；
2. 是否接受 320px 的三条连接标签；
3. 是否接受终局独立标题 `特别同频`。

在三项确认前，不创建 `experiences/surprises/compliment-reels/` 的生产页面代码。接受后再写独立实施计划，并按逻辑核心、UI、测试/文档分别提交。
