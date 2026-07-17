# 「我听见了」设计与阶段验收

> 日期：2026-07-17
> 当前结论：作品状态机、录音/重采样/Worker 客户端和缺能力前置页已完成；真实模型转写与离线 Gate 待模型安装后继续。

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
- 全仓测试：`224 / 224`；
- 作品核心阶段的仓库 verifier：`18` 个已登记作品、`1` 个能力声明通过；随后 catalog 与单作品启动器作为独立提交接入，登记总数更新为 `19`。

## Chrome 阶段验收

使用本地运行时 `http://localhost:4174` 验证未安装模型路径：

| Gate | 结果 |
| --- | --- |
| 桌面 1269px | 页面宽度与 viewport 相同，无横向溢出；命令和两个操作清晰可见 |
| 手机 390×844 | `scrollWidth = viewportWidth = 390`，`scrollHeight = viewportHeight = 844`，完整首屏无滚动 |
| 控制台 | `0 error / 0 warning` |
| 能力状态 | 显示 `141.1 MiB`、固定安装命令和重新检查，不自动下载 |
| D 级响应头 | `COOP: same-origin`、`COEP: require-corp`、`Origin-Agent-Cluster: ?1` |
| 作用域 | `lighthouse-passage` 响应不含上述隔离头 |

## 仍待完成的真实 Gate

- 安装固定 `ggml-base.bin` 并由 doctor 复核 147951465 bytes 与 SHA-256；
- Chrome 中确认 `crossOriginIsolated === true` 和 pthread 实际工作；
- 用麦克风完成两轮中文短句转写、编辑、确认与重开；
- 记录 12 秒音频实际推理耗时和内存表现；
- 拒绝权限、麦克风占用、页面隐藏和 12 秒自动停止的资源释放；
- 断开公网后 Network 只出现 localhost；
- Windows x64 仍需在对应机器实测，未实测前不宣称支持完成。
