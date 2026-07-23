# “把愿望，一盏一盏点亮”分步实施计划

- 日期：2026-07-23
- 状态：执行中；核心逻辑已于 `ea31a42` 提交，生产 UI 等待
  [217-candle-wishes-design-proposal.md](./217-candle-wishes-design-proposal.md)
  获得用户明确确认
- 对应调研：[214-candle-wishes-research.md](./214-candle-wishes-research.md)
- 对应规格：[215-candle-wishes-spec.md](./215-candle-wishes-spec.md)
- 对应创意：S17“蛋糕点烛”
- 目标目录：`experiences/surprises/candle-wishes/`
- 启动等级：A（`file://` 直接打开、零安装、零服务、零权限、零公网）
- 运行依赖：零第三方运行依赖；只使用本地经典脚本、HTML、CSS 与 inline SVG

## 1. 执行原则

本作按用户要求“每完成一个项目或者一部分，就提交一次”。调研与规格已经分别
形成独立部分；后续交付保留四个不可合并的实现批次，并在批次一、二之间增加一个
docs-only 视觉确认 Gate：

1. config、纯逻辑、纯逻辑测试与目录级 package；
2. HTML、app、CSS 与完整 UI；
3. README、ATTRIBUTION、experience/catalog、门户与启动合同；
4. Chrome QA、bugs、learn 与最终 verification。

批次一完成后，先独立提交 docs-only 视觉概念与生成台账；只有用户明确确认后，
才进入批次二。概念 PNG 不进入生产目录，也不改变四个实现批次的文件边界。

每批都必须满足本节定义的文件边界、定向测试、全仓测试和完成证据后才提交。前一
批未提交时不得开始修改后一批文件；发现需要回改前一批时，停止当前批，先用独立
修复提交恢复前一批 Gate，再继续。

每次 commit 前固定运行：

```bash
git branch --show-current && git rev-parse --show-toplevel
```

并确认当前分支与 worktree 确实属于本任务。预期根目录是
`/Users/zenith/Desktop/two-of-us`；不能把某次检查结果当作后续提交的永久授权。
子任务不 stage、不 commit，由主线程审阅、验证、暂存并提交。

## 2. 固定交付合同

四个实现批次与视觉 Gate 共同遵守以下不可降级合同：

- `index.html` 使用相对路径经典脚本，用户双击后通过 `file://` 可完成开始、一次
  错误选择、五支正确点亮、主动收下与重开；
- 不使用 ES Module、fetch、远程 URL、远程字体、Storage、账号、权限、麦克风、
  音频、Canvas、WebGL、Worker、服务端或构建产物；
- `package.json` 只用于声明目录级 CommonJS 测试环境，不增加 dependency、
  devDependency、安装脚本或运行时命令；
- localhost 必须跑完相同完整玩法，用于 Chrome 自动化、控制台、网络、焦点、
  响应式、reduced-motion 与 forced-colors 证据；
- localhost 证据不能冒充 `file://` 直开证据；若浏览器控制工具拒绝 file URL，
  必须记录工具限制，并补经典脚本、静态依赖闭包与人工双击证据；
- 页面不上传、不另存配置，但磁盘上的 `config.js` 是明文；README 必须明确这一
  真实隐私边界；
- README 与 ATTRIBUTION 都要写完整借鉴声明：固定来源、commit、许可证、版权
  主体、实际借鉴、排除项、零复制范围和零第三方运行依赖；
- 不把参考仓库的代码、图片、SVG、音频、字体、文案、配色、截图、Lottie 或
  trade dress 带入生产目录。

## 3. 批次一：config、logic、tests、package

### 3.1 唯一可写文件

```text
experiences/surprises/candle-wishes/package.json
experiences/surprises/candle-wishes/config.js
experiences/surprises/candle-wishes/logic.js
experiences/surprises/candle-wishes/logic.test.js
```

目录不存在时可以创建目录和上述四个文件，但不得顺手创建 HTML、CSS、app、README、
ATTRIBUTION、图片或元数据。

### 3.2 实施职责

- `package.json` 精确为目录级 CommonJS 声明，不含任何依赖；
- `config.js` 提供五支可编辑蜡烛、称呼、最终标题、留言和署名；保持经典脚本可读；
- `logic.js` 实现规格冻结常量、安全配置快照、四阶段状态、headroom、四动作、
  reducer、replay 与 exact public view；
- 展示排列固定为 `[2, 4, 0, 3, 1]`，不能由配置、随机、视口或上局改变；
- 错误但格式合法的未点亮 ID 保持同一 state 引用；非法 action schema 在 replay
  中返回 `null`，两类边界必须按规格最终修订口径实现；
