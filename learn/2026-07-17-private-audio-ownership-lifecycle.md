# 私密音频管线要显式转移所有权

## 适用范围

浏览器内采集麦克风 PCM、交给 Worker 做本地推理，并要求不保存私人录音的体验。

## 核心结论

资源释放不能只写一个笼统的 `cleanup()`；需要明确每一步谁拥有数据：

```text
MediaStream / AudioContext
  → AudioWorklet chunks
  → 独立 merged Float32Array
  → resampled Float32Array
  → Worker transferable
  → WASM 调用临时 vector
```

- 采集资源可能在初始化中途失败，所以完整 recorder 之外还要追踪 pending stream/context；
- 停止时先复制出下一阶段需要的数据，再释放上一阶段资源；
- 使用 transferable 后页面的 ArrayBuffer 会被 detach，这是预期的所有权转移，不应再读取；
- 产品状态只保存本人确认的文本，不要把 PCM、Blob 或设备对象混进 reducer；
- `pagehide` 与隐藏页面是独立于按钮的释放路径，必须覆盖；
- 自动停止、权限拒绝、Worklet 失败和正常确认都要验证麦克风指示消失。

这套边界比“转写结束后清变量”更强：即使推理报错或页面中途离开，上一层资源也已经按所有权顺序释放。
