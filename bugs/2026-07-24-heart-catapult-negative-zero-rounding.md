# 爱心投石器：ties-to-even 的负半值产生非 canonical `-0`

- 状态：`fixed`
- 日期：2026-07-24
- 影响作品：`heart-catapult` 确定性物理 API
- 发现版本 / commit：逻辑批次提交前定向测试

## 环境

- 操作系统：macOS
- 运行时：Node.js 18+ / JavaScript Number
- 入口：`roundEven(numerator, denominator)`
- 影响范围：绝对值小于半个单位且结果应舍入为零的负数

## 复现步骤

1. 调用 `roundEven(-1, 2)`；
2. 用 `Object.is(result, -0)` 或 Node strict assertion 检查结果；
3. 再运行测试中的对称断言 `roundEven(-n, d) === -expected`，其中
   `expected=0`。

## 预期结果

所有数学上为零的结果都使用唯一 canonical 表示 `+0`：

```text
roundEven( 1, 2) = 0
roundEven(-1, 2) = 0
Object.is(result, -0) = false
```

## 实际结果

生产实现先计算整数 `rounded=0`，随后按 numerator 符号返回 `-rounded`，得到
JavaScript 的 `-0`。修复生产代码后，测试自身又用 `-expected` 把期望值重新变成
`-0`，造成一次正确修复后的假红。

## 根因

数学整数没有正零/负零之分，但 JavaScript Number 遵循 IEEE 754，保留 `-0`。
初始实现和 oracle 都只考虑数值对称，没有冻结零的表示。

## 解决方案

- `roundEven` 在恢复符号前检查 `rounded === 0`，统一返回字面量 `0`；
- 测试的负向对称期望使用 `expected === 0 ? 0 : -expected`；
- 保留其余正负半值、奇偶商和安全整数边界测试；
- 99 组合、198 镜像与五条 golden 重新验证，确认物理结果未变化。

## 回归验证

- [x] `roundEven(-1, 2)` strict equal `0`
- [x] 正负 ties-to-even 夹具通过
- [x] 19 项 `heart-catapult` 定向测试通过
- [x] 99 组合与 198 条镜像轨迹通过独立 BigInt oracle
- [x] 全仓 1,843 项测试通过
- [x] `npm run verify` 通过，现有 57 个入口保持不变

## 相关提交

- `f845b13 feat: add heart catapult logic`
