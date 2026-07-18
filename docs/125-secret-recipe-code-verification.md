# “藏好这一味”验收记录

验收日期：2026-07-19。

## 结论

V09“秘密配方猜码”已实现为 A 级同机热座对抗作品“藏好这一味”，入口为 [`../experiences/versus/secret-recipe-code/index.html`](../experiences/versus/secret-recipe-code/index.html)。作品不需要安装、构建、服务器、账号或网络；两人轮流藏好四格配方，最多猜七次，交换角色后以更少的破译次数获胜。

本轮通过：

- 22 / 22 条 V09 逻辑测试；
- 69 / 69 条目录定向测试；
- 1185 / 1185 条全仓测试；
- 46 个作品入口、1 个能力声明的仓库验收；
- 1280×800 完整双轮生产实玩；
- 390×844 与 320×700 响应式、主动作和横向溢出检查；
- 设置遮盖、设备交接、猜测与换轮的秘密 DOM 边界；
- 三组冻结概念图与实际截图的最终并排视觉检查；
- 固定开源版本、许可证、权利主体、商业商标边界与零复制声明检查。

## 作品合同

| 项目 | 验收结果 |
| --- | --- |
| 分类 | 双人对抗 / 单设备轮流 |
| 启动等级 | A，经典脚本与相对路径 |
| 运行依赖 | 无 |
| 联网、账号、存储 | 无 |
| 序列 | 四格，六种配料 |
| 秘密合法性 | 同一种最多两格，至少三种不同配料 |
| 猜测 | 可自由重复，最多七次 |
| 反馈 | 先计算“同位”，再消费剩余频数计算“有料” |
| 失败分 | 七次未解记 8 |
| 比赛 | 两轮交换角色，分数较低者获胜，同分为平局 |
| 隐私 | 面对面遮挡与阶段 DOM 隔离，不宣称密码学加密 |
| 个性化 | `config.js` 可改名字、配料文案和 `composeMatchNote(summary)` 结语 |

## 逻辑与确定性

定向运行：

```text
node --test experiences/versus/secret-recipe-code/logic.test.js
tests 22, pass 22, fail 0
```

覆盖边界包括：

- 常量、默认配置、状态与公共导出的递归冻结；
- 初始状态精确形状、JSON 往返与引用断开；
- 全同位、全错位、零命中、交叉重复和多余重复；
- 秘密四格、最多两份和至少三种的边界；
- covered、handoff 与 guessing 的严格公开投影；
- action 精确字段、getter、Symbol、污染原型、非法枚举和错误阶段；
- 七次失败记 8、第七次成功记 7、两种平局和双方对称获胜；
- 本轮结果才揭晓秘密，推进后只保留已经公开的结果；
- 结语策略只接收冻结摘要，异常与越界返回安全回退；
- 40-action 黄金回放稳定得到 2–3，玩家 0 获胜。

重复元素示例：

```text
秘密：红莓 红莓 薄荷 蜂蜜
猜测：红莓 薄荷 红莓 海盐
反馈：同位 1，有料 2
```

第三个剩余猜测不会再次消费已经匹配的红莓；`exact + misplaced` 不会超过四格。

## A 级本地直开 Gate

对生产入口的静态检查得到：

```json
{
  "classic": true,
  "relativeScripts": ["./config.js", "./logic.js", "./app.js"],
  "externalLoads": false,
  "networkApis": false,
  "sharedPath": false
}
```

进一步确认：

- `index.html` 没有 `type="module"`；
- 所有运行脚本、样式、favicon 与背景均为当前目录相对路径；
- 没有 `fetch`、XHR、WebSocket、Worker、Service Worker、浏览器存储、媒体、传感器或音频 API；
- 没有仓库 `shared/` 运行时依赖；
- 页面唯一生产位图为 `assets/apothecary-table.jpg`，经典脚本失败时有可读的加载错误；
- `README.md` 明确承诺双击 `index.html`，统一目录也把它登记为 A 级。

Codex in-app browser 出于工具安全策略拒绝导航到 `file://`，因此本记录不把 localhost 动态实玩冒充真实 file 导航。直接打开能力由上述经典脚本/相对资源静态 Gate 与目录契约证明；动态实玩使用 `http://127.0.0.1:4173` 加载完全相同的静态文件，没有构建或服务端改写。

## 真实浏览器生产实玩

环境：Codex in-app Chromium，本地临时静态服务，页面无控制台 warning / error。

### 1280×800 完整双轮

