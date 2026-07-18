# A 级「星码解锁」规格

## 1. 定位与 brainstorm

- 创意池：S01「星码解锁」；
- 产品名：星码解锁；
- ID：`star-code-unlock`；
- 主分类：单人惊喜；
- 启动等级：A；
- 设备：收件人在一台电脑或手机上操作；
- 公网、账号、服务与长期存储：均无；
- 首版核心：根据三条只有双方理解的私人线索输入答案，每题正确后点亮一颗星；三星连成星码后，收件人主动揭晓准备者写好的短句。

它补充当前惊喜类没有的“私人语义答案”样板。未来车票的三个选择都合法，一层一层验证动作，纸飞机投递验证数值航线；星码解锁第一次要求一个答案与本地配置中的有限答案集合匹配，并提供不惩罚、可恢复的错误路径。

首版不加入拖动图案锁、真实星表、定位、时间、随机星位、多关卡、计时、计分、账号、口令安全、加密、音频、照片、自动保存、联网分享或题库编辑器。

### 1.1 30 秒闭环

```text
开始校准
→ 读取当前一条私人线索
→ 输入答案
→ 错误：柔和提示；第三次可让星盘代为校准
→ 正确：点亮并确认一颗星
→ 重复三题
→ 三星连线，但星码仍封存
→ 收件人主动揭晓
→ 才创建最终短句、正文与落款
```

每题只接受一次提交并进入明确结果阶段，避免双击或连续 Enter 在同一事件循环内累计多次错误。答错不清空已经点亮的星；帮助校准也走同一成功状态，不制造第二条绕过终局的 UI 路径。

## 2. 调研与原创边界

调研快照：2026-07-18。

### 2.1 权威平台资料

- [MDN `String.prototype.normalize()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/normalize) 说明 NFC/NFD/NFKC/NFKD 及兼容等价字符；本作使用 NFKC 统一全角/兼容输入后再比较；
- [MDN `<input>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/input) 强调明确 label 与原生控件可用性；本作不把文本输入伪造成星图内的自绘控件；
- [MDN `autocomplete`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/autocomplete) 建议不要泛化关闭自动填充。本作只对三条一次性私人谜题输入使用 `autocomplete="off"`，避免浏览器历史建议提前把过去答案浮到惊喜页面，其他控件不禁用辅助能力。

答案规范化只用于匹配，不回写展示值。兼容规范化可能改变字符外观，因此 UI 继续显示用户原始输入，状态不保存原始或规范化后的答案。

### 2.2 开源候选核验

