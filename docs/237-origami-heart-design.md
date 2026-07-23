# “沿着折痕，折到你心里”代码原生视觉设计

- 日期：2026-07-24
- 状态：已冻结，可直接进入生产实现
- 对应规格：[`236-origami-heart-spec.md`](./236-origami-heart-spec.md)
- 视觉方法：HTML/CSS/SVG 基本形；无 ImageGen、无第三方图片、无运行时素材

## 1. 冻结方向

视觉主题是 **夜灯下的一张双面信纸**。

深墨蓝桌面给纸张留出安静空间；正面是暖奶油纸，折痕用旧黄铜表达；背面是克制的莓红，五折完成后形成一颗代码原生心。页面像有人在夜里认真把一张信纸折好，而不是儿童折纸教程、婚礼请柬、电商贺卡、3D 模拟器或奖励弹窗。

视觉验收以书面几何合同为准，不依赖概念图：

- 五道折痕的坐标、方向、编号与活动区域；
- 2D 稳态和可选 3D 增强；
- 阶段 DOM、层级和 z-index；
- 色板、文字、焦点和系统色；
- 响应式量化值；
- complete 前私密 DOM 零出现。

## 2. 设计令牌

```css
:root {
  --night-975: #10141d;
  --night-925: #1a2130;
  --night-850: #263246;
  --paper-50: #fffaf0;
  --paper-100: #f5e9d2;
  --paper-250: #dcc9a8;
  --ink-950: #2d251f;
  --ink-700: #5d4e41;
  --berry-850: #5d2235;
  --berry-650: #84364e;
  --berry-350: #c68191;
  --brass-750: #75501f;
  --brass-500: #b07b32;
  --brass-250: #ddbd7b;
  --success-650: #496b58;
  --focus: #ffe19a;
  --shadow-paper: 0 24px 70px rgb(0 0 0 / 34%);
  --shadow-fold: 0 12px 24px rgb(38 25 18 / 26%);
  --radius-small: 10px;
  --radius-medium: 18px;
  --radius-large: 28px;
  --content-max: 1120px;
}
```

字体：

- 标题：`Iowan Old Style`, `Songti SC`, `STSong`, serif；
- 正文：`Avenir Next`, `PingFang SC`, `Microsoft YaHei`, sans-serif；
- 步骤编号：`ui-monospace`, `SFMono-Regular`, monospace；
- 不加载远程字体；
- 正文至少 16px，辅助文字至少 14px，按钮至少 16px；
- 不使用渐变字、描边字、全大写英文 eyebrow 或超大营销标题。

## 3. 稳定外壳

```text
body.origami-heart
└── main#app.app-shell
    ├── a.skip-link
    ├── nav.utility-bar
    │   ├── a 返回作品集
    │   └── span#step-counter
    ├── header.app-header
    │   ├── h1 沿着折痕，慢慢折
    │   └── p 公开说明
    ├── section#phase-mount
    ├── ol#fold-progress
    ├── footer.privacy-note
    ├── p#live-region.sr-only[role=status]
    └── noscript
```

规则：

- 外壳不含四个私密配置值；
- `phase-mount` 每次 `replaceChildren()`；
- live region 永久位于阶段 mount 外，页面只存在一个；
- utility bar 不是产品导航，不增加设置、帮助、分享或下载；
- footer 固定写“只在本机 · 不联网 · 刷新即清空”。

## 4. 阶段 DOM

| 阶段 | 必须创建 | 主动作 |
|---|---|---|
| intro | 未折方纸、公开规则、五步列表 | `开始折` |
| folding | 当前纸张、唯一活动折面、折痕 label、拖动说明 | `折好这一步` |
| turning | 五折正面、五项完成列表 | `翻到背面` |
| complete | CSS 心形、语义短笺、四项私密文字 | `再折一次` |

禁止：

- intro/folding/turning 创建称呼、最终标题、留言或署名节点；
- 用 `.hidden`、透明度、离屏定位、template 或 ARIA 预埋私信；
- complete 保留拖动 hit area、活动折面或旧阶段按钮；
- 用 modal、dialog、翻卡或 toast 承载最终短笺。

## 5. 纸张层级

```text
.paper-scene
└── .paper-object
    ├── .paper-shadow
    ├── .paper-face--front
    ├── .paper-face--back
    ├── .paper-flap[data-fold-id] × 5
    ├── .crease-layer
    │   └── .crease[data-fold-id] × 5
    ├── button.fold-handle
    └── p.paper-state-copy
```

z-index：

| 层 | z-index |
|---|---:|
| shadow | 0 |
| front/back base | 10 |
| 已完成折面 | 20 |
| 当前活动折面 | 30 |
| 折痕 | 40 |
| fold handle | 50 |
| 编号与文字 label | 60 |

约束：

- `.paper-object` 使用 `position: relative`、`isolation: isolate`、`aspect-ratio: 1`；
- 纸纤维只使用 CSS `repeating-linear-gradient` 与 `radial-gradient`；
- 装饰伪元素全部 `pointer-events: none`；
- 视觉折面 `aria-hidden="true"`；
- `.paper-state-copy` 以文字说明当前完成数，不让形状承担唯一信息；
- `data-completed` 与 `data-phase` 只来自公开 view；
- `--fold-progress` 只来自 app 层临时手势。

## 6. 五道几何

坐标以方纸左上为 `(0,0)`、右下为 `(100,100)`。

