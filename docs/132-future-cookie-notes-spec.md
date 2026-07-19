# A 级“三枚以后，都是我们”可执行规格

- 日期：2026-07-19
- 状态：冻结，可进入视觉与实施计划
- 工作 ID：`future-cookie-notes`
- 目录：`experiences/surprises/future-cookie-notes/`
- 调研依据：[131-future-cookie-notes-research.md](./131-future-cookie-notes-research.md)
- 启动等级：A，经典脚本、相对资源、`file://` 直开

## 1. 产品合同

一人事先在 `config.js` 写好三段真实想兑现的约定；另一人打开 HTML 后，可以任意顺序敲开“什么时候”、“去哪里”、“一起做什么”三枚未来签。三段全部收好后，页面只显示“已齐”和一个合成动作；收件人主动合成后，才展开完整邀请、结语和署名。

打开顺序不影响最终文字：完整邀请始终按 `when → where → together` 组合。视觉、动画、屏幕尺寸、点击间隔和图片是否加载不得修改已打开集合、阶段或合成文本。

不得新增随机签语、每日运势、签语题库、多结局、倒计时、长按门槛、积分、抽奖、分享、下载卡片、本地存储、账号、音乐、照片、分析、广告、公网或第三方运行依赖。

## 2. 冻结文案与配置

### 2.1 默认可见文案

```text
标题：三枚以后，都是我们
副题：敲开三枚未来签，把三个小约定拼成一封邀请。
开场：有三个以后，我先替我们收好了。你想先打开哪一枚？
进度：已收好 {opened} / 3
未开动作：敲开“{label}”
已开状态：这一枚，收好了
齐套标题：三个以后，都到齐了。
合成动作：把三个以后拼起来
结尾标题：这不是预言，是我想和你兑现的以后。
重开：再打开一遍
隐私：这三段只在本机页面中使用，刷新即重置。
```

动态文字只用 `textContent` 写入。配置文本不得进入 `innerHTML`、属性、dataset、CSS `content`、注释、控制台或图片替代文字。

### 2.2 三枚固定签

ID、序号、公开标题和合成位置冻结；默认正文可由准备者修改：

| 序号 | ID | 公开标题 | 默认正文 | 合成位置 |
| ---: | --- | --- | --- | --- |
| 1 | `when` | 什么时候 | 下一个不赶时间的周末 | 1 |
| 2 | `where` | 去哪里 | 去一条我们都没走过的街 | 2 |
| 3 | `together` | 一起做什么 | 慢慢吃，慢慢逛，再拍一张新的合照 | 3 |

默认补充文案：

```text
完整邀请：{when}，我们{where}，{together}。
结语：只要你愿意，我们就挑一天出发。
署名：—— 一直想和你去的人
```

### 2.3 配置数据形状

`config.js` 暴露递归冻结的 `DEFAULT_CONFIG` 与纯函数 `composeInvitation`：

```js
{
  title: string,
  subtitle: string,
  intro: string,
  readyTitle: string,
  finalTitle: string,
  closing: string,
  signature: string,
  privacy: string,
  notes: {
    when: string,
    where: string,
    together: string
  }
}
```

字段不可从配置修改的部分：三个 ID、序号、公开标题、阶段、动作、按钮核心动词、进度格式、隐私能力边界与合成顺序。

限长以 Unicode code point 计：

| 字段 | 最长 |
| --- | ---: |
| `title` | 32 |
| `subtitle` / `intro` / `readyTitle` / `finalTitle` | 96 |
| 每段 `notes.*` | 80 |
| `closing` | 120 |
| `signature` | 48 |
| `privacy` | 100 |
| 合成结果 | 280 |

`sanitizeConfig(candidate, composeStrategy)` 按字段回退；异常 getter、异常策略、非字符串、空白和超长策略结果不中断页面。策略参数和返回的安全配置均冻结，且与调用方输入断开引用。

## 3. 文件与全局接口合同

```text
experiences/surprises/future-cookie-notes/
├── index.html
├── styles.css
├── config.js
├── logic.js
├── logic.test.js
├── app.js
├── README.md
├── ATTRIBUTION.md
└── assets/
    ├── favicon.svg
    ├── future-cookie-atlas.png
    └── night-tea-table.jpg
```

`config.js` 经 UMD 暴露 `window.FutureCookieNotesConfig`，并保留 CommonJS 出口：

```js
{ DEFAULT_CONFIG, composeInvitation }
```

