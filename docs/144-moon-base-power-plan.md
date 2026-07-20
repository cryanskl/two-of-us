# “月面，保持有光”实现计划

> 对应调研、规格与视觉：[`141-moon-base-power-research.md`](./141-moon-base-power-research.md)、[`142-moon-base-power-spec.md`](./142-moon-base-power-spec.md)、[`143-moon-base-power-design.md`](./143-moon-base-power-design.md)。本计划按“可独立验收、可独立提交、文件不重叠”拆分。

## 1. 目标与完成定义

在 `experiences/co-op/moon-base-power/` 完成一个 A 级、同设备双人、固定三班的本地合作作品：电源席控制太阳能、蓄电池和联络，负载席安排氧气、照明和通信；每班必须找到唯一安全路由并连续稳定 90 tick。

完成必须同时满足：

1. 双击 `index.html` 在 `file://` 可完整完成三班；
2. 无框架、构建、网络、存储、随机、音频、外部字体或运行依赖；
3. 324 个原始状态/班穷举，三班各恰好一个安全向量；
4. evaluator、reducer、state validator、view 与 replay 严格、确定且不共享引用；
5. 键盘、触控、暂停、失焦、隐藏和长帧安全；
6. 320×700、390×844、1440×900 通过浏览器与截图验收；
7. README 与 ATTRIBUTION 写明固定来源、许可证、ImageGen 和零复制边界；
8. catalog、分类 README、自动断言、bugs、learn 与最终验证记录完整；
9. 每个完成项目或部分独立 commit。

## 2. 固定文件边界

```text
experiences/co-op/moon-base-power/
├── index.html
├── styles.css
├── levels.js
├── config.js
├── logic.js
├── logic.test.js
├── app.js
├── README.md
├── ATTRIBUTION.md
└── assets/
    ├── control-room-background.png
    └── favicon.svg
```

背景运行资产从已提交的 `docs/assets/moon-base-power/control-room-background-source.png` 导出，不覆盖源稿。所有 JS 使用经典脚本与 UMD/CommonJS 双暴露；不得新增 npm 包。若现有统一图像运行时可稳定导出 WebP 且浏览器矩阵通过，可把运行文件改为 `.webp`，文档源稿仍保留 PNG。

## 3. 子任务 A：纯逻辑、班次与测试

### 文件所有权

- `experiences/co-op/moon-base-power/levels.js`
- `experiences/co-op/moon-base-power/config.js`
- `experiences/co-op/moon-base-power/logic.js`
- `experiences/co-op/moon-base-power/logic.test.js`

不得修改界面、catalog、docs、bugs、learn 或任何既有作品。

### 必须实现

1. `MoonBasePowerLevels`：递归冻结三班 exact data、允许母线和联络要求；
2. `MoonBasePowerConfig`：默认席位/文案、逐字段清洗、`composeCompletionNote(summary)`；
3. `MoonBasePowerLogic`：严格 plain-data schema、`evaluateGrid`、安全向量穷举、不可变 reducer、`isPowerState`、输入分类、public view 与 replay；
4. 供应/需求/余缺/联络传输/最终供给严格守恒，联络容量固定为 2；
5. fault 按规格冻结顺序返回，非法输入统一为全零 `invalid-input`；
6. 30Hz 整数 tick，安全连续 90 tick 完成本班，任何不安全状态立即归零；
7. intro/handoff/operating/paused/shift-result/complete 全阶段与 revision 规则；
8. 用户学习位：`composeCompletionNote(summary)` 保留 5–10 行、默认可运行的 TODO，只基于冻结摘要生成本地结语。

### 测试 Gate

- 三班数据精确、递归冻结、无共享引用；
- 每班 324 个原始状态均求值，恰好一个安全向量且与规格一致；
- 维护班联络闭合只报 `tie-maintenance`，需联络班断开只报 `tie-required`，闭合无流只报 `tie-idle`；
- 双向传输、容量上限、禁止端口、缺供、过载和严格守恒；
- fault 顺序、非法 evaluation 规范形、输入对象多余字段/访问器/Proxy 安全失败；
- load cycle 严格使用 `[off,...allowedBuses]`，非法当前值回 `off`；
- A/S/D、J/K/L 分类，repeat 或 ctrl/alt/meta/shift 一律忽略；
- 89 tick 不完成、90 tick 完成、不安全归零；
- pause/resume、manual/blur/hidden/long-frame、restart revision 与长帧外壳合同；
- `isPowerState` 覆盖所有跨字段不变量和阶段一致性；
- public view 不泄露 raw config、函数或内部动作日志；
- replay 深相等且不修改输入动作。

### 验收与提交

根任务审查 evaluator 决策表、严格 schema、穷举结果和阶段不变量，执行单文件测试、全量 `npm test`、`npm run verify`，独立提交：`feat: add moon base power logic`。

## 4. 子任务 B：原生界面与输入外壳

