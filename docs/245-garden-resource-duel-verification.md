# “这一朵，我先养开”验收记录

- 验收日期：2026-07-24
- 稳定 ID：`garden-resource-duel`
- 等级：A，单设备轮流，2 人对抗
- 结论：通过；作品、目录、来源、bug 与 learn 已提交

## 1. 交付范围

作品位于
[`experiences/versus/garden-resource-duel/`](../experiences/versus/garden-resource-duel/)：

- `config.js`：本地标题、席位和公开结语配置；
- `logic.js`：纯状态迁移、季节生成、联合结算、公开/席位投影和历史核验；
- `logic.test.js`：规则、hostile 输入、来源与穷举夹具；
- `index.html`、`app.js`、`styles.css`：七阶段热座 UI；
- `README.md`：玩法、键盘、隐私、配置和运行边界；
- `ATTRIBUTION.md`：固定来源、许可证、权利主体、哈希与零复制声明；
- `package.json`：把本目录固定为真实 CommonJS 测试边界。

没有新增 npm 依赖、运行时、远程资源、图片、字体、音频、网络、存储或权限。

## 2. 规则与公平性

执行：

```bash
node --test experiences/versus/garden-resource-duel/logic.test.js
```

结果：`22 / 22` 通过。

覆盖：

- 固定六轮、三次阳光需求、三次雨露需求和 `1 / 1 / 2 / 2 / 3 / 3` 花瓣值；
- 两席各 `2 / 2 / 2` 有限手牌、联合扣减、虫害只阻挡当前轮；
- 第一位封牌后公开库存不变，第二位不能从公开 view 推断牌种；
- 两位确认后才同时扣牌、计分、追加历史和清空封牌；
- first seat 六轮交替，单方开花、同时开花、轮次上限胜和平局；
- seed、重开、配置清洗、公开结语隔离、递归冻结和真实 CommonJS；
- action/state 的 Getter、Proxy、descriptor 快照、revision 上溢与 fail-closed。

穷举固定 `162,000` 个双方牌种序列夹具：

```text
player0 = 59,444
player1 = 59,444
draw    = 43,112
```

交换席位后的胜负计数严格镜像，未发现某一固定出牌序列对所有对手都不败。夹具按
不可区分牌种的多重集合生成，没有把两张同类牌人为编号后重复计数。

## 3. 全仓库与目录

执行：

```bash
node --test scripts/experience-contracts.test.mjs shared/runtime/catalog.test.js
npm test
npm run verify
```

结果：

- 目录与启动合同定向测试通过；
- 全仓库 `1794 / 1794` 通过；
- `57` 个作品入口：`49` 个 A 级直开、`8` 个非 A 启动器；
- `1` 个能力声明；
- 资源闭包与借鉴声明完整。

新目录合同同时检查：

- `catalog.json` 与门户内嵌目录都存在唯一 `garden-resource-duel`；
- `level=A`、`installed=true`、`networkRequired=false`；
- HTML 使用经典脚本和相对路径；
- 运行文件没有远程 URL、网络/存储/媒体/传感器 API、共享目录依赖或计时器；
- README 保留直开与热座隐私说明；
- ATTRIBUTION 保留两个固定 commit 和零代码、零素材复制边界。

接入时完整测试曾因真实目录计数仍固定在 `56 / 48 / 8` 而失败。已把精确 Gate
同步为 `57 / 49 / 8`，并记录在
[`bugs/2026-07-24-catalog-count-gate-after-new-experience.md`](../bugs/2026-07-24-catalog-count-gate-after-new-experience.md)。

## 4. Chrome 真实交互

在 Chrome 扩展会话中从
`http://127.0.0.1:4173/experiences/versus/garden-resource-duel/index.html`
完成真实操作。

### 4.1 全流程

- 从准备页开始新局；
- 查看公开季节，进入第一位交接与秘密选择；
- 用数字键 `2` 选择雨露并确认；
- 第二位接管后按 `Escape`，立即回到中性交接页；
- 第二位重新接管、选择虫害并确认；
- 待揭晓页主动点击“我们一起揭晓”；
- 连续推进后续回合，实际在第 4 / 6 轮以 `5 : 5` 同时开花并进入平局终局；
- 终局显示可复现 seed `646586259`。

这条路径验证了开始、交接、秘密选择、封存、共同揭晓、历史、轮次推进和提前终局，
没有只停留在首屏或第一轮。

### 4.2 秘密 DOM

第一位确认后：

```text
card-choice = 0
revealed-card = 0
[aria-pressed=true] = 0
```

第二位按 `Escape` 后三项仍为 0。两份选择都确认、尚未揭晓时：

```text
card-choice = 0
revealed-card = 0
[aria-pressed=true] = 0
card-back = 2
```

两张牌背的可访问名称只是“第 1 / 2 张已封存的牌”，不含牌种。共同揭晓后才创建
两张 `revealed-card`。页面恢复可见或重新接管不会自动揭晓。

