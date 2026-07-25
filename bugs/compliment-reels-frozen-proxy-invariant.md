# Compliment Reels 冻结 summary 的 Proxy invariant 冲突

- 发现日期：2026-07-25
- 影响阶段：`compliment-reels` composer mutation guard 定向测试
- 状态：已修复并回归验证

## 复现

初版 mutation guard 直接代理递归冻结的 summary，并在 `get` trap 中把嵌套数组换成
另一个 Proxy。composer 正常读取 `summary.revealedPraises` 时抛出：

```text
TypeError: 'get' on proxy: property 'revealedPraises' is a read-only and
non-configurable data property ... but the proxy did not return its actual value
```

## 根因

冻结后属性是 non-configurable、non-writable data property。ECMAScript Proxy
invariant 要求 `get` trap 对这类属性返回与 target 属性严格相同的值，不能在读取时
临时把原数组替换为新 Proxy。

## 修复

mutation guard 改为自底向上构造副本：

1. 先把每个嵌套 object/array 转换成带 mutation trap 的 Proxy；
2. 把这些 Proxy 作为父副本的真实 data property value；
3. 冻结父副本后再代理父层；
4. 不定义 `get` trap，让读取返回 target 中实际保存的子 Proxy。

这样 `Object.isFrozen` 与 Proxy invariant 均成立，任意层级的
set/delete/defineProperty/setPrototypeOf 和数组 `push` 仍会抛错并触发默认结语。

## 回归 Gate

- composer 可正常读取 recipient、pullCount、revealedPraises 与 jackpotPhrase；
- composer 深层 mutation 稳定回退默认结语；
- action 仍只保存已经解析的纯文本，不保存 Proxy 或函数；
- JSON action log 重放不再次调用 composer。
