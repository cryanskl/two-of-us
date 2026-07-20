# A 级“月面，保持有光”可执行规格

## 1. 定位与发布边界

- 创意池：C08“月球基地配电”；
- 产品名：`月面，保持有光`；
- ID：`moon-base-power`；
- 主分类：双人合作；
- 启动等级：A；
- 设备：同一台电脑、平板或手机；
- 输入：键盘、鼠标、触屏；
- 公网、账号、服务、持久化：无；
- 首版核心：一人控制太阳/电池馈线和联络方向，一人控制氧气/照明/通信接哪条母线；三次班次各稳定 90 个固定 tick。

作品是原创抽象合作谜题，不模拟真实电压、电流、频率、功率因数、保护动作、储能曲线或生命保障系统，不构成电气工程、月面工程或安全操作指导。

首版不加入随机故障、倒计时失败、抢修资源、分数、生命值、音频、振动、排行榜、编辑器、网络房间、AI、真实 NASA 任务或第三方运行依赖。

## 2. 30 秒体验闭环

```text
开始共同值班
→ 双方确认各自席位
→ 打开两个馈线并分配三项负载
→ 观察左右母线的供给、需求、余量/缺口
→ 达到安全组合后共同稳住 90 tick（3 秒）
→ 换到下一班次
→ 第三班完成后显示共同值班记录
```

第一、二班教没有联络线时的精确分流；第三班加入受损插口和容量 2 的联络线。错误配置没有惩罚，只把安全进度归零并显示可行动的原因。

## 3. 常量与术语

```text
BUS_L = "L"
BUS_R = "R"
OFF = "off"
TIE_LR = "L-to-R"
TIE_RL = "R-to-L"
TICK_RATE = 30
STABLE_TICKS_REQUIRED = 90
TRANSFER_CAPACITY = 2
MAX_CATCH_UP_TICKS = 5
SHIFT_COUNT = 3
```

- **供给**：某馈线开启后，班次为对应母线提供的整数单位；
- **需求**：接到某母线的负载需求整数和；
- **本地余量**：`max(0, supply - demand)`；
- **本地缺口**：`max(0, demand - supply)`；
- **转移**：联络方向正确时，从来源余量向目标缺口传送的整数单位；
- **最终缺口**：接受转移后仍未满足的需求；
- **安全 tick**：两个馈线开启、三个负载接通且插口可用、联络条件满足、两侧最终缺口都为 0；
- **稳定窗**：连续 90 个安全 tick，中间任何不安全 tick 都归零。

内部值使用 `L-to-R/R-to-L`，界面显示 `L→R/R→L`，避免箭头字符进入状态协议。

## 4. 冻结关卡

### 4.1 level schema

```js
{
  id: "daylight" | "shadow" | "earth-window",
  number: 1 | 2 | 3,
  title,
  note,
  supply: { L, R },
  demand: { oxygen, lights, comms },
  allowedBuses: {
    oxygen: ["L", "R"] | ["R"],
    lights: ["L", "R"] | ["L"],
    comms: ["L", "R"]
  },
  tieRequirement: "off" | "transfer",
  transferCapacity: 2
}
```

`levels.js` 导出深冻结数组；每关拒绝额外字段、非整数、负数、重复/无效 bus、空 allowedBuses、错误编号和非 2 的首版容量。运行时不允许 config 覆盖规则关卡。

### 4.2 三关数据

| 班次 | 供给 L/R | 需求 | 插口 | 联络条件 | 唯一安全向量 |
| --- | --- | --- | --- | --- | --- |
| 日照接班 | `3 / 5` | 氧 4、灯 1、通信 3 | 全部可用 | 维护中，必须 `off` | 两馈线开；通信 L；氧+灯 R；联络关 |
| 影区接班 | `5 / 3` | 氧 4、灯 1、通信 3 | 全部可用 | 维护中，必须 `off` | 两馈线开；氧+灯 L；通信 R；联络关 |
| 地月窗口 | `4 / 4` | 氧 5、灯 1、通信 2 | 氧仅 R；灯仅 L；通信两侧 | 必须发生正整数转移 | 两馈线开；氧 R；灯+通信 L；`L-to-R` 传 1 |

默认控制每关都从：

