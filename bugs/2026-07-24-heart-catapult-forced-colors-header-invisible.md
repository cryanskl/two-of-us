# 爱心投石器：强制色模式让标题和页脚变成白底白字

- 状态：`fixed`
- 日期：2026-07-24
- 影响作品：`heart-catapult`
- 发现版本 / commit：`6fcfebf` 提交前视觉候选

## 环境

- 浏览器：Chrome MCP，`forced-colors: active`
- 启动等级与入口：A；`experiences/versus/heart-catapult/index.html`

## 复现步骤

1. 启用 `forced-colors: active`；
2. 打开作品开场；
3. 检查产品标题、说明和页脚 computed color 与截图。

## 预期结果

所有文字采用系统 `CanvasText`，背景采用 `Canvas`，标题、说明和来源入口清晰可见。

## 实际结果

body 已切换系统色，但 `.site-header` 和 `.site-footer` 仍声明纸色；白色系统背景上
出现白字，产品标题在截图中完全消失。

## 根因

强制色规则只重置了页面根部，没有覆盖组件自身更具体的 `color` 声明。

## 解决方案

在强制色媒体查询中显式把站点标题、标题说明和页脚设为 `CanvasText`。

## 回归验证

- [x] `matchMedia("(forced-colors: active)")` 返回 true
- [x] 标题与页脚 computed color 均为 `rgb(0, 0, 0)`
- [x] 强制色截图可见产品标题、规则、按钮和来源入口
- [x] 主按钮使用系统 `ButtonFace / ButtonText`

## 相关提交

- `6fcfebf feat: style heart catapult`
