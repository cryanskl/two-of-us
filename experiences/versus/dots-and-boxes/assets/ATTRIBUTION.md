# 借鉴与来源声明

## 生成式视觉资产

以下图片由 Codex 内置 OpenAI ImageGen 于 2026-07-18 为「这一格归谁」定向生成：

| 本地文件 | 用途 | 处理与边界 |
| --- | --- | --- |
| `paper-texture.png` | 运行页棋盘纸低对比纹理 | 1254×1254，无字、无物件、无中央折痕；CSS 只作背景并提供纯色/方格渐变回退 |
| `docs/assets/dots-and-boxes/concept-desktop-playing.png` | 1504×1046 桌面进行态设计基准 | 只作布局、色板与材质证据，运行页不加载 |
| `docs/assets/dots-and-boxes/concept-mobile-playing.png` | 853×1844 手机进行态设计基准 | 只作响应式层级与触控密度证据，运行页不加载 |
| `docs/assets/dots-and-boxes/concept-desktop-finished.png` | 1504×1046 桌面终局设计基准 | 只作终局密度与双色分布证据，运行页不加载 |

提示词摘要：炭褐桌面上的暖象牙方格纸，以朱红与靛蓝两色墨线进行传统 4×4 线框占地；中文排版克制，避免 dashboard、卡片网格、品牌、人物和第三方角色。第一张生成纹理存在明显中央拼缝，已拒绝且未保留在仓库。

HTML、CSS、SVG 返回箭头、棋盘点、40 条可交互边、16 个格子、比分、状态和全部文字均由代码原生渲染，不从概念图裁切 UI。生成资产不包含第三方商标、字体、图库、人物、角色或开源项目素材。

## 传统规则与事实来源

- [AAAI 论文《Dots-and-Boxes is Solved on 4×5 Boards》](https://ojs.aaai.org/index.php/AAAI/article/download/8144/8002)：用于核对“轮流画边、闭合格子得分并继续、格子最多者获胜”的传统规则；
- 论文和传统纸笔玩法只作为规则事实来源，不是代码、布局、文案或素材来源。

## 开源对照与零复制声明

- [`Upside-Down-Collective/dots-game@c9fdec7`](https://github.com/Upside-Down-Collective/dots-game/tree/c9fdec7ba334412c1ce9798c341e29900cadebde)，根仓库 [MIT](https://github.com/Upside-Down-Collective/dots-game/blob/c9fdec7ba334412c1ce9798c341e29900cadebde/LICENSE)，Copyright (c) 2022 lemmoor / Upside Down Collective；其 `server/package.json` 另标 ISC，React、Socket.IO 等依赖也各有许可证：只用 README 对照 React、Node、Socket.IO、Docker/HAProxy 的联网架构，确认本作无需这些依赖；零代码、零 CSS、零组件、零素材、零依赖引入。若未来复制任何文件，必须重新做文件级许可证审计。
- [`jessefischer/dots-and-boxes@4e3382a`](https://github.com/jessefischer/dots-and-boxes/tree/4e3382aa04d844f9c46932d7df9161bb8d6745bd)，[MIT](https://github.com/jessefischer/dots-and-boxes/blob/4e3382aa04d844f9c46932d7df9161bb8d6745bd/LICENSE)，Copyright (c) 2021 Jesse Fischer：只审阅其每格保存边状态的实现以识别共享边重复真值风险；本作改用全局规范物理边 ID，未复制、改写、移植或运行其源码、CSS 与素材。
- [`wannesm/dotsandboxes@70ba3a9`](https://github.com/wannesm/dotsandboxes/tree/70ba3a9f1c99a8aee4de0347d0b276bf9093ca4c)：项目根目录未发现明确源码许可证；其中 `static/d3/LICENSE` 只覆盖第三方 D3，并不授权该项目自身代码。它只作为搜索发现记录；未读取实现，也不得复制代码、数据或素材。

本作的状态机、边 ID、双闭合判定、配置、中文文案、DOM、CSS 和测试均由本仓库独立实现。运行时无第三方依赖、无网络请求、无存储、无 AI、无远程字体或 CDN。若以后实际借入第三方代码或素材，必须在本文件补充固定版本、作者、许可证、本地文件与修改范围。
