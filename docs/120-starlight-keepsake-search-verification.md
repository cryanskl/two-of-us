# “把夜晚照成我们”验收记录

- 日期：2026-07-19
- 作品：[`../experiences/surprises/starlight-keepsake-search/`](../experiences/surprises/starlight-keepsake-search/)
- 等级：A，本地经典脚本；零运行依赖、账号、网络、存储和音频
- 玩法：移动光心，在五处固定纪念物上连续停留 14 个整数 tick；已发现内容永久留下，五件全部找到后整幕变暖并出现完整信

## 1. 结论

逻辑、五目标生产路径、目录接入、本地静态合同、键盘与直接点亮等价入口、响应式实玩、阶段 DOM 隔离、来源声明和视觉对照通过验收。

- 153 项逻辑测试覆盖配置清洗、整数目标地图、连续停留、目标切换、Pointer generation、键盘接管、暂停/恢复、外部状态、公开 view、direct、重开与确定性重放；
- golden replay 只含 21 条公开 action，依次发现 `k1` 至 `k5`，第五件达到第 14 tick 的同一 action 立即以 `completionReason = searched` 完成；
- 全仓 1161 项测试、目录 67 项测试及 `npm run verify` 均通过，门户登记为第 45 个作品、第 37 个独立无第三方运行依赖 A 级样板；
- 真实浏览器在 1280×800、390×844、320×700 完成首屏、五目标鼠标停留、direct、暂停/恢复、重开与门户入口实玩；
- 本轮同屏检查三张冻结概念稿和三个真实实现状态，核心双列/单列构图、夜桌、暗幕、琥珀光、进度、完成信与隐私提示一致；
- 两个布局缺陷已修复并写入 `bugs/`，确定性连续停留做法已写入 `learn/`；
- ATTRIBUTION 固定四个 MIT 工程、五份平台规范、两个无许可证排除项目和 ImageGen 素材来源，并明确零源码/素材复制边界。

Codex 内置浏览器的 URL 安全策略拒绝 `file://` 导航，因此无法在该工具中保存原生双击路径截图；没有换另一种自动化表面绕过。A 级能力由经典脚本、按序相对资源、无网络/存储 API 的目录 Gate 固定，行为实玩在同一文件集的本地 HTTP 服务完成。这个限制是自动化证据边界，不是产品 Bug。

## 2. 自动检查

| 检查 | 结果 |
| --- | --- |
| `node --check` 三个生产 JavaScript | PASS |
| `node --test experiences/surprises/starlight-keepsake-search/logic.test.js` | 153 / 153 PASS |
| `node --test shared/runtime/catalog.test.js` | 67 / 67 PASS |
| `npm test` | 1161 / 1161 PASS |
| `npm run verify` | 45 个作品入口、1 个能力声明 PASS |
| `git diff --check` | PASS |

目录 Gate 额外固定：

- HTML 使用 `config.js → logic.js → app.js` 经典脚本与相对图片/SVG，不含 module、远程 `src/href`、`fetch`、XHR、WebSocket、Worker、存储、Cookie、剪贴板、媒体、传感器或共享运行时代码；
- 完成规则不读取图片或 Canvas 像素，不使用随机数；1000×620 世界、五个中心/半径、14 tick、每 action 最多 5 tick 都由纯 reducer 冻结；
- 初始 HTML 与门户 fallback 不含五件名称、短句或完整信；每件发现后才创建对应 DOM，完成后才创建信与重开按钮；
- Pointer 的 capture/cancel/lost、键盘接管、页面隐藏、失焦、显式暂停与长帧都有明确收束路径；
- 背景或任一 Canvas context 失败时，搜索面可降级，但真实“直接点亮”按钮仍然可达；reduced motion 与 forced colors 使用独立 CSS 路径。

## 3. 连续停留与确定性

逻辑世界固定为 1000×620。光心第一次进入未发现目标只建立当前目标，随后每个 50ms tick 递增一次；13 tick 仍未发现，第 14 tick 恰好发现。离开目标、换目标、暂停、隐藏、失焦或超过 250ms 的帧间隔会清掉当前连续段，同一目标半径内的小幅移动则保留累计。

五个冻结目标为：

