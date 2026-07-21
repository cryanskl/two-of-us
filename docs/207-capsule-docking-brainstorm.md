# “太空舱对接”实现前 Brainstorm：让同一艘船真正属于两席

- 日期：2026-07-21
- 对应调研：[176-capsule-docking-research.md](./176-capsule-docking-research.md)
- 对应规格：[177-capsule-docking-spec.md](./177-capsule-docking-spec.md)
- 目标目录：`experiences/co-op/capsule-docking/`
- 状态：跨层合同已决策；生产代码仍等待完整视觉概念与用户确认

## 1. 为什么补这次 Brainstorm

176 与 177 已经冻结三航段、整数物理、256 格角度、连续碰撞、六项对接 Gate、固定金路径、七阶段 reducer、键盘/Pointer 和响应式验收。剩余风险不在“怎么算”，而在“页面如何只消费一次权威结果”：

- 内部完成记录含两席控制 tick，但 public view 又禁止公开个人统计；
- 输入来源集合没有完整的跨阶段所有权，旧 pointer 或 capture fallback 可能进入下一航段；
- rAF 有固定步规则，但排队回调、BFCache 和阶段退出缺少 generation 合同；
- 阶段文案已冻结，主动作、Gate 标签、live 播报和无脚本内容仍不精确；
- 浏览器验收要求对照“接受概念”，但概念范围和接受 Gate 尚未定义；
- 根仓库是 ESM，单写 UMD 出口不能证明真实 `require()`。

本轮只冻结这些跨层决策，不修改物理常量、金路径、来源结论，不创建生产目录，也不生成视觉资产。

## 2. public view 与内部合作证明分层

权威 state 的完成记录继续保留：

```js
{ legId, attempts, attitudeTicks, thrustTicks }
```

`attitudeTicks/thrustTicks` 只用于证明两席都实际参与，不得进入页面。`getPublicView()` 的 `completedLegs` 精确投影为：

```js
{ legId, title, attempts }
```

其中 `title` 从冻结 `LEGS` 派生，页面不再查逻辑常量或自行拼名称。summary 仍只有称呼、三段、总尝试和重试；任何 public view 都不得包含两席控制量、个人失误、最佳路线、用时、燃料、评级、分数或未来输入。

这样既能在 reducer 内证明合作必要性，又能让完成日志保持中性：“第 n 段、名称、共同完成、尝试次数”。

## 3. 唯一动态状态与主动作

`getPublicView().statusText` 是页面唯一动态主状态；页面不得根据 phase、legIndex 或 lastResult 再维护第二套句子：

| phase | `statusText` |
| --- | --- |
| `intro` | `一边只管转，一边只管推。把位置、速度、角度和旋转一起放进安全窗。` |
| `leg-intro` | `第 {n} 段：{title}。先看船头和余速，再一起接近。` |
| `approaching` | `接口就在右边；轻推、回正、收住余速。` |
| `failed` / hull | `舱体碰到接口外壳了，这一段重新靠近。` |
| `failed` / drift | `舱体飘出近距安全区了，这一段重新靠近。` |
| `docked` | `位置、速度和船头一起稳住了。` |
| `mission-result` | `三次靠近，都被我们稳稳接住。` |
| `complete` | `对接完成，这一程一起回家。` |

每阶段最多一个 `.primary-action`，文字与 action 固定：

| phase | 按钮 | action |
| --- | --- | --- |
| `intro` | `开始对接` | `START` |
| `leg-intro` | `开始第 {n} 段` | `BEGIN_LEG` |
| `approaching` | `暂停这一段` | `SUSPEND` |
| `failed` | `重新靠近` | `RETRY_LEG` |
| `docked` 1–2 | `进入下一段` | `NEXT_LEG` |
| `docked` 3 | `查看共同记录` | `NEXT_LEG` |
| `mission-result` | `收下这次对接` | `FINISH` |
| `complete` | `再对接一次` | `RESTART` |

主动作不是物理控制；按住 A/D/J/L、Pointer 与聚焦控制键都只属于 approaching epoch。

## 4. 阶段 DOM 与未来内容边界

初始化前，交互根节点默认隐藏或禁用；app 成功读取 logic/config 后才设置 ready 标记。运行时采用以下所有权：

- 阶段面板只创建当前标题、`statusText` 和当前主动作；可编程聚焦的阶段标题统一 `tabindex="-1"`；
- 舞台、遥测、Gate、两席控制、稳定进度和完成日志保持 persistent 节点身份，避免每 tick 重建按钮或焦点；mission-result/complete 会把 Gate 与稳定区设为 `hidden` 并移出可访问树，但不在重播时另造第二套节点；
- 四个控制按钮只在 `approaching` 可用，其他阶段使用原生 `disabled`，`aria-pressed=false`，也不能登记本地来源；
- 完成日志只投影已完成前缀；未来航段节点不预埋在 hidden DOM；
- mission-result 才创建三段汇总；complete 才创建完成赠言，未来赠言不以 template、data attribute、aria-label 或隐藏节点提前进入 DOM；
- 失败时只显示中性原因和重试，不显示哪一席“造成”碰撞。

