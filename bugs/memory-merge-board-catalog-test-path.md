# Memory Merge Board catalog 静态测试路径多退一层

- 日期：2026-07-25
- 范围：`experiences/co-op/memory-merge-board/solver.test.js`
- 类型：测试路径缺陷

## 环境

- Node.js v22.22.3
- 分支：`codex/exp-memory-merge-board-core`
- 定向命令：
  `node --test experiences/co-op/memory-merge-board/logic.test.js experiences/co-op/memory-merge-board/solver.test.js`

## 重现

运行 solver 测试时，最后一项“核心候选未进入共享 catalog”抛出：

```text
ENOENT: no such file or directory,
open '{worktree-root}/catalog.json'
```

## 预期

测试应读取仓库内 `experiences/catalog.json`，确认本核心候选尚未进入共享 catalog。

## 实际

测试从项目目录使用 `../../../catalog.json`，多返回了一层，最终查找仓库根下不存在的
`catalog.json`。

## 根因

项目目录为 `experiences/co-op/memory-merge-board`。回到 `experiences` 只需
`../..`，而不是 `../../..`。

## 修复

把静态测试路径改为：

```text
../../catalog.json
```

## 回归验证

- 定向 solver 测试能读取真实 `experiences/catalog.json`；
- 断言 catalog 不含 `"memory-merge-board"`；
- 定向测试、全仓测试和 repository verify 均需通过。
