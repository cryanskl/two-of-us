# `twin-orbit` 实施与验收计划

- 日期：2026-07-25
- 工作 ID：`twin-orbit`
- 公开标题：`这一圈，和你同时到`
- 主分类：双人合作
- 目标等级：A
- 调研：[`305-twin-orbit-research.md`](./305-twin-orbit-research.md)
- 规格：[`306-twin-orbit-spec.md`](./306-twin-orbit-spec.md)
- 来源审计：[`307-twin-orbit-attribution-dependency-audit.md`](./307-twin-orbit-attribution-dependency-audit.md)
- 当前状态：只完成 brainstorm / spec / plan；尚未创建 production entry

## 1. 计划目标

按可审查、可回滚、可逐段提交的方式，把 Conditional Go 变成一个真正 A 级、
本地双击可玩的双人合作项目。

每完成一个项目部分就提交一次。任何提交前都必须执行：

```bash
git branch --show-current && git rev-parse --show-toplevel
```

并确认：

```text
branch   = codex/exp-twin-orbit
worktree = /Users/zenith/Desktop/two-of-us-worktrees/twin-orbit
```

若分支、worktree、目标目录或父分支状态不符，停止写入，不猜测。

## 2. 完成定义

### 2.1 只能称为“研究完成”

满足：

- research / spec / attribution audit / acceptance plan 已提交；
- 机制有数学可达探针；
- 没有生产入口、逻辑测试、UI 或浏览器证据。

当前正处于这一层。

### 2.2 只能称为“非视觉核心可行”

未来满足：

- config、关卡、fixture、纯逻辑、求解器和测试通过；
- 两席不可挂机、五关可达、公平与分片一致性闭环；
- 仍没有 `index.html` / `app.js` / CSS / 真实输入。

这一层不得加入 catalog，不得标记 installed，不得宣称 `file://` 已验收。

### 2.3 才能称为“A 级 installed”

必须全部满足：

- 完整项目目录和 production entry；
- 经典相对脚本、零远程资源、零运行依赖；
- Finder 真实双击 `index.html` 完成五关和重开；
- 真实键盘 F+J 同时保持、真实双 Pointer；
- 浏览器控制台、网络、响应式、焦点、降动效与降级通过；
- README / ATTRIBUTION / catalog / 门户 / co-op 索引一致；
- 项目测试、`npm run verify`、全仓测试通过；
- 来源和名称策略按实际实现复核；
- 真实 bug 已记录并回归；
- worktree clean。

## 3. 提交策略

禁止把整个项目压成一个巨型提交。建议未来提交序列：

| 阶段 | 主要产物 | 建议 commit message |
| --- | --- | --- |
| R1 | 调研 | `docs: research twin orbit concept` |
| R2 | 规格 | `docs: specify twin orbit mechanics` |
| R3 | 来源审计 | `docs: audit twin orbit attribution and dependencies` |
| R4 | 验收计划 | `docs: plan twin orbit acceptance` |
| I1 | config、关卡、fixture、logic、solver、tests | `feat: add deterministic twin orbit core` |
| I2 | 视觉设计合同与必要概念证据 | `docs: define twin orbit visual system` |
| I3 | HTML、CSS、app、键盘/Pointer/暂停 | `feat: build twin orbit local experience` |
| I4 | README、ATTRIBUTION、catalog、门户与索引 | `feat: integrate twin orbit catalog entry` |
| I5 | 浏览器证据、最终 verification、必要 learn | `docs: verify twin orbit local launch` |

实际 bug：

- 若在当前阶段内发现并修复，可与对应最小修复同一 commit；
- bug 记录与修复代码必须一起出现；
- 若跨越阶段或属于共享基础设施，单独提交；
- pre-commit 失败后修复并重新 `git add`，绝不 `--amend`。

不执行未经当前消息明确授权的 `reset --hard`、`checkout --`、`clean -f`、
force push、覆盖用户修改或其他破坏性操作。

## 4. 阶段 I1：确定性核心与求解器

### 4.1 文件

```text
experiences/co-op/twin-orbit/package.json
experiences/co-op/twin-orbit/config.js
experiences/co-op/twin-orbit/logic.js
experiences/co-op/twin-orbit/fixtures.js
experiences/co-op/twin-orbit/logic.test.js
experiences/co-op/twin-orbit/ATTRIBUTION.md
```

这一阶段可以先创建项目级 `ATTRIBUTION.md`，但必须明确“核心阶段、尚无 UI 或
资产”，避免把未来范围写成既成事实。

### 4.2 实施顺序

1. exact schema 与 hostile-object snapshot helper；
2. 配置原子回退与 Unicode 清洗；
3. angle helper 和 `(previous,next]` 穿越；
4. 五关冻结数据与金路径展开；
5. state/action/reducer/public view；
6. SUSPEND、epoch、retry、restart；
7. 独立动态规划/枚举求解器；
8. 纯逻辑测试和静态边界。

