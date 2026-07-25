# “这一圈，和你同时到”非视觉核心复验

- 日期：2026-07-25
- 项目 ID：`twin-orbit`
- 对外公开标题：`这一圈，和你同时到`
- 分类：`co-op`
- 等级目标：A
- worktree：`/Users/zenith/Desktop/two-of-us-worktrees/twin-orbit-core-audit`
- 分支：`codex/exp-twin-orbit-core-audit`
- 基线：`e539ca3991b20afa2139c495e5969ad6bbe41218`
- 核心结论：**Core Go**
- 完整项目结论：**Conditional Go**

## 1. 复验结论

本轮从指定基线重新通读 research、spec、来源/依赖审计、验收计划、既有核心
验收、视觉提案、配置、固定 fixture、领域逻辑、独立 solver、专项测试与历史
bug，共发现并修复五个真实缺口：

1. 外部 state 可以没有第五关穿门证据却直接伪造 `complete`；
2. intro / complete public view 仍携带当前 gate 的目标角与目标 lane；
3. Pointer Events 滚动 URL 已指向 Level 4 Working Draft，却被标成 Level 3
   Recommendation；
4. `gate-retry` 的 retry reason 没有绑定到当前双席穿越快照；
5. 外部 state 的玩家角度只检查 `0..719`，没有验证在当前 tick 是否可达。

修复后，非视觉核心满足：

- 两位玩家各自只控制自己的一颗星，职责同构、状态同 tick 快照；
- 五关均有开放窗口内解，任一席恒定 inner/outer 时五关均无解；
- 左右席五关 fixture 各使用 150 个 inner tick，镜像负担相等；
- 同一 action log 在单 tick 与 1–5 tick 批处理下确定一致；
- complete、retry、玩家角度与 crossing 投影重新绑定到可达整数状态；
- intro 不提前公开第 1 关目标，complete 不继续携带第五关目标字段；
- 配置、state、action、public view 的 hostile-object 和引用隔离边界仍成立；
- 外部开源直接借鉴、第三方代码、第三方资产和项目级依赖新增均为 0。

完整项目仍是 Conditional Go：`docs/310-twin-orbit-design-proposal.md` 明确等待
用户确认，当前没有生产 HTML、CSS、app 或 README，也没有键盘、双 Pointer、
浏览器、真实 `file://`、catalog 或 launcher 证据。

## 2. 审阅范围与历史

### 2.1 文档

- `docs/305-twin-orbit-research.md`
- `docs/306-twin-orbit-spec.md`
- `docs/307-twin-orbit-attribution-dependency-audit.md`
- `docs/308-twin-orbit-acceptance-plan.md`
- `docs/309-twin-orbit-core-verification.md`
- `docs/310-twin-orbit-design-proposal.md`

### 2.2 当前核心目录

```text
experiences/co-op/twin-orbit/
├── ATTRIBUTION.md
├── config.js
├── fixtures.js
├── logic.js
├── logic.test.js
├── package.json
├── solver.test.js
└── static-contract.test.js
```

目录没有 `index.html`、`styles.css`、`app.js`、README、运行时图片、字体、音频、
vendor 或依赖包。项目 `package.json` 只声明 CommonJS 类型。

主要历史边界：

| Commit | 内容 |
| --- | --- |
| `7393e6c` | 五关 fixture、领域核心、独立 solver 与静态合同 |
| `a437050` | TICK revision 溢出边界 |
| `f1db7b0` | hostile content 单次 descriptor snapshot |
| `b730d76` | SUSPEND no-op 与极值边界 |
| `fe8ac90` | 第一轮非视觉核心验收 |
| `9b4ad63` | docs-only 概念图与等待确认的视觉提案 |
| `0391be3` | 拒绝无穿门证据的伪造 complete |
| `27fd447` | intro / complete 目标字段阶段门控 |
| `1b91d0f` | 固定标准层级、版权、许可证与零复制边界 |
| `6a3c668` | retry reason 与 crossing snapshot 精确绑定 |
| `3c40672` | 拒绝当前 tick 不可达的玩家角度 |

