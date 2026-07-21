# “心愿烟火”实现前脑暴：让三束光有唯一页面合同

- 日期：2026-07-21
- 对应调研：[183-wish-fireworks-research.md](./183-wish-fireworks-research.md)
- 对应规格：[184-wish-fireworks-spec.md](./184-wish-fireworks-spec.md)
- 目标目录：`experiences/surprises/wish-fireworks/`
- 状态：规则与浏览器合同已对齐；视觉概念仍等待统一图像偏好

## 1. 为什么再做一次脑暴

现有调研和规格已经解决了最难的纯逻辑问题：三份 9×9 点阵、canonical hash、五档蓄力量化、整数表现帧、revision headroom、Pointer candidate、跨设备 click 墓碑、token 化完成与隐私 sentinel 都有可执行答案。

剩余风险集中在浏览器页面层：如果 public view 不拥有动态文案、START 失败没有统一入口、结果 DOM 没有唯一形状、后台完成焦点可以迟到抢占，那么逻辑测试全绿仍不能保证页面行为一致。

本轮只补齐这些跨层合同，不创建生产目录、不生成视觉资产，也不改变“三束必成字、蓄力只决定高度”的产品核心。

## 2. 公开标题与私密标题

作品名继续使用“把愿望，放到夜空里”；页面固定公开 H1 为“今晚，点三束光”；默认 `finalTitle`“这三束光，都想送给你”只在 complete 结果子树创建。

三个层级承担不同职责：作品名用于仓库识别，公开 H1 描述玩法，私密标题承担最终揭晓。任何阶段都不能为了视觉一致而提前复用 `finalTitle`。

## 3. 唯一动态状态文案

采用 `getPublicView().progressText`，覆盖：

- intro：`还没点亮第一束。`
- ready0：`准备点燃第 1 / 3 束。`
- ready1：`第 1 束已经留下；准备第 2 / 3 束。`
- ready2：`前两束已经留下；准备第 3 / 3 束。`
- bursting0/1/2：`第 n / 3 束正在升空。`
- complete：`三束光都留在夜空里。`

页面只写入该字符串，不根据 phase/count 维护第二套主状态。准备 helper null/throw 的固定失败提示是唯一 app-local 覆盖。

## 4. 开始、失败与重播

采用一个 persistent 主动作按钮和一个 `attemptStart({focusOnSuccess})`：

- 首次 intro：`开始点光`；用户主动点击才 START；
- helper 合法：同步进入 ready；
- helper null/throw：留在 intro，显示 `暂时没准备好，请重新准备。` 与 `重新准备`；
- complete：按钮为 `再看一次`，同 click 先 RESTART，再走同一个 attemptStart；
- 重播准备成功直接回 ready 并聚焦 `按住蓄光`，失败回 intro 继续重试。

非法用户配置由 helper 整份回默认，不被误报为浏览器故障。guard、失败标记和异常都只属于 app；异常与私密配置不进入页面或 console。

## 5. 页面与结果 DOM

main 顺序冻结为：页头、固定说明、夜空舞台、已公开三字列、进度、发射控制、完成结果、主动作、固定隐私说明、live。

已公开三字列是 persistent ordered list，只为 public view 已公开前缀创建节点。它同时是视觉三字列与结果标题的可访问说明来源；未来 label 不以 hidden/template 预置。

complete-only 结果严格五节点：patternLabel、带“给 ”前缀的 recipient、可聚焦 h2、保留 LF 的 finalNote、带“——”前缀的 sender。每个配置字段只有一个落点；restart 移除整棵结果树。

结果在 `再看一次` 前，因此结果标题获得焦点后，下一次 Tab 能自然到达重播按钮。

## 6. 发射控制的持久节点

发射控制由 `烟火高度` select、`按住蓄光`、`直接点燃` 与固定保证提示组成：

- intro/complete：整组隐藏；
- ready：全部可操作；
- bursting：select 仍可预选下一束，两按钮保持原节点和 tabindex，但 `aria-disabled=true` 并由 guard 拒绝；
- reduced-motion：两个按钮都用 select，不建立 holding；
- `touch-action:none` 只在 normal-motion + ready 且能建立 holding 时启用。

这样持久节点可以保留焦点和事件身份，又不会让 reduced、bursting 或 complete 阶段无故阻止页面滚动。

