# 影子剑术：浏览器隐式 favicon 探测返回 404

- 状态：`fixed`
- 日期：2026-07-25
- 影响作品：影子剑术
- 发现版本：`e2634cf docs: verify shadow sword duel production UI`

## 环境

- 浏览器：Chrome
- 启动入口：
  `http://127.0.0.1:4175/experiences/versus/shadow-sword-duel/`
- 本地服务：`python3 -m http.server 4175 --bind 127.0.0.1`

## 复现步骤

1. 用 Chrome 首次打开作品 localhost 入口。
2. 完成页面加载。
3. 关闭本地 HTTP 服务并检查 access log。

## 预期结果

作品只加载 `index.html`、`styles.css`、`config.js`、`logic.js` 和 `app.js`，不产生
失败请求。

## 实际结果

页面功能、控制台和五个生产文件全部正常，但 Chrome 额外请求 `/favicon.ico`；
仓库根没有该文件，因此本地服务返回 404。较晚启用的 CDP Network 观察没有包含
首次探测，最终 server access log 才揭示这个缺口。

## 根因

`index.html` 没有声明 favicon。浏览器在没有显式图标关系时，会自行探测 origin
根路径的 `/favicon.ico`；这不是应用脚本发起的外联，却仍破坏“零失败请求”的验收
证据。

## 解决方案

先在 `ui-contract.test.js` 增加必须存在 data favicon 的失败回归，再在 `<head>`
加入：

```html
<link rel="icon" href="data:,">
```

该空 data URL 不依赖文件、不产生网络请求，也不会改变 A 级 `file://` 直开闭包。

## 回归验证

- [x] 红测先以 6 / 7 失败，精确指向缺少 favicon 声明
- [x] 修复后 UI 契约 7 / 7 通过
- [x] 修复后静态合同证明 icon 由不发起 HTTP 的 `data:,` 显式接管
- [x] 页面生产引用仍只有五个同源本地文件
- [x] 控制台 warning/error 为空
- [x] 定向、全仓和 repository verify 继续通过

## 相关沉淀

- [`../learn/2026-07-25-data-favicon-for-local-html.md`](../learn/2026-07-25-data-favicon-for-local-html.md)
