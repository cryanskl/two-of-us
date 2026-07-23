# A 级“每一格，都是喜欢你的理由”定向调研

调研日期：2026-07-21

对应创意：`S09 夸夸老虎机`

建议目录：`experiences/surprises/compliment-reels/`

建议等级：A（单设备、`file://` 直开、无第三方运行依赖）

2026-07-24 的仓库 HEAD、许可证载体哈希、排除项与 W3C 文档状态复核见
[230-compliment-reels-source-refresh.md](./230-compliment-reels-source-refresh.md)。

## 1. 调研结论

S09 适合实现成一台本地“夸夸印刷机”：准备者在 `config.js` 中写好三列专属短句，收礼者按下同一个把手，每次都会得到一句完整、自然、没有输赢的夸奖；一局最多六次，并在第三至第六次之间出现一次预先排好的“特别同频”。

正式方向采用 **三列固定语法槽 + 六抽预提交计划 + 唯一特别同频**：

- 三列分别表达“一个具体时刻”“TA 身上发亮的样子”“这件事带给我的回应”；
- 每列恰好六项，六格密封计划中每项各出现一次；实际只揭晓到特别同频，已揭晓前缀不会在同一列重复；
- 开局先用浏览器随机源决定特别同频位于第 3、4、5 或 6 次，再独立排列三列其余项目；
- 三枚签名项只会在同一位置相遇一次，所以一局有且只有一次特别同频；
- `PULL` 时结果已经由计划锁定，转轮动画只负责表现，不能从 CSS 位置反推或改写结果；
- 特别同频立即进入终局，展示此前得到的共同夸奖和准备者结语；
- 没有下注、硬币、余额、赔率、赔付、输赢、积分、near-miss、自动连抽或现金奖励。

它与现有惊喜有清晰边界：`date-wheel` 每次从公开候选中独立等概率抽一个安排；`future-ticket` 由收礼者逐组盲选孔位；`future-cookie-notes` 是三段固定承诺的无序收集。S09 则在开局生成一个有限、可重放的三列协调计划，每次同时落下一条新的组合夸奖，并以唯一签名组合收束整局。

## 2. 相邻候选与仓库差异

| 作品/候选 | 核心随机或选择方式 | 会话记忆 | 终局 | 与 S09 的边界 |
| --- | --- | --- | --- | --- |
| `date-wheel` | 每次独立、等概率选一个候选，允许重复 | 无 | 单次结果 | S09 一次生成六步协调计划；三列各自无重复，不宣称每拉独立 |
| `future-ticket` | 用户在三组中各盲选 A/B/C | 保存三个已选字段 | 完整约会车票 | S09 不让用户选列项，也不生成时间/地点/彩蛋计划 |
| `future-cookie-notes` | 三段固定正文按任意顺序揭开 | 收集三枚固定内容 | 主动合成邀请 | S09 每拉产生一条新组合，不允许任意开列，也不另设 assemble |
| S11 雪球摇一摇 | 连续拖动粒子，静止后形成图案 | 表现进度 | 昵称/图案 | 视觉资产与连续物理更重，后续候选 |
| S09 夸夸老虎机 | 六步预提交、三列同步落位、签名项唯一会合 | 保存本局已揭晓夸奖 | 特别同频与私人结语 | **采用** |

## 3. Brainstorm：四种方向与取舍

### 方向 A：每拉三列独立随机，直到碰巧全中

这是最接近传统老虎机的做法，但无法给轻量惊喜一个有限结尾，也容易诱导不断点击。若再在最后一刻强行覆盖成特别组合，用户看到的“随机”与实际规则又不一致。

**结论：不采用。** 不做无限抽取、动态加权或运行时保底改写。

### 方向 B：固定三次，其中一次随机为特别组合

三次闭环最短，移动端也容易一次完成；缺点是三列六项的大部分内容不会参与本局，特别组合若过早出现，后两次的情绪节奏会变弱；若强制第三次，又几乎没有悬念。

**结论：作为降级备选，不采用为主线。** 正式版仍保持最多六次，但绝不超过六次。

### 方向 C：六项协调袋，签名项在第 3–6 次唯一会合

