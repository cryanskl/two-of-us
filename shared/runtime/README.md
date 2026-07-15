# 共享本地运行时

根目录的 `setup.command` / `setup.bat` 统一安装依赖，`start.command` / `start.bat` 启动本服务并打开门户。

运行时负责：

- 托管根门户、`experiences/` 与 `shared/` 下的本地静态资源；
- 提供 `/api/health` 与 `/api/catalog`；
- 选择可用端口并生成局域网地址和二维码；
- 提供 `room:create`、`room:join`、`room:leave`、`room:action` 与 `room:direct` 通用房间事件；
- 在进程退出时关闭连接并释放端口。

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

## 借鉴与依赖声明

本运行底座的目录组织、端口选择、静态文件边界、目录读取、房间状态管理、启动与停止流程均由本仓库独立实现。

`room:direct` 的同房间双重成员校验、服务端载荷重建和错误码协议根据本仓库 `docs/07-lan-pictionary-spec.md` 独立实现，没有复制第三方项目源码。

- 使用 [Socket.IO](https://github.com/socketio/socket.io) `4.8.1`（MIT）作为本地房间的实时传输依赖；本仓库通过其公开 API 建立连接和房间，没有复制或改写其示例源码、文档、视觉或素材。
- 使用 [node-qrcode](https://github.com/soldair/node-qrcode) `1.5.4`（MIT）在本机生成局域网入口二维码；本仓库通过其公开 API 生成 Data URL，没有复制或改写其示例源码、文档、视觉或素材。

依赖版本由根目录 `package-lock.json` 固定。实际分发时应同时保留依赖包自带的许可证文本；上述声明不能替代各依赖的许可证。
