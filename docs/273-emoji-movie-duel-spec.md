# 四符片名擂台：产品与技术规格

> 状态：待实现
> 前置：`docs/271-emoji-movie-duel-research.md`、`docs/272-emoji-movie-duel-brainstorm.md`
> 产品 ID：`four-symbol-film-duel`
> 产品名：四符片名擂台
> 分类：双人对抗
> 本地等级：A
> 实现边界：原生 HTML / CSS / JavaScript，零运行时第三方依赖

## 1. 目标

实现一个单设备、双人轮流、可直接从 `file://` 打开的四符片名解谜对抗游戏。

玩家不需要了解真实电影。所有答案和题面都属于项目原创虚构影院。双方在 8 回合中各答 4 题，每题根据四枚 Emoji 从四个原创片名中选择答案。每人有 2 枚有限提示资源，使用后可排除一个错误选项，但该题最高分从 2 降为 1。

## 2. 成功标准

首版成功必须同时满足：

- Finder 双击 `index.html` 后可以完成一整局；
- 无网络时功能、样式和题库完整；
- 8 回合严格交替，双方各答 4 题；
- 双方来自同一配平题包的 A/B 卡；
- 计分严格符合 2 / 1 / 0；
- 每人最多使用 2 枚聚光灯；
- 每题最多提交一次；
- 32 张题卡、4 个题包全部通过数据校验；
- 题库不包含真实片名、真实人物、角色、剧情、台词或第三方素材；
- Emoji 作为 Unicode 文本由系统渲染；
- 每枚 Emoji 都有项目原创中文等价标签；
- 键盘与屏幕阅读器可以完成整局；
- `npm run verify` 通过；
- README 明确写独立实现和无开源代码/素材/题库借鉴。

## 3. 非目标

第一版不实现：

- 真实电影或公版电影题包；
- 自由出题；
- 自定义题库；
- AI 生成；
- 在线搜索；
- 联机；
- 单人玩法；
- 计时；
- 排行榜；
- 账号；
- 云保存；
- 分享图片；
- 导入导出；
- 音效和音乐；
- 多语言；
- 中局恢复；
- 自动更新；
- PWA；
- 第三方分析。

## 4. 用户与场景

### 4.1 主要用户

两位在同一台电脑前的玩家，例如：

- 情侣；
- 夫妻；
- 朋友；
- 室友；
- 家庭成员。

### 4.2 主要场景

- 本地仓库中直接双击打开；
- 两人轮流使用同一键盘、触控板或鼠标；
- 一局约 8–12 分钟；
- 网络断开；
- 不需要保存个人资料；
- 允许其中一人或两人使用键盘、放大或屏幕阅读器。

## 5. 信息架构

产品目录建议：

```text
projects/four-symbol-film-duel/
├── README.md
├── index.html
├── style.css
└── app.js
```

不新增：

- `assets/`；
- 字体文件；
- 图片文件；
- 音频文件；
- JSON 网络加载；
- npm 子项目；
- 服务端脚本。

题库与 token 表直接写在 `app.js` 中，避免 `file://` 下 `fetch()` 限制。

## 6. 页面状态

### 6.1 状态枚举

```js
const Screen = {
  SETUP: "setup",
  HANDOFF: "handoff",
  QUESTION: "question",
  CONFIRM: "confirm",
  RESULT: "result",
  SUMMARY: "summary"
};
```

### 6.2 状态迁移

| 当前状态 | 事件 | 条件 | 下一状态 |
|---|---|---|---|
| SETUP | 开始放映 | 表单有效 | HANDOFF |
| HANDOFF | 我准备好了 | 存在下一题 | QUESTION |
| QUESTION | 选择选项 | 选项未排除 | QUESTION |
| QUESTION | 使用聚光灯 | 当前玩家有资源且本题未使用 | QUESTION |
| QUESTION | 继续提交 | 已选择有效选项 | CONFIRM |
| CONFIRM | 返回修改 | 尚未提交 | QUESTION |
| CONFIRM | 确认答案 | 已选择有效选项 | RESULT |
| RESULT | 下一回合 | 尚有题目 | HANDOFF |
| RESULT | 查看片尾 | 已完成 8 题 | SUMMARY |
| SUMMARY | 再玩一场 | 有其他题包 | HANDOFF |
| SUMMARY | 回到开场 | 任意 | SETUP |

