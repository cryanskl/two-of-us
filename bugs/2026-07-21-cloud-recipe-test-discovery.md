# 这一场雨，我们一起接：定向测试未进入统一 npm test

- 状态：`fixed`
- 日期：2026-07-21
- 影响作品：这一场雨，我们一起接
- 发现版本 / commit：逻辑部分提交前

## 环境

- macOS；Node.js 22；仓库 `scripts/run-tests.mjs`
- 启动等级与入口：开发测试发现

## 复现步骤

1. 把规格中的测试写到 `test/cloud-recipe.test.mjs`；
2. 单独执行该文件，24 项通过；
3. 执行 `npm test`，总数仍为 1343；
4. 检查统一发现器的 sourceRoots。

## 预期结果

新增逻辑测试自动进入统一 `npm test`，后续提交无法绕过。

## 实际结果

发现器只扫描 `experiences`、`shared`、`scripts`，根 `test/` 不在范围内；24 项只能手动执行。

## 根因

新规格沿用了不存在的根测试目录约定，没有先对齐仓库的 colocated `*.test.js` 结构。

## 解决方案

把测试移动为 `experiences/co-op/cloud-recipe/logic.test.js`，同步相对路径、规格与计划。保留统一发现器范围不变，避免为单一作品扩大测试扫描面。

## 回归验证

- [x] 定向测试可独立执行
- [x] `npm test` 自动包含新增 24 项
- [x] 根 `test/` 不残留孤立文件
- [x] 规格与计划指向真实路径

## 相关提交

- 本次“这一场雨，我们一起接”逻辑提交
