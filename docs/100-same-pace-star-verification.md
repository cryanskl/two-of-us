# “慢一点，也和你一起”验收记录

- 日期：2026-07-18
- 作品：[`../experiences/co-op/same-pace-star/`](../experiences/co-op/same-pace-star/)
- 等级：A，本地经典脚本，无新增安装依赖、账号、存储、音频或公网请求
- 玩法：左右轮换领拍，依次完成“领拍按住 → 对方按住 → 领拍松开 → 对方松开”，六次共同点亮星光

## 1. 结论

作品实现、规则、目录、localhost 生命周期、三档响应式、触控尺寸、资源降级、降动效、高对比度与来源声明均通过验收：

- 六星左右轮换计划、四个有序输入边沿、8–19 inclusive 动作窗、tick 20 超时和 release Gate 由 77 项 reducer 测试覆盖；
- 键盘 A/L 与两个独立 pointerId 统一投影为物理 `inputId`，重复输入、旧 RELEASE、错席、过早松手、blur/hidden/stalled 均有规则测试；
- 1504×1046、390×844 与 320×700 的 DOM 测量均无横向或纵向溢出；左右 pad 分别为 228px、158px、138px，三档暂停按钮均不低于 48px；
- localhost 真实浏览器覆盖开场、超时、完整按键的过早松手、左右 pad 短点、暂停、继续、Escape、背景资源缺失、reduced motion、forced colors 与根门户导航；
- 目录现有 41 个作品入口，其中 33 个 A 级；C05 在目录、门户内置回退目录和 backlog 中各有唯一条目；
- README 与 ATTRIBUTION 保留七个 fixed commit、许可证或文档权利边界、论文非复用边界、ImageGen 最终提示词、健康措辞与完整零复制声明；
- 全程控制台没有 warning 或 error，本轮浏览器验收没有发现新的项目 bug。

本轮有三项明确的浏览器控制限制，不冒充已独立实测：

1. 当前内置浏览器安全策略拒绝 `file://` 导航，并明确禁止换表面或用底层命令绕过。A 级直开边界由经典脚本、相对路径、无远程资源和目录静态 Gate 覆盖；真实 OS 双击未在本轮自动化中观察。
2. 当前高层输入接口只能发送完整按键，不能分别保持 `keyDown/keyUp`；原始 `Input.dispatchKeyEvent` 又不被该浏览器后端支持。因此浏览器无法表达跨四拍持续按住的 happy path，六星终局由 77 项同一 reducer 测试证明，没有伪造 DOM 或测试钩子。
3. 桌面普通截图表面固定返回 1504×892；`fullPage` 在显式桌面视口下产生明显缩放错位。验收只保存稳定的普通截图，1504×1046 的完整首屏结论来自 DOM 几何测量，不把错位截图作为证据。

这些是证据能力限制，不是已复现的产品缺陷。

## 2. 自动检查

| 检查 | 结果 |
| --- | --- |
| `node --check` 三个生产 JavaScript | PASS |
| `node --test experiences/co-op/same-pace-star/logic.test.js` | 77 / 77 PASS |
| `node --test shared/runtime/catalog.test.js` | 59 / 59 PASS |
| `npm test` | 615 / 615 PASS |
| `npm run verify` | 41 个作品入口、1 个能力声明 PASS |
| `git diff --check` | PASS |

目录 Gate 额外固定：

- 经典脚本、无 module、无远程 `src/href`、无 fetch/XHR/WebSocket/Worker/浏览器存储与媒体 API；
- 无 `Math.random`、音频文件、第三方字体、CDN、共享运行时引用或新增安装依赖；
- `requestAnimationFrame` 只累计 50ms 整数 tick，500ms 以上帧停顿转为明确中断；
- Pointer cancel/lost capture、visibilitychange、结构化 DOM、无 `innerHTML`；
- `touch-action:none` 只用于左右 pad，forced colors 与 reduced motion 都有静态回归；
- README 与 ATTRIBUTION 固定来源、ImageGen 无第三方输入和完整零复制声明。

