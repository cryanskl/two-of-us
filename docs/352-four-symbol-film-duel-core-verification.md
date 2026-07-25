# `four-symbol-film-duel` 非视觉核心验收

> 验收编号：352
> 验收日期：2026-07-25
> 基线：`b039503a852cbbe86f6fe24f606a516fdbd3323d`
> 分支：`codex/exp-four-symbol-film-duel-core-audit`
> worktree：`/Users/zenith/Desktop/two-of-us-worktrees/four-symbol-film-duel-core-audit`
> 范围：research / brainstorm / spec / plan / design、原创内容、纯逻辑、测试、
> Unicode 数据边界、热座盲交接、固定来源与许可证、零复制、机制去重
> 明确排除：生产 UI、共享依赖、根入口、launcher、catalog、Board

## 1. 结论

**非视觉核心通过，允许继续等待视觉方案确认；不等同于作品已安装或已可双击游玩。**

验收确认：

- 48 个闭合 Unicode token、32 张原创虚构片名卡、4 个题包、16 个 A/B 配对
  全部通过数据校验；
- 8 回合严格 A/B 交替，双方各 4 题、2 枚聚光灯，计分严格为 `2 / 1 / 0`，
  平局不加赛；
- setup / handoff / question / confirm / result / summary 六阶段的公开投影按阶段
  隐藏排程、答案与解释；
- 核心无网络、存储、DOM、时钟、随机、媒体和第三方运行依赖；
- 32 个正式答案的四组精确短语检索仍为零结果；
- 没有参考或复制开源猜电影项目、第三方题库、影视表达、厂商 Emoji 图像、
  Unicode/CLDR 数据文件、字体、音频或视频；
- 两张 ImageGen 概念图只在 `docs/assets/`，SHA、尺寸、生成来源和禁止进入运行时
  的边界均与视觉提案一致；
- 定向测试 `27/27`、全仓测试 `2274/2274`、仓库 verify 全部通过。

本次发现并修复两个真实非视觉核心缺口：

1. 配置解析和开发数据校验会执行普通 getter；
2. `getWinner(players)` 会执行数组或 `score` getter。

二者都采用“红灯测试 → 最小修复 → 绿灯 → bug 记录”的独立提交序列。没有为了
审计增加生产 UI，也没有修改任何共享入口或依赖。

仍未完成且不能冒充通过：

- Safari、Windows、Android 等真实平台的 48 个 glyph 逐项观察；
- 两位未参与创作的玩家进行语义难度盲测；
- 生产 DOM、可访问树、键盘、触控、缩放、forced-colors 和 reduced-motion 验收；
- `file://` 生产页面直开，因为当前按批准门仍没有生产 HTML；
- 视觉方案 `docs/318-four-symbol-film-duel-design-proposal.md` 的用户确认。

## 2. 阶段与历史复核

| 阶段 | 文件或范围 | 主线提交 | 复核结论 |
|---|---|---|---|
| research | `docs/271-emoji-movie-duel-research.md` | `b140f6b`、`bbe8c77` | Conditional Go、真实电影与厂商图像边界清楚 |
| brainstorm | `docs/272-emoji-movie-duel-brainstorm.md` | `fcc5dd5` | 四符限制、原创片名、配对题组、提示经济已冻结 |
| spec | `docs/273-emoji-movie-duel-spec.md` | `ccb2f95` | 六阶段、8 回合、2/1/0、数据与隐私合同完整 |
| plan | `docs/274-emoji-movie-duel-plan.md` | `cb69ed9` | 阶段、Gate、验证和借鉴规则可执行 |
| 内容 | config、内容审计、ATTRIBUTION | `f1501e7` | 48 / 32 / 4 / 16 闭合数据通过 |
| 逻辑 | logic、tests | `f3242d5` | 纯状态机、公开投影、重放防护通过 |
| 首轮修复记录 | `bugs/four-symbol-film-duel-*` | `7b1f390` | 内容错配与 restart revision 已有闭环 |
| design | `docs/318-four-symbol-film-duel-design-proposal.md` | `c032f31` | 仅概念提案，明确等待用户确认 |

### 2.1 文档一致性

271–274 的产品机制与当前 `experiences/versus/four-symbol-film-duel/` 核心一致：

- 对外标题为“四符片名擂台”；
- 题面只含四枚符号；
- 答案和干扰项都是原创虚构片名；
- 题包固定、双方配平；
- 聚光灯排除一个固定错误项，使用后答对只得 1 分；
- 每题只结算一次；
- 热座交接不显示下一题；
- 运行时不复制厂商 Emoji 图像。

早期 spec / plan 示例路径仍写作 `projects/four-symbol-film-duel/`，而当前仓库实际
分层使用 `experiences/versus/four-symbol-film-duel/`。plan 已写明最终字段和路径
应以实施时仓库 schema 为准；设计提案与实际核心都使用当前路径。本报告将这项
架构演进显式对齐，未把历史计划改写成事后文档。