### 4.3 求解器 Gate

求解器状态至少包含：

```text
tick
leftAngle
rightAngle
leftLane
rightLane
phase/result
```

每 tick 枚举四种联合输入：

```text
outer/outer
outer/inner
inner/outer
inner/inner
```

必须证明：

- 五关均存在开放窗口内的同 tick 解；
- 冻结 fixture 是其中一条合法解；
- 恒定 outer/inner 任一席都无解；
- 单席可控、另一席恒定的四种组合均不能完成；
- 窗口起止边界没有 off-by-one；
- 第五关跨 0 角度可达；
- 求解不会读取 UI、RAF、DOM 或浮点角度。

如果任一关失败，优先修改研究/规格和关卡数据并单独提交，不在测试里放宽成功
条件。

### 4.4 核心验证命令

```bash
node --check experiences/co-op/twin-orbit/config.js
node --check experiences/co-op/twin-orbit/logic.js
node --check experiences/co-op/twin-orbit/fixtures.js
node --check experiences/co-op/twin-orbit/logic.test.js
node --test experiences/co-op/twin-orbit/logic.test.js
git diff --check
npm run verify
```

`npm run verify` 在此阶段仍应报告 58 个 installed；核心目录未接入前计数不变。

### 4.5 I1 Stop 条件

- fixture 与 solver 结论不一致；
- 一席恒定输入仍可通过；
- 同 tick 裁决依赖玩家迭代顺序；
- hostile object 可执行 getter 或污染 canonical state；
- CommonJS 测试出口与浏览器经典脚本出口不能同时成立；
- 需要第三方数学/物理库才能继续。

出现即停止、记录实际 bug、修复或回到 Conditional Go。

## 5. 阶段 I2：视觉设计合同

### 5.1 目标

只为已冻结规则寻找清楚、克制的呈现，不扩展玩法。

必须先制作或记录：

- 桌面进行态；
- 390px 进行态；
- 桌面完成态；
- 视觉令牌、响应式和降动效合同；
- 两颗星、两条半径、双门、共同开门时刻的可读性检查。

优先 code-native DOM/CSS/SVG。若没有必要，不生成生产图片。

### 5.2 视觉 Gate

- 不出现英文 “Twin Orbit”；
- 不像 Apple 当前官方条目的双火箭/双指街机表达；
- 不复刻 Playgama 首轮历史记录中的反转双球/陨石生存表达；该 URL 当前已
  hidden/redirect，不能作为在架证据；
- 不使用商业航天、NASA/SpaceX、任务徽章、国旗或真实仪表；
- 不出现随机目标、比分、排行榜、生命值、连击或射击 HUD；
- 两席视觉权重相等；
- 目标半径不只靠颜色；
- 共同开门进度明显，但输入按钮本身不是节奏判定窗；
- 320px 下两个控制仍至少 48px；
- reduced-motion 后规则信息不丢失。

若使用 ImageGen，必须在调用前冻结提示词边界，生成后用原图检查文字、logo、
商标、UI 幻觉和商业作品相似性。概念图不直接当 production truth。

## 6. 阶段 I3：生产 UI 与输入

### 6.1 文件

```text
experiences/co-op/twin-orbit/index.html
experiences/co-op/twin-orbit/styles.css
experiences/co-op/twin-orbit/app.js
```

必要时可添加本地 favicon；不默认添加图片或音频。

### 6.2 实施顺序

1. 语义 DOM 和 no-JS 公共说明；
2. public view 单向 render；
3. 30Hz RAF accumulator 与 generation；
4. F/J pressed-set 生命周期；
5. 双 Pointer map、capture、cancel、lostcapture；
6. blur/hidden/pagehide/Escape/长帧 SUSPEND；
7. 阶段动作、焦点和 live region；
8. 响应式、forced-colors、reduced-motion；
9. 缺图/Canvas/SVG 降级；
10. 页面级静态和浏览器测试。

### 6.3 输入验收

键盘：

- F 只控制左星，J 只控制右星；
- F+J 同时按住不会丢任一席；
- repeat 不重复 dispatch；
- 先后 keyup 精确释放；
- blur 后物理键仍按住，返回也不会自动恢复 held；
- 旧 keyup 不污染新 input epoch；
- Escape 不被玩法键吞掉。

Pointer：

- 两个真实触点分别占两席；
- 同一 pointer 不能跨席；
- 同一席第二 pointer 不覆盖第一 pointer；
- pointerup/cancel/lostcapture 精确释放；
- 滑出按钮仍由 capture 收到释放；
- 页面滚动区域不被全局 `touch-action:none` 锁死；
- 自动暂停清空 pointer map；
- Mouse 一次只模拟一席，不伪造多点通过。

