# 合作分类索引：四个已安装作品未被列出

- 状态：`fixed`
- 日期：2026-07-20
- 影响：`experiences/co-op/README.md` 的人工索引少于 `experiences/catalog.json`，读者无法从分类页发现四个已安装作品。

## 复现

读取 catalog 中 `category === "co-op"` 的 19 个条目，再检查合作分类 README。以下四个目录没有对应链接：

- `four-hands-harmony`
- `same-pace-star`
- `steady-together`
- `moving-home-together`

## 根因

四个作品完成时更新了总目录和 catalog，却没有同步更新人工维护的合作分类 README；测试只校验各作品自己的 catalog 条目，没有校验分类页的完整性。

## 修复

补齐四个作品的分类链接，并增加数据驱动测试：catalog 中每个合作项目都必须以 `./<id>/` 出现在合作分类 README。

## 回归验证

- `node --test shared/runtime/catalog.test.js`
- `npm run verify`
- `npm test`
- `git diff --check`
