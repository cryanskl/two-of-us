# 全仓并发测试中的启动器子进程退出超时

## 现象

接入 `wish-fireworks` 后运行全仓 `npm test`，2316 项中有 2315 项通过，唯一失败为：

```text
a sequential second launcher reuses the first process and leaves the next port free
等待 child process 退出超时。
```

失败位置是 `scripts/start-reuse.integration.test.mjs` 的子进程退出等待，不涉及
`wish-fireworks` 的目录、运行时或交互断言。

## 定位

立即单独运行：

```bash
node --test scripts/start-reuse.integration.test.mjs
```

结果为 3/3 通过，其中原失败用例约 1.3 秒完成。说明当前证据更符合全仓并发负载
下的偶发进程退出时序抖动，而不是可稳定复现的产品回归。

## 当前解决方案

1. 先单独复跑失败文件，确认端口复用、外部服务避让和不同内容运行时三条路径均通过。
2. 再重新运行完整 `npm test`，只有全仓通过才允许提交目录接入。
3. 不因一次偶发超时放宽断言或延长超时，以免掩盖真实的子进程泄漏。

若后续在独立复跑中再次出现，应检查子进程的 signal/close 顺序、测试结束后的监听器
清理和并发端口占用，并为退出握手增加可观察状态，而不是继续累计超时时间。
