# Photo Slider Race 平局动作重复增加 revision

## 现象

在状态机初版中，第二位玩家于 100 ms 结算窗口内完成拼图时，一个合法 `MOVE`
action 会让 `revision` 增加两次，而普通移动和首位完成只增加一次。

## 复现

1. 创建比赛并完成三拍倒计时；
2. 让左方沿打乱轨迹的逆序解回完成态，进入 `settling`；
3. 记录当前 `revision`；
4. 让右方在 100 ms 内完成最后一步；
5. 观察最后一个 `MOVE` 前后 `revision` 差值为 2。

## 影响

胜负和棋盘结果仍正确，但违反“一次合法 action 恰好增加一次 revision”的权威状态
合同。调用方若按前一公共视图构造下一动作，会无故跨过一个版本，增加 stale action
判断和回放审计的复杂度。

## 根因

第二方完成路径先用一次 `copyState` 写入完成棋盘，再调用 `finishDraw` 用第二次
`copyState` 写入结果。两个内部状态提交共同服务于一个外部 action。

## 修复

让 `finishDraw` 同时接收棋盘变化和结算结果，在一次 `copyState` 中原子写入完成棋盘、
`finished` 阶段与平局结果。

## 防回归验证

`logic.test.js` 的“第一方完成后只锁该方，窗口内第二方完成判并列”用例现在记录第二方
解题前的 revision，并断言 N 次合法移动只增加 N 次 revision，包括最后一次完成动作。
