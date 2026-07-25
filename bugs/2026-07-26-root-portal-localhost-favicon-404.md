# 根门户：localhost 自动请求 favicon 返回 404

- 状态：`fixed`
- 日期：2026-07-26
- 环境：Chrome，localhost 自动化入口

## 复现与实际结果

打开根门户 `index.html` 后，页面没有声明站点图标。Chrome 自动请求
`/favicon.ico`，静态服务器返回 `404 File not found`。作品目录与跳转功能均
正常，但这条请求会污染统一浏览器验收的网络结果。

## 预期

根门户只加载明确声明的本地资源，浏览器不再发出隐式 `/favicon.ico` 请求，
控制台、运行时异常与非预期网络失败均为零。

## 根因与修复

浏览器会在页面没有 favicon 声明时按约定探测站点根路径。现在由根门户显式引用
仓库内的 `./favicon.svg`；图标是手写的被动 SVG，仅包含本项目的双色心形与双人
几何，不含脚本、外链、第三方代码或第三方素材。

## 回归

- `scripts/portal-favicon.test.mjs` 校验 HTML 声明、文件存在和被动 SVG 边界；
- Chrome reload 后 `favicon.svg` 返回 200 或缓存 304；
- 服务器不再收到新的 `/favicon.ico` 请求；
- 根门户目录筛选与作品跳转链路保持不变。