### 6.4 UI 验证命令

```bash
node --check experiences/co-op/twin-orbit/app.js
node --test experiences/co-op/twin-orbit/logic.test.js
git diff --check
npm run verify
npm test
```

涉及 UI，必须使用 Chrome MCP 做浏览器验证，并保留控制台、网络、视口和交互
证据。localhost 只为自动化服务，同一套 production 文件不得有服务器专用分支。

## 7. 阶段 I4：目录接入与借鉴声明

### 7.1 更新范围

```text
experiences/co-op/twin-orbit/README.md
experiences/co-op/twin-orbit/ATTRIBUTION.md
experiences/catalog.json
index.html
README.md
experiences/co-op/README.md
docs/README.md
必要的 shared/runtime catalog 测试
```

遵循当前仓库 schema，不自行新增分类、徽章、默认值或自动刷新。

### 7.2 catalog 条目

必须一致：

```text
id: twin-orbit
title: 这一圈，和你同时到
category: co-op
level: A
players: 2 人
devices: 同一设备
installed: true
networkRequired: false
```

description 明确“按住变快、松开变慢、同 tick 过双门”，不写“真实轨道物理”
或英文产品名。

### 7.3 README 启动合同

README 必须包含：

- 双击 `index.html`；
- 无安装、服务、账号或网络；
- F/J 和双触点操作；
- 暂停、当前关重试和完整重开；
- 本地明文配置与零存储；
- 双人合作、无个人统计；
- 内部 `orbit-star-race` 机制参考和明确未复制范围；
- 标准只作平台边界；
- 外部开源项目/运行依赖为 0；
- “Twin Orbit” 只作内部 ID、公开标题为中文；
- 若有生成资产，逐项记录。

### 7.4 installed 前 Gate

在设置 `installed:true` 之前，必须已经有：

- 完整可玩入口；
- 项目测试通过；
- 浏览器一轮真实完成；
- `file://` 系统直开初步证明；
- README / ATTRIBUTION；
- 零公网请求；
- 正确分类和门户卡。

不能先增加 catalog 数量，再把 UI 或证据留待以后。

## 8. 阶段 I5：三层启动与最终浏览器验收

### 8.1 第一层：静态合同

验证：

- 所有运行 URL 是相对本地路径；
- 经典脚本，无模块；
- 无网络、storage、权限和服务；
- 目录单独复制仍有入口、代码、默认配置和归属；
- HTML/CSS/JS parser/check 通过；
- 缺资源不会阻断规则。

### 8.2 第二层：真实系统 `file://`

从 Finder 双击 production `index.html`，不是临时副本：

1. 进入第 1 关；
2. 使用真实键盘完成至少一关；
3. 使用真实双触点设备完成至少一关；
4. 完成五关；
5. 完整重开；
6. hidden/blur 后从当前关安全继续；
7. 确认地址为 `file://`；
8. 确认没有安装、终端服务或网络前置。

如果当前自动化环境不能可靠操控 `file://`，可以人工完成并记录限制；不能用
localhost 冒充第二层。

### 8.3 第三层：localhost 自动化

用同一套生产文件完成：

- intro→五关→complete→restart；
- 过早、单边、错半径、窗口关闭；
- F/J、repeat、keyup、焦点；
- Pointer capture/cancel/lostcapture；
- blur/hidden/pagehide/Escape/长帧；
- 1504×1046、1280×720、768×1024、390×844、320×700；
- 200% text、400% zoom、forced-colors、reduced-motion、no-JS；
- 装饰资源阻断；
- 控制台 0 error/warning；
- network 0 公网请求；
- 页面截图和视觉合同对照。

自动化为了可重复交互和截图，不改变 A 级结论。

## 9. 公平验收

### 9.1 逻辑公平

- 双方常量、速度、action 能力和目标窗口完全相同；
- 两席输入同 tick 快照；
- 玩家顺序互换后，镜像关卡结果镜像；
- 第 1/2、4/5 负担交换；
- 五关双方各 150 inner tick；
- 单席恒定输入无解；
- 不公开个人统计或内部 control tick。

### 9.2 交互公平

- 两个按钮尺寸、位置层级和文案权重相同；
- 双方都能看见完整舞台和公开开门时刻；
- 颜色、形状、左右标签三重区分；
- 手机上不把一席放在折叠区或屏外；
- 键盘同时保持和触屏双 Pointer 都是真实通过，不以模拟事件替代；
- 失败文案只说共同状态，不归责某席。

### 9.3 关系安全

完成文案不写：

- “更默契的一方”；
- “谁拖后腿”；
- “情侣才懂”；
- 健康、生理、关系质量或科学同步结论。