```js
{
  solarOn: false,
  batteryOn: false,
  tie: "off",
  oxygen: "off",
  lights: "off",
  comms: "off"
}
```

开始，避免上关答案泄漏或自动完成下一关。

## 5. `evaluateGrid(level, controls)`

### 5.1 输入

`controls` 必须恰好包含上述六个字段。布尔值只接受真实 boolean；tie 只接受 `off/L-to-R/R-to-L`；负载只接受 `off/L/R`。纯 evaluator 对不可用 bus 不抛错，而返回 `port-unavailable`，这样穷举可覆盖全部 324 个原始向量。

畸形 level 或 controls 返回同一个形状的深冻结 canonical failure：`isSafe=false`、`faults=["invalid-input"]`，全部 supply/demand/local/final 数值为 0，transfer 为 `off/null/null/0/2`，三个 load 均为 `bus="off"/demand=0/connected=false/allowed=false/safe=false`。它不抛异常、不猜测修复、不执行类型转换，也不泄漏畸形输入的部分值。

### 5.2 唯一计算顺序

1. 馈线关闭时对应实际供给为 0；
2. 三负载按当前 bus 汇总需求；`off` 不进入任何母线；
3. 基于实际供给计算两侧本地余量与缺口；
4. 根据班次联络条件与 controls.tie 进入 5.3 的四分支决策；
5. 仅在 `transfer + closed` 分支确定 `from/to`，计算：

```text
amount = min(transferCapacity, surplus[from], deficit[to])
```

6. 若 `amount > 0`，来源 `supplied = localSupply - amount`，目标 `supplied = localSupply + amount`；off 或拒绝转移时两侧 supplied 等于各自 localSupply；
7. 对每侧重新计算 `final.surplus=max(0,supplied-demand)` 与 `final.deficit=max(0,demand-supplied)`；
8. 按冻结顺序生成 fault codes；
9. `isSafe = faults.length === 0`。

联络线不进行第二次反向流动，不迭代、不把目标余量返还来源、不计算损耗。每次 evaluation 最多一次单向转移。

### 5.3 联络条件

| `tieRequirement` | controls.tie | amount / final | tie fault |
| --- | --- | --- | --- |
| `off` | `off` | amount 0；不转移；按本地供给生成 final | 无 |
| `off` | 任一闭合方向 | amount 0；**不得转移**；按本地供给生成 final | 只加 `tie-maintenance` |
| `transfer` | `off` | amount 0；不转移；按本地供给生成 final | 只加 `tie-required`，不加 `tie-idle` |
| `transfer` | 任一闭合方向 | 按方向计算 amount；amount 可为 0；再生成 final | amount 0 加 `tie-idle`；amount > 0 不加 tie fault |

闭合方向下 `amount > 0` 但不足以填平目标缺口时，由 final 产生 `deficit-L/R`。方向正确且填平缺口即可，不要求恰好用满容量 2。

“空载闭合/维护互锁”是本谜题公开规则，不宣称是真实电网操作原则。

### 5.4 fault 顺序

faults 去重并按以下顺序输出：

```text
invalid-input
solar-off
battery-off
oxygen-off
lights-off
comms-off
oxygen-port-unavailable
lights-port-unavailable
comms-port-unavailable
tie-maintenance
tie-required
tie-idle
deficit-L
deficit-R
```

同一个 evaluation 可以有多个 fault；UI 主提示使用第一项，详情逐项显示，但不得自行更改顺序。

### 5.5 evaluation schema

```js
{
  isSafe,
  faults: [],
  supply: { L, R, total },
  demand: { L, R, total },
  local: {
    L: { supply, demand, surplus, deficit },
    R: { supply, demand, surplus, deficit }
  },
  transfer: {
    direction: "off" | "L-to-R" | "R-to-L",
    from: null | "L" | "R",
    to: null | "L" | "R",
    amount,
    capacity: 2
  },
  final: {
    L: { supplied, demand, surplus, deficit },
    R: { supplied, demand, surplus, deficit }
  },
  loads: {
    oxygen: { bus, demand, connected, allowed, safe },
    lights: { ... },
    comms: { ... }
  }
}
```

`supplied` 严格按来源减 amount、目标加 amount 计算；任何分支都必须满足：

