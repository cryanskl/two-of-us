# A 级“月面，保持有光”定向调研

- 日期：2026-07-19
- 创意来源：创意池 C08“月球基地配电”
- 目标等级：A，经典脚本、相对路径、`file://` 直开
- 工作 ID：`moon-base-power`
- 冻结标题：`月面，保持有光`
- 结论：进入规格；采用“两人分别控制电源侧与负载侧，在三次月面班次中把氧气、照明和通信连续维持在安全窗”的原创同屏合作玩法

## 1. 为什么选择它作为下一款

候选审计同时比较了 S09“夸夸老虎机”、C08“月球基地配电”和 V08“爱心投石器”。

| 候选 | A 级可行性 | 相对已有作品的机制增量 | 主要风险 | 本轮结论 |
| --- | --- | --- | --- | --- |
| S09 夸夸老虎机 | 很高 | 三列语义组合、有限次 Jackpot；但与“今晚做什么”和未来签的随机揭晓有部分重合 | 文案笛卡尔积质量、动画旧回调 | 后续优先候选 |
| C08 月球基地配电 | 高 | 共享拓扑、容量联锁、双席权限分离、连续安全窗和关卡穷举 | 规则认知负担、误装成真实电气训练 | **本轮采用** |
| V08 爱心投石器 | 高 | 镜像回合、反弹与等机会 volley | 与纸飞机的角度/力度弹道及刚完成的物理作品相邻 | 后续候选 |

仓库现有合作作品覆盖双端刚体、连续平衡、节拍交接、调色、条件推理、编码译码和角色领航，但没有一个作品让双方共同修改同一张**离散网络拓扑**，再由统一裁判计算连通、容量和安全持续时间。

这款作品新增五个可复用能力：

1. **权限分离的共享网络**：双方操作不同层级的开关，但结果只在同一张权威图上结算；
2. **整数容量联锁**：供给、需求、余量、缺口和联络容量都可解释、可穷举；
3. **连续安全窗**：偶然经过答案不算完成，必须稳定保持 90 个逻辑 tick；
4. **关卡可解证明**：每关穷举全部 324 种原始操作组合，固定唯一安全向量与双方必要性；
5. **非物理同屏合作**：不依赖帧率、碰撞、音频、随机或局域网。

## 2. Brainstorm：四种方案

| 方案 | 核心体验 | 结论 |
| --- | --- | --- |
| 真实 AC/DC 潮流与电压频率 | 两人调节相角、功率和保护阈值 | 拒绝；认知负担高，也会造成错误的电气训练暗示 |
| 双人各守一个独立仪表盘 | 一人看氧气、一人看通信，各自点击维持 | 拒绝；共享目标弱，容易变成两个并排单人游戏 |
| 一人看说明书、一人接线 | 类似拆弹手册的口述推理 | 暂缓；与“把信号接回来”的互补信息结构过近 |
| 电源席控制馈线/联络，负载席控制三舱母线 | 同一拓扑、不同权限、整数供需、稳定安全窗 | **采用**；一眼能看到因果，又无法由单席独立完成 |

首版不加入真实电压、电流、功率因数、频率、热模型、储能充放电曲线、随机故障、抢修资源、死亡倒计时、排行榜、网络房间、音频、振动或长期记录。

## 3. 冻结体验闭环

```text
intro：看懂两种席位和三项生命负载
→ handoff：双方就位
→ operating：共同切换开关，实时观察缺口/过载
→ stable：全部安全后保持 90 tick
→ shift-result：完成本次班次，显示原因摘要
→ 下一班次：供给、需求与联络目标变化
→ complete：三班全部稳定，显示共同结语
```

默认文案方向：

```text
月面，保持有光
一个管电从哪里来，一个管光往哪里去。
氧气、照明、通信，都要亮着。
安全不是一瞬间——一起稳住它。
三次交接，月面没有熄灯。
```

玩法是温和的共同值班，不出现人员伤亡、窒息警报、爆炸画面或责备某一方的失败文案。错误状态只显示“未接通”“供给不足”“母线过载”或“联络方向不对”，调整后可以立即继续。

