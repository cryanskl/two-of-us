# 白名单查表前先阻断属性键强制转换

## 可复用结论

从不可信对象安全读取数据描述符，只完成了第一层防御。若随后执行
`lookup[value]`，而 `value` 不是已经验证过的字符串或 Symbol，JavaScript 仍会触发
`ToPropertyKey`，运行其 `Symbol.toPrimitive`、`toString` 或 Proxy trap。

安全顺序应是：

1. 用数据描述符读取字段，拒绝 getter；
2. 检查字段的原始类型；
3. 只对允许的 primitive 类型执行白名单查表；
4. 未知值直接保持原状态或返回受控错误。

## 适用边界

适用于 reducer action 类型、命令分发、协议消息种类、事件名和任意对象键白名单。
如果确实允许 Symbol，应单独维护 Symbol 白名单；不要依赖隐式转换。

## 本仓证据

修复前，敌对对象和已撤销 Proxy 作为 `action.type` 都能让 reducer 抛异常；类型门禁
加入后，公开函数的 22 组 revoked Proxy 探测均 fail closed。
