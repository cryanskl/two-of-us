# `taboo-description-duel` 候选定向调研：绕开这些词，也能让你猜到

- 调研日期：2026-07-25
- 候选工作名：`taboo-description-duel`（仅用于本轮研究追踪）
- 建议生产 ID：`word-detour-duel`
- 建议中文名：`绕词对决`
- 建议目录：`experiences/versus/word-detour-duel/`
- 建议启动等级：A（双击 `index.html`，无安装、服务、权限或公网）
- 本轮范围：research；不创建生产目录、UI、题库或共享文件

## 1. 结论

**有条件 Go。** 玩法适合改造成 A 级“单设备热座友谊对抗”，但生产作品不得使用
`Taboo / TABOO / 禁忌游戏` 作为名称、logo、搜索标题或卖点，也不得复制 Hasbro /
Hersch and Company 的规则文案、示例、词卡、视觉、蜂鸣器音效或包装表达。

进入后续阶段的版本不是商业桌游的电子复刻，而是：

1. 两位玩家各担任两次描述者，描述回合完全对称；
2. 描述者私下查看一张原创目标词卡及四个禁用提示词；
3. 猜词者背对屏幕，仅根据口头描述作答；
4. 描述者用原生按钮记录“猜中 / 踩词 / 跳过”并进入下一张；
5. 每个描述回合结束后，两人共同复核公开回合记录；
6. 四个描述回合完成后，只比较两位描述者各自获得的净分；
7. 页面不录音、不识别语音、不联网，口头违规依赖双方诚实记录。

这个版本的成立条件是双方接受“友谊赛信任模型”。如果产品目标要求在互不信任的
强对抗中自动执法，则本候选应 **no-go**：单设备、零权限、两人参与时，没有独立
裁判可以同时知道秘密词卡和完整口头内容。

## 2. 商业品牌与权利边界

### 2.1 官方产品事实

