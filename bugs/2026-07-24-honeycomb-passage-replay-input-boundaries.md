# 蜜径相逢：state 二次读取与终局 replay 投影可伪造

- 日期：2026-07-24
- 范围：`experiences/versus/honeycomb-passage/logic.js`
- 发现阶段：完整纯逻辑首次提交前主审
- 发现基线：`c73c8bf` 之上的批次二未提交工作树
- 状态：已修复

## 环境

- macOS，本地 `main` worktree：`{repo-root}`
- Node.js `node:test`
- 纯逻辑层；不涉及 DOM、网络或浏览器存储

## 问题一：state 校验后又普通读取原 Proxy

### 复现

把结构完全合法的 `playing` state 包在 Proxy 中：

- `getPrototypeOf`、`ownKeys` 与 `getOwnPropertyDescriptor` 返回稳定 data descriptor；
- 普通 `get` 对 `phase`、`history` 或 `revision` 抛错。

把该 state 传给 `reduce(state, ACT)` 或 `getScreenView(state)`。

### 预期

state 每层只观察一次 descriptor。验证后的业务计算只使用内部普通快照；有效
descriptor-only Proxy 不应触发普通 `get`。

### 实际

旧实现的 `readState()` 虽然通过 descriptor 得到了合法值，却返回原始
`{ state: value }`。reducer 和 view 随后再次读取 `safe.state.phase`、
`safe.state.history` 与 `safe.state.revision`，重新触发调用方 Proxy。

### 根因与修复

输入验证和业务使用没有共享同一份观察快照。修复后 `readState()` 返回：

```text
source, phase, revision, content, replayed
```

业务只消费 `phase/revision/replayed`；`source` 仅用于“合法 state + 非法 action”
保持原引用。新增 Proxy 回归验证有效 ACT 与 view 均不触发普通 `get`。

## 问题二：公开 replay 快照没有证明终局完整

### 复现

从合法 replay 复制结构，再构造以下任一组合交给 `getLegalMoves()`、
`getLegalSeals()` 或 `hasRouteForBoth()`：

1. `ply === 32`，但 `result` 仍是 `null`；
2. 棋子已经在目标边，但 `result` 是 `null`；
3. `reached-goal.winner` 是非本手玩家；
4. `immobilizedPlayer` 不是 `ply % 2` 的下一行动者；
5. result 为 null，但当前行动者实际没有移动或封蜡。

### 预期

公开 replay 不是权威 history，但只要 API 接受它，就必须证明所有字段来自同一个
合法派生状态；自相矛盾快照应 fail closed。

### 实际

旧 `readResult()` 只验证“声明的 winner 是否在目标边”或“声明的被困者是否无
行动”，没有核对行动者奇偶；`result === null` 也直接放行，没有反向证明当前
确实未终局。

### 根因与修复

终局验证只做了“有 result 时字段看起来合理”的单向检查，缺少：

- `reached-goal.winner === (ply - 1) % 2`；
- `immobilizedPlayer === ply % 2`；
- 目标边、32 ply、无行动与 result 的双向一致；
- 固定优先级 `reached-goal → round-limit → immobilized`。

修复后公开 replay 会重新派生目标边集合、当前行动者与合法行动；漏写、错写或
优先级冲突的 result 一律拒绝。

## 额外边界：revision 饱和

state 规格允许非负安全整数 revision。若它已为 `Number.MAX_SAFE_INTEGER`，再
执行合法动作会产生不安全整数。修复后该动作不被接纳并保持原引用，确保不会从
合法输入生成非法 state。

## 回归验证

```bash
node --test experiences/versus/honeycomb-passage/logic.test.js
# 23 tests passed, 0 failed

npm test
# 1746 tests passed, 0 failed

npm run verify
# 55 个作品入口，仓库验收通过

git diff --check
```

## 相关提交

- `c73c8bf feat: add honeycomb passage geometry`
- `9b6c699 feat: add honeycomb passage duel core`
