# 月面供电：真实 KeyboardEvent 快捷键全部失效

- 日期：2026-07-20
- 阶段：浏览器第一班实玩
- 影响：`A/S/D` 与 `J/K/L` 均不触发，鼠标/触屏仍可操作
- 状态：已修复并增加原生事件形态回归测试

## 复现

1. 在本地服务器打开 `experiences/co-op/moon-base-power/index.html`；
2. 进入第一班 operating；
3. 聚焦任一普通按钮，按 `A` 或 `S`；
4. 太阳能/蓄电池状态不变，DOM 仍显示“关”。

纯逻辑测试传入自有字段的普通对象，因此原有键盘测试全部通过，未能复现浏览器事件形态。

## 根因

`classifyPowerKey` 复用了 reducer action 的 `safeRead`。该函数只接受对象自身的 data descriptor，用于拒绝 action getter 是正确的；但真实 `KeyboardEvent.code/repeat/ctrlKey/...` 由浏览器通过原型访问器提供，不是事件实例的自有 data property，于是分类器永远读到 `undefined`。

## 修复

- reducer action 保持严格 `safeRead`，不放宽可信边界；
- KeyboardEvent 单独使用 `safeEventRead`，允许读取原型属性，并用 try/catch 把抛错 getter 降级为 `undefined`；
- 增加属性只存在于原型 getter 的 native-like event 测试，同时覆盖 hostile getter；
- 浏览器重新用真实按键完成三班，验证 `event.code`、repeat 和修饰键合同。

## 可复用结论

浏览器平台对象不能默认套用 JSON/plain-data schema：原生事件、DOM 节点和媒体对象的大量属性来自原型访问器。安全边界应按输入来源拆分——持久/规则 action 用精确自有字段，平台事件用受控属性白名单加异常隔离，并至少保留一个原生形态集成测试。
