# C 级“你记得，我们在哪里”实施计划

- 日期：2026-07-25
- 工作 ID：`our-place-guess`
- 分类：co-op
- 目标等级：C
- 基线：`0f778fec714606d9565169c91a94709d7f96db5e`
- 规格：[`332-our-place-guess-spec.md`](./332-our-place-guess-spec.md)
- 本计划范围：未来生产实施的分段、测试、提交与验收；本阶段不写生产代码
- 结论：**Go**

## 1. 实施原则

1. 保持最小首版，不加入规格明确排除的增强；
2. 不修改 `shared/runtime`，只复用现有房间和密封协议；
3. 不新增 npm 依赖、项目私有 `package.json` 或 lockfile；
4. 私人题包只由房主原生文件选择器读取并驻留浏览器内存；
5. 按题包文件顺序使用前四张，不随机、不重排；
6. 运行时不访问公网；
7. 地图输入、派生资产、游戏代码和视觉素材分别记录来源；
8. 每个可独立验收部分单独 commit，不在最后堆成一个大提交；
9. pre-commit 失败时修复后重新 add 和新建 commit，不使用 `--amend`；
10. 实际 bug 与可复用 learn 分别写入根仓库 `bugs/` 和 `learn/`，并随对应修复单独提交。

## 2. 分支与写入前检查

每个实施部分写入前、commit 前都执行：

```sh
git branch --show-current
git rev-parse --show-toplevel
git status --short
```

预期：

```text
branch: codex/exp-our-place-guess
root: /Users/zenith/Desktop/two-of-us-worktrees/our-place-guess
```

并确认：

- 没有其他会话的未解释改动；
- 本阶段只暂存本阶段文件；
- 不执行 `reset --hard`、`checkout --`、`clean -f`、`branch -D` 或 force push；
- 不提交私人 JSON、真实地点、浏览器下载文件和临时地图源文件；
- 实施前重新 fetch/核验上游 URL 只读状态，但不自动升级固定版本。

## 3. 统一依赖合同

根 `package.json` 继续只有现有统一依赖：

```text
pannellum 2.5.7
qrcode 1.5.4
socket.io 4.8.1
```

本项目直接使用的只有仓库现有 Socket.IO 4.8.1 房间能力。Natural Earth 是静态数据输入，不是运行依赖。

禁止：

- Leaflet、OpenLayers、MapLibre、D3、Turf 或投影库；
- Django、Redis、数据库或 Python 环境；
- CDN、远程字体、在线瓦片或地理 API；
- 在项目目录运行 `npm install`；
- 第二份 `node_modules` 或 lockfile。

统一安装：

```sh
npm run setup
```

日常启动：

```sh
node scripts/start.mjs --experience our-place-guess
```

跨平台启动器只包装这一条根脚本。

## 4. Part 1：固定并派生离线地图

### 4.1 目标

建立可重复的 Natural Earth 获取与派生链，生产页只加载本地最小 land 几何。

### 4.2 文件

新增：

```text
experiences/co-op/our-place-guess/tools/vendor-map.mjs
experiences/co-op/our-place-guess/tools/vendor-map.test.js
experiences/co-op/our-place-guess/assets/ne-110m-land.min.geojson
experiences/co-op/our-place-guess/ATTRIBUTION.md
```

所有生产与开发辅助文件都留在项目目录。执行分支不添加或修改 catalog 入口。

### 4.3 脚本

使用 Node 18 内置 `fetch`、`crypto` 和 `fs`：

1. 下载固定 URL；
2. 对原始 bytes 计算 SHA-256；
3. 必须等于 `9e0729ee253ca7d7a5c4ae9395fb1902264c5377c52e224d13dd85010e2835d9`；
4. 解析 GeoJSON；
5. 只接受 FeatureCollection + Polygon/MultiPolygon；
6. 删除属性、名称和 `crs`；
7. 坐标按固定规则序列化；
8. 写出最小 JSON；
9. 输出派生 SHA-256；
10. `--check` 模式只比较，不改文件。

