# 数字凑靶：新测试误用 CommonJS，无法在 ESM 仓库执行

- 状态：`fixed`
- 日期：2026-07-17
- 影响作品：数字凑靶纯逻辑测试
- 发现版本 / commit：实现提交前工作区

## 环境

- macOS 26.5.2；Node.js v22.22.3；
- 仓库根 `package.json` 使用 `"type": "module"`；
- 命令：`node --test experiences/versus/number-target/logic.test.js`。

## 复现步骤

1. 在新的 `.test.js` 文件中使用 `require("node:test")`；
2. 从仓库根运行该测试；
3. Node 按 ESM 解析文件并在首次 `require` 处停止。

## 预期结果

测试使用仓库既定模块模式加载并执行。

## 实际结果

Node 报错：`ReferenceError: require is not defined in ES module scope`，测试文件没有进入用例阶段。

## 根因

新测试沿用了 CommonJS 写法，但仓库已通过根 `package.json` 把 `.js` 固定为 ESM。文件扩展名和加载语法不一致。

## 解决方案

把 `node:test`、`node:assert/strict` 改为 ESM `import`，并用 `await import("./logic.js")` 加载经典脚本后读取其全局导出。没有修改仓库模块策略。

## 回归验证

- [x] 原始测试命令 9 / 9 通过；
- [x] `npm test` 295 / 295 通过；
- [x] `npm run verify` 通过。

## 相关提交

- `d8da9f9 feat: add number target duel`