本轮没有修改共享目录、根依赖、锁文件、launcher、catalog、Board、门户、分类
README 或其他体验，也没有创建生产 UI。

## 3. 双人职责与公平

两席职责为严格同构：

| 左席 | 右席 |
| --- | --- |
| 只控制 left star | 只控制 right star |
| held=false：outer，每 tick +2 | held=false：outer，每 tick +2 |
| held=true：inner，每 tick +3 | held=true：inner，每 tick +3 |
| 未来 UI 快捷键 F | 未来 UI 快捷键 J |
| 自己的目标角与目标 lane | 自己的目标角与目标 lane |

成功必须在同一个权威 tick 同时满足两席目标。reducer 先快照左右 held，再统一
派生 lane、速度、next angle 和 crossing event，最后一次性裁决；玩家对象键的
存储顺序不会改变结果。

独立 solver 证明：

- 五关各自窗口的五个 tick 均存在解；
- 五条黄金 fixture 精确在窗口中心 tick 命中；
- 任一席固定 outer 或 inner 时，每一关都无解；
- 任一席缺席并保持 released/outer 时，另一席无法补偿；
- 第 1/2、4/5 关路径镜像，第 3 关 inner 负担相同；
- 左右五关 inner tick 总量均为 150；
- 每关每席都实际使用 inner 与 outer；
- 第五关右席正确跨越 719→0 并抵达 32。

核心不保存个人失败次数、输入次数、贡献、准确率、分数、赢家或责任归因。
这是两颗独立角色的实时合作，不是一席操作共享刚体，也不是两个人只在亮窗各按
一次。

## 4. 状态机、确定性与失败裁决

主路径：

```text
intro
  → START
gate-intro
  → BEGIN_GATE
playing
  → gate-success → NEXT_GATE → 下一关 / complete
  → gate-retry   → RETRY_GATE → 当前关 gate-intro
  → SUSPEND      → 当前关 gate-intro
complete
  → RESTART
intro
```

权威规则只使用 safe integer：

```text
TURN_STEPS = 720
OUTER_SPEED = 2
INNER_SPEED = 3
OPEN_RADIUS = 2
MAX_TICK_BATCH = 5
```

穿越为环形半开区间 `(previous, next]`。同 tick 裁决优先级保持：

```text
success > wrong-lane > not-together > too-early > window-closed
```

本轮把外部 state 的语义验证进一步收紧：

- `gate-success` 与 `complete` 必须保留同 tick、窗口内、正确 lane 的双穿门
  投影；
- 从当前 lane 推导 `+2/+3`，反推 previous angle 后重新验证 crossing；
- `gate-retry` 的四种 reason 分别绑定到互斥的窗口/crossing 谓词；
- `window-closed` 只能发生在窗口末 tick 且两席都未穿门；
- 第 `t` tick 从起点累计前进距离必须处于 `[2t, 3t]`；
- 五关最大验证距离小于一整圈，所以 forward distance 没有整圈歧义。

单 tick 与 1–5 tick 批处理、JSON state replay、完整五关和 restart 均保持确定
一致。核心不读取 RAF、真实时间、随机、DOM、Canvas、网络、存储或权限。

## 5. Public view 与信息门控

公开阶段合同：

| 阶段 | 目标字段 | 内部信息 |
| --- | --- | --- |
| intro | `targetAngle=null`、`targetLane=null` | 不公开第 1 关目标、fixture、epoch |
| gate-intro | 只公开当前关两席目标 | 不公开未来关与解法 |
| playing | 当前关选择、目标、tick、窗口 | 不公开 fixture、个人控制 tick |
| gate-success | 当前关成功快照 | 不公开未来关 |
| gate-retry | 当前关公开中性文案 | 不公开内部 retry 枚举或责任方 |
| complete | 目标字段重新为 null | 不公开 fixture、输入日志或个人统计 |

DTO 键在全部阶段保持稳定，intro / complete 以 null 表达“当前没有门位目标”，
关系文本只表达等待开始或共同完成。public view 每次新建、递归冻结并与 state
断开引用。

