# A 级「默契电报码」合作体验规格

## 1. Brainstorm 结论

本批实现一款单设备、轮流交接的双人合作报码游戏。两人先共同学习一套公开的六码本；每轮发送方看到目标词和标准三拍报码，用“短讯号 / 长讯号”键录入三拍并封存；交接后接收方只听取并观看逐拍播放，从四个词中译码。四轮角色交替，只有发送正确且译码正确才增加共同分。

| 方案 | 价值 | 风险与成本 | 本批决定 |
| --- | --- | --- | --- |
| 接收方原样复刻越来越长的节拍 | 记忆压力明确 | 与“节拍接力”的核心机制重复 | 不采用 |
| 一人自由输入摩斯电码，另一人猜任意文本 | 自由度高 | 输入法、词典与失败反馈失控 | 不采用 |
| 公开六码本 + 三拍报码 + 四选一译码 | 规则 15 秒可懂，双方都对结果负责 | 需要严密的交接隐藏与阶段播放 | 采用 |
| 发送时自动校正为标准报码 | 降低挫败 | 发送者不再真正参与准确性 | 不采用 |
| 接收时一直显示报码轨迹 | 易于作答 | 退化成查表题，听觉节奏失去意义 | 不采用；播放后熄灭，可重听一次 |
| 各自计分或错误扣分 | 对抗性更强 | 破坏共同完成电报的语义 | 不采用；只记录共同译对数 |

作品名为「默契电报码」，目录 ID 为 `telegraph-codebook`，主分类为双人合作，等级 A。它补齐“共同学习映射 → 一方编码 → 热座交接 → 另一方解码”的互动模型，不新增运行依赖。

## 2. 受众、任务与边界

- **玩家**：坐在同一台电脑或手机前、愿意轮流把设备交给对方的两个人；
- **唯一任务**：发送方准确打出目标的三拍报码，接收方根据播放选择目标词；
- **单局长度**：固定四轮，每人发送两轮，约 3–5 分钟；
- **语气**：像深夜共同守着一台旧电台，亲密、克制、不把默契分数包装成关系评价；
- **不防口头作弊**：页面只保证正常交接时不泄露当前目标，无法也不试图阻止玩家直接说答案或查看源码。

## 3. 严格最小范围

只实现：

- 六个词与唯一三拍短/长映射；
- 四轮不重复目标、每轮目标加三个不重复干扰项；
- 珊瑚方 / 青绿方交替发送；
- 发送方交接、三拍录入、撤回与封存；
- 接收方交接、自动播放、一次重听、四选一与结果；
- 共同分、完成态与重新报码；
- Web Audio 渐进增强与完整视觉替代；
- 鼠标、触控与键盘操作。

明确不做昵称编辑、自由文本、摩斯码标准教学、倒计时、速度评分、独立胜负、排行榜、存档、分享、麦克风、语音识别、联网、双设备同步或背景音乐。

## 4. 固定六码本与回合计划

### 4.1 公开码本

| 词 | 三拍 | 文本表示 |
| --- | --- | --- |
| 月亮 | 短、短、长 | `··—` |
| 星星 | 短、长、短 | `·—·` |
| 云朵 | 短、长、长 | `·——` |
| 热茶 | 长、短、短 | `—··` |
| 电影 | 长、短、长 | `—·—` |
| 散步 | 长、长、短 | `——·` |

不使用全短与全长，减少连续相同节奏造成的误判；这套映射是本作品自定义规则，不宣称等同于国际摩斯电码。

### 4.2 生成规则

- 每局从六个词中无放回抽取四个目标；
- 每轮候选为目标加三个不同的非目标词，并独立打乱位置；
- 角色按 `珊瑚方、青绿方、珊瑚方、青绿方` 固定交替；
- 浏览器使用 `crypto.getRandomValues` 和拒绝采样生成无偏整数，再执行 Fisher–Yates；
- 纯逻辑接收已生成的回合计划并严格校验，随机源不进入 reducer，测试可注入固定计划；
- 若安全随机源不可用，使用固定的四轮默认计划并在界面中正常运行，不退回 `Math.random()`。

## 5. 状态机

```text
intro（共同查看完整码本）
  └─ START → senderHandoff

senderHandoff（只显示本轮发送者）
  └─ READY_SENDER → sending

sending（显示目标与标准报码）
  ├─ TAP(short|long，最多三拍) → sending
  ├─ UNDO → sending
  └─ SEAL（恰好三拍）→ receiverHandoff

receiverHandoff（目标、标准报码、已发报码都不进入 DOM）
  └─ READY_RECEIVER → playback

playback（逐拍亮灯/发声，禁止作答）
  └─ FINISH_PLAYBACK → guessing

guessing
  ├─ REPLAY（最多一次）→ playback
  └─ GUESS(candidate) → result

result
  └─ NEXT
       ├─ round < 3 → senderHandoff
       └─ round = 3 → complete

complete
  └─ RESTART → intro（重新生成回合计划）
```

