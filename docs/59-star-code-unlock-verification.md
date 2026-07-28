# 「星码解锁」验收记录

- 验收日期：2026-07-18；
- 功能提交：`b321749 feat: add star code unlock surprise`；
- 环境：macOS 26.5.2、Google Chrome 150.0.7871.125；
- 入口：`experiences/surprises/star-code-unlock/index.html`；
- 结论：通过。作品可由 `file://` 直接打开，完整答题、帮助校准、三星连线、主动揭晓和重新封存路径均可完成。

## 1. 自动检查

```text
node --check app.js / config.js / logic.js       PASS
node --test logic.test.js                        13 / 13 PASS
npm test                                         387 / 387 PASS
npm run verify                                   PASS
git diff --check                                 PASS
```

当前工作区的总测试数包含并行开发中 `closer-cards` 的 11 个测试；星码解锁自身 13 个测试和目录/隐私契约测试均独立通过。仓库校验确认 31 个作品入口、1 个能力声明及借鉴声明完整。

核心覆盖包括：固定 12 星位、整份配置回退、递归冻结、NFKC/大小写/空白/标点规范化、错误计数、第三次帮助校准、显式 continue Gate、ready/revealed 分离、重开、畸形状态恢复，以及状态白名单不允许答案字段。

## 2. Chrome 实玩路径

应用内浏览器在本次环境不可用，Playwright CLI 又出于安全策略拒绝 `file:` 导航，因此采用两条互补路径：

1. 同一份源码通过临时 `http://127.0.0.1:4173/` 由 Playwright CLI 实玩全部交互；
2. 系统 Chrome 直接加载 `file://{repo-root}/experiences/surprises/star-code-unlock/index.html`，生成 1503×1046 截图并确认经典脚本、CSS 和本地图片正常加载。

实玩顺序与结果：

1. 开始后原生文本框自动获得焦点；
2. 第一题连续输错三次：依次出现两级自定义提示，第三次出现“让星盘帮一次”；
3. 帮助校准后只点亮第一题配置的 `s03`，并显示 `rescueCopy`；
4. 第二题输入 `“ 黄 昏！ ”`、第三题输入 `到 家。`，均经规范化命中；
5. 第三题正确后仍停在 `linked`，只有点击“接通三星连线”才进入 `ready`；
6. `ready` 中三个星码词均存在，而最终标题“星图最后指向你”仍不存在；
7. 点击“读出星码”后才创建最终标题、正文、结尾和署名；
8. 点击“重新封存”后回到 intro，`hasFinal: false` 且 `.reveal-sheet` 不存在；
9. 全程浏览器控制台 0 error、0 warning。

## 3. 响应式与可访问性

- 1503×1046：双栏在一个视口内完整显示，主动作、星盘、连接座和封存状态均可见；
- 390×844：标题 → 三题进度 → 星盘 → 主动作 → 封存状态按任务顺序排列；完整页面宽度 `scrollWidth = clientWidth = 390`，无水平溢出；
- 原生 `label + input + submit` 支持键盘操作，动态主动作在阶段切换后获得焦点；
- 星盘 `role="img"` 的描述随点亮数与阶段变化，连接座分别报告接通状态；
- live region 报告答错、点亮、连线、揭晓和重开，不依赖颜色理解结果。

## 4. 阶段 DOM 与本地边界

- `index.html` 不包含三条问题、可接受答案或最终正文；
- 页面没有模块脚本、远程 URL、`fetch`、WebSocket、浏览器存储、文件读取、麦克风或设备动作 API；
- `app.js` 不使用 `innerHTML`，动态私人内容都由 `textContent` 创建；
- 输入只传入纯逻辑比较，状态精确白名单不允许原始答案、规范化答案或配置答案；
- `config.js` 是本机明文配置，不被描述为加密或安全认证。

## 5. 视觉忠实度账本

| 比较点 | 概念目标 | 实现结果 | 判定 |
| --- | --- | --- | --- |
| 构图 | 桌面左星盘、右解码器；手机先标题再星盘和票据 | 桌面 1.58:0.92 双栏，390px 按同一任务顺序重排 | 通过 |
| 核心装置 | 同心刻度、12 个星位、三只连接座 | SVG 代码生成同心环/刻度/虚构星位，连接座与状态同步 | 通过 |
| 材质 | 黑色模拟天文台、旧纸、红铜与琥珀 | 生成式天文台桌面只作边缘背景，UI 使用实体色与硬阴影 | 通过 |
| 信息层级 | 巨型标题、三题进度、星讯票、主动作、封存条 | 各阶段维持同一层级；ready 把连线与读出动作放在视觉中心 | 通过 |
| 阶段反馈 | 点亮星、连线、星码词 | `s03 → s09 → s12` 依序点亮，虚线只连接已解星位，ready 显示三词 | 通过 |
| 窄屏 | 星盘可读、主动作不横溢、顺序自然 | 390px 无横向溢出，星盘保持比例，按钮至少 56px | 通过 |
| 细节取舍 | 概念含写实螺丝、蜡封、压印与密集微刻度 | 生产实现保留语义结构，省略不可交互的拟真装饰与假文字 | 有意简化 |

实现没有使用渐变、玻璃卡片、霓虹光或圆角卡片网格。浏览器截图与概念图均经最终人工对照；实现保留了产品结构和模拟仪器气质，没有把概念图直接当作页面背景。

## 6. 证据截图

- [1503×1046 ready 桌面态](./assets/star-code-unlock/runtime-ready-desktop.png)：三星、连线和三个星码词已出现，最终正文仍封存；
- [390px intro 移动长截图](./assets/star-code-unlock/runtime-intro-mobile.png)：验证任务顺序、星盘比例、按钮与无横向溢出；
- [1503×1046 `file://` 直开首屏](./assets/star-code-unlock/runtime-file-direct.png)：验证 A 级直接打开加载完整。

对应设计概念：[桌面](./assets/star-code-unlock/concept-desktop.png) / [移动](./assets/star-code-unlock/concept-mobile.png)。完整来源与生成资产声明见 [`../experiences/surprises/star-code-unlock/assets/ATTRIBUTION.md`](../experiences/surprises/star-code-unlock/assets/ATTRIBUTION.md)。

## 7. 已修复问题与已知边界

- 已修复：0°/90°/180°/270° 与 N/E/S/W 使用同一坐标而重叠，见 [`../bugs/2026-07-18-star-code-axis-label-overlap.md`](../bugs/2026-07-18-star-code-axis-label-overlap.md)；
- 已知边界：能读取 `config.js` 源码的人可以看到答案与最终文案；
- 已知边界：答案规范化处理兼容字符、大小写、空白和标点，不推断同义词；
- 已知边界：首版固定三题与三个不重复星位，不提供题数编辑器。
