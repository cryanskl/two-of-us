# 「把颜色调到一起」验收记录

> 验收日期：2026-07-18。作品入口：[`../experiences/co-op/shared-color-studio/index.html`](../experiences/co-op/shared-color-studio/index.html)。本记录覆盖纯逻辑、catalog、真实 `file://`、localhost、完整五轮、超时重试、三档响应式、颜色/素材降级、视觉忠实度和来源声明。

## 1. 结论

「把颜色调到一起」已达到 A 级本地优先完成标准：

- 双击 `index.html` 可直接运行，无构建、无网络、无存储和权限请求；
- 两人分别控制色相与明度，任一人都不能替另一人完成自己的轴；
- 五个固定回合、24 秒整数倒计时、超时重试与五张合册闭环完整；
- 规则只比较离散索引，OKLCH/HSL 只影响显示；
- 键盘、点击和双 Pointer 按压态接入同一动作边界；
- 文本、坐标、刻度和形状共同反馈，不依赖辨色完成；
- 三档 viewport 无横向溢出，触控目标符合规格；
- 背景资源失败时保留纯色可读降级；
- 固定来源、许可证/作者与未复制边界完整；
- catalog、门户、创意池、bugs 与 learn 均已接入。

## 2. 自动化结果

### 2.1 纯逻辑

命令：

```bash
node --test experiences/co-op/shared-color-studio/logic.test.js
```

结果：`43 / 43` 通过。覆盖配置冻结与整组回退、双入口、倒计时、色相绕回、明度钳制、双轴交换律、单轴反馈、成功/超时/重试、五轮推进、暂停/恢复、最短方向、OKLCH/HSL token、重放确定性、返回视图隔离、恶意文案按纯文本处理和畸形状态防御。

### 2.2 catalog 与静态边界

命令：

```bash
node --test shared/runtime/catalog.test.js
npm run verify
```

结果：

- catalog 定向：`53 / 53`；
- 仓库验收：`38 个作品入口、1 个能力声明`；
- 新作品为 `co-op / A / 2 人合作 / 单设备同屏 / networkRequired: false`；
- 静态 Gate 确认无模块脚本、外链、网络/存储/媒体 API、随机数、共享运行时代码和 `innerHTML`；
- 固定检查 rAF、`visibilitychange`、四键分类、颜色 token、生产背景、`touch-action` 与三个开源固定提交。

### 2.3 全仓

命令：

```bash
npm test
git diff --check
```

结果：`465 / 465` 通过，diff whitespace 检查通过。catalog 共 38 个作品，其中 A 级 30 个；分类为 surprise 13、co-op 13、versus 12。

## 3. 真实浏览器路径

当前环境没有可调用的应用内 Browser / Chrome MCP，因此按浏览器技能回退到 Playwright CLI 1.61.1 与本机 Google Chrome：

```text
/Applications/Google Chrome.app/Contents/MacOS/Google Chrome
```

### 3.1 真实 `file://`

Playwright CLI 自身会拒绝 `file:` 导航，因此没有把 localhost 冒充直开证据。本机 Chrome 直接加载：

```text
file://{repo-root}/experiences/co-op/shared-color-studio/index.html
```

[`file-ready-1504x1046.png`](./assets/shared-color-studio/file-ready-1504x1046.png) 是 1504×1046 原生截图，能看到：

- H1、轮次、24.0 秒和“开始调色”；
- 两张色纸、两条刻度、四个按钮和本地背景；
- `file://` 下同目录 CSS、JS、SVG 与 WebP 均正常加载；
- 页面不需要安装依赖或启动服务。

静态边界测试同时确认运行源码没有 HTTP/WSS/data/blob URL、网络 API 或共享目录引用。

### 3.2 localhost 对照

启动：

```bash
TWO_OF_US_PORT=4211 node scripts/start.mjs --no-open shared-color-studio
```

检查：

- `http://localhost:4211/experiences/co-op/shared-color-studio/index.html` 正常加载；
- 正常路径只有 HTML、CSS、三个 JS、favicon 与背景图七个本地静态请求；
- desktop/mobile 正常路径 console error 均为 0；
- 完成后发送 SIGINT，运行时确认端口释放。

## 4. 真实交互

### 4.1 成功、超时与重试

浏览器按实际配置完成以下闭环：

1. 晚霞信笺：从 H 9/L 3 调到 H 2/L 8，出现“合拍”与“收下这张”；
2. 进入海玻璃后保持不操作，24 秒归零，出现“时间到了”和“再调一次”；
3. 重试仍是海玻璃，目标与已收下的一张不变；
4. 海玻璃、莓果夜灯、苔痕小纸条、薰衣草清晨依次完成；
5. 最终 `data-phase=complete`，DOM 恰有 5 张 `.album-slip`；
6. 结语为“你转过色相，我照亮明暗。最后留下的是我们一起调出的颜色。”；
7. “重新调一册”回到第一张 ready，上一册进度清空。

