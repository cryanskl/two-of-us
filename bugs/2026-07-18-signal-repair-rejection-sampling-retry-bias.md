# 把信号接回来：无偏采样的固定重试上限重新引入索引 0 偏差

- 状态：`fixed`
- 日期：2026-07-18
- 影响作品：把信号接回来
- 发现版本 / commit：`78e62b6 feat: add signal repair state engine`

## 环境

- Node.js 18+；
- 入口：`experiences/co-op/signal-repair-manual/logic.js`；
- API：`createUnbiasedRandomIndex(cryptoLike)`；
- 通过可注入的 `getRandomValues` 确定性复现。

## 复现步骤

1. 创建上界为 3 的无偏索引函数；
2. 让测试随机源连续返回 130 次 `4294967295`，这些值都落在 rejection 区间；
3. 第 131 次返回合法样本 `7`；
4. 调用 `randomIndex(3)`。

回归向量：

```js
const values = [...new Array(130).fill(4294967295), 7];
const randomIndex = createUnbiasedRandomIndex({
  getRandomValues(array) {
    array[0] = values.shift();
    return array;
  },
});
randomIndex(3);
```

## 预期结果

拒绝所有阈值外样本，继续读取第 131 个合法样本，返回 `7 % 3 === 1`。

## 实际结果

初版实现最多尝试 128 次；达到上限后固定返回 0，没有读取后续合法样本。虽然真实加密随机源连续发生该序列的概率极低，但算法已不再严格无偏，而且测试或替代 crypto 实现可稳定触发。

## 根因

rejection sampling 把 `[0, 2^32)` 截成可被上界整除的区间。阈值外的样本只表示“本次不可使用”，不表示随机能力失效。固定 128 次上限把“仍需抽样”错误合并成“能力失败”，并把所有这类序列映射到索引 0。

## 解决方案

- 将固定次数 `for` 改为以合法样本为终止条件的循环；
- `getRandomValues` 缺失或抛错时仍返回 0，保留规格要求的固定顺序可玩降级；
- `maxExclusive === 1` 仍直接返回 0；
- 新增 130 次拒绝后接受第 131 个样本的回归测试。

生产浏览器的 `crypto.getRandomValues` 不会由调用方传入持续拒绝的恶意序列；因此合法随机能力下继续抽样符合算法契约。测试随机源负责提供最终合法样本，避免测试本身构造永不终止的伪实现。

## 回归验证

- [x] 130 个拒绝样本后读取到 `7` 并返回索引 1；
- [x] rejection 阈值前一值仍可接受，阈值值仍被拒绝；
- [x] `n=1`、无 crypto、crypto 抛错和非法上界保持原行为；
- [x] 作品定向测试从 42/42 增至 43/43；
- [x] 全仓 466/466；
- [x] 仓库校验仍通过 38 个现有作品入口；
- [x] 三个 JS `node --check` 与 `git diff --check` 通过。

## 相关提交

- `78e62b6 feat: add signal repair state engine`：包含有固定 128 次上限的初版；
- `b4d1e2b fix: preserve unbiased signal session sampling`：移除重试上限并增加确定性回归；
- 本记录单独提交，便于以后检索无偏随机中的“安全上限”陷阱。
