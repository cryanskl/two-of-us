# “把两边，拉成我们”验收记录

- 日期：2026-07-21
- 作品：`experiences/co-op/together-zipper/`
- 等级：A（经典相对脚本、纯本地资源、零第三方运行依赖、零网络、零存储、零随机、零音频）
- 对应调研：[156-together-zipper-research.md](./156-together-zipper-research.md)
- 对应规格：[157-together-zipper-spec.md](./157-together-zipper-spec.md)
- 视觉冻结：[158-together-zipper-design.md](./158-together-zipper-design.md)
- 分步计划：[159-together-zipper-plan.md](./159-together-zipper-plan.md)

## 1. 结论

作品已完成为单设备同屏双人同步合作游戏：左席只用 `F` 或左侧按钮，右席只用 `J` 或右侧按钮；两人要在同一个闭时间窗内各拉一次，并满足逐段收紧的同步阈值，才能依次合上 4 / 5 / 6 共 15 颗链齿。

真实浏览器通过仓库统一本地服务跑完三段，覆盖触控、真实键盘、过早、不同步、单侧漏接、双侧漏接、同齿重试、完成摘要、重开、桌面和两档窄屏。Browser Use 安全策略禁止导航 `file://`，因此没有绕过策略冒充双击通过；A 级静态边界由经典相对脚本、零模块/fetch/网络/存储、逐字节本地资产和目录 Gate 证明，保留一次真实双击人工 Gate。

## 2. 实现简报

- `config.js`：三段 4 / 5 / 6 齿、目标 tick、窗口半径、同步阈值、双席称呼和安全完成结语；
- `logic.js`：30Hz 整数规则时钟、闭时间窗、第一输入、六种 jam 原因、12 tick 反馈、七阶段 reducer、公开 view、重放与防御式输入；
- `logic.test.js`：31 项配置、边界、合作必要性、阶段余 tick、前缀不回退、hostile 输入、重放和运行时纯度测试；
- `index.html` / `styles.css` / `app.js`：经典脚本、严格 15 齿 DOM、单公共时间轨、两席等权控制、阶段焦点、RAF 生命周期、响应式、reduced-motion 与 forced-colors；
- 三张 PNG：ImageGen 原创源稿的逐字节运行副本，只承担背景、拉链头材质和完成纪念物；
- `README.md` / `ATTRIBUTION.md`：直开方式、控制、离线隐私、三个固定 MIT 研究来源、混合许可排除和零复制声明。

## 3. 自动检查

最终执行：

```sh
node --check experiences/co-op/together-zipper/config.js
node --check experiences/co-op/together-zipper/logic.js
node --check experiences/co-op/together-zipper/app.js
node --test experiences/co-op/together-zipper/logic.test.js
node --test shared/runtime/catalog.test.js
npm run verify
npm test
cmp docs/assets/together-zipper/tailor-table-background-source.png experiences/co-op/together-zipper/assets/tailor-table-background.png
cmp docs/assets/together-zipper/brass-zipper-pull-source.png experiences/co-op/together-zipper/assets/brass-zipper-pull.png
cmp docs/assets/together-zipper/completed-keepsake-source.png experiences/co-op/together-zipper/assets/completed-keepsake.png
git diff --check
```

结果：

- 作品逻辑：31 / 31 通过；
- 目录与静态 Gate：84 / 84 通过；
- 全仓：1402 / 1402 通过，0 失败；
- `verify`：53 个作品入口、1 个能力声明通过；
- 三张运行资产与文档源稿逐字节一致；
- `git diff --check`：通过。

资产 SHA-256：

| 资产 | SHA-256 |
| --- | --- |
| `tailor-table-background.png` | `f35353786be7d5fadc0506fa6e1fc479eeba1c579f4f20c36caf016f8c1fa9d6` |
| `brass-zipper-pull.png` | `958d148ca8613db1455cbb8c9f5cd606359ad75ebd443adc7411cbcf23e6b9a5` |
| `completed-keepsake.png` | `641ece5a37d7a6387ea76a0d0d735c96043592444b7b67f0eed53bd211fec02a` |

规则测试还证明：窗口起点与终点都有效；只有一席无法完成任一段；同席重复输入不能代替另一席；`STEP` 在阶段变化时丢弃余 tick；失败只重试当前齿，已完成前缀不回退；最短全成功路线严格为 15 次尝试、0 次 jam。

## 4. 浏览器生产路径

通过 `http://localhost:4173/experiences/co-op/together-zipper/index.html` 加载同一套生产文件：

1. 首屏确认规则、双席职责、三段进度、开始动作和本机离线说明；
2. 第一齿实际制造 `early-left`、`apart`、`missed-left`、`missed-right`、`missed-both`，文案与同齿重试正确；`early-right` 与六项枚举完整性由逻辑测试覆盖；
3. 初期用高层 locator click 和重复 DOM snapshot 测紧同步窗，自动化本身消耗了多个 tick，第一段累计 68 次尝试、64 次 jam；
4. 改为进入窗口后只观察一次，再连续发送真实 `F` / `J` 键盘事件，成功状态稳定显示“这一齿，合上了。”；
5. 第二段以 5 次尝试、0 jam 完成，第三段以 6 次尝试、0 jam 完成，验证收紧后的同步阈值仍可正常操作；
6. 完成态显示 15 / 15 齿、三段摘要、总计 79 次尝试和配置结语；前段 64 jam 明确是本次自动化方法噪声，不是产品基准；
7. “再拉一次”回到 intro，重新进入第一段后两席按钮正常恢复；
8. 完成态与进行态图片全部加载，服务器未出现资源 404。

