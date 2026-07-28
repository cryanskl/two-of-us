# “今晚，点三束光”生产 UI 最终验收

- 验收日期：2026-07-25
- 项目：`experiences/surprises/wish-fireworks/`
- 分支：`codex/exp-wish-fireworks-ui`
- 独立 worktree：`{worktree-base}/wish-fireworks-ui`
- 起点：`3aaba821ecbb3a5db06c4cb9139d4e15a96116e3`
- 结论：**通过；达到 A 级直接本地打开边界**

## 1. 交付范围

本批在已有冻结核心上增加：

- `index.html`：语义化经典脚本入口、no-JS 静态内容、持久控件节点；
- `app.js`：输入适配、Canvas 表现、CSS 降级、结果焦点与生命周期清理；
- `styles.css`：深靛夜空、低矮屋顶、暖金点阵、梅红控件、暖纸短笺和响应式；
- `ui.test.js`：A 级入口、输入/隐私、视觉降级与 README 合同；
- `README.md`：直接双击、玩法、个性化、隐私和固定借鉴声明。

没有修改共享 catalog、根入口、分类 README、共享 runtime、依赖声明或其他项目。
生产运行时没有新增依赖；所有路径均为同目录相对路径，且按
`config.js → logic.js → app.js` 的经典脚本顺序加载，所以不需要模块服务器或构建。

## 2. 自动化 Gate

| Gate | 结果 |
| --- | --- |
| `node --check config.js / logic.js / app.js` | 通过 |
| `node --test logic.test.js ui.test.js` | 35/35 通过 |
| 8,000 组三束高度序列 | 全部得到字节等价 complete state/view |
| `npm test` 第一次 | 环境失败：独立 worktree 未安装已声明的 `qrcode` |
| `npm ci` | 按既有 lockfile 安装 55 个包；0 漏洞；无 package 文件修改 |
| `npm test` 复跑 | 2314/2314 通过 |
| `npm run verify` | 通过：58 个作品入口、1 个能力声明、资源与借鉴声明完整 |
| `git diff --check <base>..HEAD` | 通过 |
| build/typecheck | 根项目没有 `build` 或 `typecheck` script；以 Node 语法检查、定向测试和统一 Gate 代替 |

第一次统一测试失败只属于 worktree 依赖未安装，不是代码缺陷；安装的是仓库已经统一
声明并锁定的依赖，`node_modules` 未提交，Wish 自身仍是零运行依赖。

## 3. 真实 Chrome 验收

验收页面通过只监听 `127.0.0.1` 的临时静态服务器打开。服务器日志只出现本地
`index.html`、`styles.css`、`config.js`、`logic.js`、`app.js` 和浏览器隐式
`favicon.ico` 请求；生产 HTML 中没有绝对 URL、远程资源、图片、音频或视频。
直接双击能力由经典相对脚本、无模块/无 fetch 合同和静态测试共同证明。

| 场景 | 证据与结果 |
| --- | --- |
| 1280×800 desktop ready | `scrollWidth=1280`；Canvas 295×295；两按钮各 371×64；第一束正常经历 bursting 后留下“我” |
| 1504×1046 desktop complete | 三个 Canvas 点阵、横向文字轨、五节点短笺、重播与隐私说明完整；结果标题获得焦点 |
| 390×844 mobile ready/complete | ready 两按钮 354×64；complete `scrollWidth=390`；三个文字项同一 `y=320.796875` |
| 844×390 landscape | grid areas 为舞台左、内容右；ready 两按钮各高 56；complete `scrollWidth=844`，允许必要纵滚 |
| 键盘 | `Enter` 激活“按住蓄光”，ready0 正常到 ready1，焦点仍回到发射按钮 |
| 真实 touch | CDP touchStart 按住 620ms，蓄光达到 69.1579%；touchEnd 后第三束完成并聚焦结果标题 |
| reduced-motion | `motion-reduced=true`、`data-can-hold=false`；点击后无需表现等待即到下一个合法 ready 稳态 |
| forced-colors | `matchMedia` 为 active；Canvas `display:none`；CSS 点阵 `display:grid`；系统色、实线边框可读 |
| no Canvas | 临时测试入口令 `getContext` 不可用；390px 点阵各 97.5px、320px 各 80px；两者均 `scrollWidth===innerWidth`，0 console error/warning |
| no JavaScript | 320×568；`app-ready=false`；五个 `.js-only` 节点全部 `display:none`；只保留冻结静态内容，0 console error/warning |
| 重播 | complete 点“再看一次”直接回 ready0，旧三字与短笺移除，焦点到按住按钮 |

no-Canvas 临时 HTML 仅用于验收，完成后已删除，未进入提交。CDP 的 touch、媒体、
脚本执行设置均在验收后恢复；生产页没有保留测试开关。