### 2.2 当前批准状态

`docs/318` 顶部和结尾都明确为“等待用户确认”，并禁止在确认前：

- 写生产 HTML / CSS / JavaScript；
- 修改 catalog、Board、README 或共享索引；
- 标记 installed；
- 把概念 PNG 接入运行页面。

本次验收遵守该门。非视觉核心通过不自动批准视觉，也不改变 installed 状态。

## 3. 内容与公平性复核

程序化审计结果：

| 项目 | 结果 |
|---|---:|
| token | 48 |
| card | 32 |
| pack | 4 |
| A/B pair | 16 |
| 全局唯一选项标题 | 128 |
| `validateGameData(config)` | `[]` |
| 规格签名 `validateGameData({tokens,cards,packs})` | `[]` |
| NFC 不一致字符串 | 0 |

四个题包都得到同一固定侧别与难度画像：

```text
A:城市:1
B:城市:1
A:动物:1
B:动物:1
A:奇幻:2
B:奇幻:2
A:太空:3
B:太空:3
```

这证明结构公平，不把字段相同夸大为语义难度已经公平。后者仍需真人盲测。

### 3.1 名称与影视指向

2026-07-25 再次将 32 个正式答案分成四组，用带引号的完整中文短语公开检索；
四组仍返回空结果。该结果只代表当前公开索引没有精确重名，不覆盖未索引作品、
其他语言译名、未来新增名称或所有司法辖区。

静态阅读再次确认：

- 不含真实影片、系列、人物、角色、演员、导演、工作室或平台名；
- 不含对白、剧情梗概、经典场景复述、海报、剧照、Logo、配乐或视频；
- 四符组合不依赖某部真实电影的专属人物、道具或剧情关系；
- 每卡 `authorship` 固定为 `original-project-copy` 且 `reviewed` 为 `true`；
- 先前“松果邮差 / 蜗牛 token”“风筝修补 / 小鸟 token”和月亮重复卡问题已由
  既有 bug 记录闭环，本次配置中没有复发。

## 4. Unicode 与字形边界

Node `v22.22.3` 下用 `Intl.Segmenter("zh", { granularity: "grapheme" })` 独立检查：

- 48 / 48 glyph 都是单个扩展字素簇；
- 48 / 48 都为 NFC；
- 旗帜区域指示符、肤色修饰符、ZWJ、tag 字符、BMP/补充私用区命中数均为 0；
- 9 个 token 使用 VS16：`cloud`、`comet`、`dove`、`island`、`pencil`、`rain`、
  `satellite`、`sun`、`umbrella`；
- VS16 只请求 Emoji 呈现，不是图片依赖。

数据层继续把以下字符列为真实平台观察重点：

- `🪿` 鹅；
- `🫖` 茶壶；
- `🪞` 镜子；
- `🪜` 梯子；
- `☄️` 彗星；
- `🛰️` 卫星。

这些字符有项目原创中文 `labelZh`，但当前还没有生产 UI，无法验证可见文字模式、
辅助技术朗读和各平台空框风险。

## 5. 热座盲交接与隐私

核心状态本身包含权威题库；生产 UI 必须且只能消费 `getPublicView()`。独立哨兵
探针把首题解释改为“隐私哨兵解释”、下一题解释改为“下一题隐私哨兵”，再序列化
每个公开阶段：

| 阶段 | 当前题解释 | 下一题解释 | `answerOptionId` | `schedule` |
|---|---:|---:|---:|---:|
| setup | 无 | 无 | 无 | 无 |
| 首题 handoff | 无 | 无 | 无 | 无 |
| 首题 question | 无 | 无 | 无 | 无 |
| 首题 confirm | 无 | 无 | 无 | 无 |
| 首题 result | 有 | 无 | 无 | 无 |
| 第二题 handoff | 无 | 无 | 无 | 无 |

补充检查：

- handoff 的 `currentCard` 为 `null`；
- question / confirm 只含四符、四个等权选项及选择/排除状态；
- result 才增加 `correctOptionId` 与 `rationale`；
- summary 的 `currentCard` 为 `null`，只投影已经结算的 8 条复盘；
- 公开 view 不含 `content` 和内部 schedule；
- 所有公开投影递归冻结。

这证明纯核心可以支持真正的阶段卸载。生产 DOM 是否遵守仍必须在编号 319 的
浏览器验收中检查，不能由核心测试代替。

## 6. 规则、确定性与输入边界

### 6.1 规则合同

