# 同步合作与可选音频：整数完成记录、差值消费和 generation 守卫

## 适用范围

适用于双人同时按住、合奏、同步呼吸等“规则要求时间接近，但声音/动画只是反馈”的本地网页体验，也适用于其他需要异步准备的可选浏览器能力。

## 关键结论

1. 规则时间只使用整数 tick。将 200ms 写成 4 个 50ms tick、300ms 写成 6 个 tick，reducer 的成功、重放和测试不依赖 `performance.now()`、音频时钟或帧率。
2. 完成事实写成追加且不可变的 `completed[]`。音频层只观察数组长度增长，不携带音频对象回到状态机。
3. `completed.length - handledCount` 本身就是待消费区间。播放器正在准备时不要推进 `handledCount`；ready 后按索引依次消费，失败、静音或主动释放时再明确跳过。
4. 每个异步播放器会话必须有单调 generation。`await ensureReady()` 前同时捕获 generation 与播放器引用，返回后两者仍是当前值才允许写全局状态。
5. 播放失败不能撤销完成事实。它只把可选反馈标为 unavailable，视觉进度、双松手 Gate 和终局继续运行。

## 反例

- 在检测到完成时先把 `handledCount` 设为最新长度，再检查 `audioReady`：准备中的完成音会永久丢失。
- 只比较 Promise 的返回值，不比较播放器身份：暂停后旧 Promise 晚到，会覆盖新播放器的 ready 状态。
- 用 AudioContext 时间决定两位玩家是否同步：无声浏览器和降级路径会得到不同玩法结果。

## 验证方法

- reducer 用边界测试证明 4 tick 接受、5 tick 拒绝，6 tick 只完成一次；
- 静态 Gate 固定 generation/播放器双重校验和 preparing 分支；
- 浏览器普通声音与无声路径必须得到相同完成记录；
- 专项测试若能控制 Promise，应覆盖“完成早于 ready”和“旧 Promise 晚于新 ready”两条时序。

## 本仓库实例

“这一拍，刚好和你”把五节双音事件保存在 reducer，`app.js` 只消费完成长度差，并用 `audioGeneration` 隔离暂停、恢复、关闭声音和旧异步结果。对应实现与问题记录见 `experiences/co-op/four-hands-harmony/` 和 `bugs/2026-07-18-four-hands-harmony-audio-readiness-race.md`。