1. 从开场进入设置，第一轮秘密设为“红莓、红莓、薄荷、蜂蜜”；四格显示完整，提交可用。
2. 进入 covered 后，DOM 中秘密槽和配料数据均为 0，只保留“继续设置”。
3. 提交进入 handoff，只显示“我接好了”；页面正文不含红莓，秘密槽和秘密数据仍为 0。
4. 第一轮猜测“红莓、薄荷、红莓、海盐”得到“同位 1 / 有料 2”。
5. 第二次得到“同位 2 / 有料 2”，第三次完全猜中；round-result 才揭晓第一轮秘密，成绩为 3。
6. 第二轮秘密设为“海盐、柑橘、可可、海盐”；首猜“海盐、海盐、柑橘、可可”得到“同位 1 / 有料 3”，第二次猜中，成绩为 2。
7. 总结果标题为“你 先尝到了”，成绩板为“你 2 / TA 3”，2 被黄铜色与红色下划线强调，轮次摘要为 3 / 2。
8. 点击重开后回到 intro，结果节点为 0，开始按钮为 1，焦点回到开始动作。

整个路径页面横向溢出为 0；终局焦点落在阶段标题，重开后焦点落在 `START_MATCH`。

### 390×844 与 320×700

390×844 猜测态检查：

- 页面使用完整 390px 宽度，无横向溢出；
- 深色身份栏、羊皮纸账本、四格草稿、反馈图例、3×2 配料、主动作和第一条历史均可达；
- 两格部分草稿与历史反馈同时存在时，主动作底边约 665px，仍在首屏内。

320×700 猜测态检查：

- 横向溢出为 0，最右交互元素边界约 307px；
- 配料按钮最小高度为 54px；
- 主动作底边约 658px，仍在 700px 视口内；
- 品牌图章按冻结断点隐藏，玩法名称、阶段、规则与操作继续可见。

## 秘密与 DOM 边界

秘密在设置时只存在于当前阶段草稿和内存状态；一旦盖住或提交：

- `getRecipeView()` 不返回秘密序列；
- 前端用 `replaceChildren()` 重建阶段根，不保留隐藏设置节点；
- covered、handoff 与 guessing 的秘密槽、秘密 `data-*` 与配料序列节点均为 0；
- 页面隐藏、窗口失焦与 Escape 会显式派发合法遮盖原因；重新可见不会自动揭开；
- 只有本轮 `round-result` 才创建该轮秘密节点；
- 重开清空两轮秘密、草稿、历史与比赛结语。

这能防止普通交接、页面搜索、读屏树和误用 CSS 隐藏造成的提前泄露，但不能防止主动打开开发者工具检查 JavaScript 进程内存。产品 README 已明确这一边界。

## 视觉忠实度 ledger

最终一次视觉检查使用 `view_image` 同时查看三张冻结概念和三张实际截图；临时实际截图在检查后已从 `/tmp` 删除，没有进入仓库。概念尺寸为桌面设置 1586×992、移动猜测 853×1844、桌面结果 v2 1586×992；生产背景为 1586×992。

| 检查项 | 冻结概念 | 实际页面 | 结论 |
| --- | --- | --- | --- |
| 桌面骨架 | 左 28% 深蓝身份栏、右 72%账本 | 1280×800 保持 28/72 | 一致 |
| 主题层级 | 午夜药房、胡桃木、夜蓝布、羊皮纸 | ImageGen 背景只在边缘，中央 UI 清晰 | 一致 |
| 设置主任务 | 四格秘密与六枚黄铜配料章 | 四格、六项、删除/清空/提交完整 | 一致 |
| 图标表达 | 黄铜药材章 | 代码原生 SVG、数字与中文名称 | 同语义；未切概念位图 |
| 隐私过渡 | 盖住后单一恢复/交接动作 | covered 与 handoff 独立阶段且删除秘密 DOM | 实现更严格 |
| 移动结构 | 深色顶栏、单列账本、3×2 配料 | 390px 为相同顺序和 3×2 网格 | 一致 |
| 移动首屏 | 品牌、回合、草稿、反馈、动作 | 压缩品牌高度，让主动作留在首屏 | 有意差异：可操作性优先 |
| 移动装饰 | 概念含较多药房纹理与章饰 | 实际更扁平、使用原生 SVG 与文本 | 有意差异：清晰/降级优先 |
| 历史反馈 | 每行配方与双种反馈 | 实际含序号、小图标、“同位/有料”数字 | 一致且非颜色唯一 |
| 终局比分 | 2–3，较低的 2 获胜 | 2 黄铜高亮并带红线，3 中性 | 与 v2 一致 |
| 终局摘要 | 两轮成绩与继续动作 | 两轮 3/2、专属结语、重开/回目录 | 一致 |
| 响应式下限 | 390 主概念，320 需可用 | 390 与 320 均无横向溢出，按钮 ≥48px | 达标 |
| 降级 | 背景/动画不可用仍可玩 | 纯色回退、reduced motion、forced colors | 达标 |