来源冻结：

```text
Natural Earth Vector v5.1.2
commit f1890d9f152c896d250a77557a5751a93d494776
geojson/ne_110m_land.geojson
public domain
```

### 4.4 测试

```sh
node --test experiences/co-op/our-place-guess/tools/vendor-map.test.js
node experiences/co-op/our-place-guess/tools/vendor-map.mjs --check
git diff --check
```

测试至少证明：

- 错输入哈希失败；
- 畸形 geometry 失败；
- 输出不含 properties / crs；
- 相同输入两次输出逐字节相同；
- attribution 的输入与输出哈希和真实文件一致。

### 4.5 Commit

建议：

```text
assets: vendor offline land map for our place guess
```

完成标准：无需启动游戏，地图来源链已能独立审计和重复验证。

## 5. Part 2：题包解析与虚构示例

### 5.1 目标

实现唯一的题包校验路径；默认示例和 File Picker JSON 都经过同一规则。

### 5.2 文件

新增：

```text
experiences/co-op/our-place-guess/pack.js
experiences/co-op/our-place-guess/pack.test.js
experiences/co-op/our-place-guess/sample-pack.js
experiences/co-op/our-place-guess/sample-pack.test.js
experiences/co-op/our-place-guess/private-pack.example.json
```

模板内容必须是虚构值。文件名应明确 `.example.json`，README 后续要求用户把私人文件保存在作品静态目录之外。

### 5.3 API

建议：

```js
parsePackText(text, { byteLength })
normalizePack(value)
activeCardsFor(pack)
packWarnings(pack)
```

返回：

```js
{
  pack,
  activeCards,
  warnings
}
```

其中：

- `activeCards` 严格等于隔离的 `pack.cards.slice(0, 4)`；
- 不调用随机数；
- 多余卡形成“其余 N 张忽略”警告；
- 所有返回值递归冻结；
- 任何错误都不保留上一个待导入文件的内容。

### 5.4 测试

覆盖规格 12.1，并额外断言：

- 5–24 张保持校验成功；
- 使用前四张且顺序完全不变；
- 多余数量准确；
- 重新解析同一文件结果确定；
- 不把 file name/path 写入 pack；
- 示例恰好四张；
- 示例无真实姓名、地址、URL 和 HTML；
- 模板与示例走相同校验器。

命令：

```sh
node --test experiences/co-op/our-place-guess/pack.test.js
node --test experiences/co-op/our-place-guess/sample-pack.test.js
git diff --check
```

### 5.5 Commit

```text
feat: add deterministic place pack model
```

完成标准：不依赖 DOM、Socket.IO 或地图即可可靠读取、拒绝和冻结题包。

## 6. Part 3：地图数学与交互模型

### 6.1 目标

先实现与 DOM 分离的投影、视口、坐标和 GeoJSON 校验。

### 6.2 文件

新增：

```text
experiences/co-op/our-place-guess/map.js
experiences/co-op/our-place-guess/map.test.js
```

### 6.3 API

建议：

```js
projectPoint(point)
unprojectPoint(position)
normalizePoint(point)
movePoint(point, direction, { fine })
createViewport()
zoomViewport(viewport, level, anchor)
panViewport(viewport, delta)
fitPoints(points)
validateLandGeometry(value)
```

注意：

- 规则层不访问 SVG、DOMMatrix、PointerEvent 或设备像素比；
- 视口只用规范化坐标；
- 精度最多 6 位小数；
- 普通微调 0.5°，细调 0.1°；
- `fitPoints` 对重合点、反经线附近三点和世界边界有确定结果；
- 可视投影与 haversine 计算完全分离。

### 6.4 测试

覆盖规格 12.2。为反经线 `fitPoints` 明确选择“不跨图复制，退回完整世界视图”，避免首版增加世界 wrap 的双重视觉。

