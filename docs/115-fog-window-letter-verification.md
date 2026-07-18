# “在雾上，写给你”验收记录

- 日期：2026-07-19
- 作品：[`../experiences/surprises/fog-window-letter/`](../experiences/surprises/fog-window-letter/)
- 等级：A，本地经典脚本；零运行依赖、账号、网络、存储和音频
- 玩法：先自由写一遍，再沿自己的轨迹找回至少五分之四的确定性锚点，最后在窗内打开一封信

## 1. 结论

逻辑、双阶段生产路径、目录接入、本地静态合同、键盘等价入口、响应式实玩、完成态 DOM 隔离、来源声明和视觉对照通过验收。

- 173 项逻辑测试覆盖输入 Gate、整数锚点、线段命中、Pointer generation、暂停/恢复、外部状态、配置清洗、阶段 DOM 摘要与确定性重放；
- golden replay 只含 79 条公开 action：第一遍长度 2000，生成 64 个锚点，第二遍命中完成所需的 52 个锚点，以单笔、generation 2、`completionReason = traced` 完成；
- 全仓 1006 项测试、目录 65 项测试及 `npm run verify` 均通过，门户登记为第 44 个作品、第 36 个独立无第三方运行依赖 A 级样板；
- 真实浏览器在 1280×800、390×844、320×700 完成首屏、书写、确认、描回、直接打开、暂停恢复、重开、焦点迁移与门户入口实玩；
- 本轮同屏检查三张冻结概念稿和三个真实实现状态，核心色彩、雾窗舞台、控制带、移动进度、完成信纸、字体层级与隐私提示一致；
- 三个布局/焦点缺陷已修复并写入 `bugs/`，双遍轨迹的可复用做法已写入 `learn/`；
- ATTRIBUTION 固定四个 MIT 工程参考、六份平台规范、两个无许可证排除项目和 ImageGen 素材来源，并明确零源码/素材复制边界。

Codex 内置浏览器的 URL 安全策略拒绝 `file://` 导航，因此无法在该工具中保存原生双击路径截图；没有换另一种自动化表面绕过。A 级能力由经典脚本、相对资源、无网络 API 的目录 Gate 固定，行为实玩在同一文件集的本地 HTTP 服务完成。这个限制是自动化证据边界，不是产品 Bug。

## 2. 自动检查

| 检查 | 结果 |
| --- | --- |
| `node --check` 三个生产 JavaScript | PASS |
| `node --test experiences/surprises/fog-window-letter/logic.test.js` | 173 / 173 PASS |
| `node --test shared/runtime/catalog.test.js` | 65 / 65 PASS |
| `npm test` | 1006 / 1006 PASS |
| `npm run verify` | 44 个作品入口、1 个能力声明 PASS |
| `git diff --check` | PASS |

目录 Gate 额外固定：

- HTML 使用按序经典脚本与相对资源，不含 module、远程 `src/href`、`fetch`、XHR、WebSocket、Worker、存储、剪贴板、分享、下载、相机、传感器或媒体 API；
- 运行态只有本地生成的背景 JPG 与本项目 SVG favicon，背景失败时 CSS 深蓝底仍保留完整界面；
- Canvas 不是完成真相，纯 reducer 保存整数笔迹、锚点和命中集合；context 失败会停用手写面但保留原生“直接打开”；
- 完成前不创建信件标题、正文、署名或重开按钮；重开后再次删除，配置内容只通过 `textContent` 进入 DOM；
- Pointer 的 `up/cancel/lostpointercapture` 按 pointerId 与单调 generation 收束，blur、hidden、Escape 与超过 250ms 的长帧会暂停。

## 3. 双遍同轨迹与确定性

第一遍以 1000×620 整数坐标保存最多 8 笔、每笔 160 点、总计 480 点；小于 12 单位的采样间隔会被忽略。进入描回前必须同时满足 12 点、总长 720、宽 220、高 140。每 32 单位从用户原笔迹生成锚点，最多 160 个。

