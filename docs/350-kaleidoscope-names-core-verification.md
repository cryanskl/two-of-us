# Kaleidoscope Names 非视觉核心复验

- 日期：2026-07-25
- 项目 ID：`kaleidoscope-names`
- 对外公开标题：`把名字折成光`
- 分类：`surprise`
- 等级目标：A
- worktree：`/Users/zenith/Desktop/two-of-us-worktrees/kaleidoscope-names-core-audit`
- 分支：`codex/exp-kaleidoscope-names-core-audit`
- 基线：`9ed8cc4561dfb5e412acf9c349c9f05c7bd1d5d1`
- 核心结论：**Core Go**
- 完整项目结论：**Conditional Go**

## 1. 复验结论

本轮从指定基线复核调研、脑暴、规格、实施计划、视觉提案、配置、纯逻辑、测试、
来源声明与历史缺陷，共发现并修复两个真实缺口：

1. 已冻结的外部 `state.content` 可以绕过文本规范化，并让普通属性读取落到
   hostile Proxy；
2. Pointer Events 通用链接已移动到 Level 4 草案，但文档仍把它标成 2026-06-30
   的 Level 3 Recommendation；Media Queries Level 5 日期也有转录错误。

修复后，当前非视觉核心满足：

- 准备者离线编辑配置，体验者单人完成；不存在两个实时席位；
- 折面 `4..9` 与相位 `0..23` 各有一个 exact 答案，共 144 个唯一组合；
- 两轴可任意顺序调整，命中后还必须显式 `REVEAL`；
- 2520 整数圈与 105 相位单位避免浮点累计误差；
- 同一合法配置与动作日志确定重放，不读取时间、随机、网络、存储或 DOM；
- 最终两枚名字标记与私密文案只在 `complete` 公开；
- 冻结、JSON clone、accessor、稀疏数组和 hostile Proxy 输入均 fail closed；
- 没有第三方运行时、第三方代码或第三方资产，借鉴声明明确为独立实现。

完整项目仍是 Conditional Go：`docs/314-kaleidoscope-names-design-proposal.md`
明确等待用户确认，当前没有生产 HTML、CSS 或 app，也没有真实浏览器、`file://`、
catalog 或 launcher 证据。

## 2. 范围与历史

### 2.1 已审阅文档

- `docs/259-kaleidoscope-names-research.md`
- `docs/260-kaleidoscope-names-brainstorm.md`
- `docs/261-kaleidoscope-names-spec.md`
- `docs/262-kaleidoscope-names-plan.md`
- `docs/314-kaleidoscope-names-design-proposal.md`

### 2.2 已审阅实现

```text
experiences/surprises/kaleidoscope-names/
├── ATTRIBUTION.md
├── config.js
├── logic.js
├── logic.test.js
└── package.json
```

当前目录没有 `index.html`、`app.js`、`styles.css`、README、运行时图片、字体、
音频或 vendor 文件。`package.json` 只声明 CommonJS 类型，没有 dependencies
或 devDependencies。

历史边界保持清楚：

| Commit | 内容 |
| --- | --- |
| `7abf729` | 配置、确定性纯逻辑、测试与两项已修复核心 bug |
| `76f50e9` | 纯逻辑核心进度记录 |
| `ab8665d` | docs-only 概念图与等待确认的视觉提案 |
| `1ae5259` | 视觉提案交接记录 |
| `7bb5871` | 冻结外部 content 规范化与 hostile Proxy 修复 |
| `87da050` | 固定标准版本、日期、版权/零复制边界 |

本轮没有修改共享目录、根依赖、锁文件、launcher、catalog、Board、根/分类
README 或其他体验，也没有创建生产 UI。

## 3. 产品身份与异步单人边界

本作是“准备者先配置、体验者后打开”的异步单人惊喜：

```text
准备者离线编辑 config.js
        ↓
体验者单人调整折面与相位
        ↓
两轴 exact 命中
        ↓
体验者主动揭晓两枚名字标记与私密文案
```

两枚标记代表两个人，但不是两个实时玩家，也不分别绑定键盘、设备、回合、分数
或权限。核心没有房间、同步、联网、计时、排行榜、对抗或合作席位状态，不能把它
描述成双人同玩。

## 4. 状态机、确定性与规则

冻结主路径为：

```text
intro
  → START
tuning
  → SET_FOLDS / SET_PHASE（任意顺序）
aligned
  → REVEAL
complete
  → RESTART
intro
```

规则复验确认：

