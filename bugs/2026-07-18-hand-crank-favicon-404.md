# 把这首转给你：缺失 favicon 污染 localhost 控制台

- 状态：`fixed`
- 日期：2026-07-18
- 影响作品：把这首转给你
- 发现版本 / commit：`a56d798`

## 复现步骤

1. 用 Python 静态服务器打开作品；
2. 查看浏览器控制台。

## 预期结果

正常加载为 0 error / 0 warning。

## 实际结果

浏览器自动请求 `/favicon.ico`，服务器返回 404。

## 根因与解决方案

页面没有声明 favicon。增加空的 `data:,` favicon，兼容 localhost 与 `file://`，不引入远程请求。

## 回归验证

- [x] localhost 刷新后控制台 0 error / 0 warning；
- [x] `file://` 直开正常；
- [x] 目录网络 Gate 通过。

## 相关提交

- `6dd61c0 fix: harden music box browser fallbacks`