配置只允许七个纯文本字段，整份原子回退；NFC、空白折叠、控制字符、双向控制、
孤立 surrogate、URL/markup、长度和 accessor 均有 Gate。默认配置不含真实姓名
或私人消息，未来 README 仍必须说明 `config.js` 是本地明文而非加密。

## 6. 本轮缺陷

| 记录 | 红灯 | 修复 |
| --- | --- | --- |
| `2026-07-25-twin-orbit-forged-complete-state.md` | 23 项 logic 中 1 失败 | complete 复用双穿门确认谓词 |
| `2026-07-25-twin-orbit-intro-target-leak.md` | logic / solver 各 1 失败 | 非 gate 阶段目标字段归 null |
| `2026-07-25-twin-orbit-pointer-events-source-drift.md` | 一手页面状态不匹配 | 固定 Pointer Events Level 3 |
| `2026-07-25-twin-orbit-forged-retry-state.md` | 24 项 logic 中 1 失败 | 四种 reason 精确绑定穿越快照 |
| `2026-07-25-twin-orbit-unreachable-player-angle.md` | 25 项 logic 中 1 失败 | 验证 `[2t,3t]` 可达距离 |

既有七条 twin-orbit bug 记录继续保留并已修复。本轮没有新增 `learn/`：

- hostile 输入单次 descriptor snapshot 已有
  `learn/2026-07-23-single-observation-snapshot-boundary.md`；
- 可达性 oracle 与合作必要性 oracle 分离已有仓库沉淀；
- 本轮新增内容主要是本项目 state phase invariant，不另造重复主题。

## 7. 来源、名称、许可证与零复制

### 7.1 实际借鉴

唯一直接机制参考是仓库内部 `orbit-star-race` 的高层抽象：

> 离散半径状态可以选择不同角速度。

本作没有复制或修改其代码、常量、三轨、反向移动、随机星流、比分/加赛、测试、
UI、文案或资产。`twin-orbit` 自行定义同向双星、两档 held/released、
`+2/+3` 整数速度、固定五关、双门同 tick 合作和无比分终局。

外部开源项目直接借鉴为 0。当前没有第三方代码、算法、测试、素材、字体、音频、
图标或运行/开发依赖，因此不存在需要随项目分发的外部开源许可证正文或 NOTICE。

### 7.2 标准来源

固定一手来源：

| 来源 | 状态 | 用途 |
| --- | --- | --- |
| UI Events KeyboardEvent code Values | W3C Recommendation，2025-04-22 | KeyF / KeyJ 物理键位 |
| Pointer Events Level 3 | W3C Recommendation，2026-06-30 | pointerId、capture、cancel、lostcapture |
| WHATWG HTML Page visibility / Animation frames | Living Standard | 暂停与未来 RAF 分层 |
| WCAG 2.2 | W3C Recommendation，2024-12-12 | 键盘、状态、目标尺寸、降动效 |

Pointer Events 通用 URL 当前已是 Level 4 Working Draft（2026-07-01），因此正式
依据固定为 `https://www.w3.org/TR/pointerevents3/`。

W3C 页面保留 World Wide Web Consortium 原始版权及各页链接的 Software and
Document License 或 Document License；WHATWG Living Standards 保留 WHATWG
及其 Steering Group 成员版权并按 IPR Policy 的 CC BY 4.0 条款发布。

本项目只保留链接、状态和用途，没有复制或改写规范正文、Web IDL、示例、表格、
图表、测试或站点视觉，也不再分发标准正文。

### 7.3 名称边界

2026-07-25 复核：

- Apple iTunes Lookup API 仍返回一个当前 `Twin Orbit` 条目：
  `trackId=6779551879`、版本 2.1；
- Playgama 同名 URL 仍 301 到 `/category/space`，原因为 `game_hidden`。

因此英文 `twin-orbit` 只作内部 ID，对外只使用“这一圈，和你同时到”。
Playgama 只保留为历史检索记录，不作为当前在架或权利状态证据。本审计不是商标
法律意见；公开发行或商业化前仍需按目标司法辖区重新检索。

## 8. 机制去重

对当前 catalog 和相邻作品 README 复核：

