# 在应用 Worker 中加载 Emscripten pthread 模块

## 适用范围

页面为了不阻塞 UI，把同步 WASM 推理放在应用 Worker 中，而 WASM 模块内部又使用 pthread 子 Worker。

## 关键结论

这时存在两层 Worker：外层负责产品协议、资源生命周期和错误恢复，内层由 Emscripten 管理计算线程。两层入口不能混用。

- `importScripts(engine.js)` 只执行脚本，不会把外层 Worker 的 `self.location` 改成引擎 URL；
- Emscripten 默认可能把当前 Worker URL当作 pthread 入口；
- 创建模块时应把固定引擎 URL 传给 `mainScriptUrlOrBlob`；
- WASM 地址继续通过 `locateFile` 指向白名单资源；
- 顶层文档必须有 COOP/COEP，模型与引擎资源还要满足同源或 CORP；
- 被作为 pthread 入口的引擎脚本响应自身也要带 COEP，不能只隔离顶层 HTML；
- 同步推理前预热有界 pthread 池，避免动态启动与阻塞调用互相等待；
- 隔离响应头应按作品路径最小化作用域，避免无意改变其他页面。

## 验证方式

单元测试可以用虚拟 Worker 环境捕获模块工厂参数和资源 URL；浏览器 Gate 仍需检查 `crossOriginIsolated === true`、pthread 实际创建、固定非私人 WAV 推理完成，以及 Network 中没有非 localhost 请求。
