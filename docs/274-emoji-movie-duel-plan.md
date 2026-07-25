# 四符片名擂台：实现计划

> 依据：`docs/273-emoji-movie-duel-spec.md`
> 产品 ID：`four-symbol-film-duel`
> 产品名：四符片名擂台
> 结论：Conditional Go；完成内容、平台字形、公平性和无障碍 Go Gate 后转为 Go
> 本文只规划后续实现，不在本阶段修改生产代码、导航或共享文件

## 1. 实现原则

### 1.1 顺序

按以下依赖顺序实现：

```text
仓库接入确认
  → 原创内容与闭合 token 表
  → 数据校验和规则内核
  → HTML 语义骨架
  → CSS 视觉与响应式
  → 状态机和交互
  → 无障碍专项
  → file:// 浏览器验收
  → bugs / learn 沉淀
  → 总体验收
```

### 1.2 提交粒度

每完成一个可独立验证的部分就提交，不把整个项目压成一个巨大提交。

建议提交序列：

1. `feat: add original four symbol film data`
2. `feat: add four symbol film duel shell`
3. `feat: implement four symbol duel game flow`
4. `style: finish four symbol film duel`
5. `a11y: complete four symbol duel accessibility`
6. `docs: document four symbol duel sources and lessons`
7. `feat: register four symbol film duel`
8. 后续 bug 各自独立：`fix: ...`

每次提交前必须运行：

```bash
git branch --show-current
git rev-parse --show-toplevel
git status --short
```

确认分支和 worktree 属于当前实现任务后再暂存。Pre-commit hook 失败时修复后重新提交，不使用 `--amend`。

## 2. 预计文件

### 2.1 新增

```text
projects/four-symbol-film-duel/README.md
projects/four-symbol-film-duel/index.html
projects/four-symbol-film-duel/style.css
projects/four-symbol-film-duel/app.js
bugs/four-symbol-film-duel-*.md          # 只有真实发现 bug 时
learn/four-symbol-film-duel-*.md         # 值得复用的经验
```

### 2.2 可能修改

以实现时仓库现状为准，预计需要：

```text
README.md
projects.json 或仓库当前项目清单
index.html 或仓库当前总导航
```

不得依据旧文档臆测共享文件名。实现开始时重新读：

- `docs/orchestration-runbook.md`；
- 当前根 README；
- 当前项目清单；
- 一个最近完成的 A 级双人对抗项目；
- 当前验证脚本。

### 2.3 不新增

- 图片；
- SVG 素材包；
- Emoji 字体；
- 音频；
- 视频；
- npm 子依赖；
- JSON 运行时资源；
- 服务端；
- 构建产物；
- 在线 API 配置。

## 3. 阶段 0：实施前安全检查

### 3.1 目标

确认实施发生在正确分支、正确 worktree、正确基线，并识别用户已有改动。

### 3.2 操作

```bash
git branch --show-current
git rev-parse --show-toplevel
git status --short
git log -5 --oneline
```

然后：

- 阅读 `AGENTS.md`；
- 阅读编排 runbook；
- 检查是否有未提交文件；
- 检查项目 ID 是否已经存在；
- 检查 271–274 文档是否在当前分支；
- 检查 58 项基线是否已变化；
- 检查 `bugs/`、`learn/` 命名习惯；
- 检查 A 级项目 README 的借鉴声明格式。

### 3.3 停止条件

遇到以下情况停止并向主任务报告：

- 分支不是实现目标分支；
- worktree 路径不匹配；
- 存在与本项目重叠的未提交修改；
- 产品 ID 已被占用；
- 项目目录已存在且来源不明；
- 基线发生大规模结构变化；
- 验证脚本在未修改前已经失败。

### 3.4 验证

```bash
npm run verify
git diff --check
```

本阶段不提交。

## 4. 阶段 1：题库与 token 设计

### 4.1 目标

先完成 32 张可审计的原创题卡和闭合 Emoji token 表，避免 UI 完成后才发现内容机制不可用。

### 4.2 Token 表步骤

