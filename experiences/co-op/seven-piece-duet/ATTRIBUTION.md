# 借鉴与来源声明

核验日期：2026-07-25。

## 机制与工程边界

| 来源 | 固定版本、许可证与权利主体 | 本作仅研究 | 明确未复制、翻写或引入 |
| --- | --- | --- | --- |
| [shgalus/tangram](https://github.com/shgalus/tangram/tree/a5cdfdc9a85894bf58829fb4f4dbddcf22b41764) | commit [`a5cdfdc9a85894bf58829fb4f4dbddcf22b41764`](https://github.com/shgalus/tangram/commit/a5cdfdc9a85894bf58829fb4f4dbddcf22b41764)；[MIT License](https://github.com/shgalus/tangram/blob/a5cdfdc9a85894bf58829fb4f4dbddcf22b41764/LICENSE)；Copyright (c) 2018 Stanisław Galus | “七块几何片组成目标轮廓”这一抽象机制，以及浏览器承载拼形交互的可行性 | 源码、函数、API、坐标、比例常量、片模板、题面、轮廓、标准解、初始布局、拖拽行为、jQuery/jQuery UI/Konva 依赖、HTML、CSS、文案、名称、截图、图标和素材 |
| [JozefJarosciak/BlockPuzzleSolver](https://github.com/JozefJarosciak/BlockPuzzleSolver/tree/f49e89f576186ec773ca21d0ee173175f36f75e9) | commit [`f49e89f576186ec773ca21d0ee173175f36f75e9`](https://github.com/JozefJarosciak/BlockPuzzleSolver/commit/f49e89f576186ec773ca21d0ee173175f36f75e9)；[MIT License](https://github.com/JozefJarosciak/BlockPuzzleSolver/blob/f49e89f576186ec773ca21d0ee173175f36f75e9/LICENSE.txt)；Copyright (c) Jozef Jarosciak | README 所述格约束下允许旋转与反射的问题边界 | 求解器、Dancing Links 或其他搜索实现、块定义、坐标、数据、启发式、测试、UI、样例和题面 |

上述项目不是运行或开发依赖。即使 MIT 允许复制，本项目仍选择机制借鉴、完全自行实现，以保持来源、视觉身份与许可证义务清楚。

## 平台规范

| 来源 | 固定版本、许可证与权利主体 | 本作仅研究 | 未复制 |
| --- | --- | --- | --- |
| [W3C Pointer Events](https://github.com/w3c/pointerevents/tree/238e8273305bb2e3c76f9f0bb289fb127c3dff74) | commit `238e8273305bb2e3c76f9f0bb289fb127c3dff74`；[W3C Software and Document License](https://github.com/w3c/pointerevents/blob/238e8273305bb2e3c76f9f0bb289fb127c3dff74/LICENSE.md)；W3C contributors | pointerId、capture、cancel、lost capture 与多 Pointer 生命周期 | 规范文字、WebIDL、示例、测试、图表和站点视觉 |
| [W3C WCAG](https://github.com/w3c/wcag/tree/07123b871c103268375880980fd715b2b26b2ff0) | commit `07123b871c103268375880980fd715b2b26b2ff0`；[W3C Document License](https://github.com/w3c/wcag/blob/07123b871c103268375880980fd715b2b26b2ff0/LICENSE.md)；W3C contributors | 后续界面的键盘等价、可取消 Pointer、焦点可见、非颜色信息和状态消息验收基线 | 规范文字、示例、图表和站点视觉；不把项目 Gate 冒充完整 WCAG 认证 |

## 本项目原创边界

七片模板按本项目规格中的整数原子三角形数学构造独立推导。目标生成器只消费本项目模板，以冻结枚举规则组合候选；不会下载、读取或拟合网络题面、截图、轮廓、开源坐标或素材。四个固定目标的生成参数、标准解、D4 指纹和人工审计将记录在 [`TARGETS.md`](./TARGETS.md)。

本项目不会复制、翻译、改写、打包或依赖上述来源的代码、API、算法实现、测试、参数、坐标、片比例表达、题面、标准解、关卡、HTML、CSS、DOM、文案、名称、图片、图标、字体、音频、截图或其他素材。

当前目录不含上游实质代码或素材，因此不附加上游许可证副本。若实施事实发生变化，必须在写入相应生产代码前暂停，保存许可证正文、版权与 notice，记录复制范围和修改说明，并重新执行权利与离线审查。
