# 和你一样

两台设备加入同一个本地房间，同时回答 8 道固定的二选一题。每个人的答案先交给房主电脑上的本机 Node 裁判密封；两人都提交后，双方才会同时看到彼此选择。答案相同累计一颗同心，不同不扣分，也不对关系作诊断。

## 启动与玩法

- 等级：C（本地服务 + 局域网双设备）
- 玩家：2 人合作
- 公网依赖：无
- 首次使用：双击仓库根目录的 `setup.command` 或 `setup.bat`
- 此后使用：双击 `start.command` 或 `start.bat`，再从门户打开本作品

第一位玩家创建房间，把五位房间码告诉第二位玩家。两人到齐后由房主开始问答。每题先选择 A 或 B，再点击“密封这个选择”；第一份提交只显示等待，不会向另一位玩家公开答案。两份都到齐后同时揭晓，房主继续下一题。第八题结束后可重新开始，所有题号、答案和同心数都会归零。

## 本地信任与隐私边界

- 这是“**玩家浏览器之间密封、信任本机 Node 裁判**”的玩法，不是端到端加密，也不是密码学 commit–reveal。运行本地服务的 Node 进程可以在揭晓前读取双方答案。
- 未揭晓答案只通过 `room:sealed-submit` 发送给本机裁判；公开状态不含当前答案，浏览器也不能自报成员身份。
- 第一份 acknowledgment 只说明仍在等待，不包含任何一方答案；收齐后裁判只向本轮冻结的两名参与者发送 `room:sealed-result`。
- 房主通过 `room:direct` 只向另一位参与者发送公开状态。访客会使用自己收到的密封结果重新计算并校验题目、成员、答案、同心数、阶段和版本；未验证或无法唯一推导的状态不会显示。
- 主机状态早于密封结果到达时会进入有界版本队列，结果到达后按版本连续验证和重放。每个 `roundId` 都与 `quizId + questionIndex` 唯一绑定；旧题、历史回合复用、重复结果、跳题、第三人和旧主机消息均不能推进状态。
- 任一成员离开、刷新、被替换、主机迁移或连接断开都会清空整局和本机私密选择，不恢复旧身份或秘密。
- 题目与答案不写入 URL、localStorage、sessionStorage、IndexedDB、日志或磁盘，也不请求公网资源。房间码不是密码，只应在可信设备和局域网中使用。

页面固定说明：

> 你们的选择只在当前本机房间中处理，不上传公网，也不会保存。房主电脑上的本地服务可以在揭晓前读取提交内容，因此它不是端到端加密；请只在你们信任的设备和局域网中使用。

## 借鉴与来源声明

本作品的题库、问答状态机、密封结果验证、页面结构、视觉、文案与测试均为本仓库自行实现。下列项目只用于调研玩法方向或架构边界；**没有复制其代码、题目、视觉、素材、构建配置或许可混合文件**：

- **[michaelsboost/CoupleCards `94ac422`](https://github.com/michaelsboost/CoupleCards/tree/94ac422ba393d5aa8c709527dab6f1f6e4156cc1)（[MIT](https://github.com/michaelsboost/CoupleCards/blob/94ac422ba393d5aa8c709527dab6f1f6e4156cc1/LICENSE.md)，Copyright 2025 Michael Schwartz）**：只参考情侣对话卡与中性问题方向；未复制代码、题目、视觉、素材或构建配置。
- **[google/html-quiz](https://github.com/google/html-quiz)（已归档；`quiz.js` 为 Apache-2.0，HTML/CSS 为 CC BY 3.0，图片各有归属）**：只比较双队问答与结算流程；未引入其混合许可文件，也未复制代码、题目、视觉、素材或构建配置。
- **[JustalK/COUPLE-APP](https://github.com/JustalK/COUPLE-APP)（MIT）**：只比较关系问答的主题舒适度、跳过与局数；未引入旧 Expo/React Native 技术栈，也未复制代码、题目、视觉、素材或构建配置。
- **[tomalama/hackbox](https://github.com/tomalama/hackbox)（MIT）**：只参考主机与手机控制器的角色分离；未引入 Socket.IO 2.2、React 16、CRA 3 或 node-sass 4，也未复制代码、题目、视觉、素材或构建配置。
- **[boardgame.io](https://github.com/boardgameio/boardgame.io)（MIT）**：只比较隐藏玩家视图、阶段和服务端裁判概念；未复制或改写其 reducer、server、Lobby、插件、代码、题目、视觉、素材或构建配置。
- **[Socket.IO](https://github.com/socketio/socket.io) 4.8.1（MIT）**：共享本地运行时的直接依赖，本作品只调用公开房间、acknowledgment 与定向 socket API；未复制或改写其示例代码、题目、视觉、素材或构建配置。
- **本仓库“密封猜拳”“隔屏画猜”“连心四子棋”**：复用仓库自行实现的密封 registry、真实 sender、房主权威、乱序结果门控和成员重置经验；本作品的问答逻辑、协议类型、题库、代码、页面、视觉、素材与构建配置均重新实现，没有直接复制这些作品的源码。

视觉全部由 HTML、CSS 和一枚精简的内联 SVG 心线构成，没有引入第三方图片、字体、图标、声音或网络素材。机制为本仓库自研实现，未复制任何参考项目的代码、题库或素材。详细产品、协议和视觉边界见 [`docs/17-compatibility-quiz-spec.md`](../../../docs/17-compatibility-quiz-spec.md) 与 [`docs/18-compatibility-quiz-design.md`](../../../docs/18-compatibility-quiz-design.md)。依赖版本由仓库根目录的 `package-lock.json` 固定；实际分发时仍应保留依赖包自带的许可证文本。