[Hasbro 官方产品页](https://consumercare.hasbro.com/en-in/product/taboo-game/304C0329-5056-9047-F5D1-8C8A886E0D35)
把 `Taboo` 明确作为游戏名称，列出 4 人以上、162 张卡、蜂鸣器、沙漏、计分纸和
变体骰，并写明 “Taboo and all related characters are trademarks of Hasbro”。
另一份
[Hasbro 官方成人版产品页](https://consumercare.hasbro.com/fr-fr/product/taboo-uncensored-party-game-for-adults-only-hilarious-adult-party-board-games-ages-18-plus/05AD73E2-B79E-412F-BEC2-6532441240FC)
则写明 `Taboo` 是 Hersch and Company 的商标，Hasbro 相关名称也是商标。

两份官方页面对版权主体的品牌表述并不完全相同，因此本作不尝试判断或归并商标
所有权链；最安全、也最符合原创定位的产品决策是完全不用该名称。

[USPTO 的商标说明](https://www.uspto.gov/trademarks/basics/what-trademark)
指出，商标用于识别商品或服务来源并将其与其他来源区分；权利不是脱离商品/服务
语境地垄断一个词，但会覆盖与相关商品或服务相联系、可能造成来源混淆的使用。
本项目同样属于游戏体验，因此不把商业游戏名放进生产 ID、可见标题、元数据或
宣传文案。这里是风险控制，不是法律意见或完整的商标清查。

### 2.2 玩法机制与表达

[美国版权局 Games 页面](https://www.copyright.gov/register/tx-games.html)
说明：游戏想法、名称和玩法方法本身不受版权保护，但规则文字、图形等具有足够
创作性的表达可能受保护。
[Circular 33](https://www.copyright.gov/circs/circ33.pdf)
进一步区分了不受保护的想法、方法、系统、名称与可能受保护的原创文字或图像。

据此只研究以下抽象机制：

```text
目标词
+ 一组不得说出的相关词
+ 描述者给口头线索
+ 猜词者作答
+ 有限回合内累计结果
```

以下内容一律不复制：

- Hasbro / Hersch and Company 的规则文字、示例句、卡面布局和术语体系；
- 官方产品页列出的示例目标及其禁词组合；
- 商业版的卡组、分类、题目顺序、难度、骰子变体、蜂鸣器和计分纸；
- 商品图片、logo、包装配色、字体、图标、音效、视频或截图；
- 第三方网页、App、开源仓库或用户整理题库。

### 2.3 中性原创命名

研究文件保留 `taboo-description-duel`，便于对应调度看板中的候选；生产作品必须
改成：

```text
id: word-detour-duel
title: 绕词对决
tagline: 绕开四个提示，也把答案说到对方心里
```

页面中的规则词使用“目标词 / 禁用提示 / 猜中 / 踩词 / 跳过 / 复核”，不使用
“Taboo 卡、Taboo 词、squeaker、经典 Taboo”等来源指向性表述。

## 3. 与当前 58 个 installed 项去重

本轮重新读取 `experiences/catalog.json` 的 58 个条目，并在 `experiences/` 与
`docs/` 搜索了猜词、秘密、线索、描述、热座和限时机制。最近邻如下。

| 现有作品 | 已覆盖机制 | 本候选必须保持的差异 |
| --- | --- | --- |
| `hot-seat-pictionary` | 描述者看秘密词、遮挡交接、自由绘画、猜词、共同得分 | 本作不绘画；描述者连续给口头线索，且每张有四个不能说的词，双方比较描述净分 |
| `lan-pictionary` | 两设备定向发送秘密题目、同步笔迹、文字猜词、共同计分 | 本作单设备、无服务和网络，不传笔迹；限制来自词卡而非画布 |
| `secret-recipe-code` | 双方轮流藏四格答案并根据位置反馈破译 | 本作没有组合密码、候选格、同位/错位反馈或七次逻辑排除 |
| `telegraph-codebook` | 使用三拍短长报码和四选一译码 | 本作线索是自然语言，不存在固定码本、节拍输入或候选按钮 |
| `closer-cards` | 两人轮流回答原创谈话卡，不评分、不记录 | 本作有秘密目标、禁用词、限时/限卡回合和对抗结算 |
| `compatibility-quiz` | 双方对同一问题独立选择后比较一致度 | 本作没有偏好问卷或答案一致率；胜负取决于描述回合结果 |
| `memory-bid` | 轮流回忆公开序列并竞拍可复述长度 | 本作不记忆序列、不竞拍，也不按连续复述长度得分 |
| `sealed-rps` | 双方密封选择后联合揭晓 | 本作没有双方同时秘密选择；秘密只属于当前描述者，并在回合中连续换卡 |

去重结论：

- “秘密词 + 猜词”本身已经存在，不能作为新增理由；
- 新增机制必须同时包含“自然语言描述、每卡四项禁用提示、连续换卡、描述者净分、
  对称复核”；
- 若实现退化成看词后随便描述，便与 `hot-seat-pictionary` 去掉画布后的骨架过近，
  应停止收录；
- 若改为在线房间或两台设备，则与 `lan-pictionary` 的基础设施路线相邻，也不再
  是本候选的 A 级增量。

## 4. 两人适配与公平性审计

### 4.1 商业版不能直接缩成两人

Hasbro 官方页面把产品定位为 4 人以上的团队游戏。
[官方 Virtual Rules PDF](https://www.hasbro.com/common/assets/Image/Printables/DAD261421C4311DDBD0B0800200C9A66/78216DB2356F4525A29F578AD0A56925/97751D1FE8714FF98F9807128516E74A.pdf?title=Taboo+-+Virtual+Rules)
同样使用两队，并由另一队监听禁词。两人版没有第三位或对方队员同时承担独立
裁判，因此不能声称保留了商业版的执法结构。

### 4.2 采用“描述者积分”的友谊赛

每位玩家担任相同次数的描述者。猜中时，当前描述者 `+1`；主动报告踩词时
`-1`；跳过 `0`。猜词者在对方的描述回合中需要善意合作，因此它不是博弈论意义
上的强激励相容对抗，而是适合情侣、夫妻、朋友或任意两位互相信任参与者的
友谊赛。

程序能保证：

- 两人各有两次描述回合；
- 每回合使用相同时间配置或相同卡数上限；
- 同一场不重复目标词；
- 两人的题卡按主题和难度桶对称分配；
- 计时、暂停、计分和结算使用同一规则；
- 复核前不能进入下一位玩家。

程序不能保证：

- 描述者没有口头说出目标词、同音词、词根或禁用提示；
- 猜词者没有故意拖延、放水或偷看；
- 双方对一句话是否构成踩词有相同判断；
- 打开开发者工具的参与者看不到脚本内存中的未来词卡。

生产 README 必须把这些限制写成“信任边界”，不能宣传“自动防作弊”。

### 4.3 不采用语音识别

[W3C Speech API Community Group 的 Web Speech API 规范](https://webaudio.github.io/web-speech-api/)
说明底层实现可以是服务端或客户端/嵌入式识别；`processLocally` 默认为 false，
此时用户代理可以选择本地或远程处理，要求本机处理时还需检查可用性并可能安装
语言。规范同时要求语音输入只能在用户明确知情同意后启动，并由用户代理明显指示
正在录音。

因此首版：

- 不请求麦克风；
- 不调用 `SpeechRecognition`、`MediaRecorder` 或音频上传；
- 不录制、转写、保存或回放双方声音；
- 不用不稳定的语音结果自动判罚；
- 不把“未来可加语音识别”写成首版依赖。

若未来需要自动口头裁判，应单独进入 B/D 级隐私和模型评估，不可悄悄加入本 A 级
作品。

## 5. 原创题库策略

### 5.1 数量与结构

首版目标为 **72 张原创中文词卡**，分成 6 个中性主题，每组 12 张：

1. 日常物件；
2. 食物与气味；
3. 自然与天气；
4. 动作与习惯；
5. 地点与出行；
6. 情绪与关系。

每张结构固定为：

```js
{
  id: "daily-01",
  theme: "daily",
  difficulty: 1,
  target: "原创目标词",
  forbidden: ["提示一", "提示二", "提示三", "提示四"]
}
```

规则约束：

- `id`、规范化后的 `target` 在全库唯一；
- `difficulty` 只能为 `1 / 2 / 3`，每主题每档数量相等；
- 每卡恰好四个非空禁用提示；
- 目标和禁用提示在同卡内规范化后不得相同或重复；
- 不含商业示例、商标、角色名、影视台词、歌词、名人或需要时事更新的答案；
- 不含羞辱、身体比较、性暗示、疾病、创伤、身份刻板印象或默认异性恋关系；
- 默认题库不含两人的私人信息；自定义内容以明文存在，README 明示；
- 任何 AI 草稿只能当候选，必须由人逐卡改写、查重和签字确认原创。

### 5.2 不能用“常见短词不受版权”替代审计

美国版权局对短词、名称和玩法方法的说明不等于第三方整套题库可以自由复制。
词卡的选择、编排、禁用词组合、说明文字和图形可能形成受保护表达或汇编边界。
因此即使单个词很常见，也不抓取、翻译或洗牌任何商业/开源/社区题库。

### 5.3 开源来源结论

本候选 **不采用任何开源项目、代码、运行库、题库或素材**。仓库既有
`docs/251-local-first-second-pass-candidate-refresh.md` 曾审查一个
`codenames-game` 候选，但本项目不使用其隐藏身份、团队词网、源码、词库、界面
或 AGPL 组件，也不把它列为实现参考。

正式 `ATTRIBUTION.md` 应写：

> 本作只研究了 Hasbro 官方公开页面所呈现的通用“描述目标词并避开一组提示词”
> 机制，以便界定品牌与表达边界；未复制或改写官方规则、示例、题卡、视觉、音效、
> 包装或源码。作品名称、两人回合、复核流程、状态机、代码、中文文案和 72 张词卡
> 均为独立创作。没有引入第三方开源代码、题库、字体、图片或音频。

## 6. A 级与本地隐私边界

建议生产文件：

```text
index.html
styles.css
config.js
logic.js
app.js
README.md
ATTRIBUTION.md
package.json
logic.test.js
```

运行时只使用相对经典脚本，不使用 module、`fetch()`、XHR、WebSocket、Worker、
Service Worker、动态 import、CDN、远程字体、图片、音频、摄像头、麦克风、定位、
文件选择器、Storage、Cookie、URL query/hash 或第三方统计。

A 级最终证据仍需三层：

1. 静态合同证明全部资源闭包在项目目录；
2. 操作系统真实双击 `index.html`，完成四个描述回合并重开；
3. localhost 浏览器验证交互、响应式、键盘、控制台与网络零请求。

当前阶段只证明架构可行，不代表入口、题库或浏览器 Gate 已完成。

秘密边界只承诺“正常流程不把当前题卡展示给猜词者”：

- 交接页和公共复核页不保留未公开词卡 DOM；
- 当前描述卡只在描述者确认后进入 DOM；
- 离开描述阶段立即卸载目标和禁用提示节点；
- 不写 Storage、URL、剪贴板、控制台、错误信息或可访问状态播报；
- `aria-live` 不朗读秘密卡；
- 屏幕阅读器可能通过扬声器读出焦点内容，使用者需要耳机或关闭朗读；
- 词库作为本地 JavaScript 数据存在，开发者工具可查看，不提供密码学保密。

## 7. 计时与页面生命周期

设置提供：

```text
30 秒 / 60 秒（默认）/ 90 秒 / 不计时
```

研究阶段最初建议每回合最多 8 张；后续 brainstorm、可执行规格与固定 schedule
把首版收敛为 **每回合最多 6 张**。计时与不计时使用同一上限，避免极快操作让
一方拿到更多题量。这样两位玩家始终有相同最大机会数。

[WCAG 2.2 Timing Adjustable](https://www.w3.org/WAI/WCAG22/Understanding/timing-adjustable.html)
要求作者设置的时间限制允许关闭、调整或延长，除非属于适用的例外。首版直接提供
不计时模式，并在开局前选择；进行中的双方共用同一模式，不能只给一方延时。

计时器冻结为：

- 权威剩余时间由 `deadline - now` 推导，不按 `setInterval` 次数扣减；
- 页面 `hidden`、`pagehide`、`blur` 或失焦时自动进入中断遮屏；
- 重新可见后不补扣后台时间，也不自动继续，双方主动确认恢复；
- 旧 timer callback 带 `roundToken`，回合改变后必须成为 no-op；
- 到时只派发一次 `TIME_EXPIRED`，和最后一次按钮动作通过 revision 串行化；
- 数字秒数是唯一时间语义，CSS 圆环不得决定到时。

[WHATWG HTML Living Standard 的 Page visibility 章节](https://html.spec.whatwg.org/multipage/interaction.html#page-visibility)
定义了 Document 的 `hidden / visible` 可见性状态，以及状态更新时在 Document
触发的 `visibilitychange` 事件。这里采用更保守的中断遮屏，避免后台节流导致
时间漂移，也避免恢复后秘密词卡仍裸露。

## 8. 输入、无障碍与降动效

[WCAG 2.2 Keyboard](https://www.w3.org/WAI/WCAG22/Understanding/keyboard.html)
要求除路径本质相关功能外，全部功能能通过键盘操作；
[Focus Visible](https://www.w3.org/WAI/WCAG22/Understanding/focus-visible.html)
要求键盘焦点有可见指示；
[Status Messages](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html)
要求不改变焦点的结果、进度或错误能被辅助技术识别。

首版冻结：

- 所有操作用原生 `<button>`、`radio` 和 `select`，不用自绘 div 按钮；
- Tab 顺序与视觉顺序相同，Enter/Space 激活焦点按钮；
- 不注册单字符全局快捷键，避免与输入法和 WCAG Character Key Shortcuts 冲突；
- 触控目标至少 48×48 CSS px，按钮之间保留可辨间距；
- `:focus-visible` 有双层高对比轮廓，不移除浏览器默认焦点而不给替代；
- 猜中、踩词、跳过和到时均有文字结果，不只靠颜色、震动或声音；
- 回合状态用克制的 `role="status"` 播报，不把目标或禁用词放入 live region；
- 描述者卡面标题与禁用列表使用真实 heading/list 语义；
- 320 CSS px 宽度不出现横向页面滚动，计分表可线性重排；
- 规则不依赖拖动、长按、双击、多点触控或特定按键节奏。

本玩法本质依赖两人之间的语言表达和理解。UI 可做到键盘与屏幕阅读器可操作，但
不能据此声称适合所有听觉、言语或认知条件；README 应诚实说明并允许选择不计时。

[W3C C39 技术说明](https://www.w3.org/WAI/WCAG22/Techniques/css/C39)
给出 `prefers-reduced-motion` 避免交互动画的方式。首版无需持续动画：

- 正常模式只允许 `<= 180ms` 的淡入/边框过渡；
- reduced-motion 下全部非必要 transition/animation 为 `0ms`；
- 不做倒计时抖动、全屏闪烁、翻卡 3D、自动滚动或庆祝粒子；
- 规则推进不等待动画事件；
- 分数变化使用静态文本和 status，不用跳动数字承担唯一反馈。

## 9. 风险与 Go / No-go Gate

| 风险 | 控制 | 结论 |
| --- | --- | --- |
| 品牌混淆 | 生产 ID/标题/元数据完全中性，不使用商业 logo、示例或宣传措辞 | 可控 |
| 题库版权 | 72 张逐卡原创；不抓取、翻译、复制或 AI 洗稿第三方词库 | 可控但需人工审计 |
| 两人无独立裁判 | 明示友谊赛信任模型；自报踩词 + 回合后双方复核 | 可接受，不能宣传防作弊 |
| 猜词者偷看 | 描述者朝向屏幕；交接遮屏；秘密离开阶段后卸载 DOM | 正常流程可控，非强安全 |
| 语音隐私 | 不请求麦克风、不识别、不录音、不联网 | 可控 |
| 题量公平 | 两人相同描述回合、相同模式、每回合相同 8 卡上限、难度桶对称 | 可控 |
| 计时可访问性 | 30/60/90/不计时；隐藏时中断并遮屏 | 可控 |
| 与画猜重复 | 必须保留四禁词约束、连续换卡、净分与复核 | 可控 |

后续继续的硬 Gate：

- 产品名称确认为 `绕词对决 / word-detour-duel` 或另一个不含商业品牌的原创名；
- 72 张词卡完成原创、敏感内容、重复、商标和难度审计；
- 规格保留信任边界，不加入虚假的自动语音裁判；
- 核心逻辑能证明两位描述者机会与难度分配对称；
- A 级零网络、零权限、零存储合同可被项目测试和 repository verify 验证。

若任何人坚持使用 `Taboo` 品牌、复制现成题库，或要求在 A 级单设备中自动可靠
识别口头违规，应立即 no-go，不进入生产。

## 10. 一手来源清单

| 来源 | 用途 | 本作不取得的权利 |
| --- | --- | --- |
| [Hasbro Taboo 官方产品页](https://consumercare.hasbro.com/en-in/product/taboo-game/304C0329-5056-9047-F5D1-8C8A886E0D35) | 核对官方定位、组件、4+ 玩家与商标声明 | 不复制名称、规则、卡片、示例、图形或音效 |
| [Hasbro Virtual Rules PDF](https://www.hasbro.com/common/assets/Image/Printables/DAD261421C4311DDBD0B0800200C9A66/78216DB2356F4525A29F578AD0A56925/97751D1FE8714FF98F9807128516E74A.pdf?title=Taboo+-+Virtual+Rules) | 核对团队与对方监听禁词结构 | 不复制规则表达、词卡或页面 |
| [USPTO What is a trademark](https://www.uspto.gov/trademarks/basics/what-trademark) | 区分品牌来源标识与一般词语 | 不是完整清查或法律意见 |
| [U.S. Copyright Office Games](https://www.copyright.gov/register/tx-games.html) | 区分玩法方法与具体文字/图形表达 | 不推导第三方题库可复制 |
| [U.S. Copyright Office Circular 33](https://www.copyright.gov/circs/circ33.pdf) | 区分想法、方法、系统、名称与原创表达 | 不替代逐项版权审计 |
| [W3C Web Speech API](https://webaudio.github.io/web-speech-api/) | 确认语音识别的本地/远程实现、同意与录音指示边界 | 不把示例代码、麦克风或语音服务引入项目 |
| [W3C WCAG 2.2 Keyboard](https://www.w3.org/WAI/WCAG22/Understanding/keyboard.html) | 键盘等价路径 | 不宣称完整 WCAG 认证 |
| [W3C WCAG 2.2 Timing Adjustable](https://www.w3.org/WAI/WCAG22/Understanding/timing-adjustable.html) | 提供不计时与可调时限 | 不以游戏性为借口取消可调方案 |
| [WHATWG HTML Page visibility](https://html.spec.whatwg.org/multipage/interaction.html#page-visibility) | 隐藏时中断、遮屏与恢复 | 不使用页面可见性作为防作弊证明 |

## 11. 下一阶段

下一阶段只做 brainstorm，比较：

1. 连续限时换卡；
2. 固定卡数不限时；
3. 文本输入自动检查；
4. 麦克风自动裁判。

必须从两人公平、A 级、隐私、可访问性和去重五个维度做决策，不能因为商业玩法
知名就默认复刻。