[`desktop-success-round1-1504x1046.png`](./assets/shared-color-studio/desktop-success-round1-1504x1046.png) 保存单轮合拍态，[`desktop-complete-1504x1046.png`](./assets/shared-color-studio/desktop-complete-1504x1046.png) 保存五张合册态。

### 4.2 Pointer、暂停与 reduced motion

- 390×844 下以 `pointerId=41` 和 `pointerId=42` 同时向两个玩家按钮派发 `pointerdown`，两个按钮都保留 `.is-pressed`；
- pointerup 后按压态分别清除，点击各自只改变对应轴；
- 标准 `window.blur` 让 playing 进入 paused，点击“继续”恢复 playing；
- `prefers-reduced-motion: reduce` 为 true 时倒计时和规则照常工作，只收敛装饰动效；
- `visibilitychange`、stalled 与后台不补时由静态接线和纯逻辑测试固定。

## 5. 响应式几何

| viewport / 阶段 | 文档 `client / scroll` | 触控按钮 | 关键结果 |
| --- | --- | --- | --- |
| 1504×1046 ready | 1504×1046 / 1504×1046 | 239×58 | app 宽 1120；目标纸 250×258、当前纸 401×324；无滚动 |
| 390×844 playing | 390×844 / 390×870 | 181×56 | 目标/当前并排，四键 2×2；仅 26px 自然纵向余量，无横向溢出 |
| 320×700 timeout | 320×700 / 320×1094 | 146×56 | 允许自然滚动；结果底部 784px，一次滚动可达；无横向溢出 |

对应截图：[`mobile-playing-390x844.png`](./assets/shared-color-studio/mobile-playing-390x844.png) 与 [`narrow-timeout-320x700.png`](./assets/shared-color-studio/narrow-timeout-320x700.png)。320px 的按钮高度实际仍为 56px，高于规格最小 52px。

## 6. 颜色与媒体降级

同一浏览器上下文在重载前覆盖 `CSS.supports('color', 'oklch(...)')` 返回 false，并阻断 `pigment-table.webp`：

- 根节点 `data-color-mode=hsl`；
- 目标色 token 为 `hsl(30 76% 76%)`；
- 规则索引、坐标和可操作文字不变；
- 背景图失败后 `body` 保持 `rgb(6, 19, 31)`，页面仍完整可读；
- 文档宽度仍为 390/390，无横向溢出。

[`mobile-hsl-asset-fallback-390x844.png`](./assets/shared-color-studio/mobile-hsl-asset-fallback-390x844.png) 保存组合降级画面。故障注入会产生一条预期的 `net::ERR_FAILED`，它来自测试主动中断图片请求；正常路径 console error 为 0。

## 7. 视觉 fidelity ledger

同一轮 QA 以原始尺寸同时查看了三组概念与最新浏览器截图：

- `concept-desktop-playing.png` ↔ desktop success；
- `concept-mobile-playing.png` ↔ mobile playing；
- `concept-desktop-complete.png` ↔ desktop complete。

| 比较点 | 结果 | 说明 |
| --- | --- | --- |
| 标题/轮次/倒计时层级 | 通过 | 大号系统宋体标题、黄铜轮次与右上桌面秒数关系一致 |
| 目标小、当前大 | 通过 | 桌面实际 250×258 对 401×324，保留概念主次 |
| 色相圆点/明度方块 | 通过 | 两条轴的形状语言清楚，不只用颜色区分 |
| 当前/目标指针 | 通过 | 当前白色实心、目标青色虚线/空心；合拍时同格共存 |
| 四按钮与键帽 | 通过 | 黄铜细边、小圆角、A/D/J/L 键帽和线性方向 SVG 完整 |
| 深墨背景与原创资产 | 通过 | 无遮罩加载生产 WebP；水彩纸、铜碗与画笔构成桌面边缘 |
| 390×844 双人等权 | 通过 | 两轴纵向等权、四键 2×2，关键操作在首屏 |
| complete 五张色笺 | 通过 | CSS 折页容器内五张不重叠，标题/坐标/颜色齐全 |
| 状态动效与 reduced motion | 通过 | rAF 管规则时间，reduce 只关闭非必要过渡/动画 |
| 资源失败降级 | 通过 | 深色底、黄铜线和纸片结构仍成立，没有透明或白底断层 |

### 7.1 Above-the-fold copy diff

实现可见文案全部属于设计文档 6.1/6.2 允许清单：