持久舞台在 intro/leg-intro 显示当前航段初态，在 failed 显示最后安全位置，在 mission-result/complete 显示标准纪念姿态；页面只投影 public view。

## 5. 六条 Gate 的精确公开语言

研究文档中的“五个 Gate”统一更正为：五类控制条件加一项碰撞安全；在 Gate 可见的阶段，页面始终显示六条公开 Gate：

| 字段 | 标签 | 状态词 |
| --- | --- | --- |
| `positionOk` | `位置进入接口` | `安全 / 未安全` |
| `velocityOk` | `线速度收住` | `安全 / 未安全` |
| `angleOk` | `船头对准` | `安全 / 未安全` |
| `angularVelocityOk` | `角速度收住` | `安全 / 未安全` |
| `controlsReleased` | `四键已松开` | `安全 / 未安全` |
| `collisionFree` | `路径无碰撞` | `安全 / 未安全` |

`allOk` 不成为第七条，只控制总提示：false 为 `六条条件还没有同时安全。`；true 且 stable 0..29 为 `六条条件都安全，继续保持 {stable} / 30。`；docked 为 `已经稳定 30 / 30。`。stable 0 是最后一次 RELEASE 已让六项全安全、但下一次规则 TICK 尚未执行的可达状态，不能留给页面临时补文案。

public view 还必须冻结阶段呈现，避免最后安全位置或纪念姿态制造假信号：

- intro/leg-intro/approaching：`gate` 是当前物理的六项计算，Gate 与稳定区可见；
- failed：其他五项保留最后安全位置的计算结果，但 `collisionFree=false`、`allOk=false`，`gateStatusText` 固定为 `本次接近已经结束，路径未安全。`；失败的 swept candidate 只通过 lastResult 表达，不把碰撞位置写回权威坐标；
- docked：六项全 true，`gateStatusText` 为 `已经稳定 30 / 30。`；
- mission-result/complete：标准纪念姿态不参与新一轮 Gate，`gateVisible=false`、`gateStatusText=""`，Gate 与稳定区 hidden；不能用纪念姿态全绿配合 stable 0 冒充运行状态。

`gateVisible` 与 `gateStatusText` 都由 `getPublicView()` 给出，页面不得自行从 phase 推导另一套 Gate 呈现。

## 6. 输入来源的 approaching epoch

app 每次进入 approaching 创建单调 `inputEpoch`。来源记录固定为 `{epoch, seat, control, kind, pointerId?}`，并遵守：

1. 只有当前 approaching epoch 可创建四个物理控制的来源；非 approaching 的物理 control key/pointer/click 全部拒绝且不 preventDefault；阶段 `.primary-action` click 不属于 inputEpoch，仍按当前 phase 派发对应 reducer action；
2. 任一退出 approaching 的路径——自动 failed/docked、SUSPEND、隐藏、失焦、pagehide——先使 epoch 失效，再清键盘、button-key、pointer、capture fallback 与本地 pressed 样式；
3. pointerdown 必须先成功建立 pointer capture，或成功安装 document 级 up/cancel fallback；两者都失败时不派 PRESS；
4. 结束器先原子取出并删除来源，再按“该 control 来源数 1→0”决定是否派 RELEASE；pointerup/cancel/lostcapture/fallback 竞态只有第一个拥有结束权；
5. 阶段已退出时只清本地来源，不向 reducer 追加过期 RELEASE；权威 transition 已清 held；
6. 同 control 的键盘与 pointer、同席双 pointer 继续按来源计数与净轴规则工作。

`click` 永远不是物理 PRESS 来源；Space/Enter 的按住/松开由 button-key keydown/keyup 表达并抑制浏览器合成 click。

## 7. rAF generation、后台与 BFCache

固定步循环使用独立单调 `rafGeneration`：

- 只有 approaching + visible + focused 才启动；回调捕获 generation；
- 任一退出 approaching、blur、hidden、pagehide 都先递增 generation，再 `cancelAnimationFrame()` 并清 accumulator/baseline；
- 已排队的旧回调先比较 generation 与 phase，失配时不得派 TICK、不得调度下一帧；
- 自动 failed/docked 发生在 TICK 内时，render 后立即停止旧循环；剩余 batch 由 reducer 丢弃；
- focus、visible 或 BFCache `pageshow` 恢复时只在当前仍 approaching 才创建新 generation 与新基准，第一帧不补 tick；
- 规格既定的 blur/hidden/pagehide 会 SUSPEND 回 leg-intro，因此正常恢复不会自动继续漂移，也不会抢焦点。

这使“后台完成”和“旧帧复活”在结构上不可达，不需要另建 pending focus 队列。

## 8. 焦点与 live 的 token 化

每次 render 产生 `phaseToken = revision + phase`。需要微任务聚焦时捕获 token；执行前再次比较当前 token，旧 failed/docked 或快速重试留下的微任务不得抢焦点。

live region 只使用以下事件句，不读每 tick 遥测：

