# 这一弹，拐弯见你：规范状态接受任意弹速并在下一 tick 溢出

- 状态：`fixed`
- 日期：2026-07-25
- 影响作品：`ricochet-tank-duel`
- 发现版本 / commit：`27a2d91`

## 环境

- 操作系统：macOS
- 运行时：Node.js 22，纯 CommonJS 核心测试
- 启动等级与入口：A；问题位于共享于浏览器与 Node 的 `js/simulation.js`

## 复现步骤

1. 从 `createInitialState()` 创建 JSON clone，并把 phase 改为 `playing`。
2. 添加弹体 `{ vxFp: Number.MAX_SAFE_INTEGER, vyFp: 1 }`，其余字段合法。
3. 调用 `validateState(raw)`，观察状态被接受。
4. 对返回状态调用 `simulatePlayingTick(state, { leftMask: 0, rightMask: 0 })`。

## 预期结果

通过 `validateState` 的规范弹体必须来自冻结的 32 档方向表和固定弹速，并且能在
固定地图与路径上完成下一次 tick，不应在几何中间量处才失败。

## 实际结果

validator 只确认 `vxFp`、`vyFp` 分别是 safe integer，因此接受了不可能由游戏规则
生成的极端速度。下一 tick 在有理 TOI 交叉乘法处抛出：

```text
RangeError: rational cross product overflow must be a safe integer
```

## 根因

状态 schema 把“分量是安全整数”误当成“速度对是规范弹速”。固定速度和 32 档 LUT
本应形成一个只有 32 个元素、且对轴反射闭合的离散集合；validator 没有验证这一
联合约束，导致几何层收到远超运行时范围证明的伪造输入。

## 解决方案

- 从 `DIRECTION_VECTORS × BULLET_SPEED_FP` 预计算 32 个规范速度对；
- `validateBullet` 要求 `(vxFp, vyFp)` 完整匹配其中一个速度对；
- 保留 `simulateBulletTick` 的低层合成高速入口，用于 contact-cap 等防御测试；
- 遍历全部 32 档，证明每个通过校验的弹体都能安全推进。

## 回归验证

- [x] 原始 `MAX_SAFE_INTEGER` 夹具在 `validateState` 被拒绝
- [x] 32 个规范速度对全部通过校验并可推进一个 tick
- [x] 轴反射后的速度仍属于同一离散集合
- [x] 合成高速低层 contact-cap 测试继续通过
- [x] 定向测试、全仓测试与仓库验收通过

## 相关提交

- 本修复提交