命令：

```sh
node --test experiences/co-op/our-place-guess/map.test.js
git diff --check
```

### 6.5 Commit

```text
feat: add offline map interaction model
```

完成标准：所有地图转换和键盘步进都可纯测试，尚不接房间。

## 7. Part 4：游戏 reducer 与距离

### 7.1 目标

实现四轮确定性状态机、密封结果归一化、揭晓和终局摘要。

### 7.2 文件

新增：

```text
experiences/co-op/our-place-guess/logic.js
experiences/co-op/our-place-guess/logic.test.js
```

### 7.3 API

建议：

```js
roundIdFor(gameId, roundIndex)
startGame({ memberIds, activeCards, gameId, version })
revealRound(state, sealedResult, privateCard)
beginNextRound(state, nextPrivateCard)
restartGame(state, { activeCards, gameId })
distanceKm(left, right)
tierForDistance(distance)
summarizeGame(state)
toPublicState(state)
acceptPublicState(current, incoming, context)
```

设计要点：

- `startGame` 接收已确定的前四张，不自行选题；
- `toPublicState(guessing)` 不含 target、revealNote 或未来卡；
- `revealRound` 只接受当前 round/card 的两份合法提交；
- 距离由纯函数重新计算，不接受客户端自报；
- `beginNextRound` 只由房主调用，但公开状态仍需访客验证；
- gameId 由 UI 注入，逻辑层不调用随机 API；
- 状态与 summary 深冻结。

### 7.4 测试

覆盖规格 12.3、12.4，重点：

- 反经线；
- 50/200/800 km 精确边界；
- 两人中较远值决定共同档位；
- 四轮顺序就是题包前四张；
- 重开仍按相同顺序；
- guessing 的 JSON 全树搜索不到目标坐标；
- 结果距离被篡改时访客拒绝；
- 第四轮一次性进入 finished。

命令：

```sh
node --test experiences/co-op/our-place-guess/logic.test.js
git diff --check
```

### 7.5 Commit

```text
feat: add sealed place guessing rules
```

完成标准：给定两位成员、四张卡和密封结果，可重放整局并得到确定摘要。

## 8. Part 5：房间协议门控

### 8.1 目标

在不修改共享运行时的前提下，建立 host state、sealed result、乱序队列和成员重置。

### 8.2 文件

新增：

```text
experiences/co-op/our-place-guess/protocol.js
experiences/co-op/our-place-guess/protocol.test.js
```

### 8.3 API

建议：

```js
reconcileMembership(...)
validateSealedResult(...)
enqueueHostStateEnvelope(...)
replayHostStateEnvelopes(...)
isExpectedHostEnvelope(...)
```

常量：

```js
SEALED_NAMESPACE = "our-place"
STATE_MESSAGE_TYPE = "our-place:state"
MAX_PENDING_ENVELOPES = 4
```

### 8.4 顺序场景

测试至少排列：

```text
ack → sealed result → host state
sealed result → ack → host state
host state → sealed result → ack
duplicate ack/result/state
old host state after migration
member leaves between two submissions
third member attempts submission
```

只有对应 sealed result 可唯一推导的 reveal/finished host state 才能显示。队列溢出失败关闭，不尝试“尽量继续”。

### 8.5 测试

```sh
node --test experiences/co-op/our-place-guess/protocol.test.js
node --test shared/runtime/sealed-rounds.test.js shared/runtime/server.test.js
git diff --check
```

### 8.6 Commit

```text
feat: validate our place room protocol
```

完成标准：协议纯测试覆盖旧 host、第三人、重复提交、乱序和清局。

## 9. Part 6：页面骨架、题包 File Picker 与启动器

### 9.1 目标

建立真实可启动的 C 级页面、房间大厅和房主题包选择；暂不把未完成版本登记为 installed。

### 9.2 文件

新增：