1. 建立候选 token 清单；
2. 删除旗帜、肤色和 ZWJ 组合；
3. 删除依赖左右朝向或特定颜色的符号；
4. 删除新系统支持不稳定的符号；
5. 为每个 token 编写原创中文标签；
6. 为内容作者写内部 `concepts`；
7. 在 macOS Chrome 和 Safari 观察字形；
8. 选用一个其他平台字形资料或实机做语义复核；
9. 将最终 token 表写为不可变常量。

建议先控制在 36–60 个 token。数量太少会让题面重复，数量太大会增加跨平台审查成本。

### 4.3 题包主题草案

题包名称必须原创，最终以内容审查为准。可从以下方向创作：

| 题包 | 气质 | 四组类型 |
|---|---|---|
| 午夜小厅 | 安静、城市、温暖 | 城市 / 动物 / 奇幻 / 太空 |
| 雨后加映 | 清新、偶遇、轻冒险 | 城市 / 动物 / 奇幻 / 太空 |
| 星光末场 | 浪漫、遥远、微悬疑 | 城市 / 动物 / 奇幻 / 太空 |
| 周日放映 | 轻松、明亮、幽默 | 城市 / 动物 / 奇幻 / 太空 |

这些名称也要做近似检查，不能因“虚构”就跳过搜索。

### 4.4 每张卡创作流程

1. 先写一句原创微型故事；
2. 为故事拟一个原创虚构片名；
3. 从闭合表选择四枚符号；
4. 写三个风格相近的原创干扰项；
5. 指定聚光灯排除项；
6. 写内部解释；
7. 检查文字标签是否泄露答案；
8. 搜索片名近似；
9. 搜索四符组合是否明显指向真实影视；
10. 与同 pair 的另一张卡比较难度；
11. 标记 `reviewed`。

### 4.5 成对设计

每个 pair 先定义共同约束：

```js
{
  pairId: "midnight-1",
  difficulty: 1,
  genre: "城市",
  targetTitleLength: [5, 7],
  cluePattern: "主体-行动-场景-归宿"
}
```

再分别创作 A/B 卡。配对不要求语义雷同，但要求：

- token 熟悉度相近；
- 片名长度接近；
- 四符组合方式接近；
- 干扰项可信度接近；
- 盲测答对率接近。

### 4.6 原创检索记录

不需要在生产代码中写搜索历史，但应在工作记录中保存每张卡：

- 搜索日期；
- 搜索词；
- 是否出现高度近似影视/品牌；
- 处理结果；
- 复核者。

若仓库不适合存 32 条详细检索，可在 `learn/` 中写方法，在实现任务的交付记录中保留题卡审查摘要。

### 4.7 盲测

至少两位未参与题目创作的人分别：

- 只看四符和四个选项；
- 不看解释；
- 记录答案；
- 记录信心 1–3；
- 标记“两个选项都合理”的题；
- 标记 Emoji 字形不理解的题。

配对目标：

- A/B 答对率差异不超过可接受阈值；
- 相同难度题的信心分布接近；
- 无题出现多数测试者认为两个答案同等合理。

样本很小时，不把统计值当严格证明；它用于发现明显失衡。

### 4.8 数据落地

`app.js` 顶部按顺序放：

```js
const EMOJI_TOKENS = Object.freeze([...]);
const FILM_CARDS = Object.freeze([...]);
const FILM_PACKS = Object.freeze([...]);
```

嵌套对象可用辅助 `deepFreeze`，或约定运行时不改数据。不要把动态游戏状态写回题卡对象。

### 4.9 验证

- token ID 唯一；
- 32 张卡；
- 16 个 pair；
- 4 个题包；
- 每包 8 卡；
- A/B 配对完整；
- 难度和类型序列一致；
- 正确项和排除项合法；
- 所有 token 引用存在；
- 所有卡 `authorship` 与 `reviewed` 正确；
- 搜索源码无真实电影条目；
- 人工审查无第三方内容。

### 4.10 提交

提交只包含数据、数据校验和必要的项目 README 内容边界，不包含未完成 UI：

```text
feat: add original four symbol film data
```

如果仓库验证器要求完整入口才能接受新目录，可先把数据作为实现分支的单一 `app.js` 与最小合法入口一起提交，或者把本阶段与骨架阶段合并；不能为了提交粒度破坏仓库不变量。

## 5. 阶段 2：语义 HTML 骨架

### 5.1 目标

