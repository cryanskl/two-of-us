# 双人小馆：`hidden` 飞行卡被组件样式重新显示

- 状态：`fixed`
- 日期：2026-07-17
- 影响作品：双人小馆开场与非飞行阶段
- 发现版本 / commit：实现提交前工作区

## 环境

- macOS 26.5.2；headed Chromium 150.0.7871.125；
- A 级静态页面；1504×1046 视口。

## 复现步骤

1. 在 intro 打开作品，不点击“开门营业”；
2. 查看第一条滑槽左侧；
3. 比较 `#flight-card.hidden` 与计算样式。

## 预期结果

飞行卡在 `hidden = true` 时完全不参与布局和绘制。

## 实际结果

开场仍出现一张被裁切的番茄卡；元素属性为 hidden，但计算样式为 `display: grid`。

## 根因

组件规则 `.flight-card { display: grid; }` 覆盖了浏览器对 `[hidden]` 的默认隐藏规则。只切换 HTML 属性不足以抵抗作者样式。

## 解决方案

在作品样式基线增加 `[hidden] { display: none !important; }`，让隐藏语义在所有组件显示规则之后仍成立。

## 回归验证

- [x] intro 的飞行卡 `hidden = true` 且计算样式为 `display: none`；
- [x] dispatch 时卡片正常显示并完成飞行动画；
- [x] 浏览器控制台 0 error / 0 warning。

## 相关提交

- `f18ee0a feat: add kitchen relay co-op`
