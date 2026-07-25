# Capsule Docking 生产 UI 终验

- 日期：2026-07-25
- 项目 ID：`capsule-docking`
- 基线：`main@f729deb`
- 分支：`codex/exp-capsule-docking-ui`
- Worktree：`/Users/zenith/Desktop/two-of-us-worktrees/capsule-docking-ui`
- 范围：`experiences/co-op/capsule-docking/**`
- 结论：项目目录内的生产 UI、输入层、规则核心、测试、文档、借鉴声明和本地直开
  边界均已完成，可交给上层任务登记共享目录入口。

## 本次交付

页面已经从规则核心补齐为一张可直接游玩的本地“纸质近地轨道训练台”：

- 姿态席用 `A / D` 或两个大按钮只管转；
- 推进席用 `J / L` 或两个大按钮只管主推与反推；
- 一个共享舱体、四项公开遥测、六条安全 Gate 与 30 格稳定窗实时投影
  `getPublicView()`；
- 三个航段、漂出、碰壳、重试、暂停、完成日志、纪念态、最终赠言与重开均由
  reducer 控制；
- 鼠标、触笔、触控与键盘共用一套物理输入会话，并在失焦、页面隐藏、离开页面
  和阶段切换时统一清理；
- 页面不加载概念图、远程字体、第三方运行库或任何远程资源；
- 320 px 到 1504 px、200% 等价重排、reduced-motion、forced-colors 与无 JS
  回退均完成真实浏览器验收。

新增项目文件：

- `index.html`
- `style.css`
- `app.js`
- `ui.test.js`
- `README.md`

规则核心、`config.js`、冻结 fixture 和原有借鉴声明保持原规则合同。本分支没有
修改共享目录页、根 README、分类文档、Board 或其他体验；这些入口由上层集成任务
统一处理。

## 分阶段提交

| Commit | 内容 |
| --- | --- |
| `e5c4cd4` | 先提交会失败的生产 UI 静态合同 |
| `300fc2b` | 实现语义 DOM、原生 SVG 舞台、公开状态投影与输入运行时 |
| `fcd6d2c` | 实现纸质训练台样式、响应式布局和项目 README |
| `816a980` | 修复 1280 px 标题意外换行并记录复现 |
| `29af020` | 修复浏览器复用 pointerId 时旧 capture 事件释放新输入 |
| `25d6cfc` | 沉淀 pointer 会话生命周期与测试方法 |

## A 级直接打开证明

生产入口按 `logic.js → config.js → app.js` 的顺序加载经典相对脚本；CSS 也使用
项目内相对路径。静态 UI 合同同时证明：

- 没有 `type="module"`、构建产物、CDN、远程 URL 或运行时概念 PNG；
- 没有 fetch、XHR、WebSocket、EventSource 或动态资源加载；
- 没有 localStorage、sessionStorage、IndexedDB、Cookie 或文件写入；
- 没有摄像头、麦克风、定位、通知、剪贴板或账号权限调用；
- app 只调用 `createInitialState`、`reduce` 与 `getPublicView`，不复制 Gate 计算；
- 运行页面引用的本地 CSS 与脚本全部存在；
- 不需要 npm 安装、构建或本地服务器即可游玩。

因此用户可直接双击 `index.html` 以 `file://` 使用。Chrome 实机验收按仓库约定只
访问 localhost 页面；直开能力由经典脚本与资源闭包测试证明，localhost 只用于
真实交互、系统媒体模式与布局验收。

## 自动化验收

### 项目定向测试

```text
node --check experiences/co-op/capsule-docking/app.js
node --test \
  experiences/co-op/capsule-docking/ui.test.js \
  experiences/co-op/capsule-docking/logic.test.js

tests 29
pass 29
fail 0
```

其中规则核心 22 项，生产 UI 合同 7 项。冻结 fixture 精确重放三条航段并进入完成
与重开状态；另外覆盖失败、重试、SUSPEND、双席参与、public view 隔离和恶意输入。

### 仓库全量测试

干净 worktree 首次执行缺少仓库测试期的 `qrcode` 等现有依赖，出现 4 个加载失败；
这不是项目断言失败。随后按仓库 lockfile 执行 `npm ci` 和 `npm run setup`：
安装 55 个包、审计 56 个包、漏洞为 0，package 与 lockfile 均未变化。

```text
npm test

tests 2354
pass 2354
fail 0
```

### 仓库验收

```text
npm run verify

仓库验收通过：63 个作品入口（55 个 A 级直开、8 个非 A 启动器）、
1 个能力声明、资源与借鉴声明完整。
```

`git diff --check f729deb..HEAD` 同样通过。

## Chrome 实机验收

浏览器通过临时静态服务器访问：