### 6.3 不变量

- 只有 `CONFIRM → RESULT` 会结算题目；
- 同一题只能结算一次；
- `roundIndex` 始终在 0–7；
- 偶数回合属于 A，奇数回合属于 B；
- A 和 B 各完成 4 题；
- `QUESTION` 中使用聚光灯后不能撤销；
- 聚光灯不会改变正确答案；
- 已排除选项不能被选择；
- `RESULT` 不允许更改选择；
- 第 8 题结果后只能进入 `SUMMARY`；
- 页面刷新可重置到 `SETUP`，不承诺恢复。

## 7. 对局模型

### 7.1 初始状态

```js
{
  screen: "setup",
  players: [
    { id: "A", name: "玩家 A", score: 0, spotlights: 2 },
    { id: "B", name: "玩家 B", score: 0, spotlights: 2 }
  ],
  textEquivalentVisible: false,
  packId: null,
  schedule: [],
  roundIndex: 0,
  selectedOptionId: null,
  spotlightUsedThisRound: false,
  eliminatedOptionId: null,
  results: []
}
```

### 7.2 玩家称呼

- 两个称呼字段均可留空；
- 去除首尾空白；
- 留空时分别回退为“玩家 A”“玩家 B”；
- 最大 12 个 Unicode 字符；
- 纯空白视为空；
- 只以 `textContent` 渲染；
- 不写入 URL；
- 不上传；
- 不持久化。

### 7.3 题包选择

开场提供：

- “随机选择”；
- 四个题包名称。

随机选择只在完整题包间选择，不打散卡片。

“再玩一场”优先选择本次页面会话中尚未使用的题包。全部用完后允许任意选择，并明确显示“题包可能重复”。这仅存在内存中，不要求持久化。

## 8. Token 数据契约

### 8.1 类型

```js
/**
 * @typedef {Object} EmojiToken
 * @property {string} id
 * @property {string} glyph
 * @property {string} labelZh
 * @property {string[]} concepts
 */
```

### 8.2 示例

```js
{
  id: "moon",
  glyph: "🌙",
  labelZh: "月亮",
  concepts: ["夜晚", "月光", "睡眠"]
}
```

### 8.3 约束

- `id` 全局唯一；
- `id` 使用小写 ASCII kebab-case；
- `glyph` 非空；
- `labelZh` 非空；
- `labelZh` 只描述符号的稳定语义，不解释题目；
- `concepts` 至少 1 项；
- token 只使用首版闭合清单；
- 不包含旗帜；
- 不包含肤色修饰符；
- 不包含 ZWJ 组合；
- 不包含平台私用区字符；
- 不包含图片 URL、文件路径或 HTML；
- 不复制 CLDR 标签，中文标签由项目独立撰写。

### 8.4 呈现契约

每个 token 视觉节点：

```html
<span class="symbol-token">
  <span class="symbol-token__glyph" aria-hidden="true">🌙</span>
  <span class="symbol-token__label">月亮</span>
</span>
```

默认符号模式下，`.symbol-token__label` 使用视觉隐藏样式，但保留在可访问树中。文字等价模式下显示。

不得只给包含四枚 Emoji 的容器写一个含答案解释的 `aria-label`。

## 9. 题卡数据契约

### 9.1 类型

```js
/**
 * @typedef {Object} FilmCard
 * @property {string} id
 * @property {string} packId
 * @property {string} pairId
 * @property {"A"|"B"} side
 * @property {1|2|3} difficulty
 * @property {string} genre
 * @property {[string,string,string,string]} tokens
 * @property {string} answerOptionId
 * @property {FilmOption[]} options
 * @property {string} spotlightRemoves
 * @property {string} rationale
 * @property {"original-project-copy"} authorship
 * @property {boolean} reviewed
 */

/**
 * @typedef {Object} FilmOption
 * @property {string} id
 * @property {string} title
 */
```

### 9.2 示例

```js
{
  id: "velvet-night-a",
  packId: "late-show",
  pairId: "late-show-1",
  side: "A",
  difficulty: 1,
  genre: "城市",
  tokens: ["cat", "train", "moon", "home"],
  answerOptionId: "last-train-cat",
  options: [
    { id: "last-train-cat", title: "末班车上的猫" },
    { id: "moon-window", title: "月光落在窗台" },
    { id: "silent-platform", title: "无声站台" },
    { id: "borrowed-home", title: "借来的归途" }
  ],
  spotlightRemoves: "moon-window",
  rationale: "猫在夜晚搭乘末班车回家。",
  authorship: "original-project-copy",
  reviewed: true
}
```

