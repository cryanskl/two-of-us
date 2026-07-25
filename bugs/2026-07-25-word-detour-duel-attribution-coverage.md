# 绕词对决借鉴声明漏列实际研究来源

- 日期：2026-07-25
- 项目：`word-detour-duel`
- 影响范围：`ATTRIBUTION.md` 的可追溯性

## 现象

借鉴声明称“前置研究仅查看以下来源”，但列表漏掉 research 实际引用的：

- Hasbro 官方成人版产品页；
- Web Speech API；
- W3C WCAG 2.2 Keyboard；
- W3C WCAG 2.2 Timing Adjustable；
- W3C WCAG 2.2 Focus Visible；
- W3C WCAG 2.2 Status Messages；
- W3C Technique C39；
- WHATWG HTML Page visibility。

其中第二个 Hasbro 页面还直接支撑 research 对商标主体表述不一致的风险判断。

## 修复

借鉴声明现已完整列出 research 实际使用的一手商业、政府和标准来源，并明确：

- 只借鉴抽象机制与边界事实；
- 不复制页面文案、示例、题卡、代码或视觉；
- 所有页面都不进入运行时；
- 当前没有第三方开源代码/素材/依赖，所以没有需要固定 commit/tag 的第三方软件
  许可证；
- 2026-07-25 复核时所列 URL 均可访问。

这项修复补的是来源覆盖，不把官方/标准页面错误描述为开源运行依赖。
