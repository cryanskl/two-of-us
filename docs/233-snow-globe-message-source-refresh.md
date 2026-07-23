# “雪球留言”来源维护复核

复核日期：2026-07-24

关联文档：

- [定向调研](./181-snow-globe-message-research.md)
- [交互规格](./182-snow-globe-message-spec.md)
- [实施计划](./209-snow-globe-message-plan.md)
- [视觉提案](./210-snow-globe-message-design-proposal.md)

## 1. 复核结论

本次只维护研究证据，不修改实现、依赖、固定版本或视觉状态：

- 四个正式参考仓库仍公开、未归档、未禁用；原固定 commit 均仍等于默认分支 HEAD；
- 四个正式参考的固定许可证载体哈希未漂移，不需要追版；
- `alexgibson/shake.js` 的固定 commit 仍等于 HEAD，但仓库已归档，且包元数据与许可证正文存在无法代替上游解释的歧义，继续作为排除项；
- 生产实现仍保持零第三方运行时依赖、零传感器权限、零远程素材；
- 十张 ImageGen 概念图仍只属于文档，不是运行时资产或点阵数据；
- 视觉提案仍处于“待用户确认”状态，本次复核不授权创建生产 UI。

## 2. 复核方法

本次证据按以下层次交叉核验：

1. 用 Git 远端引用核对默认分支 HEAD；
2. 用 GitHub 仓库元数据核对默认分支、归档/禁用状态与自动识别的 SPDX；
3. 从固定 commit 读取许可证载体并计算 SHA-256；
4. 对 `shake.js` 同时固定并核对 `LICENSE.md` 与 `package.json`；
5. 以 W3C 当前正式发布页核对规范状态、日期和相关可访问性等级。

GitHub 的 SPDX 字段只是自动识别结果。它不能取代许可证正文，也不能单独证明来源没有许可；例如 W3C 仓库的载体明确指向 W3C Software and Document License 2023，而 GitHub 返回 `NOASSERTION`。

## 3. 正式参考仓库

