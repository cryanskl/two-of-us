# 企鹅冰原夺旗非视觉核心再验收

## 1. 结论

`penguin-flag-duel` 非视觉核心在基线 `ddc3bde71881528652d7d3c618920ba908412226` 上完成再验收。

- 60Hz 定点冰面物理、夺旗闭环、双席镜像公平、固定 replay、public view 均通过；
- 敌对 config/state/action/Proxy 审计发现七类真实边界缺口，均按红测与最小修复成对提交；
- Box2D 只作概念借鉴，固定版本、commit、MIT 许可证、版权和“不复制/不依赖”边界均与上游复核一致；
- 没有修改生产 UI、Board、catalog、共享依赖、launcher 或 package 清单；
- 本轮没有安装作品入口；现有设计提案仍保持“等待用户确认”状态。

最终 Gate：**PASS**。

## 2. 范围与环境

- worktree：`{worktree-base}/penguin-flag-duel-core-reaudit`
- 分支：`codex/exp-penguin-flag-duel-core-reaudit`
- 基线：`ddc3bde71881528652d7d3c618920ba908412226`
- 审计范围：
  - `experiences/versus/penguin-flag-duel/**`
  - 必要 `bugs/**`
  - 必要 `learn/**`
  - 本验证记录
- 环境准备：标准 `npm ci`，新增 55 个本地安装包，审计为 0 个漏洞；未修改受版本控制的依赖文件。

## 3. 行为验证

### 3.1 60Hz 与冰面定点物理

源码合同保持：

- `TICK_RATE = 60`
- `FIXED_SCALE = 256`
- 普通/持旗速度上限分别为 1024/768 定点单位；
- 阻尼为 `255/256`，碰撞恢复系数为 `1/4`；
- 两个冰岛固定、单 tick 最大位移小于最薄障碍宽度；
- 玩家碰撞最多 4 pass，每个 pass 后重新执行静态合法化。

定向测试继续覆盖九向加速度、阻尼单调性、普通与持旗限速、四面边界、冰岛四侧高速不穿透、玩家碰撞不增能、同心 fallback、靠墙/冰岛夹碰。

额外镜像探针结果：

- 固定 seed `0x5eed1234`；
- 5400 次成对 STEP（150 次倒计时、5250 次 playing）；
- 席位交换、横向镜像、方向镜像后，逐状态 exact deep equal；
- 10000 组固定 seed 玩家碰撞 fixture，交换席位并镜像后 exact deep equal；
- mismatch：0。

### 3.2 夺旗闭环与双席公平

通过的闭环包括：

- 单人拾旗；
- 双人同时接触时近者拾旗；
- 严格等距时无人拾旗；
- 持旗碰撞先掉旗，当 tick 不重拾、不计分；
- 15 tick 拾取锁定；
- 离地 480 tick 自动回中央；
- 同 tick 拾旗进入己方基地可得分；
- 普通得分进入 90 tick 对称重置；
- 目标 3 分优先于时间终局；
- 最后 tick 的得分、时间胜负与平局顺序；
- 暂停冻结与 90 tick 中性恢复倒计时；
- 完整三分比赛动作日志可重放到 exact equal 终局。

几何、出生点、障碍、基地、输入映射和随机轨迹均以左右席镜像验证，没有发现席位特权。

### 3.3 固定 replay 与 hash

固定无输入 fixture：

- 1 个 `START`
- 150 个倒计时 `STEP`
- 5400 个有效比赛 `STEP`
- action 总数：5551
- playing 起始 revision：151
- 终局 revision：5551
- 终局：`match-result / draw / 0:0`

SHA-256：

```text
log        33a34a3a132b6bd5cd2471d08f27f4cf42c6c9a22361fac5a56e1a6c10f4d1e2
state      7a0d3f9826a4f5c4171eee9fba496559fa9d4605828f74128e436bf0b87e2773
publicView d942425a4292f100e95f807dd1d2e0b47727eb14b96c03b1dad1248dcee9471b
```

JSON 往返后的 replay state 与权威 state exact deep equal。敌对 action Proxy 若在两次读取间改变 `intents`，现在只采用首次接受的冻结 action 快照，不再重读外部值。

