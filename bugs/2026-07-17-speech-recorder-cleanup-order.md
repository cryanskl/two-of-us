# 语音录音清理顺序会清空待转写 PCM 或泄漏半初始化轨道

- 状态：fixed
- 日期：2026-07-17
- 范围：`experiences/co-op/i-heard-you/app.js`

## 现象

首版录音实现有两个互补的生命周期问题：

1. 停止录音后先调用统一清理，再合并 `recorder.chunks`；清理会把同一个数组长度设为 0，最终送给转写器的是空音频。
2. `getUserMedia()` 成功、但 AudioWorklet 加载或节点创建失败时，`recorder` 尚未赋值；统一清理看不到刚取得的 MediaStream，麦克风轨会继续存活。

## 根因

把“取得待转写数据所有权”和“释放采集资源”写成了相反顺序；同时只在完整初始化后才登记资源，忽略了半初始化失败路径。

## 修复

- 停止时先把所有 chunk 合并为独立 `Float32Array`，再关闭节点、轨道和 AudioContext；
- 初始化期间用 `pendingStream` / `pendingContext` 暂存已取得的资源；
- 完整 recorder 建立后清空 pending 引用；任何异常先释放 pending，再走统一清理；
- PCM 重采样并转交 Worker 后不再保留页面引用。

## 回归建议

浏览器验证同时检查正常停止、12 秒自动停止、拒绝权限、Worklet 加载失败和页面隐藏；DevTools 中麦克风指示应在每条路径结束后消失。