| 来源 | 默认分支 | 固定 commit / 当前 HEAD | 状态 | GitHub SPDX |
|---|---|---|---|---|
| [`tsparticles/tsparticles`](https://github.com/tsparticles/tsparticles) | `main` | `627b3fc7d1a0d0fe524e2fea5f89fa7589b18d59` | 未归档、未禁用 | MIT |
| [`dango0812/canvas-text-particle`](https://github.com/dango0812/canvas-text-particle) | `master` | `9ee144a548aad85275318b30891c71dcf6e10f7b` | 未归档、未禁用 | ISC |
| [`catdad/canvas-confetti`](https://github.com/catdad/canvas-confetti) | `master` | `20eebad51dde793070c373d594099a7ed8d96e22` | 未归档、未禁用 | ISC |
| [`w3c/deviceorientation`](https://github.com/w3c/deviceorientation) | `main` | `70d42d5484db7fd1646e48cc17caa5ff1c9d92cb` | 未归档、未禁用 | `NOASSERTION` |

固定 commit 与当前 HEAD 相同只表示无需更新研究钉点，不表示项目以后应该自动追随上游。

### 3.1 许可证载体证据

| 来源 | 固定载体 | 固定载体 SHA-256 | 复核结果 |
|---|---|---|---|
| tsParticles | [`LICENSE`](https://github.com/tsparticles/tsparticles/blob/627b3fc7d1a0d0fe524e2fea5f89fa7589b18d59/LICENSE) | `c5c18dbc27f490f2ef90e0b574b8c40f534e495d2cb8a6f1c4bb1183a9c381a4` | MIT；正文未漂移 |
| canvas-text-particle | [`LICENSE`](https://github.com/dango0812/canvas-text-particle/blob/9ee144a548aad85275318b30891c71dcf6e10f7b/LICENSE) | `2a9fec8f93f07847a22029d5c423e33e0839da09d516664e5f0608346c03a122` | ISC；正文未漂移 |
| canvas-confetti | [`LICENSE`](https://github.com/catdad/canvas-confetti/blob/20eebad51dde793070c373d594099a7ed8d96e22/LICENSE) | `fd44477c30a832a1dee9ef0b6cfb34677fbe5ef58c0cf655d27c646f11bb2f7a` | ISC；正文未漂移 |
| W3C Device Orientation | [`LICENSE.md`](https://github.com/w3c/deviceorientation/blob/70d42d5484db7fd1646e48cc17caa5ff1c9d92cb/LICENSE.md) | `cd28c5af6bf84d8612db3094498d59f66e59468dc645b9e8e70e9d1b377bdf3a` | 指向 W3C Software and Document License 2023；正文未漂移 |

### 3.2 借鉴声明与零复制边界

这些来源只提供抽象机制参考，不提供可直接搬运的实现：

- tsParticles：只借鉴“粒子表现层能够统一停止与清理”；不复制 preset、API、配置、默认值、插件结构、示例或依赖；
- canvas-text-particle：只借鉴“稳定粒子 ID 映射到目标点”；不复制源码、采样、阈值、缓动、排斥公式、字体、演示或配置；本作不做离屏文字 Canvas 和字体轮廓采样；
- canvas-confetti：只借鉴“减少动态时跳过表现但进入同一结果状态”和生命周期清理；不复制物理、Worker、Promise 协调、参数、形状、配色、Canvas 实现或示例素材；
- W3C Device Orientation：只用来确认权限、隐私与能力边界，从而决定首版不使用传感器；不复制规范示例或措辞。

本项目的有限状态机、四方向集合、拖动阈值、确定性 9×11 点阵、DOM 延迟创建和清理策略均为独立实现。未来如创建体验级 `README.md` / `ATTRIBUTION.md`，必须逐项写出上述来源、固定 commit、许可证载体和“借鉴了什么 / 没有复制什么”，不能只链接本维护记录。

## 4. `shake.js` 歧义与排除决定

| 项目 | 固定证据 |
|---|---|
| 仓库 | [`alexgibson/shake.js`](https://github.com/alexgibson/shake.js) |
| 默认分支 | `master` |
| 固定 commit / 当前 HEAD | `d232eee7a5f31e9fd37aa79aa83f1f206035ccc9` |
| 仓库状态 | 已归档、未禁用 |
| GitHub SPDX | `NOASSERTION` |
| [`package.json`](https://github.com/alexgibson/shake.js/blob/d232eee7a5f31e9fd37aa79aa83f1f206035ccc9/package.json) SHA-256 | `716ded66505cda8bbcadc92cd3ce658268dd6269ba11af088ce62f045c3bf188` |
| [`LICENSE.md`](https://github.com/alexgibson/shake.js/blob/d232eee7a5f31e9fd37aa79aa83f1f206035ccc9/LICENSE.md) SHA-256 | `884110c34b4a2bec6ecb71bf18983a6d5860bfd4c904c14446ec6308764ffb4b` |

`package.json` 把许可证写为 MIT，但固定的 `LICENSE.md` 在许可句中保留了 `except as noted below`，后文没有对应例外。不能仅凭包元数据把该固定对象登记为标准 MIT，也不能代替上游解释这一差异的法律效果。

因此继续执行以下边界：

- 不复制、不依赖、不链接为运行时来源，也不把它升级为正式机制参考；
- 不复制 `Shake` 类、UMD/API、自定义 `shake` 事件、传感器监听、三轴 delta 判定、阈值、节流、能力检测或兼容表；
- 不用它证明当前浏览器的权限、安全上下文或兼容性结论。

## 5. 现行 Web 标准校准

### 5.1 设备动作与权限

[Device Orientation and Motion](https://www.w3.org/TR/orientation-event/) 当前发布状态为 2025-02-12 W3C Candidate Recommendation Draft。规范把相关接口限定在安全上下文中，并定义由用户激活触发的 `requestPermission()`；同时记录了传感器数据的隐私与指纹风险。

因此体验继续采用完整的无传感器主路线：

- 不注册 `devicemotion` 或 `deviceorientation`；
- 不请求 accelerometer、gyroscope 或 magnetometer 权限；
- 四个原生方向按钮与 Pointer 拖动都派发同一个 `ADD_WIND`；
- 本地 `file://` 直接打开不依赖权限弹窗或公网能力。

### 5.2 Pointer Events

通用地址 `https://www.w3.org/TR/pointerevents/` 当前指向 2026-07-01 的 Pointer Events Level 4 Working Draft。为避免引用随最新草案漂移，本项目实施校准明确固定到 [Pointer Events Level 3](https://www.w3.org/TR/pointerevents3/)（2026-06-30 W3C Recommendation）。

这里只借鉴 Pointer capture、`pointercancel` 与 `lostpointercapture` 的标准事件契约；不引入库，也不把一次拖动设为完成体验的唯一方式。

### 5.3 WCAG 2.2

[WCAG 2.2](https://www.w3.org/TR/WCAG22/) 当前发布状态为 2024-12-12 W3C Recommendation。与本体验直接相关的等级是：

| 成功准则 | 等级 | 本项目边界 |
|---|---:|---|
| 1.3.1 Info and Relationships | A | 语义结构和状态关系不能只靠视觉表达 |
| 1.4.10 Reflow | AA | 小视口不得依赖二维滚动完成主要内容 |
| 2.5.4 Motion Actuation | A | 即使未来加入动作输入，也必须提供界面替代并允许关闭 |
| 2.5.7 Dragging Movements | AA | 四个原生按钮完整替代拖动 |
| 2.5.8 Target Size (Minimum) | AA | 规范最低为 24×24 CSS px，并包含例外 |
| 2.3.3 Animation from Interactions | AAA | `prefers-reduced-motion` 跳过 settling 动画但到达相同结果 |

项目冻结的命中盒不小于 48×48 CSS px、3px 焦点环，是项目自己的强化 Gate，不是 WCAG 原文，也不代表完整 WCAG 认证。

`prefers-reduced-motion` 的定义继续以 [Media Queries Level 5](https://www.w3.org/TR/mediaqueries-5/) 为校准依据；`forced-colors` / `forced-color-adjust` 继续以 [CSS Color Adjustment Level 1](https://www.w3.org/TR/css-color-adjust-1/) 为校准依据。二者的当前页面状态分别为 2026-02-19 Working Draft 与 2025-12-16 Candidate Recommendation Snapshot。

## 6. 继续排除的来源与资产

以下内容不进入生产实现：

- NextParticle 等商业授权实现；
- 缺少仓库级许可证的 CodePen、Gist 或零散演示；
- 远程雪花图片、字体、音效与 CDN；
- 系统 emoji 的导出图；
- 品牌收藏雪球、贺卡的 trade dress；
- 本文列出的任何研究库依赖或 vendor 副本。

十张 ImageGen PNG 继续只用于概念讨论。图中的心形是构图意图，不是 9×11 / 63 点冻结数据；未来生产点阵必须从规格中冻结的 target 确定性绘制，不描图、不 OCR、不从位图采样。

## 7. 对实施状态的影响

本次复核不产生实现变更：

- `config.js`、`logic.js`、`logic.test.js` 保持不变；
- 不新增 dependency、devDependency、vendor、CDN 或权限；
- 不创建 `index.html`、`app.js`、`styles.css` 或运行时资产；
- 不修改 catalog、门户、分类 README 或创意池；
- 不创建空的 `bugs/` 或 `learn/` 记录。

生产 UI 仍受[视觉提案](./210-snow-globe-message-design-proposal.md)的明确 Gate 约束。只有用户确认整体方向、色彩/材质系统以及“开放短笺而非模态框或翻卡”的结构后，才能把视觉状态改为“已接受 / 已冻结”，再进入页面实现。
