# 把影子，跳成我们：无 Segmenter 回退错误计算多语种字素与非 emoji ZWJ

- 状态：`fixed`
- 日期：2026-07-21
- 影响作品：把影子，跳成我们
- 发现版本 / commit：纯逻辑首次实现，提交前独立审计发现

## 环境

- Node.js v22 VM；显式提供 `{ Intl: {} }`
- 启动等级与入口：A；`normalizeConfig()` / `resolveCompletionNote()`

## 复现步骤

1. 禁用 `Intl.Segmenter`，强制进入确定性字素回退；
2. 分别用 `שְ`、`نّ`、`का`、Hangul Jamo `가` 重复 12 次作为席位名；
3. 再用包含非 emoji ZWJ 的 `a‍b` 构造 12 / 13 字素边界；
4. 与 `Intl.Segmenter` 的计数比较。

## 预期结果

常见多语种组合序列在 12 字素时接受、13 字素时整份回退；emoji ZWJ 合并，非 emoji ZWJ 不应吞掉相邻字素。

## 实际结果

旧回退只枚举少量附加符区段，错误拒绝希伯来文、阿拉伯文、天城文和 Hangul；同时无条件合并任意 `ZWJ + code point`，允许实际超过 12 字素的非 emoji 文本越界。

## 根因

实现用少数示例字符近似 Unicode grapheme break 规则，测试又只覆盖同一组拉丁与 emoji 示例，形成实现和测试共同的窄化假设。

## 解决方案

- 用 Unicode `Mark` 属性覆盖组合附加符；
- 实现 Hangul L/V/T/LV/LVT 连接规则；
- ZWJ 只连接 `Extended_Pictographic` emoji 序列；
- 在无 `Intl.Segmenter` VM 中加入拉丁、希伯来、阿拉伯、天城文、Hangul、emoji/非 emoji ZWJ 和旗帜的 12 / 13 边界。

## 回归验证

- [x] 多语种 Mark 与 Hangul 12 接受、13 拒绝
- [x] emoji ZWJ 合并，`a‍b` 按两个字素计算
- [x] 120 / 121 字素完成赠言边界通过
- [x] 定向测试 27 / 27、全仓测试与统一校验通过

## 相关提交

- 本次“把影子，跳成我们”纯逻辑提交