```text
experiences/co-op/our-place-guess/index.html
experiences/co-op/our-place-guess/styles.css
experiences/co-op/our-place-guess/app.js
experiences/co-op/our-place-guess/start.command
experiences/co-op/our-place-guess/start.bat
experiences/co-op/our-place-guess/assets/favicon.svg
```

### 9.3 File Picker

实现顺序：

1. host 选择文件；
2. 先检查 `File.size`；
3. `File.text()`；
4. `parsePackText`；
5. 立即丢弃原始 text 引用；
6. UI 只保留冻结 pack 与安全摘要；
7. 若超过四张，显示忽略数量；
8. host 必须再点击开始；
9. reset 时把 input `.value = ""`，清除 pack 和摘要。

禁止：

- 把文件内容发给 Node；
- 用 `fetch(file.name)`；
- 把 file object 放进全局调试变量；
- console 输出 pack；
- 在 URL、DOM attribute 或错误堆栈中放文件内容。

### 9.4 启动器

从已有渲染合同生成，内容与 `renderMacLauncher("our-place-guess")` / `renderWindowsLauncher("our-place-guess")` 完全一致。macOS 文件需 executable。

### 9.5 验证

```sh
node --check experiences/co-op/our-place-guess/app.js
node --test experiences/co-op/our-place-guess/pack.test.js
node scripts/start.mjs --experience our-place-guess --no-open
```

catalog 尚未登记时，`--experience our-place-guess` 会按合同拒绝未知 ID。执行分支应：

1. 用 `node scripts/start.mjs --no-open` 启动根运行时；
2. 手动打开 `/experiences/co-op/our-place-guess/` 做项目级验证；
3. 用 `renderMacLauncher("our-place-guess")` / `renderWindowsLauncher("our-place-guess")` 定向测试启动器内容；
4. 把“catalog 接入后再验证 launcher 直达”列入总控清单。

不得提交临时 catalog、`installed: false` 伪入口或测试夹具。启动器可以与页面一起提交，但在总控接入前不声称其直达 Gate 已通过。

### 9.6 Commit

```text
feat: add our place room and pack setup
```

完成标准：页面静态结构、房间和 File Picker 可在测试 runtime 下验证，私人包没有离开 host 内存。

## 10. Part 7：SVG 地图、密封回合与完整 UI

### 10.1 目标

把纯模块接到真实 DOM 和 Socket.IO，完成四轮闭环。

### 10.2 实现顺序

1. 加载本地 land asset，失败则阻止开始；
2. SVG 渲染 land；
3. point → pin；
4. pointer click/drag；
5. zoom/pan/reset；
6. keyboard 与四向微调；
7. 提交确认；
8. `room:sealed-submit`；
9. 处理 ack/result；
10. host 计算并发布 reveal；
11. guest 有界队列验证；
12. 结果 fit 三点；
13. 下一轮与终局；
14. 成员、host、disconnect reset；
15. 焦点、live region、reduced motion 和 forced colors。

### 10.3 DOM 秘密审计

在 guessing 阶段自动断言/浏览器检查：

- 没有 `target` 文本、属性、SVG 元素；
- 没有未来卡片；
- 没有 revealNote；
- guest 没有完整 pack；
- 对方提交前后都没有对方坐标，直到 sealed result + verified host state；
- 自己已提交的 pin 可以继续显示，但不能编辑。

### 10.4 验证

```sh
npm test
node --check experiences/co-op/our-place-guess/app.js
git diff --check
```

再用两个 Chrome 上下文至少完成两轮，确认基本同步后才 commit。

### 10.5 Commit

```text
feat: complete our place guessing flow
```

完成标准：未集成门户前，直达 URL 已能由测试运行时完成完整四轮。

## 11. Part 8：项目 README、声明与总控接入清单

### 11.1 文件

新增/更新：

```text
experiences/co-op/our-place-guess/README.md
experiences/co-op/our-place-guess/ATTRIBUTION.md
experiences/co-op/our-place-guess/start.command
experiences/co-op/our-place-guess/start.bat
experiences/co-op/our-place-guess/VERIFICATION.md
```