| 项目 | 已占据机制 | 本作差异 |
| --- | --- | --- |
| `orbit-star-race` | 反向、三轨、随机目标、捕获得分、对抗 | 同向、两档、固定双门、同 tick 合作、无分数 |
| `four-hands-harmony` | 200ms 内直接共同按键并保持 | 输入塑造整段累计相位，不判两次按键间隔 |
| `together-zipper` | 亮窗内每席各提交一次离散拉动 | 持续按住/松开选择速度，不记录单次提交 |
| `same-pace-star` | 轮流领拍的四步按住/松开交接 | 两席同时同构控制，没有轮次角色 |
| `steady-together` | 托住共享天平、滚珠/梁角安全自动推进 | 两颗独立角色，无共享刚体、平衡阈值 |
| `moving-home-together` | 双端方向合成共享家具运动 | 两席不合成一个物体，无地图碰撞 |
| `tethered-heart` | 受丝带约束的双角色拖共享载荷 | 双星无距离约束、碰撞或共享载荷 |

研究中的 `capsule-docking` 当前不在 catalog；其“姿态席 + 推进席控制同一刚体”
也与本作两席同构、各控一星不同。

本作必须继续保持“提前塑造累计相位 → 公开共同窗口 → 不同门位同 tick 双事件”
身份。未来 UI 若退化为“门亮后一起按”、三轨抢星、个人比分或共享刚体，应回到
研究，不用轨道题材包装重复机制。

## 9. 概念资产

两张图片均为 docs-only 视觉提案：

| 文件 | 原生尺寸 | SHA-256 |
| --- | --- | --- |
| `twin-orbit-desktop-playing-concept.png` | 1536×1024 | `7f3da887cffc664ab5c332510e0b460dac4cf65a341460dd786e225752507df9` |
| `twin-orbit-mobile-playing-concept.png` | 853×1844 | `72954afaedebba84a83426eb7ea942214c47d06c58dd71989cdf8b7bce924fcf` |

哈希与 `docs/310` 台账一致。桌面图无外部输入；移动图只参考本次内部生成的桌面
图。生产目录没有 PNG，未来标题、双环、720 步映射、玩家、门位、控件和状态都
必须代码原生重建，不能裁切、描摹或把概念像素当规则真值。

## 10. 自动验证

环境准备：

```text
npm ci
55 packages installed
0 vulnerabilities
package.json / package-lock.json 未修改
```

定向验证：

```text
node --check config.js / logic.js / fixtures.js
node --check logic.test.js / solver.test.js / static-contract.test.js
node --test logic.test.js solver.test.js static-contract.test.js

39 tests
39 passed
0 failed
```

全仓验证：

```text
npm test

2276 tests
2276 passed
0 failed
```

```text
npm run verify

仓库验收通过：58 个作品入口（50 个 A 级直开、8 个非 A 启动器）、
1 个能力声明、资源与借鉴声明完整。
```

`experiences/catalog.json` 的 58 个入口不包含 `twin-orbit`。全仓 verify 只证明
本轮没有破坏已安装作品，不能证明本项目已经安装或可以点开。

`git diff --check` 通过。相对指定基线的范围只包括 twin-orbit 核心/测试/
ATTRIBUTION、research/spec/来源审计、本轮 bug 记录与本复验文档。

## 11. 未完成 Gate

在用户明确确认 `docs/310-twin-orbit-design-proposal.md` 前，不得创建生产 UI。
当前明确未完成：

- `index.html`、`styles.css`、`app.js`、README 和运行时资产；
- 30Hz RAF accumulator、generation 与长帧 SUSPEND 接线；
- F/J pressed set、真实同时保持和旧 epoch keyup；
- 双 Pointer、capture/cancel/lostcapture、document 兜底释放；
- blur、hidden、pagehide、Escape 与 BFCache 页面生命周期；
- reduced-motion、forced-colors、无 JavaScript、SVG/CSS 失败降级；
- 1504×1046、768×1024、390×844、320px、200% 文本和 400% 缩放；
- Chrome、真实 `file://`、console 0、network 0；
- catalog、launcher、门户、co-op 索引和 Board 接入。

结论：**非视觉核心达到 Core Go；完整作品尚未安装，也不能宣称本地点开即玩。**