```text
final.L.supplied + final.R.supplied === supply.total
transfer.amount <= transfer.capacity
transfer.amount <= local[from].surplus（有 from 时）
transfer.amount <= local[to].deficit（有 to 时）
```

`loads.safe` 只表示该负载已接通、插口可用且其母线 `final.deficit === 0`；它不代表整张网通过维护/联络条件。全部对象递归冻结。

## 6. 穷举证明

`enumerateControlVectors()` 按固定顺序生成：

```text
solarOn: false, true
batteryOn: false, true
tie: off, L-to-R, R-to-L
oxygen: off, L, R
lights: off, L, R
comms: off, L, R
```

总数必须精确为：

```text
2 × 2 × 3 × 3 × 3 × 3 = 324
```

`enumerateSolutions(level)` 只能调用生产 `evaluateGrid`，不能维护第二套简化答案。三关各自必须恰好返回 1 个安全向量，且与 4.2 表格深相等。

额外性质：

- 所有安全向量两馈线都开启、三负载都非 off；
- 同一 controls 的 evaluation 与操作到达顺序无关；
- 镜像断言只比较 solution set：把第一关唯一解的三个负载 `L↔R`、tie `L-to-R↔R-to-L`、`off` 保持不变，并交换 solar/battery 角色后，得到第二关唯一解；不要求所有失败 evaluation 的 fault 名逐项镜像；
- 第三关传输量恰为 1，且不超过容量 2；
- 固定电源席默认态时，负载席无动作序列能通关；固定负载席默认态时，电源席同样不能通关。

## 7. 权威状态

```js
{
  phase: "intro" | "handoff" | "operating" | "paused" | "shift-result" | "complete",
  shiftIndex: 0 | 1 | 2,
  controls,
  stableTicks: 0..90,
  lastEvaluation,
  completedShifts: [{
    levelId,
    stableTicks: 90,
    controls,
    transferAmount
  }],
  pauseReason: null | "manual" | "hidden" | "blur" | "long-frame",
  resumePhase: null | "operating",
  revision: non-negative integer
}
```

所有状态、嵌套 controls/evaluation/summary 和数组递归冻结，不共享调用方对象。`lastEvaluation` 始终与当前 level + controls 同步；intro/handoff 也使用默认 controls 的失败 evaluation，不允许 null 分支散落 UI。

## 8. reducer API 与状态转移

- `createInitialState(config?)`：整份 sanitize 配置，创建 intro；
- `start(state)`：仅 intro → handoff；
- `ready(state)`：仅 handoff → operating；
- `toggleFeed(state, "solar" | "battery")`：仅 operating；切换后重新 evaluation，stableTicks 归零；
- `setTie(state, value)`：仅 operating；同值返回同一引用，否则更新、evaluation、归零；
- `setLoad(state, load, bus)`：仅 operating；同值返回同一引用；不可用 bus 在纯逻辑层仍可形成不安全状态；
- `tick(state)`：仅 operating；不安全时 stableTicks 归零；安全时加一；第 90 tick 原子进入 shift-result 或 complete；
- `nextShift(state)`：仅前两关 shift-result；shiftIndex + 1，重置 controls/stableTicks，进入 handoff；
- `pause(state, reason)`：仅 operating → paused；reason 只接受 `manual | hidden | blur | long-frame`，保留 controls、evaluation 和 stableTicks；
- `resume(state)`：仅 paused → operating；清 pause 字段并增加 revision；
- `restart(state)`：任意合法阶段回到与初始加载除 revision 外深相等的 intro；revision 必须为旧值 + 1，使旧 rAF/token 失效；
- `getPublicView(state, config?)`：返回渲染所需冻结投影；
- `resolveCompletionNote(policy, summary)`：隔离配置策略；
- `isPowerState(value)`：严格结构校验。

合法状态的非法阶段动作、同值动作、键盘 repeat 和未知枚举返回同一引用。畸形状态传入任一公开 reducer 时安全回到新初态；不抛异常、不保留畸形引用。

`isPowerState` 除字段类型外必须验证交叉不变量：

