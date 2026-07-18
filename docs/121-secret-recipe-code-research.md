# A 级“藏好这一味”定向调研

- 日期：2026-07-19
- 创意来源：创意池 V09“秘密配方猜码”
- 目标等级：A，经典脚本、相对路径、`file://` 直开
- 工作 ID：`secret-recipe-code`
- 冻结标题：`藏好这一味`
- 结论：进入规格；采用“两人轮流设置四格秘密配方，交接设备后由另一人根据同位/错位数量在七次内推断，交换角色后比较破译步数”的原创同机对抗玩法

## 1. 先证明它不是现有密封猜拳或默契问答换皮

仓库已经有两种隐藏选择：

- “密封猜拳”在两台设备中分别提交一次石头剪刀布，由本机裁判收齐后同时揭晓；核心是局域网密封消息与同步结算；
- “和你一样”在两台设备中回答八道二选一，核心是双方都不知道对方答案、乱序状态门控与中性匹配计分。

V09 的新命题不同：同一台设备在两人之间交接，一人先定义一个多位秘密，另一人通过多轮试探与“有多少位精确、多少配料存在但位置不对”的有限反馈逐渐缩小可能空间。权威状态必须同时保存秘密、猜测历史、重复元素计数、轮换角色与双轮总成绩。

因此它补齐的是：

1. **同机设密交接**：秘密由玩家实时输入，不来自配置、随机数或题库；
2. **多轮演绎反馈**：每次猜测都产生可组合约束，不是一次性胜负；
3. **重复元素多重集合**：相同配料最多出现两次，反馈不能重复消费；
4. **双轮对称赛制**：双方各当一次配方师与破译者，比较自己的破译步数。

## 2. Brainstorm：四种产品方案

| 方案 | 核心体验 | 结论 |
| --- | --- | --- |
| 电脑随机出码，单人猜 | 页面生成秘密，玩家独自推断 | 拒绝；缺少情侣双方参与，也与通用单人猜码站点无差别 |
| 一人设码、一人猜一局 | 交接设备后最多七次猜中 | 可行但不采用；角色只服务一方，难称双人对抗 |
| 双轮轮换设码与破译 | 双方各设一次、各猜一次，较少尝试者胜 | 采用；同一机制对称复用，30 秒内可理解，单设备即可完成 |
| 双方同时秘密设码并实时竞速 | 同机分屏，各自在另一侧猜 | 暂缓；同屏无法可靠遮住两个秘密，也会把推理变成速度赛 |

首版没有倒计时、电脑提示、候选枚举器、自动求解器、排行榜或长期战绩。系统只负责准确反馈和轮换，推理由两个人自己完成。

## 3. 冻结的产品流程

### 3.1 两轮赛制

1. `intro`：说明四格、六种配料、反馈含义、七次上限和双轮赛制；选择“开始第一轮”；
2. `setting`：本轮配方师输入四格秘密；允许重复，但同一种最多两格且整份至少三种配料；
3. `handoff`：提交后删除秘密输入 DOM，只显示“把设备交给破译者”；确认接手前不能看见猜测面；
4. `guessing`：破译者逐格输入四种配料并提交；每次得到“同位 n / 有料 m”，历史按提交顺序保留；
5. `round-result`：四位全同则记录本次使用的猜测数；七次未中则记录 `failed`，此时才显示秘密；
6. `role-swap`：交换配方师与破译者，再执行相同流程；
7. `match-result`：双方都完成破译后，成功且猜测数较少者获胜；失败按 8 次计，双方同值则平局；
8. `restart`：删除两轮秘密、草稿、反馈和成绩，回到与首次加载深相等的 intro。

### 3.2 原创术语

| 通用概念 | 本作术语 |
| --- | --- |
| code maker | 配方师 |
| code breaker | 破译者 |
| exact match | 同位 |
| right value, wrong position | 有料 |
| peg / color | 配料章 |
| attempt | 试配 |

不使用商业产品名、注册商标符号、经典包装、红白提示钉、黑色塑料密码板或官方规则原句。

## 4. 为什么允许有限重复

若四格必须全部不同，反馈只需集合交集减同位数，容易让实现和测试漏掉多重集合边界。若同一种可以出现四次，配方既可能过于简单，也难以维持“配料”主题。

首版冻结：

```text
SLOT_COUNT = 4
INGREDIENT_COUNT = 6
MAX_PER_INGREDIENT_IN_SECRET = 2
MIN_UNIQUE_INGREDIENTS_IN_SECRET = 3
MAX_GUESSES = 7
ROUND_COUNT = 2
FAILED_SCORE = 8
```

猜测不限制重复数量，因为破译者有权测试任意假设；只有秘密配方受“最多两格、至少三种”约束。这样仍必须正确处理重复反馈，又不会出现四格完全相同的低信息秘密。

