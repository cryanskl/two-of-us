# 借鉴与来源声明

## 独立实现声明

“同路，谁先到”的确定性迷宫生成器、两个固定 seed、完整 fingerprint、BFS 校验、
四局换席赛程、固定 tick 状态机、积分、暂停语义、配置合同和测试均由本仓库独立
设计并编写。

本轮没有搜索、克隆或阅读外部开源迷宫项目的源码，也没有复制第三方地图、参数、
测试、界面、文案或素材。本目录没有第三方运行时依赖、第三方代码或第三方资产，
因此没有需要随作品再分发的第三方许可证正文、版权声明或 notice。

## 算法资料

### Depth-first search

- Robert Tarjan, “Depth-First Search and Linear Graph Algorithms”,
  *SIAM Journal on Computing* 1(2), 1972：
  <https://doi.org/10.1137/0201010>
- 用于：校准深度优先遍历、回溯和生成树的理论边界。
- 未复制：论文文字、图、证明、伪代码或任何实现。

本项目的迭代 DFS、邻居顺序、passage bitmask、冻结 seed、fingerprint 和测试均按本作
规格独立编写。

### Xorshift

- George Marsaglia, “Xorshift RNGs”, *Journal of Statistical Software*
  8(14), 2003：<https://doi.org/10.18637/jss.v008.i14>
- 用于：校准非零 32 位 xorshift 状态递推的算法来源。
- 未复制：论文文字、图、软件包、示例代码或测试。

JSS 文章页面区分文章许可与随文软件许可；本项目没有引入、修改或链接随文软件，
只按项目规格独立写出有限的 32 位整数递推。该递推只用于可复现地图，不用于密码学
安全或公平抽签声明。

### Breadth-first search

- E. F. Moore, “The Shortest Path Through a Maze”, in
  *Proceedings of an International Symposium on the Theory of Switching*,
  Harvard University Press, 1959, pp. 285–292.
- 用于：校准无权迷宫最短路径的 BFS 语义。
- 未复制：论文文字、图、证明或实现。

BFS 只用于生产同源校验和测试。最短路径不会进入公共 view，也不会作为玩家提示。

## 当前实现边界

- `logic.js` 不读取 DOM、浏览器时间、键盘、Pointer 或网络事件；
- `TICK`、`QUEUE_MOVE`、`PAUSE` 只是纯数据 action；
- 本阶段测试不能证明物理键盘 ghosting、真实双触控、RAF、响应式或 `file://` UI；
- 两块 Board 的未来视图必须共享同一个公开 maze DTO；
- 运行时不使用 npm 依赖、网络、存储、账号或设备权限。

## 后续变更规则

如果后续实际参考任何开源实现，必须在写代码前补充：

- 固定仓库 URL 与 commit 或 tag；
- LICENSE 固定链接、许可证名称和版权人；
- 实际借鉴内容与明确未复制范围；
- 若引入代码或资产，保留许可证正文、版权与 notice。

来源无法固定、许可证不清或权利不明时不得复制。
