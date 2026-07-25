# Photo Slider Race 候选图片失败后锁死开局

## 现象

默认内置图仍可用时，开始选择一张本地图片并让解码失败，公开状态会把来源提前改成
`local/error`，同时把 `canStart` 设为 `false`。用户既没有得到新图片，也不能继续用
原来的内置图开始比赛。

## 复现

1. 从 `builtin/ready/generation=0` 初态开始；
2. 提交本地图片的 `loading/generation=1`；
3. 以 `decode-failed` 结束该候选；
4. 查看 `getPublicView()`，旧实现返回 `canStart: false`；
5. 再提交 `START_MATCH`，旧实现保持在 `setup`。

## 影响

这违反规格中的两阶段替换合同：候选图片失败不能改变当前 active 图片，也不能破坏
默认图的可玩性。提前把 `kind` 改成 `local` 还会让公开视图错误描述当前图片来源。

## 根因

状态机把 `kind` 同时当作“当前 active 来源”和“正在处理的候选来源”。进入
`loading` 时允许直接更改 `kind`，完成时又禁止更改；同时开局条件只接受
`status === "ready"`，把保留旧图的 `error` 状态误判为不可玩。

## 修复

- `loading` 期间必须保留当前 active `kind`；
- 同 generation 成功提交 `ready` 时才允许切换 `kind`；
- 失败提交必须保持当前 `kind`；
- 只有 `loading` 禁止开局，`error` 仍可使用未被替换的当前图片。

修复提交：`7f65ab7`。

## 防回归验证

`logic.test.js` 的“候选图片两阶段提交保留 active 来源，失败后当前图片仍可开局”
覆盖成功切换、失败保留、失败后开局和伪造失败来源四条路径。
