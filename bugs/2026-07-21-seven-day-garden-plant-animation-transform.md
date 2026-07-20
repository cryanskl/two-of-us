# 七日小花园：入场动画覆盖图集定位与备用图层透明度

- 状态：`fixed`
- 日期：2026-07-21
- 环境：Codex In-app Browser；正常图片与 CSS fallback
- 影响阶段：day-result / complete
- 发现版本：界面提交前评审

## 复现

1. 正常加载 `plant-states.png` 并完成一天；
2. 观察植株入场动画结束时的图集位置；
3. 再阻断图集，观察备用植株的显隐。

## 预期

动画只作用于整株容器；图集裁切层持续保留当前生长阶段位移，正常图片加载时备用层始终隐藏。

## 根因

`.plant-arrives` 同时动画了图集定位层的 `transform` 与备用层的 `opacity`。动画属性覆盖静态图集位移，并会把本应隐藏的 fallback 暂时变为可见。

## 修复

把职责拆开：`.plant-asset-clip` 只负责裁切和图集 `transform`；`.plant-viewport` 承担入场动画。图片就绪时 fallback 的透明度不再进入动画声明。

## 回归

- [x] 七个结果页图集阶段依次变化
- [x] 动画中与动画后都保留图集纵向定位
- [x] 正常图片加载时 fallback opacity 为 0
- [x] 图片失败与 forced-colors 下 CSS 植株仍可用

## 相关提交

- 界面修复：`9bf8f62`
