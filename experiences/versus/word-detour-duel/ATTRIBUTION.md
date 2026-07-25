# 绕词对决：借鉴与来源声明

## 独立创作

作品名称“绕词对决”、双人四回合结构、对称 schedule、共同复核流程、状态机、
代码、中文文案和 72 张目标词及禁用提示组合均由本仓库独立创作。

本作没有抓取、翻译、改写、洗牌或引入商业、社区、开源题库；没有引入第三方
开源代码、字体、图片、图标、音频、视频或运行依赖。

当前生产包为零第三方代码复制、零第三方资产复制。`config.js` 中的 72 张题卡、
三套 schedule 与页面上的路线、封路节点、图标和排版均由本仓库独立实现。

## 商业品牌与表达边界

前置研究查看以下一手商业、政府或标准来源，以界定抽象玩法、商标、版权、
无障碍与页面生命周期边界：

- [Hasbro 官方产品页](https://consumercare.hasbro.com/en-in/product/taboo-game/304C0329-5056-9047-F5D1-8C8A886E0D35)
- [Hasbro 官方成人版产品页](https://consumercare.hasbro.com/fr-fr/product/taboo-uncensored-party-game-for-adults-only-hilarious-adult-party-board-games-ages-18-plus/05AD73E2-B79E-412F-BEC2-6532441240FC)
- [Hasbro Virtual Rules PDF](https://www.hasbro.com/common/assets/Image/Printables/DAD261421C4311DDBD0B0800200C9A66/78216DB2356F4525A29F578AD0A56925/97751D1FE8714FF98F9807128516E74A.pdf?title=Taboo+-+Virtual+Rules)
- [USPTO：What is a trademark?](https://www.uspto.gov/trademarks/basics/what-trademark)
- [U.S. Copyright Office：Games](https://www.copyright.gov/register/tx-games.html)
- [U.S. Copyright Office Circular 33](https://www.copyright.gov/circs/circ33.pdf)
- [Web Speech API](https://webaudio.github.io/web-speech-api/)
- [W3C WCAG 2.2：Keyboard](https://www.w3.org/WAI/WCAG22/Understanding/keyboard.html)
- [W3C WCAG 2.2：Timing Adjustable](https://www.w3.org/WAI/WCAG22/Understanding/timing-adjustable.html)
- [W3C WCAG 2.2：Focus Visible](https://www.w3.org/WAI/WCAG22/Understanding/focus-visible.html)
- [W3C WCAG 2.2：Status Messages](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html)
- [W3C Technique C39：prefers-reduced-motion](https://www.w3.org/WAI/WCAG22/Techniques/css/C39)
- [WHATWG HTML：Page visibility](https://html.spec.whatwg.org/multipage/interaction.html#page-visibility)

实际只研究了“目标词 + 一组禁用提示 + 口头描述 + 猜词”这一抽象机制。本作
没有复制或改写商业品牌、规则文字、示例、题卡、卡面布局、蜂鸣器、视觉、音效、
包装、源码或素材，也不把自己描述为任何商业产品的网页版或双人版。

这些网页与标准不进入运行时；本作没有复制其中示例代码、文案、卡片或视觉。
当前没有第三方开源代码、素材或运行依赖，因此没有需要固定 commit/tag 的第三方
软件许可证。页面 URL 会随发布方维护，2026-07-25 复核时均可访问。

## 生产视觉与本地运行

生产界面采用仓库内 OpenAI ImageGen 概念图提出的“纸面路线改道指挥台”方向。
两张概念图只保存在 `docs/assets/` 作为设计证据，`file://` 运行时不加载它们；
实际路线、中央目标、四条封路与按钮图标均为 code-native 的 CSS、DOM 和内联 SVG。

页面不录音、不联网，也不保存对局。题库是本地明文，不属于加密内容：同机用户
仍可通过开发者工具查看 `config.js`。秘密词在合法阶段可能被读屏或系统朗读通过
扬声器播出，使用辅助技术时应佩戴耳机。刷新或关闭页面会丢失当前对局。

## 后续来源规则

如果后续阶段查看任何开源实现，必须先固定 commit 或 tag，核对 LICENSE、版权
主体和资源许可证，并补充实际借鉴与未复制范围；完成前不得合入相关实现。
