# 心愿烟火：非法可编辑配置破坏 canonical 默认回退

- 状态：`fixed`
- 日期：2026-07-24
- 影响作品：`wish-fireworks`
- 发现版本 / commit：核心批次提交前候选

## 环境

- 操作系统：macOS
- 运行时：根仓库 Node ESM 与 VM CommonJS
- 启动等级与入口：A；问题位于浏览器与 Node 共用的 `logic.js`

## 复现步骤

1. 在加载 `logic.js` 前，把全局 `WISH_FIREWORKS_CONFIG` 设为非法结构；
2. 或让该全局属性成为会抛错的 getter；
3. 加载 `logic.js`；
4. 调用 `sanitizeConfig({})` 或 `createStartAction({})`。

## 预期结果

外部可编辑配置只是一份候选。候选非法、缺失或读取失败时，逻辑层仍应使用规格
冻结的 canonical 默认配置，`createStartAction` 返回可用、递归冻结的 START。
模块初始化不得执行可编辑配置 getter。

## 实际结果

初版候选从外部 `configSource` 生成 `DEFAULT_CONFIG`。非法或缺失配置使
`DEFAULT_CONFIG`、`sanitizeConfig({})` 与 `createStartAction({})` 全部变成
`null`；throwing getter 则会在逻辑模块初始化时直接抛错。

## 根因

逻辑层混淆了两种职责：

- `config.js` 是准备者可以编辑的运行候选；
- canonical 默认是候选失败后的固定恢复真值。

当恢复真值也来自同一份可编辑候选时，候选一旦损坏便失去回退来源；UMD wrapper
在初始化阶段用普通属性读取全局配置，又绕过了 hostile snapshot 合同。

## 解决方案

- 在 `logic.js` 内保留私有 canonical literal，并通过同一严格 validator 生成冻结
  `DEFAULT_CONFIG`；
- 逻辑初始化不读取 `WISH_FIREWORKS_CONFIG`，也不 `require("./config.js")`；
- 页面未来显式把可编辑全局传给 `createStartAction(rawConfig)`；
- 非法候选整份回 canonical 默认，合法候选仍正常断引用、递归冻结；
- VM 回归覆盖非法 global、throwing getter 与 CommonJS 无配置依赖。

## 回归验证

- [x] 非法 global 的 `DEFAULT_CONFIG` hash 保持 canonical
- [x] throwing getter 不再影响模块初始化
- [x] `createStartAction({bad:true})` 返回 canonical START
- [x] CommonJS 逻辑出口不依赖 config `require`
- [x] 29 项定向测试通过
- [x] 1,824 项全仓测试通过
- [x] `npm run verify` 通过，57 个现有入口保持不变

## 相关提交

- `c178dc6 feat: add wish fireworks logic`
