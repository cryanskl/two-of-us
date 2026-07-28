# Photo Slider Race 非视觉核心再验收

## 1. 结论

- 核心 Gate：**通过（修复后）**。
- 产品 Gate：**Conditional / 尚未可玩**。
- 基线：`f186744591d3c1e917a2b8b4cc3a1a5c316b7fbb`。
- 分支：`codex/exp-photo-slider-race-core-audit`。
- worktree：`{worktree-base}/photo-slider-race-core-audit`。
- 验收日期：2026-07-25。

本轮发现并修复两个真实缺口：

1. 候选本地图片失败会错误改变 active 来源并锁死“开始比赛”；
2. 敌对对象或 revoked Proxy 作为 `action.type` 时会触发隐式属性键转换并抛异常。

修复后，确定性拼图、公平双板、计时结算、暂停、来源元数据、公开视图和敌对输入
合同均通过定向与全仓测试。

本项目生产目录仍只有 `config.js`、`logic.js`、`logic.test.js`、
`ATTRIBUTION.md` 和无依赖 `package.json`，没有 `index.html`、`style.css` 或
`app.js`。因此本轮不声称页面可打开、不声称图片解码或 Object URL 生命周期已实现，
也没有执行浏览器、响应式或人工 `file://` 验收。

## 2. 范围与边界

### 2.1 本轮读取

完整复核：

- `docs/287-photo-slider-race-research.md`
- `docs/288-photo-slider-race-brainstorm.md`
- `docs/289-photo-slider-race-spec.md`
- `docs/290-photo-slider-race-plan.md`
- `docs/295-photo-slider-race-design-proposal.md`
- `experiences/versus/photo-slider-race/config.js`
- `experiences/versus/photo-slider-race/logic.js`
- `experiences/versus/photo-slider-race/logic.test.js`
- `experiences/versus/photo-slider-race/ATTRIBUTION.md`
- `bugs/photo-slider-race-double-revision.md`

### 2.2 本轮允许修改

- `experiences/versus/photo-slider-race/logic.js`
- `experiences/versus/photo-slider-race/logic.test.js`
- 本项目真实缺陷对应的 `bugs/`
- 可复用结论对应的 `learn/`
- 本验证文档

### 2.3 明确未修改

- Board、catalog、根 README；
- shared runtime、根依赖、launcher；
- 生产 `index.html`、`style.css`、`app.js`；
- docs 概念图；
- 其他体验的生产文件。

## 3. 拼图与竞速确定性

### 3.1 固定规则

当前核心冻结：

- 3×3、9 个位置、`0` 为空格；
- 完成态为 `[1,2,3,4,5,6,7,8,0]`；
- 只允许空格与四邻域中的一个方块交换；
- 洗牌执行 96 次合法空格移动；
- 禁止立即走回上一步；
- 曼哈顿距离至少 12；
- 最多从派生 seed 重试 32 次；
- 并列窗口为闭区间 `<= 100 ms`。

### 3.2 确定性与可解性证据

- 随机源只接收显式 uint32 seed，不调用 `Math.random()`；
- 洗牌从完成态沿合法移动生成，因此结果天然可解；
- 同 seed 得到深度相同的 tiles 和 trace；
- 1000 个固定 seed 全部满足合法、可解、非完成态、距离门槛；
- 左右棋盘内容相同，但 board、tiles 与 initialTiles 引用互相隔离；
- MOVE 只更新目标席位；
- 第一方完成后只锁该方，另一方在 100 ms 窗口内仍可移动；
- `100 ms` 判并列，`100.001 ms` 判第一方获胜；
- settlement 暂停会冻结剩余窗口，恢复后按剩余毫秒重建 deadline。

### 3.3 状态权威性

- state、board、tiles、结果和公共视图递归冻结；
- action 必须拥有精确字段、普通对象原型、数据描述符和当前 revision；
- stale、多字段、访问器、错误阶段和重复键输入均保持同一 state 引用；
- 每个有效 action 只推进一次 revision；
- 达到 `Number.MAX_SAFE_INTEGER` 后不产生部分状态。