每列的签名项被放进同一随机位置，其余五项分别洗牌。这样六格计划里每列六项各用一次，实际揭晓的前缀不重复，特别同频有且只有一次；规则可以公开说明“顺序在开始时已经排好”，无需伪装赌场概率。

**结论：采用。** 这是最小但完整的 S09 机制增量。

### 方向 D：允许锁住一列、重转另外两列

锁轴会把礼物页变成组合优化或押注策略，还需要解释剩余次数、锁定权限和特别组合概率；也容易出现用户为了“更好的一句”否定已经得到的夸奖。

**结论：不采用。** 每一次结果都应是一句成立的赞美，不设好坏等级。

## 4. 冻结内容模型

三列规则 ID 固定为：

| 列 ID | 页面标签 | 语法职责 | 合法示例 |
| --- | --- | --- | --- |
| `moment` | 我看见的你 | 不带句末标点的时间/情境从句 | `你认真听我说话的时候` |
| `shine` | 发亮的样子 | 能独立描述该时刻特质的谓语分句 | `总有一种很温柔的认真` |
| `echo` | 留给我的感觉 | 以“让我”或等价主语开头的回应分句 | `让我觉得，和你在一起真好` |

固定合成模板为：

```text
{moment}，{shine}，{echo}。
```

每列恰好六个稳定 opaque ID 和可编辑纯文本，其中各有一个冻结的 signature ID。签名三元组本身必须是完整 `6 × 6 × 6 = 216` 笛卡尔积中的普通合法句；特别同频只增加终局呈现和私人结语，不能偷偷换成词库外答案。

进入规格前必须人工穷举默认 216 句，逐句检查：

1. 语法自然，标点只由合成器添加；
2. 不含反讽、贬损、外貌/能力比较、道德债务或承诺施压；
3. 任意跨列组合都不形成事实矛盾或负面双关；
4. 每个完整句在移动端允许换行后仍可读；
5. 216 个 ID 三元组唯一，文本合成结果也不得意外重复。

配置可修改两个称呼、18 条文本和最终结语策略；不能修改列 ID、条目数、signature ID、模板、计划长度或保证区间。Unicode 字素上限冻结为：两个称呼各 `1..12`，每条 moment `4..18`，每条 shine `4..18`，每条 echo `4..22`，最终结语 `1..120`。完整合成句在默认标点下最多 61 字素。任何结构、文本长度或列内唯一性不合法时整份原子回退，不能只混用部分默认值制造语义错配。

## 5. 六抽预提交计划

冻结常量：

```text
PLAN_LENGTH = 6
JACKPOT_MIN_SPIN = 3
JACKPOT_MAX_SPIN = 6
```

`buildSpinPlan(entropy)` 的抽象步骤：

1. 用无偏整数索引从 `3..6` 选择 `jackpotSpin`；
2. 对每一列取出 signature 项，将它放在 `jackpotSpin - 1`；
3. 对该列其余五项做独立 Fisher–Yates 洗牌，依序填满另外五格；
4. 将三个列计划按相同位置合并为六个 stop；
5. 验证每列都是自身六项的完整排列，signature 三元组恰出现一次且位置与 `jackpotSpin` 一致；
6. 任一步失败或熵耗尽返回 `null`，不留下半成品计划。

由此可以直接证明：

- 前两次一定是普通夸奖；
- 特别同频一定在第 3–6 次出现；
- 一局至多六次；
- 六格计划中每列每项恰出现一次，实际揭晓前缀中每列无重复；
- 六个三元组互不相同；
- 特别同频恰好一次；
- `PULL` 之后不再读取随机源，历史结果不会改变未来计划。

页面必须诚实说明：“这一轮最多六次，会遇到一组特别同频；顺序在开始时已经排好。”不得声称每拉独立、每个三元组同概率或这是赌博公平性证明。

## 6. 随机、重放与降级

