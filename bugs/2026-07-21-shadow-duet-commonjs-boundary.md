# 把影子，跳成我们：UMD 文件在根级 ESM 边界下无法真实 require

- 状态：`fixed`
- 日期：2026-07-21
- 影响作品：把影子，跳成我们
- 发现版本 / commit：纯逻辑首次实现，提交前独立审计发现

## 环境

- macOS；Node.js v22；仓库根 `package.json` 为 `"type": "module"`
- 启动等级与入口：A；`experiences/co-op/shadow-duet/logic.js`

## 复现步骤

1. 在 `.js` 文件中同时写浏览器全局与 `module.exports` UMD 出口；
2. 不建立更近的模块类型边界；
3. 从仓库根执行 `require("./experiences/co-op/shadow-duet/logic.js")`；
4. 检查返回对象是否包含 `reduce()`。

## 预期结果

真实 CommonJS 加载返回与浏览器经典脚本一致的冻结 API。

## 实际结果

Node 先按根级 ESM 规则解释 `.js`；测试只在 VM 中模拟 `module.exports`，因此“模拟 CommonJS”通过，但真实 `require()` 没有得到合同 API。

## 根因

UMD 包装器只决定运行时如何挂载导出，不能覆盖 Node 根据最近 `package.json` 做出的模块格式判定。测试把 VM 模拟误当成了真实加载证据。

## 解决方案

- 在体验子目录增加只含 `{"type":"commonjs"}` 的 `package.json`，不添加依赖或脚本；
- 把同目录测试改为 CommonJS，直接 `require()` 逻辑与配置；
- 继续用隔离 VM 验证浏览器经典脚本全局，使两种出口分别有真实证据。

## 回归验证

- [x] 真实 `require(logic/config)` 返回冻结 API
- [x] 浏览器 VM 暴露冻结全局
- [x] 定向测试 27 / 27 通过
- [x] 全仓测试与统一校验通过

## 相关提交

- 本次“把影子，跳成我们”纯逻辑提交
