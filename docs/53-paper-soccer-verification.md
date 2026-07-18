# 「纸上球局」实现与验收记录

## 1. 结论

「纸上球局」已作为第 20 个 A 级纯静态作品接入统一门户。两个人在同一设备轮流沿八方向画不可重复线；普通新点换手，旧点或边界借力续走，进入球门或在借力后困死即结算本局。

作品可以直接双击 `index.html`，不需要安装依赖、账号、服务或公网。鼠标/触控、SVG Enter / Space、QWEADZXC、方向盘、进球、乌龙逻辑、边界借力、角落困死、重赛、响应式、reduced motion 与真实 `file://` 均已验证。

本批提交：

- `9737310`：规格、桌面/移动概念、本地桌毡资产与来源声明；
- `75c6626`：纠正规格中的困死图不变量；
- `f734170`：图状态机、SVG 页面、配置、catalog、门户、测试及浏览器发现的修复；
- `2d157bc`：实现截图、缺陷记录、初版验收报告与学习沉淀；
- `312141c`：精炼不可重走图的通用建模经验；
- 本文所在提交：补充门户回退、清空胜局、可访问性、视觉偏差和固定来源链接的实测账本。

## 2. 自动 Gate

### 2.1 作品纯逻辑

`node --test experiences/versus/paper-soccer/logic.test.js`：11 / 11 通过，覆盖：

- 固定 8×10 球场、球门节点、八方向和无向 edge key；
- 配置整份回退、去空白、状态深冻结与所有权隔离；
- 中心八方向、普通新点换手和 revision；
- 重复边、反向重复、外边线、越界与非法阶段拒绝；
- 落笔前旧点判断、边界借力与连续行动；
- 三条合法球门口入网线、上下球门与乌龙；
- 角点借力后的自困；
- 冻结的开球策略上下文、异常/非法返回回退；
- 重赛保留胜局、重置清空系列与畸形状态安全回退。

### 2.2 整仓

- `npm test`：329 / 329 通过；
- `npm run verify`：28 个作品入口、1 个能力声明、资源与借鉴声明完整；
- `git diff --check`：通过；
- catalog Gate 确认 A 级入口、经典脚本、相对本地资源、无网络与无持久化；
- 生产 CSS 不含 gradient，运行脚本不调用网络、Storage、设备 API 或 `Math.random`；
- `package.json` 没有单独的 build/typecheck 脚本，本作是无需编译的经典脚本页面。

## 3. 真实浏览器完整实玩

先连接内置 Browser/IAB，本次环境返回 `No browser is available`，因此使用 Playwright CLI 的 headed Chromium 作为 fallback；同目录静态服务为 `127.0.0.1:8769`。

一次浏览器检查覆盖以下路径：

1. 门户出现“纸上球局”A 级已安装卡片，点击“打开体验”进入作品 intro；
2. 开球后生成 8 个 SVG 合法落点与 8 个方向按钮，首个合法方向在下一动画帧获得焦点；
3. 鼠标点击 SVG 新点后红方换蓝方，反向来路禁用；
4. SVG 合法点分别使用 Enter 和 Space 推进，焦点移动到新一批合法点；
5. 方向按钮点击推进，焦点优先保留在刚使用且仍合法的方向；
6. 连按 `W` 五次到上边界，第五步显示“红方继续 · 连续 1 次”，第 5 回合仍由红方行动；
7. 第六次 `W` 进入上方球门，红方 1:0，终局聚焦“再踢一场”；
8. 重赛保留 1:0、清空 6 条轨迹、默认轮换为蓝方开球并恢复 8 个目标；
9. 重新加载后执行 `Q Q Q W Q`，红方在左上角借力后无出口，蓝方 0:1 获胜；
10. 结果页明确区分“球进了”和“没有出口”，重赛与清空胜局都可键盘到达。

