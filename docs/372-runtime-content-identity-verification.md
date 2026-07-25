# 运行时内容身份修复验证

- 日期：2026-07-25
- 基线：`1169d67b1cee3dc6f5bd1a57b54867c06114d059`
- 分支：`codex/fix-runtime-content-identity`
- 结果：通过
- 规格：[`371-runtime-content-identity-plan.md`](./371-runtime-content-identity-plan.md)

## 交付结果

运行时复用现在同时验证三层身份：

1. `x-two-of-us-runtime: 1` 证明服务类型；
2. health `version: 1` 证明协议兼容；
3. health `contentIdentity` 与当前 launcher 计算的 expected identity 精确相等，证明 checkout 内容一致。

实现满足：

- 内容相同、绝对路径不同的两个根得到相同 SHA-256 identity；
- lock、catalog、共享 runtime、能力资源、vendor 或任一已安装作品文件变化都会改变 identity；
- dirty worktree 直接按当前字节计算，不依赖 `.git`、分支或提交号；
- 不同内容拒绝复用，但不结束旧进程，新 server 选择下一可用端口；
- health 只公开 `sha256:<digest>` 或 fail-closed 的 `null`，不公开绝对路径；
- 符号链接、缺失、读取错误、并发变化和无法证明身份均 fail closed；
- 运行中 checkout 发生变化后，旧 server 继续服务既有会话，但 health 不再提供可复用身份。

## 提交阶段

| 阶段 | 提交 | 内容 |
| --- | --- | --- |
| 规格与计划 | `f292cf7` | 明确身份范围、dirty 策略、fail-closed 与验收矩阵 |
| 红测 | `42864c7` | deterministic identity、probe、health、进程错复用测试 |
| 最小实现 | `197b3d2` | 内容哈希模块、launcher expected identity、probe 精确比对、health 暴露 |
| 存活证明补丁 | `352f6ca` | 运行中内容漂移时禁止复用，并记录 bug/learn |

最终验证文档作为独立收尾提交。

## 身份覆盖与算法

哈希使用 Node.js 标准库 SHA-256，输入由版本域、POSIX 仓库相对路径、文件长度和实际字节构成；每段带固定长度前缀，文件按 UTF-8 路径字节序排列。

覆盖：

- `package.json`、`package-lock.json`、根 `index.html`；
- `experiences/catalog.json`；
- catalog 中全部 `installed: true` 项的完整目录；
- 完整 `shared/`，因此共享 runtime 和所有 `/shared/*` 内容都在身份中；
- 完整 `capabilities/`；
- vendor 白名单对应的 Pannellum 实际文件；
- 共享能力运行时直接调用的 `scripts/capabilities-lib.mjs`。

用户数据目录和可选大模型不进入 checkout identity；它们继续由既有 capability manifest、固定字节数和 SHA-256 验证。

当前最终实现的一次实际计算：

```text
identity: sha256:fad5a36ae5017367a73f87720093b7f5ce6043b14bf8daf5515b9ab8a6a81663
elapsed: 228.1 ms
```

launcher 每次只计算一次启动 identity，并同时传给 probe 与新 server。已有 server 在 health probe 时重新计算一次 live witness；并发 health 共用同一个 in-flight 计算。probe 超时为 1000 ms，覆盖本机约 228 ms 的实际验证成本。

## 红测证据

在实现前运行内容身份、probe、server 和 launcher integration：

- 内容身份模块以 `ERR_MODULE_NOT_FOUND` 失败；
- health identity 断言失败；
- probe 仍接受 identity 缺失或不一致的同协议服务；
- 真实进程输出“已经在运行，正在复用”，错误打开旧端口；
- 定向结果为 19 项中 6 项失败。

这证明测试确实先捕获旧缺陷，而不是在实现后补写只会通过的断言。

## 自动验证

| 验证 | 最终结果 |
| --- | --- |
| `node --test scripts/content-identity.test.mjs scripts/runtime-reuse.test.mjs shared/runtime/server.test.js scripts/start-reuse.integration.test.mjs` | 23/23 通过 |
| deterministic 跨绝对根 identity | 通过 |
| lock/catalog/shared/installed/capability/vendor 逐层变更 | 全部改变 identity |
| 未安装作品目录变化 | identity 保持不变 |
| 符号链接与缺失文件 | fail closed，错误消息不含绝对根 |
| identity 缺失、无效、不等 | probe 拒绝且不读取 catalog |
| 协议不等、外部服务、重定向 | 继续拒绝 |
| 运行中 checkout 漂移或 identity 读取失败 | health 返回 `null`，server 保持存活 |
| `npm test` | 通过 |
| `npm run verify` | 通过；58 个入口、50 A、8 非 A、1 个能力声明 |

## 真实双 checkout 进程矩阵

验证脚本创建两份不含 `.git` 依赖的真实复制根，各自包含 package/lock、scripts、shared、58 项 experiences、capabilities 和 node_modules，并从各自根运行真实 `scripts/start.mjs`。

| 场景 | 结果 |
| --- | --- |
| checkout A 从首选端口 `47000` 启动 | 新 server 正常存活 |
| 内容相同的 checkout B 从 `47000` 启动 | 识别相同 identity，复用 A，第二 launcher 正常退出 |
| 给 B 的 `panorama-memory/index.html` 加 dirty marker 后再次启动 | 拒绝 A，B 在 `47001` 启动 |
| mismatch 后检查 A | A 仍存活，未被终止 |
| 分别请求两个入口 | A 不含 marker，B 含 marker |
| 比较 health | 两个 identity 不同，均不包含临时绝对路径 |
| 停止 A | `47000` 可重新监听，B 仍存活 |
| 停止 B | `47001` 可重新监听 |

最终脚本摘要：

```json
{"ports":[47000,47001],"sameContentReuse":true,"dirtyContentNextPort":true,"oldProcessPreserved":true,"noAbsolutePathLeak":true,"portsReleased":true}
```

## 范围与残余说明

- 没有修改生产 UI、Board、catalog、作品入口、共享索引或玩法逻辑；
- 没有新增 npm 依赖；
- 运行中内容变化不会强制结束既有会话，但该进程从变化发生后不再可复用；
- 每次复用会读取约 102 MB 的身份覆盖内容，这是本轮选择正确性优先、无持久缓存的明确成本；
- 文件系统在扫描期间变化会导致本次计算失败，用户可在写入完成后重新启动；
- 绝对路径可能存在于内部异常 `cause`，但 launcher 只打印清洗后的相对路径消息，health 与复用结果不返回该信息。

## 借鉴声明

本修复、测试夹具、双根进程矩阵、bug 分析和学习记录均为针对本仓库问题的独立工作。实现只使用 Node.js 标准库的文件系统、进程、HTTP 和 SHA-256 API，没有复制或改写其他开源项目的代码、页面、文案、视觉或素材，也没有新增第三方依赖。
