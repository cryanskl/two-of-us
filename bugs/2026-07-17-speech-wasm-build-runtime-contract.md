# 语音 WASM 缺堆导出、目标识别与预热线程池

- 状态：fixed
- 日期：2026-07-17
- 范围：`speech-whisper-base` 可复现浏览器构建

## 现象

真实模型可以初始化，但首次转写先报 `Cannot read properties of undefined (reading 'buffer')`。补齐堆访问后，3 秒固定音频仍在 180 秒内不返回，Chrome 进程采样几乎没有计算负载。

## 根因

三个构建契约只在真实浏览器推理时同时暴露：

1. C++ typed-array 复制通过 `Module.HEAPU8` 访问 WASM 内存，而构建只导出了 `FS`；
2. Emscripten 4.0.23 向 CMake 报告 `x86`，whisper.cpp 因而跳过 `arch/wasm/quants.c` 并回退到通用内核；
3. 同步 `whisper_full` 开始后外层 Worker 被阻塞，动态创建 pthread 所需的消息处理无法及时完成，形成等待。

## 修复

- `EXPORTED_RUNTIME_METHODS` 显式包含 `HEAPU8`；
- 在加入固定 whisper.cpp 源码树前把 `CMAKE_SYSTEM_PROCESSOR` 设为 `wasm32`，构建日志必须出现 `Wasm detected`；
- 构建时预热固定 4 个 pthread，与运行时最大线程数一致；
- 从固定源码和工具链重新生成 JS/WASM，并更新字节数、SHA-256 与 CMake 输入哈希。

## 回归验证

Chrome 150 在真实 `ggml-base` 上完成 whisper.cpp 自带 JFK WAV：

- 16 kHz / mono / PCM16，176000 个样本，约 11 秒；
- 输出完整句子 `And so my fellow Americans ... ask what you can do for your country.`；
- 推理 `52307 ms`，含加载总耗时 `53434 ms`；
- `crossOriginIsolated === true`，`SharedArrayBuffer` 类型为 `function`。

测试时机器另有高 CPU 负载，因此耗时只作为该次受压环境基线，不作为所有设备承诺。
