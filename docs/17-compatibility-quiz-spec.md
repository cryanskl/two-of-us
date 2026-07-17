# C 级“和你一样”默契问答规格

## 1. Brainstorm 结论

这款作品补齐情侣互动库中“双方先独立回答，再同时揭晓”的合作玩法。两人从各自手机看到同一道二选一题，选择在本机 Node 裁判中密封；收齐后同时展示双方答案。相同记一颗心，不同只记录“不一样”，不判断谁对谁错，也不输出关系质量标签。

| 方案 | 优点 | 风险与成本 | 本批决定 |
| --- | --- | --- | --- |
| 公开广播答案 | 代码最少 | 先提交者会泄露选择，失去玩法核心 | 不采用 |
| 用 `room:direct` 把答案交给主机浏览器 | 可复用定向消息 | 主机浏览器能提前看到对方答案 | 不采用 |
| 复用本机密封裁判 | 玩家浏览器在揭晓前互不可见；已有幂等、成员和大小 Gate | 本机服务可读取答案，不是端到端加密 | 采用并明确边界 |
| 自由文本回答 | 表达空间大 | 中文归一化、错别字和隐私输入显著扩大首版范围 | 后续候选 |
| 固定二选一 | 触控清楚、结果确定、最适合首版 | 题目深度有限 | 采用 8 题 |
| 引入完整问答/桌游框架 | 可能获得题库或房间能力 | 依赖重、许可混合或与现有运行时重复 | 不引入，机制自行实现 |

首版不加账号、昵称编辑、计时、聊天、题目编辑、排行榜、AI 解读、公网中继、历史记录、分享截图、语音、震动或断线续局。

## 2. 用户流程

1. 一台电脑运行根目录启动器，两台设备打开“和你一样”；
2. 第一位创建两人房间，第二位输入五位房间码加入；
3. 两人到齐后主机开始 8 题问答；
4. 双方看到同一题与 A/B 两个选项，各自在本机选择并提交；
5. 第一份提交只显示“已经密封，等对方”，不能改答，也看不到对方选择；
6. 本机裁判收齐两份后，只向这两位玩家发送完整结果；
7. 两端独立校验结果，相同则累计一颗心，不同不扣分；
8. 主机进入下一题；最后一题揭晓后显示 `x / 8` 次不约而同；
9. 主机可以再玩一次，题号、结果和累计心数全部归零；
10. 任一玩家离开、刷新或主机迁移都会作废当前整局，不尝试恢复旧身份或秘密。

## 3. 严格最小题库

题库固定打包在作品目录，8 道中性二选一题；不包含真实姓名、纪念日、地点、聊天记录或关系诊断。例如：

- 今晚临时空出来：在家看电影 / 出门散步；
- 周末的小奖励：吃一顿好的 / 去一个新地方；
- 一起旅行更期待：慢慢闲逛 / 排满体验；
- 下雨天更想：窝在家里 / 穿雨鞋出门。

正式题目每题包含唯一 `id`、短 `prompt` 和两个唯一选项 `{ id, label }`。状态只引用题目 ID，双方从相同本地配置解析文字。首版固定顺序，不加入随机洗牌、跳过或自定义题目。

## 4. 共享运行时前置修复

### 4.1 两人房间

根本机运行时实例显式使用 `new RoomRegistry({ maxMembers: 2 })`。第三个 socket 加入同一房间必须直接得到 `ROOM_FULL`，而不是先进入房间再由各作品自行退出。

这项约束符合当前所有 C 级作品的真实人数，也让“五位房间码是便利门槛、不是身份认证”的边界更准确：房间码泄露后第三人仍不能占用观战席或接收成员状态，但拥有房间码的人可以尝试抢占第二个席位。

### 4.2 按参与者清理密封轮次

当前服务在任意成员离开时调用 `sealedRounds.clearRoom(roomId)`。在允许第三人存在的 registry 或测试环境中，会出现：A 已提交 → 第三人 C 离开 → A/B 的密封轮次被清空 → B 的提交又成为第一份，双方永久等待。

新增 `clearMember(roomId, memberId)`：只删除 `participantIds` 包含离开者的轮次。成员离开或断线先按参与者清理；只有房间已经空时才调用 `clearRoom`。回归测试必须证明：

- 第三人离开不会清除冻结的 A/B 轮次；
- A 或 B 离开会清除该轮；
- 空房仍清除全部完成与未完成轮次；
- 密封猜拳既有首份不泄露、重复提交和成员变化行为保持通过。

### 4.3 两人席位协调复用

新增 `shared/runtime/two-player-membership.js`，集中实现：

