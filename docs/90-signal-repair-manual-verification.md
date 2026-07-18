# “把信号接回来”验收记录

- 日期：2026-07-18
- 作品：[`../experiences/co-op/signal-repair-manual/`](../experiences/co-op/signal-repair-manual/)
- 等级：A，本地经典脚本，无安装依赖、账户、存储或公网请求
- 玩法：两人面对面分持星路与优先规则，四轮交换角色，口述判断首个唯一分支

## 1. 结论

作品通过生产逻辑、目录、仓库、localhost 实玩、焦点、暂停、超时、响应式与视觉忠实度验收：

- 12 张原创题全部能由同一规则 token 系统推出首个唯一解；
- 四轮实玩按南/北/南/北交换操作员，四段传输完整拼合；
- 1504×1046 页面无横向或纵向滚动，规则、仪表与三张分支同屏；
- 390×844 与 320×700 无横向溢出，桌面旋转取消，主要按钮与分支热区不低于 48px；
- 答错锁定、解锁焦点恢复、倒计时跨 tick 保焦点、暂停冻结和超时原题重试均通过；
- 门户重启后显示 39 个体验，新卡片唯一且能跳转到作品；
- 控制台日志为空，页面声明的脚本、样式、favicon 与背景全部是本地资源；
- 借鉴、许可证限制、固定来源、ImageGen 资产和完整零复制声明齐全。

唯一环境限制：当前内置浏览器策略拒绝 `file://` 导航，验收没有绕过该策略。A 级直开边界由经典脚本、相对资源、零网络/存储 API Gate 和仓库校验覆盖；真实 OS 双击属于当前工具无法执行并观察的人工路径，不在此冒充已浏览器实测。

## 2. 自动检查

| 检查 | 结果 |
| --- | --- |
| `node --check` 三个生产 JavaScript | PASS |
| `node --test experiences/co-op/signal-repair-manual/logic.test.js` | 43 / 43 PASS |
| `node --test shared/runtime/catalog.test.js` | 56 / 56 PASS |
| `npm test` | 468 / 468 PASS |
| `npm run verify` | 39 个作品入口、1 个能力声明 PASS |
| `git diff --check` | PASS |

目录 Gate 额外固定检查：

- 无 `type="module"`、绝对 HTTP(S) 资源、`fetch`、XHR、WebSocket、Worker、浏览器存储或 Service Worker；
- 无 `Math.random` 和 `shared/` 运行路径；
- 使用 `crypto.getRandomValues` 的无偏 rejection sampling，能力缺失时回退固定顺序；
- `requestAnimationFrame` 只累计整数 tick，`visibilitychange` 自动暂停；
- CSS 包含 180° 桌面朝向、窄屏取消旋转、forced colors、reduced motion 和 WebP 背景；
- README 与 ATTRIBUTION 保留固定来源、许可证、ImageGen 和零复制声明。

误跑记录：一次裸 `node --test` 进入 `tmp/emsdk` 上游样例并产生预期外失败；终止后改回仓库受控的 `npm test`，468/468 通过。该已知陷阱见 [`../bugs/2026-07-17-unscoped-test-discovery-enters-tmp-toolchain.md`](../bugs/2026-07-17-unscoped-test-discovery-enters-tmp-toolchain.md)，不是本作品回归。

## 3. localhost 真实实玩

环境：macOS、Codex 内置 Chromium、本地运行时 `http://localhost:4173/`。

### 3.1 主流程

1. 开场点击“开始校准”；
2. 北席、南席依次点击“我准备好了”；
3. 读取三条优先规则与三张星路卡，按首个唯一规则选择；
4. 第 1–4 轮分别接回 B、C、A、A，均为 1 次尝试；
5. 操作员依次为南席、北席、南席、北席；
6. 完成态显示四段私人传输、四轮中性记录、“重新接收”和“返回作品库”。

完成态 `data-transmission` 与四段配置拼接一致；结果没有分数、星级、赢家、爆炸、生命或排行榜。

