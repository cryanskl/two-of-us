# 浏览器资产更新会误判已安装模型不兼容

- 状态：fixed
- 日期：2026-07-17
- 范围：可选能力 receipt 校验

## 现象

只重建仓库内的 `speech-whisper.js` 后，用户数据目录里的 `ggml-base.bin` 字节和 SHA-256 均未改变，但 doctor 返回 `MANIFEST_CHANGED`，作品要求重新安装约 142 MiB 模型。

## 根因

receipt 用整个 `manifest.json` 的 SHA-256 作为兼容门禁。manifest 同时包含仓库浏览器资产、运行要求和实际下载 artifact；任一非安装字段变化都会让完整哈希变化。

## 修复

- receipt 继续保存 manifest 哈希作为安装时来源记录，但不把它作为可用性门禁；
- 协议兼容由 `schemaVersion` / `protocolVersion` 约束；
- 已安装内容逐项核对 artifact 的 `id`、路径、字节数和 SHA-256；
- 仓库内浏览器资产仍在每次 doctor 时单独按 manifest 校验。

## 回归验证

新增测试先安装 fixture，再只修改 engine 版本和建议内存；doctor 仍返回 `available / OK`。artifact 清单、长度或哈希变化仍由现有 receipt 与文件校验拒绝。
