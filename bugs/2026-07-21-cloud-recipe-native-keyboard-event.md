# 这一场雨，我们一起接：真实 KeyboardEvent 快捷键全部失效

- 状态：`fixed`
- 日期：2026-07-21
- 影响作品：这一场雨，我们一起接
- 发现版本 / commit：逻辑部分提交前

## 环境

- macOS；Node.js 22 最小原型事件探针；浏览器原生 KeyboardEvent 结构
- 启动等级与入口：A；`experiences/co-op/cloud-recipe/index.html`

## 复现步骤

1. 构造 `Object.create({ code: "KeyA", repeat: false })` 模拟字段位于原型访问器上的原生事件；
2. 调用 `classifyBoundaryKey(event)`；
3. 观察返回值。

## 预期结果

返回 seat 0、direction -1 的 MOVE_BOUNDARY action；真实 KeyA/KeyD/方向键都能操作。

## 实际结果

返回 `null`。分类器要求 `isPlainObject`，且 `safeRead` 只读取自有 data property；原生 KeyboardEvent 的字段来自原型访问器，因此四个快捷键都会被过滤。

## 根因

把不可信协议对象的“精确自有字段 Gate”误套到浏览器事件。事件是平台对象，不应要求普通对象，但属性访问仍需捕获 getter/Proxy 异常。

## 解决方案

新增只用于平台事件的安全属性读取函数：允许 object/function，从实例或原型读取 `code/repeat`，任何读取异常返回失败。reducer action 的精确 schema 不变。

## 回归验证

- [x] 普通 event-like 四键映射通过
- [x] 原型字段 KeyA 映射通过
- [x] repeat、未知 code 与抛错 getter 返回 null
- [x] 定向与全仓测试通过

## 相关提交

- 本次“这一场雨，我们一起接”逻辑提交