建立可以由 JavaScript 切换的单页结构，先保证语义和 Tab 顺序。

### 5.2 `index.html`

包含：

- `<!doctype html>`；
- `lang="zh-CN"`；
- viewport；
- 本地 `style.css`；
- 本地经典脚本 `app.js`，使用 `defer`；
- 跳到主要内容链接；
- 顶部品牌区；
- `<main>`；
- 单一屏幕挂载点；
- 全局礼貌状态区域；
- 页脚原创/离线说明；
- `<noscript>` 说明。

不要：

- 内联远程 URL；
- `type="module"`；
- 外部字体；
- canvas Emoji；
- 图片；
- CDN；
- 预加载远程资源。

### 5.3 渲染策略

推荐使用明确的渲染函数：

```js
function renderApp() {
  switch (state.screen) {
    case Screen.SETUP:
      return renderSetup();
    case Screen.HANDOFF:
      return renderHandoff();
    // ...
  }
}
```

动态文本使用：

- `document.createElement`；
- `textContent`；
- 属性 API；
- 事件监听器。

允许固定、完全由开发者控制的静态模板，但玩家名称、题库文案和状态消息不得通过未转义字符串拼入 `innerHTML`。

### 5.4 各屏骨架

依次实现：

1. Setup 表单；
2. Handoff；
3. Question；
4. Confirm；
5. Result；
6. Summary。

此阶段按钮可以暂时由占位 handler 驱动，但所有必需元素、标题和语义组必须存在。

### 5.5 验证

- HTML 结构可解析；
- 无重复 ID；
- 表单标签关联；
- 按钮均有可理解名称；
- 页面无脚本错误；
- `file://` 可打开；
- 无网络请求；
- Tab 顺序合理。

### 5.6 提交

```text
feat: add four symbol film duel shell
```

## 6. 阶段 3：规则内核与状态机

### 6.1 目标

实现所有不依赖视觉细节的对局规则。

### 6.2 纯函数

优先实现并保持纯函数：

```js
normalizePlayerName(value, fallback)
scoreAnswer({ isCorrect, spotlightUsed })
validateGameData({ tokens, cards, packs })
buildSchedule(packId)
getCurrentPlayer(state)
getCurrentCard(state)
getWinner(players)
```

可选：

```js
shuffleOptions(options, randomFn)
choosePack(packIds, usedPackIds, randomFn)
```

### 6.3 状态操作

集中定义：

```js
startGame(settings)
acknowledgeHandoff()
selectOption(optionId)
useSpotlight()
openConfirmation()
returnToQuestion()
submitAnswer()
advanceRound()
startAnotherGame()
resetToSetup()
```

每个函数先检查状态和不变量。非法操作应安全无效，开发模式可 `console.warn`，不抛出导致游戏中断的异常。

### 6.4 聚光灯实现顺序

1. 校验资源；
2. 校验本题；
3. 读取预设排除项；
4. 扣除资源；
5. 标记本题；
6. 清理被排除选择；
7. 重渲染；
8. 宣布状态；
9. 恢复合理焦点。

任何一步都不能造成“资源已扣但排除项没生效”的半状态。先计算新状态，再一次性赋值。

### 6.5 提交答案实现顺序

1. 只允许 `CONFIRM`；
2. 验证选项仍有效；
3. 验证该 round 尚未出现在 results；
4. 比较正确 ID；
5. 调用纯计分函数；
6. 创建不可变结果；
7. 更新玩家分数；
8. 追加结果；
9. 进入 `RESULT`；
10. 宣布结果。

### 6.6 事件绑定

每次渲染后绑定当前屏所需事件，或在根节点使用事件委托。选择一种方式并保持一致。

事件委托时：

- 使用稳定 `data-action`；
- 使用 `closest()`；
- 检查 disabled；
- 不把题库文本写进 selector；
- 不允许双击重复提交。

提交按钮点击后应立即从可交互状态转出，避免连续事件。

### 6.7 验证

手工和逻辑检查：

- 默认设置开局；
- 8 回合；
- A/B 交替；
- 0/1/2 次提示；
- 被排除项清选择；
- 返回确认修改；
- 重复提交无效；
- 第八题进入总结；
- 胜、负、平；
- 再玩；
- 重置；
- 刷新重置。

### 6.8 提交

