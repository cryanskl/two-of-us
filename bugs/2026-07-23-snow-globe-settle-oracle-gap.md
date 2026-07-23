# 雪球留言 settle token 独立 oracle 缺口

- 日期：2026-07-23
- 范围：`experiences/surprises/snow-globe-message/logic.test.js`
- 发现阶段：纯逻辑首次提交前只读审查
- 状态：已修复

## 环境与复现

在原测试保持不变的情况下，把生产 `BEGIN_SETTLE` 的 token 公式从
`revision + 1` 临时改成 `revision + 2`。旧测试从生产 state 读取 token，
再用同一个 token 完成和重放，因此 token/replay 部分仍能通过。

## 预期与实际

预期测试使用独立公式证明：

- 正常路径 START + 四次首次 ADD 后 revision 为 5；
- BEGIN 后 revision 与 settleToken 都精确为 6；
- gathering 的四种 windCount headroom、armed 的 `MAX-2`、settling 的
  `MAX-1`、complete 的 `MAX` 和 restart 的 `MAX-8` 都可完成承诺事务。

实际旧测试主要比较两次生产 reducer 的结果；`nearBegin` fixture 本身已是
非法 armed state，只证明非法 state 回初态，没有证明合法边界。

## 根因与修复

回放确定性测试不能替代独立 transition oracle。修复包含两层：

1. 正常路径直接断言 BEGIN 后 revision/token 的外部已知值 6；
2. 新增不调用生产 reducer计算预期值的边界表，分别构造 0–3 个方向的合法
   gathering 最大 revision、合法 `MAX-2` armed，以及 restart 后下一轮，
   再把生产输出与独立算式比较。

## 回归验证

```bash
node --test experiences/surprises/snow-globe-message/logic.test.js
npm test
npm run verify
git diff --check
```

相关提交在本文件随纯逻辑首次提交一并落库；提交哈希以 Git 历史为准。
