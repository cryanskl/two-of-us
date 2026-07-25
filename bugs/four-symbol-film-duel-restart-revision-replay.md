# 四符片名擂台：重开归零 revision 会接受旧事件

## 现象

纯逻辑首轮测试通过后，语义审查发现 `RESTART` 原实现调用
`createInitialState()`，把 revision 从总结页的当前值重置为 `0`。

如果上一场开场时产生的 revision `0` 动作仍留在事件队列，新一场重开到 setup
后可能再次接受这条陈旧动作，造成非用户当前意图的开局。

## 复现

旧实现的最小序列：

```text
setup revision 0
  → 保存一条 START_MATCH revision 0
  → 完成整局
  → RESTART
  → 新 setup revision 0
  → 重放旧 START_MATCH revision 0
```

最后一条动作的 revision 与新状态相同，因此旧实现无法区分跨局陈旧事件。

## 影响

- 快速点击、延迟事件或未来事件委托实现可能跨局误触发；
- revision 只在单局内单调，不能提供会话内的陈旧事件隔离；
- 状态仍然合法，所以普通 schema 校验无法发现意图错误。

## 根因

把“重置游戏内容”与“重置并发版本”错误地绑定在同一个
`createInitialState()` 调用中。对局内容应该归零，事件序列号不应回绕。

## 解决方案

`RESTART` 改为通过 `copyState()` 原子生成新的 setup：

- 玩家、题包、排程、回合临时字段和结果全部清零；
- 配置保持不变；
- revision 使用总结态的 `revision + 1`；
- 非 summary 状态的 `RESTART` 仍是同引用 no-op。

## 验证

回归测试完成一整局后保存旧 revision `0` 开局动作，重开后再次派发：

- 新 setup revision 等于旧总结 revision 加一；
- 旧动作返回同一状态引用；
- 新对局没有被启动；
- 项目测试 `25/25`；
- 全仓测试 `1997/1997`；
- repository verify 通过。

## 影响范围

仅 `four-symbol-film-duel` 的本地纯逻辑状态机。没有网络、持久化或跨项目协议
变更。
