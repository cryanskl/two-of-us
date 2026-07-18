# 借鉴与来源声明

## 独立实现边界

本作只借鉴开普勒第三定律给出的“半径越大、公转周期越长”关系，以及同屏双人轨道切换这一抽象玩法方向。规则、固定步 reducer、seed 星流、共享 claim、中文文案、DOM、CSS、测试与生成提示词均由本仓库独立完成；没有复制、改写或打包下列仓库的代码、素材、关卡、音乐或字体。

## 规则与科学说明来源

- NASA, [Orbits and Kepler's Laws](https://science.nasa.gov/solar-system/orbits-and-keplers-laws/)：用于核验第三定律的定性关系；
- NASA Goddard, [Kepler's Third Law](https://imagine.gsfc.nasa.gov/descriptions/kepler3.html)：用于核验周期平方与轨道半径立方的关系；
- NASA JPL, [Exploring Exoplanets with Kepler](https://www.jpl.nasa.gov/edu/resources/lesson-plan/exploring-exoplanets-with-kepler/)：用于教学表达交叉检查。

运行版只采用归一化的 `ω ∝ r^-3/2` 作为三轨速度规则，不宣称模拟真实天体、引力、质量或轨道转移。

## 开源架构对照

| 项目 | 固定版本 | 许可证 | 实际借鉴 | 未复制 |
| --- | --- | --- | --- | --- |
| [markbrown/keplersballs](https://github.com/markbrown/keplersballs/tree/81b92ff6df930644fae28cf5c14035dd055bc84e) | `81b92ff6df930644fae28cf5c14035dd055bc84e` | CC BY-SA 4.0；Copyright 2024 Mark Brown；项目另列 Peter Renton 音乐与 OFL 字体 | 只对照“轨道教育玩具”范围风险 | 零代码、零素材、零音乐、零字体 |
| [gianlucatruda/orbital](https://github.com/gianlucatruda/orbital/tree/a5f3741b98103c471d57b1783a0871325eca9cf4) | `a5f3741b98103c471d57b1783a0871325eca9cf4` | GPL-3.0 | 只对照离散轨道游戏的架构边界 | 零代码、零素材、零关卡 |
| [sciencemanx/Gravity-Wells](https://github.com/sciencemanx/Gravity-Wells/tree/ab0db1e2143439db91bf73ff84595e2658e2443b) | `ab0db1e2143439db91bf73ff84595e2658e2443b` | MIT；Copyright 2014 Adam Van Prooyen | 只对照实时重力玩法会引入的复杂度 | 零代码、零素材、零物理实现 |
| [XDream-Dev/battle-spaceship-game](https://github.com/XDream-Dev/battle-spaceship-game/tree/45700779f01dd9c170a412b1a2803375d5ac9b87) | `45700779f01dd9c170a412b1a2803375d5ac9b87` | Apache-2.0 | 只对照双人太空对抗的输入与表现风险 | 零代码、零素材、零战斗系统 |

许可证核验链接与调研结论见 [`../../../../docs/73-orbit-star-race-research.md`](../../../../docs/73-orbit-star-race-research.md)。上述许可证不传递给本仓库独立代码或生成资产。

## 生成式资产

| 文件 | 生成日期 | 用途 | 提示词摘要与处理 |
| --- | --- | --- | --- |
| `star-chart.png` | 2026-07-18 | 运行时低对比星图背景 | 午夜海军蓝、黄铜蚀刻星座与天文刻线、无文字、无星盘主体、无对象；1254×1254 RGB PNG |
| `orbit-sprites.png` | 2026-07-18 | 朱/蓝卫星、目标星、中央太阳四宫格 | 纸雕机械卫星与黄铜星盘风格、统一 `#06131f` 哑光底；1254×1254 RGB PNG；运行时配合同色底与径向 mask |
| `docs/assets/orbit-star-race/concept-desktop-playing.png` | 2026-07-18 | 桌面进行态视觉基准 | 1504×1046，35/65 双列、黄铜星盘、开放比分轨与双人控制 |
| `docs/assets/orbit-star-race/concept-mobile-playing.png` | 2026-07-18 | 手机进行态视觉基准 | 853×1844，标题、比分、星盘、状态、双列控制的单列节奏 |
| `docs/assets/orbit-star-race/concept-desktop-finished.png` | 2026-07-18 | 桌面终局态视觉基准 | 1504×1046，加赛终局密度、完整星盘与单一重开动作 |

这些图像由 Codex 内置 OpenAI ImageGen 根据本仓库规格生成，不来自第三方项目。概念图不在运行时加载。第一版声称透明、但实际把棋盘格烘焙进 RGB 像素的图集已拒绝且未进入仓库。

## 运行与再分发

- 运行页面只加载本目录中的两个 PNG，不请求 CDN、字体、音频、API 或远程图片；
- 若替换任一资产，必须在本文件补充来源、作者、许可证、固定版本、修改范围和回退策略；
- 本仓库尚未声明统一许可证，不得从本声明推定整个仓库都使用上述任一许可证。