- `logic.js` 不读取 `crypto`、`Math.random`、`Date`、DOM、计时器或动画；
- `app.js` 在开局用 `Array.from(crypto.getRandomValues(new Uint32Array(64)))` 收集当前 realm 的普通 uint32 Array，再通过逻辑层 `createArmAction(config, entropy, "crypto")` 创建 ARM action；
- 无偏索引使用拒绝采样；固定输入数组总是生成字节等价 plan；
- 测试直接注入熵数组，不复制或引入 seedrandom 的 PRNG；
- 若浏览器没有 `crypto.getRandomValues`，或极端熵序列让拒绝采样耗尽，应用改用仓库冻结且由测试证明合法的 `FALLBACK_ENTROPY`，通过 `createArmAction(config, FALLBACK_ENTROPY, "fallback")` 创建动作，并明确显示“本机随机不可用，本轮使用固定惊喜顺序”；
- fallback 仍走同一个 `buildSpinPlan`，不能在 UI 单独硬编码结果；
- `randomMode:"fallback"` 只接受与冻结 fallback 逐项相等的 entropy；`randomMode:"crypto"` 接受任意合法 entropy，包括极小概率下与 fallback 内容相同的数组。mode 表达调用方记录的来源并写入 state，不能从熵内容反推，也不能由页面在 view 外另猜；
- `createArmAction` 同时把用户 composer 的安全结果解析一次并写入 action；action 日志保存 ARM 的普通整数数组、randomMode、已解析结语与后续动作，配合同一份清洗配置即可在 Node 重放为相同终局；
- 公共 view 不公开 entropy、完整 plan、jackpotSpin、future stops 或 pending 结果。

W3C Web Cryptography Level 2 将 `getRandomValues` 定义为同步获得强随机值的方法；本作只把它用于本地惊喜排序，不把它包装成金钱游戏的审计、公平或安全承诺。

## 7. 状态机与旧回调防护

建议五阶段：

1. `intro`：显示用途、有限保证与隐私边界，等待 ARM；
2. `ready`：计划已冻结，可以拉动；
3. `spinning`：当前 stop 已锁定但尚未向 public view 公开；
4. `result`：公开一条普通夸奖，可继续下一次；
5. `jackpot`：公开签名组合、历史夸奖和私人结语，可重新开始。

建议权威状态：

```js
{
  version,
  phase,
  plan,
  settledCount,
  pendingStop,
  currentStop,
  randomMode,
  jackpotNote,
  spinToken,
  revision
}
```

候选动作：

- `ARM { entropy, randomMode, jackpotNote }`：仅 `intro` 有效；验证 mode/entropy/纯文本结语，创建完整冻结 plan，把 mode 与结语纳入 state 后进入 `ready`；正常应用只使用 `createArmAction` 生成它；
- `PULL`：仅 `ready/result` 有效；立即锁定下一 stop，写入单调 token，进入 `spinning`；
- `SETTLE { spinToken }`：仅 token 精确匹配当前 spinning 有效；公开 stop 并进入 `result/jackpot`；
- `SUSPEND`：仅 spinning 有效；调用同一 settle 核心，不能丢弃已锁定 stop 让用户重抽；
- `RESTART`：仅 jackpot 有效；回到新 intro，但 revision/token 基数继续单调，防止上一局旧回调撞中新局；
- 其余阶段/动作组合为同引用 no-op；revision 达安全整数上界后有效动作也 no-op。

终局同一个“再夸一局”按钮在一次原生 click 中先派 RESTART，再立即收集新 entropy、调用 `createArmAction` 并派 ARM；不要求第二次点击。crypto 方案失败时必须尝试冻结 fallback。若连经测试应永远合法的 fallback 也无法建计划，则保留 intro、显示可见诊断“暂时没排好，请重试准备”，同一按钮改为“重试准备”并保持焦点；不得白屏或伪造结果。

浏览器可以用 Web Animations 或原创 CSS transition 表现三列错峰停止，但只有一个会话级完成器。完成 Promise、事件和 timeout fallback 都必须携带本轮 token；任一路先到即清理其余监听，后到回调因 phase/token 不匹配成为 no-op。W3C Web Animations 明确把等待动画完成作为脚本接口用例，但规则结果仍必须先于动画确定。

## 8. Public view 与秘密边界

`getPublicView(state, config)` 建议只返回：