```text
feat: implement four symbol duel game flow
```

## 7. 阶段 4：视觉系统

### 7.1 目标

完成“独立影院票根”视觉，不借用真实电影或平台品牌资产。

### 7.2 CSS 层级

建议：

```text
1. tokens
2. reset/base
3. layout
4. typography
5. components
6. screen-specific
7. states
8. responsive
9. reduced motion
10. forced colors
```

### 7.3 核心组件

- `.app-shell`
- `.ticket-card`
- `.screen-heading`
- `.score-strip`
- `.player-chip`
- `.symbol-reel`
- `.symbol-token`
- `.option-grid`
- `.film-option`
- `.spotlight-control`
- `.handoff-card`
- `.result-banner`
- `.round-review`
- `.primary-action`
- `.secondary-action`

### 7.4 状态表达

每种状态至少有两种表达：

| 状态 | 颜色 | 非颜色表达 |
|---|---|---|
| 当前玩家 | 辅助色 | “当前”文本与图标 |
| 已选择 | 边框色 | 对勾与“已选择” |
| 已排除 | 灰色 | 删除线/图标与“已排除” |
| 正确 | 绿色 | 对勾与“正确片名” |
| 错误 | 红色 | 叉号与“你的选择” |
| 聚光灯已用 | 黄铜色 | 资源数字与明确文案 |

### 7.5 响应式

断点不追求设备型号，只按内容需要：

- 宽屏：选项 2×2，分数条横向；
- 中屏：选项 2×2 或单列；
- 320px：单列，操作按钮全宽；
- Emoji 题面允许 2×2 排列，但 DOM 顺序不变；
- Summary 复盘采用纵向卡片，不强制表格横向滚动。

### 7.6 字体

```css
font-family:
  ui-rounded,
  "SF Pro Rounded",
  "PingFang SC",
  "Microsoft YaHei",
  system-ui,
  sans-serif;
```

Emoji glyph 可使用系统 Emoji fallback，但不指定或打包私有字体文件。正文必须有普通系统字体兜底。

### 7.7 验证

- Chrome 常见桌面宽度；
- 320px；
- 200% 缩放；
- 长玩家名；
- 最长片名；
- 默认和文字模式；
- 正确/错误/排除状态；
- Summary 8 卡；
- 减少动态；
- 强制颜色基本可用；
- 对比度检查。

### 7.8 提交

```text
style: finish four symbol film duel
```

## 8. 阶段 5：无障碍专项

### 8.1 目标

把无障碍作为完整交互路径验证，而不是只补几个 `aria-label`。

### 8.2 Emoji 标签

逐题检查 DOM：

- glyph `aria-hidden="true"`；
- label 在可访问树中；
- 默认视觉隐藏；
- 文字模式可见；
- 四枚标签顺序正确；
- 不朗读内部 `concepts`；
- 不朗读答案解释；
- label 不重复两次。

### 8.3 焦点管理

实现辅助函数：

```js
function focusScreenHeading() {}
function announce(message) {}
function focusFirstAvailableOption() {}
```

验证：

- Setup 开局后 Handoff 标题获得焦点；
- Handoff 后 Question 标题获得焦点；
- 使用聚光灯后焦点不丢失；
- 被排除的是当前焦点/选择时合理转移；
- Confirm、Result、Summary 切换后标题获得焦点；
- “返回修改”后回到原选项；
- 无隐藏元素获得焦点。

### 8.4 键盘

只用键盘跑三条路径：

1. 全程不使用提示；
2. 使用提示且原选择被排除；
3. 打成平局并再玩。

记录任何：

- Tab 顺序跳跃；
- 焦点陷阱；
- Enter/Space 不响应；
- 禁用状态仍可触发；
- 状态更新未朗读；
- 结果读序不合理。

### 8.5 屏幕阅读器

至少在 macOS VoiceOver + Chrome 或 Safari 验证：

- 页面标题；
- 开场说明；
- 表单错误；
- 四符顺序；
- 选项组名称；
- 当前选择；
- 聚光灯代价和剩余；
- 排除状态；
- 提交确认；
- 得分变化；
- 结算复盘。

### 8.6 文本等价公平性

检查每个标签：

