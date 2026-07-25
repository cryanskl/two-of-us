# “影子剑术”非视觉核心再验收

- 验收日期：2026-07-25
- 基线：`b9bddfe31b9559b3fe095fd010e6a4591a074257`
- 作品目录：[`../experiences/versus/shadow-sword-duel/`](../experiences/versus/shadow-sword-duel/)
- 冻结规格：[`220-shadow-sword-duel-spec.md`](./220-shadow-sword-duel-spec.md)
- 验收范围：规则、状态、公开投影、历史重放、敌对输入、来源声明与机制去重
- 明确不在范围：HTML、CSS、app、catalog、Board、launcher、共享依赖与视觉验收

## 1. 结论

本轮未发现新的非视觉核心缺口，因此没有修改生产代码，也没有新增 `bugs/` 或
`learn/` 记录。

核心 Gate 通过：

- 两席在 5,184 组存活资源快照与动作对上满足镜像对称；
- 攻、防、闪、蓄及先机/气/体力的联合结算与独立 oracle 逐项一致；
- 双攻、双 KO 和资源变化基于同一 before snapshot 原子发生；
- 历史是唯一资源真相，JSON 往返与逐回合 replay 确定；
- 第一席封招后，handoff、第二席 choosing 与 ready-to-reveal 的公开投影不可由
  第一席动作区分；
- state/action/config/history 的 getter、accessor、稀疏数组、额外字段、异常 Proxy
  和原型污染边界 fail closed；
- 生产逻辑不读取 DOM、网络、存储、随机、时钟、动画帧或共享运行时；
- 借鉴声明固定版本、许可证、零代码复制、零生产素材复制与品牌排除边界完整。

这不是“作品已可玩”的验收。当前目录只有 `config.js`、`logic.js`、测试和借鉴
声明，没有 `index.html`、`app.js` 或 `styles.css`；它仍等待已冻结视觉方案确认后
才可进入前端实现。

## 2. 实时碰撞与 fixed tick 的适用性

本轮没有把另一种游戏强加给现有规格。

[`220-shadow-sword-duel-spec.md`](./220-shadow-sword-duel-spec.md) 明确排除实时移动、
碰撞、连招、反应速度和节奏判定；[`219-shadow-sword-duel-research.md`](./219-shadow-sword-duel-research.md)
也明确选择“血量 + 气 + 先机”的离散热座路线。因此：

| 要求 | 本项目判定 | 本轮实际 Gate |
| --- | --- | --- |
| 碰撞确定性 | 不适用 | 攻击命中、格挡、闪避与双 KO 的离散联合结算 |
| fixed tick | 不适用 | reducer action 序列和已揭晓事件历史 |
| replay | 适用 | `replayHistory(history)` 从初态严格重放，不保存第二份当前资源 |

`soft-sumo` 才是仓库中物理、持续输入和 fixed tick replay 的路线；“影子剑术”不得
为了通过名义检查而引入坐标、速度、Canvas 或时间累积器。

## 3. 两席公平与攻击确定性

定向测试覆盖三层证据：

1. 初始资源下 16 组动作对逐项检查命中、耗气、耗先机、回气、获先机和 after；
2. 对任意左右动作交换席位后，`playersBefore`、`actions`、`hit`、六项资源效果与
   `playersAfter` 都严格镜像；
3. 穷举 18 个存活玩家快照 × 18 个对手快照 × 16 个动作对，共 5,184 组输入，
   逐项对照测试文件中的独立规则 oracle。

穷举同时确认：

- 零气不能攻击，非法组合返回 `null`，不发生部分结算；
- 体力始终在 0–3，气始终在 0–2，先机始终为布尔值；
- 带先机攻击可破普通防守，攻击后先机消耗；
- 闪避攻击、未受伤蓄力、满气不溢出；
- 双方攻击同一 before snapshot，双 KO 可原子得到平局。

首行动席由历史事件的 `firstSeat` 严格按 `0,1,0,1,...` 交替。它只决定单设备
交接顺序，不参与伤害公式，所以不会给某一固定席位结算优势。

## 4. replay 与终局

`replayHistory` 只接受最多九条、从第 1 回合连续编号且首行动席交替的精确事件。
每条事件在当时资源快照上重新检查动作合法性并调用同一个 `resolveRound`。

测试已固定：

- 深克隆与 JSON 往返历史得到相同 effects、players 和 result；
- 断号、错 `firstSeat`、零气攻击、超长、稀疏、数组子类、symbol、异常 Proxy、
  终局后续事件全部返回 `null`；
- 第 1–8 回合的安全序列不提前结束；
- knockout、double KO、体力决胜、气决胜和九回合平局五条终局路径均可达；
- reducer 的六阶段流转、revision 饱和与终局 RESTART 可重复确定。

state 不保存 `currentHealth`、`currentEnergy`、`winner` 等平行权威字段；公开资源和
战报均从历史重放派生。

## 5. public view 隐私

隐私测试覆盖第一席四种秘密、第二席四种秘密和 ready 的 16 种组合：