```text
activeMembers, nextHostId, shouldExit, shouldReset
```

先替换“密封猜拳”和“连心四子棋”中重复的 `reconcileMembership`，新问答直接复用。作品自己的状态机、消息类型和结果校验仍各自维护，不抽取“万能游戏 reducer”。这一阶段形成独立重构提交。

## 5. 通用密封提交

不新增服务器事件，继续使用：

```text
room:sealed-submit
{ roomId, namespace: "compatibility-quiz", roundId,
  data: { questionId, answerId } }

room:sealed-result
{ roomId, namespace, roundId,
  submissions: [{ memberId, data }, ...] }
```

既有 Gate 继续保证：真实 socket 必须属于房间；只冻结最早两位参与者；每人每轮只提交一次；同值重试幂等、改值拒绝；第一份 acknowledgment 不含选择；收齐后结果只发给冻结的两位；函数、循环、非有限数字和超过 2 KiB 的数据被拒；房间清理后不保留答案。

本作品额外核对 namespace、roomId、roundId、questionId、两名不同成员和当前题的合法 answerId。提交数据不包含题目正文、分数或自报 senderId。

## 6. 问答状态机

公开状态仅通过当前主机的 `room:direct` 定向给另一名冻结玩家：

```text
schemaVersion, version,
phase: answering | revealed | finished,
memberIds[2], quizId, roundId,
questionIndex, totalQuestions,
questionIds[8], matchCount,
lastResult: null | {
  roundId, questionId,
  submissions: [{ memberId, answerId }],
  matched
}
```

- `startQuiz` 只接受两个不同成员、完整且无重复的 8 个题目 ID和新 quizId/roundId；
- `revealAnswer` 只接受当前题、当前 roundId、两位冻结成员和合法选项；相同答案让 `matchCount + 1`；
- 前 7 题揭晓进入 `revealed`，第 8 题揭晓直接进入 `finished`；
- `beginNextQuestion` 只允许主机从 `revealed` 推进一个题号，必须使用新 roundId；
- `restartQuiz` 只允许从 `finished` 开新 quizId/roundId，题号和分数归零；
- 访客只接受当前房间、当前主机、递增版本且能由“当前状态 + 本机刚收到的密封结果”唯一推导出的状态；
- 主机状态先到、密封结果后到时暂存该 envelope；结果到达后再验证，不能先渲染答案或分数；
- 旧 round、重复结果、跳题、伪造 matchCount、非法 answerId、第三人和旧主机消息都保持原状态对象。

## 7. 页面与可访问性

- Lobby 提供创建房间、输入短码和明确的“两人房间”状态；
- 当前问题使用一个清晰主标题与两个至少 56px 高的原生 `<button>`；
- 选择态用轮廓、符号和 `aria-pressed`，不能只靠颜色；
- 提交后两项都禁用，只显示自己的已密封答案和等待状态；DOM 中不预置对方答案；
- 揭晓后并列显示“你选择 / 对方选择”和“这题一样 / 这题不一样”；不同不使用失败、错误或关系警告文案；
- 房间、等待、密封、揭晓、题号和终局通过 `aria-live="polite"` 宣布；
- 390×844 与 320px 无横向溢出；触摸、Tab、Enter、Space 均可完成；
- `prefers-reduced-motion` 下取消揭晓位移；不播放声音、不震动、不请求权限。

## 8. 隐私、作弊与信任边界

- 题目和答案只在本机 Node 内存与局域网 Socket.IO 中传输，不写入 URL、localStorage、sessionStorage、IndexedDB、日志或磁盘；
- 本机服务可以在揭晓前读取两份答案，因此这是“玩家浏览器密封、信任本机裁判”，不是端到端加密或 commit–reveal；
- 不能防止肩窥、屏幕镜像、房主调试 Node、修改本地源码或 DevTools；定位是可信家庭局域网游戏，不是对抗性安全系统；
- 公共题库没有正确答案，提前阅读源码不构成作弊；
- 五位房间码不是密码，用户只应在信任的设备和局域网中使用；
- 断线后 socket.id 改变，整局清空并重新加入，不能宣传无缝续局。

页面固定隐私说明：

> 你们的选择只在当前本机房间中处理，不上传公网，也不会保存。房主电脑上的本地服务可以在揭晓前读取提交内容，因此它不是端到端加密；请只在你们信任的设备和局域网中使用。

## 9. 文件结构与依赖