## 5. 两遍反馈算法的独立规则

令 `secret` 与 `guess` 都是长度 4 的配料 ID 数组。反馈只返回两个整数，不指出具体哪一格正确。

第一遍消耗同位：

```text
exact = 0
remainingSecret = counts of unmatched secret entries
remainingGuess  = counts of unmatched guess entries
for each position i:
  if secret[i] == guess[i]: exact += 1
  else: increment both remaining count maps
```

第二遍计算错位但存在：

```text
misplaced = sum over ingredient id:
  min(remainingSecret[id], remainingGuess[id])
```

必须先排除同位再比较剩余频数。例如秘密 `A A B C`、猜测 `A B A A` 应得到 `同位 1 / 有料 2`，最后一个多余的 A 不能再次得分。

反馈必须满足：

```text
0 <= exact <= 4
0 <= misplaced <= 4
exact + misplaced <= 4
exact == 4  <=>  solved
```

实现将按上述规则独立编写，不复制任何调研仓库的函数、变量名、循环结构、测试表或错误文案。

## 6. 权威状态与秘密 view

建议状态只保存：

```text
phase
roundIndex
setterIndex, breakerIndex
draft[]
secret[] | null
guessDraft[]
guesses[] = { values[], exact, misplaced }[]
roundResults[] = { breakerIndex, attempts | null, failed }[]
announcementSerial
notice
```

公开 view 按阶段投影：

- `setting` 允许当前配方师看见 `draft`；
- `handoff` 与 `guessing` 不返回 `secret`、设置草稿或任何可反推出秘密的调试字段；
- `round-result` 才返回本轮 `revealedSecret`；
- `match-result` 只返回两轮公开成绩、胜者/平局与已揭晓配方；
- intro 初始 HTML 不预置任何玩家秘密或结果文案。

秘密仍以 JavaScript 值存在于本机内存，能使用开发者工具的人可能查看；这是面对面交接的渐进遮挡，不是加密、可信执行环境或防作弊系统。页面不把秘密写入 URL、DOM dataset、localStorage、sessionStorage、Cookie、IndexedDB、剪贴板或网络。

## 7. 输入、交接与生命周期

- 所有配料章与槽位使用原生可聚焦按钮；选择配料追加到首个空位，点击已填槽位可删除该格并保持其余顺序；
- 配方未满足四格、最多两份和至少三种时，“藏好配方”保持禁用并显示具体原因；
- 猜测未满四格时不能提交；提交后草稿清空并把焦点回到第一枚配料章；
- `handoff` 是独立阶段，只有“我接好了”一个主动作；秘密节点在进入该阶段前已经删除，不依赖 CSS `visibility` 或视觉遮罩；
- 页面在 `setting` 时失焦或隐藏，会进入 `privacy-cover` 派生视图；恢复后必须由同一人选择“继续设置”才重新显示草稿；
- 页面在 `guessing` 时失焦或隐藏只暂停可选动效，不清除已提交历史或猜测草稿；
- Escape 在 setting 时盖住秘密，在 guessing 时清空当前未提交草稿；不会修改已提交猜测或轮次成绩；
- `aria-live` 只播报阶段切换、配方是否合法、一次反馈、轮次结果与比赛结果，不逐格朗读秘密；设置阶段槽位有可见文字/图标，但不进入 live region。

## 8. 公平、计分与异常边界

- 每位玩家恰好作为破译者一次；比较的是自己的破译步数，不把“让对方多猜”另加分，避免双重计分；
- 成功使用第几次试配就记几分，较低者胜；七次未中记 8，双方都失败则 8–8 平局；
- 配方师无需手工给反馈，系统从内存秘密计算，杜绝错误提示与故意误导；
- 不允许中途跳轮、撤回已提交猜测、编辑历史反馈或刷新后恢复；刷新意味着整场作废重来；
- external state 必须严格校验 phase、角色、数组长度、反馈可重算性、轮数与成绩派生关系；伪造历史反馈、提前暴露秘密或跳过轮次均拒绝；
- match result 从两个 round result 纯派生，不接受调用方直接写 winner。

## 9. 无障碍与视觉边界

- 六种配料章同时使用图形、中文名称、固定编号与色彩，反馈同时使用大数字和“同位/有料”文字，不只靠红白颜色或点阵位置；
- 每个交互目标至少 48×48px，当前槽位、可删除、不可用、选中与焦点状态都有边框/文字差异；
- 1280×800 首屏必须看到规则摘要、四格输入、六种配料与当前主动作；390×844、320×700 不横向溢出，猜测历史可在独立区域滚动；
- reduced motion 取消配料章落槽、历史入场和结果升起；forced colors 使用系统色、编号、边框和文字保留全部语义；
- 图片或装饰背景失败不得影响输入、反馈、计分或重开；任何生成素材都不含秘密、玩家名、反馈、按钮或规则文字。

