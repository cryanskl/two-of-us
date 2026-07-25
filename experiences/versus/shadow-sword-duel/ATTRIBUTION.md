# “影子剑术”借鉴与来源声明

“影子剑术”是本仓库独立设计和实现的本地热座策略对抗。当前生产页面与核心
不安装、链接、打包、复制或改写任何第三方源码、测试、框架或素材。

## 固定调研来源

许可证载体 SHA-256 是 2026-07-25 从固定 commit 或官方许可证页面获取内容的
研究证据；这些许可证文件没有复制进生产目录。

### OpenSpiel

- 固定源码：[`google-deepmind/open_spiel@112b77704631fc2ce7ad8e4581f6ca09798ce15a`](https://github.com/google-deepmind/open_spiel/tree/112b77704631fc2ce7ad8e4581f6ca09798ce15a)
- 许可证：[Apache-2.0 LICENSE](https://github.com/google-deepmind/open_spiel/blob/112b77704631fc2ce7ad8e4581f6ca09798ce15a/LICENSE)
- 许可证载体 SHA-256：`cfc7749b96f63bd31c3c42b5c471bf756814053e847c10f3eb003417bc523d30`
- 权利主体：OpenSpiel authors/contributors；固定源码文件包含
  `Copyright 2021 DeepMind Technologies Limited`
- 本作仅借鉴：simultaneous move、joint action、sequential encoding 的通用
  建模术语；
- 明确未复制：源码、API、算法实现、测试、示例游戏、目录、文案和素材。

### boardgame.io

- 固定源码：[`boardgameio/boardgame.io@65ca73beb62ef2afd980bb9f569b10dabfc60075`](https://github.com/boardgameio/boardgame.io/tree/65ca73beb62ef2afd980bb9f569b10dabfc60075)
- 许可证：[MIT LICENSE](https://github.com/boardgameio/boardgame.io/blob/65ca73beb62ef2afd980bb9f569b10dabfc60075/LICENSE)
- 许可证载体 SHA-256：`516bc5dc1560ba43d2097b5f9b4029a23d073ac7feaa94979ac011f4f959620c`
- 版权：许可证原文为 `Copyright (c) 2017 The boardgame.io Authors.`；
  统一排印可写作 `Copyright © 2017 The boardgame.io Authors`
- 本作仅借鉴：phases、state log、time travel 的公开产品描述；
- 明确未复制：框架、源码、目录结构、组件、示例、CSS、测试和资源。

### PrinceJS

- 固定源码：[`oklemenz/PrinceJS@ea1a97a763ac78fee5b35129e2841ef31531328e`](https://github.com/oklemenz/PrinceJS/tree/ea1a97a763ac78fee5b35129e2841ef31531328e)
- 许可证：[Unlicense LICENSE](https://github.com/oklemenz/PrinceJS/blob/ea1a97a763ac78fee5b35129e2841ef31531328e/LICENSE)
- 许可证载体 SHA-256：`ca2abdf695884c77ea4b4a5b64ca7b732d9d9dbade4eebc1c2e76c53e9e3bc83`
- 权利说明：LICENSE 没有具名 Copyright 行；作者以 Unlicense 将软件权利投入
  public domain
- 本作仅用于确认：“实时移动、格挡、出剑”属于被排除的更重产品路线；
- 明确未复制：全部代码和 API；Prince of Persia 名称、角色、故事、关卡、地图、
  精灵、图像、音频、品牌、trade dress 和仓库内第三方资产。

### W3C WCAG 2.2

- 固定标准：[WCAG 2.2 Recommendation，2024-12-12](https://www.w3.org/TR/2024/REC-WCAG22-20241212/)
- 许可证：[W3C Document License 2023](https://www.w3.org/copyright/document-license-2023/)
- 许可证页面 SHA-256：`baf4bd39646bca6636f035e16aefd82b2ae0a04ae1aa58ded96922c3c1bcd752`
- 版权：`Copyright © 2020–2024 W3C`
- 本作仅用于：键盘、焦点、状态消息、目标尺寸与减少运动的标准校准；
- 明确未复制：规范原文、示例代码、测试、图片、视觉样式和认证声明。

## 独立实现与品牌边界

本作的攻、防、闪、蓄力规则，先机、气与体力资源，九回合终止，秘密双份选择、
联合结算、状态机、历史重放、公开投影、测试、中文文案与后续视觉均由本仓库独立
编写。当前是概念参考、零第三方运行依赖、零第三方代码复制、零第三方资产复制。

PrinceJS 的 Unlicense 不等于《Prince of Persia》商业品牌、原作设计、角色、故事、
关卡、地图、精灵、图像、音频或仓库内第三方资产获得再分发许可。本作不使用这些
名称、表达或内容，也不把 PrinceJS 作为生产依赖。

生成资产：无。现有三张 ImageGen 设计概念只用于 `docs/` 评审，不是生产运行时
素材；提示、尺寸和 SHA-256 见 `docs/assets/shadow-sword-duel/GENERATION.md`。
若未来实际引入第三方或生成内容，必须记录具体文件、来源/提示词、版本、许可证、
修改说明与 SHA-256，并重新核对分发义务。
