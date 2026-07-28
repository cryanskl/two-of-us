# 雪球留言 hostile input 合同缺口

- 日期：2026-07-23
- 范围：`experiences/surprises/snow-globe-message/logic.js`
- 发现阶段：纯逻辑首次提交前只读审查
- 状态：已修复

## 环境

- macOS，本地 `main` worktree：`<repo-root>`
- Node.js 运行 `logic.test.js`
- 纯逻辑层；不涉及 DOM、Canvas 或网络

## 问题一：Action Proxy 可改变第二次 descriptor 结果

### 复现

构造只有 `type` 的 Proxy。第一次 `getOwnPropertyDescriptor("type")` 返回
`BEGIN_SETTLE`，第二次返回 `RESTART`，然后把它传给 complete state 的
`reduce()`。

### 预期

每层输入只做一次 prototype、ownKeys 和 descriptor 快照。单次快照得到
`BEGIN_SETTLE` 后，它在 complete 阶段应保持原引用 no-op。

### 实际

旧实现先读取 `type` 判断 schema，再调用通用 `snapshotObject()` 重读
descriptor。第二次值被当成 `RESTART`，complete state 被错误重开。

### 根因与修复

`snapshotAction()` 没有把类型判定和字段复制绑定到同一份 descriptor
快照。修复后它只读取一次 prototype/ownKeys/type descriptor，再按该类型
读取其余字段；`type` 不再二次访问。回归测试同时断言状态保持原引用和
descriptor 读取次数精确为 1。

## 问题二：运行中原型污染会让公开 helper 抛错

### 复现

加载逻辑后，把 `String.prototype.charCodeAt`、`String.prototype.padStart`
或 `Array.prototype.join` 改成抛错函数，再调用 `sanitizeConfig()`、
`buildTargets()` 或 gathering 阶段的 `getPublicView()`。

### 预期

模块初始化时捕获必要 intrinsic。之后的原型改写不应改变合法输入的结果，
也不应让公开 helper 抛错。

### 实际

旧实现仍通过动态原型查找调用三个方法，因而会抛出污染函数的异常。

### 根因与修复

严格 snapshot 只覆盖了 Reflect、trim 等一部分 intrinsic，遗漏字符串遍历、
ID padding 和进度连接使用的方法。修复后初始化时捕获这三个方法及
`String` 构造器，所有调用都经已捕获的 `Reflect.apply`。回归测试在独立
VM realm 中污染原型，验证三个公开路径仍得到 canonical 结果。

## 回归验证

```bash
node --check experiences/surprises/snow-globe-message/logic.js
node --test experiences/surprises/snow-globe-message/logic.test.js
npm test
npm run verify
git diff --check
```

相关提交在本文件随纯逻辑首次提交一并落库；提交哈希以 Git 历史为准。
