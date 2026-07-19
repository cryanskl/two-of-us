# “三枚以后，都是我们”验收记录

- 日期：2026-07-19
- 作品：`experiences/surprises/future-cookie-notes/`
- 等级：A（纯静态、零运行依赖、零网络、零存储、零音频）
- 对应规格：[132-future-cookie-notes-spec.md](./132-future-cookie-notes-spec.md)
- 视觉冻结：[133-future-cookie-notes-design.md](./133-future-cookie-notes-design.md)
- 分步计划：[134-future-cookie-notes-plan.md](./134-future-cookie-notes-plan.md)

## 1. 结论

作品已按冻结规格完成并忠实验收：三枚签可任意顺序唯一打开，阅读与最终成句始终按“什么时候 / 去哪里 / 一起做什么”的语义顺序；第三枚只进入 ready，必须明确点击“把三个以后拼起来”才公开最终邀请；重开会回到全闭合状态。

实现与概念的叙事层级、固定位置、颜色、唯一主动作和单封终局一致。生产版主动简化了概念中的蜡封、花枝和多层装饰线，以代码原生边框、字体和焦点代替；这属于有记录的稳健性取舍，不宣称像素级复刻。

## 2. 自动检查

最终执行：

```sh
node --check experiences/surprises/future-cookie-notes/app.js
node --test experiences/surprises/future-cookie-notes/logic.test.js shared/runtime/catalog.test.js
npm test
npm run verify
git diff --check
```

结果：

- 作品逻辑：36 项通过；
- 目录与静态 Gate：73 项通过；
- 全仓：1251 项通过，0 失败；
- `verify`：48 个作品、1 个能力包全部通过；
- `git diff --check`：通过。

逻辑覆盖六种打开排列、重复打开、非法 action、主动合成、重开、确定性重放、冻结引用、异常 getter、Unicode 限长和阶段 public view。目录 Gate 覆盖经典脚本、零网络/存储、入口、viewport、来源声明、生成资产与直开结构。

## 3. 浏览器方法与限制

使用 Codex 内置 Browser/IAB，在同一套生产文件上通过 `http://localhost:4173/` 实玩；浏览器页签实际执行 DOM snapshot、原生按钮 click、焦点检查、视口测量、截图、CDP 资源阻断、`prefers-reduced-motion` 和 `forced-colors` 模拟。

IAB 安全策略拒绝导航到 `file://`，因此没有绕过策略。A 级直开由以下组合证明：页面只使用相对经典脚本和本地图片，没有 module、fetch、XHR、WebSocket、存储或服务 API；目录静态 Gate 与全仓 verify 均通过；浏览器实玩使用的文件集与双击入口完全相同。

IAB 的键盘注入在原生按钮上只移动焦点，没有产生平台 click；因此不能把该工具结果写成“Enter/Space 实玩通过”。实现使用原生 `<button>`，没有阻止键盘默认行为，焦点环与焦点转移已检查；这是验收工具限制，不是额外自定义键盘逻辑。

## 4. 金牌路径与阶段隔离

指针路径实际执行：

1. 先开中间 `where`，DOM 只出现“去一条我们都没走过的街”，另外两段和最终邀请均不存在；
2. 焦点自动落到下一个未开项 `when`；
3. 再开 `when`、`together`，进入 ready；
4. ready 只有三段、`三个以后，都到齐了。` 和唯一合成按钮，最终标题、结语、署名均不在 DOM；
5. 点击合成后只有一封长信，三张收集卡从 DOM 移除，焦点落到最终 H2；
6. 最终文案顺序固定，点击“再打开一遍”回到 `0 / 3`。

状态区分别宣告初始化、单枚收好、三枚到齐和邀请拼成。UI 只消费 public view；源码中的默认配置是可读文本，因此这里的“阶段私密”只保证未到阶段不进 DOM，不声称加密。

## 5. 响应式与可访问性

| 场景 | 实测结果 |
| --- | --- |
| 1280×800 finale | `scrollWidth = clientWidth = 1280`，`scrollHeight = clientHeight = 800`；长信、重开和隐私说明均在首屏 |
| 390×844 ready | 标题单行，高 26px；合成按钮高 48px，底边 537px；无横向或纵向溢出 |
| 390×844 finale | 页面宽 390，高 844；标题单行，重开按钮底边 554px |
| 320×700 ready | `scrollWidth = clientWidth = 320`；允许文档流滚动，合成按钮底边 587px，无横向溢出 |

- 原生按钮提供可读 accessible name，打开项使用 `article`，完成标题使用 H2；
- `:focus-visible` 为 3px 高对比黄铜环，不靠颜色之外的隐藏状态；
- `prefers-reduced-motion: reduce` 下动画与 transition 均为 `0s`；
- `forced-colors` 下纸签保留 2px 系统边框，图片隐藏并显示 CSS 饼干回退；
- 阻断背景图后使用深墨蓝纯色，正文和控件仍完整；
- 阻断透明图集后 body 进入 `cookie-asset-failed`，只显示 CSS 回退；正常加载进入 `cookie-asset-ready`，只显示 sprite，不再双重渲染。

