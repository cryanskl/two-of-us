# Proxy 安全：品牌检查本身也可能抛异常

面向不可信输入时，不能把 `Array.isArray()`、`Object.isFrozen()` 等品牌/内部槽位
检查一概当作无副作用布尔查询。至少对已撤销 Proxy，`Array.isArray(proxy)` 会
抛 `TypeError`；如果它位于快照函数的 `try` 外，后续所有 `ownKeys`、prototype
和 descriptor 防御都来不及执行。

可复用原则：

- 从“首次触碰外部值”开始建立异常边界，而不是只包住显式 Reflect trap；
- 品牌检查、prototype、own keys、descriptor 与冻结状态检查属于同一组
  inspect 操作，应共同 fail closed；
- 回归测试既覆盖普通 Proxy 的 trap，也覆盖 `Proxy.revocable()` 撤销后的值；
- sanitizer 的失败结果应由上层统一原子回退，避免局部采用或异常泄漏。

这适用于配置数组、reducer state 数组、插件输入和任何声称“敌对值不抛”的本地
纯逻辑 API。