- 仅表达 glyph 语义；
- 不含题目答案词；
- 不把模糊图形解释成特定剧情；
- 视觉玩家和读屏玩家获得等价而非额外内容；
- 可见文字模式对双方全局生效。

### 8.7 提交

```text
a11y: complete four symbol duel accessibility
```

如果专项发现真实 bug，先记录 `bugs/`，修复和记录可放同一聚焦提交，或每个 bug 独立提交。

## 9. 阶段 6：README、借鉴和学习沉淀

### 9.1 项目 README

必须包括：

- 游戏简介；
- 双击打开方法；
- 玩法；
- 计分；
- 聚光灯；
- 文字等价模式；
- 离线说明；
- 数据与隐私；
- 题库原创说明；
- Emoji 字符与平台字形说明；
- 借鉴声明；
- 文件结构；
- 验收方式。

### 9.2 借鉴声明

写入：

> 本项目为独立实现，未复制第三方开源项目代码、素材或题库。实现依据公开 Web 与 Unicode 标准；权利边界和一手资料见 `docs/271-emoji-movie-duel-research.md`。

同时明确：

- 不打包 Apple、Google、Microsoft 等厂商 Emoji 图像；
- 不复制 Unicode/CLDR 数据文件；
- 使用系统对 Unicode 字符的本地渲染；
- 题库片名、线索、干扰项、解释均为项目原创。

### 9.3 `bugs/`

只记录实际遇到的问题。模板：

```md
# 四符片名擂台：问题标题

## 现象
## 复现
## 根因
## 解决方案
## 验证
## 影响范围
```

值得重点留意：

- `file://` 资源加载；
- Emoji 组合拆分；
- 被排除选项仍可提交；
- 双击重复结算；
- 焦点移到 disabled 元素；
- 长片名撑破布局；
- VoiceOver 重复朗读 glyph 和 label；
- 再玩时题包或分数未重置。

不要预先创建虚构 bug。

### 9.4 `learn/`

至少沉淀一篇真正可复用的经验，候选主题：

- Unicode 字符与厂商 Emoji 图像权利分层；
- 单设备轮流对抗的配对题包设计；
- 给 Emoji 提供不泄露答案的文本等价；
- 在 `file://` 游戏中做可复现静态题库校验。

学习文档应包含：

- 问题背景；
- 错误直觉；
- 可复用方法；
- 代码或数据模式；
- 验证清单；
- 适用边界。

### 9.5 验证与提交

```bash
npm run verify
git diff --check
```

提交：

```text
docs: document four symbol duel sources and lessons
```

若只有 README、没有足够新经验，不强行为了数量创建 `learn/`；但本项目的 Unicode 字符/图像权利分层通常值得沉淀。

## 10. 阶段 7：仓库注册

### 10.1 目标

把项目加入当前仓库的项目清单和“对抗”分类，不改变其他项目。

### 10.2 操作

根据实现时仓库结构：

- 添加项目元数据；
- 分类设为双人对抗；
- 本地等级 A；
- 启动入口指向 `projects/four-symbol-film-duel/index.html`；
- 描述突出“原创虚构片名”和“四符提示经济”；
- 不写“猜热门电影”；
- 更新总数量；
- 更新必要导航；
- 不重排无关条目。

### 10.3 元数据建议

```json
{
  "id": "four-symbol-film-duel",
  "title": "四符片名擂台",
  "category": "versus",
  "localLevel": "A",
  "entry": "projects/four-symbol-film-duel/index.html",
  "description": "轮流解开四枚符号组成的原创虚构片名，谨慎使用有限聚光灯争夺高分。"
}
```

字段名和枚举以当前仓库 schema 为准，不直接照抄此示例。

### 10.4 验证

- 总项目数增加 1；
- 对抗分类增加 1；
- A 级增加 1；
- 入口存在；
- 元数据与 README 一致；
- 总导航点击可打开；
- 无重复 ID；
- 其他 58 项不受影响；
- 验证脚本通过。

### 10.5 提交

```text
feat: register four symbol film duel
```

如果仓库验证要求“项目目录 + 注册元数据”同一提交，则把注册提前并与最小完整项目合并。以始终保持提交可验证为优先。

## 11. 阶段 8：浏览器与离线验收

### 11.1 静态命令

