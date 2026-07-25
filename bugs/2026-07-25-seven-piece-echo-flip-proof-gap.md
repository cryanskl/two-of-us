# Bug：回响目标缺少“必须翻面”的不可解证明

- 状态：`fixed`
- 日期：2026-07-25
- 影响作品：`experiences/co-op/seven-piece-duet`
- 发现版本 / commit：`f3db4b5`

## 环境

- 操作系统：macOS，本地 Node.js 22
- 浏览器与版本：不涉及；问题位于非视觉目标生成核心
- 启动等级与入口：未安装候选，`tools/generate-targets.mjs --check`

## 复现步骤

1. 阅读 `docs/328-tangram-heart-duet-spec.md` 的目标合同，其中 `echo / 回响`
   明确要求平行四边形翻面。
2. 运行原 `node experiences/co-op/seven-piece-duet/tools/generate-targets.mjs --check`。
3. 检查原生成器和 `TARGETS.md`：它们只验证冻结标准解的
   `parallelogram.flipped === true`，没有枚举全部合法 placement，也没有证明移除
   flip 后不存在其他 exact cover。

## 预期结果

生成器应独立枚举七个 piece-ID 与全部目标 coverage cells 的 exact-cover rows；
四目标至少可解，冻结解属于解集，并且 `echo` 在移除全部平行四边形翻面 rows
之后严格 UNSAT。

## 实际结果

原检查只能证明“选定的一组标准 pose 使用了翻面”。这不足以推出“目标要求翻面”，
且文档还主动把两者区分开，因而没有满足冻结规格。

## 根因

目标阶段把生成器找到的标准拼法误当成目标全部解空间的证明。几何层具备精确
coverage，但生成检查没有建立 `7 piece-ID + 32 coverage cells` 的 exact-cover
矩阵，也没有执行 no-flip 反证 Gate。

## 解决方案

提交 `4ab916e` 新增确定性 exact-cover 验证器：

- 固定枚举全部合法 pose rows；
- 以可选 row 最少的列优先、固定 tie-break 执行 Algorithm X；
- 验证四个冻结标准解均在 row 集中且四形至少可解；
- 对 `echo` 删除所有 `parallelogram.flipped === true` rows 后验证 UNSAT；
- 更新生成器、测试与 `TARGETS.md` 的准确表述。

当前冻结 `echo` 本身已经通过 no-flip UNSAT，因此不需要替换候选，生成 payload
SHA-256 保持 `c41d1e8e73a1caf3d994d9b9b8b81e0287d4838d8d2986caad7e3ed21766506a`。

## 回归验证

- [x] `node --test --test-name-pattern="deterministic exact cover" experiences/co-op/seven-piece-duet/targets.test.js`
- [x] `node experiences/co-op/seven-piece-duet/tools/generate-targets.mjs --check`
- [x] `npm run verify`
- [x] `git diff --check`

## 相关提交

- `4ab916e fix: prove echo requires a flipped piece`