- H1 均为“把颜色调到一起”；
- 两张纸均为“目标色 / 我们调出的颜色”；
- 两个控制区均为“玩家 1 · 色相 / 玩家 2 · 明度”；
- 四键均为“A 逆时针、D 顺时针、J 深一点、L 亮一点”；
- footer 严格为“玩家 1 只调色相，玩家 2 只调明度。”；
- complete 的标题、五张 title、默认结语、数量、重开与返回入口全部一致。

概念 playing 展示 `2 / 5 海玻璃 · 17.4 秒`，验收截图分别是第一张的 5.6/20.4 秒；这是回合与截图时刻差异，不是文案漂移。概念生成图的个别坐标不作为规则来源，浏览器以固定 config 为准。

### 7.2 刻意偏离

- 不加载生成稿书法字体，使用系统宋体/黑体回退；
- 撕纸纤维由 CSS `clip-path` 与网格纹理近似，不复制概念随机边缘；
- complete 使用 CSS 折页和五张 HTML 色笺，不新增整本书位图；
- 390×844 实现比概念更紧凑，保留 26px 自然滚动余量；
- 320×700 按规格允许纵向滚动，不把文字和按钮缩到不可读；
- 概念图颜色只定义氛围，生产色值由固定离散映射生成。

## 8. 来源与借鉴声明

[`ATTRIBUTION.md`](../experiences/co-op/shared-color-studio/ATTRIBUTION.md) 固定记录：

- `horushe93/colorfle@9f7b45e...`：CC BY-NC 4.0，仅借鉴目标色/反馈抽象，不复制代码或视觉；
- `jsskrh/color-matching-game@ad9bce...`：MIT，作者 Jesse Akorah，仅参考明确目标与文字反馈；
- `melloware/Coloris@c677d8c...`：MIT，Copyright © 2021 Mohammed Bassit，仅参考颜色控件可用性；
- W3C CSS Color 4、WCAG Use of Color/Status/Target Size 与 Pointer Events：用于术语、反馈和输入边界；
- `pigment-table.webp` 为本项目 ImageGen 原创无字生产背景。

声明明确未复制上述项目的代码、算法、素材、题面、文案、构建产物或依赖，也不声称专业校色或 ΔE 测量。

## 9. 已修复 bug

- [`../bugs/2026-07-18-shared-color-background-stacking.md`](../bugs/2026-07-18-shared-color-background-stacking.md)：负层级背景被 `body` 遮住；通过隔离堆叠上下文与 0/1 层修复；
- [`../bugs/2026-07-18-shared-color-result-copy-drift.md`](../bugs/2026-07-18-shared-color-result-copy-drift.md)：默认合册文案错误依赖移动数；改为精确冻结文案与测试；
- [`../bugs/2026-07-18-shared-color-attribution-heading-contract.md`](../bugs/2026-07-18-shared-color-attribution-heading-contract.md)：README 来源标题未满足机器 Gate；统一标题并保留完整声明。

## 10. 学习沉淀

- [`../learn/2026-07-18-orthogonal-discrete-coop-color-rules.md`](../learn/2026-07-18-orthogonal-discrete-coop-color-rules.md)：正交职责、轴交换律、环/线边界、规则/显示分层、非颜色反馈与最小测试矩阵。

## 11. 完成提交链

| commit | 部分 |
| --- | --- |
| `f5aaf27` | 定向调研 |
| `1b6c032` | 实现规格 |
| `4a8adfb` | 分步实施计划 |
| `4f08d24` | 视觉概念与原创生产背景 |
| `5f78ed0` | 规则内核与 43 项测试 |
| `8ca7968` | 默认结果文案修复 |
| `d7c7f93` | HTML/CSS/交互前端与借鉴声明 |
| `66f2f6a` | catalog、门户、创意池与静态边界 |
| `80e50a5` | 背景堆叠 bug 记录 |
| `48db95f` | 正交离散合作学习沉淀 |
| `84385b3` | 结果文案 bug 记录 |
| `db36f6b` | 来源标题 bug 记录 |

本验收记录、运行截图与两级文档索引形成最后一个独立 docs 提交。

## 12. 残余风险

- OKLCH/HSL 和不同显示器会产生视觉差异，但不会改变整数规则；
- 键盘 ghosting 取决于实体键盘矩阵，四个触控按钮提供替代输入；
- 自动化以 `window.blur` 验证失焦暂停，真实标签页 `visibilityState=hidden` 仍建议在常用浏览器手工复核一次；
- 当前没有联网、AI、音频、用户照片、自由调色或专业色差，这些是首版冻结边界，不是缺失依赖。

这些风险不影响 A 级 `file://` 双人同屏核心闭环。
