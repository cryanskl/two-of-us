# 共同按住交互：物理 inputId、双松手 Gate 与焦点连续性

## 适用范围

适用于键盘与多 Pointer 同时控制的双人长按、合奏、牵引、同步开关等玩法，尤其是“成功后必须全部松开，才能进入下一轮”的同屏体验。

## 关键结论

1. 状态机要保存物理输入身份，而不只保存“某声部正在按”。键盘可用 `keyboard:KeyA`，触点可用 `pointer:17`；RELEASE 只清除完全匹配的 inputId。
2. 每个声部同一时刻只接受一个物理输入，同一个 inputId 也不能跨声部占位。这样旧 `pointerup`、重复 keydown 或第二根手指不会释放新输入。
3. 成功应先进入独立的 `measure-complete`，保留两侧 held 记录；只松一边继续关闭 Gate，双方都松开才推进下一轮。长按不能穿透到下一题。
4. `pointercancel`、`lostpointercapture`、document 级 `pointerup`、blur 与 hidden 都必须幂等释放或中断，避免卡键。
5. “暂时不接收 PRESS”不等于“控件应退出焦点序列”。短暂完成态可保留按钮，以 `aria-disabled="true"` 表达 Gate；下一轮开始后再把焦点显式移到新目标。

## 反例

- 只用 `held.low = true`：无法判断一个迟到的旧 RELEASE 是否属于当前输入。
- 完成后立即清空 held 并推进：仍按着的键会被浏览器 repeat 或下一帧当作新轮输入。
- 把 `canPress=false` 直接映射为原生 `disabled`：当前键盘焦点会消失，同结构 DOM 又不会自动恢复。
- 只监听按钮自身 `pointerup`：指针离开元素、捕获丢失或系统手势中断时容易永久卡住。

## 验证方法

- reducer 覆盖重复 inputId、跨声部占用、旧 RELEASE、单边松手、双边松手和长按不穿透；
- Pointer 路径覆盖两个 pointerId、cancel、lost capture 与 document fallback；
- 浏览器检查 measure-complete 时 activeElement 仍在琴键区，下一轮转到新目标；
- 移动断点检查琴键 `touch-action:none`，页面其他区域仍可滚动。

## 本仓库实例

“这一拍，刚好和你”用八个 code-native 键与任意两个 pointerId 投影到同一 reducer。完成一节后双方必须松开；前端保留琴键焦点语义，并只在进入新一节时重新聚焦。对应实现见 `experiences/co-op/four-hands-harmony/`，焦点问题记录见 `bugs/2026-07-18-four-hands-harmony-measure-focus-loss.md`。
