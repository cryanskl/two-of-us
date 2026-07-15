# 共享本地运行时

根目录的 `setup.command` / `setup.bat` 统一安装依赖，`start.command` / `start.bat` 启动本服务并打开门户。

运行时负责：

- 托管根门户、`experiences/` 与 `shared/` 下的本地静态资源；
- 提供 `/api/health` 与 `/api/catalog`；
- 选择可用端口并生成局域网地址和二维码；
- 提供 `room:create`、`room:join`、`room:leave`、`room:action` 四类通用房间事件；
- 在进程退出时关闭连接并释放端口。

## 借鉴与依赖声明

本运行底座的目录组织、端口选择、静态文件边界、目录读取、房间状态管理、启动与停止流程均由本仓库独立实现。

- 使用 [Socket.IO](https://github.com/socketio/socket.io) `4.8.1`（MIT）作为本地房间的实时传输依赖；本仓库通过其公开 API 建立连接和房间，没有复制或改写其示例源码、文档、视觉或素材。
- 使用 [node-qrcode](https://github.com/soldair/node-qrcode) `1.5.4`（MIT）在本机生成局域网入口二维码；本仓库通过其公开 API 生成 Data URL，没有复制或改写其示例源码、文档、视觉或素材。

依赖版本由根目录 `package-lock.json` 固定。实际分发时应同时保留依赖包自带的许可证文本；上述声明不能替代各依赖的许可证。