不修改 catalog、根/分类/docs README、Board、精确计数、共享测试或 `shared/runtime`。

### 11.2 返回总控的 catalog 建议

条目：

```text
id: our-place-guess
category: co-op
level: C
installed: true
network: local-lan
players: 2
```

执行分支只在返回包中提供上述建议，不编辑 catalog。总控按当前 schema 填写、不发明字段，并从真实 catalog 重新计算目录计数。

### 11.3 README

必须含：

- 统一安装与启动；
- 两台设备加入方式；
- File Picker 私人题包模板；
- 前四张确定性顺序和多余卡警告；
- 私人文件不放静态目录；
- 本机 Node 裁判、非端到端加密和可信局域网；
- 无断线续局；
- 经纬度/地图概化限制；
- Posio 固定提交、MIT、版权人、只借鉴什么和不复制什么；
- Natural Earth 固定版本、commit、原始/派生哈希与 public domain；
- Socket.IO 4.8.1；
- 内部经验来源；
- 视觉资产的真实来源。

### 11.4 验证

```sh
npm test
npm run verify
node scripts/start.mjs --no-open
git diff --check
```

启动进程需要在验证后正常终止，证明端口释放。项目分支从根运行时手动访问项目路径；总控接入 catalog 后再核验 health、catalog、launcher 直达与目标 URL，不能把任意 HTTP 200 当成合格。

### 11.5 Commit

```text
docs: document our place guess experience
```

执行分支提交项目 README/ATTRIBUTION/VERIFICATION/启动器，并把共享接入清单交给总控。只有总控在完整 Gate 后更新 catalog、门户、索引、Board 和精确计数，项目才从 Ready for Integration 变为 installed。

## 12. Part 9：Chrome 双端验收

必须使用真实浏览器，不以单元测试代替。

### 12.1 测试矩阵

| 场景 | 主端 | 客端 | 重点 |
| --- | --- | --- | --- |
| 桌面基本局 | 1280×800 | 1280×800 | 四轮、结果、重开 |
| 移动双端 | 390×844 | 390×844 | 触摸、无横向溢出 |
| 混合输入 | 鼠标 | 键盘 | 两条输入路径 |
| 第三人 | 桌面 | 第三上下文 | 容量拒绝 |
| 主机离开 | 桌面 host | 移动 guest | 升主、清局、重选包 |
| 断线 | 停止/恢复 runtime | 双端 | 不自动续局 |
| 私人包 | host File Picker | guest | 完整包不出现在 guest |
| 乱序 | 路由/测试注入 | guest | state/result/ack 排列 |
| 视觉偏好 | reduced motion | forced colors | 可辨与可完成 |
| 放大 | 200% | 200% | 无遮挡、可操作 |

### 12.2 Network

过滤全部请求：

- 允许当前 localhost / LAN host；
- 允许 `/socket.io/`；
- 允许本地 HTML/CSS/JS/GeoJSON；
- 其他 origin 数量必须为 0。

### 12.3 隐私

使用一个包含明显 sentinel 的临时私人题包：

```text
PRIVATE_SENTINEL_DO_NOT_LEAK
```

在访客：

- DOM 文本无 sentinel；
- HTML attributes 无 sentinel；
- Network response/request 无完整 pack 或 sentinel；
- console output 无 sentinel；
- guessing 消息无 target；
- 揭晓只出现当前卡允许公开的 `revealNote`，未来卡 sentinel 仍不可见。

测试结束后不把临时题包放进仓库。

### 12.4 可访问性

检查：

- AX 树；
- 顺序焦点；
- map 当前坐标说明；
- 提交状态；
- 非颜色 pin；
- live region 不刷屏；
- 触控目标；
- 200% 缩放；
- reduced motion；
- forced colors。

### 12.5 验收记录

