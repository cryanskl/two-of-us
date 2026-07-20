# 闭时间窗合作：整数 tick、事件顺序与自动化时钟

适用于两人必须在同一短时间窗内分别提交一次输入的本地合作玩法，例如拉链合齿、同步点灯、双人和声、接力传递或同时确认。

## 规则时钟与画面时钟分开

权威状态只保存整数 tick、窗口边界和两席第一次输入：

```text
windowStart ≤ leftTick ≤ windowEnd
windowStart ≤ rightTick ≤ windowEnd
abs(leftTick - rightTick) ≤ syncTicks
```

窗口应是闭区间。事件发生在 `windowEnd` 时仍有效；只有下一次 `STEP` 把规则时间推进到窗口外，才进入漏接结算。CSS 动画、`requestAnimationFrame` 的真实间隔和进度条像素都不能参与裁决，否则后台恢复、低帧率和不同屏幕会得到不同结果。

`STEP(n)` 可以逐 tick 消费，但一旦某个 tick 触发阶段转换，就要丢弃这批事件的剩余 tick。否则一次积压的帧可能穿过 `playing → tooth-result → playing`，让玩家看不到结果态，甚至让下一齿在同一事件里直接超时。

## 第一次输入让每席只能证明一次

每颗齿分别保存 `leftPullTick` 与 `rightPullTick`，只接受各席第一次输入。重复键、长按和同时触发的 pointer/click 不得覆盖较早时间，也不能把失败尝试“修成”成功。

合作必要性至少要由以下测试证明：

1. 只有左席或只有右席时，无论输入多准都不能完成；
2. 两席都在窗口内，但间隔大于 `syncTicks` 时失败；
3. 两席间隔合格，但任一席在窗口外时失败；
4. 窗口最后一 tick 的两次输入仍成功；
5. 成功齿形成不可回退的前缀，失败只重试当前齿。

这比“页面上有两个按钮”更严格：规则状态本身能够证明两个人都不可替代。

## 浏览器自动化也有自己的时钟

短同步窗里，高层自动化操作并不等价于人类同时按键。一次 DOM snapshot、locator 解析、可见性检查和 `.click()` 之间可能已经过去多个动画帧。若每席只有 3–5 tick 的同步容差，测试框架本身就会制造 `apart` 或 `missed-*`，即使产品规则没有 bug。

稳定的验收顺序是：

1. 等待规则进入可拉窗口；
2. 只取一次 DOM/状态观察，确认目标控件唯一；
3. 用真实 `keydown` 路径连续发送两席物理键；
4. 等待 reducer 进入成功反馈态；
5. 失败分支则故意控制事件间隔，并按状态文案断言原因。

自动化产生的大量失败次数不能混入产品结论。若为排查测试方法已经污染本局统计，应明确标为测试噪声，并用一段干净路线再次证明正常操作可以零失败完成。

## 生命周期与公开视图

`requestAnimationFrame` 只在真正需要推进的阶段运行；失焦或页面隐藏时停止累积，恢复后从新的时间基准继续，不能补算离开期间的 tick。DOM 只读取公开 view：当前齿、窗口状态、两席是否已拉、失败原因和完成前缀；原始事件对象、时间戳和内部配置不应泄漏到渲染层。

对应实现与验证位于 [`together-zipper/logic.js`](../experiences/co-op/together-zipper/logic.js)、[`logic.test.js`](../experiences/co-op/together-zipper/logic.test.js) 和 [`app.js`](../experiences/co-op/together-zipper/app.js)。
