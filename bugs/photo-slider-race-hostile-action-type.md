# Photo Slider Race 敌对 action type 可触发隐式转换异常

## 现象

当 action 自身是普通精确对象，但它的 `type` 数据字段是带有敌对
`Symbol.toPrimitive` 的对象或已撤销 Proxy 时，`reduce()` 会向调用方抛异常，而不是
保持原状态。

## 复现

1. 创建合法内部 state；
2. 构造 `{ type: revokedProxy, revision: state.revision }`；
3. 调用 `reduce(state, action)`；
4. 旧实现会在 `keysByType[type]` 的属性键转换阶段抛出 `TypeError`。

## 影响

reducer 的严格 action 白名单本应对不可信输入 fail closed。未捕获异常会中断宿主事件
处理，并让已经覆盖 ownKeys、descriptor getter 的 Proxy 防线留下绕行路径。

## 根因

实现安全读取了 `type` 的数据描述符，却在确认它是字符串前，把该值直接用于普通对象
属性查找。JavaScript 会先执行 `ToPropertyKey`，因此敌对对象仍可运行用户代码或抛错。

## 修复

在 action 类型表查找前先要求 `typeof type === "string"`。非字符串类型立即返回
`null`，不会发生属性键强制转换。

修复提交：`7f65ab7`。

## 防回归验证

严格 action 测试同时覆盖：

- 抛错的 `Symbol.toPrimitive` 未被调用；
- 已撤销 Proxy 作为 `type` 时不抛；
- 两种输入均保持原 state 和 revision。