```text
shared/runtime/
├── sealed-rounds.js / .test.js          # clearMember
├── server.js / server.test.js           # 两人实例与离开清理
└── two-player-membership.js / .test.js  # 统一席位协调

experiences/co-op/compatibility-quiz/
├── index.html
├── styles.css
├── config.js
├── app.js
├── logic.js
├── logic.test.js
├── protocol.js
├── protocol.test.js
└── README.md
```

不新增 npm 依赖，继续使用根目录固定的 Socket.IO 4.8.1 与二维码运行时。作品只通过统一 `setup.command / setup.bat` 与 `start.command / start.bat` 启动。

## 10. 借鉴与来源声明

- [nivaboaz/CoupleCards](https://github.com/nivaboaz/CoupleCards)（MIT）：只参考情侣对话卡与中性问题方向；不复制题目、源码、视觉或素材；
- [google/html-quiz](https://github.com/google/html-quiz)（已归档；`quiz.js` 为 Apache-2.0，HTML/CSS 为 CC BY 3.0，图片各有归属）：只比较双队问答与结算流程；混合许可文件不引入；
- [JustalK/COUPLE-APP](https://github.com/JustalK/COUPLE-APP)（MIT）：只比较关系问答的主题舒适度、跳过和局数；不引入旧 Expo/React Native 技术栈；
- [tomalama/hackbox](https://github.com/tomalama/hackbox)（MIT）：只参考主机与手机控制器的角色分离；不引入 Socket.IO 2.2、React 16、CRA 3 或 node-sass 4；
- [boardgame.io](https://github.com/boardgameio/boardgame.io)（MIT）：只比较隐藏玩家视图、阶段和服务端裁判概念；不复制或改写其 reducer、server、Lobby、插件或 UI；
- [Socket.IO 4.8.1](https://github.com/socketio/socket.io)（MIT）：共享本地运行时的直接依赖，只调用公开房间与定向 socket API；
- 本仓库“密封猜拳”“隔屏画猜”“连心四子棋”：复用仓库自行实现的密封 registry、真实 sender、主机权威、乱序结果门控和成员重置经验；问答逻辑、题库、协议类型、页面和视觉重新实现。

上游许可证、仓库状态和依赖已于 2026-07-17 通过当前 GitHub `LICENSE`、package manifest 与提交记录复核。README 必须逐项声明“不复制代码、题目、视觉、素材或构建配置”，并保留本机裁判信任边界。

## 11. 测试矩阵

### 共享运行时

- 根 runtime 只允许两人，第三个 join 返回 `ROOM_FULL`；
- 第一份 sealed ack 只含 pending，不含答案；第二份只向两位各发一次相同结果；
- 同值重试幂等，改值拒绝，完成轮次不重放；
- 第三人离开保留 A/B 轮次，冻结参与者离开清除当前轮，空房清除全部；
- 非成员、第三人、成员替换、循环值、Infinity 和超 2 KiB 被拒。

### 纯逻辑与协议

- 两成员、8 个唯一题目开始；不足成员、重复 ID、非法题目拒绝；
- 同选加一、异选不加；非法/重复/第三人 submission、旧 round/question 不推进；
- 下一题只推进一次且清除 lastResult；最后题进入 finished；重开归零；
- 旧版本、跳题、伪造分数/phase、未验证揭晓均拒绝；
- host reveal 与 sealed result 两种到达顺序都只接受一次；
- 第三人、旧 host、其他 room/type/namespace 消息全部忽略；成员或主机变化清空私密状态。

### Chrome 双端/三端

- 两个标签页完成至少 3 题并覆盖相同、不同、下一题与终局；完整自动验收最终跑完 8 题；
- 第一人提交后，callback、DOM、另一端和公开房间事件都不包含选择；
- 双击提交、旧回合延迟消息和重复 complete 不重复计分；
- 第三端 join 稳定得到 `ROOM_FULL`，不影响 A/B 当前密封轮次；
- 回答中关闭主机后，另一端晋升但整局清空；新人加入后可新开一局；
- 1280×900、390×844、320px、鼠标、触屏与键盘通过；
- 控制台无 warning/error，Network 只有本机地址与 Socket.IO，无公网请求；
- `npm test`、`npm run verify`、所有 JS `node --check` 和 `git diff --check` 通过。

## 12. 分阶段提交

1. 本规格与文档索引独立提交；
2. 两人房间与参与者感知 sealed 清理作为共享运行时修复独立提交，并记录 bug/learn；
3. 两人席位协调 helper 与现有作品迁移作为内部重构独立提交；
4. “和你一样”页面、题库、逻辑、协议、目录接入、浏览器验收、bug/learn 与来源声明作为作品独立提交。