默认面向情侣、夫妻、朋友或任意两个人。

## 10. 暂停、重试与重开验收

| 场景 | 预期 |
| --- | --- |
| Escape | 清输入，回当前关说明，不计失败 |
| window blur | 同上 |
| document hidden | 同上，不补后台 tick |
| pagehide / BFCache | 清 input epoch；恢复不粘键 |
| RAF delta >250ms | 视为不可靠长帧，回当前关说明 |
| 一星早到 | 当前关中性重试 |
| 同 tick 但错半径 | 当前关中性重试 |
| 窗口内只有一星 | 当前关中性重试 |
| 已完成一关后失败 | 已完成关不丢 |
| 第五关成功 | 唯一 complete |
| complete 后键位/Pointer | 不再改变状态 |
| 再绕一次 | 清全部关卡，回 intro，epoch/revision 更新 |

## 11. Bug 记录流程

目录：

```text
/Users/zenith/Desktop/two-of-us-worktrees/twin-orbit/bugs/
```

每个真实问题：

1. 先稳定复现；
2. 一个问题一个 Markdown；
3. 写状态、环境、步骤、预期、实际、根因、方案、回归、提交；
4. 在 `bugs/README.md` 加索引；
5. 修复代码与 bug 记录在同一最小提交；
6. 加能失败后转绿的回归测试；
7. 运行项目测试、`git diff --check` 和对应仓库验证。

不记录未复现猜测。若是产品取舍、待办或未来增强，不伪装成 bug。

当前已记录：

- [Page Visibility 来源状态错误](../bugs/2026-07-25-twin-orbit-page-visibility-source-status.md)

## 12. Learn 沉淀流程

目录：

```text
/Users/zenith/Desktop/two-of-us-worktrees/twin-orbit/learn/
```

只有跨项目可复用的方法才写入，例如：

- 环形半开区间的整数穿越判定；
- 双席同 tick 原子裁决与迭代顺序偏差；
- 用求解器证明合作必要性，而不是只验证一条金路径；
- input epoch 隔离暂停后的迟到释放事件；
- `file://` 三层启动证据的边界。

若仓库已有同主题 learn，优先补充或链接，不重复造文档。项目专属常量、标题、
关卡表和 UI 说明留在 spec/verification，不进入 learn。

learn 独立提交，或与产生它的最终验证提交一起提交；不得与无关代码混合。

## 13. 最终验证命令

```bash
git branch --show-current && git rev-parse --show-toplevel
git status --short
git diff --check

node --check experiences/co-op/twin-orbit/config.js
node --check experiences/co-op/twin-orbit/logic.js
node --check experiences/co-op/twin-orbit/fixtures.js
node --check experiences/co-op/twin-orbit/app.js
node --check experiences/co-op/twin-orbit/logic.test.js
node --test experiences/co-op/twin-orbit/logic.test.js

npm run verify
npm test
```

如果全仓测试失败：

- 先区分本项目失败、当前 worktree 路径假设和既有失败；
- 保存精确命令、测试名与错误；
- 本项目引入的失败必须修复；
- 共享/既有失败不能静默忽略，也不能越权改动；
- 只有证据明确时才能在 verification 中分层报告。

## 14. 最终证据文档

实现完成后创建一个新的 verification 文档，至少记录：

- 分支、基线、最终 commit；
- 项目测试、verify、全仓测试数；
- solver 可达性、公平反例和分片一致性；
- 三层启动证据；
- 键盘/双 Pointer；
- 暂停/重试/重开；
- 视口、缩放、forced-colors、reduced-motion；
- 控制台与网络；
- 归属、依赖、名称和实际资产；
- bugs 与 learn；
- installed 计数变化；
- 未通过 Gate 和明确限制。

截图只证明当时画面，不替代状态机、网络、输入或 `file://` 证据。

## 15. 最终 Go / No-Go

### Go

只有当：

- 核心求解、双方必要性和公平成立；
- 真实双人输入可用；
- A 级三层启动闭环；
- 与现有项目的机制差异在真实首局中仍明显；
- 版权、依赖、名称和归属按实际实现更新；
- 所有必需验证通过；

才接入 catalog 并报告完成。

### No-Go

出现以下任一情况应停止：

- 最优玩法退化为“亮窗一起按”；
- 需要复制 `orbit-star-race` 代码才能稳定；
- 一席可挂机或另一席可单独补偿完成；
- 双触点在目标设备不可靠且无等价双人路径；
- `file://` 需要服务、模块或公网；
- 公开视觉/名称接近现有 “Twin Orbit” 游戏；
- 无法用固定步消除刷新率或玩家迭代顺序偏差。

No-Go 也属于有效研究结果：保留文档和证据，不创建 installed 空壳。
