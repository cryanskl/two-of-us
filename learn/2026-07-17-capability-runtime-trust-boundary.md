# 本地能力运行时：公开状态与大文件必须分层

## 适用范围

适用于“代码在仓库、模型或大型资源安装在用户数据目录”的本地优先 Web 能力，例如 ASR、TTS、本地模型与大型 3D 资源。

## 核心结论

### 1. 不要直接序列化内部 status

安装器为了诊断需要绝对安装路径、receipt、下载来源和 manifest 哈希；浏览器只需要状态、恢复动作、运行要求与安全资源链接。二者应通过显式 DTO 转换，而不是删除几个看起来敏感的字段。

公开状态应保留：

- capability ID 与 protocol version；
- `available / missing / corrupt / incompatible`；
- 稳定错误码与面向用户的简短说明；
- 权限、Worker、SIMD、内存等运行要求；
- artifact ID 与字节数；
- 仅在可用时提供的同源 URL。

不得公开绝对路径、receipt、安装时间、下载 URL 或完整 manifest。

### 2. 客户端提交 ID，不提交路径

模型路由采用：

```text
/api/capabilities/:capabilityId/artifacts/:artifactId
```

服务端从已验证 manifest 反查相对路径。这样客户端输入空间只有两个受限 ID，不能用 URL 参数请求任意磁盘文件。

即使 manifest 合法，也应继续验证真实路径包含关系、拒绝符号链接逃逸，并从同一个文件描述符完成 stat、SHA-256 与响应读取，避免检查后替换的时间差。

### 3. 状态正常不等于资源可直接发送

状态为 available 证明 receipt 与 artifact 通过完整校验；真正发送前仍要从已打开的文件复核大小与哈希。代价是首次加载多一次顺序读盘，但换来响应字节与已验证对象一致的强保证。

同一时刻的并发状态查询可以共享 Promise，避免门户和作品同时重复扫描大文件；不要做长期缓存，否则 CLI 安装、移除或损坏后会显示旧状态。

### 4. 大文件响应要有明确协议

- 仅 `GET` / `HEAD`；
- 支持单段 Range，拒绝多段 Range；
- 使用 `Accept-Ranges`、`Content-Range`、准确 `Content-Length`；
- `Cache-Control: private, no-store`；
- `X-Content-Type-Options: nosniff`；
- `Cross-Origin-Resource-Policy: same-origin`；
- missing/corrupt/incompatible 返回 `409`，未知 ID 返回 `404`。

这些约束既服务浏览器大文件加载，也让错误状态不会被误当成一个损坏的模型二进制。

## 验证方法

用临时小 artifact 覆盖完整文件、HEAD、前缀/开放/后缀 Range、越界与多段 Range、未知 ID、编码 traversal、模型缺失、文件 symlink 和能力目录 symlink。测试不需要下载真实大模型，但必须走与生产相同的 resolver 和文件描述符读取路径。

