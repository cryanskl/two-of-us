# 语音 Worker 资产缺少 COEP 导致 pthread 启动失败

- 状态：fixed
- 日期：2026-07-17
- 范围：`speech-whisper-base` 浏览器资产路由

## 现象

模型安装、doctor 和 D 级页面隔离头都正常；点击“准备本机语音”后，Chrome 仍触发 Worker `error`，最初只能看到“本地语音 Worker 意外停止”。

## 根因

顶层 HTML 的 `Cross-Origin-Embedder-Policy: require-corp` 只建立文档隔离环境。外层转写 Worker 还会作为 Emscripten pthread 子 Worker 的脚本入口；该脚本响应自身没有 COEP 时，嵌套线程环境无法延续所需的跨源隔离契约。

## 修复

- manifest 白名单内的浏览器 JS/WASM 路由增加 `Cross-Origin-Embedder-Policy: require-corp` 与 `Origin-Agent-Cluster: ?1`；
- 保留 `Cross-Origin-Resource-Policy: same-origin` 和 `nosniff`；
- 只修改能力浏览器资产路由，不把隔离头扩散到普通作品或模型大文件；
- Worker 启动错误在有安全消息时保留最多 180 字，便于本机诊断。

## 回归验证

- 路由测试断言浏览器资产响应头，普通 artifact 不要求 COEP；
- Chrome 中 `crossOriginIsolated === true`，`SharedArrayBuffer` 可用；
- 真实模型成功初始化并进入“第 1 句话 / 按下开始说”界面；
- `lighthouse-passage` 等非 D 级页面仍不带隔离头。
