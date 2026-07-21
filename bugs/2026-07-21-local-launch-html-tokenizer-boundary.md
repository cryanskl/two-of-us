# 本地启动合同：HTML 扫描边界与浏览器 tokenizer 漂移

- 状态：`fixed`
- 日期：2026-07-21
- 影响范围：A 级直开作品的静态资源合同验证
- 发现阶段：本地启动合同提交前独立审查

## 环境

- macOS；Node.js 22
- 验证入口：`validateExperienceContracts`
- 浏览器语义：HTML comment 与 start-tag tokenizer

## 复现步骤

1. 验证 `<!-- --!><img src="https://example.com/x.png"><!-- -->`；
2. 或验证 `<div x=y"><img src="https://example.com/x.png">">`；
3. 观察旧扫描器分别借用了后一个 canonical `-->`，或把未加引号值中的 `"` 误当成 quoted value 起点；
4. 两种情况下，浏览器可见的 `img` 都被扫描器吞掉。

## 预期结果

扫描器应在浏览器采用的最早结束位置继续解析，并拒绝随后出现的外部资源。

## 实际结果

旧实现向后寻找更晚的闭合符，静态验证可能返回零错误，但浏览器仍会加载隐藏在错误边界之后的资源。

## 根因

扫描器用字符串搜索与通用引号配对近似 HTML tokenizer，没有区分 canonical `-->`、畸形 `--!>`，也没有限制只有 `=` 后的 quoted attribute value 才能让 `>` 留在标签内。

## 解决方案

1. comment 扫描识别 canonical、`--!>` 与 abrupt close，遇到非 canonical 结束立即报错并从浏览器结束点续扫；
2. tag-end 状态机只在 `=` 后进入 quoted value；unquoted value 中的引号与 `<` 标记为非法但不改变边界；
3. declaration 保留最早结束边界，但不套用普通 attribute 判错，以兼容 Love Tree 的 XHTML PUBLIC doctype；
4. 为 comment、普通标签与 bogus declaration 三条绕过路径各加 hostile fixture。

## 回归验证

- [x] 两条原始绕过输入均报告外部资源；
- [x] bogus declaration 变体不能吞掉后续资源；
- [x] Love Tree 的 XHTML 1.0 Strict doctype 保持通过；
- [x] 真实 catalog 的 47 个 A 级入口静态合同通过。

## 相关提交

- 本次“catalog 本地启动合同”实现提交

## 借鉴与来源声明

本修复来自仓库内部威胁建模与独立代码审查，没有新增外部开源参考、代码、素材或第三方依赖。