- intro 不公开配置；lighting 只公开五个 label、当前 cue 和已揭晓前缀；ready
  不公开 final；complete 才公开最终四字段；
- 实现 hostile object、getter、symbol、extra key、custom prototype、稀疏数组、
  Proxy trap、Unicode control、lone surrogate 与整份配置回退；
- 测试必须从生产导出的 `DEFAULT_CONFIG` 计算 canonical JSON 哈希，不维护第二份
  默认库存；
- 逻辑导入不得访问 DOM、时间、随机、timer、storage、network、audio、permission
  或浏览器运行钩子。

### 3.3 不可跨越边界

- 不创建或修改 `index.html`、`app.js`、`styles.css`；
- 不修改根 README、docs 索引、catalog、门户、分类 README、创意池；
- 不写来源文档、bugs、learn 或 verification；
- 不为方便测试引入 jsdom、测试框架、npm 包、构建器或本地服务；
- 测试不得调用生产 reducer 生成自己的预期结果，不得通过复制整份实现来自证。

### 3.4 测试命令

```bash
node --check experiences/surprises/candle-wishes/config.js
node --check experiences/surprises/candle-wishes/logic.js
node --test experiences/surprises/candle-wishes/logic.test.js
npm test
npm run verify
git diff --check
```

### 3.5 完成证据

- 默认配置 canonical hash 与规格最终冻结值一致；
- 五步金路径、每个位置的错误合法 ID、ready、REVEAL、RESTART 全绿；
- intro/lighting/ready/complete forbidden-string sentinel 全绿；
- 120 种配置路线都只按各自 route 完成，展示顺序仍固定；
- MAX_REVISION 各阶段都能完成整轮或安全禁用，未出现半途死锁；
- CommonJS 真实 `require()` 成功，生产逻辑静态副作用扫描通过；
- 定向测试、全仓测试、verify 和 diff check 的退出码均为 0。

建议 commit message：

```text
feat: add candle wishes core logic
```

## 4. 批次二：HTML、app、CSS、UI

### 4.1 唯一可写文件

```text
experiences/surprises/candle-wishes/index.html
experiences/surprises/candle-wishes/app.js
experiences/surprises/candle-wishes/styles.css
```

批次一的四个文件是冻结输入。若发现 public API 不足或逻辑缺陷，必须停止 UI
实现并回到独立逻辑修复提交，不得在 app 中复制路线、headroom、目标判断或隐私规则。

### 4.2 实施职责

- 脚本顺序固定为 `config.js → logic.js → app.js`，均为相对路径经典脚本；
- no-JS 只含公开标题、说明、隐私说明与开启 JavaScript 提示；
- `app.js` 只消费 public view；不读取 `state.content`、未来 route、内部 target
  或 config 来裁决点击；
- 按规格创建和删除阶段 DOM，future cue/wish/final 不进入 template、attribute、
  ARIA、CSS content 或离屏节点；
- 实现 app-local 错误播报、同节点主动作、正确/错误/ready/complete/restart 焦点；
- 只用原生 button click，保留 Enter/Space 行为和真实 disabled；
- CSS 实现“安静餐桌上的纸艺小蛋糕”，不依赖生产图片或远程字体；
- 火焰只是表现，按钮文本与愿望列表同时表达“未点亮/已点亮”；
- 实现六档视口、至少 48×48px 命中区、200% 文本、400% zoom、safe-area、
  reduced-motion、forced-colors 和 CSS/SVG 装饰失败降级；
- `attemptPrepare()` 统一处理首次准备与安全重试，不输出异常、路径或私密配置。

### 4.3 不可跨越边界

- 不修改批次一的 config、logic、tests、package；
- 不创建 README、ATTRIBUTION、experience metadata 或 verification；
- 不修改 catalog、根门户、分类 README、根 README、docs README、创意池；
- 不引入图片、第三方 SVG、字体、音频、Lottie、依赖或运行时下载；
- 不把 UI class、DOM 数量或 CSS 状态作为业务真相。

### 4.4 测试命令

```bash
node --check experiences/surprises/candle-wishes/app.js
node --test experiences/surprises/candle-wishes/logic.test.js
npm test
npm run verify
git diff --check
```

UI 批次还必须使用 Chrome MCP 做 localhost 冒烟：

1. intro 不含配置文本；
2. START 后固定展示五支；
3. 一次错误点击不推进并保持焦点；
4. 五次正确点击逐句揭晓；
5. ready 不含 final，REVEAL 后 final title 获焦；
6. RESTART 回到公开 intro；
7. 控制台无 error、网络无远程请求。

