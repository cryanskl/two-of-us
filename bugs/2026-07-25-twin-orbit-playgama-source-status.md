# Bug：Playgama 隐藏条目被写成当前在架名称证据

- 状态：`fixed`
- 日期：2026-07-25
- 影响作品：`twin-orbit` 前置调研、来源审计与验收计划
- 发现版本 / commit：`87b82a4`

## 环境

- 操作系统：macOS
- 浏览器与版本：不适用；HTTP 来源状态复核
- 启动等级与入口：目标 A 级；尚无生产入口

## 复现步骤

1. 打开 `docs/305-twin-orbit-research.md` 和
   `docs/307-twin-orbit-attribution-dependency-audit.md` 的名称风险章节。
2. 直接请求 `https://playgama.com/game/twin-orbit`，不沿用搜索缓存或抓取快照。
3. 检查响应状态、Location 和 `x-bff-redirect-reason`。
4. 同时请求 Apple 官方
   `https://itunes.apple.com/lookup?id=6779551879&country=no` 作为当前一手对照。

## 预期结果

- 当前在架结论只由可复核的一手当前证据支持；
- 历史检索结果明确标成历史记录，不冒充当前可访问或在架页面；
- 名称避让结论说明由哪条当前证据单独支撑。

## 实际结果

初版把 Playgama 同名 URL 与 Apple App Store 并列为“至少两个当前游戏”的证据，
并在视觉 Gate 中把它写成当前作品。现场请求表明 Playgama URL 当前返回：

```text
HTTP 301
location: /category/space
x-bff-redirect-mechanism: category_fallback
x-bff-redirect-reason: game_hidden
```

Apple 官方 Lookup API 当前仍返回 `resultCount=1`，条目为 `Twin Orbit`
（id `6779551879`，2026-06-23 发布，版本 2.1，当前版本发布于 2026-07-16），
描述确为双火箭/双指街机玩法。

## 根因

首轮调研使用了检索系统读到的页面内容，却没有在最终声明前重新请求原 URL 并
检查重定向状态。结果把“曾检索到的内容”误写成“当前在架证据”。

## 解决方案

- 以 Apple 官方 Lookup API 的当前精确同名、同类游戏条目单独支撑名称避让；
- Playgama 只保留为 2026-07-25 首轮检索发现、当前已 hidden/redirect 的历史
  记录；
- 保留“不复刻反转双球/陨石生存组合”的版权与商业外观边界，但不据此主张
  当前在架、商标或权利状态；
- 同步修正 research、attribution audit 和 acceptance plan。

## 回归验证

- [x] Apple 官方 API 当前字段已复核
- [x] Playgama 301、Location 与 hidden 原因已复核
- [x] 本地 Markdown 链接检查通过
- [x] `git diff --check` 通过
- [x] `npm run verify` 通过

## 相关提交

- 本修复提交
