# 本地门户根路径被误判为越界并返回 404

## 环境

- 日期：2026-07-15
- 系统：macOS
- Node.js：22.22.3
- 触发命令：`npm test`

## 复现

1. 以 `new URL("../../", import.meta.url)` 形式把仓库根目录传给本地运行时；
2. 请求门户 `/`；
3. `shared/runtime/server.test.js` 得到 404，`resolveStaticPath(root, "/")` 返回 `null`。

## 预期与实际

- 预期：仓库根目录规范化后解析为根 `index.html`；
- 实际：合法入口被静态目录边界检查误判为越界。

## 根因

`fileURLToPath()` 保留根目录末尾的 `/`，旧边界检查又拼接 `path.sep`，形成 `//`。合法子路径不再以这个字符串开头，因此返回 `null`。

## 解决方案

在 `shared/runtime/static.js` 中先用 `path.resolve()` 规范化 URL 或字符串形式的根目录，再进行路径白名单与越界检查。

## 验证

- `npm test`：7/7 通过；
- 根门户、health、catalog 和作品入口返回 200；
- `.git/config` 等非公开路径继续返回 404；
- Ctrl+C 后端口正常释放。
