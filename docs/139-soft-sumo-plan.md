# “软软相扑”实现计划

> 对应调研、规格与视觉：[`136-soft-sumo-research.md`](./136-soft-sumo-research.md)、[`137-soft-sumo-spec.md`](./137-soft-sumo-spec.md)、[`138-soft-sumo-design.md`](./138-soft-sumo-design.md)。本计划按“可独立验收、可独立提交、文件不重叠”拆分。

## 1. 目标与完成定义

在 `experiences/versus/soft-sumo/` 完成一个 A 级、同设备双人、固定三轮的本地对抗作品：双方转向、按住蓄力、松开冲刺，以确定性整数固定步模拟互相推动，严格按同一 tick 原子判定出圈。

完成必须同时满足：

1. 双击 `index.html` 在 `file://` 可完整玩完三轮；
2. 无框架、构建、网络、存储、随机、音频或外部字体；
3. 逻辑 JSON 往返、严格验证、输入日志与 session replay 确定；
4. 键盘、触控、暂停、失焦、隐藏、长帧和 pointer cancel 安全；
5. 320×700、390×844、1440×900 通过浏览器与截图验收；
6. README 与 ATTRIBUTION 写明固定来源、许可证、ImageGen 和零复制边界；
7. catalog、分类 README、自动化断言、bugs、learn 与最终验证记录完整；
8. 每个完成部分独立 commit。

## 2. 固定文件边界

```text
experiences/versus/soft-sumo/
├── index.html
├── styles.css
├── config.js
├── logic.js
├── logic.test.js
├── app.js
├── README.md
├── ATTRIBUTION.md
└── assets/
    ├── arena-background.webp
    ├── token-atlas.webp
    └── favicon.svg
```

已有两个 WebP 资产只读，不得重新生成或覆盖。所有 JS 使用经典脚本与 UMD/CommonJS 双暴露；不得新增 npm 包。

## 3. 子任务 A：纯逻辑与测试

### 文件所有权

- `experiences/versus/soft-sumo/config.js`
- `experiences/versus/soft-sumo/logic.js`
- `experiences/versus/soft-sumo/logic.test.js`

### 必须实现

1. `SoftSumoConfig`：`DEFAULT_CONFIG` 与 `composeMatchNote(summary)`；
2. `SoftSumoLogic`：规格列出的常量、方向 LUT、整数平方根、配置清洗、出生点、半径收缩、冲刺、碰撞、原子出圈、不可变 reducer、严格 state 校验、round replay、session replay 和 public view；
3. 安全输入：精确普通对象 schema、拒绝 getter/Proxy/thenable/额外字段和非有限数；
4. 对称性：交换双方与镜像场景只交换赢家，不引入 seat 偏置；
5. 用户学习位：`composeMatchNote` 保留 5–10 行、默认可运行的 TODO，只允许基于冻结 summary 改写结语。

### 测试 Gate

- 默认与恶意配置清洗、递归冻结、断引用；
- 64 方向表精确对称、三出生轴合法；
- 场地边界等号仍在、严格大于才出；
- charge edge、最小/最大冲量、cooldown、drag、速度上限；
- 正面、擦边、重叠、静止重叠和双方交换碰撞；
- 单出圈、同 tick 双出圈、三轮比分与平局；
- pause 取消 charge 但保留 cooldown/运动，resume 倒数不偷跑；
- frame 分组无关的固定步结果由纯逻辑输入序列证明；
- current round、completed rounds 与完整 session replay 深相等；
- public view 不泄露速度、日志、raw config 或函数；
- 畸形 state/action 不抛出且不污染可信快路径。

### 验收与提交

根任务审查 API、攻击面和对称测试，执行该文件测试、全量 `npm test`、`npm run verify`，独立提交：`feat: add soft sumo logic`。

## 4. 子任务 B：原生界面与输入外壳

### 文件所有权

- `experiences/versus/soft-sumo/index.html`
- `experiences/versus/soft-sumo/styles.css`
- `experiences/versus/soft-sumo/app.js`
- `experiences/versus/soft-sumo/README.md`
- `experiences/versus/soft-sumo/ATTRIBUTION.md`
- `experiences/versus/soft-sumo/assets/favicon.svg`

