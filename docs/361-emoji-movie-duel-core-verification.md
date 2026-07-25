# `emoji-movie-duel` 非视觉核心复审

> 实际作品 ID：`four-symbol-film-duel`
> 复审编号：361
> 日期：2026-07-25
> 基线：`9c81ea0d699662967471000facb9320cca379ae1`
> 分支：`codex/exp-emoji-movie-duel-core-reaudit`
> worktree：`/Users/zenith/Desktop/two-of-us-worktrees/emoji-movie-duel-core-reaudit`
> 范围：项目配置、纯逻辑、测试、bug / learn、来源与借鉴声明
> 排除：生产 UI、共享依赖声明、根入口、launcher、catalog、Board

## 1. 结论

**复审通过；非视觉核心可继续进入后续 UI Gate，但本结论仍不等于作品已经安装或
可以双击游玩。**

上一轮编号 352 的 27 项核心测试全部保留。本轮新增 3 项回归测试，共发现并修复
3 类真实问题：

1. glyph schema 会接受多字素和非 Emoji；
2. action Proxy 可在两次 descriptor 观察之间改变类型；
3. 固定正确答案位置严重偏斜。

另补齐 `ATTRIBUTION.md`，使其与 research 实际使用的 13 个一手 URL 完全一致。

最终证据：

- 定向测试 `30/30`；
- 全仓测试 `2291/2291`；
- repository verify 通过；
- 48 个 token、32 张卡、128 个选项、4 个题包继续通过数据校验；
- 128 个选项标题 NFKC 后仍全部唯一；
- 32 个无序四符组合全部唯一；
- 正确答案四个位置严格为 `8 / 8 / 8 / 8`；
- 41 个动作的完整对局可由 JSON action log 重放到深度相等终态；
- 没有增加运行时依赖、随机、网络、存储、DOM、时钟或媒体调用。

## 2. Unicode、字素与跨平台回退

### 2.1 基线缺口

基线按 1–4 个 Unicode 码点检查 `glyph`，并排除 ZWJ、肤色、旗帜、tag 和私用
区。这不能证明输入是一枚 Emoji：

```text
🐈🐕  两枚符号
☀️☁️  两枚符号
A      普通拉丁字母
中     普通汉字
```

四项都会被旧版 `validateGameData()` 与 `sanitizeConfig()` 接受。

### 2.2 修复合同

现在每个 glyph 必须满足：

```js
/^(?:\p{Emoji_Presentation}|\p{Extended_Pictographic}\uFE0F)$/u
```

这表示：

- 默认 Emoji 呈现字符可直接使用；
- 默认文本呈现的象形字符必须带 VS16；
- 不接受普通文字、多个象形字符、ZWJ、modifier、flag、tag 或私用区；
- 不依赖 `Intl.Segmenter`、Unicode/CLDR 数据文件、字体或厂商图片。

内置 48/48 glyph 全部通过。`labelZh` 继续随公开 card token DTO 投影，因此
后续 UI 可以提供可见文字等价模式和辅助技术名称。真实 Safari、Windows、
Android 字形观察仍必须留到生产 UI 验收，不能由 schema 冒充完成。

记录：

- `bugs/four-symbol-film-duel-glyph-schema.md`
- `learn/2026-07-25-content-invariants-beyond-counts.md`

## 3. 内容原创、去重与固定位置公平

### 3.1 去重和原创边界

机械复核结果：

| 项目 | 结果 |
|---|---:|
| token | 48 |
| card | 32 |
| option title | 128 |
| NFKC 后唯一 title | 128 |
| 无序四符组合 | 32 / 32 唯一 |
| pack | 4 |
| A/B pair | 16 |

32 个正确答案再次分四组做带引号精确公开检索，四组均无结果。该证据只覆盖正确
答案，不覆盖 96 个干扰项，也不代表穷尽未索引内容、其他语言译名、未来作品或
全部司法辖区。128 项内部规范化去重与原创作者声明均完整。

没有使用真实电影、角色、对白、剧情、海报、剧照、Logo、音乐、视频、第三方
题库或厂商 Emoji 图像。

### 3.2 答案位置缺口

基线正确答案位置为：

```text
全局：11 / 12 / 8 / 1
A 方： 6 /  7 / 3 / 0
B 方： 5 /  5 / 5 / 1
```

A 方从不以第 4 项为正确答案，违反规格中“固定顺序必须均匀”的合同。

修复只确定性调整展示顺序，并保留每个选项原有 ID、标题、答案 ID 和聚光灯排除
目标。结果为：

```text
全局：8 / 8 / 8 / 8
A 方：4 / 4 / 4 / 4
B 方：4 / 4 / 4 / 4
```

每个 `pack × side` 的四题也都恰好覆盖四个位置一次。pack 与 side 采用不同轮换
偏移，不把所有题包固化成同一回合位置模式；没有引入随机。

记录：`bugs/four-symbol-film-duel-answer-position-skew.md`。

## 4. 盲交接与公开投影

上一轮阶段遮罩测试继续通过：

- setup / handoff / summary 的 `currentCard` 为 `null`；
- handoff 不投影下一题；
- question / confirm 只投影四符、四个选项和当前选择/排除状态；
- result 才投影正确答案和解释；
- summary 只复盘已经结算的 8 题；
- `content` 与内部 `schedule` 永不进入 public view；
- 所有公开 DTO 递归冻结。