```text
k1 (180,100) r64   k2 (800,105) r82
k3 (295,455) r70   k4 (685,455) r70
k5 (948,360) r52
```

浏览器层的 rAF accumulator 只把短帧转换为整数 `TICK`，每个 action 最多 5 tick；纯 reducer 不接收任意毫秒。输入会话使用单调 generation，迟到的 MOVE/TICK/END 无法推进新会话。

golden 路径固定摘要为：

```text
public actions: 21
discovery order: k1, k2, k3, k4, k5
focus ticks per target: 14
found / revealed at completion: 5 / 5
phase / reason: complete / searched
```

同一日志深克隆后重放得到深相等终态；direct 从任意部分进度进入同一可见完成内容，但不会伪造真实 `foundIds`，只通过 `revealedItems` 提供等价揭晓。

## 4. 浏览器实玩

| 路径 | 验收结果 |
| --- | --- |
| 1280×800 首屏 | 页面高 800；舞台顶边约 110.88px；标题单行、两个操作、0/5 与隐私说明可见 |
| 桌面五目标流程 | 提起灯后在五个映射坐标各连续停留约 850ms，依次到 5/5 并出现完整信；完成前后舞台顶边均约 110.88px |
| 390×844 首屏 | 无横向溢出；完整舞台底边约 512px，两个操作、进度与隐私说明底边约 688px 均在首屏 |
| 320×700 首屏 | `scrollWidth = clientWidth = 320`；舞台约 306×189；纵排按钮约 298×53；隐私说明底边约 567px |
| 暂停/恢复 | searching 可暂停，累计冻结；继续后回到 searching，光心可重新接管 |
| 直接点亮 | 从 1/5 部分状态进入完整信与五件可见内容；真实 found 仍保持部分历史 |
| 重开 | 删除发现与完成 DOM，进度回到 0/5，光心回中央并重新聚焦起点 |
| 门户 | 重启本地运行时后显示 45 个体验；“把夜晚照成我们”卡片唯一，点击进入正确作品 URL |
| 控制台 | 作品完整流程与门户均无 console error / warning |

首次门户复验仍显示 44 项，是运行时在启动时读取目录的既有行为；重启同一 `npm start` 服务后正确显示 45 项，不需要修改产品代码。

## 5. 视觉 fidelity 与文案差异

同一 QA 轮检查：

- [`../design/starlight-keepsake-search/concept-desktop-searching.png`](../design/starlight-keepsake-search/concept-desktop-searching.png)，1568×1003；
- [`../design/starlight-keepsake-search/concept-mobile-focusing.png`](../design/starlight-keepsake-search/concept-mobile-focusing.png)，852×1846；
- [`../design/starlight-keepsake-search/concept-desktop-complete.png`](../design/starlight-keepsake-search/concept-desktop-complete.png)，1586×992；
- 三个对应真实状态取自 1280×800 桌面开场、390×844 移动开场和 1280×800 桌面完成；临时 JPEG 比对后清理，不进入仓库。

| 对照项 | 结果 | 证据与偏离 |
| --- | --- | --- |
| 深靛/胡桃木/羊皮纸/琥珀 | PASS | 本地背景、暗幕、按钮、状态与信纸延续同一低饱和暖夜色；实机正文提高对比度 |
| 桌面窄左栏 + 大夜桌 | PASS | 28/72 双列、完整 1000:620 舞台、细边框和持续隐私尾注均保留 |
| 移动单列 | PASS / INTENTIONAL | 标题→舞台→操作→进度顺序保留；实机按 390×844 压缩到可玩首屏，不照搬 1846px 长概念画布 |
| 光圈与连续停留 | PASS / INTENTIONAL | 实机 Canvas 光圈和整数进度环实时绘制；概念图的 64% 只是状态示意，不被 CSS 动画当作规则 |
| 五件目标 | PASS | 车票、双杯、照片、钥匙、窗边星光与冻结坐标一致；双杯只算一个目标 |
| 完成升温与五点 | PASS / INTENTIONAL | 撤暗幕后整体变暖；实机用 1–5 编号标记增强辨认，概念使用纯光点 |
| 完成信 | PASS / INTENTIONAL | 羊皮纸信保留在左栏而非 modal；实机正文区域可滚动，以守住 800px 舞台稳定性和重开可达性 |
| 文案 | PASS / INTENTIONAL | 生产标题与语气一致；纪念物短句、完成标题和正文以 `config.js` 为真源，不复制概念票面或示例信 |
| 隐私提示 | PASS | “本地 · 不保存”在桌面、移动和完成态持续可见 |
| 装饰边界 | PASS | 没有概念外的奖杯、彩屑、分数、倒计时、分享、保存或网络入口 |

