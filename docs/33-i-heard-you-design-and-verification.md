# 「我听见了」设计与阶段验收

> 日期：2026-07-17
> 当前结论：作品、可选模型、WASM SIMD/pthread 和固定 WAV 真实转写已在 Chrome 完成；真人麦克风两轮交互、Windows x64 与断公网观测仍保留为明确 Gate。

## 视觉基准

[`assets/i-heard-you/concept.png`](./assets/i-heard-you/concept.png) 是本轮用 OpenAI ImageGen 生成的桌面/手机双视口概念图。它只用于确定暖象牙纸、深墨文字、珊瑚/鼠尾草双声轨、单一录音主控和可编辑草稿的方向，不进入作品运行依赖。

实现没有照搬位图，而是用语义 HTML、CSS 与内联 SVG 重建；缺模型前置页也沿用相同排版和色彩，避免 D 级能力错误落回通用开发者页面。

## 产品与数据状态

```text
intro
  → ready
  → recording
  → transcribing
  → review ── retry → ready
  → confirm round 1 → handoff → ready
  → confirm round 2 → complete
```

- 第一轮确认后进入遮挡交接，不显示第一句话；
- 第二轮确认后才同时展示两句文字；
- 转写草稿最多 200 字且必须由本人确认；
- 原始 PCM 不进入 session state，不进入浏览器持久化；
- 页面隐藏、异常或关闭会停止全部麦克风 track、关闭 AudioContext 并终止 Worker；
- 完成页“重新听彼此一次”通过重新加载清除两句内存文本并重新初始化能力。

## 音频管线

1. 用户主动点击后调用 `getUserMedia`；
2. AudioWorklet 复制单声道 Float32 PCM block；
3. 页面合并 block，并按采样区间加权平均到 16 kHz；
4. 12 秒上限对应最多 `192000` 个样本；
5. `Float32Array.buffer` 以 transferable 交给语音 Worker；
6. Worker 复用单个 whisper context，返回结构化文本与分段；
7. 重录、确认、隐藏或关闭时释放相应资源。

## 自动门禁

- `logic.test.js`：两轮顺序、交接遮挡、编辑/确认、空转写和失败恢复；
- `audio.test.js`：chunk 所有权、48 kHz → 16 kHz、12 秒截断与音量归一化；
- `speech-client.test.js`：manifest ID 映射、PCM transferable、dispose 和缺资产拒绝；
- 全仓测试：`229 / 229`；
- 仓库 verifier：`19` 个已登记作品、`1` 个能力声明、资源与借鉴声明全部通过。

## Chrome 阶段验收

使用本地运行时 `http://localhost:4174` 验证未安装模型路径：

| Gate | 结果 |
| --- | --- |
| 桌面 1269px | 页面宽度与 viewport 相同，无横向溢出；命令和两个操作清晰可见 |
| 手机 390×844 | 缺模型页 `scrollWidth = viewportWidth = 390` 且完整首屏无滚动；模型就绪页无横向溢出，页面高度 `864`，只需约 20px 纵向滚动 |
| 控制台 | `0 error / 0 warning` |
| 能力状态 | 显示 `141.1 MiB`、固定安装命令和重新检查，不自动下载 |
| D 级响应头 | `COOP: same-origin`、`COEP: require-corp`、`Origin-Agent-Cluster: ?1` |
| 作用域 | `lighthouse-passage` 响应不含上述隔离头 |

安装固定模型后继续验证：

| Gate | 结果 |
| --- | --- |
| doctor | `speech-whisper-base: available (OK)`；模型 `147951465` bytes / SHA-256 `60ed5bc3…a2efe` |
| 浏览器隔离 | `crossOriginIsolated === true`；`typeof SharedArrayBuffer === "function"` |
| pthread / SIMD | CMake 日志为 `Wasm detected`，编入 `arch/wasm/quants.c`；预热 4 个 pthread 后真实推理完成 |
| 固定输入 | whisper.cpp `v1.8.6` 自带 JFK WAV，16 kHz / mono / PCM16，`176000` 样本，约 11 秒；测试文件只在忽略的 `tmp/` 使用，不重新分发 |
| 真实输出 | `And so my fellow Americans, ask not what your country can do for you, ask what you can do for your country.` |
| 耗时 | 推理 `52307 ms`，含模型加载总耗时 `53434 ms`；当时机器另有高 CPU 负载，只作该次保守基线 |
| 桌面就绪页 | 模型成功加载后进入“第 1 句话 / 按下开始说”，主控制和隐私说明均可见 |
| 手机就绪页 | 390×844 无横向溢出，主控制完整可见；未触发麦克风权限 |
| 资源释放 | 固定 WAV 客户端在 `finally` 中 dispose；视觉验收后重新加载页面并关闭标签，释放模型 Worker |

## 仍待真人或目标平台完成的 Gate

- 用麦克风完成两轮中文短句转写、编辑、确认与重开；
- 拒绝权限、麦克风占用、页面隐藏和 12 秒自动停止的资源释放；
- 断开公网后 Network 只出现 localhost；
- Windows x64 仍需在对应机器实测，未实测前不宣称支持完成。

没有自动点击“允许麦克风”：固定 WAV Gate 不采集环境声音，权限与真人声音必须由使用者明确参与。核心运行资源的 URL 在 Worker 内仍被精确限制为同源 `/api/capabilities/...` 白名单，且不存在云 ASR fallback；断公网的浏览器 Network 证据仍需单独记录后才把离线 Gate 标为完成。
