# vinyl-secret 撤销后的 tracks Proxy 逃出原子回退

- 日期：2026-07-25
- 项目：`vinyl-secret`
- 影响范围：`sanitizeConfig()` 的嵌套数组快照
- 状态：已修复

## 复现

1. 复制一份合法配置；
2. 用 `Proxy.revocable([], {})` 的 proxy 替换 `tracks`；
3. 调用 `revoke()`；
4. 把配置传给 `sanitizeConfig()`。

修复前抛出：

```text
TypeError: Cannot perform 'IsArray' on a proxy that has been revoked
```

## 预期与影响

规格要求配置包含异常 Proxy 或任何非法子字段时整份原子回退到
`DEFAULT_CONFIG`，不得把检查异常传播给页面。这个缺口只影响敌对或损坏的配置，
不影响默认三轨、秘密 phase 投影或正常自定义配置。

## 根因

`snapshotDenseArray()` 已把 `getPrototypeOf`、`ownKeys` 和 descriptor 读取放在
异常边界内，却在进入 `try` 之前调用了 `Array.isArray(value)`。普通 Proxy
通常不会暴露问题，但 ECMAScript 的数组品牌检查面对已撤销 Proxy 会直接抛错。

## 修复

把捕获后的 `Array.isArray` 调用移入同一个 `try`，返回 false 或抛错都统一返回
`null`；上层 `parseConfig()` 因而按既有合同回退整份默认配置。

## 回归

`logic.test.js` 在 tracks 数组敌对输入测试中加入已撤销 Proxy，断言：

- `sanitizeConfig()` 不抛异常；
- 返回引用精确为 `DEFAULT_CONFIG`；
- 项目 37 项测试全部通过。
