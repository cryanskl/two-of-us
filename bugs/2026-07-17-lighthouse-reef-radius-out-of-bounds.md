# 为你引航：圆心在世界内但暗礁圆周越界

- 状态：`fixed`
- 发现日期：2026-07-17
- 影响范围：`experiences/co-op/lighthouse-passage/levels.js`

## 现象

初版第三幕把两枚暗礁写成 `y = 40, radius = 78` 和 `y = 510, radius = 68`。圆心都位于 `960 × 540` 世界内，但脚本加载时 `validateLevel()` 立即拒绝关卡，因此整个作品无法启动。

## 根因

设计坐标时只看了圆心，没有给圆形碰撞体预留半径。对圆形对象而言，合法条件不是单独的 `0 <= x <= width` 与 `0 <= y <= height`，而是：

```text
radius <= x <= width - radius
radius <= y <= height - radius
```

规则校验正确地检查了完整圆周，所以在加载期暴露了错误，没有让渲染与碰撞边界悄悄分叉。

## 修复

- 将北侧暗礁改为 `y = 70, radius = 68`；
- 将南侧暗礁改为 `y = 475, radius = 60`；
- 保留“所有暗礁必须完整位于世界内”的 schema 测试；
- 重新执行三幕生产 reducer 的确定性可解轨迹，确认收窄后的通道仍可通过。

## 回归验证

- `node --test experiences/co-op/lighthouse-passage/logic.test.js`：15/15 通过；
- schema 测试覆盖越界圆形拒绝；
- 三幕可解、角色必要性与碰撞重置测试继续通过。
