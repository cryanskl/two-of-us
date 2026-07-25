# 独立 worktree 下 shared static resolver 测试硬编码仓库目录名

- 发现日期：2026-07-25
- 发现阶段：`compliment-reels` 非视觉核心全仓回归
- 影响：所有目录名不是精确 `two-of-us` 的独立 worktree
- 状态：已由总控修复

## 复现

在 worktree
`/Users/zenith/Desktop/two-of-us-worktrees/compliment-reels` 执行：

```bash
npm test
```

1873 项测试中 1872 项通过，唯一失败为
`shared/runtime/static.test.js` 的
`static resolver maps the portal and keeps files inside the repository`：

```text
The input did not match the regular expression /two-of-us\/index\.html$/.
Input: /Users/zenith/Desktop/two-of-us-worktrees/compliment-reels/index.html
```

## 根因

测试把主 checkout 的目录名 `two-of-us` 写进绝对路径正则。Git worktree 的目录名
按项目变化，但 resolver 返回当前 repository root 内的 `index.html` 仍是正确
行为。失败属于测试位置假设，不是 static resolver 或 compliment-reels 逻辑故障。

## 建议修复

由总控在共享文件所有权下，把目录名正则替换成基于当前 repository root 的绝对
路径等值断言，例如比较：

```js
path.resolve(resolveStaticPath("/"))
path.resolve(repositoryRoot, "index.html")
```

同时保留“路径不得逃出 repository root”的独立断言。不要放宽为任意
`index.html` 后缀，否则会削弱 traversal Gate。

## 已实施修复

总控将目录名正则替换为当前测试文件解析出的 repository root 与 `index.html` 的
绝对路径等值断言。该断言既允许任意合法 worktree 目录名，也不会退化成只检查
任意 `index.html` 后缀；原有 traversal 与公开路径 Gate 保持不变。

修复后分别在主工作树和独立项目 worktree 运行全仓测试，确保两种目录形状均通过。

## 发现时的回归证据

- `compliment-reels` 定向测试：22/22 通过；
- 其余全仓测试：1872/1872 通过；
- 唯一失败与新增项目文件内容无关；
- 本执行 Session 无权修改 `shared/runtime/static.test.js`，已作为共享需求回报总控。
