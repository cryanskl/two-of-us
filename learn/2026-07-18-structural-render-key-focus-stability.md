# 高频页面渲染：用结构键保住 DOM 身份与键盘焦点

适用范围：带倒计时、进度条、动画帧、轮询状态或频繁网络快照，同时包含按钮、输入框、滑块和菜单等可聚焦控件的原生 DOM 页面。

## 核心结论

视觉内容相同，不代表 DOM 身份相同。下面的代码每 100ms 看起来都画出相同三枚按钮，却会不断删除旧节点：

```js
function render(view) {
  seconds.textContent = view.remainingSeconds;
  choices.replaceChildren(...view.items.map(renderChoice));
}
```

如果用户刚聚焦 A，下一次 `replaceChildren()` 会把那个真实按钮移除。浏览器通常把焦点退回 `body`；键盘用户必须重新 Tab，读屏器的虚拟位置也可能失去上下文。

因此渲染层要区分：

```text
高频叶子更新：秒数、计数、进度文字
低频结构更新：题目、角色、锁定、阶段、选项集合
```

## 结构键只包含会改变节点树的字段

在小型原生页面中，不必为此引入虚拟 DOM。可以把影响结构的状态投影成稳定键：

```js
const workspaceKey = [
  view.currentPuzzle.id,
  view.north.role,
  view.isLocked,
].join(":");

seconds.textContent = String(view.remainingSeconds);

if (workspaceKey !== lastWorkspaceKey) {
  renderNorth(view);
  renderSouth(view);
  lastWorkspaceKey = workspaceKey;
}
```

关键不是字符串形式，而是字段选择：

- 题目 ID 变化：规则与选项必须重建；
- 角色变化：两席内容必须交换；
- 锁定变化：按钮的 disabled 状态必须更新；
- 剩余秒数变化：只改文本，不能进入结构键。

把倒计时加入结构键会让每 tick 仍然重建。漏掉 `isLocked` 则会让答错后的禁用状态永远不显示。结构键本质上是“这一棵 DOM 子树的输入摘要”。

## 阶段切换要清空旧键

当页面离开进行态并清空子树时，也要同步清空缓存键：

```js
function clearPlaying() {
  north.replaceChildren();
  south.replaceChildren();
  lastWorkspaceKey = null;
}
```

否则重开后若恰好遇到相同题目、角色和锁定状态，渲染器会误以为 DOM 仍存在，留下空白工作区。

这也是所有 memo/cache 的共同边界：销毁缓存代表的对象时，必须一起失效缓存。

## 锁定与焦点恢复要作为一个事务验证

答错后的短暂锁定通常经历：

```text
选择 A
→ isLocked = true
→ 三个按钮重建为 disabled
→ 锁定 tick 归零
→ isLocked = false
→ 三个按钮重建为 enabled
→ 焦点恢复到 A
```

这里结构重建是必要的；不能为了保焦点完全禁止重绘。更稳的策略是记录语义 ID，而不是旧节点引用：

```js
lastSelectedBranch = "A";
// 解锁渲染完成后
querySelector('[data-branch-id="A"]').focus();
```

旧按钮已经不存在，保存 `oldButton.focus` 没有意义。语义 ID 可以在新树中找到等价操作。

## 逻辑测试不能替代浏览器焦点测试

reducer 单测可以证明锁定 tick 和倒计时正确，却看不到 DOM 节点被替换。最小浏览器回归应包含：

1. 聚焦任意选项；
2. 等待超过一个计时 tick；
3. 证明倒计时已变化；
4. 证明 `document.activeElement` 仍是原语义选项；
5. 选择错误答案；
6. 证明所有选项在锁定期 disabled；
7. 等待解锁；
8. 证明选项全部 enabled，焦点回到刚才的语义 ID；
9. 换题和换角色后证明结构确实更新；
10. 重开后证明缓存失效，没有空白区域。

反例是只比较两次 `innerHTML` 是否相等。两个字符串完全相同，也可能来自两批全新的 DOM 节点，焦点仍然已经丢失。

## 何时不用结构键

如果节点很少且能原地更新属性，直接保存元素引用并逐项更新通常更清晰。结构键适合“子树结构稳定、高频帧只改少量叶子、低频状态才换整棵树”的页面。

如果结构依赖字段很多，手写键容易漏项，应改为组件化的精确更新函数或经过验证的 UI 框架；不要用一个巨大的 `JSON.stringify(view)` 充当键，它常常重新引入高频字段和不稳定顺序。

## 证据与边界

本结论来自“把信号接回来”的真实浏览器缺陷与回归：

- [`../bugs/2026-07-18-signal-repair-tick-rebuild-focus-loss.md`](../bugs/2026-07-18-signal-repair-tick-rebuild-focus-loss.md)
- [`../experiences/co-op/signal-repair-manual/app.js`](../experiences/co-op/signal-repair-manual/app.js)

实测中，修复前聚焦 A，等待 350ms 后倒计时变化但焦点退回 `BODY`；修复后焦点保留。答错时 A/B/C 全部锁定，1100ms 后全部解锁并把焦点恢复到 A。作品逻辑 43/43、全仓 468/468 和三档浏览器验收继续通过。
