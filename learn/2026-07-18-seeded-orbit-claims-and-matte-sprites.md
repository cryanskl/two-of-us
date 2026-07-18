# 可重放轨道争夺：claim 权威、平衡 seed 与哑光精灵

适用范围：双人抢点、自动移动 + 离散切道、同帧竞速捕获、可加赛先到 N 分、本地优先小游戏，以及需要把生成图集叠到深色背景的轻前端项目。

## 1. 分数不是事实，claim 才是事实

最容易写出的状态是：

```js
{
  scores: [3, 2],
  starIndex: 5,
  winnerIndex: null,
  claims: [...]
}
```

但这里有四份可以互相矛盾的真相。一次旧回调、一个重复捕获或一段重开代码，都可能让比分与日志脱节。

更稳定的权威链是：

```text
seed + 当前固定步 + 玩家轨道 / 角度 + claim 日志
  → 当前目标星
  → 双方比分
  → 领先者
  → 是否终局
  → 赢家
```

一个 claim 只记录无法再派生的事实：

```js
{
  starIndex: 4,
  step: 1837,
  winners: [0],       // 或 [0, 1] 表示共享
  distances: [0.012, 0.041]
}
```

比分是对 `claims[].winners` 的折叠；当前星索引是 `claims.length`；赢家是派生比分通过终局 Gate 后的结果。重放、快照、UI 和无障碍文案都读这条链，不再各维护一份分数。

## 2. 同步捕获必须在更新后一次裁决

双人在同一固定步内都可能进入捕获窗口。正确顺序是：

```text
同一旧状态
  → 同时更新两人角度与 cooldown
  → 读取同一颗目标星
  → 筛选“同轨 + 进入捕获半径”的候选人
  → 比较更新后最短角差
  → 产生恰好一个 claim
```

不能先更新玩家 0 并给分，再让玩家 1 检查；那会把数组顺序变成隐藏先手。

共享也不应使用“两人都进窗口就各加一分”。更稳定的裁决是：

- 只有一个候选人：该人获得 claim；
- 两人距离差大于明确 epsilon：更近的人获得 claim；
- 两人距离差不大于 epsilon：生成一个 `winners: [0, 1]` 共享 claim。

这样只有一颗星、一个步号和一个事件，不会在日志里把“共享”误写成两次独立捕获。

## 3. 环形距离不能直接相减

`359°` 和 `1°` 只相差 `2°`，不是 `358°`。所有环形游戏都应固定两个基础函数：

```js
function normalizeAngle(value) {
  const turn = Math.PI * 2;
  return ((value % turn) + turn) % turn;
}

function shortestAngleDistance(left, right) {
  const turn = Math.PI * 2;
  const delta = Math.abs(normalizeAngle(left) - normalizeAngle(right));
  return Math.min(delta, turn - delta);
}
```

测试至少包含跨零、恰好 `π`、负角度、多圈角度和非有限输入。如果捕获、渲染和无障碍方位描述各写一套跨零逻辑，它们迟早会不一致。

## 4. 随机公平要约束序列结构

每颗星独立均匀抽内 / 中 / 外轨，长期频率是公平的，短局却可能连续出现同一轨。这会让某个玩家因初始位置或当前轨道偶然获利。

对“三轨 + 先到五颗”这种短局，更合适的生成器是平衡分组：

```text
第 0–2 颗：内、中、外各一颗，组内 seed 洗牌
第 3–5 颗：内、中、外各一颗，组内 seed 洗牌
...
```

角度仍可由 seed 独立派生，但应避开立刻贴身的危险扇区，并先公开 preview 再允许捕获。这种方式保留了未知性，同时把短局中的轨道覆盖变成可证明不变量。

测试不要只断言“所有轨道都合法”，而要固定：

1. 同 seed 逐字段相同；
2. 不同 seed 至少在某个目标上不同；
3. 每三颗的轨道集合恰好是 `{0, 1, 2}`；
4. 每颗角度都在合法扇区；
5. 生成器不直接读 `Math.random()`，而是接受非零 32 位 seed。

## 5. 加赛 Gate 要由比分关系表达

“先到 5 分”如果直接写成 `score >= 5` 就终局，共享 claim 可能让双方同步进入 5–5，然后玩家 0 因数组顺序被选中。

终局 Gate 应是：

```js
const reachedTarget = scores.some((score) => score >= targetScore);
const hasLeader = scores[0] !== scores[1];
const finished = reachedTarget && hasLeader;
```

所以 5–5 继续，6–5 结束。这个规则应与“共享 claim 双方各加一分”在同一组测试中验证，因为两者共同决定加赛语义。

## 6. rAF 不应拥有规则时间

轨道动画是连续的，规则却应以整数步表达：

- reducer 每次只前进 `1 / 120` 秒；
- rAF accumulator 只决定本帧消费几个固定步；
- 单帧可追赶的总时间和步数都设上限；
- `blur`、`visibilitychange(hidden)` 和 `pagehide` 清空 timestamp 与 accumulator；
- 返回页面后从新帧重新累计，不补跑后台时间。