不得修改子任务 A 文件、两个已有 WebP、catalog、docs、bugs 或 learn。

### 必须实现

1. 语义 HTML：utility bar、H1、比分/轮次、arena heading、状态 live region、阶段动作容器、本地隐私说明；
2. 阶段 DOM：intro/countdown/playing/paused/round-result/match-result，非当前控制从 DOM 移除；
3. 输入汇总：P0 A/W/D，P1 Left/Up/Right，双方三个 pointer button；turn 为离散 held 合成，charge 使用 pointer capture；
4. pointerup/cancel/lostpointercapture、keyup、blur、visibilitychange 和 stalled 都清 held；
5. rAF accumulator：60 tick、最多追赶 5 tick、500ms 长帧安全暂停；
6. arena DOM 映射与图集状态，图片失败有 CSS 圆垫/棋子回退；
7. 真实 focus 流、48px 控制、reduced motion、forced colors、200% 文本缩放和窄屏无横向滚动；
8. README 写启动、规则、控制、隐私、实现边界和文档链接；
9. ATTRIBUTION 固定列出研究来源 commit、MIT 权利主体、平台规范、ImageGen 资产、排除仓库和零复制声明。

### 约束

- app 只能调用 `SoftSumoLogic`，不得复制物理或胜负规则；
- 不能用 Canvas、innerHTML、eval、module、fetch、存储或网络；
- `prefers-reduced-motion` 只影响表现，不影响 tick；
- 生产文案以规格为准，概念图中的错误文字一律不进入代码；
- 视觉以 [`138-soft-sumo-design.md`](./138-soft-sumo-design.md) 为依据，但移动概念只作层级参考。

### 验收与提交

根任务在逻辑提交之后合并审查，运行静态边界检查、全量 `npm test`、`npm run verify`，独立提交：`feat: add soft sumo interface`。

## 5. 根任务集成

### 目录与自动化

- 向 `experiences/catalog.json` 增加 `soft-sumo` A 级 versus 记录；
- 更新 `experiences/versus/README.md` 和需要的仓库概览计数；
- 在 `shared/runtime/catalog.test.js` 增加入口、file 协议、网络/存储/借鉴/资产边界断言；
- 运行 `npm test` 与 `npm run verify`，独立提交：`feat: catalog soft sumo`。

### bugs / learn / 验证证据

- 实现或浏览器验收发现的真实 bug 每项一文件写入 `bugs/`；
- 把“原子双出圈、等质量冲量、暂停归中立与 replay 校验”沉淀到 `learn/`；
- 新增最终验证文档，记录测试数、浏览器视口、控制台、截图、可访问性和 fidelity ledger；
- 若验证需要修复，修复与对应 bug 记录一起独立提交；纯验证证据最后独立提交。

## 6. 浏览器验收路径

1. 从仓库入口打开作品，再直接用 `file://` 打开；
2. 键盘完成至少一轮，触控模拟完成至少一轮；
3. 验证短蓄力、满蓄力、转向、冷却、碰撞与场地缩小；
4. 强制单出圈与同 tick 双出圈，核对比分和三轮终局；
5. playing 中手动暂停、失焦、隐藏、长帧与 pointer cancel；
6. 1440×900、390×844、320×700 检查溢出、48px 目标与第二席可达；
7. reduced motion、forced colors、图片阻断和 200% 文本缩放；
8. 控制台零错误，Network 无公网请求；
9. 在同一轮用 `view_image(detail=original)` 对照获选概念和最新桌面/移动截图；
10. 至少记录五项 fidelity ledger 与首屏文案 diff。

## 7. 提交序列

```text
docs: research soft sumo              # 已完成 8c83f58
docs: specify soft sumo               # 已完成 3d4d956
design: define soft sumo visuals      # 已完成 c7979aa
docs: plan soft sumo implementation   # 本部分
feat: add soft sumo logic
feat: add soft sumo interface
feat: catalog soft sumo
fix: ...                              # 仅真实 bug，按问题独立
docs: verify soft sumo
```