由于恢复默认视口后的额外导航被 Browser Use 客户端拦截，本轮没有取得最终 console 日志读取结果；静态 Gate、生产页面完整交互和本地服务器资源请求均通过，但 console 复核仍列入人工 Gate，不写成已验证。

## 5. 响应式与可访问性

| 视口 / 阶段 | 实测结果 |
| --- | --- |
| 1728×906 intro | 标题、双席、舞台和开始动作无横向溢出，视觉层级完整 |
| 1728×906 complete | `scrollWidth = 1728`，完成页纵向 1230px；15 齿、三段摘要、结语和重开均存在，允许必要纵向滚动 |
| 390×844 intro | `scrollWidth = 390`，页面高 903px，无横向溢出，唯一开始按钮可用 |
| 390×844 playing | 页面正好 `390×844`，无横向溢出；双席按钮约 `157×64px` 与 `159×64px`，完整并排可见 |
| 390×844 complete | `scrollWidth = 390`、页面高 1760px；完成插画与摘要纵向堆叠，无横向溢出 |
| 320×568 playing | `scrollWidth = 320`，页面高 814px；按钮约 `122×58px` 与 `124×58px`，完整并排，允许必要纵向滚动 |

- 原生 button、heading、region、list、navigation 和 live status 进入可访问树；
- 两席除了颜色还有“左边/右边”、`F/J`、席位称呼与拉动状态；
- jam 文案直接说明过早、不同步或哪一侧漏接，不只依赖动画；
- `prefers-reduced-motion` 只改变表现，规则 tick 不变；forced-colors 保留边框和系统文字色；
- 本轮没有用设备环境实测 200% 文本缩放、forced-colors、reduced-motion、后台失焦恢复和三图阻断，保留为人工设备 Gate。

## 6. 视觉 fidelity ledger

| 概念冻结点 | 生产结果 |
| --- | --- |
| 午夜裁缝桌与暖金工作灯 | 背景源稿逐字节进入运行目录，桌面氛围与概念一致 |
| 左深靛、右酒红两块织物 | 舞台和双席控制持续使用两色分区，窄屏仍保留职责映射 |
| 黄铜拉链头与金色齿列 | 拉链头使用原创材质章，15 齿和合拢进度由 DOM 精确生成 |
| 单一公共时间轨 | 生产页只有一条共享轨道和一个窗口，不拆成两份私人计时器 |
| 象牙纸卡、衬线大标题、细金框 | 首屏、jam、段落结果和完成账页保持同一编辑式裁缝账本语言 |
| 完成后的合拢纪念物 | 完成页使用原创双色织物纪念图，并把规则摘要置于右侧纸卡 |
| 移动端纵向叙事 | 390px 与 320px 均按舞台→状态→双席控制顺序收拢，无横向滚动 |

概念板中的生成文字、虚构控件和装饰性链齿没有被直接当作 UI；所有齿数、窗口、进度、失败原因、按钮和总结均由 DOM/CSS/规则层生成。最终 QA 截图保存在 `/tmp` 供目视对照，没有作为运行资产提交。

## 7. 借鉴、bugs 与 learn

[`ATTRIBUTION.md`](../experiences/co-op/together-zipper/ATTRIBUTION.md) 固定三项 MIT 机制研究来源：ChloeLiang/rhythm-game `4995fbf…`、straker/kontra `a449fcdf…`、Pixofield/keyshapejs `40feae40…`；另明确排除含 CC BY-NC 4.0 媒体边界的 111116/webosu `b4c0ba41…`。本作没有复制或打包上述项目的源码、参数、谱面、界面、素材、音频、字体或文案。

本轮发现规格摘要把六种 jam 原因误写成五种，已修正并记录于 [`bugs/2026-07-21-together-zipper-jam-reason-count.md`](../bugs/2026-07-21-together-zipper-jam-reason-count.md)。可复用方法见[闭时间窗合作：整数 tick、事件顺序与自动化时钟](../learn/2026-07-21-closed-window-coop-event-order.md)。

## 8. 独立提交

| 完成部分 | commit |
| --- | --- |
| 定向调研 | `6f83fe3` |
| 可执行规格 | `44c92ea` |
| 视觉与 ImageGen 源稿 | `0de3e10` |
| 实施计划 | `bc779df` |
| 逻辑、配置与 31 项测试 | `14ff694` |
| 前端、生产资产与来源声明 | `778e2d7` |
| jam 原因计数 bug 修复与记录 | `fc4e1cd` |
| catalog、创意池与目录 Gate | `e0d7079` |
| learn 沉淀 | `03ee005` |
| 本验收记录与状态索引 | 本次提交 |

## 9. 发布判断

作品达到三段 15 齿、闭时间窗、双席必要性、六种失败、重试不回退、完成摘要、A 级静态边界、统一门户、真实浏览器完整生产路径、两档窄屏、视觉对照、固定来源、bugs/learn 和独立提交的当前发布标准。

保留的人工 Gate 是：真实 `file://` 双击、console 复核、200% 文本缩放、forced-colors、reduced-motion、后台失焦恢复和三张图片阻断。它们是设备或自动化能力边界，没有被写成已实测。完成本作不等于长期目标完成；后续继续选择下一个未实现候选。
