# 月相 localhost 启动缺失 favicon 污染控制台

- 状态：`fixed`
- 日期：2026-07-18
- 影响作品：把月亮拨回那一天的统一启动器 / localhost 路径
- 发现版本 / commit：`845d13e fix: fit moon phase unlock in desktop viewport`

## 现象

`file://` 直开没有控制台消息；通过本地静态服务打开时，Chromium 自动请求根 `/favicon.ico`，返回 404，使正常路径出现 1 条 console error。

## 根因

作品没有声明自己的图标，浏览器回退请求站点根 favicon。仓库静态服务不会为每个作品自动生成该文件。

## 解决方案

在作品目录添加代码原生 `assets/favicon.svg`，由 HTML 使用相对路径显式声明；借鉴声明同步标注该 SVG 不含第三方图形或字体。

## 回归验证

- [x] 全新 localhost 浏览器会话控制台 0 error / 0 warning；
- [x] 请求列表只有 7 个本地 HTML、CSS、JS、PNG 与 SVG，全部 200；
- [x] HTML 使用作品目录相对图标路径，适用于 `file://`；
- [x] `npm run verify` 通过本地引用检查。