`logic.js` 经 UMD 暴露 `window.FutureCookieNotesLogic`，并保留 CommonJS 出口：

```js
{
  VERSION,
  NOTE_IDS,
  NOTE_META,
  PHASES,
  ACTION_TYPES,
  createInitialState,
  sanitizeConfig,
  reduceFutureCookieNotes,
  assertState,
  getFutureCookieNotesView,
  replayFutureCookieNotes,
  deepFreeze
}
```

全局共享不依赖 `shared/`；脚本顺序冻结为 `config.js → logic.js → app.js`。

## 4. 权威状态

### 4.1 精确形状

```js
{
  version: 1,
  phase: "collecting" | "ready" | "finale",
  openedOrder: Array<"when" | "where" | "together">
}
```

状态不复制私人正文、最终邀请、结语、署名、动画、DOM 引用、计时器、屏幕尺寸、时间戳、随机种子或存储键。

### 4.2 状态不变量

1. `version` 恒为 `1`；
2. `openedOrder` 长度为 0–3，元素只能是 `NOTE_IDS` 中的唯一值；
3. `collecting` 要求长度 0–2；
4. `ready` 要求长度恰为 3，且三个 ID 均出现；
5. `finale` 同样要求三个 ID 齐全；
6. 状态对象与 `openedOrder` 递归冻结；
7. 没有“三枚齐全但仍是 collecting”或“未齐全却是 ready/finale”的合法状态。

## 5. 动作 schema 与 reducer

每个 action 必须是普通对象、只含准许键，不接受原型伪造、getter 异常、数组、函数或多余字段。

### 5.1 `OPEN_NOTE`

```js
{ type: "OPEN_NOTE", noteId: "when" | "where" | "together" }
```

- 只在 `collecting` 生效；
- `noteId` 必须合法且尚未出现在 `openedOrder`；
- 将 ID 追加到 `openedOrder`；
- 追加后长度小于 3 仍是 `collecting`，等于 3 立即进入 `ready`；
- 重复打开返回原状态引用，不重排顺序。

### 5.2 `ASSEMBLE`

```js
{ type: "ASSEMBLE" }
```

- 只在 `ready` 生效；
- 进入 `finale`，`openedOrder` 保持不变；
- 重复合成或提前合成返回原引用。

### 5.3 `RESTART`

```js
{ type: "RESTART" }
```

- 只在 `finale` 生效；
- 返回新的 `createInitialState()`；
- 中途不提供“清空”，避免意外丢失已打开内容。

### 5.4 非法输入

- 合法 state + 非法 action：返回原 state 引用；
- 畸形 state：`reduceFutureCookieNotes` 不抛异常，返回新的冻结初始状态；
- 不修改 state、action、配置或日志输入。

## 6. 安全配置与合成策略

`sanitizeConfig(candidate, composeStrategy)` 遵守以下次序：

1. 逐字段安全读取，异常 getter 视为缺失；
2. 非字符串、去空后为空或超限字段使用默认值；
3. 标准化后先冻结基础配置；
4. 向 `composeStrategy` 传入只含三段正文的冻结副本；
5. 策略返回去空后 1–280 code points 的字符串时接受；
6. 非字符串、空白、超长或抛错时，使用 `composeInvitation`；
7. 安全配置增加只读 `invitation`，再整体递归冻结。

`composeInvitation` 的默认输出精确为：

```text
{when}，我们{where}，{together}。
```

默认配置下是：

```text
下一个不赶时间的周末，我们去一条我们都没走过的街，慢慢吃，慢慢逛，再拍一张新的合照。
```

准备者可以只编辑 `config.js` 中标明的 5–10 行 TODO：三段约定、结语、署名，以及可选的纯文本合成函数。不修改任何 TODO 也必须可完整运行。

## 7. 公开 view 合同

`getFutureCookieNotesView(state, safeConfig)` 是 UI 获取业务数据的唯一入口。返回值递归冻结，与 state / config 断开引用。

### 7.1 公共形状

```js
{
  phase,
  title,
  subtitle,
  progress: { opened, total: 3, text },
  notes: Array<{
    id,
    number,
    label,
    isOpen,
    body? // 仅已打开项存在
  }>,
  announcement,
  ready: null | { title, actionLabel },
  finale: null | {
    title,
    invitation,
    closing,
    signature,
    restartLabel
  },
  privacy
}
```

### 7.2 阶段公开边界

