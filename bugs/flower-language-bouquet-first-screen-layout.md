# Flower Language Bouquet：首屏舞台覆盖动作与三席错位

- 日期：2026-07-25
- 范围：`experiences/surprises/flower-language-bouquet/styles.css`、`app.js`
- 类型：真实浏览器响应式布局缺陷

## 环境

- Chrome 扩展控制的真实浏览器页
- 本地静态入口
- 桌面可视区：1395×607
- 参考验收：桌面首屏应同时看见花束舞台、当前三席与主要动作

## 问题一：intro 主动作落到首屏以下

### 现象

`.intro-stage` 声明的 `inline-size: min(100%, 720px)` 被后出现、同等 specificity
的 `.bouquet-stage { inline-size: 100%; }` 覆盖。舞台实际扩大到约 856px，
整个 grid 行被撑高，56px 的“开始挑花”按钮位于 `y≈717`，在 607px 高窗口中
完全不可见。

### 修复

使用 `.bouquet-stage.intro-stage` 和 `.bouquet-stage.complete-stage` 明确
variant 尺寸优先级，并让桌面 intro 动作从舞台上部对齐。修复后同一窗口按钮
位于 `y≈432`，高度 56px，首屏可见；舞台保持纸面主视觉。

## 问题二：arranging 三席被大舞台推到首屏以下

### 现象

语义 DOM 中三席列表跟在 SVG 舞台之后。原来的两列只把整个
`.workspace-visual` 放在左列，因此三席也留在大舞台下方；右列首屏只有花池。
初始 `0 / 3` 状态的空 `.action-row` 还会留下无意义的垂直间隔。

### 修复

桌面用 `display: contents` 把 visual 子项参加父 grid 排版：进度与舞台留在左列，
三席标题/列表和控制区依次进入右列。移动端显式恢复“进度 → 舞台 → 三席 →
控制区”的单列视觉顺序。`app.js` 同时在没有 tie/undo 动作时隐藏整个 action row。

## 回归证据

- Chrome 桌面修复后：三席 `y≈224–399`，花池 `y≈415`，均在首屏；
- 1395px 桌面与 390px 移动均 `scrollWidth === clientWidth`；
- 移动舞台约 280px，主/次动作和花卡高度均不低于 56px；
- 控制台零 warning/error；
- 项目定向 47 项测试全部通过。
