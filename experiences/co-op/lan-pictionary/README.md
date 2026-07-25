# 隔屏画猜

两台设备在同一局域网加入房间后，轮流担任画家和猜词者。画家收到只发给自己的秘密题目，归一化笔迹实时同步到另一台设备；4 回合结束后展示共同得分。

## 启动方式

- 等级：C（本地服务 + 局域网双设备）
- 玩家：2 人合作
- 公网依赖：无
- 首次使用：双击仓库根目录的 `setup.command` 或 `setup.bat`
- 此后使用：直接双击本目录的 `start.command` 或 `start.bat`；也可从根目录统一门户打开

一人创建房间并把 5 位房间码告诉另一人。两台设备需要连接同一个可信 Wi-Fi；房间状态、题目、猜词和笔迹只经过启动服务的这台电脑。

## 可定制内容

编辑 [`config.js`](./config.js) 可以调整回合数、每回合秒数和题库。题库至少要包含与回合数相同数量的非空词语；公开仓库里不要提交两个人不希望公开的私人梗。

## 隐私与同步边界

- 主机在每局开始时随机抽取题目并保存完整比赛状态，只有主机能确认答案、加分和推进回合；
- 公开房间状态只包含阶段、回合、得分、画家、秒数与版本，不含答案、题库或截止时间；
- 题目通过 `room:direct` 只发送给画家，猜测通过同一协议只发送给主机；
- 笔迹以 0–1 归一化线段广播，不发送 Canvas 截图、图片或个人文件；
- 回合结束后才会向双方公开本轮答案；主机断开或房间成员变化时，当前比赛会清空。

## 借鉴与来源声明

- **传统 Pictionary / 你画我猜玩法**：借鉴“一人看词作画、另一人猜词、轮换角色”的通用玩法机制；本项目没有复制任何商业版本或第三方项目的题库、规则文案、视觉、音效、素材或源码。
- **本仓库的同机你画我猜**：复用了共同计分、中文猜词规范化和 Canvas 交互的内部经验；本作品的双设备界面、主机权威状态机、定向秘密消息和笔迹协议均重新实现，没有直接复制其页面源码。
- **[Socket.IO 4.8.1](https://github.com/socketio/socket.io/tree/91e1c8b3584054db6072046404a24e79a17c1367/packages/socket.io)**：固定版本采用 [MIT LICENSE](https://github.com/socketio/socket.io/blob/91e1c8b3584054db6072046404a24e79a17c1367/packages/socket.io/LICENSE)，`Copyright (c) 2014-present Guillermo Rauch and Socket.IO contributors`。作为本地房间实时传输依赖，通过公开 API 使用房间、广播和 socket 定向投递能力；没有复制或改写其示例源码、文档、视觉与素材。
- **[Whitebophir](https://github.com/lovasoa/whitebophir)（AGPL-3.0）** 与 **[Excalidraw Room](https://github.com/excalidraw/excalidraw-room)（MIT）**：调研阶段仅用于比较自托管白板与房间架构。本作品没有复制、改写、打包或派生它们的源码、视觉、素材与协议实现，因此不把本作品声明为其衍生版本。

详细取舍和协议边界见 [`docs/07-lan-pictionary-spec.md`](../../../docs/07-lan-pictionary-spec.md)。依赖版本由仓库根目录的 `package-lock.json` 固定；实际分发时仍应保留依赖包自带许可证文本。
