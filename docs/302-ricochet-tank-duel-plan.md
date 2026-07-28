# 「这一弹，拐弯见你」实现计划

> ID：`ricochet-tank-duel`
> 前置规格：`docs/301-ricochet-tank-duel-spec.md`
> 执行方式：分阶段、测试先行、每完成一部分独立提交

## 1. 交付原则

实现必须保护以下五项增量：

1. 实时移动；
2. 双方同刻输入；
3. 多枚在途弹体；
4. 多次墙面折射；
5. 同刻命中原子结算。

不能为了赶进度降级为轮流制、单弹制、一次反弹或离散重叠检测。任何核心门槛无法通过时，应暂停并记录原因，不得以近似版本冒充完成。

## 2. 提交纪律

每一阶段满足其测试与验收后立即提交。推荐提交序列：

1. `feat: scaffold ricochet tank duel`
2. `test: define fixed geometry cases`
3. `feat: add deterministic collision geometry`
4. `test: define duel simulation rules`
5. `feat: implement deterministic duel simulation`
6. `feat: add dual input controls`
7. `feat: render ricochet duel`
8. `feat: add accessible duel shell`
9. `test: verify replay fairness and offline play`
10. `docs: document ricochet tank duel`
11. `chore: register ricochet tank duel`

如果一个阶段自然拆成多个独立完成部分，可以增加提交；不得把物理、UI、目录注册和文档压成一个巨型提交。

每次写入和提交前：

```bash
git branch --show-current
git rev-parse --show-toplevel
```

每次提交前至少：

```bash
git diff --check
```

关键阶段与最终交付：

```bash
npm run verify
```

禁止 `--amend`。hook 失败时修复问题、重新暂存并创建新的提交。

## 3. 分工策略

这是非平凡、多文件、物理规则密集的功能，执行时采用 spec 驱动、subagent 分工，但每个子任务必须有互斥文件所有权。

推荐分工：

- 几何代理：`fixed.js`、`geometry.js`、对应测试；
- 模拟代理：`simulation.js`、对应测试；
- 输入 / 页面代理：`input.js`、`accessibility.js`、`index.html`、`style.css`；
- 渲染代理：`renderer.js`；
- 验收代理：重放、镜像、`file://` smoke 和文档审查。

共享文件（`constants.js`、`app.js`、catalog、根 README）只由主实现代理修改。并行代理不能同时编辑同一文件。

每个代理开始前必须完整阅读：

- `docs/orchestration-runbook.md`；
- `docs/299-ricochet-tank-duel-research.md`；
- `docs/300-ricochet-tank-duel-brainstorm.md`；
- `docs/301-ricochet-tank-duel-spec.md`；
- 目标目录下已有约定；
- catalog schema 与验证命令。

## 4. 阶段 0：实现前安全检查

### 目标

确认分支、基线、工作树和目录状态，防止覆盖并行工作。

### 操作

- 确认当前 worktree 和分支；
- 记录基线 SHA；
- `git status --short`；
- 检查 `experiences/versus/ricochet-tank-duel/` 不存在；
- 检查 catalog 没有重复 ID；
- 检查 docs 编号与生产 ID 未被占用；
- 阅读相邻项目 README 和测试约定；
- 运行一次基线 `npm run verify`。

### 退出条件

- 分支 / worktree 与任务一致；
- 工作树无未知修改；
- 基线验证通过；
- 无目录或 ID 冲突。

若有冲突，停止并向总控报告。

## 5. 阶段 1：离线骨架

### 目标

创建可从 `file://` 打开的最小目录和页面，不实现玩法。

### 文件

- `experiences/versus/ricochet-tank-duel/index.html`
- `experiences/versus/ricochet-tank-duel/style.css`
- `experiences/versus/ricochet-tank-duel/js/constants.js`
- `experiences/versus/ricochet-tank-duel/js/app.js`

### 内容

- 语义化页面骨架；
- 标题、玩法一句话、Canvas、状态区、按钮区；
- 经典相对路径脚本；
- no-JS 提示；
- 断网无外部请求；
- Canvas 逻辑尺寸 960×600；
- 初步响应式布局；
- 暂不接物理和输入。