### 3.2 错误、计时与焦点

| 路径 | 浏览器证据 |
| --- | --- |
| 倒计时跨 tick | 聚焦 A，等待 350ms，秒数变化且焦点仍为 A |
| 错误锁定 | 选择错误 A 后 A/B/C 全部 disabled |
| 解锁恢复 | 等待 1100ms 后全部 enabled，焦点恢复到 A |
| 暂停 | 8 秒时暂停，等待 1100ms，继续后仍为 8 秒 |
| 超时 | 进入“信号淡出了”，不显示答案，按钮为“再听一次” |
| 原题重试 | 重试回到双方 READY，题目保持不变 |
| 门户 | 重启本地运行时后显示“39 个体验”，新入口数量 1，跳转 URL 正确 |

最初实现每 100ms `replaceChildren()` 两侧工作区，真实复现焦点退回 `BODY`；修复和完整记录见 [`../bugs/2026-07-18-signal-repair-tick-rebuild-focus-loss.md`](../bugs/2026-07-18-signal-repair-tick-rebuild-focus-loss.md)。

### 3.3 资源与日志

页面 DOM 声明的资源只有：

- `styles.css`；
- `config.js`、`logic.js`、`app.js`；
- `assets/favicon.svg`；
- CSS 伪元素的 `assets/signal-dust.webp`。

全部位于 `http://localhost:4173/experiences/co-op/signal-repair-manual/`。浏览器控制台日志为 `[]`。背景下层同时存在深蓝纯色、径向和线性 CSS 背景；WebP 缺失时不影响文字、规则和按钮层级。

## 4. 响应式几何

| 视口 | 关键结果 |
| --- | --- |
| 1504×1046 | 文档 1504×1046，无滚动；A/B/C 卡高约 232px，底部 873px；只有 `north-workspace__rotator` 承担席位 180° 旋转 |
| 390×844 | 无横向溢出；开始按钮底部 455px；两席 READY 均 52px 高且在首屏；分支卡约 163px 高；纵向堆叠且无席位旋转 |
| 320×700 | 无横向溢出；开始按钮底部 473px；暂停按钮 48px；分支卡宽 274px、高约 160px；规则与三分支可自然纵向滚动 |

保存的浏览器证据：

- [桌面开场](./assets/signal-repair-manual/actual-desktop-intro.png)
- [桌面进行态](./assets/signal-repair-manual/actual-desktop-playing.png)
- [桌面完成态](./assets/signal-repair-manual/actual-desktop-complete.png)
- [390px 交接态](./assets/signal-repair-manual/actual-mobile-handoff.png)
- [390px 完整进行态](./assets/signal-repair-manual/actual-mobile-playing-full.png)
- [320px 完整进行态](./assets/signal-repair-manual/actual-narrow-playing-full.png)

当前浏览器的普通桌面 PNG 是 1504×892 可见区，而 DOM 视口/页面测量是 1504×1046。full-page 截图在此环境发生二次放大截断，因此没有拿它替换忠实的普通截图；几何结论来自 DOM，视觉结论来自未失真 PNG。

## 5. Fidelity ledger

| 项目 | 结果 | 证据 |
| --- | --- | --- |
| 空间结构 | PASS | 桌面上规则、中仪表、下分支；单层北席旋转；首屏同时可见 |
| 信息层级 | PASS | 完成态四段私人传输占主要面积，四轮记录明显次级 |
| 材质 | PASS | 深蓝纸桌、暖纸、黄铜线、珊瑚主动作；生产背景 144,098 bytes |
| 分支可读性 | PASS | A/B/C、纹理名、节点数、符号名、信号文字、档位条冗余齐全 |
| 角色公平 | PASS | 两席 READY 同尺寸，四轮各操作两次，结果无胜负评价 |
| 移动重排 | PASS | 390/320 单列、无旋转、规则与三分支纵向完整 |
| 完成仪式 | PASS | 四段拼合、四节点进度、重新接收，无分数/星级/赢家 |
| 控件与可访问性 | PASS | 原生 button/link、48px+、阶段标题接收焦点、live status 持久 |

