# 本地启动合同：非 A 资源错误允许控制字符污染 CLI

- 状态：`fixed`
- 日期：2026-07-21
- 影响范围：B/C/D 作品旧资源检查的仓库验收错误输出
- 发现阶段：本地启动合同提交前独立审查

## 环境

- macOS；Node.js 22
- 验证入口：`node scripts/validate-repository.mjs`
- 触发输入：资源属性中包含换行等 C0 控制字符

## 复现步骤

1. 在非 A 入口放入类似 `src="missing\nFAKE_ERROR.png"` 的本地引用；
2. 运行仓库验证；
3. 观察旧资源检查把换行原样拼进 stderr。

## 预期结果

所有验证分支应使用同一套稳定脱敏规则；控制字符只能以 `\\uXXXX` 显示，query、fragment 与外部 URL 私密内容不得进入日志。

## 实际结果

新合同验证器已经脱敏，但保留的非 A 旧资源扫描直接输出 `localReference`，形成第二条未受保护的错误路径。

## 根因

集成时保留了旧检查以兼容 `/socket.io` 与 `/vendor`，却没有让它复用新验证器的引用显示函数。

## 解决方案

导出纯函数 `redactResourceReference`，由 A 级合同和非 A 旧资源检查共同调用；输出统一处理 control character、query/fragment、外链、data 与 blob URL。

## 回归验证

- [x] 换行显示为 `\\u000a`，不能注入伪造日志行；
- [x] query 与 fragment 不进入输出；
- [x] 带 userinfo 的外链只显示 `<external-url>`；
- [x] data URL 只显示 `<data-url>`；
- [x] `npm run verify` 通过。

## 相关提交

- 本次“catalog 本地启动合同”实现提交

## 借鉴与来源声明

本修复来自仓库内部威胁建模与独立代码审查，没有新增外部开源参考、代码、素材或第三方依赖。
