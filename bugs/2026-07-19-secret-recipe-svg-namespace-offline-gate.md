# 藏好这一味：SVG 命名空间再次触发离线协议误报

- 状态：`fixed`
- 日期：2026-07-19
- 影响作品：藏好这一味的 catalog 离线边界测试
- 发现版本 / commit：目录接入的提交前候选；修复随 `8d519ac feat: register secret recipe code` 进入

## 环境

- 操作系统：macOS
- 运行时：Node.js 22
- 启动等级与入口：A 级，`file://` 静态入口的机器 Gate

## 复现步骤

1. 用 `document.createElementNS("http://www.w3.org/2000/svg", "svg")` 创建本作原生配料图标。
2. 把 HTML、JavaScript 与 CSS 拼接后，用“不得出现任何 `http://`”的正则扫描。
3. 运行 `node --test shared/runtime/catalog.test.js`。

## 预期结果

标准 SVG 命名空间作为 DOM 类型标识被允许；外部脚本、样式、图片、联网 API、浏览器存储与共享运行时仍被拒绝。

## 实际结果

测试把 W3C SVG 命名空间字符串当成网络请求地址并输出整份运行时代码。作品本身没有发起请求，仓库的 46 入口校验也能通过。

## 根因

字符串协议扫描无法判断 URL 出现的位置和用途。`createElementNS` 的命名空间标识不会导航或加载资源，而 `src`、`href`、`fetch`、`WebSocket` 等才具有外部访问能力。这是 [此前同类问题](./2026-07-18-four-hands-harmony-svg-namespace-gate.md) 的一次复发。

## 解决方案

- HTML 单独拒绝协议形式的外部 `src` / `href`；
- 运行时代码拒绝 `fetch`、XHR、WebSocket、Worker、Service Worker、媒体/传感器与浏览器存储 API；
- 明确拒绝仓库 `shared/` 运行时路径，并断言生产 CSS 只引用本地 `assets/apothecary-table.jpg`；
- 保留 SVG 标准命名空间，不建立会掩盖真实外链的宽泛字符串白名单。

## 回归验证

- [x] V09 两条 catalog 契约通过
- [x] catalog 定向测试 69 / 69 通过
- [x] 全仓测试 1185 / 1185 通过
- [x] 仓库验收通过：46 个作品入口、1 个能力声明

## 相关提交

- `8d519ac feat: register secret recipe code`

