# Zsh 中 `path` 变量覆盖命令搜索路径

- 状态：`fixed`
- 日期：2026-07-25
- 范围：多 worktree 调度脚本

## 现象

在创建下一轮四个 worktree 前的校验循环中，脚本为目标目录使用了变量名 `path`。循环随后的 `git` 调用全部报错：

```text
zsh: command not found: git
```

失败发生在任何 branch 或 worktree 创建之前，因此没有留下部分完成的 Git 状态。

## 根因

Zsh 将数组变量 `path` 与环境变量 `PATH` 绑定。给 `path` 赋单个目录值会同步覆盖命令搜索路径，导致 shell 无法再定位 `git`。

## 解决

将局部变量改名为 `worktree_dir`，重新执行“分支不存在、目录不存在”校验后再创建 worktree。

## 验证

- 四个新 worktree 均从 `main@3aaba821ecbb` 创建成功。
- 每个 worktree 的 `git status --short --branch` 均只显示预期的新分支且工作树干净。
- 后续 Zsh 编排脚本禁止把 `path` 用作普通标量变量名。
