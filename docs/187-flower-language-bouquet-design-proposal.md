# “把花语，系成一束”视觉概念提案

- 日期：2026-07-21
- 状态：**待用户确认，未获准进入生产 UI**
- 对应调研：[`185-flower-language-bouquet-research.md`](./185-flower-language-bouquet-research.md)
- 对应规格：[`186-flower-language-bouquet-spec.md`](./186-flower-language-bouquet-spec.md)
- 视觉方法：OpenAI 内置 ImageGen 生成 v1 探索与 v2 可实现候选；完整台账见 [`assets/flower-language-bouquet/GENERATION.md`](./assets/flower-language-bouquet/GENERATION.md)

## 1. 提案结论

建议方向是 **线描标本室里的私人花束台**：一张开放的手工纸工作台承载由少量 SVG primitive 组成的扁平花束，墨绿装订边、深酒红动作和少量旧黄铜夹具形成同一套材料语言。亲密感来自“依次挑三枝，再把话系进花里”，而不是爱心、婚礼符号、花店商品照或庆祝粒子。

核心层级固定为：

1. 花束及当前三席；
2. 当前阶段的唯一主动作；
3. 三席有序列表与组合句；
4. arranging 的六种花池，或 complete 的私人纸笺与保存区。

十张概念/迭代图只作为视觉证据，不进入运行时。v1 四张写实压花探索因无法由规格冻结的 primitive 忠实实现而明确否决；v2 五张候选与一张移动 draft 把花束降为 path/ellipse/circle/line 语言。生产仍由真实 HTML、CSS 与 inline SVG primitive 完成；花名、花语、角色、选择状态、组合句、私人留言、导出状态和按钮全部保持 code-native。

## 2. 概念文件台账

| 文件 | 尺寸 | SHA-256 | 状态 / 用途 |
| --- | ---: | --- | --- |
| [`assets/flower-language-bouquet/desktop-intro-concept.png`](./assets/flower-language-bouquet/desktop-intro-concept.png) | 1586×992 | `4bc0b4520ba15c9f23ab700748da4777fca2d39a47c2256e6d24e4222842d9a8` | v1 否决；写实材料探索 |
| [`assets/flower-language-bouquet/desktop-arranging-concept.png`](./assets/flower-language-bouquet/desktop-arranging-concept.png) | 1586×992 | `377d511f2d9c804b81c4ffba02f553aa9604657adaf4347409e3f65a364248d7` | v1 否决；桌面信息架构输入 |
| [`assets/flower-language-bouquet/mobile-preview-concept.png`](./assets/flower-language-bouquet/mobile-preview-concept.png) | 852×1846 | `54b8a9de1dc75833b86e3e4a9c064306fe3fe306699052eb24063e1ade3375c1` | v1 否决；移动顺序输入 |
| [`assets/flower-language-bouquet/desktop-complete-concept.png`](./assets/flower-language-bouquet/desktop-complete-concept.png) | 1586×992 | `3938b32548973d4d0c2d438ec7c606b6c711569342070e985fd188c5ca77ac75` | v1 否决；终态信息架构输入 |
| [`assets/flower-language-bouquet/desktop-intro-v2-concept.png`](./assets/flower-language-bouquet/desktop-intro-v2-concept.png) | 1586×992 | `a6bf31ec1cae116f60d0a30527d228433caf327b3cd8aa6b34ddd850d9b9041d` | v2 待确认；桌面 intro |
| [`assets/flower-language-bouquet/desktop-arranging-v2-concept.png`](./assets/flower-language-bouquet/desktop-arranging-v2-concept.png) | 1586×992 | `e547fc44f46ea846ab25276f7cc500dc6dab8aced8f301f319426ea4ba4ac4b0` | v2 待确认；桌面 arranging |
| [`assets/flower-language-bouquet/mobile-preview-v2-draft.png`](./assets/flower-language-bouquet/mobile-preview-v2-draft.png) | 852×1847 | `550b9417981367521f69e6924feba3d6b1c47f11f1117e5f36b71bba4eea2cc8` | v2 否决 draft；触控尺寸输入 |
| [`assets/flower-language-bouquet/mobile-preview-v2-concept.png`](./assets/flower-language-bouquet/mobile-preview-v2-concept.png) | 852×1846 | `72d015cf45a25620798905ecf9288fb607a62ac727eaa8bce2d6fce19c9296e2` | v2 待确认；移动 preview |
| [`assets/flower-language-bouquet/desktop-complete-v2-concept.png`](./assets/flower-language-bouquet/desktop-complete-v2-concept.png) | 1586×992 | `5b3c2532c74b29242029a0dedab95329ed556f1f95a8de719df4fb42eff28aab` | v2 待确认；桌面 ready complete |
| [`assets/flower-language-bouquet/mobile-export-error-v2-concept.png`](./assets/flower-language-bouquet/mobile-export-error-v2-concept.png) | 852×1846 | `c770f6a7ca373797ee5d76ee4ca01c1a9e9876a0828dd14bd906ff1960145d0e` | v2 待确认；移动 retryable error |