作品直达页面的独立会话控制台为 0 error / 0 warning；只请求同源 HTML、CSS、`logic.js`、`config.js`、`app.js` 与 `tactics-desk.png`。用普通静态服务器打开根门户时，门户会先探测不存在的 `/api/*` 再回退到内置目录，该 404 属于门户的服务能力探测，不来自本作品；作品直达页没有外部或失败请求。

### 3.1 `file://` 双击路径

Playwright CLI 的命令层主动阻止 `file:` 导航，因此另启 headless Google Chrome 直接加载：

`file:///Users/zenith/Desktop/two-of-us/experiences/versus/paper-soccer/index.html`

通过 Chrome DevTools Protocol 实测：

- 页面 URL、标题与 intro 正常；
- `logic.js`、`config.js`、`app.js` 都解析为同目录 `file://` URL；
- 背景解析为本地 `assets/tactics-desk.png` 且图片实际加载成功；
- 99 个场内格点和 `PAPER_SOCCER_LOGIC` 均存在；
- 点击开球后进入 playing、生成 8 个合法目标并聚焦首个方向；
- 分发 `W` 后产生 1 条轨迹、切换到蓝方并显示“落到新点，轮到蓝方。”；
- CDP 表达式无 exception，页面级 Runtime / Log 事件为 0。

因此“双击作品 HTML 即可运行”由真实 Chrome 的 `file://` 会话确认。

## 4. 响应式、触控与可访问性

| 视口 | 结果 |
| --- | --- |
| 1504×1046 playing | `scrollWidth = 1504`、`scrollHeight = 1046`；棋盘 715×892.75px，方向按钮约 131×68px，完整控制与页脚都在首屏 |
| 390×844 playing | `scrollWidth = 390`、页面高 1271px；棋盘 366×456.5px，方向按钮约 107×64px，单列自然滚动 |
| 320×760 playing | `scrollWidth = 320`、页面高 1205px；棋盘 304px 宽，最小按钮边长 60px，页脚滚动后完整进入视口 |

补充验证：

- SVG 外层使用带标题/描述的 `role="group"`，8 个合法点各自暴露为按钮；
- 合法点同时支持指针、Enter 和 Space，方向按钮带方向、快捷键与目标坐标标签；
- 红方轨迹为实线，蓝方轨迹为虚线，不只依赖颜色；
- 当前玩家、借力、换手、胜者和原因都有可见文字与 live region；
- `prefers-reduced-motion` 下目标、球和方向按钮的 transition duration 都为 0.001s，规则不依赖动画；
- 所有运行文字、球场、球门、轨迹、球和目标均由 HTML/CSS/SVG 原生生成，不烘焙进背景图。

截图：

- [1504×1046 桌面对局](assets/paper-soccer/implementation-desktop-1504x1046.png)
- [390×844 移动视口](assets/paper-soccer/implementation-mobile-390x844.png)
- [390px 移动完整页面](assets/paper-soccer/implementation-mobile-390-full.png)

## 5. 视觉忠实度账本

概念：[1504×1046 桌面稿](assets/paper-soccer/concept-desktop.png)、[839×1875 移动稿](assets/paper-soccer/concept-mobile.png)。最终 QA 在同一次检查中原生查看两张概念和三张 Chromium 实现截图。

| 比较点 | 概念证据 | 实现证据与处理 |
| --- | --- | --- |
| 色板 | 深森林绿桌毡、暖象牙纸、石墨、番茄红、钴蓝与黄铜 | 固定 CSS token 与本地桌毡资产保持同一色系；无 CSS 渐变 |
| 桌面构图 | 左侧纵向球场，右侧标题、状态、比分与 3×3 方向盘 | 1504×1046 实现保留同一左右结构，控制与页脚完整落在首屏 |
| 移动层级 | 导航、标题、回合、规则、球场、比分、方向盘、页脚 | 390px 完整截图顺序一致；允许自然滚动以守住 60–64px 触控尺寸 |
| 球场几何 | 8×10 点阵、上下中央 2×1 球门、中心球与红蓝轨迹 | SVG 由规则常量生成 9×11 共 99 个格点，球门和轨迹与 reducer 共用坐标 |
| 桌面材质 | 旧校刊战术本、木尺、铅笔、卷笔刀与硬边纸张 | 同一无字桌毡资产提供边缘文具；交互内容保持代码原生 |
| 字体与线条 | 编辑部大标题、等宽 HUD、黄铜细框与铅笔线 | 本机 serif / monospace fallback、双线纸框和硬边阴影，无外部字体请求 |
| 操作反馈 | 合法落点光圈、当前球、九宫格按键和焦点框 | 生产使用红/蓝目标、球针脚、disabled 明暗和双层 focus-visible 描边 |
| 对局进展 | 概念展示较长红蓝棋路 | 实现截图保留真实三步可继续局面，避免为截图伪造 reducer 状态 |

