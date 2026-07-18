# 这一格归谁：localhost 自动请求 favicon 返回 404

## 现象

通过 `http://127.0.0.1:8769/experiences/versus/dots-and-boxes/index.html` 打开页面时，玩法本身正常，但浏览器控制台出现 `/favicon.ico` 的 404。直接双击以 `file://` 打开时不会暴露这条网络错误。

## 原因

页面没有显式声明 favicon，Chromium 会退回请求站点根目录下的 `/favicon.ico`；独立体验目录并不提供这个根资源。

## 解决

- 在体验自己的 `assets/` 下加入原创的轻量 SVG 图标；
- 在 `index.html` 显式使用相对路径 `./assets/favicon.svg`；
- 在素材归属表中声明为本项目原创，不引入第三方素材或网络依赖。

## 回归要点

同时用 `file://` 和 localhost 打开，确认标题、脚本、样式、纹理和 favicon 均由相对路径加载，控制台保持零错误。