十张图的文件、完整 prompt、引用链、处理链与有限权利说明见生成台账。五张 v2 待确认候选已用 `view_image(detail="original")` 原尺寸检查；v1 与 draft 只保留审计证据，不作为 fidelity 基准。

## 3. 生成输入声明

- 工具：OpenAI 内置 ImageGen；具体模型/版本未由工具暴露，不猜测；
- 日期：2026-07-21；
- 偏好：Codex / 2K / 项目级；
- 输入：纯文字 prompt；
- 第三方参考图片、开源截图、商业素材、字体、角色与照片：无；
- 逐图输入只引用本轮生成概念，精确链见生成台账；
- 每张候选只负责一个完整状态；移动 export error 是独立状态，不与 ready 合画；
- 概念要求真实中文 UI、纸张材料、花束构图和明确动作层级；
- 运行时不复制概念像素，也不使用概念图中的花朵作为生产素材。

完整 prompt 已持久化在生成台账。README 与 `assets/ATTRIBUTION.md` 必须各自列出该台账链接、工具、模型暴露状态、日期、十个文件/尺寸/SHA、引用/处理链、第三方输入为无和 docs-only 边界；不能只写一句“由 AI 生成”。

这些文件称为“本轮生成概念”，不作排他原创声明。在用户与 OpenAI 之间且法律允许范围内，条款约定输出权利，但输出可能不唯一；C2PA/SynthID 只提供来源信号，不证明准确、未编辑或合法所有权。无第三方图片输入不构成唯一性或不侵权保证；官方链接与完整口径见生成台账。

## 4. v2 五态审校与 v1 舍弃

v1 写实压花四图只保留材料与信息架构探索：中心花材复杂度无法由规格冻结的 primitive registry 10/10 忠实实现，因此不进入用户接受候选。

### 4.1 v2 桌面 intro

保留：

- 题名与说明构成安静的第一阅读层；
- 开放标本纸位于中央偏下，不是巨型圆角应用壳；
- 深酒红主动作清晰，焦点轮廓可见；
- 六种花只作为外围“待挑选”暗示，不提前公开最终私人字段；
- 墨绿装订边与黄铜夹形成可复用材料语言。

舍弃：

- 右侧生成式“花语标本室”编号侧注及任何伪字；
- v1 中可被误认成真实植物照片的细碎压花；v2 只接受少量 path/ellipse/circle/line；
- 把装饰植物当作六张可操作花卡；intro 只有一个 START button。

### 4.2 v2 桌面 arranging

保留：

- 花束舞台约占 56–60%，明显大于控制区；
- 已选花直接在舞台呈现，第三席用留白轮廓表达；
- 右侧先是三席有序列表，再是撤回与花池；
- selected 项保留在原位置，并同时显示角色文字和边框；
- 两列花池适合 1280px 以上桌面，但条目应保持开放纸签而非厚重卡片。