## 3. localhost 浏览器验收

环境：macOS、Codex 内置浏览器、本地运行时 `http://localhost:4173/`。

### 3.1 开场、目录与错误路径

| 路径 | 浏览器证据 |
| --- | --- |
| 根门户 | 41 张作品卡；唯一链接“打开《慢一点，也和你一起》”导航到 C05，标题与 intro phase 正确 |
| 桌面开场 | 1504×1046 无滚动；返回和“开始接光”均为 48px；脚本、样式全部来自 localhost；日志 `[]` |
| 无输入超时 | 第 1 颗在 tick 窗结束后进入 ready，live status 为“光没接上，松开再来。” |
| 完整 A 按键 | 在“现在 · 左边的你按住”发送一次完整 A，会因立即 keyup 安全回到 ready，证明过早松手没有卡键 |
| 左右 pad 短点 | 两侧各自可被唯一可访问名称定位；短点均进入安全重试态，不残留 active pointer |
| 暂停按钮 | paused DOM 只保留“星光停在这里”“按键和触点已经清空”和“继续” |
| Escape | 从 playing 立即进入 paused，live status 同步说明输入已清空 |
| 继续 | 安全回到当前星的 ready，不携带暂停前的部分输入 |

高层自动化不能维持跨拍按住，因此没有把“短点会失败”写成玩法 bug；它正是四边沿规则要求的错误路径。

### 3.2 资源与可访问模式

| 路径 | 浏览器证据 |
| --- | --- |
| 阻断 `quiet-sky.webp` | body 保留 `rgb(17, 21, 43)` 纯色背景；intro 可开始、playing 有两个 pad；日志 `[]` |
| `prefers-reduced-motion: reduce` | `matchMedia` 为 true；halo animation 为 `none`；halo/pad transition 为 `0.01ms` |
| `forced-colors: active` | `matchMedia` 为 true；body 使用系统 Canvas；当前席 3px Highlight 轮廓，激活席双线边框 |

## 4. 响应式几何与证据

| 视口 | DOM / 计算样式结果 |
| --- | --- |
| 1504×1046 | body、app 与 viewport 同高同宽；pad 228×228，底部 y=960；暂停 48px，底部 y=1016；隐私说明底部 y=1046 |
| 390×844 | viewport 与 scroll 均为 390×844；四格各 86×60；pad 158×158 并排；全部核心流程与暂停进入首屏 |
| 320×700 | viewport 与 scroll 均为 320×700；四格各 70×56；pad 138×138 并排；暂停 48px，底部 y=672 |

保存的真实浏览器证据：

- [1504×892 桌面开场 JPEG](./assets/same-pace-star/desktop-intro-1504x892.jpg)
- [390×844 移动进行态 JPEG](./assets/same-pace-star/mobile-playing-390x844.jpg)
- [320×700 最窄进行态 JPEG](./assets/same-pace-star/narrow-playing-320x700.jpg)

浏览器 API 返回的字节为 JPEG/JFIF，文件扩展名与 magic bytes、像素尺寸一致。桌面图只作为稳定的视觉证据；1504×1046 完整布局使用上表 DOM 测量。

## 5. Fidelity ledger

同轮对比：

- `design/same-pace-star/concept-desktop-playing.png` 与实际桌面运行结构；
- `design/same-pace-star/concept-mobile-playing.png` 与实际 390/320 运行截图；
- `design/same-pace-star/concept-desktop-complete.png` 仅作冻结完成态设计证据，不冒充浏览器终局截图。

| 项目 | 结果 | 证据 |
| --- | --- | --- |
| 环境材质 | PASS | 靛蓝手工纸、中央月白薄雾、边缘金色星点与生产背景一致 |
| 双席身份 | PASS | 左席蓝紫、右席杏金，文字、位置、描边共同区分，不只依赖颜色 |
| 六星进度 | PASS | 当前、未完成与数字冗余同时存在；移动端仍完整显示六颗 |
| 四拍核心 | PASS | 中央双环、四个有序动作格和当前指令都由 code-native DOM/CSS 生成 |
| 控件语义 | PASS | 原生 link/button/status；可见焦点、48px 以上辅助控件与 138px 以上 pad |
| 本地边界 | PASS | 页脚明确“不录音、不联网、不保存”；无音频、字体、CDN 或远程请求 |
| 移动重排 | PASS | 390 与 320 保持左右 pad 并排，不把一席放到首屏之外 |