新增项目内：

```text
experiences/co-op/our-place-guess/VERIFICATION.md
```

记录具体房间流程、视口、Network origin、console、AX、测试命令和结果；不记录真实私人线索、坐标或房间码。

### 12.6 Commit

```text
test: verify our place guess in browsers
```

只有所有 Gate 通过才写“installed”。若核心 Gate 失败，保持 In Progress。

## 13. Bug 修复与提交纪律

### 13.1 实际 bug

只有真实复现的问题才新增：

```text
bugs/2026-07-25-our-place-guess-<unique-slug>.md
```

内容：

- 现象；
- 精确复现；
- 影响；
- 根因；
- 修复；
- 回归测试；
- 相关 commit。

修复与 bug 记录放在同一独立 commit，例如：

```text
fix: keep sealed result ahead of ack
fix: clear private pack after host migration
fix: wrap distance across antimeridian
```

不要把多个无关 bug 合在一个提交，也不要把纯风险预测冒充 bug。

### 13.2 Learn

只有验证得到、能跨项目复用的结论才新增：

```text
learn/2026-07-25-<unique-topic>.md
```

候选主题只有在真实实施后才成立，例如：

- File Picker 私有配置如何避免静态服务泄露；
- 密封结果早于 ack 的 UI 单调状态；
- 无地图框架的 SVG 经纬度交互；
- 地理数据固定 commit + 双哈希派生；
- 反经线点集 fit 的失败关闭策略。

Learn 与证明它的实现/测试一起提交，避免空泛总结。

## 14. 最终命令

项目完成后：

```sh
node --check experiences/co-op/our-place-guess/app.js
node --test \
  experiences/co-op/our-place-guess/pack.test.js \
  experiences/co-op/our-place-guess/sample-pack.test.js \
  experiences/co-op/our-place-guess/map.test.js \
  experiences/co-op/our-place-guess/logic.test.js \
  experiences/co-op/our-place-guess/protocol.test.js
node experiences/co-op/our-place-guess/tools/vendor-map.mjs --check
npm test
npm run verify
git diff --check
git status --short
```

然后复核提交范围：

```sh
git diff --stat 0f778fec714606d9565169c91a94709d7f96db5e..HEAD
git diff --name-status 0f778fec714606d9565169c91a94709d7f96db5e..HEAD
git log --oneline 0f778fec714606d9565169c91a94709d7f96db5e..HEAD
```

## 15. 完成定义

本项目只有同时满足以下条件才完成：

- 四轮核心玩法双端真实完成；
- 私人题包只在 host 浏览器内存；
- 文件顺序前四张合同全链一致；
- 密封结果、host state 和 ack 乱序安全；
- 成员/host 变化、第三人、刷新和断线清局；
- haversine 与反经线正确；
- Natural Earth 固定版本和派生哈希可复现；
- 鼠标、触屏、键盘和移动视口通过；
- Network 无公网请求；
- 项目 README / ATTRIBUTION / VERIFICATION 一致；
- 返回包完整列出 catalog、门户、分类/根/docs README、Board、精确计数和共享定向测试的总控接入项；
- 没有新依赖和 shared runtime 修改；
- 测试、verify、diff-check 与 Chrome Gate 全通过；
- 每个独立部分都有 commit；
- 实际 bug 与 learn 已按真实证据记录；
- worktree 无未解释改动。

任何一项缺失，项目保持 In Progress，不计为已安装。

## 16. 提交序列建议

```text
assets: vendor offline land map for our place guess
feat: add deterministic place pack model
feat: add offline map interaction model
feat: add sealed place guessing rules
feat: validate our place room protocol
feat: add our place room and pack setup
feat: complete our place guessing flow
docs: document our place guess experience
test: verify our place guess in browsers
```

实际 bug 每个追加独立 `fix:` commit。执行分支返回后由总控追加单独 catalog/门户/计数/Board 接入 commit，不重写项目历史。
