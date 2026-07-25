# 敌对输入边界：回调要包一层，标识符要先收窄

当公开 API 同时承诺“接受可配置回调”和“任意输入不抛异常”时，只对外层对象做
descriptor snapshot 还不够。两个容易遗漏的隐式执行点是：

1. 递归冻结包含外部函数的返回对象会访问函数的 own keys；函数型 Proxy 可以在
   这里执行或抛错，普通函数也会被意外冻结；
2. 把未验证的值用作普通对象键会执行 `ToPropertyKey`；对象型 Proxy 可以借
   `Symbol.toPrimitive`、`toString` 或相关 `get` trap 执行或抛错。

可复用处理方式：

- 不把调用方 callback 直接放进需要递归冻结的返回对象；创建内部 wrapper，
  wrapper 的调用放在明确的异常边界内；
- 枚举标识符在查表前先做 primitive 类型收窄，再检查允许集合；
- 回归测试除 accessor 和对象 Proxy 外，还要覆盖函数型 Proxy、隐式键转换与
  “归一化不得冻结输入”。

这套边界适用于本地 HTML 的配置函数、插件钩子、reducer action 与所有
“descriptor snapshot 后继续消费嵌套值”的纯逻辑 API。