## 6. 概念、实装截图与原生尺寸

冻结概念：

- `concept-collecting-desktop.png`：1586×992；
- `concept-ready-mobile.png`：852×1846；
- `concept-finale-desktop.png`：1586×992。

最终实装：

- `qa-collecting-middle-mobile.png`：390×844，SHA-256 `8d4c3f599aadcb09027171b35d2691f3877b5fc8e072f7fa982af651e6686c2e`；
- `qa-ready-mobile.png`：390×844，SHA-256 `cb39477496d81f7da46079cdb7b2574f0bd9f36dfc1017e14d275d645b779feb`；
- `qa-finale-desktop.png`：1280×800，SHA-256 `3a2e66b1c0c53f74c3e4083d192dad5615cc60578b3cc81c820ac959d26014cc`；
- `qa-finale-mobile.png`：390×844，SHA-256 `b70dd98aa8cb4d00c2ab1abcb43040fea5627597409d79a826b0ad815c0164c4`。

同一最终 QA 轮次用 `view_image` 原尺寸查看三张概念和四张实装截图。IAB 曾把 390px 页面表面贴入 1280px 截图画布；该文件没有伪装成桌面证据，而是按真实页面尺寸命名为 mobile。桌面视觉以 1280×800 finale 原生截图和浏览器布局指标为证。

## 7. fidelity 账本

| 对照点 | 结果 | 证据 / 偏差 |
| --- | --- | --- |
| 安静标题、进度、细线横栏 | 忠实 | 桌面保留副题，移动只保留短标题和进度 |
| 三个语义位置固定 | 忠实 | 先开中间项后，左右项仍为 01 / 03；view 始终按 `NOTE_IDS` 输出 |
| 已开与未开可辨 | 忠实 | 深色闭合 button 对奶白 open article；移动版更紧凑但层级不变 |
| 唯一主动作 | 忠实 | ready 只有深红“把三个以后拼起来”，没有 badge、分享或次主按钮 |
| finale 单封长信 | 忠实 | 收集卡移除，三条边注在同一纸面；生产版更紧凑、左对齐 |
| 深墨蓝 / 奶白 / 深红 / 黄铜 | 忠实 | 未引入粉色渐变、赛博黑或背景染色层 |
| 宋体标题 + 易读正文 | 忠实 | 使用冻结的系统字体栈，390px 无标题孤字 |
| 饼干不承载文字或热区 | 忠实 | sprite 纯装饰，序号、文案、按钮和状态均为原生 DOM |
| 资产故障回退 | 忠实 | 正常与失败 class 互斥，背景/图集阻断后规则仍完整 |
| 动效与 reduced motion | 忠实 | 短过渡不改变 reducer；降低动效时为 0s |
| 焦点与阶段转移 | 忠实 | 点击后到下一未开项，ready 到 assemble，finale 到 H2 |
| 概念中的文字误差 | 已纠正 | 生产为“下一个不赶时间的周末”和“—— 一直想和你去的人” |

主要视觉偏差：没有复刻概念的植物蜡封、花枝、外缘碎屑和多层装饰；完成信在 1280×800 使用更紧凑的左对齐排版，以保证整封邀请首屏可读。开放 sprite 自带空白纸条，但不承载文字或交互。这些偏差不改变机制、阅读顺序或视觉系统。

## 8. 上首屏文案 diff

- collecting：只出现标题、副题（桌面）、进度、开场、三个公开标签、未开动作、已打开正文/“这一枚，收好了”和本机说明；无 eyebrow、英文副标、badge、时间、随机提示或分享；
- ready：只增量出现 `三个以后，都到齐了。` 与 `把三个以后拼起来`；最终邀请仍不存在；
- finale：精确出现冻结的标题、连续邀请、三条语义边注、`只要你愿意，我们就挑一天出发。`、署名与 `再打开一遍`；没有额外统计、庆祝文案或下载入口。

## 9. 借鉴与问题沉淀

`ATTRIBUTION.md` 固定两个 MIT 候选的项目、许可证、作者/权利主体和机制借鉴边界，并记录一个因元数据不一致而排除的候选。生产实现没有复制候选代码、HTML、CSS、图片、字体、音乐或文案；背景与图集由 ImageGen 文本生成，处理命令、alpha 统计和哈希在视觉文档中可追溯。

本项目实际复现并记录了 public view 开场缺口、来源标题机器合同、390px 标题孤字、1280×800 终局溢出和 sprite/CSS 回退双重渲染。可复用结论沉淀在 [自由探索与确定成句：顺序分层和 public view 对账](../learn/2026-07-19-exploration-semantic-order-and-public-view.md)。

## 10. 发布判断

在上述 IAB `file://` 与键盘注入限制如实保留的前提下，作品达到规格、A 级静态 Gate、浏览器指针流程、阶段 DOM、响应式、资源降级、视觉 fidelity、来源声明和 bugs/learn 的发布标准，可从仓库门户或作品 `index.html` 本地点开使用。
