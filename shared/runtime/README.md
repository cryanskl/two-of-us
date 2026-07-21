# 共享本地运行时

根目录的 `setup.command` / `setup.bat` 统一安装依赖，`start.command` / `start.bat` 启动本服务并打开门户。

每个已安装的 B/C/D 作品目录也提供同名启动器，完成一次根目录安装后可直接双击进入该作品。启动器始终调用仓库中的同一份 Node 运行时与根依赖，不在作品目录复制依赖。

运行时负责：

- 托管根门户、`experiences/` 与 `shared/` 下的本地静态资源；
- 提供 `/api/health`、`/api/catalog` 与本机限定的 `/api/capabilities`；
- 按 capability、artifact 与 browser asset ID 白名单提供已校验的本地资源，不公开真实目录；
- 选择可用端口并生成局域网地址和二维码；
- 提供 `room:create`、`room:join`、`room:leave`、`room:action`、`room:direct` 与密封轮次通用房间事件；
- 每个生产房间固定两席，第三个成员加入时返回 `ROOM_FULL`；
- 通过 `two-player-membership.js` 统一前两席、主机迁移、成员替换与退出判定；
- 在进程退出时关闭连接并释放端口。

## 启动与复用协议

运行时监听 IPv4 `0.0.0.0`，让本机和同一局域网的设备都能访问；本机入口固定公告为 `http://127.0.0.1:<port>/`，避免 `localhost` 在 IPv4/IPv6 间解析到不同服务。

重复启动时，启动器只顺序探测首选端口起最多 20 个候选。候选必须同时满足：

- `/api/health` 与 `/api/catalog` 都返回 `200`；
- 两个响应都有 `x-two-of-us-runtime: 1`；
- health 的服务名、协议版本、端口和 `localUrl` 精确匹配候选；
- catalog 完整通过仓库入口校验，且目标作品已安装并解析为同源地址。

通过后，第二个启动器只打开目标页面并正常退出；第一个进程继续拥有服务和退出信号。失败、超时、重定向、错误响应头或无关服务都会被忽略，随后按既有规则选择空闲端口新建运行时。这个 header 是本机服务识别标记，不是针对本机恶意进程的身份认证。

## 本地能力协议

`GET /api/capabilities` 只在 loopback 请求中返回脱敏能力状态。公开结果包含协议、状态、运行要求，以及模型和浏览器资产的 ID 与体积；不会返回绝对路径、receipt、安装时间、上游下载 URL 或哈希。模型未安装时仍返回体积，但所有 `href` 为 `null`，供 D 级前置页诚实说明安装预算。

能力可用后，浏览器可以按 manifest 白名单请求：

```text
GET|HEAD /api/capabilities/:capabilityId/artifacts/:artifactId
GET|HEAD /api/capabilities/:capabilityId/browser/:assetId
```

路由只接受小写短横线 ID，不接受文件路径。服务端从 manifest 反查用户数据目录中的模型或仓库能力目录中的固定 JS/WASM，完成 realpath 包含关系、符号链接、长度与 SHA-256 复核后才响应；模型支持完整文件与单段 Range。missing、corrupt 或 incompatible 返回 `409`，未知 ID 返回 `404`，非本机请求返回 `403`。

所有 JSON API 只允许 `GET` / `HEAD`。HEAD 保留与 GET 相同的 header 和 `Content-Length`，但不写 body；其他方法返回 `405` 与 `Allow: GET, HEAD`。

## 房间消息协议

`room:action` 向同房间的其他成员广播公开操作。`room:direct` 用于题目、猜测、身份牌等只应交给单个成员的消息：

```js
socket.emit("room:direct", {
  roomId,
  targetId,
  type,
  data,
}, callback);
```

运行时验证发送者与 `targetId` 都属于 `roomId`，然后只向目标 socket 发送由服务端重建的载荷：

```js
{
  roomId,
  senderId,
  type,
  data,
}
```

`type` 与 `room:action` 一样被转换为字符串并截断到 48 个字符，缺省为 `action`；缺省 `data` 为 `null`。成功 callback 为 `{ ok: true }`，失败为 `{ ok: false, error: { code, message } }`。发送者不在房间时返回 `NOT_A_MEMBER`，目标不在同一房间时返回 `TARGET_NOT_IN_ROOM`。客户端提供的 `senderId` 不会被信任或转发。

## 密封轮次协议

`room:sealed-submit` 用于双方必须先各自提交、收齐后才能一起揭晓的选择：

```js
socket.emit("room:sealed-submit", {
  roomId,
  namespace: "sealed-rps",
  roundId: "match1-round1",
  data: { choice: "rock" },
}, callback);
```

第一份提交的 callback 只包含 `{ ok: true, pending: true }`，不会返回任何秘密。两位冻结参与者都提交后，运行时分别向这两个 socket 发送：

```js
{
  roomId,
  namespace,
  roundId,
  submissions: [
    { memberId, data },
    { memberId, data },
  ],
}
```

同一成员的同值重试是幂等操作，改值会返回 `SEALED_ALREADY_SUBMITTED`；完成轮次不会二次发送结果。第三人不能提交，也不会收到结果。成员离开时只清理包含该成员的冻结轮次；房间为空时再清理该房间的全部密封轮次，避免无关成员退出误删两位玩家的待揭晓答案。

这个协议是“玩家浏览器之间密封、信任本机 Node 裁判”，不是端到端加密或密码学 commit–reveal。本机进程能读取提交内容；它只适用于用户自己控制的可信局域网主机。

## 借鉴与依赖声明

本运行底座的目录组织、端口选择、静态文件边界、目录读取、房间状态管理、启动与停止流程均由本仓库独立实现。

`room:direct` 的同房间双重成员校验、服务端载荷重建和错误码协议根据本仓库 `docs/07-lan-pictionary-spec.md` 独立实现，没有复制第三方项目源码。

`two-player-membership.js` 是本仓库从“连心四子棋”和“密封猜拳”的重复席位 Gate 中提取的内部 helper；它不包含任何具体游戏状态、计分或回合规则。

密封轮次 registry 根据本仓库 `docs/12-sealed-rps-spec.md` 独立实现；没有引入或复制 `boardgame.io` 的 reducer、服务器、Lobby、插件或 UI 代码。

- 使用 [Socket.IO](https://github.com/socketio/socket.io) `4.8.1`（MIT）作为本地房间的实时传输依赖；本仓库通过其公开 API 建立连接和房间，没有复制或改写其示例源码、文档、视觉或素材。
- 使用 [node-qrcode](https://github.com/soldair/node-qrcode) `1.5.4`（MIT）在本机生成局域网入口二维码；本仓库通过其公开 API 生成 Data URL，没有复制或改写其示例源码、文档、视觉或素材。

依赖版本由根目录 `package-lock.json` 固定。实际分发时应同时保留依赖包自带的许可证文本；上述声明不能替代各依赖的许可证。