这些 hash 是本轮固定 fixture 的审计证据，不是新增的生产 API。

### 3.4 Public view

`getViewModel` 的 exact 顶层 keys 为：

```text
phase revision playerNames players flag scores liveTicksRemaining
countdownTicks pauseReason lastCaptureSeat result status
```

探针确认：

- 玩家仅公开 `seat/x/y/speedRatio/isCarrier`；
- 旗仅公开 `x/y/carrierSeat/lockRatio/looseRatio`；
- 不泄露 `vx`、`vy`、原始 `copy`、config、actions 或 intents；
- 全部输出递归冻结并与权威 state 断开引用；
- 合法 state Proxy 的普通 `get` trap 执行次数为 0；
- 伪造超速 state 会在 public view 派生前被完整校验拒绝/回退。

## 4. 敌对边界修复

| 缺口 | 红测 | 最小修复 |
| --- | --- | --- |
| 嵌套数组 accessor / Proxy 普通读取 | `2af6c15` | `17d8e84` |
| 浏览器合法默认配置被 TDZ 回退吞掉 | `3014654` | `b017863` |
| revision 越过 `MAX_SAFE_INTEGER` | `c0c83d3` | `2c106cd` |
| 非终局阶段可伪造剩余 tick 为 0 | `59fe3e8` | `bec8ccd` |
| 变形 Proxy 的 type 与 schema 不一致 | `005272e` | `293e25d` |
| replay 重读原始 action 导致漂移 | `6aacd73` | `f2fed7d` |
| state 只验速度分量、不验向量/持旗上限 | `f506679` | `f2e6f4f` |

Bug 与可复用经验分别记录在：

- `bugs/2026-07-25-penguin-flag-duel-core-reaudit-boundaries.md`
- `learn/2026-07-25-reducer-boundaries-need-value-snapshots.md`

## 5. Box2D 借鉴与许可证边界

2026-07-25 重新核验：

- 上游：[erincatto/box2d](https://github.com/erincatto/box2d)
- tag：`v3.1.0`
- tag commit：`d5935a7a1853eb0f4aca92b369f37929d02c7e11`
- 固定源码页：[d5935a7](https://github.com/erincatto/box2d/tree/d5935a7a1853eb0f4aca92b369f37929d02c7e11)
- 固定许可证：[MIT License](https://raw.githubusercontent.com/erincatto/box2d/d5935a7a1853eb0f4aca92b369f37929d02c7e11/LICENSE)
- 版权：Copyright (c) 2022 Erin Catto

本项目只借鉴固定时间步、阻尼与接触响应的概念区分、离散高速穿透风险意识。没有复制 Box2D 代码、API、常量、数据结构、求解器、测试、示例、视觉设计或素材，也没有加入 Box2D 运行/开发依赖。现有 `ATTRIBUTION.md` 的声明与上游一致，无需修改。

文件 SHA-256：

```text
logic.js       7555f528f20d62bae37988db6a7afd5364db591c68d8d2fdfe5c55cce4a58857
config.js      ced7abf5bfab143bb6a779cc2498ba3a9c790eb3efbc41686776af63dbc56f83
ATTRIBUTION.md d21e11862a3331acadd96432b3c8306f682222f51b86cd4e9711a1d13542e9d8
```

## 6. 最终 Gate

```text
node --check config.js                                      PASS
node --check logic.js                                       PASS
node --test logic.test.js                                   PASS 28/28
npm test                                                    PASS 2284/2284
npm run verify                                              PASS
git diff --check ddc3bde71881528652d7d3c618920ba908412226..HEAD  PASS
```

`npm run verify` 报告：58 个作品入口，其中 50 个 A 级直开、8 个非 A 启动器；1 个能力声明；资源与借鉴声明完整。

最终 range 仅包含：

- `experiences/versus/penguin-flag-duel/logic.js`
- `experiences/versus/penguin-flag-duel/logic.test.js`
- 本轮必要 bug/learn 记录
- 本验证文档

没有生产视觉文件变化。
