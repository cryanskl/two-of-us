# 这一圈，和你同时到：localhost 自动请求 favicon 返回 404

- 状态：`fixed`
- 日期：2026-07-25
- 环境：Chrome，localhost 自动化入口

## 复现与实际结果

打开生产 `index.html` 后，页面本身只声明样式和四个本地脚本，但 Chrome 仍自动
请求站点根 `/favicon.ico`。静态服务器返回 `404 File not found`，污染网络
验收日志。

## 预期

生产页面加载只出现明确声明的本地资源，控制台与服务器日志没有 404。

## 根因与修复

页面没有显式 favicon。新增项目内手写 `favicon.svg`，只包含双环、六角星和
菱形几何，并在 HTML 中用相对路径声明。文件不含文字、英文项目名、第三方代码
或第三方素材；UI 契约将它纳入 A 级生产包。

## 回归

- Chrome reload 后 `favicon.svg` 返回 200；
- 服务器日志不再出现新的 `/favicon.ico`；
- UI 契约和零公网资源扫描通过。
