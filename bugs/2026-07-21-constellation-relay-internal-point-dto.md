# 星座接线员：加载自检把关卡点误传给严格坐标 API

- 状态：`fixed`
- 日期：2026-07-21
- 影响作品：把星光，一笔一笔交给你
- 发现版本 / commit：逻辑首次实现，提交前测试发现

## 环境

- 文件：`experiences/co-op/constellation-relay/logic.js`
- 阶段：模块加载自检
- 启动等级：A；浏览器与 CommonJS 都会在加载时触发

## 复现步骤

1. 实现只接受精确 `{x, y}` 的 `classifySegmentIntersection()`；
2. 在 `challengeIsValid()` 中直接把冻结关卡点传给分类器；
3. 运行：

```bash
node --check experiences/co-op/constellation-relay/logic.js
node --input-type=module -e "import('./experiences/co-op/constellation-relay/logic.js')"
```

## 预期结果

模块自检用规则坐标验证 10 根目标边，同时公开 API 继续拒绝含额外字段的输入。

## 实际结果

关卡点具有 `{id, x, y, role}`，不符合公开几何 API 的 exact schema。自检把合法关卡误判为非法并抛出 `CONSTELLATION_RELAY_SELF_CHECK_FAILED`，模块无法加载。

## 根因

内部数据模型和公共 DTO 虽然都含坐标，但契约不同。自检复用了公共函数，却漏掉了显式投影边界；若通过放宽公共 schema 解决，会让未来新增的显示字段悄悄改变外部输入语义。

## 解决方案

- 保持公共几何 API 只接受精确 `{x, y}`；
- 内部统一通过 `coordinateDto()` 新建无元数据坐标对象；
- 目标边自检只把投影后的 DTO 交给分类器；
- 增加回归：模块可加载且目标边关系正确，同时直接传 `POINTS[i]` 仍返回 `invalid`。

## 回归验证

- [x] `node --check` 通过
- [x] 目标边加载自检通过
- [x] 公开 API 继续拒绝 `id/role` 额外字段
- [x] 630 个线对与独立 BigInt oracle 一致
- [x] 全仓 1490/1490 通过

## 相关提交

- 逻辑修复与回归：`6c905ca`
