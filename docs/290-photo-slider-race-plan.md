# Photo Slider Race 实施计划

## 1. 计划目标

把 `289-photo-slider-race-spec.md` 实现为一个 A 级、无依赖、本地点开即玩的双人照片滑块竞速项目，并以“小批次实现 → 对应验证 → 独立提交”的方式交付。

本计划不授权修改共享入口、目录索引、根 README 或 `experiences/catalog.json`。这些属于后续集成批次。

## 2. 前置条件

实现前确认：

- 当前 worktree 和分支专用于 `photo-slider-race`。
- 研究、brainstorm、spec、plan 四份文档已各自提交。
- 工作区无来源不明的未提交改动。
- Node/npm 能运行仓库既有验证脚本。
- 目标浏览器支持所需本地测试。

每次写入和每次提交前执行：

```bash
git branch --show-current && git rev-parse --show-toplevel
```

若输出不是当前任务的预期分支与 worktree，立即停止写入。

## 3. 依赖策略

### 3.1 首版依赖结论

**不新增运行时依赖，也不新增开发依赖。**

使用：

- HTML、CSS、经典 JavaScript。
- `File`、`createImageBitmap`、Canvas、Blob、Object URL。
- `performance.now()`、Page Visibility API。
- 仓库现有 Node 测试和 verify 基础设施。

不使用：

- npm 拼图库、随机库、图片方向库、EXIF 库。
- 前端框架、打包器、CSS 框架。
- CDN、远程字体、图标库。
- 服务端或数据库。

这已经满足“依赖统一”：项目完全沿用仓库现有工具链，不创造项目私有安装步骤。若实现发现必须新增依赖，应暂停并回到规格评审，不能直接安装。

### 3.2 浏览器能力门槛

自定义照片依赖 `createImageBitmap(file, { imageOrientation: "from-image" })`。若目标浏览器不支持：

- 内置图仍完整可玩。
- 自定义照片显示受控提示。
- 不引入额外 polyfill 或远程服务。

## 4. 实施分工原则

本项目适合按边界拆给独立实现子任务，但同一时间不得让多个任务编辑同一文件：

1. 逻辑任务只写 `logic.js`、`logic.test.js`。
2. UI 任务在逻辑接口冻结后写 `index.html`、`style.css`、`app.js`。
3. 文档任务写项目 README 和真实的 bugs/learn 记录。
4. 验收任务以只读检查为主；发现问题回到拥有对应文件的任务修复。

每个子任务必须先阅读研究、brainstorm、spec 和本计划，不得凭摘要改写公平规则。

## 5. 阶段 0：工作区与基线检查

### 任务

- 运行分支/worktree 检查。
- 记录基线 SHA。
- 运行 `git status --short`。
- 运行一次 `npm run verify`，确认基线健康。
- 检查目标目录尚不存在或确认其已有状态。
- 搜索是否有相关并行 worktree/分支正在编辑相同路径。

### 验收

- 基线验证通过。
- 工作区干净，或未提交改动已确认与本任务无冲突。
- 没有覆盖用户文件的风险。

### 提交

无文件变化，不提交。

若基线 verify 失败，只记录为基线阻塞并回报；不要为开始本项目而顺手修复无关问题。

## 6. 阶段 1：纯拼图与公平结算逻辑

### 目标文件

- `experiences/versus/photo-slider-race/logic.js`
- `experiences/versus/photo-slider-race/logic.test.js`

### 任务 1.1：排列和移动

实现：

- 常量和完成态。
- 排列合法性。
- 空格合法方向。
- 按空格方向移动。
- 按图块索引移动。
- 完成检测。
- 曼哈顿距离。

测试：

- 角、边、中心空格。
- 所有越界方向。
- 相邻/不相邻点击。
- 数组不被原地修改。
- 有效移动保持合法排列。

### 任务 1.2：确定性可解洗牌

实现：

- 显式 seed 的确定性随机。
- 从完成态执行 96 次合法移动。
- 排除立即反向。
- 完成态和距离门槛重试。
- 最大尝试次数和受控失败。

测试：

- 同 seed 同结果。
- 多个 seed 有变化。
- 结果合法、非完成态、达到距离门槛。
- 1000 个固定 seed 全部成功。
- 记录合法轨迹或用等价不变量证明由完成态可达。

### 任务 1.3：棋盘状态与结算

实现：

- `createBoard`。
- 有效/无效/锁定移动。
- 完成时间。
- 有效用时。
- `<=100 ms` 并列边界。
- 左右对称胜负。

测试：

- 步数只在有效移动增加。
- 已完成和锁定拒绝移动。
- 暂停时间扣除。
- 99.999、100、100.001 ms 边界。
- 未完成方用时为 null。

### 阶段验证

```bash
node experiences/versus/photo-slider-race/logic.test.js
npm run verify
git diff --check
```