```text
http://127.0.0.1:4187/experiences/co-op/capsule-docking/
```

截图使用 Chrome 扩展浏览器会话的原生 `tab.screenshot`，保存在仓库外临时 QA
目录；验收后已恢复媒体模拟、脚本执行与 viewport，并关闭标签页。最终视觉复核
使用 `view_image` 原尺寸并排查看：

- 接受的桌面概念：
  `docs/assets/capsule-docking/d05-desktop-approaching-partial.png`
- 接受的移动概念：
  `docs/assets/capsule-docking/d12-mobile-390-approaching.png`
- 最新桌面实机截图：`1280-final.png`
- 最新移动实机截图：`390-intro-full.png`
- 失败态、forced-colors、无 JS 和两档 zoom 等价截图也均留在同一临时 QA 目录。

### 功能与状态

- 初始态、航段说明、approaching、漂出失败、碰壳失败、重试和暂停均在浏览器真实
  操作中验证；
- Enter 启动训练，Space 开始航段，Escape 返回航段说明并把焦点移到阶段标题；
- 主推按钮长按真实改变位置与速度，紧接着反推可产生反向速度，四键最终均为
  `aria-pressed="false"`；
- 连续长按主推会触发漂出失败，舱体停在最后安全位置、路径显示“未安全”、控制
  全部 disabled；重试后只重置当前段并增加 attempt；
- 姿态与推进组合可触发碰壳失败，状态文案保持共同、中性，不归咎某一席；
- 窗口失焦真实触发 SUSPEND，清空 held input 并安全回到航段说明；
- 三条完整成功路线、`docked → mission-result → complete → restart` 由冻结规则
  fixture 精确重放验证。当前 Chrome 控制通道不能可靠派发任意持续时长的 keydown
  或两点同时触控，因此没有伪造“浏览器三段手动通关”；实机输入证据与完整规则
  路线证据分别保留；
- 最终控制台 warning/error 为 0。

### 响应式矩阵

| 验收档 | 结果 |
| --- | --- |
| 1504×1046 | `scrollWidth === clientWidth`；952×596 主舞台、Gate、两席、stable 与日志均在首屏 |
| 1280×800 | `scrollWidth === clientWidth`；803×503 主舞台，标题单行，主动作与四遥测均在首屏 |
| 390×844 | `scrollWidth === clientWidth`；344×217 舞台，遥测 2×2、六 Gate 完整、两席自然堆叠 |
| 320×568 | `scrollWidth === clientWidth`；282×179 舞台；失败态主动作与最后安全位置不裁切 |
| 640×400 | 1280×800 的 200% 等价 CSS 视口；无横向滚动，四个按钮均约 270×72 |
| 752×523 | 1504×1046 的 200% 等价 CSS 视口；无横向滚动，四个按钮均 323×72 |

宿主 Chrome 的缩放快捷键在当前自动化通道不会改变页面 zoom，因此 200% 使用
物理尺寸除以二的等价 CSS viewport 验证回流与横向溢出。它覆盖相同断点与可用
宽度，但不声称验证浏览器缩放 UI 本身。

390 / 320 下 `main` 的直接子级仍严格保持页头、阶段、舞台、遥测、Gate、姿态席、
推进席、稳定窗、日志、live region 的冻结顺序；没有 CSS `order` 或
`display: contents`。390 下四个按钮中心点均由 `elementFromPoint` 命中自身，
按钮尺寸约 154×68。

### 系统模式、无障碍与请求边界

- `prefers-reduced-motion: reduce` 实机匹配为 true；控制动画为 `0s`，过渡压缩到
  `1e-06s`，不改变规则状态；
- `forced-colors: active` 实机匹配为 true；页面、按钮、接口、Gate 线型与
  安全/未安全文字仍可区分；
- 禁用 JavaScript 后只显示标题、固定规则、原创静态舱体/接口示意、开启本地 JS
  提示与非训练声明，不伪造可玩状态；
- 运行 DOM 中 `document.images.length === 0`，所以图片阻断不会损伤页面；
- 页面只声明 localhost 下的 `style.css`、`logic.js`、`config.js` 和 `app.js`，
  没有应用外部 HTTP(S) 资源；
- 四个控制都是原生 `<button type="button">`，有完整席位、动作和键位 accessible
  name；阶段标题可聚焦，只有一个克制 live region，逐 tick 遥测不刷屏；
- Gate 同时使用中文状态、行结构和线型/颜色，pressed 与 disabled 也不只靠颜色。

## 视觉忠实度台账

