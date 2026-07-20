# “把七天，养成一朵花”验收记录

- 日期：2026-07-21
- 作品：`experiences/co-op/seven-day-garden/`
- 等级：A（经典相对脚本、纯本地资源、零第三方运行依赖、零网络、零存储、零时间、零随机、零音频）
- 对应调研：[161-seven-day-garden-research.md](./161-seven-day-garden-research.md)
- 对应规格：[162-seven-day-garden-spec.md](./162-seven-day-garden-spec.md)
- 视觉冻结：[163-seven-day-garden-design.md](./163-seven-day-garden-design.md)
- 分步计划：[164-seven-day-garden-plan.md](./164-seven-day-garden-plan.md)

## 1. 结论

作品已完成为单设备公开轮流的双人规划游戏。两席各有一只可见的有限工具篮，每天先后各选一张水、日照或耐心卡；两张卡既要满足当天花签，也不能让剩余六天陷入无解。七张花签全部完成后，两篮恰好归零，共同养成一朵花。

生产浏览器跑通完整七日路径，覆盖 `pair-mismatch`、`future-stranded`、公开交接、逐日换先手、七个结果页、最终完成账页、键盘修饰键、图片图集定位、桌面与两档窄屏。控制台没有 error/warn。自动化安全策略禁止直接导航 `file://`，因此没有把本地服务访问冒充真实双击；A 级边界由经典相对脚本、无 module/fetch/网络/存储/时间/随机、目录 Gate 与本地资源证明，保留一次真实双击人工 Gate。

## 2. 实现简报

- `config.js`：两席称呼与安全完成结语；
- `logic.js`：七张花签、两篮库存、后缀解计数、分层 evaluator、八阶段 reducer、原子前缀提交、公开 view 与防御式输入；
- `logic.test.js`：45 项定向测试，含九种有序组合、两种失败、2,892 个库存状态独立 Oracle、完整路线、hostile action/state、JSON 重放与公开投影；
- `index.html` / `styles.css` / `app.js`：经典脚本、公开交接、两只工具篮、两张照料位、七片进度叶、八阶段植物、键盘/触控、阶段焦点、live region、响应式与图片降级；
- 三张 PNG 与原创 favicon：只承担清晨桌面、植物阶段和完成手账表现，不保存规则或答案；
- `README.md` / `ATTRIBUTION.md`：直开方式、信任边界、隐私、四个固定研究来源、许可证/版权、排除范围、ImageGen 与零复制声明。

## 3. 自动检查

最终执行：

```sh
node --check experiences/co-op/seven-day-garden/config.js
node --check experiences/co-op/seven-day-garden/logic.js
node --check experiences/co-op/seven-day-garden/app.js
node --test experiences/co-op/seven-day-garden/logic.test.js
node --test shared/runtime/catalog.test.js
npm run verify
npm test
cmp docs/assets/seven-day-garden/garden-table-background-source.png experiences/co-op/seven-day-garden/assets/garden-table-background.png
cmp docs/assets/seven-day-garden/completion-keepsake-source.png experiences/co-op/seven-day-garden/assets/completion-keepsake.png
git diff --check
```

结果：

- 作品逻辑：45 / 45 通过；
- 目录与静态 Gate：86 / 86 通过；
- 全仓：1449 / 1449 通过，0 失败；
- `verify`：54 个作品入口、1 个能力声明通过；
- 背景与完成纪念图和文档源稿逐字节一致；植物图集由洋红底源稿按 163 号设计记录的固定流程去底，不能与源稿逐字节比较；
- `git diff --check`：通过。

资产 SHA-256：

| 资产 | SHA-256 |
| --- | --- |
| `garden-table-background.png` | `382cfbce3a0618a3de25ae3197cbb9b4462dffaa9273672bb725d87c02eee0c7` |
| `plant-states.png` | `75409d8bb8d9b9f2a07409e6f228ce6fec324e6d913c77a215c4309f2a9c2316` |
| `completion-keepsake.png` | `3a0f2aa921936bcb08cd95b1e7430c568bd457382b0d133004123484ca35b146` |