第二遍不比较像素、不读透明面积，也不要求复制某个预设图案。每条新轨迹线段与半径 46 的闭圆锚点做整数命中；命中数达到 `ceil(anchorCount × 4 / 5)` 即完成。命中集合单调增长，暂停和换笔不会清空，旧 generation 无法结束新会话。

golden 路径的固定摘要为：

```text
public actions: 79
draw length: 2000
anchors: 64
required / hit at completion: 52 / 52
trace strokes: 1
last generation: 2
phase / reason: complete / traced
```

同一日志深克隆后重放得到深相等冻结状态；每一步都通过外部状态断言。直接打开使用独立的 `direct` 完成原因，不伪造笔迹或命中数。

## 4. 浏览器实玩

| 路径 | 验收结果 |
| --- | --- |
| 1280×800 首屏 | 页面高 800；体验卡 top 122、bottom 775；雾窗 760×470；两个 48px 操作均在首屏 |
| 390×844 首屏/描回 | 无横向溢出；280px 雾窗、进度、提示与双操作可见；真实路径显示原线、清除线和已命中锚点 |
| 320×700 首屏/ready | 无横向溢出；确认按钮 top 526、bottom 574，控制区 bottom 655；焦点进入确认操作 |
| 桌面完整流程 | 开始 → 有效自由笔迹 → ready → 确认 → 沿原线描回 → 81% 完成；焦点移到完成标题 |
| 直接打开 | 不手写即可进入相同信件内容，完成原因保持 `direct`，焦点移到“窗外亮了” |
| 重开 | 完成 DOM 被删除，状态回到 intro，焦点回到开始按钮 |
| 移动完成态 | 390×844 与 320×700 的信纸正文、署名及“再写一次”均在雾窗裁切区内可滚动/可见 |
| 暂停恢复 | Escape 进入 paused 并聚焦阶段标题；继续后回到 writing，焦点回到交互面 |
| 控制台与门户 | 作品页和根门户均无 console error/warning；门户可找到“在雾上，写给你” |

## 5. 视觉 fidelity 与文案差异

同一 QA 轮以原始分辨率检查：

- [`../design/fog-window-letter/concept-desktop-writing.png`](../design/fog-window-letter/concept-desktop-writing.png)，1536×1024；
- [`../design/fog-window-letter/concept-mobile-tracing.png`](../design/fog-window-letter/concept-mobile-tracing.png)，853×1844；
- [`../design/fog-window-letter/concept-desktop-complete.png`](../design/fog-window-letter/concept-desktop-complete.png)，1536×1024；
- 三个对应真实状态分别取自 1280×800 桌面书写、390×844 移动描回、1280×800 桌面完成；临时截图比对后已清理，不进入仓库。

| 对照项 | 结果 | 证据与偏离 |
| --- | --- | --- |
| 深墨蓝/冷雾/暖琥珀/铜色 | PASS | 本地夜景背景、木窗、雾层、锚点和隐私提示延续同一配色 |
| 大雾窗与窄控制带 | PASS | 桌面主舞台仍是页面绝对焦点，操作集中在下沿，没有侧栏、分数或仪表盘 |
| 手写痕迹 | PASS / INTENTIONAL | 生产版呈现用户真实笔迹，不加入概念图的摄影手指，也不会自动替换成心形 |
| 移动描回 | PASS | 顶部阶段与百分比、原线/已擦亮线/锚点三层语义、底部暂停和直接打开均保留 |
| 完成信纸 | PASS / INTENTIONAL | 信件嵌在窗内而非 modal；生产版采用规则纸卡以保证 320px 可读性，不强制心形擦窗 |
| 字体层级 | PASS | 系统衬线字形成标题、阶段标题、正文和署名四级；不提取概念图字体 |
| 隐私提示 | PASS | “本地 · 不保存”在桌面、移动及完成态持续可见 |
| 操作完整性 | PASS / INTENTIONAL | 保留重开；没有实现概念图未冻结语义的“留在这里”，避免制造伪保存能力 |

