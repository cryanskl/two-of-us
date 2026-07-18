# 这一拍，刚好和你：SVG 标准命名空间被离线 Gate 误判为网络地址

- 状态：`fixed`
- 日期：2026-07-18
- 影响作品：这一拍，刚好和你的 catalog 离线边界测试
- 发现版本 / commit：`2d36851 feat: add four hands harmony experience`

## 环境

- 操作系统：macOS
- 运行时：Node.js 22
- 启动等级与入口：A 级，`file://` 静态入口的机器 Gate

## 复现步骤

1. 在作品中用 `document.createElementNS("http://www.w3.org/2000/svg", "svg")` 创建内联 SVG 图标。
2. 运行 `node --test shared/runtime/catalog.test.js`。
3. 观察网络协议断言输出整份运行时代码并失败。

## 预期结果

标准 SVG 命名空间作为 DOM 类型标识被允许；其余 HTTP、WebSocket、`data:` 与 `blob:` 字符串仍被拒绝。

## 实际结果

旧断言把 `http://www.w3.org/2000/svg` 当成真实网络地址，导致一个没有联网行为的 A 级作品无法通过 Gate。

## 根因

协议正则只检查字符串形状，无法区分可导航 URL 与 W3C 定义的固定 XML 命名空间。浏览器不会因为 `createElementNS` 接收该标识而发起请求。

## 解决方案

在执行协议断言前，仅从待检查文本中移除精确的 `http://www.w3.org/2000/svg` 常量；同时新增断言，要求它只能作为 `createElementNS` 的标准参数存在。没有扩大其他 HTTP 地址的白名单。

## 回归验证

- [x] 原始定向 catalog Gate 57 / 57 通过
- [x] 全仓测试 536 / 536 通过
- [x] 统一安装验证确认 40 个作品入口

## 相关提交

- `3589307 feat: catalog four hands harmony`
