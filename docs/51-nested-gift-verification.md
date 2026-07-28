# 「一层一层」实现与验收记录

## 1. 结论

「一层一层」已作为 A 级单人惊喜作品接入统一门户。收礼人依次解丝带、揭四角、拉抽屉、敲盒盖；每层完成后只揭晓一段留言，第四段之后才打开盒心。

作品可以直接双击 `index.html`，不需要安装依赖、账号、服务或公网。鼠标、触控、完整键盘路径、阶段 DOM、焦点、reduced motion、响应式与真实 `file://` 均已验证。

本批提交：

- `c7edfa4`：brainstorm、规格、桌面/移动概念、运行图集与来源声明；
- `9423371`：状态机、页面、配置、catalog、门户、测试及浏览器发现的修复；
- 本文所在提交：浏览器截图、缺陷记录与学习沉淀。

## 2. 自动 Gate

### 2.1 作品纯逻辑

`node --test experiences/surprises/nested-gift/logic.test.js`：8 / 8 通过，覆盖：

- 默认/合法/畸形配置的整份回退与深冻结；
- intro、四层、四次 note、complete 和 restart 唯一路径；
- 丝带与四角任意顺序、重复和未知输入；
- 抽屉整数钳制、80% Gate 和三次敲盒 Gate；
- 非当前层、终局和畸形状态的原引用或安全回退。

### 2.2 整仓

- `npm test`：316 / 316 通过；
- `npm run verify`：27 个作品入口、1 个能力声明、资源与借鉴声明完整；
- `git diff --check`：通过；
- catalog Gate 确认 A 级入口、经典脚本、相对本地资源、无网络与无持久化；
- 生产 CSS 不含 gradient，运行脚本不调用网络、Storage 或 `Math.random`。

## 3. 真实浏览器完整实玩

先连接内置 Browser/IAB，本次环境返回 `No browser is available`，因此使用 Playwright CLI 的 headed Chromium 作为 fallback；同目录静态服务为 `127.0.0.1:8768`。

一次会话实际完成全部路径：

1. 开始后焦点落到“解开左边”，首层可按任意顺序完成；
2. 第二层连续使用 Space / Enter 揭开四角，每次重渲染都聚焦下一个未完成纸角；
3. 第三层进入时 range 输入获焦，按 End 拉到 100%，80% Gate 只触发一次；
4. 第四层用 Enter 敲三次，第三次才进入留言；
5. 四次留言的剩余数依次为 3 / 2 / 1 / 0，按钮依次为“继续拆下一层”与“打开盒心”；
6. complete 只在最后显示最终标题、正文、邀请和署名，重开后这些文字与四层留言均不在 DOM；
7. restart 回到 intro，焦点为“开始拆礼物”，live region 清空。

正常会话控制台 0 error / 0 warning。页面只请求同源 HTML、CSS、三个脚本和一张本地 PNG；intro 不含任何层留言或最终正文。

### 3.1 `file://` 双击路径

Playwright CLI 自身阻止 `file:` 导航，因此另启 headless Google Chrome 直接加载：

`file://{repo-root}/experiences/surprises/nested-gift/index.html`

通过 Chrome DevTools Protocol 实测：

- intro 正常加载，`logic.js`、`config.js`、`app.js` 都是相对 `file://` URL；
- 图集解析为本地 `assets/gift-layers.png`，没有加载失败分支；
- 初始焦点为“开始拆礼物”，最终文案不在 DOM；
- 点击开始后进入 `layer`、显示“第 1 / 4 层”，焦点为“解开左边”，礼盒宽度 520px。

因此“双击作品 HTML 即可运行”由真实 Chrome 的 `file://` 会话确认。

## 4. 响应式、触控与可访问性

| 视口 | 结果 |
| --- | --- |
| 1504×1046 layer 1 | `scrollWidth = 1504`、`scrollHeight = 1046`；完整标题、礼盒、双按钮、进度与页脚均在首屏，按钮 250×72px |
| 390×844 layer 1 | `scrollWidth = 390`、页面高 944px；礼盒 352×352px，按钮 352×64px，单列自然滚动 |
| 320×760 layer 1 | `scrollWidth = 320`、页面高 915px；礼盒约 312px，按钮 294×64px，页脚可滚动到达 |

补充验证：

