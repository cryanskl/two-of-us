# 手摇交互：单调进度、共享出口与音频 epoch

适用范围：旋钮、转盘、唱片、发条、滚轮等“允许来回操作，但奖励只应向前推进”的本地网页互动。

## 一份角度不够表达两种语义

手势层需要 `currentAngle`：它允许顺转和回转，画面才能跟手。规则层需要 `peakAngle`：它只记录到达过的最大净顺时针角度，保证进度和奖励单调。

```text
Pointer 增量 → currentAngle
peakAngle = max(peakAngle, currentAngle)
stepIndex = floor(peakAngle / stepAngle)
```

只保存当前角度，反转会倒扣进度；只保存峰值，摇柄又无法自然回转。两者同时存在，但公开步数只能从峰值派生。

跨越 `-π / +π` 时，先把相邻 Pointer 角度差规范化到 `[-π, π]`，再累计到 `currentAngle`。不要直接比较绝对极角，否则越过边界会被误判为接近整圈的反转。

## 离散输入要从规则边界继续

键盘和“转一格”不是小幅模拟拖拽，而是承诺“产生一个新格”。若用户先回转，直接给 `currentAngle` 加一格可能只追平旧峰值。

可靠语义是：

1. 把当前角度对齐到 `peakAngle`；
2. 增加一个 `stepAngle`；
3. 仍调用 Pointer 使用的 `applyAngularDelta`；
4. 只有 `stepIndex` 实际增加才产生音符副作用。

这让 Pointer、键盘和按钮共享唯一规则出口，避免三套计步实现漂移。

## 声音是状态变化的副作用，不是输入的副作用

一次 Pointer move 可能跨过多个格，一次反向输入可能跨过零格。声音应比较 `previousStep` 与 `nextStep`，按新经过的格排队，而不是“每收到一次输入就播放一次”。

Web Audio 的初始化又是异步的，旧的准备 Promise 或音符队列可能在静音、重开或页面隐藏后才恢复。给播放生命周期一个单调 `audioEpoch`：

- 静音、重开、隐藏、关闭时递增 epoch；
- 每个异步任务捕获创建时的 epoch；
- 播放前再次比较，过期任务直接退出；
- 同时清空排队引用并关闭旧播放器。

这与动画 token、网络 revision 是同一种防旧任务污染新状态的方法。

## 惊喜内容由阶段拥有 DOM

最终留言不应从一开始就隐藏在页面里。intro 与 playing 阶段没有留言节点；complete 才创建；restart 立即销毁。这样视觉裁切、无障碍树和脚本检查都服从同一个阶段 Gate。

## 验证清单

- 顺时针完整一圈产生固定格数；
- 越过 `±π` 不跳变；
- 逆转不倒扣，也不重复播放旧音；
- 逆转后一次离散输入仍增加恰好一格；
- 一次大增量跨多格时，步数与音符序列一致；
- 静音/隐藏/重开后，旧音频任务不会恢复播放；
- 完成前最终内容节点数为 0，完成时为 1，重开后回到 0。

对应实证：[`../docs/65-hand-crank-music-box-verification.md`](../docs/65-hand-crank-music-box-verification.md)。