### 独立提交

提交前再次检查分支/worktree，然后只暂存这两个文件：

```bash
git add \
  experiences/versus/photo-slider-race/logic.js \
  experiences/versus/photo-slider-race/logic.test.js
git commit -m "feat: add photo slider race logic"
```

不得使用 `--amend`。若 hook 失败，修复后重新 add 并创建新提交。

## 7. 阶段 2：静态页面与原创默认图

### 目标文件

- `experiences/versus/photo-slider-race/index.html`
- `experiences/versus/photo-slider-race/style.css`
- `experiences/versus/photo-slider-race/app.js`

### 任务 2.1：语义骨架

实现：

- 页面标题、规则、隐私和图片权利提示。
- setup、instructions、arena、result 区域。
- 左右棋盘的独立 section。
- 原生文件输入与操作按钮。
- live region。
- 相对经典脚本加载。

先不实现完整状态机，但页面打开不得报错。

### 任务 2.2：原创默认图

在 `app.js` 内实现确定性 Canvas 绘制：

- 深色渐变。
- 暖金/珊瑚行星。
- 轨道、星点和中心双星。
- 1200×1200 输出。
- 转 Blob 和 active URL。

默认图不引用任何外部资源。

### 任务 2.3：棋盘渲染

- 两块棋盘共用图片 URL。
- 九格定位使用 CSS 背景裁切或等价技术。
- 空格不交互。
- 图块使用原生按钮和完整可访问名称。
- 渲染不修改逻辑状态。

### 任务 2.4：响应式基础

- 桌面双板对称。
- 390/320 双板并排。
- 不横向滚动。
- 图块至少 44×44。
- 明显焦点。
- 减少动态规则。

### 阶段验证

- 在 localhost 打开，确认默认图、双棋盘和文案。
- 检查 1440、1024、390、320 视口。
- 检查控制台无错误。
- 检查网络面板无远程请求。
- 运行：

```bash
npm run verify
git diff --check
```

### 独立提交

```bash
git add \
  experiences/versus/photo-slider-race/index.html \
  experiences/versus/photo-slider-race/style.css \
  experiences/versus/photo-slider-race/app.js
git commit -m "feat: add photo slider race interface"
```

只在默认图页面与响应式基础通过后提交。

## 8. 阶段 3：本地照片安全管线

### 目标文件

- `experiences/versus/photo-slider-race/app.js`
- 必要时补充 `style.css` 的错误/加载状态
- 浏览器测试文件（若仓库已有对应位置）

### 任务 3.1：选择与验证

- 文件取消无错误。
- MIME 白名单。
- 20 MiB 上限。
- generation 递增。
- loading 期间当前图保持。

### 任务 3.2：方向解码和尺寸

- `createImageBitmap(..., { imageOrientation: "from-image" })`。
- 校验短边、最长边和总像素。
- 所有路径在 finally 关闭 bitmap。
- API 缺失时保留当前图。

### 任务 3.3：裁切、编码与 URL

- 中心正方形裁切。
- 输出最长 1200。
- JPEG 0.9 Blob。
- 候选 URL 两阶段提交。
- 左右棋盘共享 active URL。
- 旧任务结果过期即 revoke。
- 换图、恢复内置图、pagehide、beforeunload 幂等清理。

### 任务 3.4：错误体验

- 实现规格中的错误码到中文信息映射。
- 不展示原文件名、内部异常或 Blob URL。
- 任何失败都不破坏当前图片。

### 阶段验证

样例矩阵：

- 普通横向 JPEG。
- 带方向元数据的竖向 JPEG。
- PNG。
- WebP。
- 错误扩展/MIME。
- 超过 20 MiB。
- 短边不足。
- 边长超过 6000。
- 总像素超过 2400 万。
- 损坏图片。
- 快速连续选择两张图。
- 连续换图至少 20 次。

利用受控 spy 验证：

- 新 URL 生效前旧 URL 未 revoke。
- 过期候选 URL 被 revoke。
- 每个已替换 URL 恰当清理。
- 当前 URL 只在替换或卸载时清理。
- 每个成功创建的 ImageBitmap 都 close。

运行：

```bash
npm run verify
git diff --check
```

### 独立提交

```bash
git add \
  experiences/versus/photo-slider-race/app.js \
  experiences/versus/photo-slider-race/style.css
git add <本阶段新增的浏览器测试文件>
git commit -m "feat: add private local photo handling"
```

只暂存实际修改文件；占位符不能原样执行。

## 9. 阶段 4：比赛状态机与双人输入

### 目标文件

- `experiences/versus/photo-slider-race/app.js`
- `experiences/versus/photo-slider-race/style.css`
- 对应浏览器测试

### 任务 4.1：开局

