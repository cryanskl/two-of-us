# `dual-maze-race` 生产 UI 最终验证

> 验收日期：2026-07-26  
> 项目 ID：`dual-maze-race`  
> 对外标题：**同路，谁先到**  
> 分类：双人对抗  
> 本地等级：A  
> 分支：`codex/exp-dual-maze-race-production-ui`  
> worktree：`/Users/zenith/Desktop/two-of-us-worktrees/dual-maze-race-production-ui`  
> 基线：`df4d0cc2b6232fb034ccee0b2970928debc6f5c6`

## 1. 结论

**PASS，可进入集成。**

生产 UI 已完成，玩法、公开投影、输入、固定拍、暂停、换席和结算都由既有确定性
核心负责；`app.js` 只承担浏览器事件适配和 DOM 投影，不维护第二份比赛规则。

页面使用原生 HTML、CSS、JavaScript 与 Unicode，生产运行不依赖第三方包、图片、
字体、音频、网络、权限或存储。直接双击 `index.html` 即可运行；localhost 仅用于
受控 Chrome 验收。

完整四局实测结果为：

```text
第 1 局 COUP：左席玩家一获胜
第 2 局 COUP：交换左右席，右席玩家一获胜
第 3 局 PAIR：左席玩家一 / 右席玩家二，玩家二获胜
第 4 局 PAIR：再次交换左右席，左席玩家二获胜
终局：2 : 2，显示“四局打平”
```

“再来一局”实测回到第 1 / 4 局、双方 0 分的干净输入检查。

## 2. 交付范围

生产目录：

- `index.html`：语义化本地入口、经典脚本顺序和诚实的无脚本说明；
- `styles.css`：暖纸双迷宫、比赛信息轨、六档响应式和系统可访问模式；
- `app.js`：浏览器输入、固定步驱动、生命周期暂停与公开 DOM 投影；
- `ui.contract.test.js`：生产 UI 静态合同；
- `README.md`：直开、玩法、输入、隐私、自定义和测试说明；
- `ATTRIBUTION.md`：独立实现、概念图和来源边界。

既有 `config.js`、`logic.js` 与 `logic.test.js` 作为唯一规则源保留。

本轮还新增：

- `bugs/2026-07-26-dual-maze-race-height-clipping.md`
- `learn/2026-07-26-height-aware-game-layout.md`
- 本验证文档

没有修改 catalog、根门户、分类 README、`docs/README.md`、orchestration board 或
共享依赖清单。

## 3. 核心与 UI 信任边界

生产入口按以下顺序加载相对经典脚本：

```text
config.js → logic.js → app.js
```

UI 的比赛数据只来自：

```text
浏览器事件
→ DualMazeRaceLogic 的公开 action / step 接口
→ getPublicView(state)
→ DOM
```

静态合同锁定：

- 页面不读取私有队列、解题路径、maze fingerprint 或 PRNG 状态；
- 双方棋盘消费同一个公开 maze DTO；
- 玩家标记与左右席按当前 heat 的公开 seat 映射渲染；
- 八个方向操作都是原生 `button`；
- 键盘和按钮只入队方向，不直接修改位置、分数或胜负；
- 每帧最多追赶 5 个固定拍，超过 500ms 的 stall 转为安全暂停；
- blur、hidden 与 pagehide 都清空待处理输入并暂停；
- 暂停恢复使用核心规定的重新倒数，不偷偷消耗比赛时间。

## 4. Chrome 完整路线

### 4.1 四局比赛与换席

受控 Chrome 从开场完成输入检查、四个 heat、终局与重开。

每个 heat 都使用真实键盘方向输入沿当前 maze 合法路径移动到终点。实测：

- COUP 与 PAIR 各运行两次；
- 同一张图的第二次运行交换左右席与键位；
- 玩家身份跟随标记，不跟随屏幕位置；
- 两张棋盘始终同方向、同尺寸、同起点和同终点；
- 单方到达只给该玩家 1 分；
- 第四局后正确进入 match result，不出现第五局；
- 终局比分 2 : 2，双方各两胜；
- 重开清除比分、局数、撞墙数、计时与上一场结果。

第一局计时较长是自动验收计算路线期间页面正常继续计时，不是状态机或显示错误；
后续三局均在约 1.6–1.8 秒的自动输入路径内完成。

### 4.2 键盘、按钮与触控

输入检查逐项验证：

- 左席：`W / A / S / D` 四方向；
- 右席：`↑ / ← / ↓ / →` 四方向；
- 八项检测完成前不能开始；
- 自动化接口不能忠实复现一块实体键盘的硬件 ghosting，因此没有伪称实体双键
  并按一定可用；
- 页面会明确提示同时按 `D + ←` 做本机检查；失败或未证明时，必须确认风险才可
  继续，并推荐两组屏幕按钮。

真实控件路径：

- 左、右两席原生方向按钮均能移动；
- 原生按钮获得焦点后，Space 能再次激活；
- 撞墙动作只增加当前玩家撞墙数，不移动位置；
- CDP `Input.dispatchTouchEvent` 分别对左席、右席 52px 方向按钮执行真实
  touch start/end，两边的检查状态都从未完成变为 `✓ 上`；
