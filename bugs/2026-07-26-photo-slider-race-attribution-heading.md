# Photo Slider Race 归因标题未满足共享合同

## 现象

项目自己的 41 项测试全部通过，但接入 `experiences/catalog.json` 后，
`scripts/experience-contracts.test.mjs` 报错：

```text
photo-slider-race 的 experiences/versus/photo-slider-race/README.md
缺少独立标题“## 借鉴与来源声明”。
```

README 已有完整的独立实现、标准来源和 ImageGen 概念图说明，只是二级标题写成了
“借鉴声明”。

## 原因

共享 A 级合同用精确二级标题定位每个作品的来源审计入口，避免把正文中偶然出现的
“借鉴”误判为正式声明。项目级 UI 合同只验证了旧标题，未覆盖总仓的精确命名约定。

## 解决

将 README 标题改为“借鉴与来源声明”，并同步项目在共享 catalog 测试中的断言。
重新运行项目测试、共享 catalog 测试和 experience contract 测试，确认目录与归因
合同同时通过。