## 6. 可访问、隐私与降级边界

- 鼠标悬停、触摸/笔 capture、方向键与 Home 共享同一 reducer；所有按钮至少 48px，并有 `:focus-visible`；
- 稳定 `aria-live` 只播报阶段、进入/离开目标、单件发现与完成，不按坐标或每 tick 刷屏；
- “直接点亮”是不依赖视觉搜索、精细拖动或 Canvas 的等价入口；
- 页面不保存、上传、下载、复制或分享路径与发现历史；刷新/重开丢弃内存状态；`config.js` 明文是渐进揭晓，不描述为加密；
- reduced motion、forced colors、背景缺失和 Canvas context 失败均有明确代码路径与静态 Gate；本轮未动态模拟这些媒体条件或 context 失败，因此只记为 CODE/STATIC PASS，不宣称截图通过；
- DPR/resize 只从公开 view 重绘，不派发规则 action；本轮没有分别保存 DPR 1/2/3 截图，像素密度适配按源码合同验收。

## 7. 借鉴与来源声明

完整声明见 [`../experiences/surprises/starlight-keepsake-search/ATTRIBUTION.md`](../experiences/surprises/starlight-keepsake-search/ATTRIBUTION.md)。固定参考只用于公开技术思想与能力边界，不是运行依赖：

- PixiJS `2c5818b0e75b835ba5980844136b10cbdc3982a9`、PixiJS Filters `e9d1ca987864f121680bb0d7e9612c05b37748de`、Konva `ae5bbf7181d0201466045afbbab2297c8ffa7b90`、Phaser `7304c64effaa4a1be5b8bf02ab13143a76108a19` 均为 MIT；
- Pointer Events、WHATWG HTML、Page Visibility、WCAG 与 CSSWG Drafts 均固定到声明里的具体 commit；
- CodeMyUI Reveal Hidden Text 与 jaredstanley 的 globalCompositeOperation Gist 没有清晰许可证，只列为明确排除项；
- 三张概念稿与生产背景由 OpenAI 内置 ImageGen 于 2026-07-19 生成，没有输入第三方图片、截图、商标或受保护角色。

没有复制、移植、翻译、打包或依赖上述工程与规范的源码、类、函数、API、参数、测试、示例、图片、GIF、字体、页面结构、文案或构建产物。连续停留玩法、整数规则、页面、文案和测试均为本仓库独立实现。

## 8. Bugs 与 Learn

本批记录并闭环：

- [发现列表增长推动舞台并破坏后续命中](../bugs/2026-07-19-starlight-search-stage-shift.md)：桌面固定 100vh，让旁栏滚动且舞台矩形在整局保持稳定；
- [桌面标题把“们”挤成孤字](../bugs/2026-07-19-starlight-search-title-orphan.md)：收敛字号并冻结短标题单行预算。

本批新增沉淀：

- [确定性连续停留：整数 tick、生命周期断点与稳定舞台](../learn/2026-07-19-deterministic-dwell-discovery.md)

浏览器 `file://` 安全策略只在本报告记录为自动化环境限制，不作为产品 Bug 写入 `bugs/`。

## 9. 独立提交链

```text
04a774a docs: reconcile implemented idea count
9220bdf docs: research starlight keepsake search
6bc8d34 docs: specify starlight keepsake search
c25c905 docs: plan starlight keepsake search
9e1dd72 design: freeze starlight keepsake search
e7a75f7 feat: add starlight keepsake search logic
2f6d42c feat: build starlight keepsake search
d4742c5 feat: register starlight keepsake search
2cae015 docs: record starlight search layout fixes
bd412ed docs: explain deterministic dwell discovery
```

本验收报告与文档索引另作一个提交，继续遵守“一部分完成一次提交”。