## 4. 本地图片隐私与两阶段来源状态

### 4.1 非视觉核心实际持有的数据

核心只接受并公开：

```text
kind / status / generation / errorCode
```

它不接受或保留：

- File、Blob、ImageBitmap；
- 文件名、本地路径、URL、MIME；
- width、height；
- EXIF、GPS；
- 图片像素或编码内容。

生产核心静态检查也证明没有 DOM、Canvas、文件 API、网络、存储、随机、时钟或计时器
调用。真实文件选择、解码、裁切、编码、Object URL 创建与释放属于未来 UI 层，本轮
不能替代其浏览器验证。

### 4.2 敌对 File-like 输入

新增回归覆盖：

- 自定义 prototype 的 File-like 对象被拒绝；
- 四个字段都是抛错 getter 时，一个 getter 也不会被读取；
- revoked Proxy 作为来源元数据时返回 `null`；
- 多字段元数据和 `filename` 字段被拒绝；
- 序列化公共视图不含 `filename`、`blob:`、`activeUrl`、EXIF 或 GPS。

### 4.3 两阶段替换修复

修复后的来源规则为：

1. 进入 `loading` 时 generation 加一，但 active `kind` 保持不变；
2. 同 generation 的 `ready` 提交才允许切换 active `kind`；
3. `error` 必须保持 active `kind`；
4. `loading` 时禁止开始；
5. 候选失败但旧图片仍有效时，`error` 状态仍允许开始。

这样成功候选原子切换，失败候选不会污染 active 身份或破坏默认图可玩性。

缺陷记录：

- `bugs/photo-slider-race-source-failure-lockout.md`
- `learn/two-phase-source-state-keeps-active-identity.md`

## 5. 敌对 Proxy 与输入封闭性

现有快照器使用：

- 普通对象 / 原生数组原型检查；
- 精确 ownKeys；
- data descriptor 快照；
- getter、symbol、多字段、稀疏数组和自定义 prototype 拒绝；
- 反射调用的 try 边界。

本轮补上 action 类型查表前的 primitive 类型门禁。`type` 不是字符串时立即拒绝，
不会对对象执行 `ToPropertyKey`。

新增测试证明：

- 抛错的 `Symbol.toPrimitive` 没有被调用；
- revoked Proxy 作为 `action.type` 不抛；
- 两种输入都保持原 state 和 revision。

另以一次性探针覆盖 22 组公开 API / 参数位置的 revoked Proxy，结果为
`22/22` fail closed、零抛异常。

缺陷记录：

- `bugs/photo-slider-race-hostile-action-type.md`
- `learn/property-key-coercion-needs-type-guards.md`

## 6. Public view 导出

`getPublicView()` 只接收 WeakSet 标记的内部 state，JSON 克隆或伪造 state 返回
`null`。输出：

- 递归冻结；
- initialTiles 与左右 board tiles 均断开引用；
- 来源仅含四项非识别性元数据；
- controls 从 phase 和锁定状态派生；
- 未完成方结果用时为 `null`；
- 不含 File、Blob URL、文件名、路径、EXIF、GPS 或候选对象。

公开的 seed、初始排列、棋盘、计时和结算信息都是同屏竞速 UI 所需的共享比赛数据，
不包含本地图片内容或私密文件信息。

## 7. 来源、借鉴、许可证与资产

### 7.1 借鉴事实

`ATTRIBUTION.md` 明确记录本项目为独立实现：

- 未选择任何开源滑块项目作为参考仓库；
- 未复制、翻译、移植或改写第三方代码、测试、规则文本或视觉；
- 未引入第三方运行时依赖；
- 经典滑块拼图只作为公共玩法类型；
- 若未来事实变化，必须列出固定 commit、许可证、版权主体、范围和分发义务。

因此当前没有应固定的第三方仓库 commit，也没有需随仓分发的第三方 LICENSE 或
NOTICE。不能为了形式完整虚构一个开源参考。

### 7.2 官方来源复核

