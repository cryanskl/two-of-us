# “绕词对决”非视觉核心复验

- 日期：2026-07-25
- 项目 ID：`word-detour-duel`
- 对外标题：`绕词对决`
- 分类：`versus`
- 等级目标：A（真实 `file://` 直开）
- worktree：`/Users/zenith/Desktop/two-of-us-worktrees/word-detour-duel-core-audit`
- 分支：`codex/exp-word-detour-duel-core-audit`
- 基线：`ba7c0ce8feec43860b53e1cafbb6902156bfb520`
- 核心结论：**Core Go**
- 完整项目结论：**Conditional Go**

## 1. 复验结论

本轮从指定基线重新通读调研、脑暴、规格、计划、内容审计、视觉提案和现有核心，
并独立检查 72 张卡、三套 schedule、公开视图、热座秘密边界、终局派生、来源和
相邻机制。复验发现并修复四组真实缺口：

1. 第六张结束后，公开进度可能显示 `7 / 6`，交接、打断和回合结束阶段也会残留
   卡序号；
2. 公共 `deriveMatchResult` 会接受空的完成回合、满六张超时、跨回合重复卡和
   未知/不属于 schedule 的卡；
3. `daily-04` 的禁用提示“钥匙圈”包含目标“钥匙”，同一 hand 又有两个“纸张”；
4. 借鉴声明遗漏实际研究来源，内容审计也缺少逐卡、双角色的 72 行证据。

修复后，当前非视觉核心满足：

- 72 张卡精确组成 `6 主题 × 3 难度 × 4 张`；
- 三套固定 schedule 共 `3 × 4 × 6 = 72` 个位置，全部卡恰好出现一次；
- 卡库、schedule、状态机、计时、回合复核和终局结果均确定且可重放；
- 公开视图仅在 `card-ready / describing` 暴露当前卡和卡序号；
- 终局派生只接受能对应冻结 schedule 前缀的四个合法确认回合；
- 13 个研究来源已完整写入借鉴声明，代码、题库和素材保持零复制。

完整项目仍是 Conditional Go：视觉提案尚待用户确认，当前没有生产页面、浏览器
验收、catalog 或启动入口，不能宣称已经本地点开即玩。

## 2. 审阅范围

### 2.1 前置文档

- `docs/263-taboo-description-duel-research.md`
- `docs/264-taboo-description-duel-brainstorm.md`
- `docs/265-taboo-description-duel-spec.md`
- `docs/266-taboo-description-duel-plan.md`
- `docs/275-word-detour-duel-content-audit.md`
- `docs/316-word-detour-duel-design-proposal.md`

调研中早期提出的“每回合 8 张”只是历史候选，已明确由冻结规格和当前配置的
“每回合最多 6 张”替代。

### 2.2 当前实现

```text
experiences/versus/word-detour-duel/
├── ATTRIBUTION.md
├── config.js
├── logic.js
├── logic.test.js
└── package.json
```

本轮没有创建或修改生产 UI、共享运行时、根依赖、lockfile、launcher、catalog、
Board、根 README 或分类 README。

## 3. 状态、隐私与终局合同

冻结阶段为：

```text
intro
→ setup
→ handoff
→ card-ready
→ describing
↔ interrupted
→ turn-ended
→ turn-review
→ handoff / match-result
```

复验确认：

- `handoff / interrupted / turn-ended` 的 `phaseData` 和卡进度都不包含秘密卡线索；
- `card-ready / describing` 只显示当前卡，进度范围保持 `1..6 / 6`；
- `turn-review` 只公开刚结束回合实际出现过的卡；
- `match-result` 只公开得分、胜负和回合摘要，不重新公开题目；
- 未来卡、完整 schedule、难度和未出现卡不进入公开视图；
- 状态、配置、公开视图和嵌套数组均断开引用并冻结；
- reducer 使用配置实例派生结果，自定义合法配置不会错误回落到默认卡 ID。

`deriveMatchResult` 的四回合输入现在还必须同时满足：

- `turnIndex`、描述席位和回合顺序正确；
- `cards-complete` 恰好六张；
- `time-expired` 少于六张；
- 四回合内 card ID 不重复；
- 全部回合共同匹配至少一套冻结 schedule 的逐回合前缀；
- outcome 和 finish reason 均来自冻结枚举。

因此，公共 helper 不再把独立看似合法、整体不可达的日志计算成正式胜负。

## 4. 内容与公平

自动结构检查结果：

```json
{
  "cards": 72,
  "scheduled": 72,
  "unique": 72,
  "corpus": true,
  "schedules": true,
  "duplicateHands": [],
  "contained": []
}
```

固定分布为：

- 每主题 12 张；
- 每难度 24 张；
- 每个主题×难度 4 张；
- 每卡四个禁用提示；
- 每 hand 六主题各一、难度 1/2/3 各二；
- 每 hand 的 24 个禁用提示规范化后 exact 唯一；
- target 与同卡 forbidden 不相等，也不互为完整子串；
- 每套 schedule 中两席各描述 12 张，每主题各二、每难度各四。

本轮修正：

- `daily-04`：`钥匙圈` → `随身`；
- `action-09`：`纸张` → `翻折`。

[`275-word-detour-duel-content-audit.md`](./275-word-detour-duel-content-audit.md)
已给出 72 行逐卡证据。A 角色检查内容、来源、权利、敏感、中立、时效和基本
可绕开性；B 角色检查 validator、schedule、冲突、包含、重复和确定性。

“原创”是仓库作者的来源声明，不是“常用词从未在互联网上同时出现”的法证结论。
本轮未发现第三方题库、代码或素材进入项目，也不把这项审计冒充法律意见或全网
相似度检索。

## 5. 来源、借鉴与许可证

