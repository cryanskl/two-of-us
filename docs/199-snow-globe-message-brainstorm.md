# “雪球留言”实现前脑暴：让规则、隐私与焦点先对齐

日期：2026-07-21

对应调研：[181-snow-globe-message-research.md](./181-snow-globe-message-research.md)

对应规格：[182-snow-globe-message-spec.md](./182-snow-globe-message-spec.md)

目标目录：`experiences/surprises/snow-globe-message/`

## 1. 为什么需要这次脑暴

这是一个跨逻辑、Pointer、Canvas、隐私 DOM、焦点和来源声明的非平凡新功能。既有调研已经证明它能做成 A 级 file 直开作品，规格也冻结了 reducer、点阵和 settling token；实现前仍有几处跨层歧义必须先消掉，否则每一层都可能“各自合理、组合错误”。

本轮只对齐决策和规格，不创建生产目录、不生成视觉资产，也不把后续视觉与代码混进同一提交。

## 2. 作品名与公开标题

有两个可行方向：

- A：所有阶段都叫“雪停以后，是你”。记忆点强，但 complete 前已经泄露默认私密结果标题；
- B：作品名和默认 `finalTitle` 为“雪停以后，是你”，页面固定公开 H1 为“等雪停下”。

采用 B。公开标题只描述动作期待；私密标题只在 complete 的结果子树创建。这样既保留作品名，也让“最后才出现一句话”成为真实的信息边界。

## 3. 进度文案归谁

如果页面根据 `collectedCount` 和 `missingLabels` 自行拼文案，public view 就不再是唯一规则来源，空集合、顺序和标点也会在 UI 形成第二套业务逻辑。

采用：`getPublicView` 直接提供冻结的 `progressText`，并让它成为唯一主状态文案。intro、16 个风集合子集、armed、settling 和 complete 都有精确答案；页面只写入 textContent。只有 helper null/throw 时，app-local 准备失败提示可以在同一节点覆盖 intro 文案。

## 4. 私密结果的唯一结构

complete 才创建五个结果节点，顺序固定为：图案说明、称呼、标题、私信、署名。每个配置字段只进入一个节点；称呼和署名使用固定前缀；私信只用 `white-space:pre-line` 表达 LF。

既有雪球舞台只在 complete 时以 `role=img` 关联可见的 patternLabel；它不进入精确五节点的结果 section，Canvas/CSS grid 只是 `aria-hidden` 表现层。离开 complete 时移除舞台 role/关联与整棵结果子树。这个结构同时解决隐私扫描、屏幕阅读器重复、焦点目标和浏览器测试定位问题。

## 5. 主动作与焦点顺序

采用一个 persistent 主按钮承载“重新准备 / 让雪落下 / 正在落下… / 再看一次”。它位于结果子树之后：complete 聚焦结果标题后，下一次 Tab 自然到达“再看一次”。

焦点副作用分两类：

- 用户仍在可见、聚焦的页面中等待结果：首次有效完成聚焦结果标题；
- hidden、pagehide 或 blur 为避免动画悬挂而收尾：只完成状态，不移动焦点，返回页面后也不补移。

reducer 结果可以共享，交互副作用必须由完成来源明确传入。

## 6. 浏览器准备流程

采用单一 `attemptPrepare()`：首次 paint 前、准备失败重试和 complete 后重播都走同一路径。非法用户配置由纯逻辑 helper 整份回默认；helper null/throw 才是浏览器准备失败。

失败只显示固定、安全、可重试的公开提示，不输出异常或私密配置。app-local guard 阻止重入；成功进入 gathering 并把焦点放到第一个方向按钮。失败标记不进入 reducer、view、storage 或 action log。

## 7. Pointer 会话边界

只在 `canAddWind=true` 且没有活动会话时接受 pointerdown。验证坐标和尺寸并成功 capture 后才保存会话；capture 失败不留下半会话。

app 使用单调 generation 使旧事件失效。准备、restart、离开 gathering、blur、pagehide 和清理都会推进 generation；render 离开 gathering 时安全 release。`touch-action:none` 也只在可收风阶段启用，其他阶段不妨碍页面滚动。

四个原生按钮始终是无需拖动的完整替代，不注册设备动作或申请传感器权限。

## 8. 72 枚表现雪点与点阵目标

开局固定绘制 72 枚表现雪点，和配置图案的 16–72 个 active targets 无关。settling 后前 N 枚归位 N 个目标，其余落到底部。

这样可以同时满足：

- 开局不能通过粒子数量猜出图案；
- 配置点数不改变规则状态；
- Canvas 失败和 reduced-motion 可以直接切到同一静态目标；
- 动画帧率、位置和像素永远不参与业务判定。

## 9. 为什么首版不用“摇一摇”传感器

设备动作会引入 secure context、权限、设备差异、隐私与额外替代控件，和 A 级双击直开的核心承诺冲突。首版的“摇”是可见的四方向拖动比喻，并有四个按钮等价完成；不注册 Device Orientation/Motion。

## 10. 来源与借鉴声明

声明分两层：

- README：每个固定开源项目的来源、commit、许可证、借鉴摘要与零运行依赖声明；另列 Pointer Events 与相关 WCAG 页面作为标准校准；
- `assets/ATTRIBUTION.md`：完整展开许可证、版权主体、实际借鉴抽象与明确未复制范围。

标准校准页必须注明它们不是运行依赖、代码或素材来源。

生产代码、点阵、UI、文案与图形原创实现，零第三方运行依赖。视觉概念若使用 ImageGen，另记录提示词、日期、尺寸、格式、SHA-256 与第三方输入。

## 11. 视觉阶段必须覆盖的状态

下一阶段的视觉简报至少要生成并比较：

- 桌面 gathering、armed、settling、complete；
- 390px 移动端完整布局；
- 320px 准备失败/重试；
- reduced-motion、forced-colors 和无 Canvas 降级。

在概念图获得用户确认前，不进入生产 UI 代码。

## 12. 用户可贡献点

脚手架完成后，最适合邀请用户亲手改的是 `config.js` 的 9 行 `patternRows`：每行 11 个 `.` / `#`，共 9 行，active 数 16–72。它可以画首字母、月亮、星星或两人的符号。

现在还没有脚手架，因此本轮不让用户提前写一份无法立即验证的点阵；等配置文件和即时校验都存在后，再邀请贡献这 9 行。

## 13. 冻结结论

进入视觉与实现计划阶段时，以下决策视为冻结：

1. 公开 H1“等雪停下”，作品名/默认私密标题“雪停以后，是你”；
2. public view 直接提供 progressText；
3. complete-only 五节点结果子树与唯一标题焦点；
4. persistent 主按钮，结果在按钮前；
5. 前台完成可聚焦，后台生命周期收尾不聚焦；
6. 单一 attemptPrepare 与 app-local 安全失败；
7. gathering-only Pointer capture、generation 失效与按钮替代；
8. 固定 72 表现雪点，规则目标仍为 16–72；
9. 首版零传感器、零网络、零第三方运行依赖；
10. 开源借鉴与标准校准分层声明。

下一份文档应是视觉简报和端到端实施计划；生产代码仍需等待视觉方向被用户接受。
