# 爱心投石器：反弹使用旧竖直速度导致冻结矩阵漂移

- 状态：`fixed`
- 日期：2026-07-24
- 影响作品：`heart-catapult` 确定性物理合同
- 发现版本 / commit：`249-heart-catapult-spec.md` 提交前复核

## 环境

- 操作系统：macOS
- 载体：Q12 定点数临时 Node 枚举器与可执行规格审稿
- 启动等级：计划中的 A 级 `file://`
- 影响范围：第一次地面接触后的所有反弹轨迹

## 复现步骤

1. 使用规格冻结的 960×540 世界、Q12 三角表、`GRAVITY_Q12=640`、11 档角度和
   9 档力度；
2. 每 tick 先计算 `candidateVy = vy + GRAVITY_Q12`；
3. 枚举 99 组轨迹，第一次触地分别采用两种反弹公式：
   - A：`postBounceVy = -roundEven(vy / 2)`；
   - B：`postBounceVy = -roundEven(candidateVy / 2)`；
4. 保持其余连续碰撞、单次反弹、ties-to-even 和事件优先级完全相同；
5. 比较两份结果矩阵与命中计数。

## 预期结果

反弹应基于当前 tick 到达地面接触点时的入射竖直速度，即已经加过本 tick 重力的
`candidateVy`。99 组 canonical 轨迹应稳定得到：

```text
direct-hit 23
bounce-hit 45
second-ground 25
horizontal-exit 6
```

## 实际结果

初稿只写了 `vy`，既可理解为 tick 开始前的旧值，也可理解为更新后的入射值。采用
旧值时，矩阵漂移为 44 个 bounce-hit、26 个 second-ground；同一份规格会产生不同
玩法边界。

## 根因

半隐式 Euler 在 tick 开始时先更新竖直速度，但初稿在反弹伪代码里复用了 `vy`
这个名称，没有显式区分：

- `vy`：tick 开始前的速度；
- `candidateVy`：加过本 tick 重力、用于候选终点和触地判定的入射速度。

这不是显示误差：反弹后的整数速度会影响后续每个 frame、第二次落地时刻和城堡
命中，因此会改变规则结果。

## 解决方案

- 冻结 tick 顺序为先计算 `candidateVy = vy + GRAVITY_Q12`；
- 第一次地面接触固定使用
  `postBounceVy = -roundEven(candidateVy / 2)`；
- 明确旧 `vy` 禁止参与反弹公式；
- 把 99 组合矩阵、结果计数和五条 golden 轨迹作为独立 oracle Gate；
- 实现测试必须专门加入一条能区分旧值与 candidate 值的回归夹具。

## 回归验证

- [x] 可执行规格明确 `candidateVy` 的定义和反弹取值时点
- [x] 99 组合得到 23 / 45 / 25 / 6 的冻结分类
- [x] 独立复核确认公式与矩阵自洽
- [x] `git diff --check` 通过
- [x] 修订后全仓 1,824 项测试通过
- [x] `npm run verify` 通过，57 个现有入口保持不变

## 相关提交

- `2553387 docs: specify heart catapult duel`