| foldId | 活动区域 | 折痕 | 折叠方向 | 归一化距离 |
|---|---|---|---|---:|
| `bottom-up` | `y 64..100` | `y = 64` | 北 `(0,-1)` | `.36S` |
| `left-in` | `x 0..28, y 20..80` | `x = 28` | 东 `(1,0)` | `.28S` |
| `right-in` | `x 72..100, y 20..80` | `x = 72` | 西 `(-1,0)` | `.28S` |
| `top-left-soften` | 三角 `(0,0)(36,0)(0,36)` | `(36,0)→(0,36)` | 东南 `(1,1)` | `.24S` |
| `top-right-soften` | 三角 `(64,0)(100,0)(100,36)` | `(64,0)→(100,36)` | 西南 `(-1,1)` | `.24S` |

当前折痕同时显示：

- 实线折痕；
- 圆形步骤编号；
- 方向箭头；
- 动词短句；
- 至少 56×56px 的真实 `<button>` hit area。

已完成折痕变为细实线和“已折好”；未来折痕是浅虚线但不可操作。

## 7. 2D 基线与 3D 增强

发布顺序：

1. 基础 CSS：矩形纸、边框、折痕、编号、文字和按钮；
2. `clip-path` 可用：显示三角折面和最终心形轮廓；
3. `.has-3d` 且支持 `transform-style: preserve-3d`：当前折面按手势进度增加空间翻折；
4. reduced-motion：关闭 transition 与 3D 插值，提交后立即切稳态；
5. forced-colors：移除纸纹、阴影和装饰填充，保留系统色边框、编号、文字和 outline；
6. CSS 失败：有序列表与原生按钮仍能推进；
7. JavaScript 失败：只显示 noscript，不泄露私密配置。

3D 建议：

| foldId | transform-origin | 增强 |
|---|---|---|
| bottom-up | `50% 64%` | `rotateX(0 → 180deg)` |
| left-in | `28% 50%` | `rotateY(0 → 180deg)` |
| right-in | `72% 50%` | `rotateY(0 → -180deg)` |
| top-left-soften | 左上斜轴 | 向内旋转 |
| top-right-soften | 右上斜轴 | 向内旋转 |

任何 3D 错位、背面闪烁或层叠差异都允许关闭 `.has-3d`；2D 路径是正式交付，不是临时兜底。

## 8. 完成心形与短笺

心形用代码原生基本形：

- 一个旋转 45° 的莓红方块；
- 两个同色圆形伪元素；
- 纸纹与折痕留在表面；
- 不使用图片、emoji、第三方 SVG path 或 Canvas。

短笺：

```text
article.final-note
├── p.recipient
├── h2#phase-heading.final-title
├── p.final-message
└── p.signature
```

- 正文最大宽度 `42ch`；
- 允许长中文、英文和 emoji 自然换行；
- 私密字符串只用 `textContent`；
- 心形是 `aria-hidden` 装饰，短笺是真正可访问结果。

## 9. 焦点与播报

焦点顺序：

```text
加载 / restart → 开始按钮
START → 第一道 fold handle
每次 COMMIT_FOLD → 下一道 fold handle
第五折 → 翻到背面
TURN_OVER → complete 标题
```

使用 render generation 与一次 `requestAnimationFrame` 安排焦点；旧 render 不能抢回焦点。

live region 只播离散结果：

- “开始第一道折痕。”
- “第一道折痕完成。下一步，把左角收进来。”
- “五道折痕完成。现在可以翻到背面。”
- complete 后才可播最终标题；
- 重开清空旧播报；
- 不播 Pointer 百分比。

## 10. 响应式

| 条件 | 布局 Gate |
|---|---|
| 1728×906 | 两栏；纸张 460–500px；操作首屏可见 |
| 1280×800 | 两栏；纸张至少 360px |
| ≤760px | 单列：文案 → 纸张 → 主动作 → 步骤 → footer |
| 390×844 | 纸张不超过 310px；主按钮至少 56px |
| 320 CSS px | 纸张 272–288px；自然纵滚；无横向滚动 |
| 1280×800 / 400% | 等效 320 CSS px 回流；无功能损失 |
| 200% text | 文本不裁切，按钮不叠压，短笺可读 |

不使用固定页面高度；grid/flex 子项全部 `min-width: 0`；页面必须满足 `scrollWidth <= clientWidth`。

## 11. 浏览器 fidelity ledger

| 设计承诺 | 浏览器证据 |
|---|---|
| 同一张纸逐步构造 | 五个前缀截图/DOM 的 paper-object identity 稳定，折面状态递增 |
| 2D 是发布基线 | 移除 `.has-3d` 后完整完成 |
| 拖动与按钮等价 | Pointer/点击/键盘混合路径得到同一 complete view |
| 私信不提前出现 | intro、五前缀、turning 的 outerHTML/文本/属性零命中 |
| 五步有序且非颜色表达 | ol、编号、label、status、aria-current 同时存在 |
| 完成是开放短笺 | complete 无 dialog/modal/翻卡，article 可直接阅读 |
| 窄屏可用 | 390、320、400% 无横向溢出，主动作可达 |
| 系统偏好不改规则 | reduced/forced/2D 与默认路径得到相同 state |

截图只保存到临时目录用于发现裁切、重叠和闪烁，不进入仓库，也不作为规则或资产来源。
