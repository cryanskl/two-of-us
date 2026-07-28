# 「这一颗我先到」验收记录

> 验收日期：2026-07-18。作品入口：[`../experiences/versus/orbit-star-race/index.html`](../experiences/versus/orbit-star-race/index.html)。本记录覆盖纯逻辑、catalog、系统 Chrome `file://` 直开、localhost 完整实玩、三档响应式、素材降级、无障碍终局和视觉忠实度。

## 1. 结论

「这一颗我先到」已达到 A 级本地优先完成标准：

- 可直接打开 `index.html`，无构建、无依赖安装、无账号与公网请求；
- 朱方顺时针、蓝方逆时针，三轨角速度严格遵循归一化 `ω ∝ r^-3/2`；
- 键盘和四个触控按钮进入同一条切轨规则路径；
- 目标先预告 96 个固定步，再按更新后几何距离裁决单人或共享 claim；
- 先到 5 分且不平分的一方获胜，5–5 自动加赛；
- 相同 seed 和输入日志可重放同一星流、claim 和终局；
- 桌面、390px 与 320px 都无横向或纵向溢出；
- 图集或星图失败时，CSS 卫星、星体、太阳和星点降级仍可辨认、可玩；
- 固定资料、四个开源对照、ImageGen 资产和零复制边界均有借鉴声明。

## 2. 自动化结果

### 2.1 纯逻辑与 catalog

命令：

```bash
node --test experiences/versus/orbit-star-race/logic.test.js shared/runtime/catalog.test.js
```

结果：`66 / 66` 通过，其中轨道抢星纯逻辑 `15 / 15`。覆盖：

- 三轨速度单调、角度归一化与跨零最短角差；
- 配置白名单、Unicode 清洗、递归冻结和终局 formatter 回退；
- 同 seed 星流、每组三星覆盖三轨和合法扇区；
- 轨道边界、切轨 cooldown、方向和玩家 Gate；
- `1 / 120` 秒固定步、96 步 preview 与第 97 步捕获；
- 单人、不同距离双人、epsilon 内共享 claim；
- 5 分终局、5–5 共享加赛和 6–5 终局；
- 重开、畸形状态回退、日志严格重放和视图派生。

Catalog 实测为 `37` 个作品，其中 `29` 个 A 级；`orbit-star-race` 已安装、`networkRequired: false`，入口与 README 均为仓库内路径。

### 2.2 全仓与静态 Gate

命令：

```bash
npm test
npm run verify
git diff --check
```

结果：

- 全仓 `462 / 462` 通过；
- 仓库验收通过：`37 个作品入口、1 个能力声明`；
- 空白字符检查通过；
- 作品只用经典相对路径脚本与本地资产，不包含 module、CDN、fetch、存储、Worker 或 Service Worker。

## 3. 本地启动边界

### 3.1 `file://` 直开

系统 Google Chrome 以 headless 模式直接加载：

```text
file://{repo-root}/experiences/versus/orbit-star-race/index.html
```

DOM dump 返回：

- `<title>这一颗我先到 · Two of Us</title>`；
- `<body data-phase="intro">`；
- 三个经典 defer 脚本为 `./config.js`、`./logic.js`、`./app.js`；
- 未进入页面内的“加载失败”后备。

Playwright CLI 自身的安全门禁拒绝导航到 `file://`，所以没有把 localhost 交互冒充为 file 交互；直开启动由系统 Chrome 证明，完整交互由下方 localhost 的同一份静态文件证明。

### 3.2 localhost 实玩

地址：

```text
http://127.0.0.1:4175/experiences/versus/orbit-star-race/index.html
```

资源全部返回 200，最终 console 为 `0 errors / 0 warnings`。不需要 localhost 特性，该路径只用于自动化实玩。

## 4. 真实交互闭环