```bash
npm run verify
git diff --check
rg -n "https?://|fetch\\(|XMLHttpRequest|WebSocket|@import" projects/four-symbol-film-duel
```

README 中的一手资料链接可能命中 URL，必须人工区分文档链接和运行时加载。

检查入口脚本：

```bash
rg -n 'type="module"|src="https?://|href="https?://' projects/four-symbol-film-duel/index.html
```

预期没有运行时远程资源。

### 11.2 Chrome MCP 验收矩阵

| 编号 | 路径 | 预期 |
|---|---|---|
| B01 | `file://.../index.html` | 成功打开，无错误 |
| B02 | 默认开局 | 进入玩家 A 交接 |
| B03 | 自定义称呼 | 安全显示、无 HTML 执行 |
| B04 | 固定题包 | 8 题均来自所选包 |
| B05 | 随机题包 | 只随机完整包 |
| B06 | A 不提示答对 | +2 |
| B07 | B 提示答对 | 资源 -1，+1 |
| B08 | 提示后答错 | 资源不返还，+0 |
| B09 | 选择被排除项 | 选择清空 |
| B10 | 确认后返回 | 可改，未结算 |
| B11 | 提交后尝试返回 | 不可改、不重复结算 |
| B12 | 第八题 | 进入总结 |
| B13 | 平局 | 无加时 |
| B14 | 再玩 | 优先未使用题包，状态重置 |
| B15 | 返回开场 | 称呼和对局按规格重置 |
| B16 | 刷新 | 安全回到开场 |
| B17 | 文字模式 | 双方所有题均显示标签 |
| B18 | 默认模式 | 视觉不显示标签，AT 保留 |
| B19 | 320px | 无关键横向滚动 |
| B20 | 200% | 可完成整局 |
| B21 | 减少动态 | 非必要动效取消 |
| B22 | 网络面板 | 零外部请求 |
| B23 | 控制台 | 无 error |

### 11.3 公平性验收

运行或人工打印每个题包：

```text
Pack
  Pair 1: A(d1, 城市) / B(d1, 城市)
  Pair 2: A(d1, 动物) / B(d1, 动物)
  Pair 3: A(d2, 奇幻) / B(d2, 奇幻)
  Pair 4: A(d3, 太空) / B(d3, 太空)
```

检查：

- A/B 每局各 4；
- 相同类型和难度；
- 正确项位置分布不过度偏斜；
- 提示排除项不是正确项；
- 每人初始资源一致；
- 平局不比较先后或速度。

### 11.4 权利边界验收

人工检查：

- 无真实电影片名；
- 无真实人物或角色；
- 无台词；
- 无剧情梗概复制；
- 无海报、剧照、Logo；
- 无厂商 Emoji 图片；
- 无 Emoji 字体；
- 无 CLDR 数据文件；
- 无第三方题库；
- README 声明与实际一致。

## 12. 阶段 9：Bug 处理循环

发现 bug 时：

1. 在 `bugs/` 记录现象和复现；
2. 建立最小复现；
3. 判断是数据、规则、渲染、样式、无障碍或浏览器兼容层；
4. 做最小修复；
5. 回归相关场景；
6. 跑全仓验证；
7. 更新 bug 文档中的解决和验证；
8. 独立提交。

提交示例：

```text
fix: prevent eliminated film option submission
fix: keep emoji labels available to screen readers
fix: reset spotlight state between rounds
```

不把多个无关 bug 混在一起。

## 13. 阶段 10：最终验收

### 13.1 命令

```bash
npm run verify
git diff --check
git status --short
git log --oneline --decorate -12
```

### 13.2 文件检查

- 生产目录只有规定的本地文件；
- 271–274 文档存在；
- README 完整；
- 真实 bug 有记录；
- 值得复用的经验有记录；
- 共享清单已注册；
- 无临时截图、日志、下载文件；
- 无未跟踪调试资源。

### 13.3 Git 检查

- 当前分支正确；
- worktree 正确；
- 每个完成部分有独立提交；
- 不包含无关文件；
- 工作区干净；
- 未使用 amend；
- 未执行破坏性操作；
- 未推送，除非主任务明确授权。

### 13.4 Go 判定

只有以下四个 Gate 都通过，最终状态才从 Conditional Go 改为 Go：

