# Zsh 中 `status` 是只读特殊参数

- 状态：`fixed`
- 日期：2026-07-25
- 范围：总控测试包装命令

## 现象

为了在继续执行 `git diff --check` 后保留测试退出码，包装命令使用：

```zsh
node --test ...; status=$?; ...; exit $status
```

Zsh 在测试完成后报错：

```text
zsh: read-only variable: status
```

因此后续 diff-check 没有在该次命令中执行。项目测试输出本身完整，不受这个 shell 错误影响。

## 根因

`status` 是 Zsh 提供的只读特殊参数，等价于上一条命令的退出状态。它不是可自由赋值的普通变量。

## 解决

包装命令改用非特殊名称，例如：

```zsh
node --test ...
test_exit=$?
git diff --check
exit $test_exit
```

如果只需要“任一步失败就停止”，优先使用 `set -e` 和 `&&`，不额外保存退出码。

## 验证

- 使用 `test_exit` 后可正常保留并返回测试退出码。
- `git diff --check` 能在测试后实际执行。
- 后续 Zsh 脚本禁止把 `status` 用作自定义变量名。
