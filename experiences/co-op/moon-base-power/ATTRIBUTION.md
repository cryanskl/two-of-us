# 月面，保持有光：来源与归属

核验日期：2026-07-19（视觉资产记录于 2026-07-20）。下列开源项目和事实页面只用于开发前研究，不是本作品的运行依赖。

## 固定研究来源

| 来源 | 固定版本、许可证与权利主体 | 仅研究 | 明确未复制或引入 |
| --- | --- | --- | --- |
| [PipeWalker v1.1](https://github.com/artemsen/pipewalker/tree/72c4cfa37c48a60aebcd537061163ccb3eabc806) | tag `v1.1`，commit `72c4cfa37c48a60aebcd537061163ccb3eabc806`；MIT；Copyright © 2024 Artem Senichev | 把多个组件连接为完整网络时如何给出可读反馈 | C++/SDL2 代码、旋转拼管规则、关卡、算法、测试、截图、图标、音效、字体、构建和文案 |
| [Grid2Op v1.12.5](https://github.com/Grid2op/grid2op/tree/a1736886d18c14f6e19520813d2b3e432179e3b9) | tag `v1.12.5`，commit `a1736886d18c14f6e19520813d2b3e432179e3b9`；MPL-2.0；Copyright © 2019–2020 RTE France | topology action、observation、安全约束与环境推进的分层 | Python 包、潮流后端、动作/观察 API、RL 接口、数据集、算法、测试、notebook、图和文字 |
| [Power Overload 2.1.6](https://github.com/tburrows13/PowerOverload/tree/8d618116d7491c9a289bbbf886c340a197f38303) | annotated tag `v2.1.6` 的 tag object 为 `94d188c1233331e1136894e1d5e867684e91197c`，解引用 commit 为 `8d618116d7491c9a289bbbf886c340a197f38303`；`info.json` 为 `2.1.6`；MIT；Copyright © 2022 Tom Burrows | 子网容量、变压器隔离和过载反馈这一抽象问题 | Factorio 模组代码、API、实体、配方、数值、测试、贴图、音效、文案、随机破坏和任何游戏素材 |

Power Overload 使用 annotated tag：普通 tag ref 返回 tag object `94d188c...`，`v2.1.6^{}` 与固定源码均解析到 commit `8d61811...`。许可证原文位于固定提交的 `LICENCE.txt`。本声明不会把 tag object 误称为源码提交。

即便相应许可证允许一定范围的复制，本作仍选择零复制。未把上述许可证代码或文档内容打包进运行目录；若以后实际使用实质代码、文字或素材，必须另行保留完整许可证、版权声明和文件级边界。

## 事实背景与商标边界

- [NASA Moon Base Systems](https://www.nasa.gov/moonbase-systems/) 只用于确认月面基础系统可包含通信、居住与电力等类别，以及电力涉及生成、储存、调节和分配。
- [NASA Gateway 概览](https://www.nasa.gov/reference/gateway-about/) 只用于确认环境控制与生命保障、能源储存/配电和通信可作为月面题材背景。

NASA 页面不为本作的数值、拓扑或控制方式背书。本作不是 NASA、Artemis、Gateway、Factorio 或任何上游项目的官方作品、模拟器或培训产品；没有使用其徽标、任务标识、照片、截图、概念图、地图、商标化 UI、原文段落或素材。

## 浏览器标准

作品使用标准的 `requestAnimationFrame`、`KeyboardEvent.code`、原生 button/radio/progress、Page Visibility、reduced-motion 与 forced-colors。开发依据包括 [WHATWG HTML animation frames](https://html.spec.whatwg.org/multipage/imagebitmap-and-animations.html#animation-frames)、[W3C UI Events KeyboardEvent code Values](https://www.w3.org/TR/uievents-code/)、[WCAG 2.2](https://www.w3.org/TR/WCAG22/)、[Media Queries Level 5](https://www.w3.org/TR/mediaqueries-5/) 和 [CSS Color Adjustment](https://www.w3.org/TR/css-color-adjust-1/)。这是直接调用浏览器标准接口；没有复制规范示例、图表、IDL、测试或原文段落。

## OpenAI ImageGen 资产

- [`docs/assets/moon-base-power/control-room-background-source.png`](../../../docs/assets/moon-base-power/control-room-background-source.png)：2026-07-20 使用 OpenAI 内置 ImageGen 按本项目原创提示生成的无字控制室背景，1586 × 992 RGB PNG。
- [`assets/control-room-background.png`](./assets/control-room-background.png)：上述源稿的逐字节运行副本；没有合成第三方照片、标识或素材。
- [`assets/favicon.svg`](./assets/favicon.svg)：本项目代码原生绘制的双母线 SVG，不是生成资产或第三方图标。

文档中的桌面进行态、移动进行态和桌面完成态概念图同样由本项目使用 OpenAI 内置 ImageGen 原创生成，只作为设计验收参照，不进入运行页面。

## 独立实现与零复制声明

“月面，保持有光”的情侣语义、双母线规则、三班供需数值、两席权限、整数 evaluator、联络容量、连续安全窗、状态机、测试、中文文案、HTML、CSS、JavaScript、SVG 和生成视觉资产均由本仓库独立完成。

PipeWalker、Grid2Op 和 Power Overload 只用于研究连接完整性、拓扑动作/观察分层及子网容量的一般问题。本作未复制、改写、翻译、移植、打包或依赖其源码、API、算法、关卡、参数、测试、页面、资源或文案；NASA 页面只提供非专属事实背景，不构成联名、认可或工程依据。
