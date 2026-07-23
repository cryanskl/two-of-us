# 拖拽只做预览：离散提交、等价入口与兼容 click

## 适用范围

适用于折叠、滑开、拉动、旋转、刮到阈值等“连续手势给反馈，但业务规则只关心是否完成一次”的本地网页体验。

## 关键结论一：Pointer 位移不是权威状态

连续 `pointermove` 适合产生 0–1 的视觉进度，但不应把每一帧写入 reducer。推荐边界：

```text
pointerdown  建立临时 gesture
pointermove  投影位移，只更新 CSS 自定义属性
pointerup    读取最终进度，超过阈值才提交一个离散 action
cancel       清掉临时样式，不改变业务状态
```

这样页面掉帧、丢失中间事件、减少动态或没有 3D transform 时，权威结果仍由同一个离散动作决定。

投影应使用元素自身尺寸推导 travel，而不是固定像素；方向向量与阈值属于纯逻辑，可以在没有 DOM 的测试中覆盖正向、反向、正交移动、截断和非有限值。

## 关键结论二：拖拽必须有同规则的非拖拽入口

按钮和键盘不是“简化模式”，而是同一 reducer action 的等价生产入口：

```text
拖拽超过阈值 ─┐
点击完成按钮 ──┼─> COMMIT_STEP(id)
键盘快捷键 ────┘
```

动画与手势只是表达层。只要三条路径最终提交同一个 action，就不会出现鼠标能完成、键盘只能跳动画却不能过 Gate 的分叉。

这也满足“拖拽操作提供单指针、无路径依赖替代”的可访问方向；验证时必须真实走完每条入口，而不是只检查按钮存在。

## 关键结论三：兼容 click 要绑定本次 gesture

浏览器在 Pointer 序列后可能再派发 click。如果手柄本身同时是按钮，拖拽已经完成一步后，这个 click 可能落在刚渲染出的下一步手柄上，造成一次手势推进两步。

安全抑制不能只是全局布尔值。至少应记录：

- gesture generation；
- pointerId；
- 本次是否真的移动或提交；
- 新手柄携带的 generation。

只有 click 的 pointer 与旧 gesture generation 同时匹配时才阻止它。随后立刻清空抑制记录。这样不会吞掉下一步真正的键盘 click 或用户新点击。

## 生命周期断点

以下事件都应清理临时 gesture 和 CSS 预览：

- `pointercancel`；
- `lostpointercapture`；
- window `blur`；
- `pagehide`；
- document 进入 hidden；
- 阶段 render 或重开。

清理动作只撤销视觉预览，不自动提交，也不回滚已经进入 reducer 的离散事实。

## 反例

- 每个 `pointermove` 都生成新业务状态；
- 依赖 `transitionend` 才完成动作；
- 拖拽和按钮各走一套完成规则；
- 用一个跨阶段布尔值吞掉“下一次 click”；
- pointer capture 丢失后仍保留旧进度；
- 固定写死 120px，导致移动端和桌面阈值手感不同。

## 验证清单

1. 纯逻辑测试覆盖方向投影、0–1 截断、阈值边界与非法数值。
2. Chrome 真拖拽低于阈值，确认状态不变且预览归零。
3. Chrome 真拖拽超过阈值，确认只推进一步。
4. 立即检查下一步 ID，证明兼容 click 没有重复提交。
5. 用按钮和键盘分别走完同一路线。
6. 触发 cancel、capture loss、blur、hidden 与重开，确认临时样式清空。