首屏生产文案以规格为真源：概念“先写一遍，再沿着自己的心意走回来”调整为“先写下一点什么，再沿着它，把窗外慢慢擦亮”，更直接解释动作与结果。生产书写态增加阶段标题、门槛提示和直接打开；移动描回增加锚点数字与键盘提示。以上是可用性补充，不改变惊喜内容或核心语气。

## 6. 可访问、隐私与降级边界

- 原生按钮、可见焦点、稳定 `aria-live` 和“直接打开”构成不依赖手写精度的等价路径；状态区只在阶段、门槛和每 10% 进度播报，不泄露逐点坐标；
- 页面不保存、上传、复制或分享笔迹；刷新与重开丢弃内存状态；源码中的明文结语只提供渐进揭晓，不被描述为加密；
- reduced motion、forced colors、背景缺失与 Canvas context 失败均有明确代码路径和静态 Gate；本轮未动态模拟这些系统媒体条件或 context 失败，因此只记为 CODE/STATIC PASS，不宣称截图通过；
- Canvas 按实际 CSS 尺寸与 DPR 重建并从 reducer 重绘；本轮没有分别保存 DPR 1/2/3 截图，像素密度适配按源码合同与经典脚本检查验收。

## 7. 借鉴与来源声明

完整声明见 [`../experiences/surprises/fog-window-letter/ATTRIBUTION.md`](../experiences/surprises/fog-window-letter/ATTRIBUTION.md)。固定参考只用于公开技术思想与能力边界，不是运行依赖：

- Signature Pad `b392d1d417a7a2fa21a7f659eb76fddcc2be3fdb`、perfect-freehand `f56f097e0e211fffa1601b93883e4d9f9dccf122`、Fabric.js `723838fcbb9feaa87c8840082640de2ed82383da`、Paper.js `c1d88390d2c86901db152827fe778c3e39cfb073` 均为 MIT；
- Pointer Events、UI Events code、WHATWG HTML、Page Visibility、WCAG 与 CSSWG Drafts 均固定到声明里的具体 commit；
- `sebnozzi/minimicro-foggywindow@1821f892...` 与 `negi141/pittura-demo@a9227e6...` 没有许可证，只列为明确排除项；
- 三张概念稿与生产背景由 OpenAI ImageGen 于 2026-07-19 生成，没有输入第三方图片、截图、商标或受保护角色。

没有复制、移植、翻译、打包或依赖上述项目与规范的源码、类、函数、API、算法实现、参数、测试、示例、图片、GIF、字体、页面结构、文案或构建产物。双遍玩法、整数规则、页面、文案和测试均为本仓库独立原创。

## 8. Bugs 与 Learn

本批记录并闭环：

- [ready 阶段焦点停在 Canvas](../bugs/2026-07-19-fog-window-ready-focus-gap.md)：阶段切换后聚焦确认按钮，键盘用户无需猜测下一步；
- [1280×800 桌面操作落到首屏外](../bugs/2026-07-19-fog-window-desktop-actions-below-fold.md)：短屏压缩外间距和舞台高度，两个 48px 操作回到首屏；
- [移动完成态重开按钮被裁切](../bugs/2026-07-19-fog-window-mobile-restart-clipped.md)：完成态提高雾窗预算并让信纸正文承担内部滚动。

本批新增沉淀：

- [不读像素的双遍同轨迹：用确定性锚点完成雾窗、描摹与手写挑战](../learn/2026-07-19-pixel-independent-two-pass-trace.md)

浏览器 `file://` 安全策略只在本报告记录为自动化环境限制，不作为产品 Bug 写入 `bugs/`。

## 9. 独立提交链

```text
4be41c9 docs: research fog window letter
2c5b537 docs: specify fog window letter
4f87c7c docs: plan fog window letter
90ebd68 design: freeze fog window letter
91666d6 feat: add fog window letter logic
312b18c feat: build fog window letter experience
d04a6f7 feat: register fog window letter
22aef2c docs: record fog window letter fixes
4c19e68 docs: explain deterministic two-pass tracing
```

本验收报告与两份索引另作一个提交，继续遵守“一部分完成一次提交”。