## 4. 概念稿保真账本

最终一轮同时用原尺寸查看了接受概念
`docs/assets/wish-fireworks/w06-desktop-complete.png` 和真实 Chrome 最新截图。

| 对比点 | 概念方向 | 生产结果 |
| --- | --- | --- |
| 色彩 | 近黑深靛夜空、暖象牙字、暗梅红操作区 | 使用冻结 token `#070c18 / #f0d3a1 / #351424`，一致 |
| 天空层次 | 稀疏星点、很轻的云痕、低矮屋顶 | 由 CSS 渐变与基本几何实现，未加载概念 PNG |
| 点阵烟火 | 三个稳定暖金字形 | Canvas 使用冻结 9×9 target；降级使用同一 9×9 CSS grid |
| 留字轨 | 只显示已完成前缀，三字横向开放排列 | DOM 只创建公开前缀；最终 flex 横向排列，无未来空槽 |
| 控件 | 原生五档高度、双按钮、暗梅红/铜线 | 原生 select/button，桌面双列、移动单列，最小高度 56px |
| 结果短笺 | 暖纸、深墨五节点文案、重播 | complete 才创建五个配置字段节点，文案与焦点顺序一致 |
| 移动端 | 单列长流、三字同排、满宽操作 | 390/320 实测无横溢，按钮与 select 保持触控尺寸 |
| 横屏 | 舞台左、控制或短笺右 | 844×390 grid 视觉重排，DOM 阅读顺序不变 |
| 无障碍变体 | reduced、forced-colors、no-Canvas、no-JS | 四条分支均真实浏览器通过，业务结果不依赖动画或颜色 |

保留两项有意差异：

1. CSS 夜空与纸张比 ImageGen 概念更克制，避免把 docs-only 像素、远程字体或纹理
   变成生产资产；
2. 桌面 complete 允许结果自然向下滚，不为了单屏截图压缩正文或覆盖夜空。这与
   229 的开放纵向流和“1280×800 允许结果自然向下滚”一致。

## 5. 浏览器验收中发现并关闭的问题

| 记录 | 根因 | 处理 |
| --- | --- | --- |
| [`bugs/wish-fireworks-revealed-rail-display.md`](../bugs/wish-fireworks-revealed-rail-display.md) | 通用 JS 显示规则覆盖 flex | 增加 app-ready 组件级覆盖与回归测试 |
| [`bugs/wish-fireworks-no-canvas-mobile-overflow.md`](../bugs/wish-fireworks-no-canvas-mobile-overflow.md) | 桌面 CSS 点阵宽度进入窄屏 | 700px 以下限制为 `min(25vw,112px)` |
| [`bugs/wish-fireworks-no-js-empty-rail.md`](../bugs/wish-fireworks-no-js-empty-rail.md) | 基础 flex 强制覆盖 `.js-only` | 只在 app-ready 且非 hidden 时启用 flex |

三项均在真实 Chrome 复现、修复、补测试并重新验收；当前无未解决 blocker。

## 6. 借鉴、许可证与资产

生产代码独立重写，明确未复制或引入以下来源的源码、测试、公式、API、参数、默认
配置、图片、字体、音频或其他素材：

| 来源 | 固定 commit | 许可证 |
| --- | --- | --- |
| Fireworks.js | `8f01eeaef422c1f0880e94ce99040025a1b74d7e` | MIT；Copyright (c) 2021-2023 Vitalij Ryndin |
| W3C Pointer Events | `238e8273305bb2e3c76f9f0bb289fb127c3dff74` | W3C Software and Document License |
| canvas-text-particle | `9ee144a548aad85275318b30891c71dcf6e10f7b` | ISC；Copyright (c) 2026, dango0812 |
| canvas-confetti | `20eebad51dde793070c373d594099a7ed8d96e22` | ISC；Copyright (c) 2020, Kiril Vatev |
| W3C WCAG | `07123b871c103268375880980fd715b2b26b2ff0` | W3C Document License |

本作只借鉴表现职责分层、pointer 生命周期、稳定目标点、减少动态与清理原则，以及
键盘/闪烁/交互动效/Pointer Cancellation 的边界。完整文件级声明与许可证哈希见
`experiences/surprises/wish-fireworks/assets/ATTRIBUTION.md`。

生成资产：无。15 张概念 PNG 仅用于 docs 评审，没有进入运行时。

## 7. 最终判定

`wish-fireworks` 已具备可直接双击、无安装、无网络、无存储、可键盘、可触屏、
可 reduced-motion、可 forced-colors、可 no-Canvas、可 no-JS 的完整生产体验。
当前分支可交给总控做共享 catalog/入口集成；本批不自行越界集成。