## 4. 最小抽象模型

### 4.1 两条母线与三项负载

世界只有左母线 `L`、右母线 `R`：

- 左侧太阳源只向 `L` 提供整数供给；
- 右侧电池源只向 `R` 提供整数供给；
- 氧气 `oxygen`、照明 `lights`、通信 `comms` 各自只能接 `L`、断开 `off` 或接 `R`；
- 个别班次可以公开标记受损插口，以 `allowedBuses` 限制某项负载只能接仍可用的一侧；
- 联络线只能是 `L→R`、`off`、`R→L`，最多转移 2 单位余量；
- 不计算电压、电流、相角、损耗、频率或真实潮流。

### 4.2 两个席位

电源席只能控制：

1. 太阳馈线 `on/off`；
2. 电池馈线 `on/off`；
3. 联络线 `L→R/off/R→L`。

负载席只能控制：

1. 氧气接 `L/off/R`；
2. 照明接 `L/off/R`；
3. 通信接 `L/off/R`。

UI 可以公开全部状态；“分工”来自不可替代的操作权限，不靠遮住信息。键盘与触屏也必须保持权限一致，不能提供一个能替双方操作的隐藏总控入口。

### 4.3 唯一供需结算顺序

每个逻辑 tick：

1. 根据两个馈线是否开启，得到 `localSupplyL/R`；
2. 按负载接线汇总 `localDemandL/R`，断开的负载单独标记；
3. 计算两侧本地 `surplus = max(0, supply - demand)` 与 `deficit = max(0, demand - supply)`；
4. 只有联络方向从有余量一侧指向有缺口一侧时，转移 `min(2, sourceSurplus, targetDeficit)`；
5. 每班先检查公开的联络条件：维护班次必须 `off`；启用班次闭合后必须发生正整数转移，空载闭合或错误方向不安全；
6. 转移后仍有缺口的一侧不安全；供给关闭、任一负载断开或不可用插口均不安全；
7. 所有负载接通、联络条件满足且两侧最终缺口为 0，才记作一个安全 tick；
8. 连续安全 90 tick 通过本关；任一不安全 tick 把连续计数清零，但不清空开关。

“过载”在本作中只是 `demand > local supply + accepted transfer` 的游戏状态，不表示现实电网保护动作。README 和界面必须明确这是原创抽象合作谜题，不是电气操作、月面工程或安全培训。

## 5. 三次班次与穷举边界

每关共有：

```text
电源席组合：2 × 2 × 3 = 12
负载席组合：3 × 3 × 3 = 27
总组合：12 × 27 = 324
```

早期提案曾按“两馈线必须开启”只计 `6 × 27 = 162` 个候选。正式穷举必须覆盖完整 324 种状态，并另外证明所有安全解里两馈线都开启；不能在枚举前偷掉馈线关闭分支。

冻结的三关供需：

| 班次 | 左供给 | 右供给 | 需求 | 可用插口 | 公开联络条件 | 唯一安全分配 |
| --- | ---: | ---: | --- | --- | --- | --- |
| 01 日照接班 | 3 | 5 | 氧气 4、照明 1、通信 3 | 全部可接 L/R | 维护中，必须 `off` | 通信→L；氧气+照明→R |
| 02 影区接班 | 5 | 3 | 氧气 4、照明 1、通信 3 | 全部可接 L/R | 维护中，必须 `off` | 氧气+照明→L；通信→R |
| 03 地月窗口 | 4 | 4 | 氧气 5、照明 1、通信 2 | 氧气仅 R；照明仅 L；通信可接 L/R | 已启用，必须实际转移 | 照明+通信→L；氧气→R；左侧经 `L→R` 补 1 |

规格前必须用生产同源 evaluator 枚举并锁定：

- 每关是否在完整 324 状态中恰好只有 1 个安全组合；
- 安全组合是否都让三负载各接一侧、两馈线开启；
- 关 1/2 是否都必须关闭联络；
- 关 3 是否必须 `L→R` 且实际转移 1；
- 受损插口是否由 level 数据、evaluator、view 和 UI 共同执行，不能只在界面 disabled；
- 固定另一席的任意操作时，另一席是否仍至少需要一次正确动作；
- 不存在只靠电源席或只靠负载席从默认态直接完成全部三关的路径。

