# C 级“密封猜拳”规格

## 1. Brainstorm 结论

这款作品验证双设备秘密同时选择：双方各自在自己的屏幕出拳，在两份选择都提交前，任何玩家端都看不到对方答案；本机 Node 裁判收齐后同时揭晓，先赢两局者获胜。

| 方案 | 优点 | 风险与成本 | 本批决定 |
| --- | --- | --- | --- |
| 主机收集秘密 | 可复用现有 `room:direct` | 主机浏览器技术上能提前看到对方答案 | 不采用 |
| 浏览器 commit–reveal | 玩家互不信任也能验证 | Web Crypto 在局域网 HTTP 安全上下文不稳定；自带密码学实现风险高 | 后续 HTTPS 能力成熟后再评估 |
| 本机 Node 可信裁判 | 双方浏览器都无法提前看到；可复用于秘密投票和默契问答 | 本机服务器能看到选择，不是无信任协议 | 采用，并明确边界 |

首版只做石头、剪刀、布和三局两胜。不加聊天、道具、计时、机器人、公网匹配、账号、排行榜、动作动画资源或自定义规则。

## 2. 用户流程

1. 一台设备运行根目录 `npm start`，两台设备从本地入口打开“密封猜拳”；
2. 第一位创建房间，第二位输入五位房间码；
3. 两人到齐后主机开始比赛；
4. 双方各自在本机选择石头、剪刀或布并提交；
5. 先提交的一方只看到“已密封，等待对方”，不能修改选择，也看不到对方状态之外的答案；
6. 本机裁判收到两份提交后，只向这一轮的两位参与者同时发送完整结果；
7. 双端按同一纯函数判定胜负，主机发布经过结果校验的新比分；
8. 平局不加分；无人先到 2 分时由主机开始下一轮；
9. 先到 2 分后比赛结束，可重新开始一场；
10. 成员或主机变化立即作废未揭晓轮次和当前比赛，不做断线续局。

## 3. 通用密封轮次裁判

共享运行时新增 `SealedRoundRegistry`，不把猜拳规则写入服务器。它只解决“成员提交秘密，收齐后一起揭晓”：

```text
room:sealed-submit
{ roomId, namespace, roundId, data }

room:sealed-result
{ roomId, namespace, roundId,
  submissions: [{ memberId, data }, ...] }
```

### 提交 Gate

- `roomId` 必须存在，真实 `socket.id` 必须是房间成员；
- 只取房间最早进入的两名成员作为本轮参与者，第三人不能提交或收到结果；
- `namespace` 只允许短小的字母数字与连字符；`roundId` 限长并由作品生成唯一值；
- 第一份提交时冻结两名参与者 ID，后续成员集合不匹配则作废轮次；
- 每名成员每轮只能提交一次；重复相同提交返回幂等成功，不同提交返回稳定错误，不能“看对方是否交卷后换答案”；
- 未收齐时 acknowledgment 只返回 `pending: true`，不包含任何选择；
- 收齐后结果只通过两个成员各自的 socket channel 定向发送，不向整个房间广播；
- 已完成轮次保留完成标记，重复消息不能二次揭晓；房间成员离开时清理该房间全部未完成/完成轮次；
- 对 `data` 做结构克隆和大小/类型限制，不接受函数、循环结构或超大载荷。

共享模块测试至少覆盖：非成员、第三人、首份不泄露、两份同时结果、伪造 sender、重复同值幂等、重复改值拒绝、完成后不重放、成员变化和离开清理。

## 4. 猜拳状态机

客户端纯逻辑维护公开比赛状态：

```text
schemaVersion, version, phase,
memberIds, roundId, roundNumber,
scores, targetScore,
lastResult
```

阶段为：

```text
waiting → choosing → revealed → choosing ... → finished
```