## 7. 后台完成焦点

前台第三束完成立即聚焦结果标题。hidden、window blur 或 pagehide 只记录 `{burstToken, launcher}`，绝不当场聚焦。

window focus、visibilitychange(visible) 与 BFCache `pageshow` 共用同一个 flush。首次恢复 visible+focused 时必须原子取出并清除 pending：当前 view 为 complete、`view.revision === burstToken + 1` 且 activeElement 仍为 body/原 launcher 才聚焦；如果 token 失配或用户已经把焦点移到别处，就永久放弃。这是一次性机会，不让 pending 在以后某次事件中迟到或重复抢占。

`再看一次` 在 RESTART 前清 pending，避免旧 token 撞入新一轮。

## 8. 固定隐私说明与无 JavaScript

固定公开隐私说明为：

> 内容写在本地文件里；页面不上传、不另存，愿望会在最后一束落定后出现。

它明确了磁盘明文、零上传、零额外存储和阶段揭晓，但不冒充加密。

无 JavaScript 只显示五项：公开 H1、固定说明、无语义静态夜空轮廓、`请开启 JavaScript 后再点燃三束光`、固定隐私说明。交互区由默认 HTML/CSS 隐藏，app 成功初始化后才启用；无 JS 不显示三字、束数、按钮、结果或任何已解锁暗示。

## 9. 固定数据与来源复核

本轮机器复算确认：

- active count：`30 / 29 / 31`；
- 三份 rows SHA、glyphs SHA、完整 config SHA 全部匹配 184；
- 三字 band 2 合并 target SHA 为 `cbac1979ddab2aab39ec30e91d5a77bc8e87bbb2e8d23f35844ad36815c50e8a`；
- 三份 target 首尾坐标与独立 SHA 全部匹配。

固定来源仍可访问：Fireworks.js 的 MIT/版权、W3C Pointer Events 固定提交与许可证、canvas-text-particle/canvas-confetti 的 ISC，以及 WCAG 2.1.1、2.5.2、2.3.1、2.3.3 原始约束。

生产实现继续零第三方运行依赖，不复制参考源码、公式、API、UI 或素材。README 与 ATTRIBUTION 都必须列来源摘要；ATTRIBUTION 负责完整版权、借鉴与未复制边界。

## 10. 测试增量

除既有逻辑与 Pointer 矩阵外，浏览器必须增加：

1. progressText 全阶段精确值；
2. START、默认回退、helper null/throw、重试和 guard；
3. replay 的 RESTART→attemptStart 单路径；
4. main 顺序、三字列、发射控制与 complete 五节点结构；
5. 每个私密字段唯一落点、LF 与 aria-describedby；
6. foreground、hidden、blur、pagehide→pageshow、token 失配与用户移焦后的 pending 消费；
7. touch-action 仅 normal-ready 生效；
8. 无 JavaScript 五项静态内容与交互/结果 absence。

## 11. 用户贡献点

实现脚手架完成后，最适合用户亲手修改的是 `config.js` 中任意一个 glyph 的九行 `patternRows`。它会真实决定某一束烟火形成的字，是有意义的内容创作；状态机、Pointer、隐私和错误处理不应转嫁给用户。

现在还没有可运行脚手架和即时测试，因此本轮不提前邀请用户填写九行。等核心逻辑提交后，再准备 5–10 行明确 TODO 与测试命令。

## 12. 冻结结论

进入视觉与实现阶段时，以下视为冻结：

1. 作品名、公开 H1、默认私密标题分层；
2. progressText 是唯一动态主状态；
3. persistent 主动作与单一 attemptStart；
4. replay 同 click 执行 RESTART→attemptStart；
5. persistent 三字列/发射控制与 complete-only 五节点结果；
6. 前台聚焦、后台一次性 pending、用户移焦即放弃；
7. touch-action 仅 normal-ready holding；
8. 固定隐私说明与无 JS 五项静态内容；
9. canonical 数据不变、来源仍为研究抽象、零复制和零运行依赖；
10. 生产 UI 继续等待 ImageGen 偏好、完整概念与用户确认。

本候选下一步不是直接写页面：先等待统一图像偏好，生成完整状态概念并确认；确认后再编写端到端实施计划和生产代码。