- START：`对接训练已开始。`
- BEGIN_LEG：`第 {n} 段开始。`
- 每个 attempt 首次 allOk：`六条安全条件都满足，保持稳定。`
- hull：`舱体碰到接口外壳，本段需要重新靠近。`
- drift：`舱体飘出近距安全区，本段需要重新靠近。`
- docked：`第 {n} 段已稳稳接住。`
- SUSPEND：`已暂停并重置本段。`
- RETRY_LEG：`第 {n} 段重新开始。`
- NEXT_LEG 1–2：`进入第 {n} 段。`
- NEXT_LEG 3：`三段对接都完成了。`
- FINISH：`对接完成，这一程一起回家。`
- RESTART：`已回到第一段开始前。`

allOk latch 以 attempt 为作用域，RETRY/NEXT/RESTART 清除；stable 被短按打断后同一 attempt 不重复播报。

## 9. 无 JavaScript 与本地信任边界

无 JavaScript 固定只显示：

1. H1 `转一点，推一点，刚好回家`；
2. 固定短规则；
3. 无语义、无答案的静态观察窗轮廓；
4. `请开启本地 JavaScript 后再开始对接；页面不会联网。`；
5. `这是归一化的合作游戏，不是航天训练或真实操作建议。`。

不得显示伪造遥测、Gate、控制按钮、完成日志、称呼、赠言、金路径或未来状态。静态页面只承诺零联网、零存储和同机公开状态；不声称能证明由两个人操作。

## 10. 真实 CommonJS 与文件边界

目标目录增加只含以下内容的 `package.json`：

```json
{"type":"commonjs"}
```

它只为本体验的 `.js` 建立真实 CommonJS 边界，不新增 dependencies、scripts、main 或构建。`logic.js/config.js/golden-fixtures.js/logic.test.js` 在 Node 中用真实 `require()`；另用不提供 `module` 的 VM 验证浏览器经典全局。浏览器仍按 `logic.js → config.js → app.js` 加载。

## 11. 视觉概念与生产 Gate

生产 UI、styles 和运行资产在用户明确接受概念前禁止创建。视觉流程固定：

1. `docs/208-capsule-docking-imagegen-brief.md`：完整状态、响应式、降级与资产简报；
2. `docs/assets/capsule-docking/`：只保存原始候选与生成台账；
3. `docs/209-capsule-docking-design-proposal.md`：候选比较、用户接受状态、design-system inventory 与至少五项 fidelity ledger；
4. 用户明确接受后，再写端到端实施计划并分阶段实现。

概念必须覆盖 intro、三种 leg-intro 中至少两个差异初态、approaching 部分 Gate、稳定 1..29、hull、drift、docked、mission-result、complete、桌面/移动/小屏、200% zoom、图片阻断、reduced-motion、forced-colors 与无脚本。

生成图只定义无字观察窗背景、纸质训练台材质和可选原创站体表面。舱体、碰撞几何、接口、安全框、遥测、Gate、按钮、键位、焦点、喷口状态和文字必须 code-native。禁止 NASA/SpaceX 标志、任务徽章、国旗、现役接口、真实单位、轨迹答案、未来按键、Logo 或水印。

## 12. 来源与借鉴边界

Gymnasium、p2.js、SAT.js 与 Phaser 的固定 commit、许可证、版权和零复制范围继续以 176/177 为真，不因视觉概念或实现而扩大。NASA 资料只解释位置、速度、姿态和姿态率这四类公开状态，不提供代码、参数、素材或真实训练结论。

最终 README 与 ATTRIBUTION 必须同时写借鉴声明；任何实际复制或引入都要重新审计，不能继续使用“独立实现、零第三方运行依赖”的结论。

## 13. 用户贡献点

脚手架完成后，最适合用户亲手修改的是 `config.js` 中 5–10 行的 `composeCompletionNote(summary)`。它决定三段完成后的专属赠言，属于真正的业务与情感选择；物理参数、碰撞、Gate、错误处理和输入生命周期不能转嫁给用户。

## 14. 冻结结论与下一步

进入视觉阶段时，以下视为冻结：

1. public completed DTO 为 `{legId,title,attempts}`，内部 control ticks 不泄漏；
2. `statusText` 是唯一动态主状态，七阶段、八个主动作分支的文字精确；
3. persistent 舞台/仪表/控制与 phase-owned 标题/结果分层；
4. 六条 Gate 的标签、状态词和稳定总提示精确；
5. inputEpoch、单次结束所有权与 capture fallback 先建后 PRESS；
6. rafGeneration、迟到回调、BFCache 新基准和无后台续跑；
7. phaseToken 聚焦与 attempt 作用域 live latch；
8. 无 JavaScript 五项静态内容与未来内容 absence；
9. 子目录真实 CommonJS 边界；
10. 完整视觉、用户接受、design inventory 与 fidelity ledger 是生产代码的前置 Gate。

下一步先把这些决策回写 176/177，再编写 208 视觉简报。统一图像偏好仍未确认时只完成简报，不生成图片、不创建生产目录。