示例仅说明结构；正式题库仍须通过原创检索和内容复核，不能因为出现在 Spec 就自动视为已批准生产内容。

### 9.3 卡片约束

- `id` 全局唯一；
- `packId` 必须指向存在的题包；
- `pairId` 在同一题包中恰有 A/B 两张卡；
- `side` 必须与配对位置一致；
- `difficulty` 仅为 1、2、3；
- `genre` 来自首版固定类型表；
- `tokens` 恰好 4 项；
- 4 个 token ID 都存在；
- 允许重复 token 仅在内容审查明确批准时；默认不重复；
- `options` 恰好 4 项；
- 选项 ID 在卡内唯一；
- 选项标题非空；
- 正确答案恰好存在一次；
- `spotlightRemoves` 必须指向错误选项；
- `rationale` 非空；
- `authorship` 固定为 `original-project-copy`；
- `reviewed` 必须为 `true` 才能进入生产题包；
- 任何字符串都以文本方式渲染。

## 10. 题包数据契约

### 10.1 类型

```js
/**
 * @typedef {Object} FilmPack
 * @property {string} id
 * @property {string} title
 * @property {string} subtitle
 * @property {string[]} pairIds
 */
```

### 10.2 约束

每个题包必须：

- 有唯一 ID；
- 有原创标题和副标题；
- 恰好包含 4 个 `pairId`；
- 每个 `pairId` 恰好对应 A/B 两张卡；
- 总计 8 张卡；
- A/B 各 4 张；
- A/B 难度序列完全相同；
- A/B 类型序列完全相同；
- 每个 side 的顺序都按 pair 1–4；
- 不引用其他题包的卡；
- 所有卡均 `reviewed: true`。

首版总量：

- 4 个题包；
- 16 个配对；
- 32 张卡；
- 每张卡 4 个选项；
- 每张卡 4 枚符号。

## 11. 回合排程

选择题包后生成固定交替排程：

```js
[
  pair1.A,
  pair1.B,
  pair2.A,
  pair2.B,
  pair3.A,
  pair3.B,
  pair4.A,
  pair4.B
]
```

不得：

- 在卡片层级随机洗牌；
- 让同一玩家连续答两题；
- 将 A 卡交给 B；
- 将 B 卡交给 A；
- 重复卡；
- 省略卡。

题包本身可以随机选择。选项展示顺序可在开局时使用一次会话内洗牌，但必须：

- 保持正确答案 ID；
- 保持 `spotlightRemoves` ID；
- 每张卡只洗牌一次；
- 进入确认或返回修改时不重新洗牌；
- 结果页沿用同一顺序；
- 测试可注入固定随机函数。

如果实现复杂度不值得，首版允许直接使用题库中的固定选项顺序，但内容作者必须让正确答案位置均匀分布。

## 12. 聚光灯规则

### 12.1 可用条件

只有同时满足以下条件时可用：

- 当前状态为 `QUESTION`；
- 当前玩家 `spotlights > 0`；
- 本题尚未使用；
- 本题尚未提交；
- `spotlightRemoves` 对应选项存在且为错误项。

### 12.2 使用效果

一次原子操作：

1. 当前玩家 `spotlights -= 1`；
2. `spotlightUsedThisRound = true`；
3. `eliminatedOptionId = spotlightRemoves`；
4. 如果此前恰好选中了该项，清空选择；
5. 显示可访问状态消息；
6. 禁用聚光灯按钮；
7. 被排除选项保留布局，禁用并显示“已排除”。

### 12.3 文案

使用前按钮：

> 使用聚光灯：排除 1 项，本题最多 1 分

资源不足：

> 聚光灯已用完

本题已用：

> 本题已使用聚光灯

不再弹二次确认模态框。按钮本身已经明确写出不可逆代价。

## 13. 选择、确认和提交

### 13.1 选择

- 四个选项使用原生按钮；
- 单选；
- 选择后有边框、图标和“已选择”文本；
- 颜色不是唯一状态；
- 再点其他选项会移动选择；
- 被排除项不可选；
- 选项顺序不变。

### 13.2 确认

