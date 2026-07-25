# Worktree 依赖符号链接被内容身份校验拒绝

日期：2026-07-25

## 现象

Shadow Duet 项目定向测试通过，但 worktree 起初没有 `node_modules`，全仓测试会缺少
`qrcode`。把主工作树已安装依赖直接符号链接到本 worktree 后，模块加载恢复，
但 `start-reuse.integration.test.mjs` 的 3 项测试失败：

`node_modules/pannellum/build/pannellum.css 路径中不能包含符号链接`

## 原因

统一启动器会计算仓库内容身份，并有意拒绝解析路径中的符号链接。这个安全边界与
worktree 共用依赖目录的常见做法冲突。

## 解决

删除本轮创建的未跟踪符号链接，从主工作树已按锁文件安装的 `node_modules` 复制一份
未跟踪本地副本。不修改 `package.json`、锁文件或任何依赖版本，也不提交依赖目录。

替换为普通目录后，首次全仓 `npm test` 为 `2336/2336`，`npm run verify`
通过。最终复核时默认并发执行还复现了一个与依赖链接无关的启动器退出超时；
对应文件单独执行为 `3/3`，全仓单并发执行为 `2336/2336`。这两类问题应分别
诊断，不能把退出超时误归因于依赖复制。
