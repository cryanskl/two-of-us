# 运行中 checkout 变化会使启动时内容身份陈旧

- 日期：2026-07-25
- 状态：已修复
- 影响：运行时复用的内容一致性
- 修复分支：`codex/fix-runtime-content-identity`

## 现象

初版 `contentIdentity` 在 launcher 启动时计算一次，随后由运行时持续通过 health 返回。若该运行时所服务的 checkout 在进程存活期间发生 dirty 修改，静态服务会直接读到新文件，但 health 仍声称启动时的旧身份。

此时另一个仍保留旧内容的 checkout 会计算出旧身份，并可能错误复用这个已经在提供新静态字节的进程。

## 根因

启动时摘要只能证明“进程启动时磁盘内容”，不能持续证明“当前进程仍对应这份内容”。共享运行时代码已经加载进内存，而静态作品文件仍从磁盘实时读取；运行时不能在内容变化后简单把 health 身份更新为新摘要，否则会把旧的内存代码错误声明为新运行时。

## 解决方案

- 保留启动时 identity 作为进程身份；
- 每次 health 身份探测重新计算当前 checkout identity；
- 只有当前 identity 仍与启动 identity 精确相等时才返回可复用摘要；
- 内容漂移、格式无效或读取失败时返回 `contentIdentity: null`，使 probe fail closed；
- 不终止现有进程；它可以继续服务当前会话，但不会被任何新 launcher 复用；
- 同一时刻的重复 health 请求共用一次 in-flight 计算；
- probe 超时从 250 ms 调整为 1000 ms，为约 102 MB 内容验证留出余量。

## 回归验证

server integration test 使用可控 identity provider 验证：

1. 当前身份等于启动身份时 health 返回摘要；
2. 当前身份变化后 health 返回 `null`；
3. identity 读取失败时 health 仍返回 `null`；
4. 两种失配都不停止既有 server。

本修复为仓库特定实现，没有借鉴或复制其他开源项目代码。
