# Capsule Docking 借鉴与许可证声明

`capsule-docking` 的双席权限、三航段、数值、整数积分、微步碰撞、六项 Gate、
状态机、代码、测试、中文文案和未来界面/资产均为独立实现。本目录不复制、改写、
翻译、链接或打包下列项目的源码、API、物理常量、动作/观察空间、奖励函数、
求解器、测试、示例、界面、品牌或素材；它们不是运行依赖。

| 来源 | 固定版本与许可证 | 只研究的抽象点 | 明确未引入 |
| --- | --- | --- | --- |
| [Farama Gymnasium](https://github.com/Farama-Foundation/Gymnasium/tree/20b453de30ef725a538e235fcdec909f30c95783) | commit `20b453de30ef725a538e235fcdec909f30c95783`；[MIT](https://github.com/Farama-Foundation/Gymnasium/blob/20b453de30ef725a538e235fcdec909f30c95783/LICENSE)；Copyright (c) 2016 OpenAI；Copyright (c) 2022 Farama Foundation | 位置、线速度、角度和角速度等状态类别分层 | Python、Box2D、Pygame、Lunar Lander 源码、力学公式、参数、奖励、终止、图形与粒子 |
| [schteppe/p2.js](https://github.com/schteppe/p2.js/tree/2beb2750f42d29014e289cb803b7269d5b0edaad) | commit `2beb2750f42d29014e289cb803b7269d5b0edaad`；[MIT](https://github.com/schteppe/p2.js/blob/2beb2750f42d29014e289cb803b7269d5b0edaad/LICENSE)；Copyright (c) 2016 p2.js authors | 固定 dt、accumulator、最大子步与规则/渲染分离 | `World.step/internalStep`、对象结构、求解器、碰撞管线、插值、构建、测试与示例 |
| [jriecken/sat-js](https://github.com/jriecken/sat-js/tree/20e612681d1f9eabc9ea34dc98c4d27f985ffec6) | commit `20e612681d1f9eabc9ea34dc98c4d27f985ffec6`；[MIT](https://github.com/jriecken/sat-js/blob/20e612681d1f9eabc9ea34dc98c4d27f985ffec6/LICENSE)；Copyright (C) 2012 - 2015 by Jim Riecken | 粗排除、精确碰撞与安全对接判定分层 | Vector、SAT、Response、ObjectPool、分离轴实现、优化、测试、示例与措辞 |
| [phaserjs/phaser](https://github.com/phaserjs/phaser/tree/41be1e462bc600064e498cba370bfa8c5c055a22) | commit `41be1e462bc600064e498cba370bfa8c5c055a22`；[MIT](https://github.com/phaserjs/phaser/blob/41be1e462bc600064e498cba370bfa8c5c055a22/LICENSE.md)；Copyright (c) 2026 Richard Davey, Phaser Studio Inc. | 按下/抬起、repeat 过滤、失焦复位与监听器清理的生命周期职责 | KeyboardPlugin、Key、KeyMap、插件体系、EventEmitter、事件名、类型、测试、品牌与素材 |

NASA NTRS 的
[Orion Rendezvous, Proximity Operations, and Docking Design and Analysis](https://ntrs.nasa.gov/citations/20070025134)
只用于理解近距/对接会分别观察相对位置、相对速度、相对姿态和相对姿态率四类
公开状态。本作未复制论文、表格、图形、参数、导航/控制算法或安全结论，也不是
航天训练软件。

固定来源的维护证据、许可证 SHA-256 与标准状态见
[`docs/228-capsule-docking-source-refresh.md`](../../../docs/228-capsule-docking-source-refresh.md)。
若未来实际引入任何第三方代码或资产，必须先停止“独立实现、零第三方运行依赖”
结论，并重新执行文件级许可证审计。