### 测试

- 直接打开 `index.html`；
- 控制台无错误；
- Network 面板无外部请求；
- 断网刷新仍显示完整骨架；
- `rg` 确认无 `fetch(`、`type="module"`、`http://`、`https://` 运行引用。

### 提交

`feat: scaffold ricochet tank duel`

## 6. 阶段 2：先写几何验收用例

### 目标

在实现几何之前冻结最危险的边界答案。

### 文件

- `experiences/versus/ricochet-tank-duel/tests/geometry.test.js`
- 必要的测试入口配置

### 用例

- 水平正碰；
- 垂直正碰；
- 平行无碰撞；
- 从表面向外无重复接触；
- 恰好擦边；
- 高速穿越薄墙；
- 拐角同时命中两轴；
- 两个有理 TOI 的严格排序；
- 完全相等 TOI 的合并；
- 初始重叠失败；
- 活动区边界；
- 最大值乘积安全。

每个 case 必须写明：

- 输入整数；
- 期望 TOI；
- 期望法向；
- 期望表面 ID；
- 是否继续剩余运动。

### 退出条件

- 测试在功能未实现时按预期失败；
- 不使用宽松浮点 epsilon 隐藏并列差异；
- 用例左右镜像成对。

### 提交

`test: define fixed geometry cases`

## 7. 阶段 3：定点几何与连续碰撞

### 目标

实现独立于 DOM / Canvas 的纯几何层。

### 文件

- `js/fixed.js`
- `js/geometry.js`
- `js/constants.js`
- `tests/geometry.test.js`

### 实现顺序

1. Q10 转换与安全整数断言；
2. 有理数比较与相等；
3. 点对扩张 AABB slab sweep；
4. 世界边界接触；
5. 移动圆对圆相对 sweep，保留整数二次方程代数候选；
6. 同 TOI 法向合并；
7. 圆形车体扫掠与切向投影；
8. 稳定 surface ID 排序；
9. `BigInt` 只用于瞬时几何比较与测试 oracle，不进入状态、JSON、重放或哈希。

### 设计检查

- 几何函数无全局状态；
- 不读取真实时间；
- 不读取 DOM；
- 不使用随机数；
- 不依赖渲染尺寸；
- 墙 / 边界输入输出是整数或显式有理表示；
- 圆命中输出整数二次方程代数候选，并能与有理墙时刻精确比较；
- 零时间事件只在“进入”条件成立时有效；
- 初始重叠明确返回错误。

### 退出条件

- 阶段 2 用例全部通过；
- 新增 property / 表格测试覆盖镜像；
- 高速弹体不穿薄墙；
- 拐角事件唯一；
- `git diff --check` 通过。

### 提交

`feat: add deterministic collision geometry`

## 8. 阶段 4：先写模拟规则测试

### 目标

在写状态机前冻结 tick 顺序、计分与上限。

### 文件

- `tests/simulation.test.js`
- `tests/replay.test.js`

### 用例

#### 车辆

- 转向先于移动；
- 前后同时按下抵消；
- 左右同时按下抵消；
- 滑墙；
- 不越活动区；
- 镜像路径。

#### 发射

- 合法创建；
- 贴墙拒绝且不消耗冷却；
- 冷却 24 tick；
- 每方最多 2 枚；
- 发射按边沿，不吃 repeat；
- 左右同 tick 发射不受创建顺序影响。

#### 弹体

- 360 tick 寿命；
- 第 4 次反射销毁；
- 单 tick 允许处理前 4 次接触，第 5 个候选处理前销毁；
- 不自伤；
- 弹体互穿；
- 命中与墙并列时命中优先。

#### 结算

- 单方命中；
- 双方同 tick 命中；
- 同目标多弹只计一分；
- 双方同 tick 到 3 分为平局；
- 时间上限先结算当前 tick；
- 每个 `playing STEP` 无条件累计 `activeMatchTicks`；
- 回合清弹；
- 暂停不推进任何活跃计数。

#### 重放

- 严格动作联合日志（START / STEP / PAUSE / RESUME / RESTART）哈希稳定；
- 改变外部渲染分帧不改变哈希；
- 镜像日志得到镜像状态。