| 项目 | 固定版本 | 许可证 | 结论 |
| --- | --- | --- | --- |
| [`tympanix/pattern-lock-js`](https://github.com/tympanix/pattern-lock-js/tree/95d40ac58f56beb11b96d403c10c9349d8372c4d) | `95d40ac58f56beb11b96d403c10c9349d8372c4d` | MIT | 只核验 README、仓库结构与 LICENSE；其 SVG 拖动图案锁依赖旧 jQuery 流程，本作不采用拖动图案机制，不复制代码或视觉。 |
| [`jamesgary/constellations`](https://github.com/jamesgary/constellations/tree/615ba564fa28626d84866583ccc95d5a06ee013a) | `615ba564fa28626d84866583ccc95d5a06ee013a` | 根 LICENSE 为 MIT，`package.json` 标记 ISC | 许可证元数据不一致且需要 Elm/Parcel/Sass；只用于确认“点与边可以形成谜题”的公开机制，不引入代码、构建或素材。 |
| [`ofrohn/d3-celestial`](https://github.com/ofrohn/d3-celestial/tree/7e720a3de062059d4c5400a379146a601d9010e0) | `7e720a3de062059d4c5400a379146a601d9010e0` | BSD-3-Clause | 真实天图依赖 D3、JSON 数据和本地服务/浏览器放行，不满足本作 A 级最小边界；不复制代码、星表、星座线或素材。 |

这些候选只用于做“采用/拒绝”判断。生产实现使用人工设计的 12 个虚构星位、原生 HTML 表单、SVG 展示和本仓库纯逻辑；完整声明见 `experiences/surprises/star-code-unlock/assets/ATTRIBUTION.md`。

## 3. 本地配置

`config.js` 提供：

```js
{
  recipientName,
  introCopy,
  clues: [
    {
      id,
      prompt,
      acceptedAnswers: ["一个或多个可接受写法"],
      starId,
      successCopy,
      rescueCopy,
    },
    // 固定三条
  ],
  secretWords: ["答案", "一直", "是你"],
  revealTitle,
  revealLines,
  signOff,
  senderName,
  hintAfterMiss(context),
}
```

### 3.1 整份配置 Gate

- `clues` 必须恰好 3 条，ID 唯一；
- 每条 `acceptedAnswers` 为 1–5 个非空字符串，规范化后仍非空且互不重复；
- 三个 `starId` 必须来自内置 12 星 ID，且互不重复；
- `secretWords` 恰好 3 段，每段 1–12 字；
- 最终正文 1–4 段；
- 所有文本有明确长度上限；
- 任一字段失败时整份回退 `DEFAULT_CONFIG`，不把默认收件人、默认答案或默认终局混入用户配置；
- sanitize 返回调用方数据的递归冻结副本，不共享数组或对象。

配置明文位于本机文件中。这是阶段化惊喜，不是密码学保险箱；查看源码的人能读到答案和短句。README 必须明确这一点。

### 3.2 用户可参与的 5–10 行策略

`hintAfterMiss({ clueIndex, wrongCount })` 只决定前两次答错的提示语气：可以诗意、直接或使用双方梗。上下文是冻结副本，不包含答案、目标星 ID或最终短句。

- 只在 `wrongCount` 为 1 或 2 时调用；
- 返回 1–100 字；
- 抛错、返回空串或超长文本时使用默认提示；
- 第三次错误由核心规则提供“让星盘代为校准”，策略不能取消可完成性。

不把 `isCorrect()` 交给用户配置：自定义正确性函数容易制造无解、多解、可变状态或设备差异，自动测试也无法证明默认通关路径。

## 4. 答案规范化

`normalizeAnswer(raw)`：

1. 只接受字符串且原始长度不超过 80；
2. `normalize("NFKC")`；
3. `trim()`；
4. `toLocaleLowerCase()`；
5. 删除 Unicode 空白与常见中英文标点；
6. 结果必须至少包含一个字符。

它让 `７ 月`、`7月` 或英文大小写等常见输入差异可以匹配。逻辑不做模糊编辑距离、拼音、同义词或 AI 判断：准备者应把合理别名显式加入 `acceptedAnswers`，避免误把不同私人记忆判为相同。

## 5. 权威状态机

```js
{
  phase: "intro" | "solving" | "missed" | "linked" | "ready" | "revealed",
  clueIndex: 0,
  solvedStarIds: [null, null, null],
  wrongCounts: [0, 0, 0],
  lastResult: null | {
    clueId,
    type: "wrong" | "correct" | "rescued",
    wrongCount,
  },
  revision: 0,
}
```

不保存：

- 用户原始输入；
- 规范化答案；
- 可接受答案数组；
- 最终短句或正文；
- 动画计时器或 DOM 引用。

### 5.1 状态图

```text
intro
  └─ start → solving
       └─ submitAnswer
            ├─ wrong → missed
            │    ├─ retry → solving（同一题）
            │    └─ rescue（wrongCount ≥ 3）→ linked
            └─ correct → linked
                   └─ continueAfterLink
                        ├─ 第 1 / 2 题 → solving（下一题）
                        └─ 第 3 题 → ready
ready
  └─ reveal → revealed
revealed
  └─ restart → intro
```

### 5.2 纯逻辑 API

- `sanitizeConfig(raw)`；
- `normalizeAnswer(raw)`；
- `createInitialState(config?)`；
- `isStarCodeState(value)`；
- `start(state)`；
- `submitAnswer(state, rawAnswer, config)`；
- `retry(state)`；
- `rescue(state, config)`；
- `continueAfterLink(state)`；
- `reveal(state)`；
- `restart(state)`；
- `resolveMissHint(policy, context)`。

规则约定：

- 合法状态的非法动作返回同一引用；
- 畸形状态通过公开动作安全回初始，不抛异常；
- `submitAnswer()` 自己读取当前题的受控配置并比较，`app.js` 不能先判断后传入布尔值；
- 一次提交后立即离开 solving，连续 submit/Enter 全部无效；
- rescue 只在当前题错误数至少 3 时生效，写入与正确答案相同的 `starId`，结果类型标记 rescued；
- linked 只允许显式 continue 推进，不依赖发光动画结束；
- 第三颗星后进入 ready，但最终短句仍不在 DOM；
- restart 只从 revealed 生效，清空三题结果并让 revision 单调增加。

## 6. 星盘与阶段 DOM

### 6.1 固定虚构星位

内置 12 星使用稳定 ID 与 SVG viewBox 坐标：

```text
s01 (500,120)  s02 (330,185)  s03 (675,175)
s04 (245,300)  s05 (770,300)  s06 (180,450)
s07 (825,450)  s08 (260,610)  s09 (750,610)
s10 (355,735)  s11 (655,735)  s12 (500,810)
```

星盘 viewBox 为 `1000×920`。装饰小星与经纬线由代码生成但不参与规则。三个已解星按题序连接；星位 ID 不随刷新或设备随机变化。

### 6.2 DOM 所有权

- `index.html` 只有静态壳、标题、空星盘层与阶段容器；
- intro 不创建任何私人提示、答案、成功文案或最终内容；
- solving 只创建当前一条提示与输入，不预埋后两题；
- missed 只创建当前错误反馈和重试/帮助按钮；
- linked 只创建当前成功文案；
- ready 创建三段 `secretWords` 和“读出星码”，但不创建最终标题/正文/落款；
- revealed 才创建最终标题、正文、落款和重开按钮；
- restart 使用 `replaceChildren()` 销毁终局节点，而不是 CSS 隐藏。

`config.js` 仍是本机明文。阶段 DOM 测试只证明页面和辅助技术不会提前读到后续内容，不等于源码保密。

## 7. 输入、焦点与反馈

### 7.1 原生表单

- 每题使用 `<form>`、可见 `<label>`、`<input type="text">` 与 submit button；
- 输入最大 80 字，`autocomplete="off"`、`autocapitalize="none"`；
- 不用密码框：用户应能确认自己输入的私人答案；
- Enter 提交，按钮支持 Enter/Space，所有主动作至少 56px；
- 星盘本身是 `role="img"`，动态 `desc` 说明已点亮几颗和当前连接，不在 SVG 内伪造输入按钮。

### 7.2 焦点路径

```text
intro：开始校准
solving：答案输入框
missed：重新想想；第三次同时提供“让星盘帮一次”
linked：接收下一条星讯
ready：读出星码
revealed：重新封存
```

live region 只播报题号、错误次数、点亮星、三星连线和揭晓结果；不播报可接受答案或未到阶段的内容。

### 7.3 reduced motion

普通模式允许 320ms 的星光点亮与连线描边。`prefers-reduced-motion: reduce` 直接展示权威 linked/ready 状态，不用动画完成事件推进，也不自动揭晓内容。

## 8. 视觉生产规格

方向：1960 年代模拟天文台的私人解码桌。它不是现代航天 HUD，也不是发光赛博星空。

### 8.1 设计令牌

- 天文台黑茄：`#151218`；
- 深仪器板：`#211d20`；
- 旧银：`#9b8f7d`；
- 暖纸：`#d8c39f`；
- 琥珀星光：`#e7a052`；
- 氧化红：`#9f3b2d`；
- 校准青：`#3b8b88`；
- 主墨：`#28201a`。

使用直角仪器板、同心刻度、薄金属线、硬偏移阴影、打孔票据和实体封条；不使用 gradient、玻璃、霓虹、圆角卡片或远程字体。中文标题使用本机宋体/衬线回退，仪器刻度和状态使用 monospace。

### 8.2 桌面概念 1503×1046

- 顶部窄导航；
- 主区约 62/38：左侧大型圆形星盘与三个连接座，右侧标题、三题进度、当前票据、输入、主动作和密封条；
- 1504×1046 实装应无页面滚动，完整看见主动作与页脚；
- 概念图：[桌面回答态](./assets/star-code-unlock/concept-desktop.png)。

### 8.3 移动概念 853×1844

顺序：导航、标题、说明、进度、星盘、当前票据、输入、主动作、密封条、页脚。生产在 390px 宽自然滚动，不仿造手机外壳。

- 概念图：[移动回答态](./assets/star-code-unlock/concept-mobile.png)。

### 8.4 运行资产

`assets/observatory-desk.png` 为 1536×1024 无文字、无 UI 的天文台桌面背景，只在边缘提供星盘金属边、调焦旋钮、票根和校准线。星盘、星点、经纬线、票据、输入、按钮、封条和全部文字由代码生成。

## 9. 响应式与无障碍 Gate

- 1504×1046 的 intro、solving、missed、linked、ready 与 revealed 关键动作首屏可见；
- 390×844、320×760 与 320×568 无横向溢出，纵向自然滚动；
- 200% 页面缩放后输入、反馈和全部主动作仍可达；
- 输入有可见 label、错误通过文本说明，不只依赖红色/星光；
- 星盘动态描述说明“已点亮 N / 3 颗”，装饰线不进入辅助树；
- 所有按钮至少 56px，输入至少 52px；
- reduced motion 不延迟状态；
- ready 前 `secretWords` 不在 DOM，revealed 前最终标题、正文、落款不在 DOM。

## 10. 自动测试 Gate

逻辑至少覆盖：

1. 12 个固定星位、三题、答案星存在且互异；
2. 配置修剪、整份回退、深冻结和调用方所有权隔离；
3. NFKC、大小写、空白、常见标点与超长答案规范化；
4. intro 只能 start 一次，solving 一次提交锁定；
5. 错误只递增当前题，状态不保存原始或规范化答案；
6. retry 只恢复同一题，错误数保留；
7. 第三次前 rescue 无效，第三次后与正确答案点亮同一星；
8. 正确答案的多个可接受写法稳定匹配，错误/未知输入不能点亮；
9. linked 前两次推进下一题，第三次唯一进入 ready；
10. reveal 只从 ready 生效，restart 只从 revealed 清空并单调 revision；
11. 默认路径通过生产 API 确定到达 revealed；
12. hint 策略获得冻结且无答案的上下文，异常/非法返回安全回退；
13. 畸形状态安全回初始，合法非法操作保持原引用。

目录测试还要确认：catalog A、经典脚本、相对资源、无外链/网络/Storage/权限/随机/第三方运行时、无 `innerHTML`、CSS 无 gradient、HTML/app 不含默认三条提示、答案、secretWords 与终局正文。

整仓继续要求 `npm test`、`npm run verify` 与 `git diff --check` 通过。

## 11. 浏览器验收路径

1. intro 开始，确认焦点进入输入框；
2. 第 1 题用错误答案，确认 missed 锁定且连续 Enter 不重复累计；
3. retry 两次，检查渐进提示；第三次确认帮助校准出现；
4. 使用帮助校准，确认只点亮当前星并进入 linked；
5. 第 2/3 题分别用规范化别名与直接答案完成；
6. ready 时只出现三个星码词，不出现最终正文；
7. 揭晓后出现终局，重新封存后全部秘密节点移除；
8. 键盘完成一遍，检查焦点、可见环和 live region；
9. 检查 1504×1046、390×844、320×760、320×568 和 200% 缩放；
10. 模拟 reduced motion；
11. 控制台 0 error / 0 warning，请求只含同源相对资源；
12. 用真实 Chrome `file://` 直开完成默认路径。

## 12. 概念忠实度清单

实装必须逐项与概念对比：

1. 左星盘/右票据的 62/38 桌面结构；
2. 黑茄、旧银、暖纸、琥珀、氧化红的准确关系；
3. 宋体大标题与 monospace 仪器刻度的双字体系统；
4. 方形金属仪器板、实体票据、矩形按钮和封条，不替换为通用卡片；
5. 移动顺序、星盘比例、票据密度和按钮尺寸；
6. 只允许规格中的标题、说明、题号、票据、输入、动作、密封与页脚文案，不添加徽章、pill、假数据或额外导航。

提交验收前必须分别 `view_image` 检查概念与最新浏览器截图，并写 mismatch / evidence / fix 忠实度 ledger。

## 13. 分批提交计划

1. 规格提交：本文、桌面/移动概念、无字运行背景和来源声明；
2. 功能提交：纯逻辑、配置、页面、目录接入、自动测试和实现期修复；
3. 验收提交：实装截图、浏览器报告、逐 bug 记录与跨项目学习。

每一部分完成适用 Gate 后独立提交，不把未验证实现混入规格提交。