### 首屏文案差异

概念图偏视觉提案，只保留简短阶段提示；实际页面增加秘密合法条件、反馈解释与提交可用性提示，避免玩家因“至少三种、同种最多两份”反复试错。实际页面没有额外 eyebrow、状态 badge、导航工具条或未冻结的玩法分组。

移动概念把大字号品牌和回合信息放得更松；实际 390px 缩小品牌区，让四格、配料、主动作和历史同时可达。终局实际页面也比概念少装饰徽章，以原生文本、清晰比分和焦点顺序为准。这些是冻结规格允许的可访问性与首屏预算取舍，不改变主题、结构或交互层级。

## 可访问与降级

- 全部操作使用原生按钮，支持 Tab、Shift+Tab、Enter 与 Space；
- 数字键 `1–6` 选配料，Backspace 删除末格，Escape 遮盖或清空未提交猜测；
- 阶段切换把焦点送到标题、首个配料、恢复或开始动作；
- `aria-live` 节点身份稳定，重复渲染不制造多个播报区；
- 同位使用实心圆，有料使用旋转空心方，并同时显示文字与数字；
- `prefers-reduced-motion`、`forced-colors` 和背景加载失败不改变规则可达性；
- 320px 下配料按钮 54px，主要与辅助动作保持至少 48px。

## 借鉴、来源与零复制

完整声明见 [`../experiences/versus/secret-recipe-code/ATTRIBUTION.md`](../experiences/versus/secret-recipe-code/ATTRIBUTION.md)。已核验并固定：

- Calanthe/mastermind `688006ae2280b721e4a8289b710351dd3fd7e5ed`，MIT，Copyright 2020 Zofia Korcz；
- sztamas/mastermind `525937d2fd8a5490aed0ea3f9198d0777b1670cb`，MIT，Copyright 2015 sztamas；
- sajadhsm/mastermind `32ad16b12621abe41be95245586f8db9c8f98acf`，MIT，Copyright 2021 Sajad Hashemian；
- klomontes/js-mastermind `2cb289f390adc5571f4a2494e920e7b5e1250874`，MIT，Copyright 2014 Branko Tomic；
- BreakLock `a06fb28a3fa6072a089ca664c66a7bf08c0a3e99`，MIT，Copyright 2017 maxwellito。

这些项目只用于研究界面分层、重复元素反馈、状态可重放和移动交互，没有复制、改写、翻译、移植、打包或依赖其代码、测试、组件、页面、素材、图标、音频、规则原文或文案。

Hasbro 官方规则只用于确认公开机制与商标边界；本作不使用其商业名称、红白提示钉、黑色塑料板、包装或 trade dress。Knuth 论文只作历史与形式化背景，不实现五步算法或电脑求解器。无清晰许可证或未固定版本的候选已明确排除。

三个概念状态与生产背景均由本轮 OpenAI ImageGen 新生成，未输入第三方图片。运行时只使用生产背景；配料图标为代码原生 SVG。

## Bugs 与 Learn

已记录并修复：

- [`../bugs/2026-07-19-secret-recipe-lifecycle-event-reason.md`](../bugs/2026-07-19-secret-recipe-lifecycle-event-reason.md)：失焦事件对象误入业务 `reason`；
- [`../bugs/2026-07-19-secret-recipe-svg-namespace-offline-gate.md`](../bugs/2026-07-19-secret-recipe-svg-namespace-offline-gate.md)：标准 SVG 命名空间被协议正则误报。

可复用沉淀：

- [`../learn/2026-07-19-hot-seat-public-projection-and-multiset-feedback.md`](../learn/2026-07-19-hot-seat-public-projection-and-multiset-feedback.md)：权威状态、阶段公开投影、DOM 替换、生命周期转换与重复元素两遍反馈。

## 最终命令

```text
node --check experiences/versus/secret-recipe-code/config.js
node --check experiences/versus/secret-recipe-code/logic.js
node --check experiences/versus/secret-recipe-code/app.js
node --test experiences/versus/secret-recipe-code/logic.test.js
node --test shared/runtime/catalog.test.js
npm test
npm run verify
git diff --check
```

最终结果：所有命令通过；浏览器控制台无 warning / error；临时 HTTP 服务、浏览器会话、视口覆盖和 `/tmp` QA 截图均已清理。