1. 点击生产“开始抢星”按钮；
2. 检查焦点自动落到朱方 `S 降一轨`；
3. 点击朱方升轨，再按 `ArrowDown`，确认朱方与蓝方只改变自己轨道；
4. 根据页面公开的目标轨道和当前轨道，只调用四个生产按钮连续捕获；
5. 实际进入 `5–1` 终局；
6. 检查“朱方抢先一步”在页面文本中只出现 `1` 次，`#live-region` 为空；
7. 检查焦点为 `#status-title`、目标星 `hidden: true`、四个轨道键全禁用，且只有一个“再绕一圈”；
8. 点击“再绕一圈”，比分回到 `0–0`、第一颗星恢复、四键可用，焦点再次落到朱方 `S`。

本流程同时验证了赛中 Pointer、键盘、终局锁定、无障碍焦点、私人 formatter 的唯一 DOM owner 和重开清盘。

## 5. 响应式几何

| viewport | 文档 `client / scroll` | 星盘 | 轨道键高度 | 结论 |
| --- | --- | --- | --- | --- |
| 1504×1046 | 1504×1046 / 1504×1046 | 720×720 | 54px | 无横纵溢出 |
| 390×844 | 390×844 / 390×844 | 366×366 | 56px | 无横纵溢出 |
| 320×700 | 320×700 / 320×700 | 296×296 | 56px | 无横纵溢出 |

手机顺序为比分 → 标题 / 状态 → 星盘 → 双方控制；320px 只收紧留白和字号，没有隐藏核心信息或缩小触控 Gate。

## 6. 资产与降级

运行时使用两份本地生产资产：

- `assets/star-chart.png`：无字深蓝星图；
- `assets/orbit-sprites.png`：朱 / 蓝卫星、目标星和中央太阳图集。

精灵图生成结果没有真实 alpha，原始哑光底色在星图上暴露方块。实现使用 `mix-blend-mode: lighten`、径向 mask 和新的 stacking context 边界消除底块；同时保留独立 CSS 降级。人工强制 `sprite-missing background-missing` 后，320×700 下仍有红 / 蓝圆形卫星、四芒星、中央太阳和 CSS 星点，规则与按钮不受影响。

## 7. 截图证据

- [桌面待机 1504×1046](./assets/orbit-star-race/runtime-desktop-intro-1504x1046.png)
- [桌面进行态 1504×1046](./assets/orbit-star-race/runtime-desktop-playing-1504x1046.png)
- [桌面 5–1 终局 1504×1046](./assets/orbit-star-race/runtime-desktop-finished-1504x1046.png)
- [手机进行态 390×844](./assets/orbit-star-race/runtime-mobile-playing-390x844.png)
- [极窄进行态 320×700](./assets/orbit-star-race/runtime-narrow-playing-320x700.png)
- [双资产失败降级 320×700](./assets/orbit-star-race/runtime-fallback-320x700.png)

## 8. 视觉 fidelity ledger

同一轮 QA 中以原始尺寸对照了三张接受概念与实际运行截图：

- [`concept-desktop-playing.png`](./assets/orbit-star-race/concept-desktop-playing.png) 与桌面进行态；
- [`concept-mobile-playing.png`](./assets/orbit-star-race/concept-mobile-playing.png) 与 390px 进行态；
- [`concept-desktop-finished.png`](./assets/orbit-star-race/concept-desktop-finished.png) 与 5–1 终局。

