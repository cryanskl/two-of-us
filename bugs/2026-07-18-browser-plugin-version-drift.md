# 浏览器验证：插件运行时与故障文档版本漂移

- 状态：`wont-fix`
- 日期：2026-07-18
- 影响作品：本轮所有需要应用内浏览器 / Chrome MCP 的 UI 验收
- 发现版本 / commit：外部 Codex 插件环境，不属于仓库提交

## 环境

- 本机已发现插件目录：`openai-bundled/browser/26.715.31251`；
- 浏览器运行时故障文档解析目录：`openai-bundled/browser/26.715.21425`；
- 仓库：two-of-us。

## 复现步骤

1. 按 Browser 技能初始化当前插件的 `browser-client.mjs`；
2. 请求默认浏览器或 Chrome extension；
3. 按故障流程读取 `bootstrap-troubleshooting` / `chrome-troubleshooting`。

## 预期结果

获得应用内浏览器或 Chrome 绑定；失败时至少能读取同版本故障说明。

## 实际结果

浏览器选择报告 `No browser is available` / `Browser is not available: extension`；故障说明读取又因为版本目录漂移返回 `ENOENT`。

## 根因

当前外部插件注册版本、运行时内部资源版本与故障文档路径不一致。仓库代码无法修复 Codex 插件缓存或浏览器扩展连接。

## 解决方案

不修改仓库或插件缓存；记录失败证据后，按技能回退到 `playwright-cli` headed Chromium。CLI 的顶层 `open file://` 有协议限制，因此先打开空白页，再在受控页面用 `page.goto(file://...)` 真实导航；随后用 snapshot、click、request、console 和 screenshot 完成同等验收。

## 回归验证

- [x] headed Chromium 成功加载六个本地资源；
- [x] 完整交互、响应式、控制台和截图验收完成；
- [x] 未改写插件、用户浏览器配置或仓库启动方式。

## 相关提交

- 外部环境问题；仓库内只保留本记录与验收回退说明。