边界说明：经典浏览器脚本目前会把完整配置和含 `DEFAULT_CONFIG` 的 API 暴露在
页面进程。本地源码也天然可由主动用户查看，因此生产 UI 只能承诺 DOM、可访问
树、页面查找和普通交接界面不提前泄露，不能承诺抵抗主动查看源码或 DevTools。
这属于后续 UI 文案与实现 Gate，本次不越界修改生产 UI 或设计文档。

## 5. 确定性重放与敌意输入

### 5.1 action 单次观察缺口

旧 `parseAction()` 先探测 `type` 决定 schema，再做第二次完整快照。敌意 Proxy
可第一次报告 `SELECT_OPTION`、第二次报告 `ACK_HANDOFF`，从而让 handoff 非法
推进到 question。

修复后只调用一次 `Object.getOwnPropertyDescriptors(candidate)`，并在同一份普通
descriptor 快照上：

1. 校验动作类型；
2. 选择精确 schema；
3. 拒绝额外键、Symbol、accessor 与污染原型；
4. 复制 data property；
5. 校验 revision。

回归探针确认 `type` descriptor 只观察一次，敌意动作返回原 state 引用。记录：
`bugs/four-symbol-film-duel-action-snapshot-race.md`。经验由既有
`learn/2026-07-23-single-observation-snapshot-boundary.md` 覆盖。

### 5.2 重放证据

独立探针生成并 JSON 往返 41 个动作：

```text
START_MATCH
8 × (ACK_HANDOFF → SELECT_OPTION → OPEN_CONFIRMATION
     → SUBMIT_ANSWER → ADVANCE_ROUND)
```

从全新初态重放得到：

```text
phase = summary
revision = 41
authoritative state 深度相等
public view 深度相等
```

restart revision 继续单调，旧 revision 动作不能跨局重放。外部、克隆和 hostile
state 继续安全回到全新 setup；普通 action getter 不执行。

## 6. 来源、许可证与借鉴声明

`ATTRIBUTION.md` 现在与 research 的 13 个 URL 精确一致，包含：

- Unicode 字符、序列、字形权利、FAQ 与数据许可；
- 美国版权局作者性、短标题、影视登记与影视表达；
- USPTO 单一作品标题与混淆可能性；
- WCAG 非文本内容、Emoji 文本替代与 WAI-ARIA。

UTS #51 使用固定
[Revision 29](https://www.unicode.org/reports/tr51/tr51-29.html)，避免浮动 latest
页面改变历史证据。本轮在线确认该页仍为 Unicode Emoji 17.0 / Revision 29。

本作的开源借鉴结论仍为零：

- 没有参考、复制、修改、链接或打包第三方猜电影项目；
- 没有第三方代码、题库、字体、图像、音频或视频；
- 标准与权利页面只用于边界校准，不是运行依赖或内容来源；
- 将来若实际参考开源项目，必须先补固定 commit/tag、LICENSE、版权人、实际
  借鉴内容、未复制范围和所需 notice。

## 7. 依赖与验证

作品目录自身只有：

```text
ATTRIBUTION.md
config.js
logic.js
logic.test.js
package.json
```

作品 `package.json` 只有 `"type": "commonjs"`，没有独立 dependencies。全仓测试
首次运行时，隔离 worktree 尚无根 `node_modules`，因此 `qrcode`、`pannellum`
相关测试失败。它们已经统一锁定在根 `package-lock.json`；执行：

```text
npm ci --no-audit --no-fund
```

按锁文件安装 55 个包，没有修改 `package.json` 或 lockfile。安装后结果：

```text
node --check config.js
  通过

node --check logic.js
  通过

node --test logic.test.js
  30 tests / 30 pass / 0 fail

npm test
  2291 tests / 2291 pass / 0 fail

npm run verify
  通过：58 个作品入口、1 个能力声明

git diff --check
  通过
```

本轮是非视觉核心复审，且仍没有生产页面，因此没有伪造 `file://`、DOM、键盘、
触控、响应式或跨平台 glyph 的浏览器验收结果。

## 8. 提交序列

| 提交 | 内容 |
|---|---|
| `5a95187` | 多 glyph 红灯测试 |
| `d2f32a4` | 拒绝多 glyph |
| `296011d` | 非 Emoji 红灯测试 |
| `3ca4287` | 强制 Emoji 呈现合同 |
| `d154b87` | action 快照竞态红灯测试 |
| `fb3ecad` | action 单次 descriptor 快照 |
| `57a2f2a` | 答案位置偏斜红灯测试 |
| `665395e` | 确定性配平答案位置 |
| `226693f` | 补齐 13 个一手来源 |
| `620410b` | glyph bug 记录 |
| `14e1213` | action snapshot bug 记录 |
| `eef8004` | 答案位置 bug 记录 |
| `f7a96f2` | 内容不变量 learn |

本报告另作独立提交。每次提交前均执行：

```text
git branch --show-current && git rev-parse --show-toplevel
```

确认目标分支和 worktree 一致。

## 9. 变更边界与下一门

相对基线，变更仅包含：

```text
experiences/versus/four-symbol-film-duel/config.js
experiences/versus/four-symbol-film-duel/logic.js
experiences/versus/four-symbol-film-duel/logic.test.js
experiences/versus/four-symbol-film-duel/ATTRIBUTION.md
bugs/four-symbol-film-duel-*.md
learn/2026-07-25-content-invariants-beyond-counts.md
docs/361-emoji-movie-duel-core-verification.md
```

没有修改共享依赖声明、根入口、launcher、catalog、Board、其他作品或生产 UI。

下一 Gate 仍是用户确认视觉方案后再实现生产页面，并完成真实 `file://`、
Chrome / Safari、DOM 隐私、可访问性、键盘、触控、缩放、跨平台字形和双人盲测。