```js
{
  phase,
  columns: [{ id, label, text }],
  praise,
  revealedPraises,
  spinCount,
  maxSpins: 6,
  guaranteedBy: 6,
  isSpinning,
  canPull,
  isJackpot,
  jackpotNote,
  animationToken,
  randomMode,
  revision
}
```

- intro/ready 的 `columns.text` 与 `praise` 为空；
- spinning 可以保留上一条已经公开的夸奖，但不得公开 pending stop；
- result/jackpot 才公开本次三段和完整句；
- `revealedPraises` 只包含已经 settle 的历史，不包含未来 stop；
- `jackpotNote` 只有 `phase === "jackpot"` 时返回已解析文本；intro/ready/spinning/result 必须精确返回 `null`，即使内部 state 已在 ARM 时保存结语；
- 不公开各列 signature ID、精确剩余次数、entropy、计划或测试 fixture；
- 配置明文仍在本地 `config.js`，这不是密码学保密；本作只保证正常页面流程不提前显示未来组合。

## 9. Hostile input 与配置策略

沿用仓库近期纯逻辑边界：

- public object 必须是精确 own string keys、`Object.prototype`、data descriptor；
- public array 必须是当前 realm 的原生 dense Array、精确索引与 length；
- 拒绝 accessor、symbol、extra key、稀疏数组、数组子类、null/custom prototype、自定义 iterator/map；
- 顶层与嵌套输入先做一次 descriptor snapshot，验证与后续逻辑只消费内部快照；
- `ownKeys/getOwnPropertyDescriptor/getPrototypeOf` trap 抛错时 fail closed；
- 合法 data descriptor Proxy 即使 `get` late-throw，也不得触发属性读取；
- 合法 state + 非法 action 返回原引用；非法 state 的 reduce 返回全新 intro；
- `buildSpinPlan` 非法返回 `null`；`getPublicView` 非法返回安全初态 view；
- 所有成功输出递归冻结、断开调用方引用，不修改 entropy/config/action/state。

配置提供一个 5–10 行学习钩子：

```js
composeJackpotNote(summary) {
  // 根据已经揭晓的共同夸奖，返回一段只属于 TA 的纯文本结语。
}
```

summary 只含收件人称呼、揭晓句子、拉动次数和签名组合，不含未来计划、熵或内部 ID；调用前复制并递归冻结。抛错、thenable、非字符串、空白或超长时回退默认结语，且不能改变计划、规则或资产路径。

composer 只由 `createArmAction` 在会话准备时调用一次：helper 先从完整 plan 投影出“截至 jackpot 的将来完成摘要”，再解析安全纯文本并放入 ARM action。reducer、`getPublicView` 和日志重放都只消费 action/state 中已经解析的 `jackpotNote`，绝不再次调用 composer。这样即使用户函数读取闭包计数、Date 或随机数，也只影响新会话准备时写入 action 的文本，不会让同一 action log 重放出不同 view。

## 10. 输入、焦点与可访问性

- 把手是一个持久存在的原生 `<button type="button">`；只监听 `click`，让鼠标、触屏、Enter 和 Space 走同一条原生激活路径；
- 不同时绑定 `pointerdown/touchend/keydown` 触发 PULL，避免一次手势多拉；视觉把手子元素 `pointer-events:none`；
- 允许 keydown 只承担去重而不派 PULL：聚焦把手时记录 Enter/Space 的物理 held 集合；首次 keydown 保留原生 click，`event.repeat` 或仍 held 的后续 keydown 只 `preventDefault`，keyup/blur 清除对应 held；
- pointer/touch 仍只由原生 click 派 PULL；`click.detail > 1` 一律忽略，并对 `detail > 0` 的已接受 click 使用独立于动画时长的 350ms monotonic `event.timeStamp` 门控，避免双击/双击 tap 在同步 settle 后拉两次；detail 为 0 的键盘/辅助技术 click 不套 pointer 时间窗；
- 上述 activation gate 只过滤浏览器输入，不进入 reducer、不改变计划，也不能用 Date/随机或动画完成时间判断；初始 reduced motion、旋转中切 reduce、hidden 立即 settle 与正常动画都走同一门控；
- spinning 时按钮同步 disabled、文案为“正在组合…”，但 reducer phase 才是权威门；
- 正常结算不移动焦点，复用同一个按钮节点；终局原位变成“再夸一局”；
- 三列不是可选择控件，不使用虚构的 slotmachine/listbox/option role；
- 动画条目全部 `aria-hidden="true"`，稳定的三列标签和最终短语按 `moment → shine → echo` 顺序存在；
- 页面只有一个预先存在的 `role="status" aria-live="polite" aria-atomic="true"`。普通 settle 一次性播报“本局第 n 次：{完整句}”；jackpot settle 只写一次“特别同频已出现：{完整句}。私人结语已展开。”，长结语本身留在后续 DOM 供用户按顺序阅读；
- 特别同频必须有文字和结构标记，不能只用金色、彩纸或声音；
- reel 容器 spinning 时可用 `aria-busy="true"`，不使用 `aria-pressed`；
- hidden、pagehide 或旋转中切换 reduced motion 时立即 SUSPEND/settle 已锁定结果，清理视觉回调，不重抽；
- blur 不应让一个 click 结果丢失；若页面确实离开前台，同样 settle 当前 token。