### 4.3 响应式与日志

分别设置 `320×568`、`768×1024`、`1440×900`，三档均满足：

```text
documentElement.scrollWidth === documentElement.clientWidth
body.scrollWidth === documentElement.clientWidth
```

即三档横向溢出均为 0。临时 viewport 在验收后已 reset。最终 Chrome
warning/error 日志为 `[]`。

CSS 另有 `prefers-reduced-motion: reduce` 与 `forced-colors: active` 明确分支；
规则、分数和按钮不以动画或颜色作为唯一信息。

### 4.4 A 级 file 合同与工具限制

HTML 仅按顺序加载 `./styles.css`、`./config.js`、`./logic.js`、`./app.js`，没有
module、base、远程 URL 或仓库外资源。仓库 A 级静态合同已经递归验证入口和资源
闭包，因此结构上支持双击 `index.html`。

本次 Chrome 自动化工具的 URL 安全策略明确拒绝访问 `file://`，并要求不得通过
其他浏览器表面、CDP 或间接方式绕过。因此没有把 `file://` 真实导航写成已执行；
localhost 使用同一组静态文件完成了全流程。该限制属于验收工具策略，不是页面运行
错误；人工交付时仍建议实际双击一次作为环境侧补充确认。

## 5. 视觉 fidelity

| 冻结设计项 | 实现与证据 | 结果 |
| --- | --- | --- |
| 夜晚双盆花园 | CSS 原生星空、玻璃板、两盆花与花瓣进度，无图片依赖 | 通过 |
| 七阶段结构 | intro、season、handoff、choosing、ready、round-result、finished 分段重建 | 通过 |
| 卡牌不只靠颜色 | 阳光、雨露、虫害均有符号、名称、剩余数和规则句 | 通过 |
| 私密阶段删除节点 | `replaceChildren()` 重建；Chrome 数量断言见 4.2 | 通过 |
| 键盘与焦点 | 原生按钮、`1/2/3`、`Escape`、阶段标题/主动作焦点 | 通过 |
| 响应式 | 320、768、1440 三档零横溢 | 通过 |
| 降动效/强制颜色 | CSS 明确媒体分支；无计时器或自动推进 | 通过 |

没有引入 ImageGen 资产，因此不存在生成素材与代码原生布局之间的资产偏差。

## 6. 来源与借鉴声明

只研究两个 MIT 项目的抽象机制：

- [amsanghi/gops 固定 commit](https://github.com/amsanghi/gops/tree/aeccb2a889eade57dec7a8ba542e1bd4307a526e)：Hot Seat、秘密选牌和已用手牌；
- [boardgame.io 固定 commit](https://github.com/boardgameio/boardgame.io/tree/65ca73beb62ef2afd980bb9f569b10dabfc60075)：纯状态迁移、阶段顺序和公开投影。

完整许可证、权利主体、LICENSE SHA-256、平台规范和未复制范围见
[`ATTRIBUTION.md`](../experiences/versus/garden-resource-duel/ATTRIBUTION.md)。本作没有
复制、改写、翻译、移植、打包或依赖上述项目的代码、测试、规则原句、页面或素材。

## 7. Bug 与学习沉淀

已记录并修复：

- [`garden-resource-duel-hostile-contracts`](../bugs/2026-07-24-garden-resource-duel-hostile-contracts.md)：
  action Proxy TOCTOU、state 二次读取、最大 revision 与 CommonJS 边界；
- [`catalog-count-gate-after-new-experience`](../bugs/2026-07-24-catalog-count-gate-after-new-experience.md)：
  新增 A 级作品后目录总量 Gate 未同步。

可跨作品复用的结论：

- [`sealed-joint-settlement-ledgers`](../learn/2026-07-24-sealed-joint-settlement-ledgers.md)：
  公开库存延迟、私密占用、联合原子结算与多重集合策略穷举；
- [`single-observation-snapshot-boundary`](../learn/2026-07-23-single-observation-snapshot-boundary.md)：
  hostile 输入的 descriptor 单次快照边界。

## 8. 独立提交

```text
dfa9d2d docs: research garden resource duel
9cb149e docs: brainstorm garden resource duel
26eaa06 docs: specify garden resource duel
1e6132c docs: design garden resource duel
bbac811 docs: plan garden resource duel
746a43d feat: add garden resource duel logic
233c45f feat: add garden resource duel interface
fb14693 feat: catalog garden resource duel
dfe116f docs: record sealed settlement learnings
```

研究、决策、规则、UI、目录与学习沉淀均可独立回退；本验收记录另作最后一个文档
提交。

## 9. 剩余边界

- 普通热座只防正常交接时的视觉泄露，不抵御主动检查开发者工具或 JavaScript 内存；
- 刷新/关闭会清空对局，不提供存档、统计、导出或联网；
- Chrome 自动化没有权限导航 `file://`，实际双击属于人工环境补充项；
- 当前未发现未解决的项目代码缺陷。
