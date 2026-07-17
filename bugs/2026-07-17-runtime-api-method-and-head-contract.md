# 运行时 API 未限制方法且 HEAD 仍写响应体

- 状态：`fixed`
- 发现日期：2026-07-17
- 影响范围：`/api/health`、`/api/catalog` 与后续本地能力 API

## 复现

在旧运行时启动后请求：

```text
POST /api/catalog
HEAD /api/health
```

`POST /api/catalog` 会在通用方法 Gate 之前命中 catalog 分支并返回 `200`。JSON helper 也不区分 `HEAD`，仍调用 `response.end(body)`；客户端通常丢弃 HEAD body，因而这个服务端契约错误不容易从页面表象发现。

## 根因

路由顺序先处理 health/catalog，再统一限制 `GET` / `HEAD`；同时 JSON helper 只接收 response，不知道原始请求方法。

## 修复

- API 路由在业务分支前统一拒绝非 `GET` / `HEAD`，返回 `405` 与 `Allow: GET, HEAD`。
- JSON helper 接收 request；HEAD 保留与 GET 相同的状态、header 和 `Content-Length`，但不写响应体。
- 能力运行时沿用同一契约。

## 验证

- `POST /api/catalog` 返回 `405`。
- `HEAD /api/health` 返回 `200`、有效 `Content-Length` 与空 body。
- 运行 `node --test shared/runtime/server.test.js`。