### 文件所有权

- `experiences/co-op/moon-base-power/index.html`
- `experiences/co-op/moon-base-power/styles.css`
- `experiences/co-op/moon-base-power/app.js`
- `experiences/co-op/moon-base-power/README.md`
- `experiences/co-op/moon-base-power/ATTRIBUTION.md`
- `experiences/co-op/moon-base-power/assets/control-room-background.png` 或经验证的 `.webp`
- `experiences/co-op/moon-base-power/assets/favicon.svg`

不得修改子任务 A 文件、catalog、docs、bugs 或 learn。

### 必须实现

1. 语义 HTML：utility bar、H1、班次、双母线、联络、三负载、fault live region、稳定 progress、双席控制和本地说明；
2. 阶段 DOM：intro/handoff/operating/paused/shift-result/complete，非当前阶段动作从 DOM 移除；
3. 输入：电源席 A/S/D、负载席 J/K/L 及六个 pointer/click 按钮，严格委托 logic 分类和 reducer；
4. rAF accumulator：30Hz、最多追赶 5 tick；单帧超过预算时不消费 tick，暂停并清 accumulator；
5. ready/resume 后第一帧只记录 timestamp，不偷跑一个 tick；
6. blur、visibilitychange 和手动暂停都清输入/时间状态并进入逻辑暂停；
7. 电网使用 HTML/CSS/内联 SVG 映射 public view；背景加载失败时仍完整可玩；
8. 真实焦点流、48px 控件、reduced motion、forced colors、200% 文本缩放和窄屏无横向滚动；
9. README 写启动、规则、控制、隐私、实现边界和文档链接；
10. ATTRIBUTION 固定列出参考版本、许可证主体、NASA 事实来源、ImageGen 资产与零复制声明。

### 约束

- app 只能调用 `MoonBasePowerLogic`，不得复制 evaluator、fault 或阶段规则；
- 不能用 Canvas、innerHTML、eval、module、fetch、存储或网络；
- 所有配置内容使用 `textContent`；
- `prefers-reduced-motion` 只影响表现，不改变 tick；
- 生产文案以规格和设计文案锁为准，概念图错误一律不进入代码；
- 不新增设置、音效、振动、主题、排行榜、统计或分享。

### 验收与提交

根任务在逻辑提交之后审查状态投影、时间循环、阶段 DOM、来源声明与资产降级，运行静态边界检查、全量 `npm test`、`npm run verify`，独立提交：`feat: add moon base power interface`。

## 5. 根任务集成

### 目录与自动化

- 向 `experiences/catalog.json` 增加 `moon-base-power` A 级 co-op 记录；
- 更新 `experiences/co-op/README.md`、`docs/README.md` 和需要的仓库概览计数；
- 在 `shared/runtime/catalog.test.js` 增加入口、file 协议、网络/存储/规则来源/资产边界断言；
- 运行 `npm test` 与 `npm run verify`，独立提交：`feat: catalog moon base power`。

### bugs / learn / 验证证据

- 实现或浏览器验收发现的真实 bug 每项一文件写入 `bugs/`；
- 把“双母线守恒、联络决策表、唯一安全向量穷举、连续安全窗和长帧零消费”沉淀到 `learn/`；
- 新增最终验证文档，记录测试数、浏览器视口、控制台、截图、阶段 DOM、资源降级和 fidelity ledger；
- 若验证需要修复，修复与对应 bug 记录一起独立提交；纯验证证据最后独立提交。

## 6. 浏览器验收路径

1. 从仓库入口打开作品，再直接用 `file://` 打开；
2. 第一班用键盘完成，第二班用点击完成，第三班混合输入完成；
3. 每班先构造至少两种故障，再恢复唯一安全向量并连续稳定 90 tick；
4. 验证联络维护、联络必需、方向错误、容量、禁止端口、缺供和过载文案；
5. operating 中手动暂停、失焦、隐藏、长帧，核对稳定进度不偷跑；
6. 终局核对三班记录、共享留言、唯一“重新值班”和 revision 重置；
7. 1440×900、390×844、320×700 检查溢出、48px 目标、两席控制可达；
8. reduced motion、forced colors、背景阻断和 200% 文本缩放；
9. 控制台零错误，Network 无公网请求；
10. 在同一轮用 `view_image(detail=original)` 对照获选概念和最新桌面/移动截图；
11. 逐项记录至少五条 fidelity ledger 与首屏文案 diff。

## 7. 提交序列

```text
docs: research moon base power              # 已完成 6e37960
docs: correct moon power tag metadata       # 已完成 fd7b7e4
docs: specify moon base power               # 已完成 834b3f8
design: define moon base power visuals      # 已完成 135c75e
docs: plan moon base power implementation   # 本部分
feat: add moon base power logic
feat: add moon base power interface
feat: catalog moon base power
fix: ...                                    # 仅真实 bug，按问题独立
docs: verify moon base power
```
