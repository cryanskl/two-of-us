# “影子剑术”分步实施计划

- 日期：2026-07-23
- 状态：核心已完成；视觉方案待用户确认，生产 UI 尚未开始
- 调研：[`219-shadow-sword-duel-research.md`](./219-shadow-sword-duel-research.md)
- 规格：[`220-shadow-sword-duel-spec.md`](./220-shadow-sword-duel-spec.md)
- 工作 ID：`shadow-sword-duel`
- 目标目录：`experiences/versus/shadow-sword-duel/`
- 启动等级：A（`file://` 直开、零安装、零服务、零权限、零公网）
- 运行依赖：零新增；浏览器 UMD/经典脚本 + 根仓库 Node ESM 测试

## 1. 提交纪律与总顺序

本作按“每完成一个项目或者一部分，就提交一次”拆成互不混杂的部分：

```text
04986a9  docs: research shadow sword duel
1e3ffc4  docs: specify shadow sword duel
fb12a2e  docs: align shadow sword stylesheet contract
0906853  docs: plan shadow sword duel implementation
44fc7ce  docs: define shadow sword revision saturation
30bf117  feat: add shadow sword duel core logic
545a209  docs: propose shadow sword duel visual system
用户确认
批次二    feat: build shadow sword duel local UI
批次三    docs: register and attribute shadow sword duel
真实 bug  fix: ...（每个已复现问题单独）
批次四    docs: verify shadow sword duel
```

每次 commit 前重新运行：

```bash
git branch --show-current && git rev-parse --show-toplevel
```

预期根目录必须是 `{repo-root}`，当前分支与 worktree 必须属于
本任务。子代理只负责边界明确的文件或只读审查，不 stage、不 commit；主线程负责
核对用户现有改动、测试、暂存和提交。

前一批未提交前不开始修改后一批文件。若后一批发现前一批合同缺陷，先停止当前
批次，用独立修复提交恢复前一批 Gate，再继续。

截至 2026-07-24，批次一已由 `30bf117` 完成并复核：27 项定向测试、5,184 组
资源/动作候选枚举、全仓 1,794 项测试及 57 个入口校验均通过。当前不得重复实现
核心；下一步仍是等待用户确认 `222-shadow-sword-duel-design-proposal.md` 的视觉
方向，确认前不得开始批次二。

## 2. 视觉确认前后的权限边界

### 2.1 用户确认前可以完成

- 本计划；
- `config.js`、`logic.js`、`logic.test.js`；
- 纯逻辑安全、状态、重放、隐私投影与对称性审查；
- docs-only 视觉概念、生成台账与 `docs/assets/shadow-sword-duel/` 概念图；
- 固定来源、许可证和借鉴边界的继续复核。

### 2.2 必须等用户明确确认

- 生产 `index.html`、`app.js`、`styles.css`；
- 任何生产视觉资产、视觉排版与正式动效；
- UI Chrome 验收；
- catalog 的 `installed: true`；
- 创意池“已实现”标记；
- 最终 verification。

视觉概念 PNG 不进入生产目录。用户只确认设计方向，不改变规格冻结的规则、隐私、
焦点和本地启动合同。

## 3. 固定工程合同

- 不新增目录级 `package.json`、npm 包、构建器、框架、jsdom 或第二套测试运行时；
- `config.js` 和 `logic.js` 用与相邻 A 级作品一致的浏览器 UMD 全局暴露；
- `logic.test.js` 在根 ESM 环境用 side-effect `import()` 读取同一生产文件；
- 生产脚本顺序固定为 `config.js → logic.js → app.js`；
- 页面不使用 module、fetch、storage、随机、真实时间、网络、权限、音频、Worker、
  service worker、远程字体、远程图片或商业素材；
- app 只消费 `getScreenView()`，不能读取 sealed state、重算命中或自行判断终局；
- file 与 localhost 必须走同一逻辑；localhost 证据不能冒充 file 直开证据；
- README 与 ATTRIBUTION 都保留固定来源、许可证、实际借鉴、排除项及零代码/
  零资产复制声明。

## 4. 批次一：config、logic、定向测试

### 4.1 唯一可写文件

```text
experiences/versus/shadow-sword-duel/config.js
experiences/versus/shadow-sword-duel/logic.js
experiences/versus/shadow-sword-duel/logic.test.js
```

目录不存在时只创建目录和这三个文件。不得创建 HTML、app、CSS、README、
ATTRIBUTION、assets、experience metadata 或 catalog 占位。

### 4.2 文件职责

`config.js`：

- 暴露递归冻结的 `DEFAULT_CONFIG` 和最小用户配置；
- 默认名字与 finalNote 完整可玩；
- 不包含规则、动作、HTML、URL、样式或函数。

`logic.js`：