### 4.5 完成证据

- `file://` 静态闭包成立：无 module/fetch/远程资源/服务依赖；
- localhost 完整主路径至少实跑一次，并记录状态、焦点、live 与网络结果；
- intro、ready、complete 的 DOM 隐私 sentinel 计数符合规格；
- 1504、1280、768、390、320 与 844×390 不横溢，按钮命中区达标；
- reduced-motion、forced-colors、键盘-only 与装饰阻断仍可完成；
- 定向、全仓与 verify 均通过。

建议 commit message：

```text
feat: build candle wishes local UI
```

## 5. 批次三：README、ATTRIBUTION、catalog、launch contract

### 5.1 唯一可写文件

```text
experiences/surprises/candle-wishes/README.md
experiences/surprises/candle-wishes/ATTRIBUTION.md
experiences/surprises/candle-wishes/experience.json
experiences/catalog.json
experiences/surprises/README.md
shared/runtime/catalog.test.js
index.html
README.md
docs/README.md
docs/40-idea-backlog.md
```

若当前仓库的 A 级元数据文件名或 catalog 生成合同不同，以已提交的
`shared/runtime/catalog.test.js` 和相邻 A 级作品为准；不得自行新建第二套元数据
格式。共享文件只由主线程串行修改。

### 5.2 实施职责

- README 写清玩法、配置五支 candle、双击方式、重播、隐私、无权限、无存储、
  无网络、装饰降级与已知 file URL 限制；
- README 与 ATTRIBUTION 各自完整列出：
  - `ololx/birthday-cake@d51cd5c73c3171d6b769b5da1b9072beca691ce6`，
    Unlicense，Alexander A. Kropotin，仅借鉴单 HTML 与逐支点击能力；
  - `VIDAKHOSHPEY22/Birthday-Cake-Blow-Candle@3d364f985b2d96057f30d3fc67c5ee71ec37556f`，
    MIT，Copyright 2025 Vida Khoshpey，仅作麦克风/庆祝方案排除对照；
  - `elixpo/wish.elixpo@bf6ec8cae8c756203e059940d42089504ae43ec8`，
    MIT，Copyright 2024 Ayushman Bhattacharya，记录旧路径
    `Circuit-Overtime/Birthday`，仅作个性化、云端与权限边界对照；
  - MDN getUserMedia、W3C Pointer Events 与 WCAG 页面仅作标准校准；
- 两份声明都写“零第三方运行依赖”“未复制、修改、链接或 vendoring 候选代码”
  以及未使用候选素材、文案、配色、截图、Lottie、字体和 trade dress；
- catalog 把作品登记为 A、surprise、单人、offline、经典脚本、本地直开；
- 门户与分类 README 增加入口，标题、简介、标签与 metadata 一致；
- 创意池只有在生产 UI、来源声明与 catalog 全部完成后才把 S17 标记为已实现；
- catalog 测试增加入口存在、经典脚本顺序、相对资源、零远程依赖、README 与
  ATTRIBUTION 声明、no-JS 边界和 file launch contract。

### 5.3 不可跨越边界

- 不改 config、logic、tests、HTML、app、CSS；
- 不在这一批修 UI bug；发现问题应回到独立修复提交；
- 不提前写未经实测的作品总数、测试总数或门户计数；
- 不把 localhost URL 登记成 A 级主入口，不增加 setup/start 依赖；
- 不以调研文档链接替代 README/ATTRIBUTION 的完整借鉴声明。

### 5.4 测试命令

```bash
node --test shared/runtime/catalog.test.js
node --test experiences/surprises/candle-wishes/logic.test.js
npm test
npm run verify
git diff --check
```

### 5.5 完成证据

- catalog、根门户、分类索引、根 README、docs README 与创意池信息一致；
- 从 `file://` 根门户点击作品可达相对 `index.html`，作品内部资源全部本地；
- README 与 ATTRIBUTION 都包含三个固定 commit、许可证、版权、实际借鉴、
  排除范围、零复制与零运行时依赖；
- catalog 测试对远程 URL、module/fetch、缺失文件与声明缺项能稳定失败；
- 实测作品数、测试数与 verify 入口数写入提交说明，不预估；
- 全仓测试、verify 和 diff check 通过。

建议 commit message：

```text
docs: register and attribute candle wishes
```

## 6. 批次四：Chrome QA、bugs、learn、verification

### 6.1 允许写入文件

```text
docs/218-candle-wishes-verification.md
bugs/YYYY-MM-DD-candle-wishes-<slug>.md
learn/<evidence-backed-topic>.md
```

