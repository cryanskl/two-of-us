# Bug：企鹅冰原夺旗核心再验收发现的边界缺口

- 状态：`fixed`
- 日期：2026-07-25
- 影响作品：`penguin-flag-duel` 非视觉核心
- 再验收基线：`ddc3bde71881528652d7d3c618920ba908412226`

## 发现

本轮用敌对 state/action/config、固定 replay 和阶段语义重新检查核心，确认了七个可复现缺口。

1. `intents`、`players`、`scores`、`playerNames` 与 replay `actions` 虽检查了数组形状，随后仍用普通属性读取或迭代器消费；accessor 与 `Proxy.get` 会被执行。
2. `DEFAULT_CONFIG` 在 `COPY_KEYS` 初始化前调用依赖它的校验函数，`Temporal Dead Zone` 异常被内部 `catch` 吞掉，导致浏览器配置模块中的合法默认值总是静默回退。
3. 合法 state 可持有 `Number.MAX_SAFE_INTEGER` revision，但一次合法转换仍执行 `+ 1`，产生不安全整数并被加入 trusted state 集合。
4. `paused`、`countdown` 或 `capture-reset` 可伪造为 `liveTicksRemaining === 0`，与“最后一个 playing tick 必须立即终局”矛盾。
5. action type 先用于选择 schema，随后从 Proxy 再次读取时却没有检查两次 type 一致；变形 Proxy 可用一种 type 的 schema 触发另一种动作。
6. replay 先解析 action，之后又把原始外部 action 交给 reducer 重读；两次观察间变化的 Proxy 会让回放结果偏离首次接受的快照。
7. 玩家速度只逐分量检查 `[-MAX_SPEED, MAX_SPEED]`，没有检查向量模长；持旗者也没有执行更低的 `CARRIER_MAX_SPEED` 上限。

## 影响

- “敌对输入不执行普通读取、异常时 fail closed”的边界承诺不完整；
- 合法浏览器配置会被无提示忽略；
- state 可能越过安全整数、接受不可达阶段或超速物理状态；
- 非 JSON 的敌对 replay 对象可能在一次回放中改变含义，破坏固定重放；
- public view 虽把 `speedRatio` 钳制到 1，却可能掩盖伪造 state 的超速向量。

## 解决方案

- 用 own data descriptor 一次性复制稠密数组，拒绝 accessor、稀疏项、额外 key 与异常 Proxy；
- 在默认配置校验前初始化 copy schema，并通过 descriptor 读取配置模块后复制、校验、冻结；
- revision 到达安全整数上界后，任何动作原子 no-op；
- 所有非终局阶段统一要求剩余比赛 tick 大于 0；
- action 的探测 type 必须与 exact schema 快照内的 type 相同；
- replay 只把首次校验生成的冻结 action 快照交给 reducer；
- 对普通玩家和持旗者分别验证速度平方上限。

## 回归

项目定向测试由 23 项增至 28 项，覆盖：

- 嵌套 accessor 与数组 Proxy 的普通 `get` trap 零执行；
- 同 realm 浏览器配置 Proxy 的合法默认值采用；
- revision 上界；
- 计时耗尽的暂停伪造状态；
- type 变形 action Proxy；
- replay 首次 action 快照；
- 普通与持旗速度向量上限。

验证命令：

```bash
node --check experiences/versus/penguin-flag-duel/config.js
node --check experiences/versus/penguin-flag-duel/logic.js
node --test experiences/versus/penguin-flag-duel/logic.test.js
npm test
npm run verify
git diff --check ddc3bde71881528652d7d3c618920ba908412226..HEAD
```

## 相关提交

- 红测与修复：`2af6c15` / `17d8e84`
- 红测与修复：`3014654` / `b017863`
- 红测与修复：`c0c83d3` / `2c106cd`
- 红测与修复：`59fe3e8` / `bec8ccd`
- 红测与修复：`005272e` / `293e25d`
- 红测与修复：`6aacd73` / `f2fed7d`
- 红测与修复：`f506679` / `f2e6f4f`
