# “影子剑术”借鉴与来源声明

“影子剑术”是本仓库独立设计和实现的本地热座策略对抗。当前生产核心不安装、
链接、打包、复制或改写任何第三方源码、测试、框架或素材。

## 固定调研来源

| 来源 | 固定版本与许可证 | 本作仅借鉴 | 明确未复制或引入 |
| --- | --- | --- | --- |
| [OpenSpiel](https://github.com/google-deepmind/open_spiel/tree/112b77704631fc2ce7ad8e4581f6ca09798ce15a) | commit `112b77704631fc2ce7ad8e4581f6ca09798ce15a`；Apache-2.0；OpenSpiel authors/contributors | simultaneous move、joint action、sequential encoding 的通用建模术语 | 源码、API、算法实现、测试、示例游戏和文案 |
| [boardgame.io](https://github.com/boardgameio/boardgame.io/tree/65ca73beb62ef2afd980bb9f569b10dabfc60075) | commit `65ca73beb62ef2afd980bb9f569b10dabfc60075`；MIT；Copyright © 2017 The boardgame.io Authors | phases、state log、time travel 的公开产品描述 | 框架、源码、目录结构、组件、示例、CSS 和资源 |
| [PrinceJS](https://github.com/oklemenz/PrinceJS/tree/ea1a97a763ac78fee5b35129e2841ef31531328e) | commit `ea1a97a763ac78fee5b35129e2841ef31531328e`；Unlicense | 只用于确认“实时移动、格挡、出剑”属于被排除的更重产品路线 | 全部代码；Prince of Persia 名称、角色、故事、关卡、地图、精灵、图像、音频和第三方资产 |
| [W3C WCAG 2.2](https://www.w3.org/TR/WCAG22/) | W3C Recommendation，2024-12-12；W3C Document License 2023；© 2020–2024 W3C | 键盘、焦点、状态消息、目标尺寸与减少运动的标准校准 | 规范原文、示例代码、测试、图片、视觉样式和“已获认证”声明 |

## 独立实现与品牌边界

本作的攻、防、闪、蓄力规则，先机、气与体力资源，九回合终止，秘密双份选择、
联合结算、状态机、历史重放、公开投影、测试、中文文案与后续视觉均由本仓库独立
编写。当前是概念参考、零第三方代码复制、零第三方资产复制。

PrinceJS 的 Unlicense 不等于《Prince of Persia》商业品牌、原作设计、角色、故事、
关卡、地图、精灵、图像、音频或仓库内第三方资产获得再分发许可。本作不使用这些
名称、表达或内容，也不把 PrinceJS 作为生产依赖。

生成资产：无。现有设计概念只用于 `docs/` 评审，不是生产运行时素材。若未来实际
引入第三方或生成内容，必须记录具体文件、来源/提示词、版本、许可证、修改说明与
SHA-256，并重新核对分发义务。