WAI-ARIA 将 `status` 定义为 live region；动态内容应更新已经存在的 status，而不是在结算时临时创建。W3C 对交互触发动画的说明要求支持用户的减少动态效果偏好，本作在 reduced motion 下取消高速纵移、摇杆甩动、缩放、模糊和庆祝粒子，直接显示同一个权威结果。

## 11. A 级本地边界

- 经典脚本顺序使用普通相对资源，不用 ES Module、dynamic import、fetch、XHR、WebSocket、CDN 或远程字体；
- 双击 `index.html` 与根门户进入均可完成；
- 不使用账号、服务端、数据库、Service Worker、local/session storage、cookie、分析、分享或权限请求；
- 不打包第三方运行库，根 `package.json` 不新增依赖；
- 文字、主按钮和结果为 code-native；图片缺失时纯 CSS 纸卷和文本仍能完成；
- 不录音、不读取照片、相机、麦克风、定位、陀螺仪或剪贴板；
- 无 JavaScript 时显示静态说明，不显示伪造结果；
- 所有配置文本只经 `textContent` 写入，不解释 HTML。

## 12. 开源项目审计与借鉴声明

本轮只研究固定版本的抽象机制和权利边界，没有复制源码、API、随机算法、缓动公式、测试、默认参数、DOM、CSS、图片、音频、字体、Logo、品牌、赌场图案或文案。正式实现保持零第三方运行依赖；若未来实际复用代码或素材，必须重新审计并保留对应许可证与版权文本。