| 阶段 | 可公开 | 明确不可出现 |
| --- | --- | --- |
| `collecting` | 标题、副题、开场、进度、三个公开标题、已打开项的正文 | 未打开正文、完整邀请、结语、署名、合成动作 |
| `ready` | 全部三段、齐套标题、合成动作 | 完整邀请、结尾标题、结语、署名、重开 |
| `finale` | 三段、最终标题、完整邀请、结语、署名、重开 | 可编辑配置、随机签、下载/分享/存储控件 |

`announcement` 只可为：

- 初始：“三枚未来签已摆好。”
- 打开一枚：“已收好‘{label}’，共 {opened} 枚。”
- 三枚齐全：“三枚未来签已到齐，可以拼成邀请了。”
- 合成：“完整邀请已展开。”

它不播报动画帧、碎屑、颜色、图片加载、焦点移动或装饰性进度。

## 8. DOM 与焦点合同

### 8.1 collecting

- 页面只有一个 H1，标题、副题、开场和进度均为代码文本；
- 未打开项使用 `<button type="button">`，可访问名称必须同时包含序号、公开标题和“敲开”；
- 已打开项重建为 `<article>`，包含序号、公开标题、正文和已收好文字，不保留失效按钮；
- 打开后将焦点移到 DOM 顺序中下一枚未打开按钮；如果已无未打开项，移到合成按钮；
- 不将新打开的文本本身强制变成可聚焦容器，由完整 live 消息播报结果。

### 8.2 ready

- 三段 article 按固定语义顺序布局，不按打开顺序重排；
- 齐套标题为 H2，合成是唯一主按钮；
- 焦点默认落在合成按钮；
- 完整邀请、结语与署名不得以 `hidden`、`display:none`、`aria-hidden`、模板、注释或 dataset 形式预埋。

### 8.3 finale

- 主标题仍只有一个 H1，结尾标题为 H2；
- 完整邀请是一段连续可选中文本，不放入图片；
- 三段摘要可以保留作为回顾，但不重复渲染三个互动按钮；
- 阶段重建后焦点落在结尾标题，为 H2 临时设 `tabindex="-1"`；
- “再打开一遍”是唯一次要按钮，不自动刷新页面。

### 8.4 live region

- 使用一个持久存在的 `role="status" aria-live="polite" aria-atomic="true"`；
- 每个合法动作只写入一次完整消息；
- 重复、无效或错阶段动作不清空、不重复播报。

## 9. 视觉概念输入

视觉阶段必须生成完整界面概念，而不是单个饼干插画。冻结的创意方向为“深夜茶桌上的三封未来信”：墨蓝桌面、温热球形桌灯、三枚粉金烤色饼干、奶白纤维纸签、少量深红封签与手工金线。

必须有三张状态概念：

1. 桌面 collecting：第二枚已打开，第一/三枚仍封闭，明确看出可任意顺序；
2. 移动 ready：三张纸签已齐，合成主按钮在 390×844 首屏可见；
3. 桌面 finale：三张签拼成一张长邀请，结语、署名和重开在 1280×800 可见。

生产资产只有：

- 一张 16:10 夜茶桌背景，中央大面积留空，不含文字、UI、签语、饼干或品牌；
- 一张严格 3×1 饼干状态图集：封闭、刚裂开、完全展开且空白纸条露出；纯色色键背景，无文字、阴影、碎屑、餐具、额外物体或标识。

图片不承载签语、按钮、进度、焦点、已打开语义或最终邀请。

## 10. 设计系统硬约束

### 10.1 色彩与字体

- 背景基色：深墨蓝，不使用大面积粉红渐变；
- 纸面：中性奶白，不改成黄泥色；
- 主强调：深红封签；次强调：低亮黄铜；
- 饼干：粉金烤色，不使用明黄卡通饼干；
- 标题使用本机宋体/明朝类字族，正文使用本机无衬线，编号可用等宽数字；
- 无外部字体、无英文装饰字、无 eyebrow、badge、pill、伪统计、奖杯或彩纸。

### 10.2 容器、间距与控件

- 桌面主帐页最大宽 `1120px`，不把每个文字块再套多层圆角卡片；
- 桌面 collecting 为三列开放桌布，ready 保留三张签，finale 收束为一张中央长信；
- 纸签普通圆角 `6–10px`，不用 24px 以上泡泡圆角；
- 间距刻度 `4 / 8 / 12 / 16 / 24 / 32 / 48px`；
- 所有主动作至少 `48px` 高，饼干按钮桌面至少 `180×180px`，移动至少 `92×92px`；
- 正文不低于 `16px`，控件不低于 `16px`，字号不依赖浏览器默认。

