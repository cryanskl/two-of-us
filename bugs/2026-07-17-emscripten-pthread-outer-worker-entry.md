# Emscripten pthread 误把外层转写 Worker 当作线程入口

- 状态：fixed
- 日期：2026-07-17
- 范围：`speech-whisper-base` 浏览器 Worker

## 现象

把 Emscripten 生成的 pthread 引擎用 `importScripts()` 加载到应用自有的转写 Worker 后，引擎创建计算线程时默认使用 `self.location.href`。这个地址指向外层 `transcriber.worker.js`，而不是包含 Emscripten pthread 启动逻辑的 `speech-whisper.js`。真正开始多线程推理时会加载错误入口，线程无法进入 `em-pthread` 消息处理流程。

## 根因

Emscripten `4.0.23` 在 Worker 环境把 `_scriptName` 初始化为当前 Worker URL；`PThread.allocateUnusedWorker()` 默认用它创建名为 `em-pthread` 的子 Worker。`importScripts()` 不会改变 `self.location`。

## 修复

创建模块时显式传入：

```js
createSpeechWhisperModule({
  mainScriptUrlOrBlob: resources.engineJs,
  locateFile: () => resources.engineWasm,
});
```

`mainScriptUrlOrBlob` 让 pthread 子 Worker 加载固定引擎脚本；`locateFile` 让 WASM 仍走 manifest 白名单路由。两个 URL 都先验证为同源精确路径。

## 回归验证

- Worker 协议测试断言 `mainScriptUrlOrBlob` 等于 `engine-js` 白名单 URL；
- 断言 `.wasm` 解析到 `engine-wasm` 白名单 URL；
- 外部 origin 与路径变体在调用 `importScripts` 前被拒绝；
- Chrome 150 中固定 JFK WAV 已完成真实模型转写，证明外层 Worker、固定引擎入口与 pthread 子 Worker 能共同运行。
