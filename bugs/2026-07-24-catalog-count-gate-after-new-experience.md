# 目录接入：新增 A 级作品后真实目录计数 Gate 未同步

- 状态：`fixed`
- 发现日期：2026-07-24
- 影响范围：`scripts/experience-contracts.test.mjs`

## 现象

“这一朵，我先养开”已经同时加入 `experiences/catalog.json` 和门户内嵌目录，新增的
目录专测也通过，但完整 `npm test` 报错：

```text
real catalog satisfies all 48 A and 8 non-A contracts
Expected values to be strictly equal:
57 !== 56
```

## 根因

真实目录合同有意固定了已安装作品总数及 A / 非 A 分布，用于发现目录条目被意外
增加、删除或改级。新增 A 级作品后，权威目录已经从 `56 / 48 / 8` 变为
`57 / 49 / 8`，但这条计数 Gate 没有包含在最初的目录同步清单中。

## 修复

- 把测试名更新为 `all 49 A and 8 non-A contracts`；
- 把总数和 A 级精确期望分别更新为 `57` 与 `49`；
- 非 A 级仍精确保持 `8`，没有放宽任何校验。

## 回归验证

```bash
node --test scripts/experience-contracts.test.mjs
npm test
npm run verify
```

以后每次新增、删除或调整作品等级时，目录接入清单都必须包含这条精确计数 Gate。
