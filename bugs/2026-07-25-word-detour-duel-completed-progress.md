# 绕词对决完成六张后显示第 7 / 6 张

- 日期：2026-07-25
- 项目：`word-detour-duel`
- 影响范围：`turn-ended`、`turn-review` 的公共进度投影
- 严重度：低；不影响题序、计分或秘密遮挡，但会显示不可能的进度

## 现象

不计时模式依次结算六张卡后：

```json
{
  "phase": "turn-ended",
  "activeCardIndex": 6,
  "progress": {
    "turn": 1,
    "turns": 4,
    "card": 7,
    "cards": 6
  }
}
```

进入 `turn-review` 后仍显示同一错误进度。

## 根因

`activeCardIndex` 是下一张卡的零基游标。处理第六张后，它会递增为 6，作为
“当前 hand 已耗尽”的内部哨兵。`getView()` 却在所有仍保留 `draftTurn` 的阶段
统一使用 `activeCardIndex + 1` 生成一基序号，因此把合法哨兵错误投影成第 7 张。

同一投影还让 `handoff`、`interrupted` 和 `turn-ended` 带有卡序；这与中性交接
阶段不显示卡序的合同不一致。

## 修复

内部状态与 reducer 不变。公共 view 只在 `card-ready / describing` 创建
`progress`；handoff、中断、回合结束和复核都返回 `progress: null`。进度对象使用
冻结常量替代 4/6 魔法数字。

回归测试分别覆盖：

- handoff 不带卡序；
- describing 的最后一张是 `6 / 6`；
- interrupted、turn-ended 和 turn-review 不带卡序。

## 边界

本修复没有改变：

- 第六张的结果记录；
- `activeCardIndex = 6` 的内部终止语义；
- 计时、得分、schedule 或回合确认；
- handoff、秘密卡与复核内容。