- 所有操作都有文字标签，进度同时使用数字、勾选和剩余文案，不只依赖颜色；
- intro、note、complete 自动聚焦唯一主操作，各 layer 聚焦首个未完成控件；
- live region 只播报当前动作、当前留言或终局，不提前播报后续文案；
- `prefers-reduced-motion` 下礼盒、按钮和进度的 transition / animation duration 都为 0.001s，规则不依赖动画；
- 所有运行文字由 HTML/JS 原生渲染，不烘焙进概念图或图集。

截图：

- [1504×1046 桌面第一层](assets/nested-gift/implementation-desktop-1504x1046.png)
- [390×844 移动第一层](assets/nested-gift/implementation-mobile-390x844.png)

## 5. 视觉忠实度账本

概念：[1504×1046 桌面稿](assets/nested-gift/concept-desktop.png)、[852×1846 移动稿](assets/nested-gift/concept-mobile.png)。最终 QA 在同一次检查中原生查看两张概念和两张 Chromium 实现截图。

| 比较点 | 概念证据 | 实现证据与处理 |
| --- | --- | --- |
| 色板 | 深墨蓝、奶油纸、朱红、黄铜、孔雀绿与芥末黄 | 固定 CSS token 与六格图集保持同一色系；没有 CSS 渐变 |
| 桌面构图 | 上方导航与标题、中央礼盒、下方机关与四步进度 | 1504×1046 实现保持同一纵向结构并完整落在首屏 |
| 移动层级 | 顶栏、标题、礼盒、两枚大按钮、进度、隐私页脚 | 390px 实现保持相同顺序，允许自然滚动以守住 64px 触控高度 |
| 礼盒资产 | 朱红丝带、和纸花纹、黄铜包角与挂牌 | 1536×1024 的 3×2 本地图集首格复现同一礼盒，其他格承载后续层与盒心 |
| 字体与线条 | 编辑部大标题、等宽 HUD、细黄铜分隔线 | 本地系统中文 serif 与 monospace fallback，无外部字体请求 |
| 操作反馈 | 双按钮、金色焦点、虚线进度轨 | 生产按钮由 DOM 渲染，真实 focus-visible 使用双层金色描边 |
| 阶段变化 | 逐层换盒并保留统一工作台 | `data-art` 切换六格图集，note 只加纸片语义，不改变页面骨架 |
| 纸张质感 | 夜间礼物工坊、旧纸与硬边包装 | 图集承载材质，CSS 使用实线、虚线和硬边阴影，不依赖滤镜服务 |

### 文案与有意偏差

- 生产第一层保留概念的标题、副标题、指令、双按钮、四层进度与本地隐私承诺；
- 概念用整幅环境图表现台灯、文具和桌面，生产把环境收敛为可复用精灵图，避免每一层下载一张大背景；
- 概念按钮含蝴蝶结图标，生产使用纯文字，给键盘焦点和窄屏宽度留出稳定空间；
- 概念移动稿是 1846px 长画布，生产截图按真实 844px 视口截取，页脚在一次自然滚动后到达；
- 生产增加 intro 和每层 note Gate，概念只描绘第一层操作态；这些状态是惊喜节奏与 DOM 隐私所需。

偏差均服务于本地体积、真实交互、可访问性或窄屏触控；主构图、色板、礼盒材质、逐层进度和深夜工坊方向达到可签收忠实度。

## 6. 缺陷与沉淀

- [无效操作测试比较了两份等值状态的引用](../bugs/2026-07-17-nested-gift-reference-identity-test.md)
- [留言阶段仍把已打开的当前层计入剩余数](../bugs/2026-07-17-nested-gift-note-remaining-count.md)
- [从留言进入抽屉层时焦点退回页面主体](../bugs/2026-07-17-nested-gift-drawer-focus.md)
- [阶段门控的渐进惊喜：让状态拥有文案与焦点](../learn/2026-07-17-stage-gated-progressive-surprise.md)

## 7. 借鉴与来源复核

创意来自仓库原创创意池 S20。运行代码、状态机、布局、文案和测试均为原创，只使用套娃礼盒、逐层拆封、阶段留言这些通用机制；没有参考、复制、改写或引入特定开源项目。

视觉概念与六格礼盒图集由 OpenAI ImageGen 生成；所有运行文字、按钮、进度、焦点和状态均由代码原生渲染。完整声明见作品 [`README.md`](../experiences/surprises/nested-gift/README.md) 与 [`assets/ATTRIBUTION.md`](../experiences/surprises/nested-gift/assets/ATTRIBUTION.md)。若以后参考开源项目，必须补固定 URL、commit、许可证和实际借鉴边界。
