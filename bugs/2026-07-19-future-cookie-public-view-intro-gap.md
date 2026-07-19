# 三枚以后，都是我们：public view 缺少开场文案

- 状态：`fixed`
- 日期：2026-07-19
- 影响作品：三枚以后，都是我们
- 发现阶段：逻辑与前端合同联调
- 修复提交：`5e3d952 docs: expose future notes intro view`

## 复现条件

1. 按原始规格实现 `getFutureCookieNotesView()`；
2. 要求界面只能消费 public view，不能直接读取安全配置；
3. 尝试渲染 collecting 阶段的开场文案。

## 预期结果

collecting 阶段能从 public view 取得开场文案；进入 ready 或 finale 后，该文案不再进入当前视图。

## 实际结果

原 public view 形状没有 `intro` 字段。前端只能违反边界去读取配置，或无法呈现冻结开场文案。

## 根因

规格同时写了“UI 获取业务数据的唯一入口是 public view”和“开场文案来自配置”，却遗漏了把 `intro` 投影到 collecting view。数据所有权与界面需求没有逐字段对账。

## 解决方案

- public view 增加顶层 `intro`；
- collecting 返回已清洗开场文案；
- ready / finale 返回 `null`；
- 逻辑测试固定三阶段值，前端仍只消费 public view。

## 回归验证

- [x] collecting view 返回默认或已清洗 `intro`
- [x] ready / finale view 的 `intro` 为 `null`
- [x] 36 / 36 项定向逻辑测试通过
- [x] 1249 / 1249 项全仓测试通过