- folds exact 值域为六个整数 `4..9`；
- phase exact 值域为 24 个整数 `0..23`；
- 每个 folds/phase 目标组合只有一个 aligned 选择；
- 任一轴更新后统一重算状态，不依赖输入顺序；
- aligned 只接受 `REVEAL`，complete 只接受 `RESTART`；
- 同值、旧 revision、未来 revision、额外字段和非法动作均为同引用 no-op；
- `MAX_REVISION=1000000` 处 fail closed，不溢出或复用 revision；
- pattern model 的 wedge 数、镜像交替和旋转全部由整数模型生成；
- 同一输入的模型和值视图确定一致，返回对象与嵌套结构递归冻结且断开所有权。

几何模型使用：

```text
TURN_UNITS  = 2520
PHASE_UNITS = 105
wedgeUnits  = 2520 / folds
rotation    = (phase × 105 + wedgeIndex × wedgeUnits) mod 2520
```

2520 可被 `4..9` 全部整除，因此权威状态不依赖浮点角度比较。Canvas 只会是后续
渲染消费者，不参与命中判定。

## 5. 隐私与 hostile 输入

公开视图按阶段最小化：

| 阶段 | 可公开 | 不可公开 |
| --- | --- | --- |
| intro | 公开标题、公开说明、开始动作 | target、两枚标记、最终标题、私信、署名 |
| tuning | 当前选择、轴状态、pattern model | target 数值、距离、方向提示、全部私密内容 |
| aligned | 已命中的公开选择、揭晓动作 | 两枚标记与最终文案 |
| complete | 两枚标记、最终标题、私信、署名、重来动作 | 无隐藏答案残留要求 |

`RESTART` 回到 intro 后，公开视图重新移除全部私密 sentinel。没有调试字段、距离、
“更近/更远”、目标值或预加载 DOM 合同。

### 5.1 本轮修复：冻结 content 绕过规范化

基线的 canonical 判断只检查 `Object.isFrozen(content)` 和
`Object.isFrozen(content.marks)`。调用者可以冻结字段结构合法、但仍含首尾空白、
NBSP、重复空白或非 NFC 文本的外部 content，然后让 `getPublicView()` 原样公开。
若 content 是 Proxy，普通属性读取还会触发其 `get` trap。

本轮先新增失败测试，红灯为：

```text
25 tests
24 passed
1 failed
```

修复后：

- content 与 marks 通过 property descriptor 快照读取；
- parsed normalized content 始终成为内部规则与 public view 的真值；
- 只有字段已经逐项等于规范化结果且两层均冻结时才复用原 content；
- 非规范冻结对象在下一状态转换时替换为新的规范化冻结对象；
- hostile Proxy 的普通 `get` 次数保持为 0。

对应记录：
`bugs/kaleidoscope-names-frozen-content-canonicalization.md`。

## 6. 来源、版权与借鉴声明

本作没有参考任何开源万花筒项目、示例代码、视觉作品或素材，也没有复制、修改、
链接、vendoring 或改写第三方源码。运行时第三方依赖、代码和资产均为 0。

只使用下列一手标准校准平台边界：

| 来源 | 用途 | 采用边界 |
| --- | --- | --- |
| WHATWG HTML Canvas Living Standard | Canvas transform 与 fallback | 不复制文本、示例或视觉 |
| WHATWG HTML Range state | 原生离散 range 数值合同 | 不复制控件皮肤或代码 |
| W3C Pointer Events Level 3 Recommendation（2026-06-30） | 输入边界 | 首版不实现自绘 Pointer dial |
| WCAG 2.2 与 WAI Understanding | 键盘、状态、目标尺寸、动效与闪烁 Gate | 不是运行依赖或素材来源 |
| Media Queries Level 5 Working Draft（2026-02-19） | reduced-motion 语义 | 不复制样式或示例 |

本轮确认 `https://www.w3.org/TR/pointerevents/` 已跟随到 Level 4 Working Draft，
因此把正式依据固定为
`https://www.w3.org/TR/pointerevents3/`，并把 Media Queries 日期更正为
2026-02-19。`ATTRIBUTION.md` 现已明确：

- 标准只作为链接与边界校准，不复制文本、代码或资产；
- 不再分发标准正文；
- W3C 文档保留原始版权与 W3C Software and Document License；
- 若未来参考开源项目，必须先固定 commit/tag、许可证、版权所有者、实际借鉴和
  未复制范围。

对应记录：
`bugs/kaleidoscope-names-standard-reference-drift.md`。

两张概念 PNG 仍只属于 docs：