点击“继续提交”进入 `CONFIRM`，显示：

- 当前玩家；
- 四符题面；
- 所选片名；
- 本题最高可得分；
- “返回修改”；
- “确认答案”。

确认页不显示正确性。

### 13.3 提交

点击“确认答案”后：

- 立即锁定选择；
- 计算一次得分；
- 追加一条结果记录；
- 更新当前玩家总分；
- 进入 `RESULT`；
- 不允许返回修改。

## 14. 计分

纯函数定义：

```js
function scoreAnswer({ isCorrect, spotlightUsed }) {
  if (!isCorrect) return 0;
  return spotlightUsed ? 1 : 2;
}
```

不允许：

- 速度加分；
- 连胜加分；
- 先手奖励；
- 难度倍数；
- 剩余提示折算分；
- 平局加赛；
- 负分。

每位玩家：

- 最低 0 分；
- 最高 8 分。

## 15. 结果记录

```js
{
  roundIndex: 0,
  playerId: "A",
  cardId: "velvet-night-a",
  selectedOptionId: "last-train-cat",
  correctOptionId: "last-train-cat",
  spotlightUsed: false,
  eliminatedOptionId: null,
  scoreAwarded: 2
}
```

约束：

- `results.length` 等于已结算回合数；
- 同一 `roundIndex` 只出现一次；
- `scoreAwarded` 只能为 0、1、2；
- 玩家总分等于其结果分数之和；
- 结算页只读取结果，不重新计算历史状态。

## 16. 屏幕规格

### 16.1 SETUP

必须包含：

- 产品名；
- 一句话规则；
- 玩家 A 称呼；
- 玩家 B 称呼；
- 文字等价模式开关；
- 题包选择；
- “开始放映”；
- “规则说明”可折叠区；
- 独立实现/原创题库简短说明。

验收：

- Tab 顺序符合视觉顺序；
- Enter 可提交有效表单；
- 默认值无需编辑即可开始；
- 名称超长有就地错误；
- 错误与字段程序化关联。

### 16.2 HANDOFF

必须包含：

- 下一位玩家；
- “第 N / 8 题”；
- 双方当前分数；
- 下一位剩余聚光灯；
- “我准备好了”。

不得显示：

- 下一题 Emoji；
- 下一题选项；
- 正确答案；
- 内部解释。

### 16.3 QUESTION

必须包含：

- 当前玩家；
- 进度；
- 四符题面；
- 四个片名按钮；
- 聚光灯按钮；
- 剩余数量；
- 当前选择状态；
- “继续提交”。

“继续提交”在未选答案时禁用。

### 16.4 CONFIRM

必须包含：

- 所选片名；
- 本题最高分；
- 返回修改；
- 确认答案。

### 16.5 RESULT

必须包含：

- 正确或错误；
- 正确片名；
- 玩家选择；
- 本题得分；
- 原创解释 `rationale`；
- 当前总分；
- 下一回合或查看片尾按钮。

错误反馈不得嘲讽或联系到感情评价。

### 16.6 SUMMARY

必须包含：

- 胜者或平局；
- 双方总分；
- 聚光灯使用次数；
- 8 题复盘；
- 每题四符、正确答案、玩家选择、得分；
- 再玩一场；
- 回到开场；
- 题库原创说明。

## 17. 视觉规格

### 17.1 方向

“独立影院票根”，不模仿真实影院或流媒体品牌。

### 17.2 色彩

建议 token：

```css
:root {
  --ink: #2b201d;
  --paper: #f4ead7;
  --paper-deep: #e7d5b5;
  --curtain: #4b1522;
  --curtain-deep: #260b12;
  --spotlight: #d99b3d;
  --player-a: #2f6f73;
  --player-b: #8b3f5d;
  --success: #236448;
  --danger: #8b2d2d;
}
```

实现时必须以实际对比度检查结果为准，不以本表自动判定合格。

### 17.3 排版

- 使用系统字体栈；
- 不加载远程字体；
- 正文最小 16px；
- 按钮最小触控高度 44px；
- Emoji 题面在窄屏可换行，但保持顺序；
- 不用全大写长文本；
- 不让斜体承担关键信息。

### 17.4 动效

允许：

- 卡片轻微淡入；
- 聚光灯短暂高亮；
- 结果状态小幅位移。

禁止：