## 10. 固定版本开源调研与零复制边界

核验日期：2026-07-19。下列项目只用于研究反馈边界、组件拆分与移动交互，不进入运行依赖。

| 来源 | 固定版本、许可证与权利主体 | 仅研究 | 明确未复制或引入 |
| --- | --- | --- | --- |
| [Calanthe/mastermind](https://github.com/Calanthe/mastermind/tree/688006ae2280b721e4a8289b710351dd3fd7e5ed) | commit `688006ae2280b721e4a8289b710351dd3fd7e5ed`；MIT；Copyright 2020 Zofia Korcz | React 中的棋盘行、当前输入、历史反馈与十次上限的界面分层 | React 组件、Webpack、样式、函数、变量、规则原文、提示钉、颜色、页面结构和 demo |
| [sztamas/mastermind](https://github.com/sztamas/mastermind/tree/525937d2fd8a5490aed0ea3f9198d0777b1670cb) | commit `525937d2fd8a5490aed0ea3f9198d0777b1670cb`；MIT；Copyright 2015 sztamas | Redux/Immutable 的可重放状态、重复颜色得分测试和历史回放边界 | reducers/actions、测试表、replay 数据、图片、React 页面、构建与分发文件 |
| [sajadhsm/mastermind](https://github.com/sajadhsm/mastermind/tree/32ad16b12621abe41be95245586f8db9c8f98acf) | commit `32ad16b12621abe41be95245586f8db9c8f98acf`；MIT；Copyright 2021 Sajad Hashemian | TypeScript 中先同位、再消费剩余频数的重复元素提示边界 | `calculateHints`、枚举、计数结构、测试输入、组件、Tailwind、图标与截图 |
| [klomontes/js-mastermind](https://github.com/klomontes/js-mastermind/tree/2cb289f390adc5571f4a2494e920e7b5e1250874) | commit `2cb289f390adc5571f4a2494e920e7b5e1250874`；MIT；Copyright 2014 Branko Tomic | 原生 JavaScript 中先消耗精确位置、再匹配剩余元素的最小实现边界 | `compare/insertPeg`、DOM 结构、CSS、Modernizr、颜色、弹窗、文案与页面视觉 |
| [BreakLock](https://github.com/maxwellito/breaklock/tree/a06fb28a3fa6072a089ca664c66a7bf08c0a3e99) | commit `a06fb28a3fa6072a089ca664c66a7bf08c0a3e99`；MIT；Copyright 2017 maxwellito | 把有限反馈猜码改造成移动优先手势游戏的产品差异化思路 | Android 图案锁路径、控制器、PWA/service worker、字体、图标、SVG、文案、样式与构建 |

这些来源证明重复元素反馈、历史行、状态重放和移动优先界面都有成熟实现，但不替本作定义配料主题、双轮热座、秘密 DOM、七次赛制、输入约束或结果文案。即使许可证允许复制，本作仍选择零复制，以保持经典脚本直开、原创视觉与单一来源清晰。

## 11. 商业规则、论文与平台来源

- [Hasbro 官方规则 PDF](https://www.hasbro.com/common/documents/430e4f3f6bfd10148a8ef35124427085/E0A7EB4950569047F5C0080A51F685F8.pdf) 用于确认四位、六色、精确/错位反馈、交换角色与按尝试数计分属于该商业产品的公开规则表达；PDF 同时明确商业名称是注册商标。本作不使用该名称、官方措辞、红白提示钉、产品造型、包装、图形或 trade dress。
- [Donald E. Knuth, “The Computer as Master Mind”](https://janmr.com/refs/knuth-mastermind76/)（Journal of Recreational Mathematics 9, 1976, 1–6）只用于确认该类序列重建可被形式化为有限候选消除问题。本作没有电脑求解器、五步算法、首猜策略或论文算法实现，也不复制论文文字与图表。

平台行为固定参考 [WHATWG HTML](https://github.com/whatwg/html/tree/56674fb3ac40279141a202e5d19b84f30d99854d)、[Page Visibility](https://github.com/w3c/page-visibility/tree/8ca533c744e655b8340b5713d1bd5ea97b202b13)、[W3C WCAG](https://github.com/w3c/wcag/tree/07123b871c103268375880980fd715b2b26b2ff0) 与 [CSSWG Drafts](https://github.com/w3c/csswg-drafts/tree/c7573530343759ace8e46438a1fa2c44515b5554)。只研究原生按钮、hidden 内容模型、页面可见性、非颜色信息、焦点、降动效和 forced colors；不复制规范文字、IDL、示例或站点视觉。

## 12. 明确排除与权利不清来源

| 来源 | 排除原因 |
| --- | --- |
| [debjeanlee/mastermind](https://github.com/debjeanlee/mastermind) | 仓库公开但没有清晰许可证；不得复制 JavaScript、CSS、HTML、README 表达、颜色、布局或 demo |
| 8ix/codebreaker | GitHub 搜索结果可见，但未把许可证核验为本批固定来源；不复制 Next.js/TypeScript、规则、页面、素材或文案 |
| Hasbro/Invicta 商业产品 | 名称、官方规则文字、产品棋盘、红白提示钉、包装与 trade dress 不进入本作 |
| 在线猜码站、CodePen、教程与应用商店截图 | 常缺代码/素材许可证或使用商业视觉；不以“公开可玩”推定可复制 |

公开源码、可访问 demo、教学文章或棋盘规则都不等于允许复制具体表达。即使代码为 MIT，截图、字体、图标、音频、品牌、官方文案与第三方依赖仍必须分别核验。

## 13. 准备者可参与的 5–10 行业务策略

后续 `config.js` 预留 `composeMatchNote(summary)`。它只收到冻结摘要：双方显示名、各自是否破译、猜测数、胜者索引或平局、默认结语；不接触秘密配方、猜测内容或内部状态。

准备者可用 5–10 行决定：平局时写“今晚都很懂彼此”，或某人一试命中时换成专属短句。返回空白、非字符串、超长文本、抛错或修改摘要时回退到默认结语。默认实现无需修改即可完成整场。

## 14. 必须通过的可验证 Gate

1. **新机制**：同机一人设四格秘密、交接、另一人最多七次推断；两轮轮换并按破译步数结算。
2. **秘密合法**：恰好四格、六种固定 ID、每种最多两格、至少三种；任何不合法 secret action/state 被拒绝。
3. **重复反馈**：先同位、再剩余频数；覆盖零命中、全同位、全错位、多余重复、交叉重复和对称交换。
4. **反馈可重算**：历史每一行的 exact/misplaced 必须可从当轮秘密与 guess 唯一重算，伪造提示状态无法通过。
5. **阶段秘密**：handoff/guessing view 与 DOM 不含 secret、设置草稿、名称列表的秘密顺序或调试字段；round result 才揭晓。
6. **交接生命周期**：setting 时 blur/hidden/Escape 盖住草稿，必须显式恢复；进入 handoff 前真实删除秘密节点。
7. **双轮公平**：双方各破译一次；成功次数 1–7，失败等价 8；胜者完全由两轮结果派生，同分平局。
8. **确定性与重开**：无随机、无真实时钟；同一 action 日志深相等；任一阶段重开与首次状态深相等。
9. **键盘与非颜色信息**：全部输入可用 Tab/Enter/Space；配料有编号、图标、名称，反馈有文字与数字，颜色不是唯一提示。
10. **响应式**：1280×800、390×844、320×700 无横向溢出；当前草稿、配料、主动作和本地隐私提示在首屏，历史独立滚动。
11. **降级与隐私**：背景失败、reduced motion、forced colors 不影响规则；零网络、存储、导出、剪贴板、媒体、传感器或账号。
12. **权利**：README 与 ATTRIBUTION 固定项目 commit、许可证、权利主体、商业商标边界、论文边界、排除项、零复制和 ImageGen 输入链。

## 15. Go / No-Go

**Go。** V09 补齐仓库尚未覆盖的“玩家定义秘密 + 同机遮屏交接 + 重复元素多轮演绎反馈 + 双轮对称结算”对抗样板。它不需要联网、随机数、音频、持久化或第三方运行依赖，适合 A 级经典脚本直开。

进入规格前必须冻结：六种配料 ID 与非颜色语义、秘密合法条件、两遍反馈公式、action schema、phase/角色不变量、handoff DOM 删除、privacy cover、失败分值、双轮 winner 派生、配置摘要和 golden replay。

## 16. 借鉴声明摘要

“藏好这一味”的配料主题、双轮赛制、秘密约束、状态机、反馈实现、页面、文案、视觉和测试将由本仓库独立原创。MIT 项目只用于比较重复反馈、状态分层与移动产品化边界；官方规则和论文只用于确认公开机制、历史与商标边界。

本作不会复制、改写、翻译、移植、打包或依赖上述项目、商业产品、论文及排除来源的源码、API、算法实现、测试表、组件、构建、棋盘、提示钉、图片、字体、图标、音效、页面结构、规则文字或文案。未来若实质引入第三方代码或素材，必须另立变更、保存许可证与版权声明，并重新执行离线、隐私、性能和浏览器验收。