### 提交

`test: define duel simulation rules`

## 9. 阶段 5：确定性模拟核心

### 目标

让完整比赛在纯 JavaScript 数据层运行，不依赖页面。

### 文件

- `js/simulation.js`
- `js/constants.js`
- `tests/simulation.test.js`
- `tests/replay.test.js`

### 实现顺序

1. 初始状态和不变量；
2. 阶段状态机；
3. 输入位掩码消费；
4. 两车意图与分段路径；
5. 发射请求批量提交；
6. 弹体连续事件循环；
7. 全局 `hitSet`；
8. 原子计分和回合重置；
9. 三分制与 90 秒上限；
10. 状态规范化和哈希；
11. 严格动作联合重放；
12. 镜像变换；
13. 低频语义事件。

### 关键审查

- 交换玩家遍历顺序，结果不变；
- 不在命中循环中立即重置；
- 新弹体是否参与本 tick 明确按 spec；
- 车辆分段轨迹用于移动车体命中；
- 墙面使用有理 TOI，圆命中使用代数候选和精确整数比较；
- 每个 playing tick 无条件计时，当前 tick 命中先于时间终局；
- 暂停只接受 countdown / playing；
- 销毁原因可调试；
- 所有循环有上限；
- 所有数组按稳定 ID 规范化；
- 文案不进入哈希。

### 退出条件

- 阶段 4 测试全部通过；
- 固定日志重复 100 次哈希一致；
- 镜像测试通过；
- reduced-motion 标志不进入逻辑；
- 纯 Node 环境可完整跑完一局；
- 没有 DOM / Canvas import。

### 提交

`feat: implement deterministic duel simulation`

## 10. 阶段 6：双人输入

### 目标

把键盘、鼠标和多指触屏统一为每 tick 输入帧。

### 文件

- `js/input.js`
- `index.html`
- `style.css`
- 输入相关测试

### 实现

- 左方 W/S/A/D/F；
- 右方方向键 / Enter；
- P 暂停，Escape 只暂停；
- held source set；
- fire edge；
- 忽略 keyboard repeat；
- 原生按钮；
- pointerId；
- pointer capture；
- up / cancel / lost capture 对称释放；
- blur / hidden / pause / restart 全清；
- 输入字段或按钮焦点时不误发射；
- 不拦截 Tab。

### 手工验证

- 双方同时前进和转向；
- 一方键盘、一方触屏；
- 两侧多指同时按；
- 手指滑出按钮；
- 浏览器触发 pointercancel；
- 长按发射只发一枚；
- 松开再按才产生新边沿；
- 页面失焦后没有卡键；
- 恢复必须重新按键。

### 退出条件

- 所有输入源映射为同一位掩码；
- 不直接从事件回调修改模拟状态；
- 每个 pointerId 只绑定一个动作；
- 控件至少 44×44 px；
- 键盘 ghosting 限制在 README 诚实说明。

### 提交

`feat: add dual input controls`

## 11. 阶段 7：渲染与玩法反馈

### 目标

把模拟状态投影为清楚、克制、原创的折光桌游。

### 文件

- `js/renderer.js`
- `js/app.js`
- `style.css`

### 实现

- 高 DPI Canvas；
- CSS 尺寸到逻辑坐标映射；
- 背景、活动区、墙体；
- 原创抽象折光车；
- 阵营颜色 + 形状双编码；
- 弹体；
- 反射刻痕固定环形缓冲；
- 命中静态裂光标记；
- 倒计时、暂停和结果覆盖；
- 可选调试层，默认关闭；
- 普通模式视觉插值；
- reduced-motion 关闭插值与装饰。

### 禁止

- 外部图片；
- 真实坦克品牌 / 型号；
- 迷彩与国家标志；
- 复制经典商业游戏布局；
- 无上限粒子；
- 影响碰撞的渲染插值；
- 屏幕震动。

### 浏览器验证

必须用 Chrome 验证：

- 960×600 桌面；
- 常见笔记本宽度；
- 移动端横屏；
- 移动端竖屏提示；
- DPR 1 与高 DPR；
- resize；
- reduced-motion；
- 反射点与逻辑位置一致；
- 长时间运行无明显对象增长。