若穷举发现额外安全解，不通过 UI 暗藏限制补救；应先调整关卡数值或明确接受多个解，再更新文案与测试。

## 6. 状态机与纯逻辑建议

```text
intro
  └─ START → handoff
handoff
  └─ READY → operating
operating
  ├─ TOGGLE_FEED / SET_TIE / SET_LOAD → operating
  ├─ TICK(unsafe) → operating, stableTicks = 0
  └─ TICK(safe) × 90 → shift-result
shift-result
  ├─ NEXT_SHIFT → handoff
  └─ after shift 3 → complete
complete
  └─ RESTART → intro
```

建议权威状态：

```js
{
  phase,
  shiftIndex,
  sourceControls: { solarOn, batteryOn, tie },
  loadControls: { oxygen, lights, comms },
  stableTicks,
  lastEvaluation,
  completedShifts,
  revision
}
```

公开逻辑 API 最少包括：

- `createInitialState(config?)`；
- `start(state)`、`ready(state)`；
- `toggleFeed(state, feed)`、`setTie(state, direction)`；
- `setLoad(state, load, bus)`；
- `evaluateGrid(shift, controls)`；
- `tick(state)`；
- `nextShift(state)`、`restart(state)`；
- `enumerateSolutions(shift)`；
- `getPublicView(state)`；
- `resolveCompletionNote(policy, summary)`。

状态、view、关卡、evaluation 和 summary 都递归冻结并与调用方断开引用。合法状态上的非法动作返回同一引用；畸形状态通过公开动作安全回初始状态，不抛异常。

## 7. 时间、输入与生命周期

- 固定 30 tick/s；90 tick 即连续稳定 3 秒；
- `requestAnimationFrame` 只积累时间并派发固定 tick，不能按帧累加安全进度；
- 每帧最多追赶 5 tick；隐藏、失焦或长帧进入显式暂停，清空 accumulator；
- 恢复要由双方点击“继续值班”，不能在后台补满安全窗；
- reduced-motion 可以移除电流脉冲、仪表摆动和转场，但不能缩短 90 tick；
- 电源席键位建议 `A/S/D`，负载席建议 `J/K/L`，均只在 operating 阶段拦截；
- 每个三态控制同时提供原生按钮，触控目标至少 48×48px；
- live region 只播报操作后状态变化、进入安全窗、稳定中断、换班和完成，不逐 tick 读数。

## 8. A 级本地运行与依赖结论

作品只需：

```text
index.html
styles.css
config.js
levels.js
logic.js
app.js
assets/（可选原创背景/图集）
README.md
ATTRIBUTION.md
```

所有脚本使用按序经典 `<script>`；不用 module、npm 运行依赖、`fetch`、XHR、WebSocket、Worker、Service Worker、浏览器存储、远程字体、CDN、账户或服务端。SVG/DOM 绘制电路和仪表，背景资产失败后仍可用 CSS 线条、文字和原生按钮完成全部三关。

因此它不需要统一依赖新增，也不会改变现有一键启动器；整个作品目录单独复制后仍应可双击 `index.html`。

## 9. 固定开源调研与零复制边界

核验日期：2026-07-19。下列来源只用于研究一般问题，不进入运行依赖。