- `lastEvaluation` 与当前 level + controls 重新计算结果深相等；不可用插口是合法但不安全的 controls，不因此判畸形；
- intro/handoff/operating/paused 的 `completedShifts.length === shiftIndex`；shift-result 的长度为 `shiftIndex + 1` 且 shiftIndex 只能 0/1；complete 必须 `shiftIndex===2` 且正好 3 条 summary；
- completed summaries 依次对应 level 0..n-1，每条 controls 由生产 evaluator 判安全，stableTicks 固定 90，transferAmount 与 evaluation 一致；
- intro/handoff 的 controls 为本关默认态且 stableTicks=0；operating/paused 为 0..89；shift-result/complete 固定 90；
- paused 时 pauseReason 为四个许可值之一且 `resumePhase="operating"`；其他阶段二者都为 null；
- revision 是非负安全整数，shiftIndex/stableTicks/summary 数值也必须是安全整数；
- 对象只接受冻结 schema 的精确字段集合，拒绝额外字段、缺字段、函数、NaN、Infinity 和原型污染键。

`tick` 第 90 次：

1. 以当前 evaluation 判安全；
2. 创建冻结 shift summary；
3. 追加 completedShifts；
4. 若 shiftIndex < 2，phase = shift-result；否则 phase = complete；
5. stableTicks 固定为 90；
6. revision + 1，使旧动画循环失效。

## 9. 暂停、时间与 reduced motion

正常模式：

- rAF timestamp 只计算 elapsed；
- accumulator 每次消费 `1000 / 30` ms 并调用一次纯 `tick`；
- 若加入本帧 elapsed 后 accumulator `> 5 × (1000/30)ms`，本帧**不消费任何 tick**，立即派发 `pause(..., "long-frame")` 并把 accumulator 清零；
- 未超过阈值时才消费 0–5 个完整 tick，余数留到下一帧；
- ready/resume/revision 变化后启动的新循环首帧只保存 timestamp，elapsed 视为 0，不产生 tick；
- phase/revision 变化后旧回调立即退出。

`visibilitychange -> hidden` 与 `blur` 进入 paused。暂停冻结 stableTicks，不清空已经安全保持的进度，也不在后台增长；恢复必须点击“继续值班”，清 accumulator 后从相同 tick 继续。

`prefers-reduced-motion: reduce` 取消线路流光、仪表摆动、卡片位移和庆祝粒子，但 30Hz reducer 与 90 tick 完成条件不变。不能像抛射游戏一样“立即演算到终点”，因为共同稳住 3 秒正是核心动作。

## 10. 本地配置与准备者参与

`config.js`：

```js
{
  powerOperatorName,
  loadOperatorName,
  completionTitle,
  composeCompletionNote(summary)
}
```

三个字符串整份通过或整份回退，去首尾空白并限制长度。默认名称为“电源席”“负载席”，默认完成标题为“三次交接，月面没有熄灯”。

策略收到递归冻结、断开引用的：

```js
{
  powerOperatorName,
  loadOperatorName,
  completedShiftIds,
  totalStableTicks: 270,
  transferAmounts: [0, 0, 1],
  defaultNote
}
```

只接受去空白后 1–160 字符字符串；空白、超长、非字符串、抛错或篡改 summary 时回退 defaultNote。策略不能访问 state、关卡对象、DOM、控制历史或 evaluator。

默认函数本身可直接完成；README 邀请准备者只修改这 5–10 行，让最后一句更像两个人：

```js
composeCompletionNote(summary) {
  // TODO：根据三次交接写一段你们自己的值班结语。
  // 只返回文本，不改 summary；留空时使用安全默认文案。
  return summary.defaultNote;
}
```

## 11. 输入契约

### 11.1 原生控件

- 太阳/电池：`button[aria-pressed]`；
- 联络线：原生 radio group，`off/L→R/R→L`；
- 三负载：各自原生 radio group，`off/L/R`；
- 受损插口对应 radio disabled，并有可见“插口受损”文字；
- 开始、双方就位、下一班、继续值班、重新开始：原生 button；
- 所有指针目标最小 48×48px。

原生 click 是鼠标、触屏、Enter 和 Space 的等价入口，不额外用 pointerdown 提前触发，避免 `pointercancel` 时误切换。

### 11.2 双席键盘

