# Candle Wishes 最终验收记录

日期：2026-07-25  
项目：`candle-wishes`  
工作树：`/Users/zenith/Desktop/two-of-us-worktrees/candle-wishes-ui`  
分支：`codex/exp-candle-wishes-ui`  
基线：`main@3aaba821ecbb3a5db06c4cb9139d4e15a96116e3`

## 结论

生产实现、定向测试、全仓测试、仓库校验、README 和固定版本借鉴声明已完成。A 级本地直开静态合同通过：入口仅使用相对本地 CSS 和 `config.js → logic.js → app.js` 经典脚本，不需要构建、服务端、网络、存储、权限或第三方运行依赖。

受控 Chrome 明确按浏览器 URL 安全策略拒绝访问 `file://`。按工具策略停止绕行后，无法把移动端、触摸、减少动态、强制颜色、完整五步流程和真实文件协议标记为 Chrome 已验收。因此本记录不把静态合同或此前的 localhost 初检冒充真实 `file://` 运行证据，浏览器全 Gate 状态为“工具边界导致未闭合”，不是产品测试通过。

## 交付内容

- `experiences/surprises/candle-wishes/index.html`
  - 普通 HTML 入口，包含公开首屏和无 JavaScript 提示。
  - 仅加载本目录相对资源；无 module、远程 URL 或嵌入页面。
- `experiences/surprises/candle-wishes/app.js`
  - 仅消费 `getPublicView()`，不读取 `state.content`、`cursor`、`litIds`、`revision` 或 `config.candles` 裁决点击。
  - 实现 intro、lighting、ready-to-receive、complete 四阶段。
  - 错误点击同引用时不重绘并保留原按钮焦点。
  - 正确点击只从更新后的公开愿望尾项生成播报。
  - 复用一个主动作按钮，并实现 START、第五支、REVEAL、RESTART 的焦点去向。
- `experiences/surprises/candle-wishes/styles.css`
  - 独立 CSS 纸艺蛋糕、五种低饱和蜡烛、可降级火焰。
  - 桌面五列、平板 3+2、手机 2+3、矮屏横向双栏规则。
  - 48px 最小按钮、可见焦点、减少动态、强制颜色和安全区规则。
- `experiences/surprises/candle-wishes/README.md`
  - 双击入口、个性化、隐私、无障碍、自测和独立完整借鉴声明。
- `experiences/surprises/candle-wishes/ATTRIBUTION.md`
  - 三项固定 revision、许可证、版权主体、借鉴范围和未复制范围。
- `experiences/surprises/candle-wishes/ui-contract.test.js`
- `experiences/surprises/candle-wishes/documentation.test.js`
- `learn/2026-07-25-candle-wishes-browser-evidence-boundaries.md`

## 自动化证据

### 定向测试

命令：

```bash
node --test \
  experiences/surprises/candle-wishes/logic.test.js \
  experiences/surprises/candle-wishes/ui-contract.test.js \
  experiences/surprises/candle-wishes/documentation.test.js
```

结果：`28 / 28` 通过。

覆盖：

- 五项配置、固定路线、展示排列和 120 种排列；
- 四阶段公开视图与未来线索、愿望、最终信件的隐私门控；
- 错误点击同引用、完整流程、重开和安全整数边界；
- classic browser global 与 CommonJS；
- HTML 脚本顺序、本地资源闭包、无 JavaScript 基线；
- 禁止网络、存储、权限、音频、Canvas、WebGL、Worker、计时器和不安全 HTML sink；
- 纸艺设计 token、48px 目标、焦点、减少动态和强制颜色；
- README 与 ATTRIBUTION 的固定来源、许可证、版权及未复制范围。

### 全仓测试

第一次运行时工作树没有 `node_modules`，共享运行时找不到锁定依赖 `qrcode@1.5.4`，并连带三个启动复用集成测试超时。执行：

```bash
npm ci --ignore-scripts --no-audit --no-fund
```

没有修改 `package.json` 或 `package-lock.json`。随后运行：

```bash
node scripts/run-tests.mjs
```

结果：`2313 / 2313` 通过，`0` 失败。

### 仓库校验

命令：

```bash
npm run verify
```

结果：通过；输出为 `58` 个作品入口、`50` 个 A 级直开、`8` 个非 A 启动器、`1` 个能力声明，资源与借鉴声明完整。

说明：本执行分支按职责没有修改共享目录和 catalog；Candle Wishes 的目录接入由总控合并阶段处理。因此该命令证明当前仓库状态合法，不单独证明 Candle Wishes 已进入共享目录。

## Chrome 证据与边界

### `file://`

尝试入口：

```text
file:///Users/zenith/Desktop/two-of-us-worktrees/candle-wishes-ui/experiences/surprises/candle-wishes/index.html
```

Chrome 控制能力返回：浏览器 URL 安全策略禁止访问该地址，并明确禁止通过间接执行、原始浏览器命令或替代浏览器表面规避。已停止相关尝试。

### 策略校正前已发生的 localhost 初检