### 10.3 动效

- 饼干状态交叉淡入 `220ms`，纸签上移 `260ms`，合成长信 `320ms`；
- 动画只在合法 action 后触发，不以持续抖动、招手、闪烁或自动循环催促点击；
- 不播放物理碎片，不使用屏幕震动，不要求用户等动画完成才能操作下一枚；
- `prefers-reduced-motion: reduce` 时所有位移、旋转、尺寸和淡入归零，当前 action 即时可达。

## 11. 布局合同

### 11.1 桌面 collecting / ready

- `>= 900px`：顶部安静横栏，左侧标题/副题，右侧只显示“已收好 N / 3”；
- 下方开放桌面三等列，三枚按 `when / where / together` 固定语义顺序排列；
- 已打开 article 和未打开 button 拥有相同外形占位，单一打开不得导致整页大幅跳动；
- ready 在三列下方显示 H2 和唯一主按钮，1280×800 中可见；
- 不新增导航、模式选择、设置、声音或分享区。

### 11.2 桌面 finale

- 中央一张最大宽 `760px` 的长信，顶部是结尾 H2，中部是完整邀请，下方是结语与署名；
- 三段摘要作为三条带序号的纸签边注，不重建三张大卡；
- 重开在长信底部，1280×800 不被裁切；
- 不出现下载、复制文案、二维码、社交按钮或庆祝粒子。

### 11.3 移动

- 390×844 与 320×700 均为单列，顶部只保留短标题与进度，副题/开场不重复；
- collecting 顺序固定为进度 → 当前三枚展区；三枚可用紧凑的 3列1 或一枚主视图 + 两枚紧凑预览，但三个按钮必须同时可见、可聚焦；
- ready 固定为三条短签 → 齐套标题 → 合成按钮；390×844 下合成按钮无需滚动即可见；
- finale 为结尾标题 → 完整邀请 → 三条摘要 → 结语/署名 → 重开；
- 320×700 可纵向滚动，但无横向溢出、固定底栏遮挡、按钮文字裁切或焦点跳出可见区。

## 12. 图集合同与回退

透明图集是精确 3×1 均分，每格尺寸相同：

| 状态 | 列 | CSS `background-position` |
| --- | ---: | --- |
| `closed` | 1 | `0% 50%` |
| `cracked` | 2 | `50% 50%` |
| `open` | 3 | `100% 50%` |

所有 sprite 使用 `background-size: 300% 100%`、`background-repeat: no-repeat`、固定 `aspect-ratio: 1`。`cracked` 只是合法 action 后的短暂视觉帧，不进入权威状态，不接收额外输入，不阻止下一个动作。

图集不可用时：

- 未开按钮显示 CSS 半月形双层轮廓、序号和标题；
- 已开 article 显示双半圆轮廓、纸签、序号、标题和正文；
- 不因图片 `error` 改变 DOM 中的按钮、文本、焦点或阶段。

背景不可用时使用纯深墨蓝 + 纸面边框，不使用外部备用图。

## 13. 逻辑测试 Gate

### 13.1 常量与初始状态

1. `NOTE_IDS` 精确为 `when / where / together`，唯一、冻结、顺序稳定；
2. `NOTE_META` 的序号、公开标题和语义位置精确；
3. 初始状态深等于固定形状，每次创建断开引用并递归冻结。

### 13.2 打开与合成

1. 三个 ID 各自可作为第一个打开；
2. 六个排列都可达 `ready`，`openedOrder` 保留真实打开顺序；
3. 重复打开、未知 ID、错类型、多字段与错阶段返回原引用；
4. 第三枚打开只进 `ready`，不直接进 `finale`；
5. 只有 `ready + ASSEMBLE` 进 `finale`，不改变 `openedOrder`；
6. 只有 `finale + RESTART` 恢复新初始状态。

### 13.3 配置与合成

1. 默认配置、默认合成句和所有限长精确；
2. 逐字段类型、空白、超长、Unicode 截断和异常 getter 回退；
3. 策略参数冻结，合法返回被接受，非法/超长/异常返默认；
4. 合成文字与打开顺序无关；
5. 输入候选配置、嵌套 notes 和策略返回与安全配置断开引用。