仅 operating 且焦点不在表单文字输入时：

| 席位 | 键位 | 行为 |
| --- | --- | --- |
| 电源席 | `KeyA` | 切换太阳馈线 |
| 电源席 | `KeyS` | 切换电池馈线 |
| 电源席 | `KeyD` | 联络线按 `off → L-to-R → R-to-L → off` |
| 负载席 | `KeyJ` | 氧气按当前关可用顺序循环，始终含 off |
| 负载席 | `KeyK` | 照明循环 |
| 负载席 | `KeyL` | 通信循环 |

使用 `KeyboardEvent.code`；`event.repeat` 直接忽略；`ctrlKey/altKey/metaKey/shiftKey` 任一为 true 时完全忽略。只对无修饰键且实际处理的六个游戏键 `preventDefault()`，不吞 Tab、Escape、浏览器快捷键或屏幕阅读器组合键。

每项负载的键盘序列精确为 `["off", ...level.allowedBuses[load]]`，保持 level 数据顺序并跳过受损 bus；若当前 state 被测试/恢复为不在序列内的合法枚举值，下一次对应按键统一回到 `off`。纯 reducer 仍能测试不可用值。鼠标、触屏、键盘最终都调用同一六个 reducer，不维护 DOM 权威状态。

## 12. public view 与 DOM 阶段

public view 至少包含：

```text
phase / shift / progress / controls / evaluation
operator names / level note / interlock note
button enabled flags / available bus options
primary title / primary description / live message
completed shift summaries / completion note（仅 complete）
```

本作没有秘密，但仍按阶段创建 DOM：

- intro：说明、两席职责、开始；
- handoff：当前班次供需卡、受损插口/维护条件、双方就位；
- operating/paused：完整拓扑、仪表、两席控件、安全窗；paused 只额外创建暂停层；
- shift-result：本班摘要与下一班按钮；
- complete：三班摘要、个性化结语、重新开始。

渲染使用 `replaceChildren()` 和 `textContent`；不使用 `innerHTML` 拼接配置内容。完成结语只在 complete 创建，不预埋后 CSS 隐藏。

## 13. 焦点与播报

- intro 聚焦“开始共同值班”；
- handoff 聚焦“双方就位”；
- operating 首次进入聚焦电源席第一个控件；操作后保留原控件焦点；
- paused 聚焦“继续值班”；
- shift-result 聚焦“进入下一班”；
- complete 聚焦“重新值班”。

live region 只播报：馈线/联络/负载改变后的第一故障解释、首次进入安全窗、稳定被中断、每 30 tick 的 `1/3、2/3、完成` 三个里程碑、暂停、换班和总完成。不得每 tick 播报 `n/90`。

安全状态不用只靠绿色：同时显示“安全窗口”、粗实线、对勾、`n/90` 与进度条。故障状态同时有文字故障码翻译、母线字母、正负整数和线型变化。

## 14. 视觉结构（概念前冻结）

视觉题材：虚构 1970s 月面控制室的“共享值班台”，不是 NASA 仪表复刻。

必须出现：

- 左太阳母线、右电池母线、中央可变方向联络线；
- 氧气、照明、通信三项负载；
- L/R 供给、需求、余量/缺口整数；
- 电源席和负载席两个明确控制区；
- 当前班次、维护/受损插口说明、安全窗进度；
- “本地运行 · 不联网 · 抽象谜题”声明。

生成资产只能承载无字控制室背景、仪表外壳、月面窗景或装饰图集；不得承载电路、按钮、数值、状态灯、文字、热区、NASA/Artemis 标识或胜负结果。资产失败后规则与层级仍完整。

## 15. 响应式

### 1280×800

- 顶栏、标题和班次不超过约 170px；
- 中部拓扑占主宽度，L/R 两母线与三负载首屏完整；
- 下部两席控制左右并列；
- 首屏可见安全窗、主动作和本地声明；
- `scrollWidth === innerWidth`，正常 operating 不纵向滚动。

### 768×1024

- 拓扑保持横向 L/R；
- 两席控制上下或两列，按钮不低于 48px；
- 可有短纵向滚动，不横向溢出。

### 390×844 / 320×700

