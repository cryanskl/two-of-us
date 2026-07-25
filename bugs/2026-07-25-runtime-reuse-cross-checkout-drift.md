# Bug：运行时复用会接受另一 checkout 的同协议内容

- 状态：`investigating`
- 日期：2026-07-25
- 影响作品：全部通过共享 HTTP 运行时启动的 B / C / D 级作品，以及从根入口启动的作品
- 发现版本 / commit：`260c0bfcde8adcd1c5e119cab88f1b9e19117703`

## 环境

- 操作系统：macOS
- 浏览器与版本：不涉及；使用 Node.js 真实 loopback HTTP 探针
- 启动等级与入口：B / C / D，`scripts/start.mjs`

## 复现步骤

1. 在 loopback 随机端口启动一个最小 HTTP 服务，使 `/api/health` 返回当前协议要求的 `x-two-of-us-runtime: 1`、`service: "two-of-us"`、`version: 1`、端口和本机 URL。
2. 让同一服务的 `/api/catalog` 返回 schema 合法、包含 `panorama-memory` 的 catalog，但将标题和描述标记为来自另一 checkout；作品入口返回 `<title>STALE CHECKOUT MARKER</title>`。
3. 调用 `probeRuntimeCandidate(baseUrl, "panorama-memory")`，再请求它返回的 `openUrl`。

## 预期结果

启动器只能复用与当前 checkout 内容身份一致的运行时。协议相同但来源 checkout、catalog 或静态内容不同的进程应被拒绝，当前 checkout 应另启端口。

## 实际结果

探针返回非空结果，`openUrl` 随后取得 `STALE CHECKOUT MARKER`。当前身份检查只能证明“这是一个兼容 Two of Us 协议的本机进程”，不能证明“它正在提供本次双击所在 checkout 的内容”。

## 根因

`scripts/runtime-reuse.mjs` 只核对固定响应头、协议版本、候选端口、本机 URL、catalog schema 和目标 ID。`shared/runtime/server.js` 的 health 响应没有当前内容身份，探针也没有来自当前 checkout 的 expected identity 可比较。

因此在多 worktree、切换分支后仍存活的旧进程或两个不同副本并存时，第二个启动器可能静默打开另一份仓库的页面。当前 integration test 只验证同一 `projectRoot` 的顺序复用，没有覆盖跨 checkout 内容漂移。

## 解决方案

本审计分支按约束不修改共享运行时。建议由总控串行完成最小修复：

1. 在运行时启动前计算稳定的 `contentIdentity`，至少覆盖 `package-lock.json`、`experiences/catalog.json`、共享运行时和所有可服务作品文件；仅用 worktree 路径哈希不足以识别同一路径更新后的旧进程。
2. health 在现有协议版本下返回该身份，当前启动器计算 expected identity 并要求精确相等后才复用。
3. 若担心每次启动遍历成本，可在交付/安装阶段生成受版本控制的内容清单，再对清单做哈希；脏工作区仍需明确策略，不能默认为已提交内容。
4. 增加两个真实进程或临时根目录的 integration case：同内容身份可复用，不同内容身份必须跳到下一端口。

这不是本机恶意进程认证方案；随机 secret 或操作系统级访问控制属于更强的另一层威胁模型。

## 回归验证

- [x] 原始复现路径稳定通过并取得另一 checkout 标记
- [x] 已确认当前探针和 integration test 没有内容身份字段
- [ ] 修复后不同内容身份必须拒绝复用
- [ ] 修复后相同内容身份仍只保留一个服务进程
- [ ] `npm test` 与 `npm run verify` 通过

## 借鉴与来源声明

本记录只分析 Two of Us 仓库内部运行时协议与临时自建 HTTP 夹具，没有参考、复制或改写新的第三方开源项目、示例代码、文档、视觉或素材。

## 相关提交

- 待总控修复后补充