- 自动倒计时；
- 闪烁；
- 无限循环；
- 大范围视差；
- 随机抖动；
- 结果爆炸粒子。

`prefers-reduced-motion: reduce` 时取消非必要动画和过渡。

## 18. 可访问性规格

### 18.1 语义

- 一个页面主标题；
- 每屏有明确标题；
- 交互使用原生 `button`、`input`、`select`；
- 选项组使用 `fieldset` / `legend` 或等价语义；
- 不给普通 `div` 人工模拟按钮；
- 当前分数可读；
- 状态消息不过度打断。

### 18.2 Emoji 文本替代

- Emoji 字形 `aria-hidden="true"`；
- 每个符号有等价中文文本；
- 文本顺序与视觉顺序一致；
- 不使用文件名作为替代；
- 不使用答案解释作为替代；
- 可见文字模式仅改变标签可见性，不改变可访问名称。

### 18.3 键盘

必须能完成：

- 设置称呼；
- 开关文字模式；
- 选择题包；
- 开始；
- 确认交接；
- 浏览和选择答案；
- 使用聚光灯；
- 继续；
- 返回修改；
- 提交；
- 进入下一题；
- 浏览复盘；
- 再玩或回到开场。

焦点规则：

- 进入新屏幕后把焦点移到该屏主标题；
- 聚光灯使用后焦点保留在按钮或移动到清晰状态消息；
- 被排除项若原本获得焦点，焦点转到选项组标题或下一个有效选项；
- 结果页焦点移到结果标题；
- 不出现键盘陷阱。

### 18.4 视觉

- 正文和按钮满足 WCAG AA 对比度目标；
- 焦点环清晰；
- 颜色不作为唯一提示；
- 200% 缩放可用；
- 320 CSS px 宽度下无关键内容横向滚动；
- 高对比模式下仍可识别选择与排除状态。

## 19. 安全与隐私

- 不请求网络；
- 不收集真实身份；
- 不写 Cookie；
- 不上传分数；
- 不执行用户输入 HTML；
- 玩家名称只通过 `textContent` 渲染；
- 不使用 `innerHTML` 拼接动态内容；
- 不读取本地文件；
- 不访问剪贴板；
- 不请求通知、摄像头、麦克风或定位；
- 不依赖跨页面来源；
- 不包含第三方脚本。

可在开发验收时扫描源码中的：

- `http://`；
- `https://`；
- `fetch(`；
- `XMLHttpRequest`；
- `WebSocket`；
- `new Image`；
- `@import`；
- 远程 `url(`。

文档链接不属于生产运行时；生产目录中不应出现远程资源请求。

## 20. 权利与借鉴声明

生产 README 必须包含：

### 内容边界

- 片名、线索、干扰项和解释为项目原创虚构内容；
- 不代表任何真实影片、工作室、角色或品牌；
- Emoji 以 Unicode 字符文本使用，由本机系统字体渲染；
- 不打包任何平台厂商 Emoji 图像；
- 不复制 Unicode/CLDR 数据文件。

### 借鉴声明

固定文案：

> 本项目为独立实现，未复制第三方开源项目代码、素材或题库。实现依据公开 Web 与 Unicode 标准；权利边界和一手资料见 `docs/271-emoji-movie-duel-research.md`。

如果实现时新增第三方参考，必须先更新研究和 README，写明固定仓库版本、许可证及实际借鉴范围。

## 21. 数据校验函数

实现中应提供开发时可执行的校验：

```js
function validateGameData({ tokens, cards, packs }) {
  // 返回错误字符串数组；空数组表示通过。
}
```

至少检查：

- token ID 唯一；
- token 字段完整；
- 卡片 ID 唯一；
- 卡片恰好四 token；
- 引用 token 存在；
- 卡片恰好四选项；
- 选项 ID 卡内唯一；
- 正确答案存在且唯一；
- 聚光灯排除项存在且错误；
- 作者字段正确；
- 已审核；
- 题包数为 4；
- 每包恰好四配对、八卡；
- 每个配对有 A/B；
- A/B 难度序列一致；
- A/B 类型序列一致；
- 总卡数为 32。

开发模式可以在加载时运行校验并把错误写到控制台。生产 UI 不显示开发细节。

## 22. 测试规格

### 22.1 静态检查

