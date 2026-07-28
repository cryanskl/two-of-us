# Candle Wishes 最终验收记录

日期：2026-07-25
项目：`candle-wishes`
工作树：`{worktree-base}/candle-wishes-ui`
分支：`codex/exp-candle-wishes-ui`
本轮起始提交：`e61892eea4adde55ad32ac41a7b4d554e4ae6442`

## 结论

Candle Wishes 已在真实 Chrome 的 localhost 页面完成独立终验。完整路线、错误选择、收下愿望、完成信件和重播均通过；六个指定视口没有横向溢出；键盘、真实 CDP 触控、减少动态、强制颜色、无 JavaScript、焦点、控制台和静态资源请求均已覆盖。

本轮发现并修复一项无 JavaScript 基线缺陷：页面原先会暴露空舞台、初始进度和无法工作的“开始点亮”按钮。修复后，无脚本页面只显示标题、固定说明、固定隐私说明和开启 JavaScript 提示；正常脚本首屏与完整流程不受影响。

A 级本地直开合同继续通过：入口只使用本目录相对图标、CSS 和 `config.js → logic.js → app.js` 经典脚本，不需要构建、服务端、网络、存储、权限或第三方运行依赖。受控 Chrome 仍因工具 URL 安全策略不能导航到 `file://`，因此真实浏览器运行证据明确来自 localhost；双击直开能力由静态依赖闭包与禁止 API 合同证明，不把 localhost 冒充文件协议。

## 交付与边界

- `index.html`：普通 HTML 入口；公开首屏；安全的无 JavaScript 基线。
- `favicon.svg`：本项目原创、相对路径、无脚本或外部资源。
- `config.js → logic.js → app.js`：经典脚本；四阶段状态机；不使用网络、存储、权限、计时器或随机数。
- `styles.css`：原创纸艺蛋糕与蜡烛；桌面、平板、手机和矮屏横向布局；焦点、减少动态和强制颜色规则。
- `README.md` / `ATTRIBUTION.md`：启动、个性化、隐私、无障碍及固定版本借鉴声明。
- 本轮新增：
  - `bugs/2026-07-25-candle-wishes-no-js-inert-controls.md`
  - `learn/2026-07-25-no-js-progressive-enhancement-baseline.md`

## 自动化证据

### 定向测试

```bash
node --test \
  experiences/surprises/candle-wishes/logic.test.js \
  experiences/surprises/candle-wishes/ui-contract.test.js \
  experiences/surprises/candle-wishes/documentation.test.js
```

结果：`28 / 28` 通过。

覆盖配置清洗、固定路线、120 种排列、四阶段公开视图、未来内容隐私门控、错误选择同引用、重播、安全整数边界、classic global/CommonJS、相对资源闭包、无 JavaScript 初始隐藏边界、禁止能力、设计 token、48px 目标、焦点、减少动态、强制颜色和固定借鉴声明。

### 语法与差异

```bash
node --check experiences/surprises/candle-wishes/app.js
git diff --check
```

结果：通过。

### 全仓回归

锁定依赖已安装。本轮最终运行：

```bash
node scripts/run-tests.mjs
npm run verify
```

最终结果为 `2315 / 2315` 通过、`0` 失败；仓库校验通过：`58` 个作品入口（`50` 个 A 级直开、`8` 个非 A 启动器）、`1` 个能力声明，资源与借鉴声明完整。

## Chrome 环境

- 协议：`http://127.0.0.1:49124`
- 页面：`/experiences/surprises/candle-wishes/index.html`
- 浏览器：受控 Chrome
- 页面标题：`今晚，点亮五支蜡烛`
- 资源：`index.html`、`styles.css`、`config.js`、`logic.js`、`app.js`、`favicon.svg`
- 本机服务的受控页面加载窗口中上述六项均返回 `200`
- 页面声明并成功请求作品目录下的 `favicon.svg`
- 启用 CDP `Log` 与 `Runtime` 后忽略缓存重载，未采集到 console 事件

补充边界：所有页面交互结束约四分钟后、清理服务前，日志出现一条没有伴随 `index.html` 请求的孤立 `/favicon.ico` 404。它不属于上述受控页面加载资源序列，也没有出现在页面 console 事件中；仅凭服务端日志不能判断是 Chrome 会话外壳、其他标签还是页面触发。因此本记录只确认作品页面的相对 `favicon.svg` 成功闭合，不声称整个浏览器生命周期绝不会探测站点根图标。

## 完整玩法与焦点

1. intro 的主动作是“开始点亮”。
2. START 后进入 lighting，焦点落在 `#current-cue`。
3. 第一条线索下故意点击“第一次远行”：
   - 阶段与已揭示内容不变；
   - live region 播报“这一盏还没轮到。再看看眼前的线索。”；
   - 焦点保留在原错误按钮。
4. 按 `rain → noodle → journey → quiet → home` 依次点亮：
   - 每一步只揭示当前新增愿望；
   - 线索按固定路线推进；
   - 前四步焦点回到 `#current-cue`。
5. 第五支后进入 `ready-to-receive`：
   - 进度为“五盏都亮了。愿望还在等你收下。”；
   - 五条愿望可见；
   - 焦点落在“收下这些愿望”。
6. REVEAL 后进入 complete：
   - 标题为“愿每一个以后，都有我们”；
   - 最终信件四项内容完整；
   - 焦点落在 `#final-title`。
7. RESTART 后回到 intro：
   - 愿望与最终信件删除；
   - 主动作恢复“开始点亮”；
   - 焦点落在同一个持久主按钮。

修复无脚本基线后，又在 `390 × 844` 从 intro 重跑完整路线至 complete，阶段、进度、焦点和最终标题均通过。

## 六视口矩阵

