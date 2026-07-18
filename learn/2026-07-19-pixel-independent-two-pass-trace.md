# 像素无关的双遍轨迹确认：锚点、线段命中与 Canvas 分层

## 适用范围

适用于“先画一遍，再沿原路走一遍”的本地交互：雾窗手写、描线练习、符号确认、路径复习、共同临摹、手势解锁和不要求字形识别的仪式型体验。它不适合需要判断汉字正确性、签名身份或生物特征的高风险场景。

## 关键结论

### 1. 完成规则不应读取像素

Canvas alpha、擦除面积和图片相似度都把视觉实现误当成业务真相：

- DPR、resize、抗锯齿和浏览器合成会改变像素；
- 大刷子可以在没有沿原路的情况下快速擦掉大量面积；
- forced colors 或 Canvas 降级会让规则无法解释；
- 读取 `getImageData()` 会把表现层、性能和隐私绑在一起。

更稳定的合同是：第一遍保存有限的规范化整数点，派生一组确定性锚点；第二遍只判断运动线段是否经过足够多锚点。Canvas 只把这些状态画出来。

### 2. 先用距离 Gate 压缩第一遍输入

Pointer move 频率取决于设备和浏览器，不能每个事件都成为权威点。把坐标映射到固定逻辑窗格，例如 1000×620，再按整数近似距离接纳：

```text
d = max(|dx|, |dy|) + floor(min(|dx|, |dy|) / 2)
accept iff d >= 12
```

这会自然压缩高频抖动，并避免 `sqrt/hypot` 与浮点阈值。还要冻结单笔点数、总点数和笔画数上限；达到单笔上限时闭合当前笔，但不要误伤仍允许的新笔。

### 3. 锚点按每笔累计距离生成

锚点不能按数组下标等分，因为设备事件密度不同。推荐对每笔独立累计路径长度，每到固定间距（例如 32）做一次整数插值，并强制保留每笔首尾：

1. 每笔累计距离从 0 重新开始；
2. 固定 target 为 32、64、96……；
3. target 落在线段内部时按同一舍入规则插值；
4. 相邻同坐标候选去重；
5. 候选过多时先移出 mandatory 首尾，再对 remaining 稳定抽样；
6. 最终 ID 按原始笔画与路径顺序重建。

抽样公式也必须冻结。`slots === 1` 时，偶数 remaining 选择左中位；多槽时可用：

```text
index(i) = floor(i * (count - 1) / (slots - 1))
```

这样相同 strokes 在 Node、浏览器和 JSON 往返后都得到深相等 anchors。

### 4. 第二遍要判定“移动线段”，不是事件落点

快速 Pointer move 可能从锚点左侧直接跳到右侧。如果只测试最新事件点到锚点的距离，会漏掉中间真正经过的锚点。应测试锚点到上一点—当前点闭线段的距离。

对 `P` 与线段 `A→B`，使用整数分支：

```text
v = B - A
w = P - A
vv = dot(v, v)
t  = dot(w, v)

vv == 0 或 t <= 0：比较 |P-A|²
t >= vv：比较 |P-B|²
其他：cross(v, w)² <= radius² * vv
```

整个判断不需要除法或平方根，并能明确覆盖退化线段、两个闭端点、线段前后与内部投影。窗格坐标与半径上限要保证平方乘积仍是安全整数。

### 5. 命中集合保持原始锚点顺序

第二遍可以跨过多个锚点、重复经过旧锚点或从任意笔开始。权威命中应是 anchors 的有序唯一子集：

- 先把已有 hit ID 放入 Set；
- 扫描 anchors，用线段谓词加入新命中；
- 最终仍按 anchors 原始数组过滤输出。

不要按字符串 ID 排序；`"10:0"` 的字典序不等于路径顺序。完成阈值使用整数分数，例如：

```text
hitCount >= ceil(anchorCount * 4 / 5)
```

### 6. 第二遍轨迹通常不需要保存

如果产品只关心“走过哪些原始锚点”，第二遍的原始点没有长期价值。权威状态只需：

- active trace 的 `lastPoint`，用于下一段命中；
- `hitAnchorIds`；
- `traceStrokeCount`；
- Pointer `generation`，拒绝迟到事件。

END_TRACE 后丢弃 `lastPoint` 即可。这样状态更小、隐私边界更窄，暂停与重开也更容易断言。

### 7. Canvas 是可替换的投影

推荐两层视觉 Canvas：雾层负责遮罩与第一遍擦痕，清晰层负责 anchors、hits 和当前反馈。两层都 `aria-hidden`；阶段、进度、操作和完成内容由 DOM 表达。

这带来三个好处：

- resize/DPR 变化只从 view 全量重绘，不派发规则 action；
- forced colors 可以隐藏装饰、改用系统色线型；
- 2D context 获取失败时仍可隐藏舞台并保留“直接打开”，不会永久锁住内容。

## 反例

- 擦掉 80% alpha 就完成：大笔刷横扫可以绕过“沿原路”的意图。
- 每个 `pointermove` 都存点：高采样设备先撞容量上限，低采样设备又缺锚点。
- 第二遍只检查事件落点：快速跨越锚点却被判为未经过。
- anchors 超限后直接截取前 160 个：后半段笔迹永远不会参与完成。
- 命中 ID 用字符串排序：多笔或两位数 stroke 后破坏原始路径顺序。
- Canvas context 失败就隐藏全部控制：键盘或辅助技术用户无法直达信件。

## 验证清单

- gap 边界、四项绘画 Gate 与三类容量上限都有精确测试；
- 每笔首尾 mandatory、候选 160/161 与单槽左中位已冻结；
- 线段退化、闭端点、前后投影、内部半径 46/47 和正负 cross 对称；
- 同一线段跨多个 anchor 按原序加入，重复经过不重复计数；
- 达到 `ceil(4/5)` 的同一个 BEGIN/ADD action 立即完成；
- 相同公开 action 日志重复执行得到深相等终态；
- JSON 往返后 generation、anchors 和 hits 仍能继续推进；
- resize、DPR 和动画帧不改变任何规则摘要；
- 完成前 DOM 不含私人正文，Canvas 失败仍有真实按钮可直达。

## 本仓库实例

“在雾上，写给你”使用 1000×620 整数窗格、12 点最小采样间距、32 距离锚点、46 命中半径和 4/5 完成阈值。逻辑测试覆盖 173 项，并保存一段 79 action 的公开黄金日志：第一遍生成 64 anchors，第二遍命中 52 个，以 `completionReason="traced"` 完成。

对应实现位于 [`../experiences/surprises/fog-window-letter/logic.js`](../experiences/surprises/fog-window-letter/logic.js) 与 [`logic.test.js`](../experiences/surprises/fog-window-letter/logic.test.js)。借鉴只涉及公开技术思想；固定来源、许可证与零复制声明见 [`../experiences/surprises/fog-window-letter/ATTRIBUTION.md`](../experiences/surprises/fog-window-letter/ATTRIBUTION.md)。

