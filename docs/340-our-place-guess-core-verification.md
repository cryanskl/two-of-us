# Our Place Guess 非视觉核心验证记录

## 1. 本阶段结论

本阶段完成 `our-place-guess` 的非视觉、可独立纯测试核心：

- 固定来源、可重复派生的 Natural Earth 离线陆地资产；
- 严格私密题包模型、公开模板和四张虚构示例；
- 经纬度投影、四档视口、键盘步进与陆地 geometry 校验；
- 四轮状态机、haversine 距离、共同档位与终局摘要；
- 两人房间门控、密封结果校验、host 状态重放与有界失败关闭；
- 借鉴与资源声明。

本阶段没有新增生产 UI、启动器、catalog 条目或共享运行时改动，因此不能宣称作品已经可以从总控启动或已经通过双浏览器验收。

## 2. 工作树与基线

每个写入阶段和每次提交前均执行：

```sh
git branch --show-current
git rev-parse --show-toplevel
```

固定结果：

```text
branch: codex/exp-our-place-guess-core
worktree: /Users/zenith/Desktop/two-of-us-worktrees/our-place-guess-core
baseline: 9be39154d6e3e42ce2b6df5314b75a47a9a73738
```

基线范围审计：

```sh
git diff --name-only 9be39154d6e3e42ce2b6df5314b75a47a9a73738..HEAD \
  | rg -v '^(experiences/co-op/our-place-guess/|bugs/our-place-guess-noop-viewport-alias\.md$)'
```

结果为空。除本验证文档外，改动仅位于本项目目录与唯一缺陷记录，没有修改 catalog、根 README、分类 README、Board、`shared/runtime`、根 `package.json` 或 lockfile。

## 3. 分段提交

| Commit | 内容 |
| --- | --- |
| `0b7e35d` | 固定 Natural Earth 来源并提交最小离线 land 资产与借鉴声明 |
| `441d31f` | 严格、确定、深冻结的私密题包模型和示例 |
| `98a6f16` | 世界地图投影、视口数学和 geometry 校验 |
| `6432af9` | 修复 viewport no-op 返回调用方可变引用的问题 |
| `701b7da` | 独立记录 viewport 引用别名缺陷、根因和回归验证 |
| `9772f83` | 四轮密封猜地点 reducer、距离和摘要 |
| `454997b` | 房间 host/sealed/乱序/成员变化协议门控 |

本文件在上述功能提交之后单独提交。

## 4. 资源固定与借鉴边界

### 4.1 Natural Earth

- 数据集：Natural Earth Vector `v5.1.2`
- 固定 commit：`f1890d9f152c896d250a77557a5751a93d494776`
- 固定输入：`geojson/ne_110m_land.geojson`
- 原始 SHA-256：`9e0729ee253ca7d7a5c4ae9395fb1902264c5377c52e224d13dd85010e2835d9`
- 派生输出 SHA-256：`54f84f3d2eac224a46f10010c4a1a8446331a35711ccced0e1905e13e574f148`
- 派生输出大小：`123906` bytes

派生脚本只保留 `Polygon` / `MultiPolygon` geometry，移除属性、名称与 CRS，坐标固定到六位小数，并以确定顺序输出最小 JSON。Natural Earth 数据为 public domain；地图数据经过概化，不用于导航、精确测量或主权判断。

### 4.2 Posio