| 概念锚点 | 生产实现与实机证据 |
| --- | --- |
| 一整张纸质训练台 | 暖灰纸底、细点纸纹、单层象牙面板、短阴影和少量黄铜点保持完整桌面感 |
| 深炭蓝观察窗是唯一强舞台 | desktop 803×503 / 952×596 舞台占据主面积，移动端仍保持完整比例 |
| 一艘共享纸模面对右侧接口 | 舱体、接口、安全窗与刻线均由原生 SVG/CSS 生成，位置只投影 public view |
| 姿态珊瑚、推进青绿等权 | 两席同宽、同按钮数量与同高度；席位、动作和键帽提供非颜色冗余 |
| 连续遥测带与六行 Gate | 桌面四项形成连续 2×2 紧凑带，Gate 是一张六行清单而不是六个 bento 卡 |
| 大而有按压感的控制 | 桌面按钮 72 px 高；390 px 为约 154×68，并保留边框、键帽与按下阴影 |
| 移动端自然长卷 | 390 / 320 严格按冻结 DOM 顺序堆叠，遥测 2×2、两席各自成组、stable 与日志在后 |
| 克制而非军事/品牌化 | 没有 NASA、SpaceX、ISS、真实舱段、HUD、霓虹、得分、燃料或排行榜 |
| 系统可访问模式不脱形 | reduced-motion 去动态，forced-colors 保留边界、焦点和 Gate 文本 |

视觉偏差均属于 369 明确允许或要求的生产校正：

- 不逐像素复制生成图，桌面按冻结语义顺序布局，Gate 与舞台只保持紧邻关系；
- 删除生成图里的 `Gate 1`—`Gate 6` 英文编号；
- 删除生成图的角度符号和伪真实精度，只显示 core 定义的“距离单位 / 角度格”；
- 使用简洁的原创纸模 SVG，不复制概念图中的写实舱体与接口细节；
- 真实移动 viewport 会自然增高，不把 853 px 宽概念长图误当作 390 CSS px。

## 文案差异核对

冻结标题、规则短句、本地不联网声明、非训练声明、四项遥测名、六条 Gate、两席名、
四个动作、键位、稳定窗、失败原因与主动作均来自 177 / 369 与 core public view，
没有新增分数、燃料、倒计时、排行榜、金路径或个人归责文案。

概念图中的英文 Gate 编号、静态数值、角度符号和 `接近中` 示例不被当作文案或
状态合同；生产页在初始截图中正确显示 `intro` 的“先分好两席”，在真实操作后才
显示 approaching / failed 的对应状态。无 JS 提示是 369 要求的诚实回退文案。

## 问题闭环与沉淀

| 问题 | 修复提交 | 记录 |
| --- | --- | --- |
| 1280 px 标题受字符宽度上限影响而换行 | `816a980` | `bugs/capsule-docking-1280-title-wrap.md` |
| 浏览器复用 pointerId，旧 lostpointercapture 释放新按钮 | `29af020` | `bugs/capsule-docking-reused-pointer-lostcapture.md` |

通用的 input epoch、目标、时间戳三层隔离策略与测试建议记录在
`learn/capsule-docking-pointer-session-lifecycle.md`。

## 借鉴声明核对

生产实现没有引入第三方运行依赖，也没有复制下列来源的源码、API、常量、算法表达、
测试、界面、品牌或素材。项目 README 与 `ATTRIBUTION.md` 固定记录 commit、
许可证、版权、仅研究的抽象点和明确未采用内容：

- Farama Gymnasium `20b453de30ef725a538e235fcdec909f30c95783`（MIT）：
  只研究公开状态类别分层；
- `schteppe/p2.js@2beb2750f42d29014e289cb803b7269d5b0edaad`（MIT）：
  只研究 fixed-dt、accumulator、最大子步和规则/渲染分离；
- `jriecken/SAT.js@20e612681d1f9eabc9ea34dc98c4d27f985ffec6`（MIT）：
  只研究粗排除、精确碰撞与安全判定分层；
- Phaser `41be1e462bc600064e498cba370bfa8c5c055a22`（MIT）：
  只研究按下/抬起、repeat 过滤、失焦复位和监听器清理职责；
- NASA NTRS Orion RPOD 论文只用于理解四类公开观察量，没有复制论文、参数、
  图形、导航/控制算法或安全结论。

固定许可证链接、版权原文、许可证哈希、维护状态和零复制边界见项目
`ATTRIBUTION.md` 与 `docs/228-capsule-docking-source-refresh.md`。

## 最终结论

Capsule Docking 在自己的项目范围内已经达到生产可用状态：三航段规则闭环、双席
输入、失败与清理边界、隐私、A 级本地直开、响应式、系统可访问模式、无 JS 回退、
测试、视觉忠实度以及借鉴声明全部完成。共享目录入口仍由上层仓库集成任务统一
登记，不属于本分支缺口。
