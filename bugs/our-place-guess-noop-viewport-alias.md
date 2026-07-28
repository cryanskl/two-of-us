# Our Place Guess：no-op viewport 可变引用别名

## 影响

`zoomViewport` 和 `panViewport` 的部分 no-op 路径会把调用方传入的 viewport 对象原样返回。调用方若随后修改这个未冻结对象，先前保存的“结果”也会一起变化，破坏地图纯函数输出应当具备的引用隔离与递归冻结约定。

受影响路径：

- 非法缩放档位；
- 与当前值相同的缩放档位；
- 非法平移量；
- `{ x: 0, y: 0 }` 零平移量。

## 根因

上述分支直接执行 `return value`。即使输入结构合法，它仍可能是调用方持有的可变普通对象，因此返回值与外部状态共享同一对象及 `center` 子对象引用。

## 修复

所有合法 viewport 的 no-op 分支现在都通过内部 `makeViewport` 重新规范化：

- 创建与输入断开引用的 viewport 和 `center`；
- 钳制并规范化坐标；
- 对结果递归冻结；
- 非法 viewport 则失败关闭为新的完整世界视图。

## 回归测试

`map.test.js` 新增用例，分别覆盖非法缩放、同值缩放、非法平移和零平移。每条路径都验证：

- 结构和值保持一致；
- 根对象与 `center` 均不复用调用方引用；
- 返回树递归冻结；
- 修改原始对象不会改变结果。

验证命令：

```sh
node --test experiences/co-op/our-place-guess/map.test.js
node --check experiences/co-op/our-place-guess/map.js
git diff --check
```

结果：`9/9` 测试通过，语法检查与差异检查通过。

写入与提交前的工作树核验：

```text
branch: codex/exp-our-place-guess-core
worktree: <worktree-root>
```

修复提交：`6432af9 fix: isolate no-op map viewports`
