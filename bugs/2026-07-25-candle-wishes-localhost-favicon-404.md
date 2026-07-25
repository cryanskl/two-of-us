# Candle Wishes：localhost 自动请求 favicon 返回 404

- 状态：`fixed`
- 日期：2026-07-25
- 影响作品：`candle-wishes`
- 发现版本 / commit：`d7ed78c825cc80b5ab241ed8d0940df8e5645412`

## 环境

- 操作系统：macOS
- 浏览器：受控 Chrome
- 启动等级与入口：A 级；localhost 初检入口

## 复现步骤

1. 在仓库根目录启动本机静态服务。
2. 用 Chrome 打开 `experiences/surprises/candle-wishes/index.html`。
3. 查看静态服务请求日志。

## 预期结果

页面所需资源全部从作品自己的相对路径成功加载，不产生无关 404。

## 实际结果

HTML 没有声明 favicon，Chromium 自动请求站点根目录 `/favicon.ico`，静态服务返回 404。

## 根因

入口缺少显式图标链接。Chromium 因而采用根目录默认探测，而作品目录和仓库根目录都没有对应的 `favicon.ico`。

## 解决方案

- 在作品目录新增原创 `favicon.svg`，只含内联 SVG 基本图形和本项目色板；
- 在 `index.html` 通过相对路径 `favicon.svg` 显式声明图标；
- 静态 UI 测试锁定相对链接、文件存在、SVG 无脚本、无嵌入页面、无外部资源。

该图标为本项目原创，不借用任何开源项目代码、图形或素材，无需新增第三方归因。

## 回归验证

- [x] 静态测试确认 `index.html` 使用相对 `favicon.svg`
- [x] 静态测试确认图标文件存在且不引用外部资源
- [x] Candle Wishes 定向测试通过
- [x] 真实 Chrome 独立会话重新打开 localhost，页面成功请求相对 `favicon.svg`
- [x] 受控页面加载窗口内六项本地资源均返回 `200`
- [x] CDP `Log` 与 `Runtime` 忽略缓存重载未采集到 console 事件

补充：页面交互结束约四分钟后，服务清理前出现一条没有伴随 document 请求的孤立 `/favicon.ico` 404。它不属于受控页面加载资源序列，单凭服务日志无法归因到作品页面、其他标签或 Chrome 会话外壳。因此修复结论限于“作品入口已显式闭合相对图标请求”，不扩张为“整个浏览器生命周期绝不会探测站点根图标”。

## 相关提交

- 本次 favicon 修复提交（见包含本记录的 Git 提交）