协议：`http://127.0.0.1:4178/experiences/surprises/candle-wishes/index.html`  
Chrome 视口：`1395 × 663`，DPR `2`

开场态读取结果：

- `phase = intro`
- `#current-cue = 0`
- `.candle-button = 0`
- `.revealed-wishes = 0`
- `.final-letter = 0`
- 主动作文字为“开始点亮”
- `scrollWidth = viewportWidth = 1395`
- `scrollHeight = viewportHeight = 663`
- `main` 直接子级顺序为 header、instructions、stage、progress、persistent primary action、privacy、live region、noscript。

点击“开始点亮”后的读取结果：

- `phase = lighting`
- 焦点为 `#current-cue`
- 当前线索为“先从我们都没带伞的那天开始”
- 展示 ID 固定为 `journey → home → rain → quiet → noodle`
- 可见标签固定为“第一次远行、回家以后、那场雨、安静并肩、深夜面馆”
- 愿望数量 `0`，最终信件数量 `0`
- 持续主按钮为隐藏状态
- `scrollWidth = viewportWidth = 1395`
- `scrollHeight = viewportHeight = 663`

本机静态服务日志只出现 `index.html`、`styles.css`、`config.js`、`logic.js`、`app.js` 五个成功资源请求；另有浏览器自动请求 `favicon.ico` 返回 404。没有公共网络资源。

这部分只记录 localhost 下的初步 UI 行为，不作为 `file://`、完整玩法、移动端或无障碍浏览器 Gate 的替代。

## 视觉稿对照

已按原尺寸检查：

- `docs/assets/candle-wishes/concept-lighting-desktop.png`
- `docs/assets/candle-wishes/concept-complete-mobile.png`

在策略校正前观察到的 Chrome 开场和 lighting 截图与批准方向的相符点：

1. 使用暖灰纸张底色，背景没有外部图片或运行时生成资产。
2. 主标题使用深莓红衬线层级，正文使用低对比中性色。
3. 五支蜡烛使用低饱和蓝、杏、豆沙、鼠尾草和金色，配金色托座。
4. 视觉中心是单个奶油色顶面、莓红侧面的纸艺蛋糕。
5. 当前线索、蜡烛、蛋糕和进度沿单一叙事轴排列，没有导航、卡片阵列、徽章、药丸、统计或占位文案。
6. 状态不只依赖火焰或颜色，同时显示“未点亮 / 已点亮”文字。

实现采用原创二维 CSS 纸艺表现，不复制两张概念 PNG。由于 Chrome 后续 Gate 被策略边界中止，未能取得并用本地 `view_image` 复核最终完整流程截图；因此 frontend-app-builder 的最终截图硬 Gate 未闭合，不能宣称移动完成态与批准稿已经完成最终像素级收敛。

## 尚未闭合的浏览器 Gate

以下项目没有获得允许范围内的真实 Chrome 证据：

- `file://` 完整五步路线、ready、REVEAL、complete、RESTART；
- 错误点击后的同一元素焦点；
- 1504×1046、1280×800、768×1024、390×844、320×568、844×390 六视口；
- 键盘 Tab/Shift+Tab、Enter、Space；
- 触摸；
- `prefers-reduced-motion`；
- forced-colors；
- 200% 文本与约 400% 缩放；
- 最大合法配置文案；
- 完整流程的 console、网络和权限面板；
- 最新完整浏览器截图的本地 `view_image` 对照。

## 借鉴与许可证

1. `ololx/birthday-cake@d51cd5c73c3171d6b769b5da1b9072beca691ce6`
   - Unlicense / public domain dedication
   - 初始作者 Alexander A. Kropotin
   - 只借鉴本地单 HTML 与逐支点击蜡烛的能力概念
   - 未复制代码、CSS 蛋糕、参数、动画、文案、截图或视觉
2. `VIDAKHOSHPEY22/Birthday-Cake-Blow-Candle@3d364f985b2d96057f30d3fc67c5ee71ec37556f`
   - MIT
   - Copyright (c) 2025 Vida Khoshpey
   - 只用于确认麦克风、图片、音频、Canvas、Lottie 的排除边界
   - 未复制代码、素材、文案或视觉
3. `elixpo/wish.elixpo@bf6ec8cae8c756203e059940d42089504ae43ec8`
   - MIT
   - Copyright (c) 2024 Ayushman Bhattacharya
   - 只用于核对个性化贺卡、最终私信和云端方案边界
   - 未复制 Next.js、D1、数据库、访问码、麦克风、素材、样式或任何实现

MDN、W3C Pointer Events 和 WCAG 仅用于标准校准，不是代码或运行依赖。

## 提交

- `7cae4fd` — `test: define candle wishes UI contract`
- `9e9ec3c` — `feat: build candle wishes local UI`
- `2f1c1df` — `docs: document candle wishes experience`
- `9e095ef` — `docs: record local browser evidence boundary`

最终验收文档将在下一提交中单独落地。总控合并前应把“实现与自动化通过”和“浏览器工具边界未闭合”同时保留，不能把后者省略为绿色结论。