### 13.4 public view 与秘密

1. 初始 collecting 三项都没有 `body` 键；
2. 打开一项后只该项有 `body`，其余正文不存在于序列化 view；
3. ready 三项都有 `body`，但序列化 view 不含 `invitation / closing / signature / finalTitle`；
4. finale 才含完整文字；
5. view 笔记永远按语义顺序，不按 `openedOrder` 重排；
6. progress、announcement、ready/finale 空值和文案精确；
7. view 递归冻结且与 state / config 断开引用。

### 13.5 稳健性与重放

1. `assertState` 接受全部可达状态，拒绝多字段、原型异常、阶段/长度不一致、重复/未知 ID；
2. 畸形 state 经 reducer 安全回初始，不抛错；
3. 相同日志、深克隆日志和 JSON 往返日志得到深相等终态；
4. 重放不修改日志、action、状态或配置；
5. 公共 API 经典脚本全局与 CommonJS 出口一致。

## 14. 静态、作品与浏览器 Gate

1. `node --check` 通过 `config.js / logic.js / app.js`，定向 logic test 通过；
2. 仓库 test/build/verify 全通，目录入口、文档、资产、借鉴声明和直开 Gate 入总验收；
3. 经典脚本顺序和相对资源正确，无 module、fetch/XHR、WebSocket、CDN、外字体、存储、音频、分析或仓库共享依赖；
4. 指针顺序 `where → when → together → assemble → restart` 完成；
5. 键盘顺序 `together → where → when → assemble` 完成，Tab / Enter / Space 无陷阱；
6. collecting / ready / finale 扫描 DOM 文本、属性、注释与隐藏节点，阶段秘密符合第 7 节；
7. 指针快速连点、键盘连续激活、重复点击、合成后再点和重开无重复纸签或错位阶段；
8. 1280×800、768×1024、390×844、320×700 无横向溢出、重要文字裁切、焦点遮挡和主操作不可达；
9. 背景失效、图集失效、降低动效和强制颜色下仍可走完全流程；
10. 三张概念与 collecting / ready / finale 实装截图在同一 QA 轮次用 `view_image` 直接对照，至少五项 fidelity ledger；
11. above-the-fold copy diff 没有概念外 eyebrow、badge、pill、英文装饰、奖杯、统计、音量、分享或设置；
12. README 说明双击、个性化 TODO、阶段私密边界、无网络/存储/依赖；ATTRIBUTION 完整固定来源、许可证、权利主体、零复制和 ImageGen 处理链。

## 15. 借鉴与生产链 Gate

`ATTRIBUTION.md` 必须包含：

1. `dam450/fortune-cookie` 的固定 commit、MIT 全文链接、Evandro Damaso 权利主体和“只研究单按钮揭晓/键盘承诺差距”；
2. `devMatheus20/fortune-cookie` 的固定 commit、MIT 全文链接、Matheus Santos 权利主体和“只研究单屏信息层级/依赖边界”；
3. `reggi/fortune-cookie` 作为元数据不一致与文本来源不足的排除案例；
4. WHATWG HTML、WCAG、CSSWG 的固定 commit 与“只用于平台行为”边界；
5. 三段约定、无序收集、主动合成、状态机、测试、文案、界面和生产素材独立原创的声明；
6. 明确不包含三个候选的代码、签语、图片、字体、动画、布局、Figma 设计或打包产物；
7. 每张 ImageGen 原图的提示词目的、无参考图声明、输出尺寸、保留/拒绝决策、处理命令、透明统计和最终 SHA-256。

## 16. 完成判定

当且仅当以下全部成立时，该作品才计为完成：

1. 三枚可任意顺序打开，重复动作幂等，三枚齐全不自动合成；
2. 六种打开排列都得到同一 `when → where → together` 完整邀请；
3. collecting / ready / finale 的 view 与 DOM 严格遵守私人文字边界；
4. 指针、Enter、Space 走同一原生按钮路径，不需特定按键时长；
5. A 级目录可单独复制、双击直开，零网络、零存储、零运行依赖，图片失效仍完整；
6. 三状态实装与概念、两个生产资产、字段文案和首屏锁在同一 QA 轮次达到 agency sign-off；
7. 固定来源、许可证、权利主体、排除案例、零复制与 ImageGen 生产链完整；
8. 定向测试、全仓测试、build/verify、静态 Gate、浏览器、响应式、bugs、learn、目录和独立提交链闭环。