| 视口 | 完成态文档尺寸 | 横向溢出 | 观察 |
| --- | --- | --- | --- |
| `1504 × 1046` | `1504 × 1046` | 无 | 五列舞台与信件完整落在首屏 |
| `1280 × 800` | `1280 × 1016` | 无 | 允许纵向滚动，信件宽 `820px` |
| `768 × 1024` | `768 × 1153` | 无 | 3+2 蜡烛排列，信件宽 `672px` |
| `390 × 844` | `390 × 1562` | 无 | 2+3 蜡烛排列，单栏纵向叙事 |
| `320 × 568` | `320 × 1627` | 无 | 最窄支持宽度成立，内容自然纵向滚动 |
| `844 × 390` | `844 × 614` | 无 | 矮屏双栏，舞台在右、内容在左 |

六个尺寸都读取 `documentElement.scrollWidth === innerWidth`。纵向超出时保留正常页面滚动，没有使用裁切隐藏内容。

## 输入与无障碍分支

### 键盘

- Enter 激活“开始点亮”；
- Space 激活第一支正确蜡烛；
- Enter 激活下一支正确蜡烛；
- 每次正确选择后焦点回到新线索；
- 原生按钮仍提供固定 DOM/Tab 顺序，没有文档级字符快捷键。

### 真实触控

在 `390 × 844` 下启用 Chrome 触控仿真，通过 CDP `Input.dispatchTouchEvent` 对“第一次远行”按钮中心发送真实 `touchStart/touchEnd`。路线从第 2 步推进到第 3 步，live region 播报第三条愿望，焦点回到新线索。随后关闭触控仿真。

### 减少动态

模拟 `prefers-reduced-motion: reduce`：

- `matchMedia` 返回 `true`；
- 蜡烛、火焰及过渡的持续时间均降为 `0.00001s`；
- 正确点击仍立即推进到下一状态；
- 焦点与 live region 不受影响。

### 强制颜色

模拟 `forced-colors: active`：

- `matchMedia` 返回 `true`；
- 纯装饰的火焰、蜡烛杆和蛋糕隐藏；
- 蜡烛按钮保留系统可见边框、文字和“未点亮 / 已点亮”状态；
- 完整流程仍可推进到 `ready-to-receive`；
- `390px` 视口无横向溢出。

### 无 JavaScript

在独立标签页关闭脚本并以 `320 × 568` 重载。修复前真实快照包含空 region、进度和不可用按钮；修复后可见节点只剩：

1. H1“今晚，点亮五支蜡烛”
2. 固定玩法说明
3. 固定隐私说明
4. “请开启 JavaScript 后再点亮这五支蜡烛。”

修复后文档尺寸为 `320 × 568`，无横向溢出。重新启用脚本并忽略缓存重载后，舞台、进度、live region 与主动作按阶段正常显示。

## 视觉对照

已在 Chrome 中查看 intro、lighting、ready、complete、`320px` 手机与 `844 × 390` 横屏截图，并与以下批准稿方向对照：

- `docs/assets/candle-wishes/concept-lighting-desktop.png`
- `docs/assets/candle-wishes/concept-complete-mobile.png`

暖灰纸张、深莓红衬线标题、五种低饱和蜡烛、单个奶油/莓红纸艺蛋糕和单轴叙事均一致。状态同时使用文字和视觉，不只依赖颜色或火焰。实现为原创 CSS 纸艺表现，不复制概念 PNG。

## 借鉴与许可证声明

1. `ololx/birthday-cake@d51cd5c73c3171d6b769b5da1b9072beca691ce6`
   - Unlicense / public domain dedication
   - 初始作者 Alexander A. Kropotin
   - 只借鉴本地单 HTML 与逐支点击蜡烛的能力概念
   - 未复制代码、CSS、参数、动画、文案、截图或视觉
2. `VIDAKHOSHPEY22/Birthday-Cake-Blow-Candle@3d364f985b2d96057f30d3fc67c5ee71ec37556f`
   - MIT
   - Copyright (c) 2025 Vida Khoshpey
   - 只用于确认麦克风、图片、音频、Canvas、Lottie 的排除边界
   - 未复制代码、素材、文案或视觉
3. `elixpo/wish.elixpo@bf6ec8cae8c756203e059940d42089504ae43ec8`
   - MIT
   - Copyright (c) 2024 Ayushman Bhattacharya
   - 只用于核对个性化贺卡、最终私信和云端方案边界
   - 未复制 Next.js、D1、数据库、访问码、麦克风、素材、样式或实现

MDN、W3C Pointer Events 和 WCAG 仅用于标准校准，不是代码、素材或运行依赖。本轮无 JavaScript 修复和测试为本项目原创，没有新增第三方借鉴。

## 已知边界

- 受控 Chrome 不能访问 `file://`；本轮没有绕过该策略。直开能力由静态合同证明，真实交互由 localhost 证明。
- 服务清理前出现一条晚到且无 document 请求关联的 `/favicon.ico` 探测；作品页面自己的受控加载资源均为成功响应，但该浏览器级探测来源未能进一步归因。
- 本轮指定的浏览器矩阵不包含 200% 文本缩放、约 400% 页面缩放或最大合法配置文案；这些项目没有在本记录中冒充已验收。

## 提交

- `7cae4fd` — `test: define candle wishes UI contract`
- `9e9ec3c` — `feat: build candle wishes local UI`
- `2f1c1df` — `docs: document candle wishes experience`
- `9e095ef` — `docs: record local browser evidence boundary`
- `d7ed78c` — `docs: verify candle wishes experience`
- `e61892e` — `fix: add candle wishes favicon`
- `2864b0c` — `fix(candle-wishes): hide inert no-js controls`
- 本次终验文档提交 — localhost 六视口与浏览器分支证据
