# 把颜色调到一起：来源声明标题未满足仓库机器 Gate

- 状态：`fixed`
- 日期：2026-07-18
- 影响作品：把颜色调到一起的 catalog 接入与仓库验收
- 发现版本 / commit：`d7c7f93`

## 环境

- Node.js 18+；
- `shared/runtime/catalog.test.js`；
- `scripts/validate-repository.mjs`；
- 作品 README 与同目录 `ATTRIBUTION.md`。

## 复现步骤

1. 把 `shared-color-studio` 加入 `experiences/catalog.json`；
2. 保持作品 README 二级标题为“借鉴与原创声明”；
3. 运行 `npm run verify`。

## 预期结果

校验器识别作品的来源入口，固定提交、许可证、作者和未复制范围继续由 `ATTRIBUTION.md` 提供。

## 实际结果

统一验收失败并报告：`shared-color-studio 的 README 缺少“借鉴与来源声明”`。声明内容实际存在，但标题没有使用仓库固定词组。

## 根因

作品 README 使用了语义接近的人类可读标题，却没有遵守仓库校验器的精确机器契约。作品进入 catalog 之前不属于统一验收扫描范围，因此问题直到目录接入才暴露。

## 解决方案

- 把 README 标题统一为“借鉴与来源声明”；
- catalog 静态测试精确断言该标题；
- 保留 `ATTRIBUTION.md` 中三个固定提交、许可证/作者、W3C 资料与零复制边界；
- 不放宽统一校验器。

## 回归验证

- [x] catalog 定向测试 53/53 通过；
- [x] 全仓测试 465/465 通过；
- [x] `npm run verify` 识别 38 个作品入口并通过；
- [x] 来源声明内容未被删除或概括替代。

## 相关提交

- `66f2f6a feat: catalog shared color studio`