权威状态字段：

```text
phase: intro | senderHandoff | sending | receiverHandoff | playback | guessing | result | complete
roundIndex: 0..3
rounds: four validated round records
sentPulses: array of short|long, max length 3
guess: null | codebook id
replaysUsed: 0 | 1
score: 0..4
resultKind: null | delivered | encodingError | decodingError | bothError
playbackToken: non-negative integer
```

约束：

- 任一动作只在对应阶段生效，`event.repeat` 不得越过 Gate；
- `SEAL` 只要求三拍，不自动纠正发送错误；
- 得分条件为 `sentPulses` 等于目标标准报码且 `guess` 等于目标；
- `resultKind` 同时解释报码与译码责任，不使用“谁拖后腿”等责备文案；
- `FINISH_PLAYBACK` 是开放作答的唯一 Gate；每次进入 playback 增加 token，旧计时器携带旧 token 时无效；
- 每轮结束后清空 `sentPulses / guess / replaysUsed / resultKind`；
- 非法计划、畸形状态或非法动作返回冻结的安全状态，不修改调用方对象。

## 6. 交接与隐藏信息边界

这是一种界面级隐私，不是安全隔离：目标与回合计划存在本页 JavaScript 内存，查看源码或开发者工具仍可发现。

- intro 公开显示完整六码本；
- senderHandoff 只显示“请把设备交给珊瑚方 / 青绿方”，不提前显示目标；
- sending 才把当前目标与标准报码写入 DOM；
- receiverHandoff 必须重新渲染，DOM 中不得残留目标、标准报码、已发报码、隐藏属性、`aria-label`、title、data 属性或 CSS 变量；
- playback 只根据定时索引显示当拍的“短 / 长”灯光，不把完整序列写入 DOM；
- guessing 只显示四个候选词，不显示码本、目标或完整发送序列；
- result 才重新显示目标、标准报码、实际报码和本轮结论；
- 不把秘密写入 console、URL、存储、网络请求、日志或错误文本。

自动测试分别截取 sending、receiverHandoff、playback 与 guessing 的可见文本和完整 DOM，验证隐藏边界。

## 7. 播放、音频与输入

- 短讯号点亮 180ms，长讯号点亮 480ms；拍间空白 220ms；
- Web Audio 使用同一个延迟创建/恢复的 `AudioContext`，短长均为柔和 520Hz 正弦音；
- 音频创建失败、浏览器禁用或 `file://` 自动播放受限时，灯光、标签与节奏仍完整可玩；
- 播放期间按钮 disabled，定时器只负责派发携带 token 的结束事件；页面隐藏、重开与卸载时取消定时器；
- 键盘：发送阶段 `S` / `.` 为短，`L` / `-` 为长，Backspace 撤回，Enter 封存；猜测阶段 `1–4` 选择，`R` 重听；
- 原生按钮触控目标至少 48×48px，按下态不能只靠颜色；
- `prefers-reduced-motion` 下取消按键位移与灯光余辉，但保留时长差、文字“短 / 长”和状态推进；
- 状态变化使用 `aria-live="polite"`，播放中的每拍不反复打断屏幕阅读器，播放结束后统一播报“电报已收齐，请译码”。

## 8. 视觉规格

视觉概念稿：[深夜双人无线电台桌面与移动端](assets/telegraph-codebook/concept.png)，原生尺寸 `1503×1046`。概念稿锁定仪表台构图、材质、色彩层级、双键关系和移动端堆叠；所有中文、报码、分数、按钮与状态必须由 HTML/CSS 渲染，不把概念图直接当界面背景。

### 8.1 设计方向

**深夜民用无线电台 + Art Deco 仪表**。背景为接近黑色的深汽油蓝，控制台为哑光漆面金属与细黄铜边；发送方使用珊瑚色，接收方使用低饱和薄荷绿，仪表照明为暖琥珀。亲密感来自两个不同颜色的电键与共同守台，不使用爱心堆叠、军用徽章、霓虹赛博或 SaaS 卡片网格。

固定色值：

| 角色 | 值 |
| --- | --- |
| 页面背景 | `#07191c` |
| 控制台 | `#10282a` |
| 深表面 | `#0a1517` |
| 暖奶油文字 | `#f0d5a5` |
| 黄铜边 | `#a8783f` |
| 琥珀灯 | `#e3a33d` |
| 珊瑚发送 | `#d96f5f` |
| 薄荷接收 | `#7da79a` |

不使用 CSS 渐变；通过纯色、细边、内外阴影和轻微噪点质感形成深度。

