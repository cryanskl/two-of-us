# S17“蛋糕点烛”定向调研：把愿望，一盏一盏点亮

- 调研日期：2026-07-23
- 对应创意：[`40-idea-backlog.md`](./40-idea-backlog.md) 的 S17“蛋糕点烛”
- 建议目录：`experiences/surprises/candle-wishes/`
- 建议启动等级：A（双击 `index.html`，无安装、服务、权限或公网）
- 本轮范围：研究、brainstorm 与来源复核；不创建生产目录

## 1. 结论

S17 可以做，但不应成为一张自动播放的生日贺卡，也不应把麦克风吹气设为必经
路径。

推荐作品名为“把愿望，一盏一盏点亮”：准备者预先写好五支蜡烛的短标签、
当下线索和愿望。收礼者每次看到一条线索，从五支有文字标签的真实按钮中选出
对应蜡烛；选对后火焰亮起，并把这一句愿望追加到公开清单。选错不扣分、不重置，
只提示“这一盏还没轮到”。五支全部点亮后仍要主动按下“收下这些愿望”，私人
标题、完整留言与署名才进入页面。

这是一段有限、确定、无失败的惊喜：

- 固定五支蜡烛，不使用年龄、日期或随机数决定数量；
- 进入 lighting 后五个标签始终公开，未来线索、未来愿望与最终私信不提前进入 DOM；
- 顺序由准备者配置，但当前线索让每一步都有可理解的选择，不靠盲猜；
- Pointer、鼠标、触屏与键盘都操作同一组原生 `<button>`；
- 火焰和蛋糕用 HTML/CSS/SVG 基本图形表达，图片损坏不影响完成；
- 不申请麦克风权限，不播放商业生日歌，不加载远程字体或庆祝素材。

进入实现的五项条件成立：

1. 主分类唯一：一人准备线索与愿望，另一人独自解开并收下；
2. A 级可行：经典脚本、原生按钮与 CSS/SVG 足够；
3. 首局 30 秒可懂是后续原型的验收目标：看当前线索，点对应蜡烛，依次点亮五句；
4. 去掉音频、图片、生日主题和私人照片后，“线索匹配 → 累积愿望 → 主动收下”
   仍成立；
5. 最小版本只有一个入口、一种顺序选择机制和一个最终结果。

## 2. 为什么现在研究 S17

创意池仍有 21 项未实现。当前距离生产最近的 S13 花束、C19 影子舞、S09
夸夸机，以及正在推进的 S11 雪球，都有明确的用户视觉确认 Gate。S17 尚未
进入定向调研，不依赖这些待确认决策，适合作为第二轮调研维护批次继续前进。

本轮不把“完成研究”说成“完成作品”。只有后续规格、实现、来源声明、目录接入、
整仓测试和真实浏览器玩法验收全部通过，S17 才能在创意池标记为已实现。

## 3. 与现有作品的机制边界

| 已有作品 | 已覆盖机制 | S17 必须保持的差异 |
| --- | --- | --- |
| `star-code-unlock` | 根据三条私人提示选择星点并解锁短句 | S17 的五个对象始终有可见标签，正确步骤累积五句愿望；最终还保留一次主动收下 Gate |
| `nested-gift` | 用不同手势逐层打开固定礼盒 | S17 每步都要把当前线索与五个并列对象匹配，不是只操作唯一当前层 |
| `future-cookie-notes` | 任意顺序打开三枚签，再主动合成邀请 | S17 顺序由准备者冻结；每步只接受当前对应蜡烛，并按该顺序形成愿望清单 |
| `star-code-unlock` / `fog-window-letter` | 私密答案或结语在完成 Gate 后出现 | S17 沿用同类隐私原则，但未来线索、未来愿望和 final message 也必须逐层隔离 |
| `wish-fireworks` 调研 | 三次必定成功的蓄力表现，第三次形成完整私信 | S17 没有计时、蓄力、Canvas 点阵或表现 token；核心是五选一的语义匹配 |
| `memory-letter` | 依次阅读三段固定回忆 | S17 不是“下一页”按钮；每一步要从同一组蜡烛中识别目标 |

