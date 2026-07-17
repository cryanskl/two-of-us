# 密封轮次：无关第三人离开会清空两位玩家的待揭晓答案

- 状态：`fixed`
- 发现日期：2026-07-17
- 影响范围：共享 `room:sealed-submit`，现有“密封猜拳”与后续秘密选择玩法

## 复现条件

1. 使用默认容量房间让 A、B、C 三个成员依次加入；
2. A 在某个 sealed round 首先提交，ack 为 `pending: true`；
3. 与该轮无关的第三人 C 离开；
4. 服务端按旧逻辑调用 `sealedRounds.clearRoom(roomId)`；
5. B 提交同一 round 后仍得到 `pending: true`，而不是完成结果。

2026-07-17 的最小 Node 复现稳定输出两次 `pending: true, complete: false`。A 的浏览器仍显示“已密封”，B 却被当成新一轮的第一份提交，双方会永久等待。

## 根因

密封 registry 已冻结 A/B 为该轮参与者，但成员退出处理只知道 roomId，并无条件清除该房间的全部轮次。资源清理的作用域大于被移除成员的作用域，导致无关第三人的生命周期影响冻结参与者。

## 修复

- `SealedRoundRegistry` 新增 `clearMember(roomId, memberId)`，只删除 `participantIds` 包含该成员的轮次；
- `room:leave` 和 socket `disconnect` 先按真实离开成员清理；只有房间已经为空时再 `clearRoom`；
- 根运行时显式把房间容量限制为 2，第三个 join 直接返回 `ROOM_FULL`，不再依赖每个作品加入后自行退出。

## 回归验证

- 测试 registry 容量大于 2 的场景：C 离开后 A/B 原轮继续完成；
- A 或 B 离开会删除其参与的完成与未完成轮次；
- 房间清空后所有密封轮次归零；
- 根 runtime 的第三个成员无法加入；
- 密封猜拳既有秘密、幂等、改答拒绝、成员变化和结果 Gate 全部继续通过。

Chrome 三端回归中，A/B 加入房间 `Q76UN`，C 的加入请求停留在 lobby 并显示“房间人数已满。”；A/B 随后完成石头/布的密封揭晓，两端都得到 `0:1` 和相同结果，三个页面均无 console warning/error。