- 第一份封招后的 handoff view 不因具体动作改变；
- 第二席 choosing view 可以公开四个可选动作，但不含第一席的封招值；
- ready-to-reveal view 不含两席动作值；
- 只有 `REVEAL` 后的 round-result 才公开本轮动作和效果；
- 未揭晓 view 不含 `sealedActions`、`draftAction` 或可推断秘密的差异字段。

额外人工探针依次走过 intro、第一席选择/确认、handoff、第二席选择/确认和 ready；
在 handoff 与 ready 的序列化 view 中没有发现 `attack` 或 `guard` 秘密值。选择阶段
出现四个公开动作选项属于必要规则信息，不是秘密泄露。

## 6. 敌对输入边界

现有测试要求所有公开 action 为精确普通对象或 null-prototype data record，并要求
冻结 state 满足全部嵌套不变量。非法 action 对合法 state 是同引用 no-op；畸形
state 安全回到全新默认初态。

本轮另用 revoked Proxy 覆盖 12 个公开调用位：

- `sanitizeConfig`；
- `createInitialState`；
- `getPlayersBeforeRound`；
- `isActionAvailable` 的 player 与 move；
- `resolveRound` 的 players 与 actions；
- `replayHistory`；
- `reduce` 的 state、action 与 action type；
- `getScreenView`。

结果为 `12 / 12` 均未抛异常。descriptor 快照测试还确认 state/action 各属性只观察
一次，不触发 property getter。模块加载时的 `ShadowSwordConfig` API 是同目录
`config.js` 提供的受信依赖，不属于用户可编辑的配置 candidate；用户配置仍统一经
`sanitizeConfig` fail closed。

## 7. 机制去重

| 邻近作品 | 共享的通用经验 | “影子剑术”的独立核心 |
| --- | --- | --- |
| `sealed-rps` | 两份秘密收齐后揭晓 | 无固定 `beats` 表；有跨回合体力、气、先机和动作合法性 |
| `secret-recipe-code` | 单设备交接和秘密退出公开投影 | 无猜码、同位/错位反馈或角色交换解谜 |
| `memory-bid` | 两席轮换和有限局制 | 每回合双方提交并在同一 before snapshot 联合结算 |
| `soft-sumo` | 对称规则、原子双败、确定性重放 | 无物理、坐标、碰撞、持续输入、fixed tick 或 Canvas |
| `reaction-duel` | 平局和重新开始 | 不读取真实时间，不以抢按或抢跑决定结果 |

结论：交接/遮密是仓库级可复用隐私原语，玩法本体是资源约束的四动作联合结算，
没有把猜拳换皮，也没有与实时动作对抗重复。

## 8. 来源、许可证与资产

[`ATTRIBUTION.md`](../experiences/versus/shadow-sword-duel/ATTRIBUTION.md) 已固定：

- OpenSpiel commit `112b77704631fc2ce7ad8e4581f6ca09798ce15a`，Apache-2.0；
- boardgame.io commit `65ca73beb62ef2afd980bb9f569b10dabfc60075`，MIT；
- PrinceJS commit `ea1a97a763ac78fee5b35129e2841ef31531328e`，Unlicense；
- W3C WCAG 2.2，W3C Document License 2023。

声明逐项写明只借鉴建模术语、公开产品描述、被排除路线与可访问性标准；未复制或
引入代码、API、算法、测试、文案、页面、CSS、角色、地图、精灵、音频或第三方
资产。PrinceJS 的开源许可不被误解为商业品牌或原作素材授权。

三张 ImageGen 概念图只存在于
[`assets/shadow-sword-duel/`](./assets/shadow-sword-duel/)，
[`GENERATION.md`](./assets/shadow-sword-duel/GENERATION.md) 记录无输入图片、无外部
参考图、提示摘要、像素与 SHA-256，并明确禁止进入生产运行时。当前生产生成资产
仍为零。

## 9. 自动化结果

| 检查 | 结果 |
| --- | --- |
| `node --check` config / logic / test | PASS |
| `node --test experiences/versus/shadow-sword-duel/logic.test.js` | 29 / 29 PASS |
| revoked Proxy 公开入口探针 | 12 / 12 不抛异常 |
| `npm test` | 2,284 / 2,284 PASS |
| `npm run verify` | 58 个作品入口、1 个能力声明 PASS |

`npm run verify` 中的 58 个入口不包含尚无 HTML 的“影子剑术”；这是正确边界，不把
纯逻辑目录冒充已安装作品。

## 10. Gate 与后续

| Gate | 状态 |
| --- | --- |
| 非视觉规则核心 | PASS |
| 两席公平、攻击确定性、replay | PASS |
| public view 隐私 | PASS |
| hostile state/action/config/history | PASS |
| 来源与借鉴声明 | PASS |
| 机制去重 | PASS |
| 可双击游玩 | BLOCKED BY DESIGN |
| UI、响应式、浏览器与视觉 fidelity | NOT RUN / OUT OF SCOPE |

下一阶段仍须先取得
[`222-shadow-sword-duel-design-proposal.md`](./222-shadow-sword-duel-design-proposal.md)
的视觉确认，再按计划实现 `index.html`、`app.js`、`styles.css`、README 和 catalog
接入；完成后另做真实 `file://`、localhost、双席完整对局、三档响应式、键盘/触控、
隐私 DOM 与视觉 fidelity 验收。