蛋糕和火焰只是题材。只有“当前线索 → 五支中选择 → 正确项永久点亮并追加愿望
→ 五支齐后主动收下”同时成立，才算实现 S17。

这仍是 `star-code-unlock` 已建立的“私人线索 → 判断对象 → 逐步解锁 → 主动揭晓”
循环的对象化变体，不宣称发明了全新的线索匹配类型。S17 的保留价值在五个并列
实体对象、愿望前缀持续累积、路线与展示顺序分离，以及无 Canvas 的直接操作；
后续验收必须证明这些差异真实存在，不能只换成蛋糕题材。

## 4. 方案比较

### 4.1 自动依次亮起

页面每隔一段时间自动点亮一支蜡烛并弹出一句话。

**排除。** 它是动画贺卡，不是互动；计时还会造成阅读速度、后台标签页与
reduced-motion 分支。

### 4.2 麦克风吹灭或点亮

公开项目常用 `getUserMedia()`、频谱阈值或语音识别检测吹气。它有很强的实体
隐喻，但不适合作为 A 级基线：

- 必须处理权限拒绝、无麦克风、设备占用和 Promise 长期不决；
- 音量阈值受设备、环境噪声和浏览器处理影响，无法成为确定规则；
- 麦克风属于明显的隐私能力，浏览器必须提示并由用户授权；
- 语音/吹气不是运动、语言、听力和固定设备场景下的通用入口；
- 本作核心是“哪一支对应这一段共同记忆”，不是声音识别。

**排除。** 首版不访问 `navigator.mediaDevices`、Web Speech、AudioContext 或
任何权限 API。未来若做增强，也只能默认关闭，并与按钮保持完整等价。

### 4.3 隐藏顺序、任意试错

五支蜡烛只有编号，用户靠连续猜测找出准备者的隐藏排列。

**排除。** 任意排列没有可推理信息，会把私人惊喜变成机械试错；错误次数、
连错惩罚或重置都没有表达价值。

### 4.4 当前线索与可见短标签匹配

每支蜡烛有一条准备者写的短标签，例如“那场雨”“第一次远行”“深夜面馆”。
当前只展示一条较完整的线索，例如“先从我们都没带伞的那天开始”。收礼者在
五支中选出对应标签；正确时揭晓这一支的愿望，错误时状态不推进。

**采用。** 选择有个人含义但不要求猜随机答案；配置能承载双方的梗，默认内容
仍可直接运行；原生按钮天然覆盖鼠标、触屏、键盘与读屏。

### 4.5 自由顺序点亮

允许用户任意选蜡烛，选择顺序直接成为最终愿望顺序。

**保留为未来变体，不进入首版。** 它与 `future-cookie-notes` 的任意顺序收集
过近，也削弱“准备者设计了一条回忆路径”的特点。

## 5. 冻结产品主线

### 5.1 五支蜡烛

首版固定五支，而不是从生日年龄派生：

- 数量足以形成一段有起承转合的回忆路径；
- 320px 下可以用 `2 + 3` 或单列重排保持至少 48px 命中区；
- 公开标签、当前线索与已揭晓清单不会把页面撑成内容管理器；
- 状态、配置和测试不需要为 1–99 支蜡烛制造无意义分支。

每支配置项建议固定为：

```js
{
  id: "rain",
  label: "那场雨",
  cue: "先从我们都没带伞的那天开始",
  wish: "愿以后的雨天，我们仍然愿意替对方留一半伞。"
}
```

`id`、`label`、`cue` 与 `wish` 都是纯文本。配置不能提供 HTML、SVG path、
CSS、URL、事件名、函数或任意 attribute。五个 ID 和 label 必须唯一；顺序就是
唯一正确路径。

按钮展示顺序不得沿用这条正确路径。规则层冻结索引排列：