### 文案与有意偏差

- 生产保留概念标题、副标题、攻向、借力规则、会话胜局、方向键与本地隐私承诺；
- 桌面概念把导航和回合拆成右侧两行，生产合并为通栏顶栏，给两列内容留出稳定高度；
- 桌面概念标题为朱红，移动概念为石墨；生产统一用石墨标题与朱红下划线，把红蓝留给玩家身份；
- 概念棋盘带纸夹板和手写坐标，生产去掉非规则坐标文字，用 SVG 的 aria-label 提供精确格点；
- 移动概念是 1875px 设计长图，生产完整页为 1271px；信息顺序不变，但减少装饰留白以缩短双人轮流操作距离；
- 生产增加明确事件栏、乌龙/困死结果、重赛和清空胜局，这些是完整状态机而非单帧概念所需。

偏差均服务于真实规则、可访问性、首屏高度或轮流操作效率；主构图、色板、点阵球场、纸本文具材质和方向控制达到可签收忠实度。

## 6. 缺陷与沉淀

- [规格把普通换手点误写成可能立即困死](../bugs/2026-07-18-paper-soccer-impossible-switch-trap.md)
- [整张 SVG 的图片角色隐藏了合法落点按钮](../bugs/2026-07-18-paper-soccer-interactive-svg-role.md)
- [桌面首屏高度预算常量多算两像素](../bugs/2026-07-18-paper-soccer-desktop-height-budget.md)
- [换手反馈在玩家名之前多出空格](../bugs/2026-07-18-paper-soccer-turn-copy-spacing.md)
- [落笔前图状态：无向边、借力与困死的统一判定](../learn/2026-07-18-pre-move-graph-state-and-bounce.md)

## 7. 借鉴与来源复核

规则使用传统 Paper Soccer / Paper Football 的通用机制。2026-07-18 复核 [Paper Soccer Rules](https://paper.soccer/rules/) 与 [Paper Football](https://www.paper-football.com/) 的球场、不可重复线、反弹与终局规则。

为核验开源生态，只检查下列仓库的元数据、许可证和固定 commit，没有读取、复制、改写或运行其源码与素材：

- [jdermont/YaPaperSoccer @ `756758b1d7f21513d74b7a1a653421dc32ad3c50`](https://github.com/jdermont/YaPaperSoccer/tree/756758b1d7f21513d74b7a1a653421dc32ad3c50)，MIT；
- [MateuszJanda/paper-soccer @ `dcaeb4e25db9e9279bd0680b852b1e6a24a18f37`](https://github.com/MateuszJanda/paper-soccer/tree/dcaeb4e25db9e9279bd0680b852b1e6a24a18f37)，MIT。

本作的 JavaScript 状态机、图结构、SVG 渲染、视觉布局、中文文案和测试均为仓库原创。视觉概念与无字桌毡背景由 OpenAI ImageGen 生成；完整借鉴边界见作品 [`README.md`](../experiences/versus/paper-soccer/README.md) 与 [`assets/ATTRIBUTION.md`](../experiences/versus/paper-soccer/assets/ATTRIBUTION.md)。若以后实际借用开源实现，必须补文件级边界、许可证正文要求与再分发声明。
