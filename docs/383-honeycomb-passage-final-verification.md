# Honeycomb Passage 生产 UI 终验

- 日期：2026-07-25
- 基线：`main@f729deb`
- 分支：`codex/exp-honeycomb-passage-ui`
- Worktree：`{worktree-base}/honeycomb-passage-ui`
- 范围：`experiences/versus/honeycomb-passage/**`
- 结论：项目生产 UI、热座闭环、响应式、A 级直开契约、借鉴声明与测试均已完成，
  可进入共享目录集成阶段。

## 本次交付

“蜜径相逢”从既有冻结规则核心补齐为可直接游玩的双人热座对抗：

- 权威 `view.boardCells` 投影精确 37 个原生六角格按钮；
- 每个半回合可选择移动或封蜡，合法行动后必须把页面交给下一位；
- 交接 gate 只暂停界面输入，确认本身不 dispatch core，也不追加 history；
- 不合法格仍可聚焦、点击并获得具体原因；
- 封住任一方最后永久路线的行动会被拒绝且不消耗封蜡；
- 终局保留最终棋盘，并只从权威 move history 重建真实路线；
- 鼠标、触控、Tab、Enter、Space、reduced-motion 与 forced-colors 均可使用；
- 页面不加载概念 PNG，不依赖构建、远程资源或第三方运行库。

本分支没有修改共享 catalog、根入口、分类 README、Board 或共享运行时。

## 分阶段提交

| Commit | 内容 |
| --- | --- |
| `77888e7` | 由子代理冻结生产 UI 红测试契约 |
| `9fd9481` | 实现生产 UI、热座交互、响应式、README 与借鉴声明 |
| `d9f80c9` | 修复标题展示层截获顶部格点击，并写入 bugs |
| `c9e9771` | 修复桌面/横屏动作轨道溢出，并写入 bugs |

最终验收文档与学习记录由本次文档提交补齐。

## A 级直接打开证明

入口使用经典相对资源：

```text
index.html
  → styles.css
  → config.js
  → logic.js
  → app.js
  → favicon.svg
```

UI 契约证明：

- 没有 `type="module"`、远程 URL、动态 import 或运行时概念图；
- 没有 fetch、XHR、WebSocket、Worker、Service Worker 或外部字体；
- 没有 localStorage、sessionStorage、IndexedDB、Cookie、query 或 hash 状态；
- 没有媒体、设备权限或必须经过用户手势解锁的依赖；
- 全部 HTML 引用都是项目内存在的相对文件；
- no-JS 时不出现可误点的空按钮，只显示静态说明与开启 JavaScript 提示。

因此用户可以直接双击项目的 `index.html` 以 `file://` 使用。真实 Chrome 验收按约定
使用 localhost；A 级能力由静态闭包测试证明，localhost 只承担实际交互、触控和布局
验收。

## 自动化验收

### 项目定向测试

```text
node --test \
  experiences/versus/honeycomb-passage/logic.test.js \
  experiences/versus/honeycomb-passage/ui-contract.test.js

tests 33
pass 33
fail 0
```

其中规则核心 25 项，生产 UI 契约 8 项；核心包含固定种子至少 1000 步合法随机游走。

### 仓库全量测试

新 worktree 首次运行缺少仓库已经锁定的 `qrcode` 等测试依赖，先执行：

```text
npm ci
npm run setup
```

安装 55 个包、审计 56 个包，漏洞为 0；依赖清单与 lockfile 均未变化。补齐既有依赖后：

```text
npm test

tests 2355
pass 2355
fail 0
```

### 仓库验收

```text
npm run verify

仓库验收通过：63 个作品入口（55 个 A 级直开、8 个非 A 启动器）、
1 个能力声明、资源与借鉴声明完整。
```

`git diff --check` 与基线范围检查同样通过。

## Chrome 实机验收

浏览器通过临时静态服务器访问：

```text
http://127.0.0.1:8765/experiences/versus/honeycomb-passage/index.html
```

### 完整功能路径

已完成下列真实点击路径：

1. 开始后焦点进入回合标题，DOM 恰有 37 个 cell button；
2. 交替封蜡 `0,-3`、`0,-2`、`0,-1`、`0,1`、`0,2`、`0,3`；
3. 每次合法封蜡后 gate 可见、37 格与模式按钮禁用、焦点进入交接确认；
4. 每次确认只关闭 gate，回合、history 与库存不因确认额外增长；
5. 蜜黄尝试封蜡 `0,0`，页面显示“这格会让双方无路可走。”；
6. 拒绝后封蜡仍为双方各 1 枚、blocked 仍为 6、回合不变、焦点留在 `0,0`；
7. 双方再沿固定移动序列交替行动，蜜黄第 17 手抵达 `3,0`；
8. 结果为“蜜黄先到对岸”“第 17 手抵达目标边”，路线段恰有 11 条；
9. Tab 进入“再来一局”，Enter 重开后 blocked 清零、焦点回到开始按钮。

键盘另外验证：

- Space 切换封蜡并提交合法格；
- Enter 确认热座交接；
- Space 触发远端非法移动后，焦点留在原格，视觉状态和 live region 同步解释。

真实触控通过 CDP `Input.dispatchTouchEvent` 点击暮紫合法格 `2,0`，棋子完成移动、
gate 出现且焦点进入确认按钮，不是用脚本直接调用 handler。