舍弃：

- 锁图标、空心圆、伪花语和不在规格中的标签；
- 把 selected 当原生 disabled；生产使用 `aria-disabled=true` 与 action guard；
- v1 图片式花头；v2 与生产都使用六种 exact SVG primitive registry 语言；
- 右侧竖向编号侧注。

### 4.3 v2 移动 preview

保留：

- 顺序为题名/进度 → 花束 → 三席 → 组合句 → 主/次动作 → 花池；
- 三席是三条完整文字纸签，不只靠花束位置；
- 组合句使用独立但不厚重的纸面区域；
- 主动作深酒红满宽，次动作描边，均保持触控尺寸；
- 花池在后续内容中继续可读，不与 TIE 抢层级。

舍弃并修正：

- v1 把花束舞台做得过高；v2 将 852×1846 画布视作 390×844 逻辑视口，生产把舞台控制为约 240–280 CSS px；
- ImageGen 不能作为像素测量工具；用户接受的是 v2 构图加本文件的 exact `min-block-size:56px` 控件覆盖规则，浏览器 computed size 是验收真相；
- 生成式引号、错字和底部伪编号；
- 三张花图缩略图；生产用轻量 SVG 线描或纯文字状态。

### 4.4 v2 桌面 ready complete

保留：

- 左侧完整花束与右侧私人纸笺等权；
- recipient、finalTitle、finalNote、三席、组合句和 sender 有清晰阅读顺序；
- 保存区从私人纸笺中独立出来，真实 link 与 RESTART 视觉区分；
- 保存状态只说“文件已经准备好”，不承诺落盘成功；
- 终态安静收束，不使用奖杯、庆祝粒子或分享控件。

舍弃并修正：

- 概念中的错字、略写句子与任何非配置文本；
- 装饰性小票图标；export 状态用真实文本；
- 把 recipient 写进 standalone SVG；页面可见，但导出文件严格排除；
- 把保存入口做成自动下载按钮；生产必须是真实 `<a download>`，由用户激活。

### 4.5 v2 移动 retryable error 与 controller variants

移动 error 候选冻结完整顺序：题名 → 花束 → result-letter/三席/组合句 → export-panel → retry → RESTART。所有 complete controller variant 共享同一 export-panel 尺寸、纸面、标题字号与 DOM 位置，只改变以下 exact 内容：

| phase / 条件 | 标题 | 辅助说明 | export 内动作 |
| --- | --- | --- | --- |
| `idle`，非 complete | 不创建 export-panel | 无 | 无 |
| `unsupported` | 这个浏览器暂时不能准备 SVG 文件 | 花束和留言仍会留在页面里。 | 无 |
| `preparing` | 正在准备保存文件… | 花束和留言都还在。 | 无；panel `aria-busy=true` |
| `ready` | 保存文件已经准备好 | 由浏览器决定下载、预览或交给系统文件。 | 真实 `<a download>`：保存含留言的 SVG |
| `error` 且 `generation < M` | 这次没能准备好保存文件 | 花束和留言都还在。 | 原生 button：重新准备保存文件 |
| `error` 且 `generation === M` | 暂时不能继续准备保存文件 | 花束和留言都还在。 | 无，不泄漏 exhaustion code |

RESTART 永远位于 export-panel 之后，不属于 controller。ready link 激活后的 live 文案精确为“已交给浏览器处理”，panel 仍为 ready，不显示“保存成功”。unsupported 与 exhausted 不显示假 retry；preparing 不显示 disabled link。

## 5. 可见文案锁

概念若获接受，生产以上一份规格为唯一文案真相。首屏和核心动作不得新增 eyebrow、英文副标题、徽章或说明：

