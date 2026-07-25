# 四符片名擂台：题名语义与 token 不一致

## 现象

阶段一首次机械审计发现三处真实内容缺陷：

1. `midnight-2-b` 使用蜗牛、邮箱、叶子、闹钟，却把答案写成“松果邮差迟到半刻”；
2. `rain-3-b` 使用小鸟、彩虹、铅笔、云朵，却把答案写成“风筝修补了半片彩虹”；
3. `starlight-4-b` 的四符数组重复使用两次 `moon`，没有提供四个独立语义槽位。

这些数据尚未进入已安装项目，但已经写入实现分支并被预提交审计实际检出。

## 复现

在修复前运行：

```bash
node - <<'NODE'
const config = require("./experiences/versus/four-symbol-film-duel/config.js");
console.log(config.cards.filter((card) => new Set(card.tokens).size !== 4).map((card) => card.id));
NODE
```

会输出：

```text
[ 'starlight-4-b' ]
```

逐卡比较 `tokens`、`rationale` 和正确选项，还能复核前两处名词漂移。

## 影响

- 不存在的“松果”和“风筝”会让四符无法完整支持答案；
- 同卡重复月亮降低信息量，与默认四个独立 token 的内容合同冲突；
- 若只做数量校验，这三张卡仍可能被错误标记为 `reviewed: true`。

## 根因

题目先以微型故事草案创作，后来替换过 token，但答案标题没有同步复核。最初
的一次性检查只统计 token 数组长度，没同时检查集合大小和题名名词是否由题面
或解释支持。

## 解决方案

- “松果邮差迟到半刻”改为“蜗牛邮差迟到半刻”；
- “风筝修补了半片彩虹”改为“小鸟修补了半片彩虹”；
- `starlight-4-b` 改为月亮、星星、邮箱、卫星四个独立 token，并将答案改为
  “月轨之间的慢递员”；
- 数据测试固定要求每张卡 `new Set(tokens).size === 4`；
- 内容审计表同步记录最终 32 个答案。

## 验证

```bash
node --test experiences/versus/four-symbol-film-duel/logic.test.js
npm test
npm run verify
git diff --check
```

结果：

- 项目测试 `25/25`；
- 全仓测试 `1997/1997`；
- repository verify 通过；
- 32 卡全部具有四个不同 token；
- 128 个选项标题全局唯一；
- 4 个题包的 A/B 难度与类型序列一致。

## 影响范围

仅首版 `four-symbol-film-duel` 内容数据。没有修改其他项目、catalog、门户或
共享 runtime。
