# 本地图片体验中的 Object URL 单一所有权

## 结论

同一张本地派生图供多个 UI 消费者使用时，不要为每个消费者分别创建 Object URL。
让图片管理器成为唯一所有者，预览和所有棋盘共同引用一个 active URL；替换时先完成
引用切换，再释放旧 URL。

## 可复用协议

1. 候选任务取得递增 generation。
2. 新图片在内存中完成校验、裁切和编码，旧 active 图片持续可用。
3. 只有 generation 仍为当前值时才创建或提交 candidate URL。
4. 先将预览和所有图块切到 candidate，再把 candidate 设为 active。
5. 下一帧确认旧 URL 已不再被消费者引用，之后调用 `revokeObjectURL(oldUrl)`。
6. 迟到候选立即 revoke，不得覆盖更新的 active 图片。
7. 失败只改变候选状态，不能释放或改写 active 图片。
8. `pagehide` / `beforeunload` 清空引用并幂等释放所有自有 URL。

核心状态只保存 `kind/status/generation/errorCode`。File、ImageBitmap、Blob 和 URL
留在 UI 私有资源层，避免把不可序列化对象或本地标识混入业务状态。

## 适用边界

适用于本地点开的头像裁切、双板拼图、拼贴预览和单页图片工具。若图片需要跨页面、
跨会话、上传或持久化，此协议仍能管理当前页面内资源，但不能替代服务端权限、加密、
缓存淘汰或持久存储设计。

## 本项目证据

- 默认图和本地照片走同一 Blob URL 路径。
- 左右棋盘与 setup 预览共享唯一 active URL。
- 换图、恢复内置图、过期候选和页面离开分别有显式释放路径。
- `ImageBitmap.close()` 位于 `finally`，尺寸拒绝、编码失败和过期任务也会执行。
- 静态合同禁止把文件名、Blob URL、EXIF/GPS 或内部错误写进公开文案与核心状态。
