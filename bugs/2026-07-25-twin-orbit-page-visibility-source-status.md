# Bug：双星同轨调研引用了已 discontinued 的 Page Visibility 草案

- 状态：`fixed`
- 日期：2026-07-25
- 影响作品：`twin-orbit` 前置调研
- 发现版本 / commit：`cac38fc`

## 环境

- 操作系统：macOS
- 浏览器与版本：不适用；文档来源审计
- 启动等级与入口：目标 A 级；尚无生产入口

## 复现步骤

1. 打开 `docs/305-twin-orbit-research.md` 的暂停、失败与重开章节。
2. 跟随 W3C Page Visibility Level 2 链接并核对文档状态。
3. 对照仓库已有 `docs/228-capsule-docking-source-refresh.md` 的标准维护结论。

## 预期结果

调研使用现行规范说明 `visibilityState` 与 `visibilitychange`，并区分历史草案。

## 实际结果

初版把 W3C Page Visibility Level 2 直接写成行为依据，没有说明它已于
2022-06-23 成为 discontinued draft。

## 根因

外部检索只确认了接口和事件段落，没有在写入前同步核对规范状态；同时没有复用
仓库中已经完成的来源维护结论。

## 解决方案

- 把现行依据改为 WHATWG HTML Living Standard 的 Page visibility 章节；
- 明确 W3C Level 2 只作历史来源，不作为现行规范；
- 在 `docs/307-twin-orbit-attribution-dependency-audit.md` 固定本次校准。

暂停产品行为不变：hidden/blur/pagehide 时仍清输入并重置当前关。

## 回归验证

- [x] 原始文档引用已改为 WHATWG HTML
- [x] `git diff --check` 通过
- [x] `npm run verify` 通过

## 相关提交

- 本修复提交
