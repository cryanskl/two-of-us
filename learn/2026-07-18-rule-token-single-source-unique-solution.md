# 条件推理题：用规则 Token 同源生成文案、谓词与唯一解

适用范围：协作手册、线路判断、配方选择、排班线索、逻辑卡、逃脱题和任何“按一组有顺序的条件，从多个对象中找出唯一答案”的本地 HTML。

## 核心结论

不要同时维护自由文本规则、判定函数和预设答案。三份真相很容易在改题时分叉：页面读的是新版文案，求解器跑的是旧谓词，题库却仍保存更旧的 `answerId`。

更稳的题目结构只保存对象属性与有限规则 token：

```js
{
  id: "overlap-echo",
  branches: [
    { id: "A", nodes: 6, signal: "bright", symbol: "tail" },
    { id: "B", nodes: 3, signal: "steady", symbol: "arc" },
    { id: "C", nodes: 5, signal: "bright", symbol: "ring" },
  ],
  rules: ["UNIQUE_BRIGHT", "UNIQUE_ODD", "UNIQUE_STEADY"],
}
```

每个 token 在一个冻结注册表中定义两件事：

```text
token
  ├─ describe(token) → 玩家看到并朗读的句子
  └─ match(token, branch, branches) → 该分支是否命中
```

题库不保存答案。加载和测试时都由同一个求解器依次执行规则，找到第一个“恰好命中一个分支”的规则；它的唯一命中分支才是答案。

## “首个唯一规则”也是规则的一部分

有顺序的优先规则不能简化成“任意唯一规则都算”。正确求解过程是：

```text
for rule in rules:
  matches = branches.filter(rule.matches)
  if matches.length === 1:
    return { branch: matches[0], rule }
return unsolved
```

前面的规则可能命中 0 条或多条，只有第一个唯一命中的规则生效。这样领航员必须按顺序朗读，操作员也能解释“为什么第三条才决定答案”。

反例是预先写 `answerId: "B"`，再单独显示三句规则。它无法证明 B 确实由规则推出，也无法阻止某次属性修改让第一条突然唯一命中 A。

## 验证器应拒绝平行真相

题库 schema 除了检查 ID、枚举值和长度，还应主动拒绝：

- `answer`、`answerId`、`solution` 等预计算答案字段；
- 自由文本 `ruleText` 与 token 同时存在；
- 未知 token；
- 重复题目 ID 或重复分支 ID；
- 共享可变分支对象；
- 没有任何唯一规则的题；
- 求解结果与题目声明的首个唯一规则序号不一致。

“拒绝额外字段”看似严格，实际是在保护唯一真相。否则后来的人很容易为了赶进度又塞回一个答案捷径。

## 文案和谓词必须一起测试

单测至少固定以下向量：

1. 每个公开 token 都能生成非空、可朗读的文案；
2. 未知 token 同时被描述器和求解器拒绝；
3. 0 命中时继续下一条规则；
4. 多命中时继续下一条规则；
5. 第一个唯一命中后不再读取后续规则；
6. 每张生产题都恰有可解释解；
7. 删除或修改任一关键属性会让验证器捕获无解或首规则漂移；
8. 返回给渲染层的分支、规则和题目都是克隆或冻结值；
9. 超时页面不包含答案、规则索引或正确分支；
10. 结果页面只显示求解器返回的命中规则，不从另一个映射表猜测。

## 隐私边界不是密码学边界

同机面对面玩法可以用朝向、阶段 DOM 和交接仪式减少无意偷看，但只要双方题面最终同时存在于同一页面，它就是荣誉制，不是安全秘密。

如果题面必须对另一位玩家真正保密，应改为热座阶段独占 DOM，或升级到两台设备按席位下发不同公开状态。不要因为 CSS 旋转或 `hidden` 就声称实现了安全隔离。

## 证据与边界

本结论由“把信号接回来”的 12 张原创题、43 项规则测试和四轮真实浏览器实玩支持：

- [`../docs/87-signal-repair-manual-spec.md`](../docs/87-signal-repair-manual-spec.md)
- [`../experiences/co-op/signal-repair-manual/logic.js`](../experiences/co-op/signal-repair-manual/logic.js)
- [`../experiences/co-op/signal-repair-manual/logic.test.js`](../experiences/co-op/signal-repair-manual/logic.test.js)
- [`../experiences/co-op/signal-repair-manual/ATTRIBUTION.md`](../experiences/co-op/signal-repair-manual/ATTRIBUTION.md)

这套方法保证题面、判定和答案同源，不保证题目天然有趣或难度合适。节奏、信息量和语言清晰度仍需要双人实玩；来源机制与许可证边界也仍需单独记录。
