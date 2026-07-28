# 拼回这一刻：验收记录

- 验收日期：2026-07-17
- 作品目录：`experiences/surprises/photo-swap-puzzle/`
- 启动等级：A
- 公网依赖：无
- 第三方运行依赖：无

## 自动检查

| 检查 | 结果 |
| --- | --- |
| `node --test experiences/surprises/photo-swap-puzzle/logic.test.js` | 8/8 通过 |
| `npm test` | 80/80 通过 |
| `npm run verify` | 通过；12 个作品入口、资源与借鉴声明完整 |
| `node --check logic.js / app.js` | 通过 |
| `git diff --check` | 通过 |
| 产品源码公网 API 扫描 | 未发现 `fetch`、XHR、WebSocket、远程 URL 或持久化 API |
| A 级静态结构 | 仅使用相对路径经典脚本 `logic.js`、`app.js`，没有模块、构建产物或服务端请求 |

纯逻辑覆盖文件元数据、尺寸边界、可注入 Fisher–Yates、完成态防直出、选择/取消/交换、完成锁定、重新创建状态和九宫格坐标。

## Chrome 功能流程

浏览器验收通过 `http://localhost:4173/experiences/surprises/photo-swap-puzzle/` 执行。测试照片由页面内临时 Canvas 生成，再构造本地 `File` 触发真实 `input change`；它没有写入仓库，也没有使用私人照片。

1. **空状态**：选择按钮、九宫格轮廓、格式和隐私提示正常；工具栏隐藏。
2. **照片预处理**：1200×900 PNG 被中心裁成 900×900 JPEG 派生图；九个固定按钮启用，交换次数为 0。
3. **对象 URL**：加载时共创建 2 个 URL（原始候选、派生图），Canvas 派生成功后原始候选立即撤销，观测为 `created: 2, revoked: 1`。
4. **输入语义**：鼠标点击可选择与同块取消；Enter 可选择、Space 可取消；次数始终保持 0。
5. **完整通关**：按当前排列执行 7 次两块交换后，顺序成为 `0–8`；拼块区域隐藏、完整 `<img>` 显示、九个按钮全部锁定，状态宣布“拼回来了”。
6. **非法替换**：完成态选择 GIF 后，旧派生 URL 与完成图保持不变，错误提示明确包含“当前拼图已保留”。
7. **重新打乱**：完成态回到未完成九宫格，次数归零，选择清空，九个按钮重新启用。
8. **清除**：派生 URL 被撤销，观测变为 `created: 2, revoked: 2`；完整图 `src` 移除、工具栏隐藏、九块禁用。
9. **竞态回归**：合法候选开始解码后立刻选择非法 GIF，修复前观测 `created: 1, revoked: 0`，修复后立即变为 `created: 1, revoked: 1`。

控制台没有 error/warning。页面网络请求只有自身 HTML、`styles.css`、`logic.js`、`app.js`；额外出现的 `chrome-extension://.../cursor-chat.png` 来自浏览器控制扩展，不是作品资源。

## 响应式与可访问性

| 视口 | 证据 |
| --- | --- |
| 1280×900 | 九宫格为 690px 方形，标题、拼图、四项工具栏与隐私栏层级清楚；完成态使用图片与文案双栏 |
| 390×844 | 页面宽度和文档 `scrollWidth` 都为 390px；拼图 350px；工具栏为两列并把清除按钮独占一行 |
| 320×844 | 页面与文档 `scrollWidth` 都为 320px；拼图 288px；四项工具改为 288px 单列，无横向溢出 |

九个拼块始终是同一批原生按钮，交换不会替换 DOM。每块暴露目标行列、当前位置和 `aria-pressed`；选中态不只依靠颜色，还使用 4px 轮廓与轻微位移；键盘焦点可见；完成图提供通用 alt；动态状态通过 `aria-live` 宣布。

## A 级直接打开边界

产品只使用经典相对脚本、标准 File/Canvas/Blob/DOM API，不读取服务器目录，也不发起网络请求；因此满足 `file://` 结构约束。当前 Chrome 控制扩展的 URL 安全策略禁止自动导航到 `file:///.../index.html`，不能用自动化浏览器直接采集该路径；没有绕过这一安全限制。等价 localhost 页面已完成全流程验证，仓库 verifier 也确认所有入口和相对资源存在。

Chrome 扩展的原生 `fileChooser.setFiles` 还因未开启“Allow access to file URLs”被拒绝；这不是作品缺陷。本轮使用无隐私的页面内临时 File 验证完全相同的产品事件链。

## 视觉忠实度账本

视觉概念图：`{generated-image-root}/019f64a6-a21a-7422-a71a-682735543ad1/exec-ed618b0e-4af9-45c0-9a86-5c628ba00da0.png`

| 概念要点 | 最终实现 |
| --- | --- |
| 深梅色暗房背景 | 使用 `#211820`，无渐变、卡片或装饰噪声 |
| 米白宋体大标题 | Georgia / Songti 字体栈，标题保持编辑式层级 |
| 珊瑚色主操作 | `#c95c55` 只用于选择照片和关键选中轮廓 |
| 方形照片主舞台 | 空态、九宫格和完成图都保持 1:1 |
| 细线九宫格与工具栏 | 使用 1px 灰线、4px 圆角和线性 SVG 图标 |
| 桌面完成双栏 | 完整图在左，“拼回来了”在右；工具栏继续可操作 |
| 移动端空态与游戏态 | 390px 下单列主舞台，按钮按两列/整行重新排布 |

有意偏离：概念图中的海边照片只作视觉占位，未进入仓库；完成态概念图里类似 4×4 的生成瑕疵没有照搬，产品严格保持规格要求的 3×3；没有为了匹配概念引入远程字体或图片。文案与概念一致，没有新增计时、提示、难度、下载或分享功能。

## 截图证据

- 桌面游戏态：`{visualization-root}/2026/07/15/019f6391-1492-74c1-ad81-58b3f8721526/photo-swap-desktop-game.png`
- 桌面完成态：`{visualization-root}/2026/07/15/019f6391-1492-74c1-ad81-58b3f8721526/photo-swap-desktop-complete.png`
- 移动游戏态：`{visualization-root}/2026/07/15/019f6391-1492-74c1-ad81-58b3f8721526/photo-swap-mobile-game.png`
- 移动空状态：`{visualization-root}/2026/07/15/019f6391-1492-74c1-ad81-58b3f8721526/photo-swap-mobile-empty.png`

## 借鉴与隐私结论

作品 README 已声明传统交换拼图机制、Headbreaker 3.0.0（ISC）、Vanilla JavaScript Memory Card Game（MIT）和仓库内部 Blob 生命周期经验的边界。没有复制或改写两个上游的代码、布局、文案和素材，也没有引入 Konva。仓库不含测试照片、私人照片、原文件名、EXIF 或 GPS 数据。