| 项目 | 固定版本与许可证 | 仅研究的抽象点 | 明确未复制或引入 |
| --- | --- | --- | --- |
| [nuxy/slot-machine-gen](https://github.com/nuxy/slot-machine-gen/tree/56c9017e839583dcb8fcb5cc88b08b30ed63f66a) | commit `56c9017e839583dcb8fcb5cc88b08b30ed63f66a`；MIT；Copyright (c) 2020–2025 Marc S. Brooks | 独立 reel、结果预选、错峰停止、全部停止后统一返回 | 源码/API/CSS/3D 圆柱参数、权重、赔率、payline、示例图片/音频和 biased 逻辑；不作为依赖 |
| [davidbau/seedrandom](https://github.com/davidbau/seedrandom/tree/4460ad325a0a15273a211e509f03ae0beb99511a) | commit `4460ad325a0a15273a211e509f03ae0beb99511a`；README 内 MIT 全文；Copyright 2019 David Bau | 随机源应局部封装，测试结果应可固定重现 | ARC4/Alea/xor PRNG、熵收集、状态序列化、测试向量和全局 Math.random 修改；不作为依赖 |
| [tweenjs/tween.js](https://github.com/tweenjs/tween.js/tree/20079e65f77bb2b8e52cc9d7dbed044b86e537d3) | commit `20079e65f77bb2b8e52cc9d7dbed044b86e537d3`；MIT；Copyright (c) 2010–2012 Tween.js authors；Easing equations Copyright (c) 2001 Robert Penner | 起终点、持续时间、错峰停止、完成回调与规则分层 | Tween/Group/Easing 源码/API、Penner 缓动公式、参数、示例、测试和截图；不作为依赖 |
| [catdad/canvas-confetti](https://github.com/catdad/canvas-confetti/tree/20eebad51dde793070c373d594099a7ed8d96e22) | commit `20eebad51dde793070c373d594099a7ed8d96e22`；ISC；Copyright (c) 2020, Kiril Vatev | 庆祝表现与结果分离、动画清理、reduced-motion 降级 | 粒子物理、worker、Canvas、位图缓存、Promise 协调、默认参数/配色/形状和演示素材；不作为依赖 |

`nuxy/slot-machine-gen` 自述可创建 “extremely biased” 机器；本作明确不借鉴其偏置、权重、下注或派奖逻辑，只研究“多列视觉停止后返回文本结果”的职责分层。

### 排除来源

- [josex2r/jQuery-SlotMachine 固定 commit `bf436495aaf84cea5808734371649850e9704325`](https://github.com/josex2r/jQuery-SlotMachine/tree/bf436495aaf84cea5808734371649850e9704325) 的根 LICENSE 和 `package.json` 是 GPL-3.0-only，但 README 声称 MIT；按更明确的 LICENSE/package metadata 视为 GPL，并完全排除代码复制或依赖引入；
- 无仓库级许可证的单文件 Gist 只作发现线索，不进入正式借鉴清单；
- 只有 PNG/音效却没有作者和素材许可链的仓库全部排除；
- 商业 Unity 插件、赌场机台截图、真实品牌 Logo、BAR/数字 7/铃铛/樱桃/金币图稿和特色 trade dress 全部排除。

### 本作借鉴声明建议文本

> 本作是独立实现的文字夸奖生成器，不包含付费、下注、余额、赔率、派奖、兑换或现金奖励。开发前只研究了 Slot Machine Generator 的独立转轮与结果预选、seedrandom 的局部可重现随机源、Tween.js 的动画/规则分层，以及 canvas-confetti 的庆祝生命周期与减少动态效果原则；未复制、翻译、改写、链接或打包上述项目的源码、API、随机算法、缓动公式、默认参数、测试、界面、文案、Logo、截图、字体、图案、音频或其他素材。固定版本、许可证、版权主体和排除范围见 `docs/178-compliment-reels-research.md`。

## 13. 浏览器标准与官方校准

- [W3C Web Cryptography Level 2](https://www.w3.org/TR/webcrypto-2/)：`getRandomValues` 的随机值接口与整数 typed array 边界；
- [W3C Web Animations Level 1](https://www.w3.org/TR/web-animations-1/)：动画完成、取消、Promise 与脚本等待模型；
- [WAI-ARIA 1.2](https://www.w3.org/TR/wai-aria/)：`status` live region 的语义；
- [WCAG 2.2 状态消息说明](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html)：不移动焦点也要让辅助技术感知结果；
- [WCAG 2.2 重排说明](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html)：320 CSS px 下避免二维滚动；
- [WCAG 2.2 目标尺寸说明](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html)：主把手按更宽松的至少 48×48 CSS px 实现；
- [WCAG 交互动画说明](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html)：reduced motion 下取消非必要位移动画。

这些标准用于实现校准，不是第三方代码或素材来源。

## 14. 视觉方向与商标边界

视觉采用“桌面夸夸印刷机”，而不是赌场机柜：

- 三条竖向纸卷在同一压纸框里错峰滑动，最终拼成一张完整便签；
- 深梅红机身、奶油纸、珊瑚把手、墨蓝正文和少量黄铜压边；
- 特别同频用静态星形压印、双线边框和明确文字共同表达；
- 不出现 BAR、7、铃铛、樱桃、金币、筹码、余额、赔率、payline、现金、提现或赌场品牌；
- 不用赌场投币/派奖录音；若以后加声音，只用本地 Web Audio 合成的非关键纸铃提示，并保留静音等价；
- Unicode emoji 可以作为文本，但不从系统或商业 emoji 字体导出位图；
- ImageGen 只生成无字纸纹/机身背景和可分离装饰，不烘焙真实 UI 文本、按钮、列答案或规则；
- 资产失败时 CSS 边框、原生文本和按钮仍是完整体验。

响应式 Gate：

| 视口 | Gate |
| --- | --- |
| 1504×1046 | 无横纵滚动；题名、三列、完整句、保证说明与主把手同屏 |
| 1280×800 | 无横向滚动；三列压纸框不小于 720×300；当前结果与主动作同屏 |
| 390×844 | 三列仍并排且各列可换行；完整句在下方全宽；按钮至少 48px 高 |
| 320×568 | 零横向溢出；合法最大文本允许按原 DOM 顺序堆叠三列；保留段标签与完整句，允许纵滚 |

390 CSS px 及有足够空间时优先使用 `repeat(3,minmax(0,1fr))` 并排。320×568、200% 文本缩放，以及桌面 400% zoom 形成约 320 CSS px 布局视口时，允许三列按原 DOM 顺序垂直堆叠；必须保留“第一段/第二段/第三段”连接提示、完整句、状态和主按钮，且不产生二维滚动。所有适用档位用两个称呼和 18 条短句同时达到合法最大字素的配置验收 forced-colors、reduced-motion、图片阻断、焦点环、safe-area、按钮中心 `elementFromPoint()`、控制台和网络。

## 15. 测试与进入规格的 Gate

纯逻辑至少覆盖：

1. 两个称呼、三列短句和结语的精确 Unicode 字素边界、递归冻结与整份回退；
2. 默认 216 组合的非空、唯一、标点与长度，并保留人工语义审稿记录；
3. entropy 拒绝采样边界、耗尽、fallback 与多组固定 fixture；
4. jackpotSpin 覆盖 3/4/5/6；每列完整排列、特别同频唯一、前两次普通；
5. ARM/PULL/SETTLE/SUSPEND/RESTART 阶段、计数与 token 不变量；
6. 错 token、重复 settle、旧回调、完成后继续拉、revision 上界均不改变状态；
7. pending/future plan 不进入 public view；jackpotNote 在前四阶段精确为 null、只在 jackpot 公开；正常/reduced/timeout 三路径得到相同权威结果；
8. ARM action 已包含一次性解析结语；JSON action log 与 clone 日志在同一清洗配置下重放到字节等价 jackpot view，且重放不再调用 composer；
9. descriptor snapshot、Proxy trap、accessor、symbol、extra key、数组子类/custom map/iterator 等 hostile 矩阵；
10. 生产 logic 无 crypto/random/Date/DOM/timer/network/storage。

浏览器至少覆盖：

1. 鼠标 click、真实 tap、Enter、Space 各只增加一次 pull；长按 Enter/Space、快速双击和双击 tap 不重复结算；normal、初始 reduced、旋转中切 reduce、hidden 同步 settle 四条路径分别覆盖 activation gate；
2. 三 reel 多次 completion、错误事件、fallback 后迟到事件、重开前旧回调都只结算一次；
3. spinning 时切 reduced motion、hidden、pagehide 或 blur，立即 settle 已锁定结果且不重抽；
4. 主按钮焦点持续可见；每次只产生一条 polite announcement；动画条目不被读屏逐帧读取；
5. 特别同频在 forced-colors 和无动画下仍有文字/结构标识；
6. 320/390/768/1280、200% 文本、400% zoom、横竖屏和所有字段同时取合法最大字素的配置无横向溢出；
7. `file://` 双入口、断网、图片失败、无 JS 提示、零公网请求、零 console error；
8. README/ATTRIBUTION 固定四个来源、许可证、版权主体、排除项和零复制边界。

## 16. 推荐进入下一阶段

下一步冻结题名“每一格，都是喜欢你的理由”、目录 `compliment-reels`、18 条默认短句、三枚 signature ID、216 句审稿表、64 项 entropy 合同、六抽协调洗牌、五阶段 reducer、单调 token、public view、配置学习钩子、焦点/live/reduced-motion 和验收矩阵。

视觉仍需按前端构建流程先生成完整桌面进行态、移动重排态和特别同频终局概念，再提取设计系统与实现计划；在图像偏好确认前，调研与纯逻辑规格可以继续推进，但不提前编写页面实现。