- 没有 pointerdown 与 click 双重入队。

### 4.3 暂停与生命周期

- 共享“暂停比赛”会禁用八个移动按钮；
- 暂停期间计时和位置冻结；
- “重新准备”进入核心规定的恢复倒数；
- 切换到其他标签使页面 hidden 时自动暂停；
- 回到页面不会自行恢复，必须由用户明确点击；
- 终局和重开后没有遗留 animation frame 或旧输入。

## 5. 六视口 Gate

同一真实 Chrome racing 状态通过同源、精确尺寸 viewport harness 验证；临时
harness 在验收后删除，没有进入提交。

| 视口 | 双棋盘宽度 | 最小方向按钮 | 控制区 / 暂停可达 | 横向溢出 |
|---|---:|---:|---|---|
| 1536×1024 | 520 / 520px | 52px | 首屏完整 | 无 |
| 1440×900 | 450 / 450px | 52px | 首屏完整 | 无 |
| 1280×800 | 350 / 350px | 52px | 首屏完整 | 无 |
| 768×1024 | 361 / 361px | 58px | 首屏完整 | 无 |
| 390×844 | 178 / 178px | 52px | 首屏完整 | 无 |
| 320×700 | 148 / 148px | 52px | 纵向滚动可达 | 无 |

补充桌面实测 1728×906：

```text
boardWidth = 456px / 456px
buttonMin = 52px
pauseBottom = 820.86px
statusBottom = 852.86px
scrollHeight = innerHeight = 906px
```

这组证据对应本轮修复的“宽屏但低高度”场景。

## 6. 系统模式与无脚本

Chrome 通过 DevTools Protocol 实际切换媒体条件：

- `prefers-reduced-motion: reduce`：`matchMedia` 为 true，body 动画与按钮过渡
  计算值均为 `0.00001s`；
- `forced-colors: active`：`matchMedia` 为 true，正文、背景和按钮边框切到系统
  黑白色，边界仍可见；
- 测试后已清除媒体模拟，恢复默认浏览器状态。

无 JavaScript 通过 sandboxed same-origin iframe 禁止脚本后验证：

- 显示标题“同路，谁先到”；
- 显示“需要启用 JavaScript”及原因；
- 不伪造可玩的计时、移动或结算状态；
- 静态规则与“不联网、不保存、不申请权限”说明仍可读。

## 7. 本地、网络与隐私

项目页重新加载只请求 localhost 下的 5 个相对文件：

```text
index.html
styles.css
config.js
logic.js
app.js
```

生产文件没有 `fetch`、XHR、WebSocket、Storage、Service Worker、远程 URL 或权限
API；名字、比分、迷宫和结果只存在当前页面内存。Chrome console 最终
error / warning 为 0。

Chrome Browser Use 安全策略明确拒绝导航到 `file://`，并要求不得以 CDP 或其他
手段绕过，所以没有伪称自动化完成了 `file://` 点击流程。A 级直开能力由以下证据
闭合：

- 经典相对脚本与样式资源闭包；
- 生产运行零网络 API、零远程资源；
- 项目静态 UI 合同；
- README 双击说明；
- 仓库 `verify` 对资源与借鉴声明的完整检查。

## 8. 概念图 fidelity ledger

最终 racing 截图与已确认的桌面、移动概念图在同一 QA 轮次逐张核对。保留：

1. 顶部只有一个中文主标题“同路，谁先到”，没有额外英文 eyebrow；
2. 暖纸背景、深蓝墨线和克制的技术图纸装饰；
3. 单条共享比赛信息轨，左右分数等权、局数与时间居中；
4. 两块等尺寸、同方向、同 maze 的棋盘并列；
5. 蓝色点纹圆与红色斜纹菱形同时使用形状、纹理和颜色区分；
6. 左侧起点与右侧绿色终点在两块棋盘上保持一致；
7. 玩家身份、左右席和键位在换席后动态更新；
8. 两组四方向控制与中央共享暂停保持同一操作层级；
9. 390px 仍双盘同屏，320px 无横向溢出且关键操作可纵向到达；
10. reduced-motion 与 forced-colors 不破坏身份、迷宫墙、起终点和原生按钮。

有意差异：

- 概念图只固定构图，生产迷宫必须使用核心生成的真实 COUP / PAIR 数据；
- 生产计时、分数和撞墙数显示核心实时值，不复制概念图样例数字；
- 纸张纹理、复杂线端和生成式小图标改为 code-native CSS 与 Unicode；
- 1280×800 为保留完整控制区把棋盘压到 350px，这是可达性优先的高度适配；
- 撞墙提示按玩家独立显示，避免概念图单一提示无法归属。

除上述规则真值与可访问性差异外，active-race 首屏没有未解释的文案偏差。两张概念
PNG 只作为 `docs/assets/dual-maze-race/` 设计证据，不被运行页引用。

最终截图：