规则测试还证明：初态完整路线严格为 1；全部 2,892 个合法两席库存状态与独立字面量 Oracle 一致；两种失败都不扣库存；accepted 原子扣减并追加前缀；第七日先停在 `day-result`；公开 view 不包含 `suffixSolutions` 或答案路线。

## 4. 浏览器生产路径

通过仓库本地服务加载同一套生产文件，实际完成：

1. 首屏确认七日规则、两篮公开库存、无排名/计分和本机隐私说明；
2. 制造当天卡型不匹配，进入 `pair-mismatch`，库存归还并重试当前日；
3. 制造当天卡型匹配但后续无解，进入 `future-stranded`，同样不扣库存且不泄露正确席位路线；
4. 按 `AW/BS → AP/BW → AS/BS → AP/BS → AW/BW → AP/BP → AW/BS` 完成七天；
5. 每天确认首席交替、handoff 显示第一张公开卡、结果页新增一个植物阶段与一条完成前缀；
6. 七个结果页的 `completedDays` 依次为 1–7，图集位移持续保留，正常图片加载时 CSS fallback opacity 为 0；
7. 完成态显示 7 天、14 张卡、7 次尝试、0 次重新商量和 7 条日记，焦点进入阶段标题；
8. Ctrl/Meta/Alt + W/S/P 不选卡、不阻止浏览器组合快捷键；无修饰 W/S/P 正常操作；
9. 页面无横向溢出，控制台 error/warn 均为空。

图片失败 fallback、`prefers-reduced-motion` 与 forced-colors 的 DOM/CSS 分支和目录 Gate 已检查；评审浏览器确认图集正常态及 reduced-motion 下 fallback 不误显。三张图片逐一阻断、真实 forced-colors 设备模式与后台生命周期仍列入人工设备 Gate，不写成已完整实测。

## 5. 响应式与可访问性

| 视口 / 阶段 | 实测结果 |
| --- | --- |
| 1280px first-pick | 中央植株宽 `358.398px`，超过冻结 Gate 的 300px；`scrollWidth = clientWidth` |
| 1280px complete | 7 条日记、7/14/7/0 汇总和重开动作完整；阶段标题持有焦点，无横向溢出 |
| 390×844 first-pick | 植株约 `241.8×237.9px`；工具按钮高约 93px；七片叶以 4+3 两行显示，无横向溢出 |
| 320×568 first-pick | 工具按钮高约 109.5px，无横向溢出；允许必要纵向滚动 |

- 使用原生 button、heading、list、navigation、status 和 `aria-live`；
- 两席除了位置和颜色，还有席位名、篮名、库存数字与当前行动文案；
- 阶段切换把焦点送到标题，交接、退卡、日结与完成使用中性播报；
- 耗尽工具使用真实 disabled 并显示剩余 0 张；
- `prefers-reduced-motion` 只缩减表现动画，不改变 reducer；forced-colors 保留系统色、边框和 CSS 植株；
- 200% 文本缩放未在真实设备模式实测，保留为人工 Gate。

## 6. 视觉 fidelity ledger

| 概念冻结点 | 生产结果 |
| --- | --- |
| 清晨窗边植物手账 | 原创桌面背景逐字节进入运行目录，米纸、木桌与柔和晨光保持一致 |
| 中央植物是主角 | 1280px 实测 358.398px，视觉权重高于单张工具卡 |
| 左右两只等权工具篮 | 两席各自库存与按钮对称呈现，先后顺序变化不改变权重 |
| 七片叶的生长记录 | 生产 DOM 严格生成七片进度叶，移动端保持 4+3 阅读顺序 |
| 真实生长而非奖杯结算 | 八阶段同盆植物图集逐日推进；完成页仍是盛开植株和共同手账，没有 trophy、排名或赢家 |
| 象牙纸卡、墨绿与陶土色 | 标题、花签、工具卡、状态和完成账页保持冻结色系与编辑式层级 |
| 克制的共同完成 | 完成态用 7/14/7/0 事实摘要、七条日记与一句共同结语，不制造个人分数 |
| 窄屏纵向花园 | 390 与 320 按进度→植物→当前说明→主动工具篮→另一篮→动作收拢，无横向滚动 |

