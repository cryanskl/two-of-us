# 这一场雨，我们一起接：最大 revision 重开返回非法状态

- 状态：`fixed`
- 日期：2026-07-21
- 影响作品：这一场雨，我们一起接
- 发现版本 / commit：逻辑部分提交前

## 环境

- macOS；Node.js 22；纯 reducer 最小探针
- 启动等级与入口：A；逻辑 API

## 复现步骤

1. 取得合法非 intro state；
2. 把 revision 设为 `Number.MAX_SAFE_INTEGER`，确认 state 仍合法；
3. 派发 `{ type: "RESTART" }`；
4. 用 `isCloudRecipeState` 检查返回值。

## 预期结果

无法安全递增时保持原 state 引用，不生成越界 revision。

## 实际结果

RESTART 绕过统一 `changed()`，直接计算 `revision + 1`，返回 revision `9007199254740992` 的非法冻结 state。

## 根因

RESTART 为了重建初态单独调用 `makeState`，遗漏 `changed()` 已有的安全整数检查和合法性回验。

## 解决方案

RESTART 把全新初态作为 patch 交给 `changed()`；后者统一检查 revision、构造 next 并通过 `isCloudRecipeState` 回验。溢出时返回原引用。

## 回归验证

- [x] 普通 complete 重开回到 exact intro，revision 递增一次
- [x] intro 重开保持引用
- [x] 最大安全 revision 重开保持原引用
- [x] 定向与全仓测试通过

## 相关提交

- 本次“这一场雨，我们一起接”逻辑提交