- `START_MATCH` 只从 setup 生效；
- `ACK_HANDOFF` 后才进入 question；
- 选择可修改，但被聚光灯排除的选项不可选择；
- 聚光灯扣除、清除已排除选择和设置排除项一次原子完成；
- confirm 可以返回修改，submit 只结算一次；
- 第 8 题 result 后才能进入 summary；
- restart 只从 summary 生效并保持 revision 单调；
- `MAX_REVISION = 1_000_000` 时所有动作停止，避免整数溢出；
- 没有真实时间、随机数或环境输入，因此相同配置和 action 序列结果确定。

`MAX_REVISION` 是显式防御上限；正常完整对局离该上限很远。本次不把理论上约
一百万次状态转换后的会话停止扩张为新协议需求。

### 6.2 本次缺口 A：配置普通 getter

修复前：

- token `concepts` 为合法 Array Proxy 时，`.length` 会触发 `get` trap；
- `validateGameData()` 会直接读取顶层 `genres/tokens/cards/packs`；
- `sanitizeConfig()` 可因此抛错，开发校验也会执行外部代码。

修复后：

- 固定长度和有界数组都从 own data descriptor 读取 `length`；
- `concepts` 长度限制仍为 `1..5`；
- 数据校验先快照三个必需字段与可选 `genres`；
- accessor 不执行，元操作异常安全失败；
- 稀疏数组、数组子类、额外索引和 getter 仍被拒绝。

记录：`bugs/four-symbol-film-duel-config-ordinary-get.md`。

### 6.3 本次缺口 B：胜负普通 getter

修复前 `getWinner(players)` 对合法 Array Proxy 产生 5 次普通 `get`，并会执行
`score` accessor。`try/catch` 只能收敛抛错，不能撤销副作用。

修复后：

- 先快照恰好两位玩家的原生数组；
- 每位玩家只读取 own `score` data descriptor；
- accessor、稀疏数组、数组子类、异常代理和非普通对象返回 `null`；
- A / B / tie 与非负安全整数合同不变。

记录：`bugs/four-symbol-film-duel-winner-ordinary-get.md`。

两项经验都已由仓库
`learn/2026-07-23-single-observation-snapshot-boundary.md` 覆盖，因此没有重复创建
新的 learn。

## 7. 机制去重

| 邻近作品 | 表面相似 | 本作不可删除的差异 |
|---|---|---|
| `telegraph-codebook` | 符号序列、固定答案、选择解码 | 不是固定码本翻译；四符做语义联想，题包为 A/B 静态配平，并有付费提示 |
| `compatibility-quiz` | 离线多选、两人轮流 | 不比较两人的偏好答案；双方解不同但结构对称的原创片名题 |
| `secret-recipe-code` | 热座、隐藏目标、轮换、计分 | 无数值配方与逐次结构反馈；每题一次提交，失败不能靠反馈继续穷举 |
| `hot-seat-pictionary` | 单设备交接、表达与猜测 | 无玩家自由绘画或自由出题；线索来自审计过的四符闭合题库，采用对抗计分 |

本作不是“普通四选一换 Emoji 皮肤”的最低差异版本，因为以下机制同时存在：

1. 恰好四符；
2. 原创虚构片名语义联想；
3. 四组 A/B 配对题；
4. 每人两次有限聚光灯；
5. 提示降分；
6. 单次结算；
7. 可静态审计的题包、难度、类型和排除项。

没有发现需要因重复而删除或改写的机制。

## 8. 固定来源、许可证与零复制

### 8.1 本次在线复核的一手资料