| 文件 | 原生尺寸 | SHA-256 |
| --- | --- | --- |
| `kaleidoscope-names-desktop-tuning-concept.png` | 1537×1023 | `0aec37999626bb1b53f53ecfccf41023694c5184076daf32da9d2eba1b76b55b` |
| `kaleidoscope-names-mobile-complete-concept.png` | 852×1846 | `a82e54eafaa269cc20bfa4cd676989f63ddc452bf915d41b8d38e98ca425ab17` |

哈希与视觉提案台账一致，生产目录没有复制这两张图；未来 production motif 必须
从整数模型与数值规格重建，不能裁图、描图或采样。

## 7. 与现有作品的机制去重

对 catalog 和已安装作品 README 重新检查后，本作仍有独立规则身份：

| 已安装作品 | 既有主机制 | Kaleidoscope Names 的差异 |
| --- | --- | --- |
| `moon-phase-secret` | 月、日、月相三项私人事实校准 | 两个几何参数；不使用日期、天文模型或第三事实 |
| `star-code-unlock` | 根据三条线索选择三个独立答案 | 两个参数共同生成一个连续可预览几何状态 |
| `origami-heart` | 五道固定顺序折痕后翻面 | 两轴任意顺序，无固定步骤序列 |
| `shared-color-studio` | 双人分轴、倒计时、五张目标色笺 | 异步单人、无席位/计时，两个离散 exact 值只解一份惊喜 |
| `scratch-surprise` | 擦除 Canvas 覆盖率达到门槛 | 不保存轨迹、不读像素、不计算覆盖率 |

调研中比较的“雾窗复走轨迹”和“手摇累计角度”当前不在 catalog；本作仍明确不
记录路径、不比较轨迹、不累计旋转旅行。尚未安装的 `wish-fireworks` 与
`snow-globe-message` 是粒子/有限收集后成形；本作不做粒子文字，最终文字只由
`REVEAL` 后的 DOM 表达。

因此后续 UI 不得把核心退化为日期拨盘换皮、三题选择、固定折叠序列、同屏双人
调色、刮除覆盖率、轨迹复走或旋转计数。

## 8. 自动验证

环境准备：

```text
npm ci
55 packages installed
0 vulnerabilities
package.json / package-lock.json 未修改
```

定向验证：

```text
node --check experiences/surprises/kaleidoscope-names/config.js
node --check experiences/surprises/kaleidoscope-names/logic.js
node --test experiences/surprises/kaleidoscope-names/logic.test.js

25 tests
25 passed
0 failed
```

全仓验证：

```text
npm test

2271 tests
2271 passed
0 failed
```

```text
npm run verify

仓库验收通过：58 个作品入口（50 个 A 级直开、8 个非 A 启动器）、
1 个能力声明、资源与借鉴声明完整。
```

`experiences/catalog.json` 的 58 个入口不包含 `kaleidoscope-names`。因此全仓
verify 只能证明现有仓库未被本轮破坏，不能证明本项目已安装或可本地点开。

`git diff --check` 通过。相对指定基线的变更只包括本项目 logic/test/ATTRIBUTION、
两条本轮 bug 记录、研究来源修正和本复验文档。

## 9. 缺陷与沉淀

本轮新增两条真实缺陷记录：

- `bugs/kaleidoscope-names-frozen-content-canonicalization.md`：已在
  `7bb5871` 修复并由回归测试覆盖；
- `bugs/kaleidoscope-names-standard-reference-drift.md`：已在
  `87da050` 修复并用 W3C 一手页面复核。

既有两条记录仍准确且已修复：

- `bugs/kaleidoscope-names-function-freeze-cycle.md`；
- `bugs/kaleidoscope-names-phase-display-offset.md`。

本轮没有形成超出既有规格、计划和 bug 记录的新增通用方法，因此没有为了填充
目录而新增 `learn/`。

## 10. 未完成 Gate

在用户明确接受或修改 `docs/314-kaleidoscope-names-design-proposal.md` 前，不得
创建生产 UI。当前明确未完成：

- `index.html`、`app.js`、`styles.css`、favicon 与运行时资产；
- 项目 README、`experience.json` 和准备者配置说明；
- 原生按钮/range、Canvas/CSS fallback、焦点、live region 与 DOM 私密实现；
- reduced-motion、forced-colors、无 Canvas、无 JavaScript 和资源失败路径；
- 六档视口、200%/400% 缩放、键盘、触摸与屏幕阅读器验收；
- Chrome、真实 `file://`、console 0、network 0；
- catalog、launcher、门户、分类索引和 Board 接入。

结论：**非视觉核心已达到 Core Go；完整作品尚未安装，也尚不能宣称本地点开即用。**