### no-JS 与系统辅助模式

- 禁用 JavaScript 后 `experience-root.hidden === true`；
- 可见按钮为 0，静态标题、玩法和“请开启 JavaScript”提示可见；
- `prefers-reduced-motion: reduce` 下 cell 动画、cell 与模式 transition 都为 `0s`；
- `forced-colors: active` 下六角格保留 2px 系统边界，合法标记使用系统链接色；
- 键盘聚焦模式按钮时仍有 3px solid outline 与 4px offset；
- 控制台错误、warning 和未处理异常均为 0。

### 响应式矩阵

| 视口 | 几何结果 |
| --- | --- |
| 1440×900 | 37 格；棋盘、模式与状态在首屏；无横向溢出 |
| 1280×800 | 37 格；模式下沿 742px；无横向溢出 |
| 768×1024 | 37 格；最小 cell 70×81px；无横向溢出 |
| 390×844 | 完整棋盘、模式、状态都在首屏；最小 cell 53×61px |
| 320×568 | 最小 cell 45×52px；无横向溢出；内容自然纵向滚动 |
| 844×390 | 棋盘下沿 377px、模式/状态下沿 382px；无页面滚动 |

移动端组件顺序为标题 → 回合 → 双席摘要 → 棋盘 → 说明 → 模式 → 状态；不存在
fixed 或 sticky 控件覆盖棋盘。

### 请求边界

CDP `Network.requestWillBeSent` 捕获到的应用资源只有 localhost 下：

- HTML；
- CSS；
- `config.js`、`logic.js`、`app.js`；
- 项目 favicon。

没有加载任何外部 HTTP(S) 资源，也没有 loading failure、Runtime exception 或 Log
error。捕获中的 `chrome-extension://.../cursor-chat.png` 来自浏览器验收工具光标，
不是应用请求。

## 视觉忠实度台账

最终浏览器截图与已确认概念逐项比对：

| 概念目标 | 生产实现 | 取舍与证据 |
| --- | --- | --- |
| 暖象牙手工纸 | 锁定 `#f3e8cf`，仅用 code-native 纸纤维点纹与微弱明暗 | 不打包概念 PNG、不用远程纹理 |
| 37 格纸雕蜂巢 | 权威 `view.boardCells` 创建 37 个 clip-path button | 概念格数不作为几何来源 |
| 蜜黄 / 暮紫棋子 | CSS 棋子保留花形与菱形刻纹 | 不只靠颜色区分 |
| 酒红封蜡 | CSS 圆蜡封中央显示“封” | 没有复制概念叶脉素材 |
| 当前模式单一突出 | move 只显示点圈，seal 只显示斜线，`aria-pressed` 同步 | 不采纳概念中两类候选同时出现 |
| 底部薄纸轨 | 双席摘要分居两侧，模式按钮居中 | 1280×800 下完整落在首屏 |
| 手机纵向顺序 | 完整兑现规格顺序，390×844 全部核心操作可见 | 不采纳概念图错误格数与高度 |
| 结果克制复盘 | 最终棋盘、双方摘要、结语和 history 路线保留 | 不使用烟花、奖杯或假路线 |
| 紫色键盘焦点 | 3px 暮紫轮廓与 4px offset | 与规则选择状态分离 |
| 系统降级 | reduced-motion 与 forced-colors 都有真实浏览器证据 | 状态仍有文字与图形冗余 |

最新桌面实现保留概念的左上标题、中央回合、单一蜂巢焦点和底部轨道，但将概念中
不可验证的伪格数、同时显示的两类候选、生成式叶脉细节与任意终局路线全部移除。

## 问题闭环与沉淀

| 问题 | 修复提交 | 记录 |
| --- | --- | --- |
| 标题透明矩形截获顶部格点击 | `d9f80c9` | `bugs/honeycomb-passage-title-hit-target-layer.md` |
| 1280×800 与 844×390 动作轨道溢出 | `c9e9771` | `bugs/honeycomb-passage-action-rail-viewport-overflow.md` |

热座交接与权威状态的分层原则已记录在
`learn/honeycomb-passage-presentation-only-handoff.md`。

## 借鉴声明核对

生产实现是本仓库独立代码，零第三方运行依赖。README 与 ATTRIBUTION 固定记录：

- Red Blob Games：只核对轴坐标、六邻接与图寻路教学概念；
- `flauwekeul/honeycomb@6353276ef8197fbdba60d0c964f7bd4f2169064c`
  （MIT，Copyright © 2017 Abbe Keultjes）：只核对职责分层；
- `tridpt/TwoPlayerGames@c96b802232d87d58408ed653dcbe43c0a68611f6`
  （MIT，Copyright © 2026 tridpt）：只作为主动避开的 Hex 连边落子反例；
- W3C WCAG 2.2：只校准键盘、焦点、状态消息和目标尺寸。

没有复制、翻译、改写或打包上述来源的代码、API、测试、DOM、CSS、示例、图片、
字体、音频或品牌元素；固定来源、许可证链接、版权与排除边界见项目
`ATTRIBUTION.md`。

## 最终结论

Honeycomb Passage 在项目范围内已达到生产可用状态：规则、热座交接、最后路线保护、
终局与重开、A 级直开、键盘与触控、辅助模式、六视口、隐私、测试及借鉴声明全部
通过。共享目录登记仍由上层集成任务统一完成。
