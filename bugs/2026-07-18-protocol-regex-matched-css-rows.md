# 静态协议正则误报 CSS `rows:`

- 状态：`fixed`
- 日期：2026-07-18
- 影响作品：把月亮拨回那一天的 catalog 离线边界测试

## 现象

“把月亮拨回那一天”的定向逻辑与仓库结构验证通过，但 `npm test` 的本地网络边界测试失败，并输出整份 `styles.css`。

## 复现

```bash
node --test shared/runtime/catalog.test.js --test-name-pattern='moon phase secret'
```

旧断言使用 `/(?:https?:|wss?:|data:|blob:)/i`。其中 `wss?` 允许匹配 `ws`，因此 `grid-template-rows:` 末尾的 `ws:` 被误判为 WebSocket 协议。

## 解决方案

将 HTTP/WS 协议检查收紧为“词边界 + `://`”，并让 `data:`、`blob:` 同样要求词边界：

```js
/\b(?:https?|wss?):\/\/|\b(?:data|blob):/i
```

这样仍会拒绝真实远程地址与内联资源协议，同时不会命中 CSS 属性名。

## 回归验证

- [x] 月相作品 catalog 边界测试通过；
- [x] `npm test` 423 / 423 通过；
- [x] `npm run verify` 确认 34 个作品入口。

## 相关提交

- `f5708e0 feat: add moon phase secret experience`
