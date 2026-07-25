# kaleidoscope-names 标准来源链接漂移

## 现象

`docs/259-kaleidoscope-names-research.md` 与作品 `ATTRIBUTION.md` 使用
`https://www.w3.org/TR/pointerevents/`，同时把该链接标注为
“Recommendation，2026-06-30”。截至 2026-07-25，该通用链接已经指向
Pointer Events Level 4 Working Draft；真正对应 2026-06-30 Recommendation
的是固定 Level 3 URL：
`https://www.w3.org/TR/pointerevents3/`。

同一来源表把 Media Queries Level 5 Working Draft 写成 2026-02-10，官方
技术报告页的发布日期实际为 2026-02-19。

## 影响

- 来源标签与链接实际落点不一致，后续复核会把草案误当 Recommendation；
- 可变通用链接无法稳定证明当时采用的规范层级；
- 错误日期降低借鉴声明与许可证审计的可追溯性。

此问题不影响当前纯逻辑运行时，也没有引入任何第三方代码或资产。

## 原因

研究阶段记录了当时想引用的 Level 3 状态，却保留了会跟随最新版本移动的
Pointer Events 通用 URL；Media Queries 日期则是人工转录错误。

## 修复

1. 将 Pointer Events 链接固定为 Level 3 Recommendation URL，并在研究与
   `ATTRIBUTION.md` 同步标出 2026-06-30；
2. 将 Media Queries Level 5 日期更正为 2026-02-19；
3. 在借鉴声明中补充“只链接、不复制文本/示例/资产、不再分发标准正文”，并
   保留 W3C 原始版权与文档许可证链接。

## 验证

2026-07-25 直接检查 W3C 一手页面：

- Pointer Events Level 3 页面标注 `W3C Recommendation 30 June 2026`；
- Media Queries Level 5 页面标注 `W3C Working Draft, 19 February 2026`；
- Media Queries 页面版权区链接到 W3C Software and Document License。

仓库检索确认 `kaleidoscope-names` 的来源说明不再把通用 Pointer Events URL
标为 2026-06-30 Recommendation，也不再出现错误的 2026-02-10 日期。