```text
/var/folders/yy/cz9rs8dd18n_gqtkc3h1hlsh0000gn/T/dual-maze-race-final-active.png
SHA-256 357156bd06f692130f40dd6a1b911b7133528e403b79bdcd51acf87995a76e91
```

## 9. 实际 Bug 与 Learn

真实 Chrome 首轮验收发现 1728×906 的宽屏低高度窗口中，560px 棋盘把部分方向
按钮推到首屏以下。

根因：原响应式只有宽度预算，没有把正方形棋盘、HUD 和两组 3×3 控制区共同纳入
高度预算。

修复：

- 新增 `min-width: 901px` 且 `max-height: 1100px` 的高度 Gate；
- 棋盘限制为 `min(100%, calc(100vh - 450px), 520px)`；
- 收敛非关键标题、留白和重复说明；
- 保持方向按钮不小于 52px；
- 通过 `body[data-phase]` 只在比赛阶段隐藏重复的本地说明。

记录：

- `bugs/2026-07-26-dual-maze-race-height-clipping.md`
- `learn/2026-07-26-height-aware-game-layout.md`

## 10. 自动化门禁

项目级：

```text
node --check experiences/versus/dual-maze-race/app.js
node --test experiences/versus/dual-maze-race/logic.test.js \
  experiences/versus/dual-maze-race/ui.contract.test.js
git diff --check
```

结果：

```text
tests 31
pass  31
fail  0
```

其中核心 27 项、生产 UI 合同 4 项。

完整仓库：

```text
npm ci --no-audit --no-fund
npm test
npm run verify
```

结果：

```text
npm ci：安装 55 个锁定包，依赖清单与锁文件无修改
npm test：tests 2445，pass 2445，fail 0
npm run verify：
仓库验收通过：72 个作品入口（64 个 A 级直开、8 个非 A 启动器）、
1 个能力声明、资源与借鉴声明完整。
```

## 11. 借鉴与许可证

没有参考、复制或改写开源游戏项目、第三方源码、迷宫素材、图标、字体、音频或视觉
资产。玩法核心、迷宫生成、四局换席、生产 UI、CSS 和测试均为仓库独立实现。

`ATTRIBUTION.md` 已明确：

- 一手标准与官方资料只用于校准 Web、可访问性和输入边界；
- 两张 OpenAI ImageGen 概念图只用于 docs 设计确认；
- 生产页不加载概念图；
- 当前没有第三方 OSS 代码或资产，因此没有需要继承的运行许可证；
- 未来若借鉴开源项目，必须补充固定 commit/tag、LICENSE URL、版权主体、
  实际借鉴点与未复制范围。

## 12. 分段提交

1. `49803c5` `test: freeze dual maze production ui contract`
2. `b2a17ff` `feat: build dual maze race interface`
3. `bdc1bc9` `docs: document dual maze race and visual provenance`
4. `f661242` `fix: keep dual maze controls within active viewport`

本文件随后以独立验证文档提交。未 push。

## 13. `main` 集成复验

项目在 2026-07-26 合入 `main` 后再次完成独立复验。这里的数据覆盖前文第 10 节
记录的分支阶段快照：

```text
项目级：tests 32，pass 32，fail 0
项目 + 共享目录 + 仓库合同：tests 229，pass 229，fail 0
完整仓库：tests 2469，pass 2469，fail 0
npm run verify：
仓库验收通过：75 个作品入口（67 个 A 级直开、8 个非 A 启动器）、
1 个能力声明、资源与借鉴声明完整。
创意池：52 / 60，惊喜 18、合作 18、对抗 16，剩余 8。
```

共享集成提交：

```text
e600c76 feat: catalog dual maze race
```

受控 Chrome 从拥有 75 张卡片、75 个体验链接且链接不重复的根门户真实点击进入。
输入检查的八个方向按钮全部由真实点击点亮；浏览器无法证明实体键盘同时按键能力时，
页面诚实展示风险说明，并要求显式确认后才允许开始。随后倒数进入第一局 COUP，
左右两块棋盘各渲染 81 个格子且无横向溢出。

自动化控制停顿触发了“页面停顿过久”的公平暂停，证明长帧保护在生产运行中生效，
且不会补算停顿时间。页面控制台 error / warning 均为 0。最后通过页面可见的
“返回作品集”链接真实返回根门户，并再次确认 75 个体验链接、75 个唯一目标以及
唯一的 `dual-maze-race` 入口。

集成复验还闭合了两个文档与导航缺口：

- `ATTRIBUTION.md` 原先残留核心阶段的“尚无生产 UI”说明，已改为生产阶段真值；
- 体验页原先缺少返回门户路径，已增加对 `../../../index.html` 的可见相对链接。

对应记录：

- `bugs/2026-07-26-dual-maze-race-stale-attribution-phase.md`
- `bugs/2026-07-26-dual-maze-race-missing-portal-return.md`
- `learn/2026-07-26-attribution-docs-must-advance-with-ui.md`
- `learn/2026-07-26-local-experience-navigation-loop.md`

最终结论：**PASS，已安装、已编目、可从门户进入并返回。**