- 实现规格常量、配置清洗和精确普通对象/数组 schema；
- 实现资源级 `isActionAvailable`；
- 实现 `resolveRound` 联合快照与非法输入 `null`；
- 历史作为唯一资源真相，实现 replay、终局和 effect 派生；
- 实现六阶段 reducer、0/1-secret handoff、COVER/RESUME 和深相等 RESTART；
- 实现 exact screen view，不公开 sealed action；
- 对 malformed state 走默认安全初态合同；
- 所有可信返回递归冻结、断开引用。

`logic.test.js`：

- 使用独立期望和性质测试，不复制生产实现；
- 通过生产导出读取常量和默认配置，不维护第二份规则库存；
- 对资源穷举和 replay 使用独立 oracle 或显式表，不让被测 reducer 自证。

### 4.3 测试组 A：配置与 hostile input

- 默认、缺失字段、`undefined`、名字整对回退、finalNote 单字段回退；
- Unicode code point、trim、控制字符、孤立代理项；
- getter/setter、symbol、额外 key、自定义原型、数组子类、稀疏数组；
- Proxy ownKeys/getOwnPropertyDescriptor 异常；
- 配置、state、view、history、effect 的递归冻结与断引用；
- 普通对象 `Object.prototype` / `null` 原型白名单。

### 4.4 测试组 B：联合结算

枚举所有有生命的合法玩家资源快照和 16 个动作对：

- 普通攻/防、先机攻/防、任意攻/闪、攻/蓄、攻/攻；
- 命中、花气、消耗先机、保留被破防者旧先机；
- 成功防守取得先机，空防与被破防不取得；
- 未受伤蓄力加气，受伤不加，满气不溢出；
- 零气 attack 非法，任一输入非法精确返回 `null`；
- `0 ≤ health ≤ 3`、`0 ≤ energy ≤ 2`、initiative 始终 boolean；
- 交换 players/actions 只交换 seat-indexed effect，不改变规则。

### 4.5 测试组 C：event history 与终局

- 空历史派生初始资源；
- roundIndex 连续、firstSeat 严格 `0,1,0,1,...`；
- actions 数组 exact own keys，拒绝额外字段、getter、Proxy 和稀疏项；
- JSON 往返与深克隆历史得到相同 players/effects/result；
- 无气 attack、死后事件、终局后追加、十回合与伪 firstSeat 返回 `null`；
- 单 KO、double KO、health winner、energy winner、round-limit draw；
- 第 1–8 回合未终局不得提前结束，第 9 回合必定产生 result。

### 4.6 测试组 D：reducer 与 screen view

- 首回合 START 直接 choosing，不产生 0-secret handoff；
- 第一份 CONFIRM 产生 1-secret second-seat handoff；
- NEXT_ROUND 产生 history 非空的 0-secret round-start handoff；
- CHOOSE 改草稿、CONFIRM 封招、REVEAL 才追加历史；
- COVER 清草稿但不封招、不换席、不揭晓，RESUME 不恢复草稿；
- 全部非法 action 同引用 no-op 且 revision 不变；
- `Number.MAX_SAFE_INTEGER` 饱和时所有非 RESTART action 同引用 no-op，终局
  RESTART 仍恢复 revision 0；
- RESTART 与默认 createInitialState 深相等；
- 每阶段 common keys、controls 与额外字段精确；
- 非当前阶段字段必须不存在；
- 第二次 choosing 和 ready view 均不含任一已封动作；
- malformed reducer/view 回默认 intro，不抢救部分秘密。

### 4.7 子任务与审查

一个实现子任务只负责上述三个新文件；另一个只读审查任务重点验证：

- resolveRound 是否真的先算双方再统一写回；
- replay 是否是资源唯一真相；
- 0/1-secret handoff 是否都只接受可达状态；
- hostile object 是否触发 getter/Proxy；
- screen view 是否可能通过 key、selected 标记或错误文案泄露 sealed。

主线程必须逐项对照规格，不把子任务“完成”当作验收。

### 4.8 命令与完成证据

```bash
node --check experiences/versus/shadow-sword-duel/config.js
node --check experiences/versus/shadow-sword-duel/logic.js
node --test experiences/versus/shadow-sword-duel/logic.test.js
npm test
npm run verify
git diff --check
```

完成必须有：

- 定向测试覆盖四组 Gate；
- 合法资源/动作穷举与席位交换性质全绿；
- 至少一条九回合 golden replay 和一条提前 double KO；
- 生产逻辑静态扫描确认无 DOM、时间、随机、网络、storage 或运行时 hook；
- 全仓测试、verify 与 diff check 退出码均为 0。

建议提交：

```text
feat: add shadow sword duel core logic
```

## 5. 视觉 Gate：docs-only 概念