- 点击开始生成一次排列。
- 左右复制为独立对象。
- 3、2、1 倒计时。
- 同一时刻设置 `raceStartedAt` 并解锁。

### 任务 4.2：输入

- 左 WASD、右方向键。
- 忽略 repeat、组合键和控件内按键。
- 仅处理后阻止默认滚动。
- 点击相邻块。
- 非法移动不计步。
- 两方状态只修改自己的棋盘。

### 任务 4.3：计时、完成和结算

- rAF 只更新显示。
- 每次移动后检测完成。
- 第一方锁定，另一方保留 100 ms。
- deadline 基于单调时钟。
- 胜、负、并列结果。
- 未完成方显示“未完成”。

### 任务 4.4：暂停与恢复

- hidden 或 blur 暂停。
- 同时冻结有效用时和剩余结算窗口。
- 自动回到前台不直接继续。
- 点击继续后短倒计时。
- 不在后台补跑。

### 任务 4.5：重开

- 同图再来一局，产生新共同排列。
- 换图返回 setup。
- 所有计时器、rAF 和输入状态清理。
- 不泄漏上局胜负或完成时间。

### 阶段验证

必须自动或受控验证：

- 倒计时输入锁。
- 左右输入隔离。
- repeat 忽略。
- 同局逐格相同、引用独立。
- 第一方完成后另一方仍可移动。
- 100 ms 边界。
- 暂停和恢复倒计时。
- rematch 不换图但换局面。
- race 中不能换图。

运行：

```bash
node experiences/versus/photo-slider-race/logic.test.js
npm run verify
git diff --check
```

### 独立提交

```bash
git add \
  experiences/versus/photo-slider-race/app.js \
  experiences/versus/photo-slider-race/style.css
git add <本阶段新增或修改的浏览器测试文件>
git commit -m "feat: add fair two-player puzzle race"
```

## 10. 阶段 5：可访问性与响应式验收修正

### 任务 5.1：键盘和辅助技术

- Tab 顺序符合页面顺序。
- 所有图块名称准确更新。
- live region 宣告倒计时、暂停、恢复和结果。
- 焦点环不裁切。
- 不使用冲突的 ARIA grid。
- 仅键盘可完成两方操作。

### 任务 5.2：触控

- 390 和 320 视口双棋盘并排。
- 每个目标至少 44×44。
- 点击由 click 提交，可取消 pointerdown。
- 不阻断缩放或页面必要滚动。

### 任务 5.3：视觉与动态

- 左右双方颜色之外有文字/徽记差异。
- 胜负不只变色。
- 减少动态关闭位移动画。
- 200% 缩放功能仍完整。

### 阶段验证

浏览器逐个视口截图并记录：

- 1440×900
- 1024×768
- 390×844
- 320×568

同时执行 DOM 尺寸断言、横向滚动断言和键盘走查。

最后运行：

```bash
npm run verify
git diff --check
```

### 独立提交

只有发生实际修正时提交：

```bash
git add <本阶段实际修改文件>
git commit -m "fix: refine photo slider race accessibility"
```

若无需修改，不制造空提交；把通过证据写入验证文档阶段。

## 11. 阶段 6：项目 README、借鉴声明和沉淀

### 目标文件

- `experiences/versus/photo-slider-race/README.md`
- `bugs/` 下的真实缺陷记录（仅在实际发生时）
- `learn/` 下的真实学习记录（仅在确有可复用价值时）

### README 必须包含

- 玩法和键位。
- 本地点开说明。
- 照片格式、尺寸和内存限制。
- “不上传、不保存”的准确边界。
- 图片权利提示。
- 浏览器能力限制。
- 测试命令。
- 借鉴声明。

首版预期借鉴声明：

> 本项目为独立实现。未复制或改编任何开源滑块拼图项目的代码、视觉素材或规则文本。实现依据为公开 Web 标准，内置图由本项目代码原创生成。

如果实现事实不同，必须按真实情况列出开源项目、URL、许可证、借鉴范围与改写边界，不能保留“独立实现”的错误声明。

### bugs 记录规则

仅记录真实出现并有证据的问题。建议文件：

```text
bugs/photo-slider-race-<short-slug>.md
```

内容：

- 现象。
- 环境和复现步骤。
- 根因。
- 修复。
- 防回归测试。
- 修复提交。

不为“看起来完整”创建虚假 bug。

### learn 记录规则

仅在结论对其他本地 HTML 项目可复用时记录。候选主题：

- `createImageBitmap` 方向处理和像素内存门槛。
- Blob URL 两阶段替换。
- 同设备竞速的单调时钟和暂停协议。
- ARIA grid 与游戏方向键冲突的取舍。

建议文件：

```text
learn/photo-slider-race-<topic>.md
```

内容必须包含适用边界和验证证据，不能只是开发日志。

### 阶段验证

