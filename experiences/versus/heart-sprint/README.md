# 心跳冲刺

一个 C 级局域网双设备实时对抗游戏。两个人从手机或电脑浏览器加入同一个本地房间，连续点击各自的“为我加速”按钮推动心形跑者；先到终点者赢下一局，先赢两局者赢得整场比赛。

## 启动

本作品需要仓库共享的 C 级本地运行时，不能直接从 `file://` 单独游玩：

1. 完成一次根目录统一安装后，双击本目录的 `start.command`（macOS）或 `start.bat`（Windows）直达本作品；也可从根目录统一门户进入；
2. 浏览器打开“心跳冲刺”后，一人填写昵称并创建房间；
3. 另一台同一局域网设备打开相同页面，填写昵称和五位房间码加入；
4. 主机开始比赛，双方在倒数结束后连续点击自己的控制按钮。

安装完成后，运行与游玩都不需要公网、账号、云数据库或命令行。

## 本地数据与信任边界

- 浏览器之间只经本机 Socket.IO 运行时交换昵称、临时成员 ID、点击序号、进度、比分和阶段；
- 不读取或发送照片、音频、摄像头、地理位置、联系人与设备标识；
- 不写入 `localStorage`、IndexedDB、Cookie 或云端；刷新和离开会结束当前临时身份；
- 房间主机是比赛状态权威：同伴只发送自己的点击，不能自报进度、比分或赢家；
- 五位房间码用于同一局域网内方便加入，不是互联网级身份认证。

## 玩法与限制

`双人对抗` · `C 级` · `局域网双设备` · `触屏/鼠标` · `三局两胜` · `公网依赖：无`

- 每局需要 30 次被主机接受的点击才能到达终点；
- 同一成员 30ms 内的过快重复输入会被节流，重复或倒退的输入序号不会重复计分；
- 倒数、局末和整场结束阶段的点击无效；
- 任意成员中途离开会取消当前比赛；新同伴加入后从 0:0 开始；
- 首版没有机器人、观战、账号、排行榜、道具、音效和公网房间。

## 借鉴与来源声明

| 项目 | 原作者与固定来源 | 借鉴类型 | 实际使用 | 许可证 | 本仓库处理 |
| --- | --- | --- | --- | --- | --- |
| Hackbox | Tommy Nguyen，[`tomalama/hackbox@4f4daf3`](https://github.com/tomalama/hackbox/tree/4f4daf30c6ab79a9ffbd76123d85210c5bb7c7ca) | 架构机制 | 浏览器设备作为派对游戏控制器的角色划分 | [MIT](https://github.com/tomalama/hackbox/blob/4f4daf30c6ab79a9ffbd76123d85210c5bb7c7ca/LICENSE) | 仅借鉴抽象机制；未复制源码、协议、视觉、文案或素材，也未引入其包 |
| PocketWebGames | Marcel Dütscher，[`marceld23/PocketWebGames@f9a72e9`](https://github.com/marceld23/PocketWebGames/tree/f9a72e936c7d0c179772598ec24ea358ee1999fd) | 架构机制 | 本地 Wi-Fi、浏览器加入、主机统一掌握公平共享状态 | [MIT](https://github.com/marceld23/PocketWebGames/blob/f9a72e936c7d0c179772598ec24ea358ee1999fd/LICENSE) | 未复制源码、协议字段、游戏、固件、视觉或素材；在现有运行时上自行实现 |
| Socket.IO | `Copyright (c) 2014-present Guillermo Rauch and Socket.IO contributors`，[`socketio/socket.io@91e1c8b`](https://github.com/socketio/socket.io/tree/91e1c8b3584054db6072046404a24e79a17c1367/packages/socket.io) | 第三方依赖 `4.8.1` | 本地房间、可靠有序事件与 acknowledgment | [MIT LICENSE](https://github.com/socketio/socket.io/blob/91e1c8b3584054db6072046404a24e79a17c1367/packages/socket.io/LICENSE) | 使用仓库已固定的直接依赖及其公开 API，不复制示例源码、文档、视觉或素材 |
| OpenAI 内置图像生成工具 | 本项目 2026-07-17 生成 | 视觉规格 | 桌面与移动比赛态概念图 | 生成内容，仅用于本项目设计规格 | 概念图保存在 `docs/assets/heart-sprint/`；运行页面使用代码原生 HTML/CSS，不嵌入概念截图 |

玩法状态、输入 reducer、协议校验、页面结构、中文文案、样式和测试均为本仓库自行编写。完整设计和协议边界见 [规格文档](../../../docs/23-heart-sprint-spec.md)。

依赖版本由根目录 `package-lock.json` 固定；实际分发时应保留 Socket.IO 包自带的许可证文本与版权声明。