```text
[2, 4, 0, 3, 1]
```

页面按这个排列投影五支蜡烛，而 reducer 的 `cursor` 仍读取配置数组顺序。这样
准备者只维护一份五对象配置，不需要同步第二份 `displayOrder`；接收者也不能靠
从左到右依次点击绕过线索。排列属于规则常量，不由 config、随机数、视口或上次
选择改变。

### 5.2 四阶段

```text
intro → lighting → ready-to-receive → complete
```

- `intro`：只有公开标题、固定说明和“开始点亮”；不创建 label 或任何配置私密内容；
- `lighting`：只公开当前 cue、五个 label、已经点亮的 wish；
- `ready-to-receive`：五个 wish 已公开，final title/message/signature 仍不存在；
- `complete`：主动确认后才创建称呼、私人标题、完整留言和署名。

开始与最终揭晓都要用户主动触发，避免首次加载或第五支点亮时自动暴露私信。

### 5.3 选择规则

- 当前目标恒为配置数组 `cursor` 对应的 candle；
- `TRY_CANDLE` 只接受五个白名单 ID；
- 选错合法 ID 时保持原状态引用，页面只给固定中性提示；
- 选对时原子追加 ID、公开对应 wish、递增 cursor/revision；
- 重复点已亮蜡烛、未来蜡烛、额外字段、getter、污染原型或错阶段动作均不推进；
- 第五支正确点亮后进入 `ready-to-receive`，不自动 complete；
- `REVEAL` 只在五支完整且顺序与配置一致时生效；
- `RESTART` 只在 complete 出现，并重新回到不含私密节点的 intro。

错误不是“失败”。不记录分数、连错、最佳次数、用时或准备者评价。

## 6. 权威状态与公开视图草案

权威 state 可收敛为：

```js
{
  version: 1,
  phase: "intro" | "lighting" | "ready-to-receive" | "complete",
  content,
  litIds,
  cursor,
  revision
}
```

初步 action：

```text
START
TRY_CANDLE { id }
REVEAL
RESTART
```

`getPublicView()` 必须精确投影，而不是把 `content` 整体交给页面：

- intro 不含 label、cue、wish、finalTitle、finalMessage、signature；
- lighting 只含按固定展示排列投影的五个公开 label、当前 cue、已揭晓 wish 和
  可操作状态；不公开 route index、target ID 或未来 cue/wish；
- ready-to-receive 不含 final 三字段；
- complete 才含 finalTitle、finalMessage、signature；
- 所有 view 递归冻结并与 state/config 断开可变引用。

未来 cue 和 wish 即使最终会在同一设备出现，也不能提前藏在 `data-*`、`aria-label`、
模板、透明 DOM、Canvas text 或离屏列表。

## 7. 配置与隐私边界

建议配置包含：

```text
publicTitle / publicInstructions / recipient / candles[5]
finalTitle / finalMessage / signature
```

- 默认值必须完整可玩，不要求用户先修改 TODO；
- 字符串先按 Unicode code point 限长，再做控制字符与边界空白处理；
- 任一 candles schema、唯一性或长度不合法时整组回退，不能拼成半份路线；
- final 三字段逐字段或整组回退的策略必须在规格中唯一冻结；
- 页面不使用 storage、URL query 或 hash 承载私人内容；
- README 必须提醒：本地运行和“不上传”不等于源文件加密，拿到文件夹的人可以
  阅读 `config.js`。

最有价值的用户贡献点是后续 `config.js` 中五个 candle 对象：每个对象约四行，
真正决定双方的回忆路径。脚手架和即时校验尚未存在，本轮不要求用户提前写一份
无法运行的配置。

## 8. 表现、输入与无障碍

- 五支蜡烛都是真实 `<button>`，不在 Canvas 内做自绘命中；
- DOM 顺序与视觉顺序固定；窄屏重排不能让 Tab 顺序反转；
- 正确选择会禁用刚点亮的按钮，因此把焦点移到更新后的当前线索标题；下一次
  Tab 从固定展示顺序进入首个未点亮按钮，不能自动跳到下一正确蜡烛；