| 位置 | 精确文案 |
| --- | --- |
| 页面题名 | 把花语，系成一束 |
| 固定说明 | 从六种花里依次挑三枝。第一枝做主花，第二枝陪在旁边，第三枝留作点缀；没有选错的花。 |
| intro 主动作 | 开始挑花 |
| 角色 | 主花 / 陪花 / 点缀 |
| arranging 次动作 | 撤回上一枝 |
| preview 主动作 | 系好这束花 |
| complete 保存入口 | 保存含留言的 SVG |
| complete 重开 | 重新挑一束 |

默认 recipient、sender、finalTitle、finalNote、六种 flower name/meaning 和组合句逐字取自 `docs/186-flower-language-bouquet-spec.md`，不从概念图 OCR。

## 6. 提议设计令牌

以下令牌只有在概念获接受后才冻结：

```css
:root {
  --paper-0: #faf8f3;
  --paper-75: #f1ede5;
  --paper-150: #e5ddd1;
  --paper-300: #c8b9a5;
  --ink-950: #20342d;
  --ink-750: #46574f;
  --ink-600: #6b655d;
  --wine-800: #661f22;
  --wine-650: #843034;
  --moss-850: #30483d;
  --moss-650: #596044;
  --brass-600: #9a7a43;
  --brass-350: #c2a66d;
  --danger: #8c3034;
  --focus: #3b216d;
  --line: #cbbdaa;
  --shadow-paper: 0 18px 48px rgb(44 38 30 / 16%);
  --shadow-flower: 0 22px 44px rgb(36 41 32 / 18%);
  --radius-small: 8px;
  --radius-medium: 12px;
  --radius-large: 20px;
  --content-max: 1440px;
}
```

字体：

- 题名与最终标题：`Iowan Old Style`, `Songti SC`, `STSong`, serif；
- 正文与控件：`Avenir Next`, `PingFang SC`, `Microsoft YaHei`, sans-serif；
- 序号仅在需要时使用 `ui-monospace`, `SFMono-Regular`, monospace；
- 不加载远程字体；正文至少 16px，辅助文字至少 13px，button/link 至少 16px；
- 题名不用渐变字、描边、全大写或营销式超大字号。

## 7. 提议页面骨架

DOM 继续服从规格中的隐私和焦点顺序；CSS grid 只改变视觉位置：

```text
body.flower-language-bouquet
└── main.app-shell
    ├── header.app-header
    │   ├── h1
    │   └── phase-safe rule/progress
    ├── section#experience.phase-owned
    │   ├── section.bouquet-stage
    │   │   ├── inline svg[aria-hidden=true]
    │   │   └── ol.role-list
    │   └── section.phase-controls
    │       ├── intro-action 或 flower-pool/preview
    │       └── action-row
    ├── section.result-letter（complete only）
    ├── section.export-panel（complete only）
    ├── footer.privacy-note
    └── p#live-status.sr-only[role=status]
```

- intro 不创建花池、角色列表或私人字段的 hidden/template 副本；
- arranging/preview 的花池和 role list 使用真实 DOM；
- 花束 SVG 只作视觉，`aria-hidden=true`；
- complete 的 result-letter 与 export-panel 在 DOM 中位于 workspace 之后；
- 桌面可视觉排成左右两列，但 Tab 与阅读顺序不改变；
- 不用 canvas、图片 map、drag/drop、pointer capture 或常驻 RAF。

## 8. 花型与材料实现边界

- 六种花全部按规格的 SVG primitive registry 独立实现；
- v2 花头只冻结“扁平、低饱和、细描边、少量 primitive”的几何语言；不复制生成图像素或路径，生产以规格 registry 为真；
- 每枝固定 stem、两片 leaf 与 head group，元素数由生产测试冻结；
- 纸张纹理优先用低对比 CSS radial/linear pattern，不生成或引入位图；
- 黄铜夹只作非交互 CSS 装饰，窄屏可裁掉；
- 花名、花语、角色、选中与 guard 状态都由文字和边框表达；
- forced-colors 隐藏装饰 SVG，但保留真实 role list、composition、动作与 export 状态；
- 图片阻断不影响体验，因为生产运行时没有图片依赖。