### 提交

`feat: render ricochet duel`

## 12. 阶段 8：可访问页面壳

### 目标

让规则、状态、控制和结果不只存在于 Canvas。

### 文件

- `index.html`
- `style.css`
- `js/accessibility.js`
- `js/app.js`

### 实现

- 标题和一句玩法说明；
- 三条首次规则；
- 可见比分与剩余时间；
- 两侧文本状态卡；
- 朝向、九宫位置、在途弹体、冷却、来弹；
- 低频 `role="status"`；
- 可聚焦暂停、规则、重开；
- 规则对话区域的焦点进入 / 返回；
- 颜色之外的文字和形状标识；
- Canvas 的描述关系；
- no-JS 提示；
- reduced-motion 静态反馈。

### 边界

状态卡可视更新不等于逐 tick 朗读。live region 只播报倒计时、暂停、命中、比分和结果。

README 必须诚实说明实时空间玩法无法提供完全等价的非视觉竞技体验。

### 验证

- 仅键盘可开始、暂停、查看规则、重开；
- 焦点始终可见；
- Tab 顺序合理；
- Enter 不在聚焦页面按钮时误发射；
- 屏幕阅读器能读到规则、比分和结果；
- 阵营区分不只靠颜色；
- reduced-motion 下无装饰动画。

### 提交

`feat: add accessible duel shell`

## 13. 阶段 9：整体验收测试

### 目标

用自动化和真实浏览器证明确定性、公平和离线运行。

### 自动化

- 全部几何测试；
- 全部模拟测试；
- 重放 100 次；
- 镜像状态；
- 左右遍历顺序交换；
- 普通 / reduced-motion 哈希一致；
- 多种 rAF 分帧模式；
- 所有上限；
- HTML 静态依赖检查；
- catalog schema 预检查。

### Golden cases

至少保存：

1. 左侧直线命中；
2. 右侧镜像直线命中；
3. 左侧单折命中；
4. 右侧镜像单折命中；
5. 左侧双折命中；
6. 右侧镜像双折命中；
7. 高速薄墙不穿透；
8. 拐角双法向；
9. 双方同 tick 命中；
10. 双方同 tick 赛点平局；
11. 单 tick 接触上限；
12. 90 秒上限当前 tick 命中优先。

### Chrome 验收

- 从 `file://` 启动；
- 开启离线；
- 完整玩到单方获胜；
- 完整玩到双命中；
- 暂停 / 恢复；
- 隐藏 / 恢复；
- 人工制造长帧或用调试入口触发；
- 键盘 + 触控组合；
- pointer cancel；
- resize；
- reduced-motion；
- 规则和结果焦点。

### 记录

如发现 bug：

- 在 `{repo-root}/bugs` 新建独立记录；
- 写复现、环境、预期、实际、根因、修复、回归测试；
- 修复本身单独提交。

如形成可泛化知识：

- 在 `{repo-root}/learn` 记录；
- 例如“有理 TOI 并列”“Pointer capture 卡键清理”“长帧公平暂停”；
- 学习记录与生产改动分开提交。

### 提交

`test: verify replay fairness and offline play`

## 14. 阶段 10：项目文档

### 目标

让玩家与维护者不用阅读源码也能理解运行和限制。

### README 内容

- 标题与一句话；
- 如何直接打开；
- 双方键位；
- 触屏说明；
- 三分制与 90 秒上限；
- 双弹、三反射、六秒寿命；
- 同刻双命中；
- 暂停策略；
- reduced-motion；
- 可访问性能力和诚实限制；
- 浏览器兼容范围；
- 无运行依赖；
- 独立创作声明；
- 测试命令；
- 调试入口；
- 已知限制。

### 借鉴声明

当前计划不采用外部开源游戏：

- 不复制代码；
- 不复制素材；
- 不复制地图；
- 不复制数值；
- 不模仿真实军事品牌。

若实现期间实际采用开源项目，README 与源码必须在该提交中登记固定 URL、commit / tag、许可证、版权、借鉴内容与未复制内容。

### 提交