### 5.1 允许写入

```text
docs/222-shadow-sword-duel-design-proposal.md
docs/assets/shadow-sword-duel/<concept files>
docs/assets/generation-ledger.md
README.md
docs/README.md
```

若编号 222 已被占用，主线程选择下一个空闲编号并同步索引。

### 5.2 必须表达的状态

至少覆盖三张完整状态，而不是孤立情绪图：

1. desktop choosing：当前席、双方公开资源、四动作、草稿与封招按钮；
2. mobile ready-to-reveal：两份动作仍不可见，只有中性共同揭晓；
3. desktop round/match result：双方动作、伤害、气与先机变化、下一步。

设计提案必须记录：

- 采用/拒绝的概念元素；
- 颜色、字体、间距、触控、焦点与 reduced-motion 令牌；
- 320×568 到 1440×900 的响应式行为；
- 概念图文字错误、不可实现装饰与隐私偏差；
- 生成模型、提示词、时间、输入、输出与许可证/使用边界；
- 概念图不进入生产运行时的声明。

概念提交后暂停生产 UI，等待用户明确确认。建议提交：

```text
docs: propose shadow sword duel visual system
```

## 6. 批次二：生产 HTML、app、CSS

### 6.1 唯一可写文件

```text
experiences/versus/shadow-sword-duel/index.html
experiences/versus/shadow-sword-duel/app.js
experiences/versus/shadow-sword-duel/styles.css
```

批次一文件是冻结输入。若 view/API 不足或发现逻辑 bug，停止 UI，用独立核心修复
提交解决；不得在 app 复制规则。

### 6.2 实施职责

- 语义 HTML、no-JS 提示与经典相对脚本；
- app 状态留在闭包，不挂到 window；
- renderer 只消费 screen view，每次用 `replaceChildren` 销毁上一阶段秘密节点；
- 四动作原生 button，零气 attack 真实 disabled；
- 生命周期只派发 COVER，不直接改 draft/sealed/phase；
- 阶段标题、live region、焦点落点按规格；
- CSS 实现用户确认的设计，不把概念图当生产背景截图；
- reduced-motion、200% 文本、44×44 目标和规格冻结的四档视口；
- 任何动画只消费 effect，不监听动画结束推进规则。

### 6.3 禁止项

- 不改 config、logic、tests；
- 不创建 README、ATTRIBUTION、catalog 或 verification；
- 不使用 `innerHTML`、eval、module、fetch、storage、网络、音频或远程资源；
- 不用 hidden/template/data attribute/aria-label 保存 sealed action；
- 不根据 DOM class、CSS 动画或 viewport 判断命中和胜负。

### 6.4 UI 冒烟与提交 Gate

使用 Chrome MCP 跑 localhost：

1. 两席封招、handoff、ready 隐私；
2. 普通攻/防取得先机，下一回合先机攻破防；
3. 攻被闪、攻打断蓄、双攻；
4. 零气 disabled；
5. COVER/RESUME；
6. round-result、match-result、RESTART；
7. 控制台无 error，Network 无公网请求。

同时做静态 file 闭包检查。若 Chrome 工具不能导航 `file://`，明确记录工具限制，
再由人工双击或系统浏览器补 file 证据，不能用 localhost 替代。

命令：

```bash
node --check experiences/versus/shadow-sword-duel/app.js
node --test experiences/versus/shadow-sword-duel/logic.test.js
npm test
npm run verify
git diff --check
```

建议提交：

```text
feat: build shadow sword duel local UI
```

## 7. 批次三：README、ATTRIBUTION、catalog

### 7.1 允许写入

```text
experiences/versus/shadow-sword-duel/README.md
experiences/versus/shadow-sword-duel/ATTRIBUTION.md
experiences/catalog.json
experiences/versus/README.md
shared/runtime/catalog.test.js
index.html
README.md
docs/README.md
docs/40-idea-backlog.md
```

不创建仓库当前不存在的 `experience.json` 第二套 metadata。

### 7.2 来源声明

README 与 ATTRIBUTION 都必须完整列出：

- OpenSpiel `112b77704631fc2ce7ad8e4581f6ca09798ce15a`，Apache-2.0，
  只借鉴 simultaneous move / joint action / sequential encoding 术语；
- boardgame.io `65ca73beb62ef2afd980bb9f569b10dabfc60075`，MIT，
  Copyright © 2017 The boardgame.io Authors，只借鉴阶段、状态日志、回放描述；
- W3C WCAG 2.2 与 W3C Document License 2023，只作无障碍校准；
- PrinceJS `ea1a97a763ac78fee5b35129e2841ef31531328e`，Unlicense，只作已排除
  实时动作路线；
- 零第三方代码、零第三方资产复制；
- 不使用 Prince of Persia 品牌、角色、故事、关卡、地图、精灵、图像或音频。

