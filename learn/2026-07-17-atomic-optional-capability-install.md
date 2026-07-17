# 大模型能力包：先证明 artifact，再写安装 receipt

## 适用范围

适用于本地模型、WASM、大型素材和原生运行时等不应进入基础安装的可选能力。它解决的是“下载中断或来源变化时，怎样不留下看似可用的半成品”。

## 关键结论

### 1. 依赖统一不等于全部塞进根依赖

A/B/C 作品不应因为一个 D 级语音体验而下载模型。统一的对象是 manifest schema、数据目录、安装命令、状态语义、哈希和清理协议；大型 artifact 仍按能力 ID 安装。

### 2. manifest 同时固定来源身份与文件身份

tag、commit 或模型 revision 说明“来自哪里”，字节数与 SHA-256 说明“实际收到什么”。两组证据不能互相替代。模型字段引用 artifact ID，并强制 bytes / sha256 完全一致，避免文档、模型卡和下载器各写一套值。

### 3. 正式目录只能出现完整安装

下载写入同一数据根下的隐藏 staging 目录与 `.part` 文件；每个 artifact 完成长度和 SHA-256 校验后才改名。全部 artifact 就绪后写 receipt，再用目录 rename 原子切换到正式 ID。失败只清 staging，不触碰已有可用版本。

### 4. receipt 要绑定 manifest 内容

receipt 不能只写版本号。保存 manifest 文件本身的 SHA-256、协议版本和每个 artifact 的 path / bytes / sha256，才能区分：

- `missing`：没有正式安装目录；
- `corrupt`：receipt、文件、长度或哈希损坏；
- `incompatible`：当前 manifest 或协议已经变化；
- `available`：receipt 和所有 artifact 与当前声明一致。

### 5. status 不应擅自修复

诊断发现普通文件占据安装路径、receipt 损坏或模型被修改时，只返回稳定错误码。自动删除可能覆盖用户手动放置的文件；修复与 remove 必须由用户显式触发。

## 验证清单

- 下载 URL 是否固定 revision，并只允许 HTTPS（loopback 测试除外）；
- Content-Length 缺失时是否仍用实际接收字节兜底；
- 长度过大、过小、连接中断和哈希错误是否都不产生正式目录；
- 写文件是否处理部分写入；
- 更新失败是否保留旧版本；
- doctor 是否区分 missing / corrupt / incompatible / available；
- remove 是否只删除指定能力目录；
- 大文件、receipt 与 `.part` 是否都不会误入 Git。
