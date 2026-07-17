# 阶段门控的渐进惊喜：让状态拥有文案与焦点

## 适用范围

适用于逐层礼盒、倒数揭晓、连续线索、分幕告白、纪念日时间轴等“完成一个小动作才得到一段内容”的本地静态惊喜。

## 关键结论一：阶段应拥有 DOM，而不是用 CSS 暂藏全部惊喜

把全部留言和终局文案预先写入 HTML，再用 `display:none` 隐藏，会让开发者工具、可访问树和样式回归提前暴露惊喜。更稳定的边界是：

```text
intro    只拥有开场动作
layer n  只拥有第 n 层机关
note n   只拥有第 n 层留言和继续动作
complete 才拥有最终信卡与重开动作
```

渲染层每次用 `replaceChildren()` 重建当前阶段允许的节点。需要诚实说明：配置仍在本机 JavaScript 内存中，这提供的是阶段化界面隐私，不是密码学保密。

## 关键结论二：多种手势应归一到无动画依赖的 reducer

丝带按钮、四角按钮、range 滑杆和敲击按钮可以有完全不同的视觉反馈，但它们都只提交离散事实：

- `releaseRibbon(side)`；
- `peelCorner(index)`；
- `setDrawerProgress(percent)`；
- `knock()`。

Gate 由状态数据决定，不能等待 `transitionend` 或 `animationend`。这样 reduced motion、低帧率、重复点击和自动测试都不会改写规则。

## 关键结论三：焦点策略要按“下一可操作控件”建模

阶段切换后，原节点被移除，浏览器会把焦点退回 `BODY`。不能假设新阶段一定有按钮；滑杆、文本框、文件输入或画布代理控件同样可能是主操作。

推荐把焦点分两类：

1. intro / note / complete：聚焦阶段唯一的 `button, input`；
2. layer：聚焦首个 `button:not(:disabled), input`。

浏览器验证必须查询 `document.activeElement`，并实际用 Enter、Space、End、方向键完成流程，不能只检查 tabindex。

## 关键结论四：同一索引的含义由 phase 决定

`layerIndex = 1` 在操作阶段表示第二层仍未完成，在留言阶段表示第二层已经打开。因此派生文案不能只看索引：

```text
remaining = total - layerIndex - (phase === note ? 1 : 0)
```

同理，进度勾选、ARIA 播报、素材状态和“下一层”按钮都应同时解释索引与阶段。

## 配置所有权

惊喜配置适合采用“整份通过或整份回退”，避免准备者只改了一半数组后，把默认收件人和私人留言意外拼在一起。sanitize 后深冻结副本，运行状态也不共享调用方数组。

## 反例

- 所有留言都在 DOM 中，仅用透明度遮挡；
- 动画结束才推进 reducer；
- 进入新层永远只查询第一个按钮；
- note 和 layer 使用同一个剩余数公式；
- 对畸形配置逐字段混搭默认私人文案。

## 验证清单

- 在 intro、每个 layer、每个 note、complete 和 restart 检查完整 DOM 文本；
- 鼠标与键盘分别完成所有手势，确认重复输入不跨 Gate；
- 验证 reduced motion 只缩短视觉时长；
- 在 320px 检查横向溢出、触控高度和页脚可达；
- 用真实 Chrome `file://` 打开，确认脚本和素材均为相对本地 URL；
- 对非法阶段操作断言输出与本次输入保持同一引用。