- [Unicode Emoji Images and Rights](https://unicode.org/emoji/images.html)：彩色
  Emoji 图像的版权、商标和服务标识属于各自权利人，Unicode 不代为授权厂商图像；
- [Unicode Technical Standard #51](https://www.unicode.org/reports/tr51/)：
  当前页面为 Unicode Emoji 17.0 / Revision 29，定义字符、presentation selector、
  modifier、ZWJ、flag 与 tag 等序列结构；
- [Unicode Licensing Policy](https://www.unicode.org/policies/licensing_policy.html)：
  Unicode 软件和数据文件通常使用 Unicode License v3；本作没有复制这些文件；
- [U.S. Copyright Office Circular 33](https://www.copyright.gov/circs/circ33.pdf)：
  名称、标题和短语通常因作者性不足不受版权登记，但仍可能涉及商标法；
- [Motion Pictures](https://www.copyright.gov/registration/motion-pictures/)：
  影视属于可登记的表演艺术 / 视听作品类型，不能把“短标题边界”扩大成影视表达
  可自由复制；
- [USPTO Likelihood of Confusion](https://www.uspto.gov/trademarks/search/likelihood-confusion)：
  近似不要求完全相同，声音、外观、含义、商业印象和相关商品服务都需要考虑；
- [WCAG 2.2 Non-text Content](https://www.w3.org/WAI/WCAG22/Understanding/non-text-content)
  与 [Technique H86](https://www.w3.org/WAI/WCAG22/Techniques/html/H86)：
  Emoji 的默认名称未必等于作者意图，生产 UI 需要合适的文本替代。

这些页面只用于标准与权利边界校准，不是运行依赖、代码来源、题库或视觉素材。

### 8.2 开源借鉴声明

本作没有参考任何开源项目，因此没有可固定的上游仓库 commit/tag，也没有第三方
代码许可证正文需要随包分发。`ATTRIBUTION.md` 已明确：

- 四符解码、配平、状态机、计分、卡片、标签和测试均为独立实现；
- 没有参考、复制、修改、链接或打包第三方猜电影游戏；
- 没有第三方题库、剧情、台词、海报、剧照、Logo、字体、音视频或厂商 Emoji 图像。

这不是“忘记写借鉴声明”，而是明确的**零开源项目参考声明**。将来若实际参考，
必须在实现前补固定 commit/tag、LICENSE、版权人、资产独立许可证、实际借鉴内容、
未复制范围及所需 notice。

### 8.3 依赖与生产目录

`experiences/versus/four-symbol-film-duel/` 只有：

```text
ATTRIBUTION.md
config.js
logic.js
logic.test.js
package.json
```

本地 `package.json` 只有 `"type": "commonjs"`，没有 dependencies。生产核心扫描
没有 `fetch`、XHR、WebSocket、storage、DOM、随机、时钟、媒体或远程 URL；
出现的 URL 仅位于 `ATTRIBUTION.md` 文档。

基线阶段执行 `npm ci`：安装 55 个根级测试工具包，`npm audit` 为 0 个漏洞；
未修改 lockfile 或根依赖。游戏运行时不依赖这些测试工具。

## 9. 概念资产边界

| 文件 | 尺寸 | SHA-256 |
|---|---|---|
| `docs/assets/four-symbol-film-duel-desktop-question-concept.png` | 1487 × 1058 RGB | `18bb482b4ed26019a3c5664d98b5b9a0b5c54cbf690620b3e9cdedddc401d1aa` |
| `docs/assets/four-symbol-film-duel-mobile-handoff-concept.png` | 853 × 1844 RGB | `a711be4186b00fd4f4ddfa03dc413c4a3eada51ac84c452c15dd35c07db8d1f6` |

复核结果：

- SHA 与 `docs/318` 完全一致；
- 两图带有 OpenAI / trained algorithmic media 的生成来源元数据；
- 无外部输入；
- 生产目录没有引用两张 PNG；
- 不得裁切其中的票纸、幕布、字体、符号、按钮、图标、边框或纹理；
- 后续页面必须用 HTML / CSS / Unicode / 原创 code-native 图形重建。

## 10. 验证证据

环境：

```text
Node v22.22.3
npm 10.9.8
```

命令与结果：

```text
node --check experiences/versus/four-symbol-film-duel/config.js
  通过

node --check experiences/versus/four-symbol-film-duel/logic.js
  通过

node --test experiences/versus/four-symbol-film-duel/logic.test.js
  27 tests / 27 pass / 0 fail

npm test
  2274 tests / 2274 pass / 0 fail

npm run verify
  通过：58 个作品入口（50 个 A 级、8 个非 A）、1 个能力声明

git diff --check
  通过
```

红灯证据：

```text
配置 getter 回归测试：修复前 25/26，修复后 26/26
winner getter 回归测试：修复前 26/27，修复后 27/27
```

## 11. 本次提交序列

| 提交 | 内容 |
|---|---|
| `8af4639` | 配置 getter 缺口红灯测试 |
| `f8b7518` | descriptor-only 配置与数据校验修复 |
| `bf25848` | 配置 getter bug 记录 |
| `baf27db` | winner getter 缺口红灯测试 |
| `542d544` | descriptor-only winner 修复 |
| `a935b6d` | winner getter bug 记录 |

本报告另作独立提交。每次提交前都执行了
`git branch --show-current && git rev-parse --show-toplevel`，确认写入目标分支和
目标 worktree。

## 12. 变更边界与下一门

相对基线，报告提交前的实现变更仅涉及：

```text
experiences/versus/four-symbol-film-duel/logic.js
experiences/versus/four-symbol-film-duel/logic.test.js
bugs/four-symbol-film-duel-config-ordinary-get.md
bugs/four-symbol-film-duel-winner-ordinary-get.md
```

加上本报告后只新增 `docs/352-four-symbol-film-duel-core-verification.md`。没有改动：

- `config.js` 内容题库；
- production HTML / CSS / app；
- 根 `package.json` 或 lockfile；
- shared runtime；
- launcher；
- catalog；
- Board；
- 其他体验。

下一步必须由用户先确认 `docs/318` 的视觉方向。确认后才能实现生产 UI，并在编号
319 中完成真实 `file://`、浏览器、DOM 隐私、可访问性、跨平台字形和双人盲测。
