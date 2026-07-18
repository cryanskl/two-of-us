# 把这首转给你：按钮混入滑块 aria-value 语义

- 状态：`fixed`
- 日期：2026-07-18
- 影响作品：把这首转给你
- 发现版本 / commit：`a56d798`

## 复现步骤

1. 开始作品并检查曲柄 accessibility snapshot；
2. 对照原生 `<button>` 与 `aria-valuemin/max/now/text`。

## 预期结果

控件暴露一致的按钮语义，并读出当前进度与快捷键。

## 实际结果

原生按钮带有滑块专用 value 属性，语义与键盘契约不一致。

## 根因与解决方案

视觉旋钮被误映射成 ARIA slider，但实现仍是按钮。保留原生按钮，移除 `aria-value*`，将圈数、格数和快捷键写入动态 `aria-label`；非法角度入口同时统一为有限数检查。

## 回归验证

- [x] intro / playing / complete snapshot 均可读动态标签；
- [x] ArrowRight 与 Space 实玩通过；
- [x] 正常路径控制台 0 error / 0 warning。

## 相关提交

- `6dd61c0 fix: harden music box browser fallbacks`