“把超长帧限制到 100ms”只是一道保险，不能替代页面生命周期重置。否则玩家切回标签页时仍可能在一帧内被迫前进多个无输入步。

## 7. 私人终局 formatter 不能改变规则

为情侣作品保留一个 5–10 行的私人文案入口很有价值，但 formatter 必须是严格出口，不是规则回调：

```js
composeResult({ winnerIndex, playerNames, scores, sharedClaims })
  → { title, body } | null
```

边界应包括：

- 传入上下文递归冻结；
- 不传 seed、角度、当前星或可变状态；
- 只接受同步、有长度上限的纯文本 `title / body`；
- Promise、异常、空字符或非法结构全部回退默认文案；
- 终局结果只写入一个常驻状态节点，操作区只拥有重开按钮；
- 若主动聚焦结果标题，同一转换不再用 live region 重复播报整段结果。

这样准备者可以安全改语气，却无法改分、改赢家或让终局 DOM 变成两份。

## 8. 生成图的“棋盘格”不等于 alpha

图片生成界面常用棋盘格表示“透明”，但导出文件可能是把棋盘格直接烘进 RGB。资产验收应先读文件真相：

```text
通道数 / hasAlpha
四角像素是否一致
四角是否真透明
主体周边是否已混入哑光色
在目标深色背景上实际叠加的边缘
```

若不可以重新生成真 alpha，深色同色系哑光资产可用组合降低方块感：

1. `mix-blend-mode: lighten` 让近黑背景融入更暗的星图；
2. 径向 mask 软化图集单元的边界；
3. 避免在父级滤镜下创建不可预期的 stacking context；
4. 需要独立融合的中央物件移出裁切 / filter 父层；
5. 每个生产资产都保留明确加载失败 class 与 CSS 几何回退。

`lighten` 不是万能去背景：亮色哑光底或浅色页面会产生错误。它只适合“近黑哑光图集 + 更暗的目标背景”，且必须在桌面、手机、终局和双资产失败四种情境目视验证。

## 9. 本地优先要验证交付契约

一个页面在 localhost 可玩，不自动等于可双击。A 级小游戏要把运行契约写进文件结构：

- `index.html` 只使用相对路径的经典脚本与样式；
- 不依赖 ES module 跨文件加载、fetch、Worker、Service Worker 或服务器路由；
- 图片加载失败只影响美术，不阻断规则；
- 目录单独复制到另一台电脑仍有完整依赖；
- 真实系统浏览器至少完成一次 `file://` 启动门禁；
- 完整流程、响应式和 console 在可自动化的同一份静态文件上验证。

自动化工具如果基于安全策略禁止 `file://` 导航，应在验收报告明确记录，再用系统浏览器直开补证；不要把 localhost 写成 file 实测。

## 10. 最小测试矩阵

规则层至少固定：

1. 三轨速度严格单调，两人方向相反；
2. 多种帧分组消费同一固定步日志得到同一结果；
3. preview 最后一步不捕获，live 第一步才捕获；
4. 单人候选、双人不同距离、epsilon 内共享；
5. 共享 claim 只增加一个日志项，但双方比分各增一；
6. 5–4 结束、5–5 继续、6–5 结束；
7. 同 seed + 同输入日志重放逐字段相同；
8. 非法状态、过期动作、边界切轨和 cooldown 不会半修改状态；
9. restart 只从 finished 生效，清空 claim 并换新 seed；
10. formatter 的正常、空值、异常、Promise 与非法返回都有回归。

浏览器层至少固定：

1. 点击开始后的焦点位置；
2. 键盘和 Pointer 分别只改变自己轨道；
3. 通过生产控件达到真实终局；
4. 终局只有一个结果 owner、一个重开动作、一条播报路径；
5. 重开后比分、claim、目标和焦点复位；
6. 1504、390、320 三档无溢出且触控目标达标；
7. 背景失败、精灵失败和双失败都保留规则可玩性；
8. console error / warning 为 0，不存在公网请求。

## 11. 对应实证

- [「这一颗我先到」实现规格](../docs/74-orbit-star-race-spec.md)
- [「这一颗我先到」视觉设计](../docs/78-orbit-star-race-design.md)
- [「这一颗我先到」验收记录](../docs/80-orbit-star-race-verification.md)
- [ImageGen 预览棋盘格并非真透明](../bugs/2026-07-18-imagegen-fake-transparent-sprite-atlas.md)
- [哑光精灵图在星图上露出方形底块](../bugs/2026-07-18-orbit-sprite-matte-blocks.md)
- [终局结果重复显示与播报](../bugs/2026-07-18-orbit-duplicate-terminal-copy.md)
- [`orbit-star-race/logic.test.js`](../experiences/versus/orbit-star-race/logic.test.js)

这套方法的目标不是让一个十几秒的小游戏看起来像大型引擎，而是让它在随机、同时、加赛、终局、本地打开和资产失败时仍只有一份可解释的真相。
