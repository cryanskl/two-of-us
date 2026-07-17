# 阶段拥有 DOM 与播放 token 的热座秘密模型

## 适用范围

适用于同一台设备轮流交接、上一位能看到秘密而下一位必须只接收有限信息的静态 HTML：报码、出题/猜词、局部线索、盲选揭晓、合作解谜等。

## 关键结论一：秘密应由阶段拥有，而不是被 CSS 隐藏

把秘密节点保留在 DOM 再用 `display:none`、透明度或移出屏幕隐藏，会同时扩大开发者工具、accessibility tree、自动化快照和误样式泄露的表面。更稳定的模型是：

```text
sending 拥有 target + canonical code + entered pulses
receiverHandoff 拥有零秘密
playback 每个瞬间只拥有 current pulse
guessing 只拥有 shuffled candidates
result 才重新拥有 target + sent pulses + guess
```

浏览器层每次按 phase 从权威状态重新创建允许的节点，离开阶段就 `replaceChildren()`。隐藏信息仍存在 JavaScript 内存，所以必须如实声明“界面级隐私，不是密码学隔离”。

验证时不要只查可见文字：同时读 `document.body.textContent`、accessibility snapshot、`aria-label / title / data-*` 和静态 HTML。空容器也应从可访问树消失，不能用 CSS 覆盖原生 `hidden` 语义来保版式。

## 关键结论二：播放计划需要单调 token

定时器会跨越失焦、重听、重新开始和下一轮。只清理当前已知 timeout 仍不足以证明迟到回调无害；让 reducer 为每次合法进入 playback 增加 token：

```text
READY_RECEIVER → playbackToken + 1
REPLAY → playbackToken + 1
FINISH_PLAYBACK(token) 仅在 token === currentToken 时生效
```

调度器捕获进入播放时的 token。即使浏览器或测试环境让旧回调迟到，reducer 也拒绝它穿过 Gate。页面失焦时仍应清理计时器并要求明确从头播放，token 是第二道确定性边界，不是清理的替代品。

## 关键结论三：编码与译码是两个独立正确性维度

合作通信游戏不能只看“最后猜中目标”，否则发送方打错但接收方蒙对仍会得分；也不能只看“报码符合目标”，否则接收方没有责任。用二维结果：

| 编码 | 译码 | 结果 |
| --- | --- | --- |
| 对 | 对 | delivered，共同加分 |
| 错 | 对 | encodingError |
| 对 | 错 | decodingError |
| 错 | 错 | bothError |

结果文案应说明环节，不评价个人能力或关系。计分只奖励完整送达，不扣分。

## 反例

- 把目标写在隐藏节点、data 属性或 CSS 变量中；
- 播放后把完整脉冲轨迹留在 DOM，导致挑战退化成查表；
- reducer 直接创建 timeout 或读 Web Audio，使状态不可确定测试；
- 重听复用旧 token，迟到的首次播放回调提前开放猜测；
- 发送时自动纠正报码，却仍声称双方共同完成。

## 验证清单

- 逐阶段保存 accessibility snapshot 与完整 DOM 文本；
- 用已知目标分别跑四类编码/译码组合；
- 传入旧 token，断言 reducer 保持同一状态引用；
- 播放中 blur / visibilitychange，回来后必须显式重播；
- 320px 检查真实可见按钮高度，不把 `display:none` 的 0px 节点算进最小值；
- 浏览器无音频时，视觉时长与短/长文字仍可完成任务。