2026-07-25 在线复核以下声明使用的官方页面均可访问：

- WHATWG HTML：ImageBitmap；
- W3C File API；
- W3C High Resolution Time Level 3；
- WHATWG HTML：Page Visibility；
- WCAG 2.2；
- U.S. Copyright Office：Games；
- U.S. Copyright Office Circular 42：Photographs。

这些链接只说明浏览器能力、可访问性和图片权利边界，不是核心代码来源；本仓未复制
其规范文本、IDL、示例或站点视觉。

### 7.3 概念资产

两张 Image Gen 概念图只在：

```text
docs/assets/photo-slider-race/
```

核验值：

| 文件 | 尺寸 | SHA-256 |
| --- | --- | --- |
| `desktop-active-race-concept.png` | 1536×1024 | `16e28a71764f147d6af8ce6d9618dd38847a1d2bc873445b8c0d57d27b3a9cd3` |
| `mobile-active-race-concept.png` | 852×1846 | `fcf8d56f5e90b8522ccb405846b647f9a4b1dd445a840a04452bd58dd9290ca1` |

生产目录没有 PNG、JPEG、WebP 或其他运行时图片，也没有引用上述 docs 路径。概念图
不能被切片、临摹或作为后续默认图；默认图仍须由生产 Canvas 代码独立生成。

## 8. 机制去重

| 相邻项目 | 相邻点 | `photo-slider-race` 的冻结差异 |
| --- | --- | --- |
| `photo-swap-puzzle` | 本地照片、3×3 图片 | 单板任意两块交换、单人惊喜；本项目是双板同局、严格空格四邻域竞速 |
| `orbit-star-race` | 同屏双人、确定性竞速 | 连续轨道换道与抢星计分；本项目是离散可解拼图和完成时间 |
| `dual-maze-race` | 双席、方向输入、竞速 | 固定迷宫路径与 tick 状态；本项目是同一排列的独立滑块棋盘 |
| `memory-merge-board` | 空间滑动、确定性状态 | 单个共享 4×3 合作合并板、无计时；本项目是两块 3×3 独立竞速板 |

本轮未发现机制退化为已有项目换皮，也未发现跨项目代码或资产复制。

## 9. 验证结果

安装：

```text
npm ci
added 55 packages
audited 56 packages
0 vulnerabilities
```

定向：

```text
node --check config.js / logic.js / logic.test.js
node --test experiences/versus/photo-slider-race/logic.test.js
33 / 33 passed
```

全仓：

```text
npm test
2276 / 2276 passed

npm run verify
58 entries: 50 A-level direct-open, 8 non-A launchers
1 capability declaration
passed
```

最终还需执行：

```text
git diff --check f186744591d3c1e917a2b8b4cc3a1a5c316b7fbb..HEAD
git status --short
```

这两项在验证文档提交后复跑，结果写入交付包。

## 10. 提交序列

1. `7f65ab7 fix: harden photo slider source state`
2. `10456a5 docs: record photo slider core hardening`
3. 本验证文档所在提交

## 11. Gate 判定

### 核心 PASS

- 确定性、可解性与左右公平通过；
- 100 ms 结算与暂停恢复通过；
- 来源元数据最小化且失败不破坏 active 图片；
- File-like、getter、Proxy、revoked Proxy 均 fail closed；
- public view 冻结、断引用且不暴露图片隐私；
- 独立实现与零复制声明符合当前事实；
- 与近邻项目机制差异明确；
- 定向、全仓和仓库 verify 通过。

### 产品仍为 Conditional

仍缺少并且本轮禁止生产：

- 生产 HTML / CSS / app；
- 原创 Canvas 默认图；
- 真实文件 MIME、尺寸、像素、方向解码；
- 两阶段 Object URL 切换与 revoke；
- 浏览器交互、320/390 响应式和无障碍；
- 人工断网 `file://` 双击验收；
- 已批准视觉方向后的 concept-to-code fidelity Gate。

在这些项目完成前，不能把 `photo-slider-race` 注册为已安装或宣称“本地点开即玩”。
