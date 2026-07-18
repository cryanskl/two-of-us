# 「纸上球局」实现与验收记录

## 1. 结论

「纸上球局」已作为第 20 个 A 级静态作品接入统一门户，补齐一类此前没有的轮流空间策略对抗：两个人在固定 8×10 点阵上画不可重复的无向线，落到旧点或边界可连续行动，进球或让自己在借力后无出口时结算胜负。

作品可直接双击 `index.html`，不需要安装依赖、启动服务、账号或公网。鼠标、触控、QWEADZXC、SVG Enter / Space、方向盘、进球、边界借力、困死、重赛、响应式、reduced motion 与真实 `file://` 均已验证。

本批提交：

- `9737310`：brainstorm、规格、桌面/移动概念、运行背景与来源声明；
- `75c6626`：修正规格中的困死可达性不变量；
- `f734170`：状态机、页面、配置、catalog、门户、测试及浏览器修复；
- 本文所在提交：实装截图、缺陷记录与学习沉淀。

## 2. 自动 Gate

### 2.1 作品纯逻辑

`node --test experiences/versus/paper-soccer/logic.test.js`：11 / 11 通过，覆盖：

- 固定球场、八方向、上下球门和无向边 key；
- 配置整份回退、去空白、深冻结与所有权隔离；
- 中心八方向、普通新点换手、旧点/边界借力；
- 外边线、越界、重复边、反向重复边与非法阶段拒绝；
- 正常进球、乌龙、借力后自困和胜局累计；
- 开球策略冻结上下文、异常/非法返回交替回退；
- rematch、resetSeries、畸形状态与原引用不变量。

### 2.2 整仓

- `npm test`：329 / 329 通过；
- `npm run verify`：28 个作品入口、1 个能力声明、资源与借鉴声明完整；
- `git diff --check`：通过；
- catalog Gate 确认 A 级入口、经典脚本、相对资源、无网络/Storage、无 `Math.random`；
- 生产 CSS 不含 gradient，页面不使用外部字体、远程脚本或远程图片。

仓库没有 `typecheck` 或 `build` script；本批适用 Gate 是独立逻辑测试、整仓测试和 repository verifier。

## 3. 真实浏览器完整实玩

先尝试内置 Browser/IAB，本次环境返回 `No browser is available`；随后使用 Playwright CLI headed Chromium，并以 `127.0.0.1:8769` 提供同目录静态页面。

### 3.1 输入与焦点

- intro 激活“把球放到中点”后进入 playing，生成 8 个合法 SVG 落点；
- 等待渲染帧后首个合法方向按钮获焦，标签为“左上，按 Q，到格点 4-5”；
- 鼠标点击 SVG 新点后轨迹加一、红方换蓝方，反馈为“落到新点，轮到蓝方。”；
- 聚焦 SVG 合法点后 Enter 与 Space 各自画出一条线，焦点跟随到下一合法 SVG 目标；
- 点击方向盘 D 后使用同一 reducer 画线，焦点保留在仍合法的 D 按钮；
- 根 SVG 使用 group 语义后，可访问树真实暴露内部落点按钮。

### 3.2 进球、借力、困死与重赛

键盘直线进球路径：开始后连续按 W 六次。

- 前四步普通换手；
- 第五步落到上边界，红方继续，回合显示第 5 回合，反馈为“借到旧点或边线，红方继续走 · 连续 1 次。”；
- 第六步进入上方球门，红方获胜，比分 1:0，焦点落到“再踢一场”；
- 再踢一场后蓝方开球，比分仍为 1:0，轨迹归零、8 个合法目标恢复。

键盘困死路径：Q → Q → Q → W → Q。

- 红方最后落到左上角边界并触发借力；
- 该角点除来路外没有合法出口，红方自困；
- 页面显示“红方借力后没有出口，蓝方赢下这一局。”，比分 0:1，终局标题为“没有出口”。

正常 HTTP 会话控制台 0 error / 0 warning。请求只包含同源 HTML、CSS、`logic.js`、`config.js`、`app.js` 与本地 `tactics-desk.png`。

根门户的内置目录同时显示“纸上球局”卡片、对抗 / A 级 / 已安装标签、2 人对抗 / 单设备轮流说明，以及指向 `experiences/versus/paper-soccer/index.html` 的“打开体验”链接。

### 3.3 `file://` 双击路径

Playwright CLI 命令层主动阻止 `file:` 导航，因此另启 headless Google Chrome 直接加载：

`file:///Users/zenith/Desktop/two-of-us/experiences/versus/paper-soccer/index.html`

通过 Chrome DevTools Protocol 实测：

- URL 保持 `file://`，页面处于 intro，标题正确；
- 三个脚本都解析为同目录 `file://` URL，`PAPER_SOCCER_LOGIC` 正常存在；
- 1536×1024 本地背景加载成功，SVG 生成 99 个场内格点；
- 点击开始后进入 playing，生成 8 个合法目标，首个方向按钮获焦；
- 派发 W 后轨迹为 1、当前玩家为蓝方、反馈为“落到新点，轮到蓝方。”；
- CDP 没有页面异常或加载失败分支。

因此“双击作品 HTML 即可运行”由真实 Chrome 的 `file://` 会话证明，不依赖静态服务器。

## 4. 响应式、触控与可访问性

| 视口 | 结果 |
| --- | --- |
| 1504×1046 playing | `scrollWidth = 1504`、`scrollHeight = 1046`；棋盘约 715×892.75px，完整球门、状态、比分、方向盘和页脚均在首屏 |
| 390×844 playing | `scrollWidth = 390`、页面高 1271px；棋盘 366×456.5px，方向按钮约 106.7×64px，按规格自然纵向滚动 |
| 320×760 playing | `scrollWidth = 320`、页面高 1205px；棋盘 304px 宽，最小按钮边长 60px，页脚可滚动到视口内 |

