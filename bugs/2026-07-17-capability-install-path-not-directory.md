# 能力安装路径是普通文件时诊断抛出 ENOTDIR

- 状态：`fixed`
- 发现日期：2026-07-17
- 影响范围：`scripts/capabilities-lib.mjs`

## 现象

能力数据根目录中如果存在与能力 ID 同名的普通文件，初版 `doctorCapability()` 会先把它判断为“安装路径存在”，随后读取 `<installDir>/receipt.json` 时抛出 `ENOTDIR`。CLI 最终只显示未分类异常，不能给出稳定的 `corrupt` 状态和恢复提示。

## 根因

“路径存在”不等于“路径是安装目录”。初版只调用 `stat()` 判断存在性，没有在拼接 receipt 与 artifact 路径前验证 `isDirectory()`。

## 修复

- 安装路径存在后立即验证 `stat(...).isDirectory()`；
- 普通文件稳定返回 `corrupt / INSTALL_PATH_NOT_DIRECTORY`；
- 不自动删除或覆盖该路径，把清理决定留给用户；
- 增加真实临时目录回归测试。

## 回归验证

- `node --test scripts/capabilities.test.mjs`：10 / 10 通过；
- `npm test`：193 / 193 通过；
- `npm run verify`：18 个作品入口与 1 个能力声明通过。
