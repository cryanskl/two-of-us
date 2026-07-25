# Compliment Reels 函数递归冻结导致初始化栈溢出

- 发现日期：2026-07-25
- 影响阶段：`compliment-reels` 非视觉核心首次定向测试
- 状态：已修复并回归验证

## 复现

在初版 `logic.js` 中，`deepFreeze` 同时递归普通对象和函数。执行：

```bash
node --test experiences/surprises/compliment-reels/logic.test.js
```

模块初始化时稳定抛出：

```text
RangeError: Maximum call stack size exceeded
```

## 根因

函数拥有 `prototype` 数据属性，而该 prototype 的 `constructor` 又指回原函数。
没有 visited-set 的递归冻结沿
`function → prototype → constructor → function` 无限循环。项目需要递归冻结的是
action、state、plan、content 和 public view 等纯数据，不需要遍历 composer 或 API
函数的原型对象图。

## 修复

`deepFreeze` 只递归并冻结非 null object；函数引用作为值保留，不进入其 prototype。
测试辅助函数采用相同边界，避免重复错误假设。

## 回归 Gate

- 模块可完成初始化；
- 默认配置仍保存可调用 composer；
- action、state、plan、content 和 public view 的嵌套纯数据仍通过递归冻结断言；
- 定向测试必须完整通过后才提交核心阶段。