- `npm run verify`；
- `git diff --check`；
- 无生产远程资源；
- 无第三方资产；
- 无 ES Module；
- 无 `fetch()`；
- README 声明完整。

### 22.2 纯逻辑测试

至少覆盖：

- 正确且未提示得 2；
- 正确且已提示得 1；
- 错误且未提示得 0；
- 错误且已提示得 0；
- 聚光灯不能变负数；
- 每题不能用两次；
- 被排除项不能提交；
- 同题不能结算两次；
- 8 回合严格 A/B 交替；
- 双方各 4 题；
- 总分等于结果和；
- 平局正常进入总结；
- 数据校验能发现每类错误。

### 22.3 浏览器验收

使用 Chrome MCP 或等价真实浏览器逐项检查：

- 从 `file://` 打开；
- 默认设置完成一局；
- 自定义称呼；
- 手动选择题包；
- 随机选择题包；
- 两人分别使用 0、1、2 次聚光灯；
- 聚光灯排除选择项时清空选择；
- 返回确认页修改答案；
- 提交后不能修改；
- 8 题后正确结算；
- 平局文案；
- 一方获胜文案；
- 再玩未使用题包；
- 返回开场重置；
- 刷新安全重置；
- 无控制台错误；
- 无网络请求。

### 22.4 可访问性验收

- 仅键盘完整通关；
- 焦点顺序合理；
- 焦点始终可见；
- 屏幕切换有标题焦点；
- Emoji 标签按顺序朗读；
- 默认模式不视觉显示标签；
- 文字模式双方均显示标签；
- 状态不只靠颜色；
- 200% 缩放；
- 320px 宽；
- 减少动态效果；
- 高对比模式基础可辨。

### 22.5 内容验收

每张卡：

- 片名原创检索；
- 四符不明显映射真实影片；
- 解释合理；
- 干扰项可信；
- 文本标签不泄露答案；
- 字形跨平台语义检查；
- 配对盲测；
- 记录复核者和结论。

内容验收记录可以留在生产 README 的题库说明或单独的项目内审清单，但不把真实用户测试个人信息写入仓库。

## 23. 验收场景

### 场景 A：不使用提示答对

给定当前玩家有 2 枚聚光灯，选择正确答案并提交：

- 本题得 2 分；
- 聚光灯仍为 2；
- 结果记录 `spotlightUsed: false`；
- 进入对方交接屏。

### 场景 B：使用提示后答对

使用聚光灯、排除预设错误项，再答对：

- 聚光灯减为 1；
- 被排除项不可选；
- 本题得 1 分；
- 结果记录排除项 ID；
- 结果页说明提示已使用。

### 场景 C：提示后答错

- 本题得 0；
- 聚光灯仍已消耗；
- 正确答案显示；
- 不返还资源。

### 场景 D：选择项被提示排除

先选择一个错误项，该项恰好是聚光灯预设排除项，再使用聚光灯：

- 选择被清空；
- 继续提交按钮禁用；
- 焦点移动合理；
- 玩家必须重新选择。

### 场景 E：平局

双方最终同分：

- 显示“平局”；
- 不额外出题；
- 不比较剩余时间；
- 不比较剩余聚光灯；
- 允许再玩一场。

### 场景 F：文字等价模式

开局开启后：

- 两位玩家所有题目均显示 Emoji 和中文标签；
- 分数不变；
- 题包不变；
- 中途不能为单方关闭。

## 24. 完成定义

只有以下全部成立，才算实现完成：

- [ ] 创建产品目录和四个规定文件；
- [ ] 32 张原创卡完成；
- [ ] 4 个题包通过数据校验；
- [ ] 所有状态和迁移符合规格；
- [ ] 计分与聚光灯不变量通过；
- [ ] `file://` 浏览器整局通过；
- [ ] 无网络请求；
- [ ] 无第三方运行时依赖；
- [ ] 无第三方图像、字体、音频和题库；
- [ ] 键盘整局通过；
- [ ] Emoji 等价文本通过；
- [ ] 缩放和窄屏通过；
- [ ] README 权利边界与借鉴声明完整；
- [ ] 总目录/分类/导航按仓库规范接入；
- [ ] `npm run verify` 通过；
- [ ] `git diff --check` 通过；
- [ ] bug 与解决方案写入 `bugs/`；
- [ ] 值得复用的经验写入 `learn/`；
- [ ] 实现和每个独立修复分别提交。