- 五支齐后把焦点移到“收下这些愿望”；
- 错误选择不抢焦点，只在单一 `role=status` 给固定提示；
- 火焰使用静态 CSS/SVG 基本形，文字“已点亮”冗余表达，不只靠颜色；
- `prefers-reduced-motion` 下取消摇曳、上升和缩放，规则立即完成；
- forced-colors 下保留真实边框、焦点轮廓、按钮文字和点亮状态；
- 每个命中区目标至少 48×48 CSS px，不能把细蜡烛本体当作唯一点击面积；
- 无 JavaScript 只显示公开标题、固定说明和启用 JavaScript 提示，不伪造愿望；
- 不注册全局字符快捷键；Enter/Space 使用原生 button 行为即可。

## 9. A 级与依赖结论

首版只需要：

- HTML 语义与原生按钮；
- CSS/SVG 基本图形；
- 经典脚本 `config.js → logic.js → app.js`；
- `node:test` 覆盖纯逻辑与静态页面合同。

不需要：

- npm 运行依赖、构建器、模块脚本或 localhost；
- 图片、远程字体、音频、视频或生日歌；
- 麦克风、摄像头、传感器、剪贴板或文件权限；
- Canvas、WebGL、Worker、Service Worker、WebSocket 或本地模型；
- Storage、随机、日期、账号、分享或公网。

因此 S17 不增加统一 setup 的依赖，也不改变现有共享运行时。作品目录完整复制后
仍应双击 `index.html` 直接运行。

## 10. 一手来源与许可证复核

下表固定到 2026-07-23 实际复核的 commit。正式实现仍需在 README 与
`ATTRIBUTION.md` 逐项复述，不能只链接本研究。