| 对照项 | 结果 | 说明 |
| --- | --- | --- |
| 桌面约 35 / 65 构图 | 通过 | 左侧只承担故事、状态与主动作，720px 星盘是视觉主体 |
| 深夜蓝 / 黄铜 / 朱红 / 靛蓝 | 通过 | 背景、轨道、文字和双方标记保持概念色阶 |
| 恰好三轨、两卫星、一目标 | 通过 | 标签、轨道与语义描述相互对应 |
| 单行标题与开放式比分轨 | 通过 | 没有改成营销卡片或胶囊 HUD |
| 手机信息顺序 | 通过 | 比分、文案、星盘、双人控制自上而下 |
| 终局不弹 modal | 通过 | 保留比分和星盘，状态区拥有唯一结果，操作区只留一个重开键 |
| 动态字与按钮保持 DOM | 通过 | 生成资产无文字，比分、状态、轨道键均可聚焦 / 可读 |
| 删除装饰分数精灵 | 主动偏离 | 真实比分使用 DOM 数字和玩家印记，不使用生成的假字形 |
| 星盘机械细节 | 有限偏离 | 实现更平面、更可读，没有复制概念的摄影级金属深度 |
| 卫星拖尾 | 主动偏离 | 首版去掉轨迹拖尾，避免误读为规则路径，reduced motion 也更稳定 |
| 按钮边框重量 | 有限偏离 | 生产版更薄、默认对比更低，hover / focus 时明确提升 |
| 哑光图集融合 | 修复后通过 | 生成棋盘格并非 alpha，用 blend / mask 消除方块而未更改玩法 |

## 9. 来源与借鉴声明

[`assets/ATTRIBUTION.md`](../experiences/versus/orbit-star-race/assets/ATTRIBUTION.md) 已固定：

- NASA / JPL 对开普勒第三定律和圆轨道周期的公开说明；
- `markbrown/keplersballs@81b92ff...`，CC BY-SA 4.0；
- `gianlucatruda/orbital@a5f3741...`，GPL-3.0；
- `sciencemanx/Gravity-Wells@ab0db1e...`，MIT；
- `XDream-Dev/battle-spaceship-game@4570077...`，Apache-2.0；
- 本项目 ImageGen 概念与运行资产。

声明明确：开源项目只用于对照完整轨道模拟、少输入轨迹、同机键区、构建复杂度与许可证风险。本作没有复制、链接、修改或分发它们的代码、数学实现、DOM、CSS、纹理、音频、字体或文案。三轨速度表、seed 星流、反向固定步、共享 claim、中文交互、视觉布局与测试为仓库独立实现。

## 10. 已修复 bug

- [`../bugs/2026-07-18-imagegen-fake-transparent-sprite-atlas.md`](../bugs/2026-07-18-imagegen-fake-transparent-sprite-atlas.md)：预览棋盘格被烘进图片，并非真实透明通道；
- [`../bugs/2026-07-18-orbit-sprite-matte-blocks.md`](../bugs/2026-07-18-orbit-sprite-matte-blocks.md)：哑光精灵在星图上露出方形底块；
- [`../bugs/2026-07-18-orbit-duplicate-terminal-copy.md`](../bugs/2026-07-18-orbit-duplicate-terminal-copy.md)：终局有两套可见文案，且 live region 与聚焦结果会重复播报。

## 11. 完成提交链

| commit | 部分 |
| --- | --- |
| `915434f` | 定向调研、固定来源与零复制边界 |
| `938a65c` | 游戏规格、配置、状态机与 Gate |
| `f1122d3` | 桌面 / 手机 / 终局概念、生产资产与视觉设计 |
| `30926b0` | 实现文案与概念对齐 |
| `9e027cd` | 确定性逻辑、重放和 15 项测试 |
| `db1700d` | 前端、资产融合、降级、catalog 和借鉴声明 |
| `87a7606` | 终局单一 DOM owner 与单一播报修复 |

本验收文档、运行截图和两级索引形成下一个独立 docs 提交。

## 12. 残余边界

- 作品是受开普勒关系启发的街机对抗，不是轨道预测工具或航天教学模拟器；
- 浏览器后台调度不可靠，因此 blur、hidden 和 pagehide 只清空帧累积，返回时不补跑离开时间；
- 当前不提供 AI、联网、长期战绩、音频、自由加速或完整轨道物理，这是首版冻结边界，不是缺失运行依赖。

这些边界不影响 A 级单设备同屏核心闭环。