若实现阶段实际复制了文件，停止零复制声明并先做逐文件许可审计。

### 7.3 集成职责

- catalog 登记 A 级、versus、双人、单设备轮流、offline、`installed:true`；
- 根门户与对抗分类入口、标题、简介、标签一致；
- catalog test 验证 file 经典脚本闭包、零远程依赖、README/ATTRIBUTION 和隐私；
- 创意池只有页面、声明、catalog 和测试全部通过后标记已实现；
- 更新实测作品数与入口数，不预估；
- 不改核心或 UI 文件。

### 7.4 命令与完成证据

```bash
node --test shared/runtime/catalog.test.js
node --test experiences/versus/shadow-sword-duel/logic.test.js
npm test
npm run verify
git diff --check
```

完成必须证明：

- catalog、门户、对抗分类、创意池、根 README 与实测入口数一致；
- 从根 `file://` 门户可通过相对链接进入作品，作品静态依赖闭包完整；
- README 与 ATTRIBUTION 都包含四项固定来源、许可证/版权、实际借鉴、排除项
  与零代码/零资产复制声明；
- catalog test 对缺入口、远程资源、module/fetch、声明缺项与不安全隐私边界能失败；
- 全仓测试、verify 与 diff check 退出码均为 0。

建议提交：

```text
docs: register and attribute shadow sword duel
```

## 8. 批次四：真实 QA、bugs、learn、verification

### 8.1 允许写入

```text
docs/223-shadow-sword-duel-verification.md
bugs/YYYY-MM-DD-shadow-sword-duel-<slug>.md
learn/YYYY-MM-DD-<evidence-backed-topic>.md
README.md
docs/README.md
bugs/README.md
learn/README.md
```

若编号 223 已占用，使用下一空闲编号。只为真实复现问题写 bug；只为有跨作品
证据的主题写 learn，不为凑目录创建空文档。`bugs/README.md` 只在新增 bug 时
更新，`learn/README.md` 只在新增 learn 时更新；根 README 与 docs README 用于
索引最终 verification。

QA 发现生产缺陷时：

1. 停止最终 verification；
2. 用独立修复提交包含最小生产修复、回归测试、bug 记录与 `bugs/README.md`；
3. 重新开始受影响的 QA 段；
4. 最终 verification 提交不夹带生产代码。

若形成 learn，learn 文档与 `learn/README.md` 自成一个知识提交；不把 learn 内容
夹进生产 fix 或最终 verification。

### 8.2 Chrome 验收矩阵

按规格 15 组证据执行，至少包含：

- 真实 `file://` 与 localhost 各一条完整路径；
- 第一份封招后的第二席 view/DOM；
- ready view/DOM 无 sealed 值、选中标记、data/ARIA 泄露；
- 普通攻/防、先机破防、闪、蓄、双攻；
- 单 KO、double KO、第九回合 health/energy/draw；
- COVER 清草稿、恢复不自动推进；
- RESTART 初态深相等；
- 键盘全流程、焦点、role=status、disabled；
- 320×568、375×667、768×1024、1440×900；
- 200% 文本、reduced-motion；
- Console 零 error、Network 零公网。

### 8.3 learn 候选

只有实现和测试给出证据后再决定是否沉淀：

- “事件历史作为唯一资源真相”；
- “顺序录入、联合快照结算”；
- “热座 screen view 与 DOM 秘密投影”；
- “0/1-secret handoff 的可达状态验证”。

### 8.4 最终命令

```bash
node --check experiences/versus/shadow-sword-duel/config.js
node --check experiences/versus/shadow-sword-duel/logic.js
node --check experiences/versus/shadow-sword-duel/app.js
node --test experiences/versus/shadow-sword-duel/logic.test.js
node --test shared/runtime/catalog.test.js
npm test
npm run verify
git diff --check
```

verification 记录真实测试数量、入口数量、浏览器视口、DOM/焦点/网络证据、视觉
忠实度台账、bugs/learn 决策和残余限制。建议提交：

```text
docs: verify shadow sword duel
```

## 9. 完成定义

本作只有在以下全部成立后才结束：

- 四个实现/集成/验收批次均有独立 commit；
- docs-only 视觉方案获得用户明确确认；
- A 级 file 直开与 localhost 都完整实玩；
- 联合结算、历史重放、热座隐私、终局和 restart 通过自动与浏览器验证；
- README/ATTRIBUTION 的借鉴声明与实际文件一致；
- catalog、门户、分类 README、创意池和实测计数一致；
- 所有真实 bug 已记录并回归，可复用 learn 有实现证据；
- worktree 没有本作遗留的未提交文件。

计划、核心逻辑或视觉提案完成都不等于作品完成。
