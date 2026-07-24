# “这一颗，绕回来找你”借鉴与来源声明

“这一颗，绕回来找你”是为本仓库独立设计和实现的本地双人确定性投射游戏。作品
不安装、链接或打包任何第三方运行时、源码、测试或素材。

## 固定调研来源

| 来源 | 固定版本与许可证 | 本作仅借鉴 | 明确未复制或引入 |
| --- | --- | --- | --- |
| [tridpt/TwoPlayerGames](https://github.com/tridpt/TwoPlayerGames/tree/c96b802232d87d58408ed653dcbe43c0a68611f6) | commit `c96b802232d87d58408ed653dcbe43c0a68611f6`；MIT；Copyright (c) 2026 tridpt；`LICENSE` SHA-256 `372d7364baa62bdf60f7587c559b2893a917aceefdf27d6b65e7ba877aa2b2b2` | 投射玩法的瞄准、飞行、结算、换手阶段，以及显式反弹预算 | 源码、参数、风向、武器、爆炸、地形破坏、共享壳、PWA、联网、i18n、UI、文案和素材 |
| [niccolofanton/tanks-game](https://github.com/niccolofanton/tanks-game/tree/e4eb4c694d9bb3671de84ce1ea29b80f8c1d8c12) | commit `e4eb4c694d9bb3671de84ce1ea29b80f8c1d8c12`；MIT；Copyright (c) 2019 Niccolò Fanton；`LICENSE` SHA-256 `14b091fd78dda9255b6acde0b08b3e06497185c24c56d6c1931ebb46bbf12579` | 边界反射和最大反弹次数的玩法轮廓；其离散穿入修正只作为反例 | 碰撞实现、随机地图、坦克移动、贴图、视野系统、源码、测试和素材 |
| [liabru/matter-js](https://github.com/liabru/matter-js/tree/acb99b6f8784c809b940f1d2cf745427e088e088) | commit `acb99b6f8784c809b940f1d2cf745427e088e088`；MIT；Copyright Liam Brummitt and contributors；`LICENSE` SHA-256 `ed182087be5b26734aa6d4789743de3a97417950e8c1e3ff2e3d19c6462720d3` | 恢复系数、静态边界、碰撞阶段和渲染/物理解耦概念 | 包、API、引擎结构、求解器、示例布局、源码、常量和测试 |
| [schteppe/p2.js](https://github.com/schteppe/p2.js/tree/2beb2750f42d29014e289cb803b7269d5b0edaad) | commit `2beb2750f42d29014e289cb803b7269d5b0edaad`；MIT；Copyright (c) 2016 p2.js authors；`LICENSE` SHA-256 `bf18c22aac924767ac66ef68e453f4e78f39d0e054442bc6925b09a1fcdb61b2` | 固定步、最大子步、累计器与渲染插值分离 | 包、API、源码、插值、求解管线、示例和测试 |
| [jriecken/sat-js](https://github.com/jriecken/sat-js/tree/20e612681d1f9eabc9ea34dc98c4d27f985ffec6) | commit `20e612681d1f9eabc9ea34dc98c4d27f985ffec6`；MIT；Copyright (C) 2012–2015 Jim Riecken；`LICENSE` SHA-256 `de2ab62cb212dfbfe403a2f7e8b7de9b7e74e33d12bdbe8854bf324ab00fd2a2` | 把碰撞检测与碰撞响应分层的概念 | 通用 SAT、类/API、对象池、优化、实现、测试和文档措辞 |

## 独立实现边界

本作的热座回合、秘密输入、完整轮联合计分、Q12 固定步模拟、精确有理事件比较、
圆与扩张矩形碰撞、单次地面反弹、城堡判定、12 轮终止、状态机、公开投影、测试、
界面、中文文案与视觉均在本仓库独立设计和实现。

没有复制、改写、翻译、移植、链接或打包五个来源的源码、API、参数、测试、素材、
品牌、规则原句或界面；也不使用《愤怒的小鸟》《百战天虫》等商业作品的代码、
角色、美术、声音、关卡或品牌表达。

如果未来实际引入第三方内容，必须在合并前单独审计并更新本文件，保留相应许可证、
版权主体、具体文件、改动说明和分发义务；不能继续沿用当前“零代码、零素材复制”
的结论。
