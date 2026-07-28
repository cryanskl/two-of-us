# Compliment Reels 生产 UI 终验

- 日期：2026-07-25
- 基线：`main@3d4b5d604ef3`
- 分支：`codex/exp-compliment-reels-ui`
- Worktree：`{worktree-base}/compliment-reels-ui`
- 范围：`experiences/surprises/compliment-reels/**`
- 结论：本项目目录内的生产 UI、规则核心、文档、借鉴声明和测试均已完成，可进入
  仓库目录集成阶段。

## 本次交付

页面已从只有规则核心的项目补齐为一台可直接游玩的本地“夸夸印刷机”：

- 使用三列纸卷组合一条完整夸奖，每轮最多六次；
- 每轮第 3–6 次之间恰好出现一次“特别同频”，再揭晓私人结语；
- ready、spinning、result、jackpot、fallback 和 restart 均有明确界面状态；
- 鼠标、触控、Enter、Space 和 reduced-motion 均可完成整轮体验；
- 生产页不加载概念图，不依赖远程资源、构建工具或第三方运行库；
- 只有已经揭晓的结果进入 DOM，未揭晓 stop 和私人结语继续留在内存；
- 320 px 窄屏、横屏、平板和桌面布局均保持可操作。

交付文件包括：

- `index.html`、`styles.css`、`app.js`；
- `assets/favicon.svg`；
- `ui-contract.test.js`；
- 独立使用说明 `README.md`；
- 更新后的 `ATTRIBUTION.md`；
- 三组浏览器问题的红测、修复与记录；
- 一份动画/提交流程学习记录。

本分支没有修改共享目录页、根 README、分类文档、Board 或其他体验；这些入口由
上层集成任务统一处理。

## 分阶段提交

| Commit | 内容 |
| --- | --- |
| `6201130` | 冻结生产 UI 静态契约红测 |
| `98141b5` | 实现生产 UI、交互、响应式布局、图标与使用说明 |
| `60fc5f6` | 记录首轮交付说明 |
| `1bae323` | 增加纸卷标签裁切复现测试 |
| `cccbd25` | 修复纸卷标签裁切 |
| `48c2c44` | 增加重复 live region 复现测试 |
| `ca8f28b` | 修复重复 live region |
| `5fff557` | 增加桌面 jackpot 纵向溢出复现测试 |
| `af0c72a` | 修复桌面 jackpot 纵向溢出 |
| `0d98a6f` | 汇总三项问题与解决方案 |

## A 级直接打开证明

生产入口按 `config.js → logic.js → app.js` 使用经典相对脚本加载，样式、脚本和
favicon 均来自项目内相对路径。静态 UI 契约另外证明：

- 没有 `type="module"`、远程 URL 或运行时概念 PNG；
- 没有 `fetch`、XHR、WebSocket 或动态网络加载；
- 没有 localStorage、sessionStorage、IndexedDB 或 Cookie 写入；
- 没有剪贴板、摄像头、麦克风、定位、通知等权限调用；
- HTML 中引用的本地资源全部存在；
- 不要求 npm 安装、构建步骤或本地服务器。

因此用户可直接双击 `index.html` 以 `file://` 使用。按照本轮浏览器验收约定，
Chrome 实机验证只访问仓库的 localhost 页面，没有在自动化浏览器中尝试
`file://`；A 级能力由独立静态契约证明，localhost 只承担真实浏览器行为和布局
验收。

## 自动化验收

### 项目定向测试

```text
node --test \
  experiences/surprises/compliment-reels/logic.test.js \
  experiences/surprises/compliment-reels/ui-contract.test.js

tests 29
pass 29
fail 0
```

其中规则核心 24 项，UI 契约 5 项。

### 仓库全量测试

干净 worktree 首次执行时缺少仓库测试用的 `qrcode` 与 Pannellum 依赖，先按
仓库约定执行一次 `npm ci` 和 `npm run setup`；安装 55 个包，审计 56 个包，
漏洞为 0。依赖文件和 lockfile 均未变化。

补齐已有测试依赖后：

```text
npm test

tests 2315
pass 2315
fail 0
```

### 仓库验收

```text
npm run verify

仓库验收通过：58 个作品入口（50 个 A 级直开、8 个非 A 启动器）、
1 个能力声明、资源与借鉴声明完整。
```

`git diff --check` 同样通过。

## Chrome 实机验收

浏览器通过仓库根目录的临时静态服务器访问
`http://127.0.0.1:4174/experiences/surprises/compliment-reels/index.html`；
验收结束后服务器和标签页均已关闭。

### 功能与状态

- ready 首屏没有空的结果、历史、jackpot 或私人结语容器；
- 连续完成六步最坏路径后恰好出现一次 jackpot，历史恰好六条；
- spinning 期间按钮禁用，上一条已公开历史保留，当前锁定 stop 不进入 DOM；
- jackpot 后点击一次“再夸一局”，恢复唯一按钮和干净 ready 状态；
- Enter 与 Space 各自只触发一次结果，结束后焦点回到主按钮；
- 双击不会跨过 reducer 的锁，一次只增加一个结果；
- 系统在动画中切换 reduced-motion，会立即落到同一份已锁定结果；
- 页面不可见、失焦或 pagehide 时走统一 suspend 收尾，不重新抽取；
- 明确 live region 始终只有一个；
- 浏览器控制台错误为 0。

