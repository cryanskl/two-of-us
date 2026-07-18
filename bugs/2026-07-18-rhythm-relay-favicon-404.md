# Bug：节拍接力缺失 favicon 导致浏览器控制台 404

- 状态：`fixed`
- 日期：2026-07-18
- 影响作品：节拍接力
- 发现版本 / commit：`f8e27a2` 后的共享音频验收阶段

## 环境

- 操作系统：macOS
- 浏览器：Playwright CLI headed Chromium
- 启动等级与入口：A 级，`experiences/co-op/rhythm-relay/index.html`
- 本地验证服务：`http://127.0.0.1:4174`

## 复现步骤

1. 在全新浏览器会话打开节拍接力；
2. 查看浏览器 console；
3. 观察服务器根路径的 `/favicon.ico` 请求。

## 预期结果

作品自身资源全部成功加载，控制台没有资源错误。

## 实际结果

页面未声明 favicon，Chromium 自动请求 `/favicon.ico` 并得到 404。玩法不受影响，但真实浏览器验收出现一条错误。

## 根因

页面壳遗漏了 favicon 声明，浏览器因此执行默认站点图标请求。

## 解决方案

在页面头部添加本地空 data favicon：`<link rel="icon" href="data:," />`。它不增加外部请求、文件或启动依赖。

## 回归验证

- [x] 原始复现路径通过
- [x] 相关自动检查通过
- [x] 未引入新的控制台错误

## 相关提交

- 本次共享短音播放器提交
