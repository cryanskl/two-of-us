# 本地启动合同：启动器错误 ID 测试可空数组误绿

- 状态：`fixed`
- 日期：2026-07-21
- 影响范围：B/C/D 统一启动器 renderer 的回归测试
- 发现阶段：本地启动合同提交前独立审查

## 环境

- macOS；Node.js 22；`node:test`
- 测试入口：`scripts/experience-contracts.test.mjs`
- 断言形式：`errors.every(...)`

## 复现步骤

1. 让错误 ID fixture 写入两份错误模板；
2. 临时移除实现中的模板内容比较；
3. `validateExperienceContracts` 返回空错误数组；
4. `[].every(...)` 仍为 `true`，测试错误通过。

## 预期结果

测试必须证明 `start.command` 与 `start.bat` 各自产生一条明确的模板漂移错误。

## 实际结果

旧断言只检查“所有已出现错误都匹配”，没有证明错误实际出现。

## 根因

使用全称断言时遗漏了基数约束，这是典型 vacuous truth 测试漏洞；同一批准矩阵还缺少 README 缺失与 README symlink 的直接 fixture。

## 解决方案

1. 先断言错误数精确为 2；
2. 分别断言 `start.command` 与 `start.bat` 的模板错误；
3. 补入 missing README 与 README symlink fixture。

## 回归验证

- [x] 删除任一模板比较都会使对应断言失败；
- [x] missing README 有明确错误；
- [x] README symlink 被拒绝；
- [x] 定向合同测试 66/66 通过。

## 相关提交

- 本次“catalog 本地启动合同”实现提交

## 借鉴与来源声明

本修复来自仓库内部测试审查，没有新增外部开源参考、代码、素材或第三方依赖。