### 有意偏离复核

- 概念图只冻结材质、对称、层级和移动并排规则；运行版用原生文字和离散四格替代生成图中的不可读假字；
- 运行版把“呼吸”题材收窄为接光节奏，不要求改变真实呼吸，也不展示健康、冥想、心率或生理同步符号；
- 320px 版压缩 halo 与间距，但不缩小可操作 pad，不隐藏节拍或暂停；
- 完成态没有在当前浏览器接口中伪造，视觉只以冻结概念和 reducer 终局测试为证据。

这些偏离都服务规则清晰、健康边界或首屏触达，没有发现新的未声明可修复偏差。

## 6. 借鉴与来源声明

完整声明见 [`../experiences/co-op/same-pace-star/ATTRIBUTION.md`](../experiences/co-op/same-pace-star/ATTRIBUTION.md)。本作品只研究通用机制和权利边界：

- `hmillerbakewell/breathing-exercises` fixed commit `6ae2b07cead1c953ccbdcabba7a245dc6294950f`，MIT；
- `kosciukus/breathe` fixed commit `debd32208441f7ba68d34badf0aa5ab73cb66cf3`，MIT；
- `mmazzarolo/breathly-app` fixed commit `740527679c95a6b77b8d9157c8945a060d2dcdb2`，MPL-2.0；
- `anxkhn/zen-clock-workshop` fixed commit `f4ba61f5ea964405532fe97c4ea9a6313f150444`，MIT，只作故意 bug 与未完成功能反例；
- WHATWG HTML fixed commit `9377fd656f519b60524b92f09bcc9e6d937b2017`；
- W3C Pointer Events fixed commit `238e8273305bb2e3c76f9f0bb289fb127c3dff74`；
- WCAG 2.2 fixed commit `07123b871c103268375880980fd715b2b26b2ff0`；
- BreatheWithMe CHI EA 2023 论文只有出版方版权与机构记录，无可复用许可，只研究抽象问题，不复用正文、图表、设备或实验流程。

没有复制、翻译、改写或打包上述项目、论文和规范的代码、数据结构、处方节奏、音频、字体、图标、SVG、截图、图表、设备、文案或 UI。四边沿接光、六星计划、规则、状态机、页面、中文文案与测试均为本仓库独立创作。

`quiet-sky.webp` 由 OpenAI ImageGen 生成，第三方输入为无；页面的星、双环、节拍格、pad、焦点和全部文字均由原生 HTML/CSS/JavaScript 生成。

## 7. Bugs 与 Learn

本批记录并处理：

- [系统 FFmpeg 缺 WebP 编码器，改用工作区 Pillow](../bugs/2026-07-18-same-pace-star-webp-encoder-unavailable.md)

浏览器验收没有发现新的项目 bug；`file://`、持续按键与 full-page 截图均是当前测试工具限制，只在本报告记录。

本批扩展沉淀：

- [共同按住交互：物理 inputId、双松手 Gate 与有序四边沿](../learn/2026-07-18-physical-input-release-gate-focus.md)

## 8. 独立提交链

```text
0c087d8 docs: research same pace star
0f7a936 docs: specify same pace star
e831d5b docs: plan same pace star implementation
9c24f59 bug: document same pace webp fallback
3385ed0 design: define same pace star visuals
55c6737 feat: add same pace star state engine
dd85108 feat: add same pace star experience
aaa44a5 feat: catalog same pace star
1e0bb63 learn: document ordered input edges
```

验收报告、三张浏览器证据与索引另作一个提交，继续遵守“一部分完成一次提交”。
