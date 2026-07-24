# “这一朵，我先养开”借鉴与来源声明

“这一朵，我先养开”是为本仓库独立设计和实现的本地双人有限手牌对抗游戏。作品
不安装、链接或打包任何第三方运行时、源码、测试或素材。

## 固定调研来源

| 来源 | 固定版本与许可证 | 本作仅借鉴 | 明确未复制或引入 |
| --- | --- | --- | --- |
| [amsanghi/gops](https://github.com/amsanghi/gops/tree/aeccb2a889eade57dec7a8ba542e1bd4307a526e) | commit `aeccb2a889eade57dec7a8ba542e1bd4307a526e`；MIT；Copyright (c) 2026 Aman Sanghi；该版本 `LICENSE` SHA-256：`8b9febb20d1fd967c26d9cbb751ea7307431f92b3d0e779a7983dc67fcbcf2f5` | 两人传递同一设备的 Hot Seat、各自秘密选牌、双方确认后揭晓、已使用手牌退出后续选择这些抽象机制 | 数字竞价、奖分牌比较、规则原句、PWA 结构、源码、测试、页面、文案、牌面和其他资产 |
| [boardgameio/boardgame.io](https://github.com/boardgameio/boardgame.io/tree/65ca73beb62ef2afd980bb9f569b10dabfc60075) | commit `65ca73beb62ef2afd980bb9f569b10dabfc60075`；MIT；Copyright (c) 2017 The boardgame.io Authors；该版本 `LICENSE` SHA-256：`516bc5dc1560ba43d2097b5f9b4029a23d073ac7feaa94979ac011f4f959620c` | 把回合规则写成纯状态迁移、明确阶段与顺序、让界面只消费公开投影这些工程抽象 | 包、API、插件、网络层、源码、测试、示例、文档原句、页面和视觉 |

## 平台规范

- [Pointer Events Level 3](https://www.w3.org/TR/pointerevents3/)：仅用于统一指针输入
  和 `pointercancel` 生命周期验收；
- [Page Visibility Level 2](https://www.w3.org/TR/page-visibility-2/)：仅用于页面隐藏
  时遮屏、恢复后等待显式继续的行为验收；
- [WCAG 2.2](https://www.w3.org/TR/WCAG22/)：仅用于键盘、焦点、非颜色信息、状态
  消息、目标尺寸和减少动态验收；
- [WHATWG HTML](https://html.spec.whatwg.org/)：仅用于经典脚本、原生按钮、焦点与
  `hidden` 的平台行为验收。

未复制上述规范的文字、IDL、示例代码或站点视觉。

## 独立实现边界

本作的公共季节牌堆、三类牌作用、逐轮花瓣值、开花与平局规则、状态机、随机数
生成、联合结算、公开投影、历史重放、中文文案、测试及后续 DOM/CSS 视觉均在本
仓库独立设计和实现。没有复制、改写、翻译、移植、打包或依赖上述项目的代码、
API、测试、规则原句、视觉、题材、图片、声音、字体、图标或其他资产。

如果未来实际引入第三方内容，必须在合并前单独审计并更新本文件，保留相应许可证、
版权主体、具体文件、改动说明和分发义务；不能继续沿用当前“零代码、零素材复制”
的结论。
