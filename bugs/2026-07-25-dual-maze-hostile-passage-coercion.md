# dual-maze-race hostile passage 隐式转换抛错

## 状态

- 发现日期：2026-07-25
- 影响范围：公开 maze 诊断与导航 API
- 当前处理：已修复并加入不可数值化 passage 回归

## 现象

`readMaze()` 会安全快照 passages 数组，但数组元素仍可能是不可信值。旧实现虽然在
validator 主循环中能把非整数记录为 `passage:<index>:mask`，后续 reciprocal、
fingerprint、连通遍历或导航仍会对该值执行位运算或 `toString(16)`。

把任一 passage 替换为 `Object.create(null)` 后，以下公共 API 可能抛出
`Cannot convert object to primitive value`：

- `validateMaze`
- `canMove`
- `moveIndex`
- `findShortestPath`
- `analyzeMaze`

## 根因

结构快照只证明数组槽位是 own data descriptor，不证明槽位值已经是安全的
`0..15` 整数。位运算会触发对象的隐式数值转换，fingerprint 会触发属性读取或
字符串转换；因此必须在任何转换前验证标量。

## 修复

- 新增统一 `isPassageMask` 判定；
- `canMove` 在位运算前验证当前 mask；
- `findShortestPath` 在 BFS 前验证全部 mask；
- validator 对非法 mask 只记录诊断，不执行 reciprocal 位运算或 fingerprint；
- 连通遍历遇到非法 mask 时跳过，而不是强制转换。

回归测试要求五个公共 API 全部不抛异常，validator 返回 invalid 且保留精确
`passage:0:mask` 诊断，其余导航/分析 API 安全返回 `false`、原位置或 `null`。
