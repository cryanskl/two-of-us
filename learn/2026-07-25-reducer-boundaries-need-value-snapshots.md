# Reducer 边界要冻结“值快照”，不能只冻结“读取资格”

严格 schema 校验常见的误区，是先确认对象或数组“看起来安全”，再回到原始外部值上读取、迭代或二次解析。对普通 JSON 这没有区别；对 accessor 或 Proxy，这些步骤是不同时间的不同观察。

可复用原则：

1. **descriptor 校验和取值必须是同一次快照。**  
   对稠密数组同时检查 `length`、own keys 和每项 data descriptor，并把 descriptor 的 `value` 复制到内部数组。后续只消费内部副本，不再使用 `value[index]`、`.map()` 或 `for...of` 读取外部数组。

2. **schema 判别字段必须与最终快照复核。**  
   若先读 `type` 决定允许 keys，exact record 快照中的 `type` 仍必须等于判别值。否则变形 Proxy 可借一种 schema 触发另一种动作。

3. **一次接受只对应一次语义。**  
   replay 已经把 action 清洗成冻结值后，应把该值交给 reducer；不能把原始 action 再读一次。首次解析不是“允许稍后重读”的许可证。

4. **结构合法不等于状态可达。**  
   还要验证阶段语义和向量约束，例如非终局剩余 tick 必须大于 0、速度模长必须符合普通/持旗上限、revision 必须为下一次原子提交保留安全整数空间。

5. **模块初始化顺序也是边界。**  
   初始化期调用的校验函数若引用后声明的 `const`，宽泛 `catch` 可能把 TDZ 编程错误伪装成普通配置回退。schema 常量应先初始化，再解析外部默认值；回退测试必须使用与生产一致的同 realm 配置入口。

这组原则适用于本地游戏 reducer、可重放状态机、配置模块和任何承诺 hostile input fail closed 的纯逻辑 API。