- README 所述命令与实际一致。
- 声明与实际来源一致。
- bugs/learn 只包含真实记录。
- 所有本地链接有效。

### 独立提交

```bash
git add experiences/versus/photo-slider-race/README.md
git add <本阶段真实新增的 bugs/learn 文件>
git commit -m "docs: document photo slider race"
```

## 12. 阶段 7：最终验证

### 12.1 逻辑与仓库

```bash
node experiences/versus/photo-slider-race/logic.test.js
npm run verify
git diff --check
git status --short
```

### 12.2 静态离线扫描

```bash
rg -n \
  'https?://|fetch\\(|XMLHttpRequest|WebSocket|sendBeacon|localStorage|sessionStorage|indexedDB|serviceWorker|caches\\.' \
  experiences/versus/photo-slider-race
```

人工分类每个命中：

- README 中的说明性来源链接：允许。
- 运行时远程资源或受禁 API：失败。

另检查：

```bash
rg -n \
  '<script[^>]+src=|<link[^>]+href=|url\\(' \
  experiences/versus/photo-slider-race
```

确认所有运行时资源均为相对本地资源或本页生成的 Blob。

### 12.3 浏览器

完成规格第 19、20 节的交互、响应式和可访问性矩阵。UI 改动必须用 Chrome 浏览器控制能力验证；截图只作为布局证据，不能代替键盘和状态机交互。

### 12.4 人工 `file://`

断网，从文件管理器双击：

```text
experiences/versus/photo-slider-race/index.html
```

完成：

1. 默认图完整一局。
2. 含方向元数据的竖图一局。
3. 换图、暂停、恢复、重开。
4. 刷新后照片和成绩未恢复。
5. 无远程请求。

若受控浏览器不允许 `file://`，记录为工具限制，但仍必须由人工双击完成证明。

### 12.5 最终状态

- `git status --short` 必须为空。
- 每个阶段都有独立提交或明确说明无改动。
- 不存在未记录的真实缺陷。
- 不存在虚构 bugs/learn。
- 不修改共享文件。

最终验证本身若只产生验证证据文档，应单独提交；若没有文件变化，不创建空提交。

## 13. 建议提交序列

| 顺序 | 提交信息 | 内容 |
| --- | --- | --- |
| 1 | `feat: add photo slider race logic` | 纯逻辑和单元测试 |
| 2 | `feat: add photo slider race interface` | 语义页面、默认图、双棋盘、响应式基础 |
| 3 | `feat: add private local photo handling` | 照片验证、方向、裁切、URL 生命周期 |
| 4 | `feat: add fair two-player puzzle race` | 状态机、输入、计时、结算、暂停 |
| 5 | `fix: refine photo slider race accessibility` | 仅在确有修正时 |
| 6 | `docs: document photo slider race` | README、真实 bugs/learn |
| 7 | `test: verify photo slider race experience` | 仅在新增验证文件或记录时 |

提交原则：

- 一次提交只服务一个清晰阶段。
- 每次提交前运行该阶段验证。
- 每次提交前检查分支/worktree。
- 精确暂存，不使用 `git add .`。
- hook 失败后修复并创建新提交，不 `--amend`。
- 不进行破坏性 git 操作。

## 14. 失败处理

### 14.1 逻辑失败

若 1000 seed 测试或结算边界不稳定：

- 停止 UI 集成。
- 在纯逻辑层修复。
- 为失败样例增加固定回归测试。
- 真实缺陷在修复完成后写入 bugs。

### 14.2 照片失败

若方向、内存或 URL 生命周期无法在目标浏览器可靠通过：

- 默认图保持可玩。
- 项目整体标为 Conditional。
- 不以忽略异常或去掉限制“解决”。
- 记录浏览器版本、样例属性和失败路径。

### 14.3 响应式失败

若 320 px 无法同时满足并排和 44×44：

- 先压缩间距、装饰和非必要中间栏。
- 不把一方棋盘堆到下方。
- 不缩小点击目标掩盖问题。
- 仍失败则标为 Conditional，回到产品决策。

### 14.4 基线或共享冲突

- 不修复范围外文件。
- 不覆盖其他 worktree 的改动。
- 不修改共享 catalog 规避验证。
- 报告阻塞和最小证据，等待集成任务处理。

## 15. 完成定义

只有同时满足以下条件才算项目完成：

- 规格中的必做项全部实现。
- 逻辑、仓库和浏览器测试通过。
- 320/390/1024/1440 响应式通过。
- 人工断网 `file://` 双击通过。
- 默认图完全原创且零外部依赖。
- 自定义照片不上传、不持久化，生命周期清理有证据。
- README 权利与借鉴声明真实。
- bugs/learn 按事实记录。
- 各阶段独立提交。
- 工作区干净。

否则必须明确标为 Conditional 或 No-Go，并列出未满足的验收编号，不能用“基本完成”替代。