产品机制研究参考 [Posio](https://github.com/abrenaut/posio) 固定 commit `00262568749fa841994f4c7d6d9a8c75115955d7`，许可证为 MIT，版权为 `Copyright 2024 Arthur Brenaut`。实现是针对本仓库规格独立编写的零复制版本：未复制其代码、样式、文本、题目、测试、截图或其他资产。

### 4.3 仓库共享能力

房间能力复用本仓库已有 Socket.IO 运行时、`two-player-membership.js` 和 `sealed-rounds.js`，未修改共享文件。完整声明见 `experiences/co-op/our-place-guess/ATTRIBUTION.md`。

## 5. 核心行为验证

### 5.1 题包

- schema 版本严格等于 `1`；
- 文件限制 `64 KiB`，卡片数量 `4..24`；
- 每局只按文件顺序使用前四张，多余卡产生确定提示；
- 拒绝额外字段、accessor、Symbol、异常原型、稀疏数组、HTML、URL 与越界坐标；
- 输出与输入断开引用并递归冻结；
- 公开示例只含四个虚构地点，私密副本应保存在静态项目目录之外。

### 5.2 地图

- 等距圆柱投影与反投影；
- 纬度固定在 `[-80, 80]`，经度固定在 `[-180, 180]`；
- 缩放仅 `1× / 2× / 4× / 8×`；
- 键盘粗调 `0.5°`、细调 `0.1°`；
- 点集自适应和反经线失败关闭；
- viewport no-op 返回隔离、规范化、递归冻结的快照；
- land 资产严格限制为闭合的 Polygon / MultiPolygon。

### 5.3 规则

- 大圆距离使用半径 `6371.0088 km` 的 haversine，并把经度差包裹到 `[-π, π]`；
- 共同距离取两人距离的较大值；
- `50 / 200 / 800 km` 边界分别映射为 `close / near / familiar / far`；
- 严格四轮、严格递增 version、确定 roundId；
- guessing 公开树不含当前 target、revealNote 或未来卡；
- 第四轮直接进入 finished；
- 终局同距时选择较早回合，不生成个人胜负或总公里排名；
- 访客用自己收到的 sealed result 与公开 target 重算距离和档位，篡改状态不能显示。

### 5.4 协议

- namespace 固定 `our-place`，状态消息固定 `our-place:state`；
- sealed result 严格核对 room、round、card、成员、额外字段与坐标；
- 两份坐标按冻结成员顺序规范化；
- 只有已知 host 的同房间 envelope 可进入验证；
- host state 先到可暂存，sealed result 到达后按连续版本重放；
- 队列最多四个唯一版本，第五个触发清空并报告 overflow；
- result 早于 ack 时提交状态不会从 revealed 回退；
- 共享 sealed registry 已验证同值重试幂等、改值拒绝、第三人拒绝和成员清局；
- 成员替换与 host 迁移复用统一的两人席位 reset 信号。

## 6. 验证命令与结果

### 6.1 项目核心

```sh
node --test \
  experiences/co-op/our-place-guess/tools/vendor-map.test.js \
  experiences/co-op/our-place-guess/pack.test.js \
  experiences/co-op/our-place-guess/sample-pack.test.js \
  experiences/co-op/our-place-guess/map.test.js \
  experiences/co-op/our-place-guess/logic.test.js \
  experiences/co-op/our-place-guess/protocol.test.js
```

结果：`41/41` 通过。

### 6.2 共享运行时联测

```sh
node --test \
  experiences/co-op/our-place-guess/protocol.test.js \
  shared/runtime/sealed-rounds.test.js \
  shared/runtime/server.test.js
```

结果：`22/22` 通过。

首次执行时，独立 worktree 没有 `node_modules`，`server.test.js` 在加载仓库已声明的 `qrcode@1.5.4` 时终止。按现有 lockfile 执行 `npm ci` 后通过；没有新增依赖，也没有修改 package 或 lockfile。这是环境准备问题，不是产品逻辑缺陷。

### 6.3 全仓库

```sh
npm test
```

结果：`2218` tests，`2218` 通过，`0` 失败。

```sh
npm run verify
```

结果：

```text
仓库验收通过：58 个作品入口（50 个 A 级直开、8 个非 A 启动器）、
1 个能力声明、资源与借鉴声明完整。
```

新项目未登记为 installed，因此上述 `58` 个入口数量保持不变。

### 6.4 来源、语法与差异

```sh
node experiences/co-op/our-place-guess/tools/vendor-map.mjs --check
shasum -a 256 experiences/co-op/our-place-guess/assets/ne-110m-land.min.geojson
for file in experiences/co-op/our-place-guess/*.js \
  experiences/co-op/our-place-guess/tools/*.mjs; do
  node --check "$file"
done
git diff --check
```

结果：固定来源输入和派生输出哈希一致；所有新增 JavaScript 语法检查通过；差异检查通过。

## 7. 缺陷与沉淀

真实修复的 viewport no-op 可变引用别名问题已记录在：

```text
bugs/our-place-guess-noop-viewport-alias.md
```

除此之外，TDD 阶段出现的“实现文件尚未创建”以及独立 worktree 未安装既有依赖，均不是产品 bug，没有额外写入 `bugs/`。本阶段没有形成需要脱离项目规格单独维护的通用学习笔记，因此未新增 `learn/` 文件。

## 8. 未覆盖边界与后续接入要求

本阶段刻意没有执行以下事项：

- `index.html`、`styles.css`、`app.js` 或启动器实现；
- File Picker、私密题包内存生命周期和 DOM 泄漏检查；
- catalog、总控、分类 README 或 Board 接入；
- 双浏览器、移动视口、200% 缩放、键盘和断线的真实 UI 验收；
- 生产启动器、health、直达 URL 和端口释放验证。

后续 UI 阶段必须继续保证：私密 pack、未来 target 和文件名不进入访客消息、DOM、日志或静态目录；成员/host/disconnect reset 时清空 pack、pin、队列和 sealed result；只有 UI 与浏览器 Gate 全部通过后才能登记为 installed。