概念稿中的伪文字和装饰控件没有直接成为界面；真实花签、库存、按钮、失败原因、日记与统计全部由 DOM/CSS/规则层生成。最终概念图与浏览器截图已使用原始细节目视对照；截图保存在临时目录，没有作为运行资产提交。

## 7. 借鉴、bugs 与 learn

[`ATTRIBUTION.md`](../experiences/co-op/seven-day-garden/ATTRIBUTION.md) 固定四个机制研究来源：Apache-2.0 的 TransmediaLab/SmartFarm `bea42244…`，MIT 的 boardgameio/boardgame.io `55200a6a…`、trekhleb/javascript-algorithms `0f52fbac…` 与 w3labkr/js-growing-tree `11cf7e87…`。每项都写明版权主体、只研究的抽象机制和未复制范围；运行目录没有复制、改写、翻译、打包或依赖其源码、测试、参数、界面、素材或文案。

本轮记录五个已解决问题：

- [成功日结的前缀长度与日序不变量冲突](../bugs/2026-07-21-seven-day-garden-day-result-prefix-invariant.md)；
- [修饰键组合误触照料卡并吞掉浏览器快捷键](../bugs/2026-07-21-seven-day-garden-modifier-shortcuts.md)；
- [入场动画覆盖图集定位与备用图层透明度](../bugs/2026-07-21-seven-day-garden-plant-animation-transform.md)；
- [1280px 桌面植株没有达到冻结稿尺寸 Gate](../bugs/2026-07-21-seven-day-garden-desktop-plant-width.md)；
- [目录 Gate 在 CSS 中检查由 JavaScript 持有的图集路径](../bugs/2026-07-21-seven-day-garden-catalog-sprite-owner.md)。

可复用方法见[有限库存精确覆盖：后缀可解性、原子前缀与独立穷举 Oracle](../learn/2026-07-21-exact-cover-prefix-commit.md)。ImageGen 图集去底时复用并补充了既有 [系统 Python 缺 Pillow](../bugs/2026-07-19-memory-bid-chroma-python-runtime.md) 记录，没有重复建同根因文件。

## 8. 独立提交

| 完成部分 | commit |
| --- | --- |
| 定向调研 | `cc02570` |
| 可执行规格 | `b765077` |
| 视觉与 ImageGen 源稿/生产资产 | `82c5b79` |
| 实施计划 | `713fc45` |
| 结果页前缀规格修复 | `2e9fc74` |
| 逻辑、配置与 45 项测试 | `92e4d79` |
| 前端与来源声明 | `9bf8f62` |
| 浏览器评审 Bugs 记录 | `653335c` |
| catalog、创意池与目录 Gate | `3937888` |
| 目录 Gate Bug 记录 | `cacd6f3` |
| learn 沉淀 | `61a1db9` |
| 本验收记录、计划状态与文档索引 | 本次提交 |

## 9. 发布判断

作品达到七日双篮精确覆盖、两席必要性、公开交接、两种失败且不扣卡、成功前缀原子提交、唯一完整路线、完成账页、A 级静态边界、统一门户、真实浏览器完整生产路径、三档视口、视觉对照、固定来源、bugs/learn 与独立提交的当前发布标准。

保留的人工 Gate 是：真实 `file://` 双击、1728×906 超宽视口、200% 文本缩放、真实 forced-colors、三张图片逐一阻断与后台失焦恢复。它们是自动化或设备能力边界，没有被写成已实测。完成本作不等于长期目标完成；后续继续选择下一个未实现候选。