| 来源 | 固定版本、许可证与权利主体 | 仅研究 | 明确未复制或引入 |
| --- | --- | --- | --- |
| [PipeWalker v1.1](https://github.com/artemsen/pipewalker/tree/72c4cfa37c48a60aebcd537061163ccb3eabc806) | tag `v1.1`，commit `72c4cfa37c48a60aebcd537061163ccb3eabc806`；MIT；Copyright © 2024 Artem Senichev | 把多个组件连接为完整网络的可读反馈 | C++/SDL2 代码、旋转拼管规则、关卡、算法、截图、图标、音效、字体、构建和文案 |
| [Grid2Op v1.12.5](https://github.com/Grid2op/grid2op/tree/a1736886d18c14f6e19520813d2b3e432179e3b9) | tag `v1.12.5`，commit `a1736886d18c14f6e19520813d2b3e432179e3b9`；MPL-2.0；Copyright © 2019–2020 RTE France | topology action、observation、安全约束与环境推进分层 | Python 包、潮流后端、动作/观察 API、RL 接口、数据集、算法、测试、notebook、图和文字 |
| [Power Overload 2.1.6](https://github.com/tburrows13/PowerOverload/tree/8d618116d7491c9a289bbbf886c340a197f38303) | 工作树 commit `8d618116d7491c9a289bbbf886c340a197f38303`；`info.json` 为 `2.1.6`，tag `v2.1.6` 指向打包提交 `94d188c1233331e1136894e1d5e867684e91197c`；MIT；Copyright © 2022 Tom Burrows | 子网容量、变压器隔离和过载反馈这一抽象问题 | Factorio 模组代码、API、实体、配方、数值、贴图、音效、文案、随机破坏和任何游戏素材 |

版本注记：Power Overload 的 tag 与当前 `2.1.6` 工作树 commit 不同，因此声明同时记录二者，不把 HEAD 冒充 tag。许可证原文位于固定工作树的 `LICENCE.txt`，Factorio 模组页也登记 MIT。

即便这些许可证允许一定范围的复制，本作仍选择零复制。如果以后实际使用实质代码、文档段落或素材，必须单独提交许可证正文、版权声明、文件级借鉴边界和重新验收结果。

## 10. 事实背景与商标边界

- [NASA Moon Base Systems](https://www.nasa.gov/moonbase-systems/) 将月面基础系统分为通信、居住和电力等类别，并把电力描述为生成、储存、调节和分配；
- [NASA Gateway 概览](https://www.nasa.gov/reference/gateway-about/) 分别提到环境控制与生命保障、能源储存/配电和通信能力；
- 这些来源只用于说明“氧气/生命保障、照明、通信需要基础设施支持”的题材合理性，不为本作的数值、拓扑或控制方法背书。

本作不是 NASA、Artemis、Gateway、Factorio 或任何上游项目的官方作品、模拟器或培训产品。不得使用其徽标、任务标识、截图、概念图、地图、商标化 UI、原文段落或素材。视觉采用原创虚构月站，不出现 NASA 肉丸标志、Artemis 标识或 Factorio 美术风格。

## 11. 规范依据

- [WHATWG HTML animation frames](https://html.spec.whatwg.org/multipage/imagebitmap-and-animations.html#animation-frames)：rAF 是显示调度边界，不是权威规则时钟；
- [W3C UI Events KeyboardEvent code Values](https://www.w3.org/TR/uievents-code/)：以物理键位 `code` 处理双席键盘；
- [W3C Pointer Events Level 3](https://www.w3.org/TR/pointerevents3/)：原生按钮、pointer cancellation 和触控行为；
- [WCAG 2.2](https://www.w3.org/TR/WCAG22/)：键盘、焦点、目标尺寸、非颜色信息和状态播报；
- [Media Queries Level 5](https://www.w3.org/TR/mediaqueries-5/) 与 [CSS Color Adjustment](https://www.w3.org/TR/css-color-adjust-1/)：reduced-motion 与 forced-colors。

实现标准接口不等于复制规范文字。若未来复制规范示例、图表、IDL 或测试，仍需按对应文档/软件许可证处理。

## 12. 视觉与无障碍边界

- 左右母线同时用位置、字母 `L/R`、线型和颜色区分；
- 三负载同时显示名称、需求数、接线母线和明确安全状态；
- 缺口/余量使用带正负号的整数文字，不只靠红绿灯；
- 联络线有方向箭头和 `关 / L→R / R→L` 文本；
- 安全窗显示 `0/90` 到 `90/90` 与“稳定中/被中断”，不依赖动画；
- 电源席与负载席控件用不同标题和键位说明，但 DOM 顺序保持可预测；
- 1280×800 首屏看见标题、完整拓扑、两席控制、三负载和主动作；
- 390×844、320×700 可纵向滚动，但不得横向溢出或让一席控件覆盖另一席；
- forced-colors、200% 文本、禁背景图和 reduced-motion 下仍可完成三关。

## 13. 准备者可参与的业务策略

`config.js` 后续只预留 `composeCompletionNote(summary)`：收到冻结的三次班次摘要、双方显示名、稳定总 tick 和默认结语，返回一段完成文案。

准备者可以用 5–10 行写成两人的专属值班记录；空白、非字符串、超长、抛错或修改 summary 时安全回退。该函数不能改变关卡、容量、状态、完成条件或操控权限，默认配置无需修改即可完整游玩。

## 14. 必须通过的 Gate

### 逻辑

1. 三关逐一枚举 324 种控制组合，结果数量和安全解集合固定；
2. 供给关闭、负载断开、单侧缺口、错误联络、无余量转移、容量 2 上限和恰好填平分别正确；
3. 先算本地余缺再转移，联络不能制造能量、循环转移或把目标侧余量倒算回来源；
4. 三态控制只接受精确枚举值；额外字段、畸形状态、非法阶段与旧 revision 安全拒绝；
5. 连续 89 tick 不通过，第 90 tick 原子进入结果；中间任一不安全 tick 清零；
6. 30/60/120/144Hz 调度、reduced-motion 和 viewport 不改变最终 state hash；
7. 三班顺序、换班、完整完成、暂停恢复、任意阶段重开和 JSON 往返；
8. state、view、evaluation、levels、config 与 summary 递归冻结、断开引用；
9. 配置策略合法返回、空白、超长、抛错和篡改摘要安全回退；
10. 枚举证明双方权限都不可替代，UI 没有越权入口。

### 浏览器与目录

1. 键盘和触屏均能完成三班；按键 repeat、快速切换、失焦和隐藏不重复动作、不后台补安全 tick；
2. `file://` 经典脚本、相对资源，零 CDN/module/fetch/XHR/WebSocket/storage/Worker/音频/传感器；
3. 1280×800、768×1024、390×844、320×700 无横向溢出、裁切和不可达主操作；
4. 200% 文本、forced-colors、reduced-motion、禁背景/禁图集仍能完整游玩；
5. live region 不逐 tick 刷屏，焦点随 intro、handoff、operating、result、complete 合理移动；
6. 控制台零 error/warning，资源清单只有作品本地相对文件；
7. 概念图与最新浏览器截图在同一 QA 轮原生查看，对照至少五项 fidelity 与首屏文案；
8. README/ATTRIBUTION 固定来源、commit/tag、许可证、权利主体、零复制、事实背景和 ImageGen 生产链。

## 15. Go / No-Go

**Go。** “月面，保持有光”补齐仓库尚未覆盖的“共享离散电网拓扑 + 双席权限分离 + 整数容量联锁 + 连续稳定窗口 + 全状态穷举证明”合作样板。它无需联网、随机、音频、存储、服务端或第三方运行依赖，适合 A 级经典脚本。

进入规格前必须冻结：完整 324 状态枚举结果、余缺/转移公式、overload 用语、三关安全解、默认控制态、90 tick 边界、暂停恢复、action/state schema、两席键位、public view、配置摘要和浏览器验收尺寸。

## 16. 借鉴声明摘要

“月面，保持有光”的双母线规则、三班数值、两席权限、整数 evaluator、连续安全窗、状态机、测试、中文文案、界面和生成素材将由本仓库独立原创。PipeWalker、Grid2Op 与 Power Overload 只用于研究连接完整性、拓扑动作/观察分层及子网容量问题；未复制、改写、翻译、移植、打包或依赖其源码、API、算法、关卡、数值、测试、页面、资源或文案。

NASA 页面只作为题材事实背景，不构成联名、认可或工程依据。未来若实质引入任何第三方代码、素材或文字，必须另立变更、保留完整许可证与版权声明，并重新执行离线、性能、输入和浏览器验收。