- 顺序：导航、标题/班次、供需卡、拓扑、状态、安全窗、电源席、负载席、声明；
- 拓扑可压缩为两列母线 + 三行负载，不把文字缩到不可读；
- radio group 可换行，仍保留 off/L/R 明文；
- 页面自然纵向滚动，无 sticky 控件遮挡内容；
- 320px 下所有按钮最小 48px，正文不小于 16px。

## 16. A 级目录 Gate

- 经典脚本顺序：`config.js → levels.js → logic.js → app.js`；
- 所有 href/src 为相对路径；
- 禁止 module、import/export、动态 import；
- 禁止 `fetch`、XHR、WebSocket、Worker、Service Worker；
- 禁止 local/session storage、IndexedDB、cookie；
- 禁止 CDN、远程字体、远程图片/音频/视频、统计与分享；
- 禁止随机数、真实时钟进入规则；
- 作品目录复制到任意相对位置仍可 `file://` 打开；
- README 必须有 `## 借鉴与来源声明`；ATTRIBUTION 固定所有来源、版本、许可证、权利主体与零复制边界。

## 17. 开源与事实来源声明

固定来源与边界继承 [141-moon-base-power-research.md](./141-moon-base-power-research.md)：

- PipeWalker v1.1 / `72c4cfa...` / MIT：只研究连接完整性的可读反馈；
- Grid2Op v1.12.5 / `a173688...` / MPL-2.0：只研究 topology action、observation、安全约束分层；
- Power Overload 2.1.6 annotated tag object `94d188c...`、解引用 commit `8d61811...` / MIT：只研究子网容量、隔离和过载反馈问题；
- NASA Moon Base Systems 与 Gateway 页面：只作为供电、居住/生命保障和通信题材背景。

最终实现不复制、改写、翻译、移植、打包或依赖上述项目的源码、API、算法、关卡、数值、测试、文档原句、页面、图像、音频、字体、标识或其他素材。视觉资源由本项目 ImageGen 原创生成并单独声明。

## 18. 自动验收矩阵

### 逻辑

1. level schema、冻结、引用所有权与非法关卡；
2. controls 完整性、额外字段、类型、枚举和不可用插口；
3. 两馈线开关、实际供给、本地余缺、总量守恒；
4. tie off/required/idle/错误方向/容量上限/恰好填平；
5. fault 全量、去重与固定顺序；
6. evaluation schema、深冻结和 caller ownership；
7. 324 向量无重复、三关各唯一解、镜像性质、第三关 transfer=1；
8. 所有 reducer 合法/非法阶段、同值同引用、畸形回退与 `isPowerState` 跨字段不变量；
9. 安全 89/90 边界、中断归零、换班、第三班 complete；
10. 暂停冻结、恢复 revision、重开除 revision 外深相等、JSON 往返；
11. public view 无函数/内部引用，阶段 action flags 正确；
12. 配置 sanitize 与 completion policy 全部回退分支。

### 静态/浏览器

1. A 级脚本顺序与禁用 API 扫描；
2. DOM 阶段、配置内容只走 textContent、完成文案不预埋；
3. 鼠标/触屏完整三班；
4. `A/S/D` 与 `J/K/L` 完整三班，repeat 不重复；
5. hidden、blur、long-frame 暂停，恢复不后台补 tick；
6. 1280×800、768×1024、390×844、320×700 无横向溢出与裁切；
7. 200% 文本、reduced-motion、forced-colors；
8. 禁背景/禁图集仍可通关；
9. console 0 error/warning，资源只含本地相对文件；
10. 概念与最终截图原生尺寸同轮查看，至少五项 fidelity ledger 和首屏文案 diff；
11. README、ATTRIBUTION、catalog、bugs、learn 与整仓 verifier。

## 19. Go / No-Go

**Go。** 规格冻结了完整 324 状态、三关唯一安全向量、联络条件、不可用插口、evaluation/fault schema、30Hz/90 tick、安全暂停、双席输入、配置策略、阶段 DOM、A 级边界和借鉴声明。

进入视觉与实现计划前，先用内置 ImageGen 生成 desktop operating、mobile operating 和 complete 三态概念，提取设计 token 与生产资产；逻辑实现必须先以枚举测试证明三关唯一解，再允许界面接线。
