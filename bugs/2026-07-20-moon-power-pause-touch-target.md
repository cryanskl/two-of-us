# 月面供电：移动端暂停按钮只有 36px 高

- 日期：2026-07-20
- 阶段：390×844 浏览器响应式验收
- 影响：唯一的顶部暂停动作低于项目冻结的 48px 触控门槛
- 状态：已修复并重新测量全部 button/option label

## 复现

1. 把浏览器视口设为 390×844，进入任一班 operating；
2. 读取所有 `button, .option-label` 的 `getBoundingClientRect().height`；
3. 最小值为 36，命中 `.utility-button` 的“暂停值班”。

## 根因

全局 `button, .option-label` 已设 `min-height: 48px`，但 `.utility-button` 为了桌面紧凑感又覆写成 36px。该 class 也用于 operating 中的暂停主入口，因此移动端触控 Gate 被局部规则破坏。

## 修复

- `.utility-button` 统一使用 `min-height: 48px`；
- 保留较小字号与横向 padding，不增加新的移动专用控件；
- 在 320×700、390×844 与 1440×900 重新测量全部按钮和 option label；
- 同时核对页面无真实内容横向溢出。

## 可复用结论

触控尺寸 Gate 应扫描最终计算样式，而不是只检查基础 selector。语义上“次要”或视觉上“紧凑”的 utility action 仍可能是关键恢复/暂停入口，局部 class 覆写最容易绕过全局最小尺寸。