### 响应式矩阵

| 视口 | 结果 |
| --- | --- |
| 1504×1046 | 六步 jackpot 无横向或纵向溢出 |
| 1280×800 | 首屏无滚动，纸卷区 948×404，三列 |
| 768×1024 | 无横向溢出，按钮 736×72，三列 |
| 390×844 | 无横向溢出，按钮 366×72，三列 |
| 320×568 | 无横向溢出，允许内容纵向滚动，纸卷改为一列 |
| 844×390 | 无横向溢出，保留三列，允许内容纵向滚动 |

320 px 结果态也保持 `scrollWidth === clientWidth`，历史、结果和主按钮均可见。

### 可访问性与请求边界

- `prefers-reduced-motion: reduce` 下点击后约 40 ms 内完成，不播放长动画；
- `forced-colors: active` 下机身、纸卷和按钮边界仍清晰；
- 主按钮在所有验收视口高度不低于 72 px；
- 请求捕获只包含 localhost 下的 HTML、CSS、三个脚本和项目 favicon；
- 未观察到应用发起的外部 HTTP(S) 请求；
- 测试工具自身注入的 `chrome-extension://` 光标资源不属于应用资源。

## 视觉忠实度台账

| 视觉目标 | 实现与证据 |
| --- | --- |
| 私密而非赌场式 | 深梅色背景、奶油纸面、黄铜边线，不使用 BAR、7、樱桃、金币或商业机台标识 |
| “印刷机”核心隐喻 | 三段独立纸卷置于实体机身中，结果以连续纸张形式从下方输出 |
| 单一操作焦点 | 全页只有一个常驻珊瑚色主按钮；历史、结语和重开都围绕同一位置展开 |
| 纸张层次 | 纸卷、结果纸、历史票据使用不同奶油色和阴影，但共享圆角与虚线裁切语言 |
| jackpot 克制庆祝 | 使用本地 CSS 星形、黄铜描边和私人结语展开，不使用 Canvas 粒子或外部动画素材 |
| 长短文案适配 | 标签通过不裁切排版与窄屏一列布局完整显示；320 px 结果态无横向溢出 |
| 状态一致性 | ready 不提前画空壳，spinning 保留旧公开内容，result 与 jackpot 才增量创建内容 |
| 强制颜色与减弱动画 | forced-colors 保留边界，reduced-motion 直接完成且结果不改变 |

## 问题闭环与沉淀

| 问题 | 红测 | 修复 | 记录 |
| --- | --- | --- | --- |
| 纸卷标签被裁切 | `1bae323` | `cccbd25` | `bugs/2026-07-25-compliment-reels-clipped-labels.md` |
| 隐式与显式 live region 重复 | `48c2c44` | `ca8f28b` | `bugs/2026-07-25-compliment-reels-duplicate-live-region.md` |
| 六步 jackpot 在桌面高度溢出 | `5fff557` | `af0c72a` | `bugs/2026-07-25-compliment-reels-jackpot-overflow.md` |

动画 token、suspend 收尾和 pre-commit 验证边界已记录在
`learn/2026-07-25-compliment-reels-precommit-animation-boundary.md`。

## 借鉴声明核对

生产实现没有引入第三方运行依赖，也没有复制下列来源的代码、API、随机算法、
缓动公式、DOM、CSS、文案、素材或 trade dress。README 与 ATTRIBUTION 均固定
记录了来源 commit、许可证、版权、仅借鉴的抽象机制和明确未采用内容：

- `nuxy/slot-machine-gen@56c9017e839583dcb8fcb5cc88b08b30ed63f66a`
  （MIT）：只研究独立 reel、结果预选、错峰停止和统一返回的职责分层；
- `davidbau/seedrandom@4460ad325a0a15273a211e509f03ae0beb99511a`
  （README 内 MIT）：只研究局部随机源和可重现测试边界；
- `tweenjs/tween.js@20079e65f77bb2b8e52cc9d7dbed044b86e537d3`
  （MIT）：只研究起终点、持续时间、错峰停止与完成回调分层；
- `catdad/canvas-confetti@20eebad51dde793070c373d594099a7ed8d96e22`
  （ISC）：只研究庆祝表现与规则分离、动画清理和 reduced-motion 原则。

具体许可证链接、版权原文和排除来源见项目内 `ATTRIBUTION.md`。

## 最终结论

Compliment Reels 在自己的项目范围内已经达到生产可用状态：玩法闭环、隐私边界、
A 级直接打开契约、桌面与移动响应式、键盘和无障碍状态、测试以及借鉴声明全部
通过。本分支尚未登记共享目录入口，这是上层仓库集成任务的职责，不是该项目自身
的交付缺口。
