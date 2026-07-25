# Memory Merge Board blocked 测试夹具误含合法移动

- 日期：2026-07-25
- 范围：`experiences/co-op/memory-merge-board/logic.test.js`
- 类型：测试夹具缺陷

## 环境

- Node.js v22.22.3
- 分支：`codex/exp-memory-merge-board-core`
- 定向命令：
  `node --test experiences/co-op/memory-merge-board/logic.test.js`

## 重现

原测试构造 11 张交错主题线索，向右整理后在最左边缘补一张 `taste`，随后断言
整盘已经没有合法滑动。

定向测试实际在“补页后若没有任一合法滑动则以 blocked 结束”中得到：

```text
hasAnyLegalSlide(state.board) === true
```

## 预期

补页后的 12 格满盘在水平与垂直方向都不含相邻同主题同阶段线索，因此四个方向都
不能移动或合并，reducer 应进入 `lost / blocked`。

## 实际

原夹具补页后在第一列形成了相邻的 `taste` 碎片。它们可以竖向合并，所以
`hasAnyLegalSlide` 正确返回 `true`。错误来自测试数据，不是规则实现。

## 根因

设计交错满盘时只人工检查了每一行，没有同时检查四列。对“满盘无合法移动”的
证明必须覆盖全部水平和垂直相邻边。

## 修复

把三行主题重新排列为：

```text
place  taste  sound  care
taste  care   taste  sound
sound  place  taste  empty
```

向右整理第三行后，从最左边缘补入 `care`，最终每条水平与垂直相邻边都具有不同
主题，且棋盘已满。

## 回归验证

- 断言补页后 `hasAnyLegalSlide(state.board) === false`；
- 断言 reducer 进入 `phase === "lost"`；
- 断言 `lossReason === "blocked"`；
- 全部规则定向测试必须通过。