- `startMatch` 只接受两个不同成员，比分从 0 开始，目标固定为 2；
- 每轮 `roundId` 由主机生成并随公开状态广播；公开状态不包含任何未揭晓选择；
- `resolveChoices` 只接受 `rock / scissors / paper`，确定性返回平局或胜者；
- 双端收到 `room:sealed-result` 后先核对房间、namespace、roundId、参与者集合和两个合法选择；
- 主机根据结果推进比分并广播 `rps:state`；非主机只接受当前主机、递增版本且与本机刚收到的密封结果一致的状态；
- 下一轮必须使用新 `roundId`，旧结果不能推进当前比赛；
- 成员或主机变化清空 `pendingChoice`、密封结果和公开比赛状态。

逻辑测试覆盖三种克制关系、平局、非法选择、比分推进、先到 2 分结束、旧版本、结果与比分不一致、旧 roundId 和重新开始。

## 5. 页面与可访问性

- 三个选择使用原生 `<button>`，图形符号旁始终写“石头 / 剪刀 / 布”；
- 提交后三个按钮全部禁用，只显示自己的已密封选择，不在 DOM 中预置对方答案；
- 等待、揭晓、单轮胜负和总比分通过 `aria-live="polite"` 宣布；
- 不只用颜色区分双方、输赢和已选择状态；
- 390×844 无横向溢出，三个触控目标至少 56px 高；
- `prefers-reduced-motion` 下取消揭晓位移动画；不播放声音、不震动、不请求权限。

## 6. 信任、隐私与威胁边界

- 公网依赖：无；选择只在本机 Node 进程内存和两台浏览器之间流动；
- 本机裁判能读取双方选择，因此这是“玩家端密封、信任本机服务”的协议，不是密码学无信任协议；
- 房间仅用于可信局域网，不开放公网，不保存历史或日志；
- 浏览器客户端不能自报 `senderId`，服务器始终用真实 socket 身份重建提交；
- 若未来要求主机机器也不能看到答案，应另立 HTTPS + commit–reveal 规格，不能把当前协议包装成端到端加密。

## 7. 文件结构与依赖

```text
shared/runtime/
├── sealed-rounds.js
├── sealed-rounds.test.js
└── server.js                 # 注册两条 sealed 事件

experiences/versus/sealed-rps/
├── index.html
├── styles.css
├── app.js
├── logic.js
├── logic.test.js
├── protocol.js
├── protocol.test.js
└── README.md
```

不新增 npm 依赖；继续使用根目录固定的 Socket.IO 4.8.1。同步更新 catalog、根门户回退目录、分类 README、根 README、docs、bugs 与 learn。

## 8. 借鉴与来源声明

- 传统石头剪刀布：采用三种手势循环克制的通用规则，不复制商业游戏的名称扩展、视觉、角色、素材或音效；
- [boardgame.io](https://github.com/boardgameio/boardgame.io)（MIT）：调研阶段用于比较回合、玩家视图与服务端裁判的架构边界；不引入依赖，不复制或改写其 reducer、服务器、Lobby、插件或 UI 代码；
- [Socket.IO 4.8.1](https://github.com/socketio/socket.io)（MIT）：共享本地运行时的直接依赖，本作品复用其公开房间与定向 socket API；
- 本仓库“隔屏画猜”与“连心四子棋”：复用真实 sender、定向消息、主机权威、版本门控、第三人退出和成员变化重置经验；密封轮次 registry、猜拳逻辑、页面和协议重新实现。

两个上游许可证已于 2026-07-15 通过 GitHub 当前 `LICENSE` 文件复核。作品 README 必须明确“可信本机裁判”而不是声称端到端加密或 commit–reveal。

## 9. 验收标准

- 两个 Chrome 标签页可创建/加入房间并完成三局两胜；
- 第一份提交后，提交端、对方端和公开房间事件都不包含未揭晓选择；
- 收齐两份后，两端收到相同成员/选择并得出相同胜负；
- 重复提交、改选、旧 round、非成员、第三人和伪造 sender 均不能改变结果；
- 平局不加分，先到 2 分结束，重新开始清空比分；
- 主机离开、成员替换和断线会作废未揭晓秘密与当前比赛；
- 390×844、触屏和键盘操作通过；
- Chrome 控制台无 warning/error，Network 无公网请求；
- `npm test`、`npm run verify` 与 `git diff --check` 通过；
- README 包含完整来源声明和信任边界。