`docs: document ricochet tank duel`

## 15. 阶段 11：目录注册

### 目标

只有项目自身验收完成后，才把它加入共享 catalog。

### 修改

- `experiences/catalog.json`；
- 必要的根索引 / README；
- 不修改无关项目；
- catalog 条目遵循现有顺序与 schema。

推荐字段：

- `id`: `ricochet-tank-duel`；
- `title`: `这一弹，拐弯见你`；
- `category`: `versus`；
- `level`: `A`；
- 入口：相对 `index.html`；
- 输入：键盘 / 触屏；
- 离线：是。

### 验证

- JSON 可解析；
- ID 唯一；
- 入口文件存在；
- 标题和 README 一致；
- 分类 / 等级符合 catalog 枚举；
- `npm run verify` 全通过；
- `git diff --check` 全通过。

### 提交

`chore: register ricochet tank duel`

## 16. 最终质量闸门

### 16.1 自动化

```bash
npm run verify
git diff --check
git status --short
```

还应运行项目的定向测试命令并保存摘要。

### 16.2 功能

- 两位玩家能同时移动、转向、发射；
- 场上能有四枚弹体；
- 能完成多次墙面折射；
- 同 tick 双命中双方得分；
- 双方同时到 3 分为平局；
- 90 秒上限成立；
- 回合重置不残留弹体或输入；
- 暂停不推进逻辑。

### 16.3 确定性

- 重放哈希一致；
- 镜像状态一致；
- 左右遍历顺序无偏置；
- 高速弹体不穿透；
- 拐角结果唯一；
- 所有循环有硬上限。

### 16.4 本地运行

- 双击入口可玩；
- 断网可玩；
- 无外部请求；
- 无服务器；
- 无外部素材；
- 无 npm 运行依赖。

### 16.5 UI 与可访问性

- Chrome 桌面 / 移动视口通过；
- 键盘 / 多指触屏通过；
- pointer cancel 不卡键；
- 焦点清楚；
- 状态文本完整；
- live region 不刷屏；
- reduced-motion 不改变逻辑；
- 不以颜色作为唯一提示。

### 16.6 内容与法律

- 无真实军事品牌；
- 无预制坦克素材；
- 原创抽象几何；
- README 有独立创作声明；
- 若实际借鉴开源项目，信息完整且许可证相容。

## 17. 实现暂停点

以下情况需要停止并报告，而不是自行扩大范围：

- spec 的地图无法提供可学习的单折 / 双折路线；
- 定点乘积超出安全整数；
- 移动车体分段 sweep 不能稳定实现；
- 同 TOI 规则在测试中仍有多解；
- 浏览器多指控制无法稳定释放；
- `file://` 需要被外部依赖替代；
- 基线或共享 catalog 出现并行冲突；
- 需要采用一个未登记许可证的开源实现；
- 需要调整五项核心增量；
- `npm run verify` 的失败来自不明基线变化。

地图或数值若要调整，先更新 spec，单独提交，再继续实现。

## 18. 回归清单

每次物理修改后：

- 几何 golden cases；
- 单折 / 双折镜像；
- 双命中；
- 反射与接触上限；
- 重放哈希。

每次输入修改后：

- keyboard repeat；
- pointercancel；
- lost capture；
- blur / hidden；
- 页面按钮聚焦；
- 双侧并发。

每次 UI 修改后：

- Chrome 截图 / 视觉检查；
- 桌面与移动视口；
- 焦点；
- reduced-motion；
- 文本投影；
- Canvas 坐标缩放。

每次共享文件修改后：

- catalog schema；
- ID 唯一；
- 入口存在；
- 根索引链接；
- 完整 `npm run verify`。

## 19. 完成交接

最终交接应包含：

- 最终结论；
- 项目 ID、标题、等级和分类；
- 生产入口绝对路径；
- 实现提交列表；
- 测试命令与结果；
- Chrome 验收摘要；
- `file://` 与断网证据；
- 是否产生 bugs / learn 记录；
- 借鉴声明；
- 当前分支、HEAD 和工作树状态；
- 仍存在的诚实限制。

只有所有必需项通过、工作树干净时，才向总控申请集成。
