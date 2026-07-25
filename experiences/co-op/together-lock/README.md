# 同心解锁

一个 C 级双设备合作机关：两个人加入同一本地房间，同时按住各自屏幕上的按钮 2.5 秒，才能一起解锁。

## 启动

1. 首次在仓库根目录双击 `setup.command`（Windows 使用 `setup.bat`）；
2. 以后直接双击本目录的 `start.command` / `start.bat`，或从根目录统一门户进入；
3. 两台设备通过同一 Wi-Fi 打开门户中的“同心解锁”；
4. 一方创建房间，另一方输入五位房间码加入。

本作品不能从 `file://` 单独运行；它需要根目录的 C 级本地房间服务。运行时不需要公网账号、云数据库或外部 API。

## 标签

`双人合作` · `C 级` · `局域网双设备` · `触屏/鼠标` · `公网依赖：无`

## 借鉴与来源声明

玩法采用“双方同时按住按钮完成共同目标”的通用合作机关，由本仓库独立设计视觉、状态机和代码；未复制或改写任何第三方游戏的源码、视觉、音效或素材。

实时消息使用 [Socket.IO `4.8.1`](https://github.com/socketio/socket.io/tree/91e1c8b3584054db6072046404a24e79a17c1367/packages/socket.io)，由根目录共享运行时提供；固定版本采用 [MIT LICENSE](https://github.com/socketio/socket.io/blob/91e1c8b3584054db6072046404a24e79a17c1367/packages/socket.io/LICENSE)，`Copyright (c) 2014-present Guillermo Rauch and Socket.IO contributors`。作品只通过其公开客户端 API 调用本仓库的通用 `room:create`、`room:join`、`room:state` 与 `room:action` 协议，没有复制或改写 Socket.IO 示例源码、文档、视觉或素材。

依赖版本由根目录 `package-lock.json` 固定；实际分发时应保留依赖包自带的许可证文本与版权声明。