#### 内容 Gate

- 32 卡全部原创；
- 名称和四符近似检查完成；
- 没有真实影视表达；
- 题卡解释可复核。

#### 公平 Gate

- 16 对题卡配平；
- 盲测没有明显 A/B 偏差；
- 资源和计分严格对称；
- 平局不加时。

#### 字形与无障碍 Gate

- 闭合 token 表通过平台语义检查；
- 不打包厂商字形；
- 文本等价不泄露答案；
- 键盘和屏幕阅读器整局可用。

#### 本地 Gate

- `file://` 完整通关；
- 零远程请求；
- 零运行时第三方依赖；
- 仓库 verify 通过。

任何 Gate 未通过：

- 不登记为已完成产品；
- 保持 Conditional Go；
- 在 `bugs/` 或实施记录说明阻塞；
- 不用删减关键机制的方式假装完成。

## 14. 任务清单

### 实施前

- [ ] 确认分支和 worktree
- [ ] 确认基线干净
- [ ] 重读当前仓库规范
- [ ] 检查 ID 未占用
- [ ] 基线 verify 通过

### 内容

- [ ] 建立闭合 token 表
- [ ] 编写原创中文 token 标签
- [ ] 完成 4 个题包
- [ ] 完成 16 个 pair
- [ ] 完成 32 张卡
- [ ] 完成每卡 3 个干扰项
- [ ] 指定每卡聚光灯排除项
- [ ] 完成每卡内部解释
- [ ] 完成名称近似检查
- [ ] 完成真实影视指向检查
- [ ] 完成配对盲测
- [ ] 完成跨平台字形检查

### 数据与逻辑

- [ ] 写 token/card/pack 常量
- [ ] 写数据校验
- [ ] 写状态模型
- [ ] 写排程
- [ ] 写计分
- [ ] 写聚光灯
- [ ] 写结果记录
- [ ] 写胜负判断
- [ ] 写重开与重置

### 页面

- [ ] Setup
- [ ] Handoff
- [ ] Question
- [ ] Confirm
- [ ] Result
- [ ] Summary

### 视觉

- [ ] 票根视觉 token
- [ ] 四符题面
- [ ] 选项状态
- [ ] 分数条
- [ ] 聚光灯状态
- [ ] 交接页
- [ ] 结果页
- [ ] 复盘卡
- [ ] 320px
- [ ] 200%
- [ ] 减少动态
- [ ] 强制颜色

### 无障碍

- [ ] 原生语义
- [ ] Emoji 等价文本
- [ ] 可见文字模式
- [ ] 焦点管理
- [ ] 状态宣布
- [ ] 键盘整局
- [ ] VoiceOver 整局
- [ ] 对比度
- [ ] 非颜色状态

### 仓库

- [ ] 项目 README
- [ ] 借鉴声明
- [ ] 内容权利说明
- [ ] 分类注册
- [ ] 根导航
- [ ] `bugs/`
- [ ] `learn/`
- [ ] verify
- [ ] diff check
- [ ] Chrome MCP
- [ ] 工作区干净

## 15. 可选增强池

以下内容只在首版完整通过后，由用户另行选择：

- 非排名“自编片单”；
- 导入/导出原创题包；
- 纯合作模式；
- 更多完整题包；
- 题包难度筛选；
- 本地偏好保存；
- 题卡打印版；
- 英文等价标签；
- 可访问性首选项记忆。

不在首版顺手实现。

## 16. 交付报告格式

最终向主任务汇报：

1. Go / Conditional Go / No-Go；
2. 最终产品 ID、标题、分类和本地等级；
3. 完成的提交列表；
4. `file://`、键盘、屏幕阅读器、窄屏和离线验证结果；
5. 32 卡原创与配平审查结果；
6. Emoji 字符/厂商图像权利边界结论；
7. 开源借鉴结论；
8. `bugs/` 和 `learn/` 新增内容；
9. `npm run verify` 结果；
10. 当前分支、worktree、HEAD 和 clean status；
11. 尚未完成或需要用户决策的事项。

本计划本身的建议结论仍为 **Conditional Go**。后续实现不得把“页面能跑”当作最终 Go；内容、公平、字形无障碍和本地运行四个 Gate 必须一起通过。
