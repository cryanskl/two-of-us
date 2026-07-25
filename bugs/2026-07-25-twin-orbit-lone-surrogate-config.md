# Bug：Twin Orbit 配置接受孤立 surrogate

- 状态：`fixed`
- 日期：2026-07-25
- 影响作品：`twin-orbit` 非视觉核心
- 发现版本 / commit：未提交的领域逻辑阶段

## 环境

- 操作系统：macOS
- Node.js：当前仓库锁定环境
- 启动等级与入口：目标 A 级；当前无生产入口

## 复现步骤

1. 构造一份字段完整的配置。
2. 把 `signature` 设置为孤立高位 surrogate `\ud800`。
3. 调用 `sanitizeConfig(candidate)`。
4. 观察返回值是否是整份 canonical 默认配置。

## 预期结果

孤立高位或低位 surrogate 不是 well-formed Unicode，整份配置应原子回退。

## 实际结果

初版只调用 `String.prototype.normalize("NFC")` 并用 `Array.from` 计数。
JavaScript 的 normalize 不会因孤立 surrogate 抛错，导致该非法字符串被接受。

## 根因

把 Unicode 规范化错误地当成了 UTF-16 well-formed 校验。二者职责不同：
normalize 处理规范等价，不保证 surrogate 成对。

## 解决方案

在规范化前逐 code unit 扫描：

- 高位 surrogate 必须紧跟合法低位 surrogate；
- 孤立低位 surrogate 直接拒绝；
- 合法代理对跳过第二个 code unit；
- 通过后再执行 NFC、空白折叠和 code point 长度 Gate。

原失败用例保留在 `logic.test.js`，并补充孤立低位与错误配对回归。

## 回归验证

- [x] 项目测试通过
- [x] `node --check` 通过
- [x] `git diff --check` 通过
- [x] `npm run verify` 通过

## 相关提交

- 本领域逻辑提交
