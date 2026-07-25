# 本地直开 HTML：用 data favicon 关闭隐式 404

适用范围：零依赖静态 HTML、`file://` 双击直开作品、本地 HTTP 验收页，以及任何把
“零失败网络请求”作为 Gate 的小型页面。

## 核心结论

应用代码没有 `fetch`、外链图片或远程字体，不代表浏览器只会请求 HTML 中写出的
URL。页面未声明 favicon 时，Chrome 等浏览器可能自动探测 origin 根目录：

```text
GET /favicon.ico → 404
```

这个请求通常不影响视觉或交互，也不一定进入控制台 error；如果 Network 监听在首次
加载后才开启，还可能漏掉它。HTTP server access log 是补充网络证据的重要来源。

对不需要图标、又不想增加二进制文件的本地页面，可在 `<head>` 明确声明空 data
favicon：

```html
<link rel="icon" href="data:,">
```

它同时满足：

- 不产生 HTTP 请求；
- `file://` 下不依赖额外文件；
- 不增加打包或安装步骤；
- 不引入第三方素材和许可证问题；
- 不影响页面布局。

## 回归合同

不要只靠浏览器“这次没看到 404”。静态测试应锁定 favicon 声明，并继续验证所有
相对 `src` / `href` 文件真实存在：

```js
assert.match(html, /<link\b[^>]*rel="icon"[^>]*href="data:,"/i);
```

浏览器复验应从新 tab 或冷加载开始，并同时看 Network 失败事件与 server access
log。若产品确实需要品牌图标，应改为仓库内可追溯、已记录来源/许可证与 SHA-256 的
本地资源，而不是继续使用空 data URL。

## 证据

本结论来自“影子剑术”最终验收中的真实缺陷：

- [`../bugs/2026-07-25-shadow-sword-duel-favicon-404.md`](../bugs/2026-07-25-shadow-sword-duel-favicon-404.md)
- [`../experiences/versus/shadow-sword-duel/index.html`](../experiences/versus/shadow-sword-duel/index.html)
- [`../experiences/versus/shadow-sword-duel/ui-contract.test.js`](../experiences/versus/shadow-sword-duel/ui-contract.test.js)