### 概念首屏文案差异

ImageGen 概念中的生成中文只作空间占位，没有进入产品。运行时严格使用规格允许文案：

- 标题保留“把信号接回来”；
- 桌面进行态使用“第 1 / 4 轮”“领航员 · 依次读优先规则”“操作员 · 描述并选择星路”；
- 概念的“确认选择”“查看规则”“快捷交流”和额外说明均未实现；
- 移动概念的第三个“双方已就绪，开始本轮”按钮删除，第二席 READY 直接开始；
- 完成概念的生成传输句全部替换为 `config.js` 的可编辑四段文案。

### 有意偏离复核

设计文档冻结的七项偏离全部保持：移动两席纵向堆叠、删除额外开始按钮、分支本身即 action、删除无功能望远镜/人物/杯笔、真实波形改抽象信号线、不采用生成中文、降低厚重拟物阴影。没有发现新的未声明偏离。

## 6. 借鉴与来源声明验收

完整声明见 [`../experiences/co-op/signal-repair-manual/ATTRIBUTION.md`](../experiences/co-op/signal-repair-manual/ATTRIBUTION.md)。本作品只研究了通用的角色分离机制：

- `tridpt/TwoPlayerGames` 固定提交 `542c57a778bbf843eb2cb121e99d0b050d8c866e`，MIT；
- `keeptalkinggame/ktanemodkit` 固定提交 `e379d86e12d1d6409c228b84ca9a74deffa15c99`，其许可证仅允许为指定游戏制作模组，因此本仓库零使用；
- Steel Crate Games 官方玩法/手册只用于识别角色结构和必须避开的规则、术语、版式与视觉；
- W3C WCAG 2.2 只作为颜色、方向、焦点、目标尺寸和状态消息依据；
- `signal-dust.webp` 由 OpenAI ImageGen 原创生成，未使用第三方图片、字体、图标、音频或代码。

星路属性、规则 DSL、12 张题卡、求解器、状态机、页面、中文文案、测试和原生图形均由本仓库独立创作。没有复制、改写或引入上述来源的代码、规则表、题目、模块名称、字体、手册版式、声音或素材。

## 7. Bugs 与 Learn

本批已记录并修复：

- [`../bugs/2026-07-18-signal-repair-webp-encoder-unavailable.md`](../bugs/2026-07-18-signal-repair-webp-encoder-unavailable.md)
- [`../bugs/2026-07-18-signal-repair-rejection-sampling-retry-bias.md`](../bugs/2026-07-18-signal-repair-rejection-sampling-retry-bias.md)
- [`../bugs/2026-07-18-signal-repair-tick-rebuild-focus-loss.md`](../bugs/2026-07-18-signal-repair-tick-rebuild-focus-loss.md)

本批已沉淀：

- [`../learn/2026-07-18-rule-token-single-source-unique-solution.md`](../learn/2026-07-18-rule-token-single-source-unique-solution.md)
- [`../learn/2026-07-18-structural-render-key-focus-stability.md`](../learn/2026-07-18-structural-render-key-focus-stability.md)

## 8. 独立提交链

```text
79ef24a docs: research signal repair manual
794bde1 docs: specify signal repair manual
17244f1 docs: plan signal repair manual
7256124 design: define signal repair visuals
0186874 bug: record signal repair WebP fallback
78e62b6 feat: add signal repair state engine
b4d1e2b fix: preserve unbiased signal session sampling
d796458 bug: record signal sampling bias
ba486e4 feat: add signal repair experience
eea8e63 fix: preserve signal branch focus during ticks
7c83e8e bug: record signal repair focus loss
641d039 feat: catalog signal repair manual
b4d8dad test: capture signal repair browser QA
6a4d0dd learn: derive puzzle copy and answers from rule tokens
bb8615f learn: preserve focus with structural render keys
```

验收报告与索引另作一个提交，继续遵守“一部分完成一次提交”。
