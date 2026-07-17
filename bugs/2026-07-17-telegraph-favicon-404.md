# Bug：默契电报码缺失 favicon 导致浏览器控制台 404

- 状态：`fixed`
- 日期：2026-07-17
- 影响作品：默契电报码
- 发现版本 / commit：`bc8fbeb` 后的实现阶段，修复包含于 `7b86b15`

## 环境

- 操作系统：macOS
- 浏览器：Playwright CLI headed Chromium
- 启动等级与入口：A 级，`experiences/co-op/telegraph-codebook/index.html`
- 本地验证服务：`http://127.0.0.1:4177`

## 复现步骤

1. 在全新浏览器会话打开作品；
2. 查看 console 和静态请求记录；
3. 观察默认 `/favicon.ico` 请求。

## 预期结果

控制台无错误，作品只加载自身 HTML、CSS 与两份脚本。

## 实际结果

页面没有显式 favicon，Chromium 自动请求服务器根路径 `/favicon.ico`，得到 404 并在控制台记为资源错误。

## 根因

遗漏了浏览器默认 favicon 请求这一页面壳行为；它不影响玩法，但会污染真实验收的错误面。

## 解决方案

添加本地空 data favicon：`<link rel="icon" href="data:," />`。它不增加文件、外部请求或运行依赖。

## 回归验证

- [x] 全新 Chromium 会话控制台无错误
- [x] 静态请求只有同源 `index.html / styles.css / logic.js / app.js`
- [x] catalog 远程资源 Gate 继续通过
- [x] 直接打开仍不需要额外文件

## 相关提交

- `7b86b15`：favicon 与完整作品实现