### 8.2 构图与组件

- 桌面：安静顶栏；左侧六码本窄轨；中央为目标牌、模拟表盘、三拍灯带和并列双电键；右上为共同分；
- 移动端：标题与 HUD → 当前任务 → 表盘/灯带 → 两个纵向大键 → 次/主动作 → 隐私说明；
- H1 使用有旧报刊气质的中文衬线回退，UI 使用紧凑无衬线，报码使用等宽字体；
- 不用默认圆角卡片堆叠；控制台是一个连贯开放表面，码本是一条真正的设备侧轨；
- 三拍灯同时用长度、文字和亮灭表达短长；
- 发送阶段两个大键同样可用，但珊瑚/薄荷只表达双人角色，不暗示短长固定属于某个人；
- 主动作每阶段只有一个；disabled 必须保留足够可读对比。

## 9. 首屏与阶段文案锁

允许出现的固定首屏文案：

- `← Two of Us`
- `默契电报码`
- `学会同一套暗号，把一句话送到对方手里。`
- `今晚的六码本`
- 六条码本映射
- `四轮交替发送，每人两次。`
- `开始守台`
- `不联网 · 不保存`

发送阶段允许：轮次、发送者、共同分、`这轮请发送：{目标}`、标准三拍、`短讯号`、`长讯号`、`撤回一拍`、`封存电报`。接收阶段允许：四个候选、`再听一次`、剩余重听次数与中性结果说明。不添加 eyebrow、徽章、假指标、第二套说明卡或装饰性英文系统文案。

## 10. 文件与纯逻辑接口

```text
experiences/co-op/telegraph-codebook/
├── index.html
├── styles.css
├── logic.js
├── app.js
├── logic.test.js
├── README.md
└── assets/
    └── ATTRIBUTION.md
```

`logic.js` 使用 IIFE 暴露 `window.TELEGRAPH_CODEBOOK_LOGIC`，并可由 Node `vm` 加载。最小接口：

```text
CODEBOOK
createInitialState(rounds?)
validateRounds(rounds)
tapPulse(state, pulse)
undoPulse(state)
sealTelegram(state)
finishPlayback(state, token)
replay(state)
guess(state, candidateId)
nextRound(state)
restart(state, rounds?)
```

浏览器层负责无偏生成回合计划、DOM 派生、Web Audio、播放调度、键盘与焦点；纯逻辑不读取 DOM、时钟、随机源或音频。

## 11. 本地优先与借鉴声明

- 运行页不使用 `fetch`、XHR、WebSocket、CDN、远程字体、存储、Service Worker、账号、统计或遥测；
- 作品直接双击 `index.html` 即可运行，刷新即清空；
- 不请求照片、麦克风、摄像头、位置、剪贴板或通知权限；
- 首版玩法、规则文本、状态机与代码均为本仓库原创实现；
- 视觉构图借助 OpenAI ImageGen 生成的概念稿进行设计探索，运行时不依赖该生成图；
- 借鉴的一般知识仅包括摩斯式“短/长脉冲编码”概念、Fisher–Yates 洗牌与 Web Audio 浏览器 API，不复制任何特定开源项目代码、素材、文案或关卡；
- `assets/ATTRIBUTION.md` 必须写明上述边界。若后续引入第三方字体、音效、纹理或代码，先核验许可证并逐项补充作者、链接、许可证、修改与本地路径。

## 12. 验收 Gate 与提交边界

### 自动 Gate

- reducer 覆盖合法/非法阶段、三拍上限、撤回、封存、token 过期、一次重听、四类结果、四轮完成与冻结；
- 回合生成覆盖目标无重复、候选唯一、包含目标、无偏整数边界和无 crypto 回退；
- catalog 覆盖 A 级入口、无 Module、无远程资源、无网络/存储/权限 API；
- DOM 隐私覆盖 receiverHandoff、playback、guessing 不含目标、标准报码与完整已发序列；
- 根目录 `npm test` 与 `npm run check:catalog` 全部通过。

### 浏览器 Gate

- 从 intro 完成四轮，至少覆盖成功、报码错误、译码错误；
- 验证珊瑚/青绿交替、重听上限、重新报码；
- 键盘、鼠标、触控流程都可完成；
- 直接 `file://` 与本地服务器均可运行，网络面板无请求；
- 1503×1046 概念原生尺寸、桌面、390px 与 320px 响应式无横向溢出；
- `prefers-reduced-motion`、禁用音频和页面隐藏恢复不破坏状态。

### 独立提交

1. 本规格、概念稿与文档索引；
2. 纯逻辑、运行页、catalog 与自动测试；
3. 浏览器验收、缺陷记录、学习沉淀与必要修复。

