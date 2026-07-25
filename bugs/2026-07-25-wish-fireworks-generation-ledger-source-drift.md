# 心愿烟火：ImageGen 生成台账引用了错误的同名仓库

- 状态：`fixed`
- 日期：2026-07-25
- 影响作品：`wish-fireworks`
- 发现版本 / commit：`5d995630672668df6e1a4f356b5eef67606d89b0`

## 环境

- 审计对象：`docs/assets/wish-fireworks/GENERATION.md`
- 权威来源：冻结调研文档与生产
  `experiences/surprises/wish-fireworks/assets/ATTRIBUTION.md`
- 固定来源提交：`9ee144a548aad85275318b30891c71dcf6e10f7b`

## 复现步骤

1. 搜索心愿烟火文档与生产声明中的 `canvas-text-particle` URL；
2. 打开冻结提交
   `https://github.com/dango0812/canvas-text-particle/commit/9ee144a548aad85275318b30891c71dcf6e10f7b`；
3. 再尝试在生成台账所写的 `tangren1998/canvas-text-particle` 下打开同一提交；
4. 运行新增定向回归：
   `node --test experiences/surprises/wish-fireworks/logic.test.js`。

## 预期结果

生成台账、冻结调研与生产借鉴声明应指向同一上游仓库。固定提交和 ISC 版权主体
都应可由该链接追溯到 `dango0812`。

## 实际结果

冻结提交在 `dango0812/canvas-text-particle` 可访问，许可证记录
`Copyright (c) 2026, dango0812`；生成台账却链接到
`tangren1998/canvas-text-particle`，该仓库路径下的同一提交返回 404。新增回归在
修复前得到 30 项通过、1 项失败。

## 根因

视觉候选台账最初独立撰写了同名项目 URL，没有复用后来冻结的来源所有者与提交
记录；生产 `ATTRIBUTION.md` 已正确，但测试只校验生产声明中的 commit、许可证
哈希和零复制边界，未覆盖 docs-only 生成台账的跨文件一致性。

## 解决方案

- 将生成台账的仓库链接改为
  `https://github.com/dango0812/canvas-text-particle`；
- 增加跨文件回归，要求生成台账包含 `dango0812` URL 且不再包含错误的
  `tangren1998` URL；
- 保留固定 commit、许可证哈希、版权主体与零复制边界不变。

## 回归验证

- [x] 修复前新增回归稳定失败：30 通过、1 失败
- [x] 修复后定向测试：31 / 31 通过
- [x] 冻结调研、来源刷新、生成台账和生产声明均指向 `dango0812`
- [x] 错误的 `tangren1998/canvas-text-particle` URL 已不存在

## 相关提交

- `48521d8 test: expose wish fireworks source drift`
- `43fd632 docs: correct wish fireworks source link`