## 9. 响应式提案

| 视口 | 视觉 Gate |
| --- | --- |
| 1586×992 | 花束舞台 56–60%；右栏 34–38%；题名、花束、当前角色/主动作均在首屏 |
| 1280×800 | 花束舞台至少 540px 高；右栏可纵滚但主动作不可被压出首屏 |
| 844×390 | 左预览右控制或单列纵滚；不锁方向；花束不裁切，export 可达 |
| 390×844 | 单列；花束舞台约 240–280px；角色/组合句在动作之前；button/link computed block-size ≥56px |
| 320×568 | 内容宽 288–304px；允许纵滚；零横溢；长花语、三行 note 与 safe-area 完整 |

200% text 与约 320 CSS px 的 400% zoom 继续服从规格 Gate；不能为了维持双列缩小正文或花语。

## 10. 动效与交互语言

- ADD 每次只有一枝 180–240ms 的纸面插入；
- TIE 只有一次 220–300ms 的系带收束与 result-letter 淡入；
- UNDO 立即移除最后一枝并回焦对应花卡；
- 不循环摇摆、不落花瓣、不使用粒子、不常驻 RAF；
- reduced-motion 下全部即时切换，焦点仍走 render 后微任务；
- primary 使用 wine 实底，secondary 使用 moss/ink 描边；
- 所有 interactive 保留 UA ring 或 3px solid outline + 3px offset；
- selected、guard、ready/error 都有完整文字，不依赖颜色或图标。

## 11. Fidelity ledger 提案

| 概念锚点 | 实现要求 | 验收证据 |
| --- | --- | --- |
| 花束是唯一主视觉 | 桌面舞台明显大于控制区；移动完整占宽 | desktop/mobile 截图与元素尺寸 |
| 开放标本纸 | 不套巨型圆角应用卡；纸边和装订只作一层容器 | 截图、CSS container audit |
| 三席先于花池 | role list 在视觉和 DOM 中都早于六花条目 | DOM 顺序与 arranging 截图 |
| 选择顺序映射构图 | 主花居中最高、陪花低左、点缀轻右 | 120 scene 测试与三态截图 |
| selected 不消失 | 原花卡保留、角色文字与边框同时存在 | DOM identity、键盘与截图 |
| preview 仍可撤回 | TIE 与 UNDO 同屏，主次清楚 | mobile/desktop preview 截图 |
| 私人字段延迟 | complete 前 DOM/attribute/console 无 final sentinel | 浏览器隐私扫描 |
| complete 纸笺是第二焦点 | finalTitle、note、sender 清楚但不压过花束 | complete 截图与 computed type |
| 保存区独立 | status、真实 link、RESTART 语义与视觉分离 | DOM、键盘和截图 |
| 不承诺保存成功 | link 激活只说交给浏览器处理 | live 文案与交互测试 |
| 本地零图片依赖 | 阻断图片请求仍完整运行；network 为零 | Browser/IAB network 与资源清单 |
| forced/reduced 完整 | 装饰退场，文字/角色/动作仍完整 | media emulation 截图 |

实现完成后至少逐项记录五个可见对比点，并用 `view_image` 同时检查本概念与最新浏览器截图；不能只用测试通过代替视觉验收。

## 12. 用户确认 Gate

生产 UI 目前暂停在此 Gate。请从下列结论中选择其一：

1. **接受（推荐）**：接受“线描标本室里的私人花束台”v2，并接受本文件列出的 v1 舍弃、触控尺寸覆盖与 controller variant 冻结；
2. **调整后接受**：保留结构，但指出希望改变的色温、花朵写实度、排版或材料；
3. **不采用 ImageGen 方向**：保留规格，改走纯代码、无概念图的视觉方案。

只有收到明确接受，才会把本文件改为“已冻结”、完成 design token/asset inventory，并进入生产实现。若未接受，十张概念/迭代图仍作为已归档的设计探索，不构成生产承诺。