| 来源 | 固定版本与许可证 | 仅借鉴/研究价值 | 明确不复制 |
| --- | --- | --- | --- |
| [`ololx/birthday-cake`](https://github.com/ololx/birthday-cake/tree/d51cd5c73c3171d6b769b5da1b9072beca691ce6) | commit `d51cd5c73c3171d6b769b5da1b9072beca691ce6`；GitHub 识别为 Unlicense，仓库 [`LICENSE`](https://github.com/ololx/birthday-cake/blob/d51cd5c73c3171d6b769b5da1b9072beca691ce6/LICENSE) 含公有领域奉献和广泛使用许可；README 列 Alexander A. Kropotin 为初始作者 | 单 HTML 可本地打开、逐支蜡烛可直接点击的能力对照 | 源码、CSS 蛋糕、参数设计、动画、文案、截图和视觉 |
| [`VIDAKHOSHPEY22/Birthday-Cake-Blow-Candle`](https://github.com/VIDAKHOSHPEY22/Birthday-Cake-Blow-Candle/tree/3d364f985b2d96057f30d3fc67c5ee71ec37556f) | commit `3d364f985b2d96057f30d3fc67c5ee71ec37556f`；[`LICENCE`](https://github.com/VIDAKHOSHPEY22/Birthday-Cake-Blow-Candle/blob/3d364f985b2d96057f30d3fc67c5ee71ec37556f/LICENCE) 为 MIT，Copyright 2025 Vida Khoshpey | 麦克风吹蜡烛、响应式庆祝页作为排除方案与权限对照 | 代码、图片、音频、Canvas 蜡烛、从 unpkg/lottie.host 加载的 Lottie confetti、文案和视觉 |
| [`elixpo/wish.elixpo`](https://github.com/elixpo/wish.elixpo/tree/bf6ec8cae8c756203e059940d42089504ae43ec8)（曾用路径 `Circuit-Overtime/Birthday`，当前会重定向） | commit `bf6ec8cae8c756203e059940d42089504ae43ec8`；[`LICENSE`](https://github.com/elixpo/wish.elixpo/blob/bf6ec8cae8c756203e059940d42089504ae43ec8/LICENSE) 为 MIT，Copyright 2024 Ayushman Bhattacharya | 个性化贺卡、蜡烛与最终私信分层，以及云端/麦克风方案的边界对照 | Next.js、Cloudflare D1、数据库、访问码、麦克风、素材、样式和全部实现 |
| [MDN `getUserMedia()`](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia) | Web 平台文档；2025-11-30 更新 | 确认麦克风需要权限、可能拒绝或长期不决，并带隐私/安全要求 | 不是代码、素材或运行依赖 |
| [W3C Pointer Events Level 3](https://www.w3.org/TR/pointerevents3/) | W3C Recommendation，2026-06-30 | 校准统一 Pointer 输入与原生控件边界 | 不复制示例代码，不增加运行依赖 |
| [WCAG 2.2 Target Size](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html) 与 [Animation from Interactions](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html) | W3C WAI 官方解释页 | 校准命中区与可关闭交互动效 | 不是视觉来源或组件库 |

正式作品采用**机制自行重写**：

1. 不复制、修改、链接或 vendoring 上述项目代码；
2. 不使用其图片、SVG、音频、生日歌、字体、截图、文案、配色或 trade dress；
3. 不引入其依赖、云端、数据库、权限、分析或部署配置；
4. 本作状态机、五段默认文案、线索匹配、DOM、CSS/SVG 与测试独立编写；
5. 即使来源许可证允许复制，也保留固定 commit、权利主体、借鉴摘要和未复制范围。

## 11. 风险与规格前置问题

### 11.1 私密边界比普通逐页卡更严格

未来 cue/wish 虽不是最终留言，也属于准备者设计的揭晓顺序。规格必须冻结阶段
sentinel，并扫描 HTML、ARIA、属性、Canvas 和不可见节点，不能只隐藏 final。

### 11.2 错误选择的播报不能污染权威状态

错误无惩罚且不推进，但读屏用户仍需要知道原因。规格要明确由 reducer 返回同
引用、app 根据“合法点击 + 同引用 + 非当前 ID”写固定 live 文本，还是把 notice
纳入 state；两种不能并存。

推荐前者：notice 是一次性界面反馈，不影响回放、结果或 revision。app 必须只读
当前 public view 判断，不能偷看未来 content。

### 11.3 焦点移动必须只发生在用户前台动作

正确点击后可聚焦下一目标；第五支后聚焦主动收下；complete 聚焦私人标题。
重启、页面隐藏、BFCache 或配置回退不能在返回页面后迟到抢焦点。

### 11.4 CSS 火焰不是信息源

“已点亮”必须同时出现在 button 文本/状态和愿望清单中。测试不能把是否有
`.flame--lit` 当作完成证据。

### 11.5 个性化内容需要整份原子验证

五段路线一旦出现重复 ID、空线索、非法控制字符或 getter 异常，应整组回默认。
半份自定义加半份默认会让 label、cue、wish 对不上，属于比“显示不漂亮”更严重
的业务错误。

## 12. 下一阶段建议

**Go，进入可执行规格。**

下一份规格至少冻结：

1. 默认五支 candle inventory 与所有字符串上限；
2. 路线数组与固定 `[2, 4, 0, 3, 1]` 展示排列的独立性；
3. 配置是整组回退还是字段回退；
4. 四阶段、四动作、revision、非法 state/action 与 JSON replay；
5. exact public view 与逐阶段隐私 sentinel；
6. 错误选择 live feedback 的所有权；
7. DOM 节点顺序、非泄漏焦点、无 JS、reduced-motion 与 forced-colors；
8. 320/390/768/1280/1504 视口 Gate；
9. README/ATTRIBUTION 的固定来源与零复制声明；
10. catalog A 级、经典脚本、零网络/存储/权限的机器 Gate；
11. Chrome 跑完五支、一次错误选择、最终揭晓与重开的完整证据。

本研究完成不等于长期目标或 S17 作品完成；创意池暂不标记“已实现”。