2026-07-25 复核了借鉴声明中的 13 个一手页面，范围包括：

- Hasbro 官方产品页、成人版产品页与 Virtual Rules PDF；
- USPTO 的商标基础说明；
- U.S. Copyright Office 的 Games 页面与 Circular 33；
- Web Speech API；
- WCAG Keyboard、Timing Adjustable、Focus Visible、Status Messages；
- W3C `prefers-reduced-motion` 技术；
- WHATWG Page Visibility。

研究文档与 `ATTRIBUTION.md` 的 URL 集合一致：

```json
{"research":13,"attribution":13,"missing":[]}
```

实际只借鉴“目标词 + 一组禁用提示 + 口头描述 + 猜词”的抽象机制，以及商标、
版权、无障碍和页面生命周期边界。没有复制或改写商业规则文字、示例、题卡、
卡面布局、品牌、蜂鸣器、视觉、音效、包装、源码或素材。

本项目没有参考或引入第三方开源实现、代码、素材、字体、图片、图标、音频、
视频或运行依赖，因此不存在需要固定 commit/tag 的外部开源对象，第三方软件
许可证固定项为“不适用”。如果后续查看任何开源实现，必须先固定 commit/tag，
核对 LICENSE、版权主体和资源许可证，再补实际借鉴与未复制范围。

仓库根 README 同时明确：仓库暂未声明统一许可证，不能据此推定其中所有内容都
允许再分发。该事实不阻止本地私人使用，但对后续公开再分发仍是独立 Gate。

## 6. 机制去重

仓库验收当前统计 58 个已安装入口。最接近的两个作品仍没有覆盖本作的组合：

| 相邻作品 | 已有主机制 | 与绕词对决的边界 |
| --- | --- | --- |
| `hot-seat-pictionary` | 单设备交接、秘密词、自由绘画、共同累计分 | 本作不绘画；每张有四个禁用提示；双方比较各自描述净分 |
| `four-symbol-film-duel` | 四个 Unicode 符号表达片名、盲猜影视题库、对抗计分 | 本作是自由口头描述和禁词限制；没有影视答案、符号字形或四符号组合 |

`word-detour-duel` 的不可替换核心仍是：热座秘密交接、每张一个目标与四个禁用
提示、描述者自记 `+1 / -1 / 0`、回合后共同复核、两席各描述两回合并比较净分。
本轮未扩展玩法。

## 7. 自动验证

### 7.1 定向测试

```sh
node --test experiences/versus/word-detour-duel/logic.test.js
```

结果：

```text
tests 19
pass 19
fail 0
```

覆盖卡库与 schedule、敌对配置、计时与中断、全部阶段、秘密投影、进度边界、
合法完整日志、自定义配置、不可达日志拒绝、重放和完成/重启。

### 7.2 全仓回归

新 worktree 初始没有 `node_modules`，第一次回归因既有 `qrcode` 等根依赖未安装
而失败；这不是产品逻辑失败。按现有 `package.json` 和 lockfile 执行
`npm install --no-audit --no-fund`，安装 55 个 package，且没有修改
`package.json` 或 `package-lock.json`。

```sh
npm test
```

结果：

```text
tests 2273
pass 2273
fail 0
cancelled 0
skipped 0
todo 0
```

```sh
npm run verify
```

结果：

```text
仓库验收通过：58 个作品入口（50 个 A 级直开、8 个非 A 启动器）、
1 个能力声明、资源与借鉴声明完整。
```

58 个入口不包含 `word-detour-duel`，不能据此推导本项目已经安装。

### 7.3 当前证据哈希

| 文件 | SHA-256 |
| --- | --- |
| `config.js` | `49d3c440e0a33f5b0102f9a9d53fd9470d9ea0f09a6157c64c5ce685d0b8acb6` |
| `logic.js` | `0882afbf9f50e2ee70d900651768bf1fd3f45434c71807b8648b64e04d511319` |
| `logic.test.js` | `072b62fabfe3e38083e0482e79c27f3896595fdcf92d906cb5e7bae38afa1246` |
| `ATTRIBUTION.md` | `59122a8b19c60ff363da338e6134aaeab85e5d05b26c5512c8c8f10f89634236` |
| `275-word-detour-duel-content-audit.md` | `20efbb23a8d896b38491152638a5a4737fbc816ee6ab5e95aa5dd7f50a453896` |

## 8. bug 与 learn

本轮四项真实问题分别记录在：

- `bugs/2026-07-25-word-detour-duel-completed-progress.md`
- `bugs/2026-07-25-word-detour-duel-impossible-match-result.md`
- `bugs/2026-07-25-word-detour-duel-content-gates.md`
- `bugs/2026-07-25-word-detour-duel-attribution-coverage.md`

可跨项目复用的“内部 cursor 与公开序号分离”原则记录在：

- `learn/2026-07-25-cursor-sentinel-public-ordinal.md`

依赖未安装属于新 worktree 环境准备，不是稳定产品缺陷，所以没有制造额外 bug
记录。

## 9. 未完成 Gate

本文件只证明非视觉核心。以下仍未完成：

- 用户尚未明确接受 `docs/316-word-detour-duel-design-proposal.md`；
- 没有生产 `index.html`、`styles.css`、`app.js`、favicon 或运行时资产；
- 没有真实 DOM 秘密卸载、键盘/Pointer、计时、焦点、live region、暂停与恢复；
- 没有六档视口、200%/400%、reduced-motion、forced-colors、无 JavaScript、
  资源阻断或移动触摸验收；
- 没有 Chrome、真实 `file://`、console 0 和 network 0 证据；
- 没有 README、experience manifest、catalog、launcher、门户或分类索引登记。

因此结论保持：**非视觉核心可继续进入生产阶段；完整作品尚未安装，也尚不能
本地点开即玩。**
