# `localhost` 地址族错配可能误开 IPv6 外部服务

- 日期：2026-07-21
- 状态：已修复，待最终浏览器验收
- 影响范围：共享 B/C/D 本地运行时的公告、重复启动探测与浏览器打开地址
- 发现阶段：B/C/D 作品直达启动器与已有运行时复用独立审查

## 环境与复现

- macOS；Node `v22.22.3`；`localhost` 同时解析为 `::1` 与 `127.0.0.1`，IPv6 在前；
- 在同一随机端口分别启动：
  - 绑定 `::1` 且 `ipv6Only:true` 的模拟外部服务；
  - 绑定 `0.0.0.0` 的模拟 Two of Us IPv4 服务；
- 请求 `http://localhost:<port>/`。

实际复现结果：

```json
{
  "dns": [
    { "address": "::1", "family": 6 },
    { "address": "127.0.0.1", "family": 4 }
  ],
  "result": "ipv6-foreign"
}
```

两个 listener 可以同时占用同一数值端口；`localhost` 请求命中了 IPv6 外部服务，而不是 Two of Us 的 IPv4 listener。

## 预期与实际

- 预期：本机入口、health identity 和重复启动探测始终命中刚启动的 Two of Us；
- 实际：运行时绑定 `0.0.0.0`，却公告和探测 `localhost`。在 IPv6 优先/仅命中 `::1` 的环境中，探测可能漏掉已有运行时；若同端口存在 IPv6-only 服务，浏览器甚至可能打开它。

## 根因

监听地址族与公告地址族没有形成同一合同：

- listener 明确是 IPv4 wildcard；
- `localhost` 是名称而不是地址族保证，解析顺序受 OS、hosts、Node 版本和网络配置影响；
- 原测试显式使用 `127.0.0.1` 或依赖当前 Node 的 fallback，没有构造同端口 IPv4/IPv6 双 listener。

## 修复

1. 本机 `localUrl`、health、候选扫描和目标打开统一改为 `http://127.0.0.1:<port>/`；
2. listener 继续使用 `0.0.0.0`，C 级局域网地址仍由真实 IPv4 网卡生成；
3. 新增真实 socket 回归：同端口存在 IPv6-only foreign service 时，`details.localUrl` 仍命中 IPv4 Two of Us；
4. 同步修订 Brainstorm、可执行规格与实施计划，不再把 `localhost` 当作确定的 loopback 族。

## 回归验证

- runtime reuse 纯函数与真实进程测试必须全部使用 canonical `127.0.0.1`；
- 双地址族测试分别请求 `127.0.0.1` 与 `[::1]`，证明两个服务可区分；
- 整仓测试、仓库校验和最终 Browser/IAB 仍需通过。

## 相关提交

- 原规格：`558fb1c docs: specify reusable direct launchers`
- 修复实现：与“已有运行时复用”核心提交一同落库；该提交本身即为修复边界。