补充验证：

- 合法目标有方向、1-based 格点坐标和借力提示，不只依赖视觉位置；
- 红方使用实线，蓝方同时使用蓝色与虚线纹理；
- focus-visible 在米白按钮与深绿 SVG 环境中均可见；
- live region 播报实际移动、续走和终局，不重复整张棋盘；
- `prefers-reduced-motion: reduce` 下目标、球和按钮 transition duration 均为 0.001s；
- 游戏规则不等待动画事件，减少动画不会改变回合结算。

截图：

- [1504×1046 桌面对局](assets/paper-soccer/implementation-desktop-1504x1046.png)
- [390×844 移动视口](assets/paper-soccer/implementation-mobile-390x844.png)
- [390px 移动完整页面](assets/paper-soccer/implementation-mobile-390-full.png)

## 5. 视觉忠实度账本

概念：[1504×1046 桌面稿](assets/paper-soccer/concept-desktop.png)、[839×1875 移动稿](assets/paper-soccer/concept-mobile.png)。最终 QA 在同一检查中原生查看概念与实现截图。

| 比较点 | 概念证据 | 实现证据与处理 |
| --- | --- | --- |
| 色板 | 深森林绿桌毡、暖米白方格纸、石墨、番茄红、钴蓝、黄铜 | CSS 固定 token 与 ImageGen 背景保持同色系，全页无渐变 |
| 桌面构图 | 左侧纵向球场，右侧标题、回合、比分与方向盘 | 1504×1046 实现保留左右主结构；顶栏横跨页面，让返回与回合在所有阶段稳定可见 |
| 球场几何 | 8×10 点阵、上下中央 2×1 球门、纸笔轨迹 | SVG 按代码精确生成 9×11 点、球门口、网线与八方向落点；比例不依赖背景图片 |
| 轨迹辨识 | 红蓝铅笔线、当前球和环形候选点 | 红实线、蓝虚线、纸球与虚线目标同时提供颜色和纹理差异 |
| 控制区 | 3×3 纸键盘，中央为空 | 生产方向盘保留 QWE/A D/ZXC 与方向箭头，禁用方向有明确视觉和原生 disabled |
| 桌面材质 | 旧校刊、夹具、铅笔、橡皮和木尺 | 无字 `tactics-desk.png` 只承载桌毡与边缘文具，运行文字全部由 DOM/SVG 生成 |
| 移动层级 | 导航、标题、回合、球场、比分、方向盘、页脚 | 390px 完整页保持相同顺序，真实视口自然滚动以守住 64px 触控高度 |
| 字体与框线 | 编辑部中文大标题、等宽 HUD、硬边纸张和细黄铜线 | 系统 serif/monospace fallback、直角双线和硬偏移阴影，无远程字体或玻璃卡片 |

### 文案与有意偏差

- 概念球场绘有装饰性的历史路线与坐标；生产只显示本局真实轨迹，避免假路线误导合法移动；
- 概念桌面把回合作为右栏独立块，生产合入横向顶栏，从而在 intro、playing、complete 和窄屏保持单一信息位置；
- 概念移动稿是 1875px 长画布；生产按真实 844px 视口截屏，并另存 1271px 完整页证明比分、方向盘和页脚均可达；
- 生产增加事件反馈、焦点描边、目标坐标和结果动作，这些是可访问与可实玩的必要状态，不是概念装饰；
- 概念中球像写实足球，生产使用代码生成的纸球符号，避免额外素材和许可证边界。

偏差服务于规则真实性、本地体积、键盘可达与响应式；主构图、色板、球场比例、纸笔材质和九宫格控制达到可签收忠实度。

## 6. 缺陷与沉淀

- [整张交互 SVG 的图片角色隐藏了内部合法落点](../bugs/2026-07-18-paper-soccer-interactive-svg-role.md)
- [桌面首屏高度预算固定多出 2px](../bugs/2026-07-18-paper-soccer-desktop-height-budget.md)
- [普通换手反馈在玩家名之前多出空格](../bugs/2026-07-18-paper-soccer-turn-copy-spacing.md)
- [规格允许了图结构上不可能出现的普通换手困死](../bugs/2026-07-18-paper-soccer-impossible-switch-trap.md)
- [落笔前图状态：实现无向路径、借力与困死](../learn/2026-07-18-pre-move-graph-state-and-bounce.md)

## 7. 借鉴与来源复核

本作使用传统 Paper Soccer / Paper Football 的通用规则；规则只依据 [paper.soccer](https://paper.soccer/rules/) 与 [paper-football.com](https://www.paper-football.com/) 核验，没有复制其文案、代码、商标或素材。

为确认可许可生态，只复核了两个 MIT 仓库的元数据、许可证和固定 commit：`jdermont/YaPaperSoccer@756758b1d7f21513d74b7a1a653421dc32ad3c50` 与 `MateuszJanda/paper-soccer@dcaeb4e25db9e9279bd0680b852b1e6a24a18f37`。没有读取、运行、复制、改写或打包其源码与资产，因此当前为零开源代码、零开源素材借用。

状态机、图结构、SVG 球场、中文文案、键盘映射、页面布局和测试均为仓库原创。桌毡背景与两张概念由 OpenAI ImageGen 生成。完整借鉴声明见作品 [`README.md`](../experiences/versus/paper-soccer/README.md) 与 [`assets/ATTRIBUTION.md`](../experiences/versus/paper-soccer/assets/ATTRIBUTION.md)。未来若实际借用开源实现，必须补文件级来源、许可证正文与修改说明。
