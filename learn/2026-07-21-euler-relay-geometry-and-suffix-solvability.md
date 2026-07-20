# Euler 接力路径：整数相交、后缀可解性与原子重试

## 适用范围

适用于参与者从同一当前节点轮流追加一条无向边，要求每条目标边恰好使用一次，并把线头送到固定终点的本地合作题。它也适合巡线、缝线、布线、道路检查和“一笔画”叙事。

如果玩法允许跳到任意节点、重复边、撤销整段历史，或图规模大到不能枚举剩余边，则需要另选搜索与交互模型。

## 关键结论

### 1. 先证明目标图，再讨论玩家动作

冻结题面至少要通过四个 Gate：

1. 图连通；
2. 起点与终点是仅有的两个奇度点；
3. 目标边没有非端点相交或共线重叠；
4. 从固定起点到固定终点的完整 Euler 路径数量符合设计预期。

这只能证明题面有解，不能证明任意局部合法动作都还能完成。

### 2. 单步判定必须按确定顺序返回单一原因

推荐顺序：

1. 输入与状态是否合法；
2. 无向边是否属于目标图；
3. 该边是否已经使用；
4. 新线与已完成线是否发生禁止相交；
5. 提交后剩余图是否仍有完整路线；
6. accepted。

固定优先级让同一个动作只产生一个稳定错误码。UI、辅助技术、测试和重放不需要猜“同时错了几件事”。

### 3. 相交分类要使用整数方向量，不依赖像素或浮点容差

点坐标取安全整数时，可用方向量：

```text
orient(a, b, c) = (b.x-a.x)*(c.y-a.y) - (b.y-a.y)*(c.x-a.x)
```

再把结果分为：

- `none`：不相交；
- `shared-endpoint`：只共享一个合法端点；
- `proper-cross`：内部穿线；
- `collinear-overlap`：共线重叠；
- `invalid`：退化线段、越界数值或不可信 DTO。

规则层只消费 `{x, y}` 数据副本，不接受带 getter、代理或额外字段的对象。这样几何真相与 DOM 尺寸、CSS 缩放、SVG 呈现完全分离。

### 4. “边合法”不等于“前缀可完成”

玩家从当前线头选择一条尚未使用的邻边后，应在临时剩余图上计数：

```text
count(cursor, usedMask):
  if all edges used:
    return cursor == fixedEnd ? 1 : 0

  total = 0
  for every unused edge incident to cursor:
    total += count(otherEndpoint, usedMask + edge)
  return total
```

若计数为 0，返回 `future-stranded`，并且不提交这条边。位掩码和当前节点可作为 memo key；小图还能穷举所有 `cursor × mask` 状态交叉验证。

后缀解数是规则证据，不应放入 public view。页面只需要知道这次尝试为什么失败，不能得到推荐下一步或答案路线。

### 5. 失败尝试与成功历史要分层

accepted 必须原子地更新：当前节点、已用边集合、完成记录、席位和阶段。任何失败都保持这些权威字段不变，只增加当前边的尝试次数并进入可重试阶段。

因此一条完成记录可包含 `seat / from / to / edge / attempts`，而失败动作不会伪造已完成日志。两席严格轮换时，第 `n` 条边的席位可由已完成边数唯一推导，避免维护第二份可漂移的 turn 字段。

### 6. 阶段是状态合法性的一部分

一局可拆为：`intro → handoff → choosing → edge-result|jammed → ... → constellation-result → complete`。

- `jammed`：完成前缀不变，仍是当前席位，允许重试同一根线；
- `edge-result`：边已提交，但尚未把设备交给下一席；
- `constellation-result`：十边已完成，焦点属于结果标题；
- `complete`：纪念文案已展开，但完成历史仍可审计。

把这些阶段压成一个布尔值，会让交接、重试与焦点恢复互相打架。

## 反例

- 只看奇度点：能证明存在 Euler 路径，不能阻止玩家走进无解前缀。
- 用屏幕坐标判断相交：响应式缩放后规则可能变化。
- 先提交再检查后缀：失败时需要回滚节点、边、日志和席位。
- 把共享端点当作穿线：所有相邻目标边都会被误杀。
- UI 自己维护 used edges：规则状态和画面最终会漂移。
- 测试调用生产求解器生成期望：相同 bug 会同时污染实现与 Oracle。

## 验证清单

- [ ] 目标图连通、奇度点、相交和完整路线数都有启动自检
- [ ] 所有线段对与独立几何 Oracle 一致
- [ ] 所有可枚举 `cursor × usedMask` 状态与独立 DFS 一致
- [ ] off-outline、edge-used、wire-crossed、future-stranded 分别有负样本
- [ ] 每种失败都保持完成前缀、当前节点和席位不变
- [ ] 完整路线严格轮换且两席贡献数符合设计
- [ ] action log 可重放到同一冻结 public view
- [ ] 键盘方向导航、Enter/Space 与 Escape 不依赖鼠标
- [ ] public view 不暴露后缀解数、memo 或答案路线

## 本仓库证据

- 规则实现：`experiences/co-op/constellation-relay/logic.js`
- 定向与穷举测试：`experiences/co-op/constellation-relay/logic.test.js`
- 可执行规格：`docs/167-constellation-relay-spec.md`
- 配置与敌意输入复盘：`bugs/2026-07-21-constellation-relay-config-normalization-api.md`、`bugs/2026-07-21-constellation-relay-hostile-state-snapshot.md`