编号 218 仅在提交时仍未被占用才使用；若已占用，由主线程选择下一空闲编号并同步
索引。只有真实复现并修复的问题才写 bugs；只有跨作品可复用且已有实现/测试证据的
主题才写 learn，不能为凑齐目录创建空洞条目。

若 Chrome QA 发现生产缺陷，生产修复文件、对应回归测试与单个 bug 记录必须形成
一个独立修复提交；修复后重新开始受影响的 QA 段。最终 verification 提交不得夹带
未说明的生产代码修改。

### 6.2 Chrome QA 矩阵

统一 localhost 入口完整执行：

1. intro 检查无 candle/final 配置 DOM；
2. START 后确认 `journey/home/rain/quiet/noodle` 展示顺序；
3. 先点 home，确认状态/进度不变、固定错误 live、home 保持焦点；
4. 按 `rain/noodle/journey/quiet/home` 完成，每次只新增一个 wish；
5. 每次正确后焦点落在新 cue，不跳到下一答案；
6. ready 有五句、无 final，主动 REVEAL；
7. complete 四个 final 节点出现，final title 获焦；
8. RESTART 清除配置 DOM，返回公开 intro；
9. 全程监听 console、page error、request、Storage 与 permission；
10. 键盘-only、Pointer click、reduced-motion、forced-colors、CSS/SVG 装饰阻断；
11. 六档视口、最大合法文本、200% 文本、约 320 CSS px 的 400% zoom；
12. `scrollWidth <= clientWidth`、按钮 computed rect、焦点与 disabled 状态。

`file://` 另行验证：

- 人工双击作品 `index.html`，完成同一完整路径；
- 确认经典相对脚本加载、无远程请求、刷新后可重新玩；
- 若 Chrome MCP 本身拒绝 file URL，在 verification 中记录准确工具限制，不把
  localhost 结果写成 file 导航证据。

### 6.3 Bug 记录

每个 bug 文档必须包含：

- 环境、视口与入口；
- 最小复现步骤；
- 预期与实际；
- 根因；
- 失败回归测试或可重复浏览器断言；
- 修复内容；
- 定向与全仓回归结果；
- 相关 commit。

同一根因只维护一条记录。建议命名示例：

```text
bugs/2026-07-23-candle-wishes-focus-after-fifth-candle.md
```

### 6.4 Learn 候选

只有拿到真实证据后才考虑沉淀：

1. 路线顺序与展示顺序分离，如何避免 UI 暗示答案；
2. app-local 一次性错误反馈，如何不污染可回放 reducer；
3. 阶段 public view 与 DOM 删除，如何延迟呈现本地明文私信；
4. revision headroom，如何证明一次开始后不会半途耗尽；
5. `file://` 静态闭包与 localhost 自动化证据如何组合而不互相冒充。

### 6.5 最终测试命令

```bash
node --check experiences/surprises/candle-wishes/config.js
node --check experiences/surprises/candle-wishes/logic.js
node --check experiences/surprises/candle-wishes/app.js
node --test experiences/surprises/candle-wishes/logic.test.js
node --test shared/runtime/catalog.test.js
npm test
npm run verify
git diff --check
```

### 6.6 完成证据

- verification 记录每条命令、退出码、测试总数与 verify 入口总数；
- 记录 localhost 完整路径、真实 `file://` 路径或工具限制；
- 记录六档视口、键盘、焦点、隐私、网络、降级和可访问性结果；
- 每个已发现缺陷都有 bug 文档、回归证据与独立提交；
- 每个 learn 文档都引用真实代码/测试/浏览器证据；
- 最终 `git status --short` 为空；
- S17 满足规格完成定义，但长期项目目标继续保持进行中。

建议 commit message：

```text
docs: verify candle wishes experience
```

## 7. 执行顺序与审查点

1. 主线程先修正并提交规格审阅发现，再提交本计划；
2. 派发批次一的非共享文件实现，审阅 exact schema、headroom、隐私和 oracle；
3. 批次一全绿并独立提交后，生成 docs-only 概念、原尺寸审阅并独立提交；
4. 用户明确确认概念后才派发批次二 UI；
5. 批次二先跑逻辑/全仓 Gate，再用 Chrome localhost 冒烟，独立提交；
6. 主线程串行完成批次三共享索引与借鉴声明，独立提交；
7. 批次四做完整 Chrome/file QA；发现一个根因，就先完成一个 bug 修复提交；
8. QA 全绿后写有证据的 learn 与最终 verification，独立提交；
9. 每个提交后检查 worktree，不能把下一批的半成品带入当前提交。

本计划完成不等于作品完成，也不等于长期目标完成。
