# 统一 setup：内层能力 CLI 的 stderr 绕过外层脱敏

- 状态：`fixed`
- 日期：2026-07-21
- 影响范围：根 setup 在交互安装 D 级可选能力失败时的终端输出
- 发现阶段：统一可选能力安装的提交前独立审查

## 环境

- macOS；Node `v22.22.3`
- 启动入口：`node scripts/setup.mjs` 的交互能力安装分支
- 复现方式：注入一个先写 stderr、再返回非零的能力 CLI

## 复现步骤

1. 让 `capabilityMain` 收到 setup 传入的真实 stderr；
2. 模拟下载失败，先写入包含完整下载 URL、绝对用户目录、模型文件名和 64 位哈希的错误正文；
3. 返回退出码 1；
4. 观察 setup 外层虽然只打印通用失败摘要，内层正文已经提前出现在终端。

## 预期结果

setup 只应公开能力 ID、稳定错误码和修复动作，不应把下载地址、用户路径、artifact 名称或哈希带到聚合日志。

## 实际结果

原实现把真实 stderr 直接交给内层 CLI。外层 `try/catch` 和通用摘要无法收回已经写出的内容，因此脱敏边界可被“先写流、再失败”的正常 CLI 行为绕过。

## 根因

错误脱敏只覆盖异常对象与外层摘要，没有覆盖被调用者持有的输出流。流写入发生在控制权返回之前，事后 catch 无法拦截。

## 解决方案

1. 为每次能力安装创建私有内存 stderr buffer，不再传递 setup 的真实 stderr；
2. 失败时只从 buffer 行首提取符合 `[A-Z][A-Z0-9_]*` 的稳定错误码；
3. 没有合法码时统一回退为 `CAPABILITY_INSTALL_FAILED`；
4. 对外仅输出 `[错误码] <capability-id> 安装失败。`，不转发正文；
5. stdout 仍由能力 CLI 直接使用，许可说明、确认提示和下载进度不受影响。

## 回归验证

- [x] 注入 CLI 写入完整秘密 URL、绝对路径、模型名和哈希后返回 1，外层输出均不包含这些内容；
- [x] 合法 `[DOWNLOAD_FAILED]` 被保留为稳定码；
- [x] 无稳定码、CLI 抛错和二次 status 失败继续安全归类；
- [x] `scripts/setup.test.mjs` 29/29 通过；
- [x] 整仓测试 1563/1563 通过。

## 相关提交

- 修复与回归：`9154407 feat: integrate optional capabilities into setup`
- 完整验收：[`docs/196-unified-optional-capability-setup-verification.md`](../docs/196-unified-optional-capability-setup-verification.md)

## 借鉴与来源声明

本修复来自仓库内部威胁建模与独立代码审查，没有新增外部开源参考或第三方依赖。
