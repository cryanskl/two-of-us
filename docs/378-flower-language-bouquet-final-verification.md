# Flower Language Bouquet 生产 UI 与浏览器最终验收

- 验收日期：2026-07-25
- 实现基线：`main@3aaba821ecbb3a5db06c4cb9139d4e15a96116e3`
- 分支：`codex/exp-flower-language-bouquet-ui`
- worktree：`/Users/zenith/Desktop/two-of-us-worktrees/flower-language-bouquet-ui`
- 范围：`experiences/surprises/flower-language-bouquet/` 的 A 级生产 UI、项目测试、
  浏览器验证、bug/learn；不登记 catalog、不修改共享运行时或根依赖

## 1. 结论

`flower-language-bouquet` 已从冻结的非视觉核心扩展为本地可用的完整生产体验：

- `index.html` 只用相对路径依次加载 `config.js → logic.js → app.js`；
- intro、arranging、preview、complete 四阶段均由 public view 投影，不在静态
  HTML 中预埋最终私人字段；
- 六种花使用本仓库独立实现的 inline SVG primitive，页面和 standalone 导出
  共享同一 scene，不读取十张 docs-only 概念图；
- 桌面、移动、鼠标、键盘、真实触控事件、撤回、双击防重复、完成、重开、
  ready/error/retry、低动态均完成真实 Chrome 验收；
- 保存入口是真实 `<a download>`，对象 URL 在浏览器支持时生成；页面只说
  “已交给浏览器处理”，不伪称已经落盘；
- 项目定向 47/47 通过，语法与差异检查通过。

作品当前仍未写入 `experiences/catalog.json`，也未修改根门户、分类 README 或共享
launcher；是否安装和聚合由总控分支统一处理。

## 2. 分阶段提交

| Commit | 完成部分 |
| --- | --- |
| `1843512` | 先写 8 项生产 UI 红测试，初始结果 0/8 |
| `0abfc70` | 语义入口、四阶段 DOM、六花 SVG、导出 controller、响应式样式、README 与借鉴声明 |
| `000b179` | 修复首屏舞台尺寸覆盖、桌面三席错位与空动作行，并新增项目 bug/learn |

每次提交前均重新执行：

```sh
git branch --show-current
git rev-parse --show-toplevel
```

结果始终分别为目标分支与目标 worktree，没有在 main 或其他 worktree 写入。

## 3. 生产实现

### 3.1 入口与离线边界

生产文件为：

```text
index.html
config.js
logic.js
app.js
styles.css
README.md
assets/ATTRIBUTION.md
```

入口没有 module、iframe、图片、CDN、远程字体或公网 URL。应用代码不使用
fetch、XHR、WebSocket、storage、service worker、clipboard 或 share API。
CSS 不含 `url()` 或 `@import`。因此 A 级直开的静态合同由经典脚本顺序、相对
资源和零网络 API 共同保证。

本轮浏览器工具的 URL 安全策略不允许直接导航本地文件协议，所以没有把实际
`file://` 页面冒充成已实测证据。真实浏览器使用同一份静态文件的 localhost
入口；双击直开能力由静态合同测试证明。

### 3.2 交互与隐私

- START 后才把六花 name/meaning 进入页面；
- 第一、二次选择通过 live region 精确播报，第三次把焦点移到 preview 标题；
- selected 卡保留原 DOM 位置，使用 `aria-disabled=true` 和 action guard，
  不用原生 disabled；
- preview 同屏保留“系好这束花”和“撤回上一枝”；
- complete 前 DOM 不含 recipient、sender、finalTitle 或 finalNote；
- complete 只显示已选三枝，不保留六花 catalog；
- Enter、Space、鼠标 click、double-click 和触控均不会越过 reducer gate；
- held key 在 keyup、window blur、visibility change 和 pagehide 清理；
- render 后焦点使用单调 token、可见性、文档焦点和 origin ownership 校验。

### 3.3 页面与导出 SVG

六花 primitive 固定为 rose、tulip、daisy、sunflower、lisianthus 和
gypsophila。满天星每个小花使用五个 circle petal 加 circle core；其他花头遵循
冻结 registry。每枝包含一根 stem 和两片叶，完整三枝增加系带。

standalone 导出：

- 从 `buildExportModel(state)` 新建独立 SVG 树，不序列化页面 DOM；
- 固定 `viewBox="0 0 1000 1800"`；
- 元素白名单只允许 `svg/title/desc/rect/g/path/circle/ellipse/line/text/tspan`；
- 属性白名单拒绝事件、href、url、style、image、use 和 `foreignObject`；
- XML 序列化和 Blob 各自受 256 KiB 上限；
- 文件名固定为 `flower-language-bouquet.svg`；
- 导出含最终标题、留言、组合句、三席和署名，不含 recipient 和未选 catalog；
- 对象 URL 只在新一代生成或 RESTART 时撤销，不在 click/pagehide 提前撤销；
- unsupported、preparing、ready、error 与 generation exhaustion 都有显式状态。

## 4. 视觉与可访问性

生产实现采用已接受的 v2 方向：纸白/淡暖灰底、墨绿装订线、深酒红主动作和旧
黄铜细节。题名使用本机衬线字体栈，正文与控件使用本机无衬线字体栈；没有远程
字体、照片、爱心、粒子、庆祝动画或巨型应用壳。

冻结 token、3px `focus-visible`、56px 最小动作高度、320px 最小页面宽度、
899/599px 断点、safe-area、`overflow-wrap:anywhere`、reduced-motion 和
forced-colors 都有契约测试。

真实浏览器发现并修复两处问题：

1. 后置 `.bouquet-stage` 覆盖 intro variant 宽度，导致较矮桌面首屏看不到
   “开始挑花”；
2. arranging 的三席随大舞台留在左列下方，右侧首屏只有花池；初态空动作行还
   留下多余间距。

修复与测量见
[`bugs/flower-language-bouquet-first-screen-layout.md`](../bugs/flower-language-bouquet-first-screen-layout.md)，
可复用层叠经验见
[`learn/flower-language-bouquet-variant-specificity.md`](../learn/flower-language-bouquet-variant-specificity.md)。

## 5. Chrome 验收

### 5.1 环境

- 浏览器：Chrome 扩展控制的真实 Chrome 页；
- 桌面可视区：1395×607；
- 移动可视区：390×844，通过 Chrome DevTools device metrics；
- 移动触控：启用 touch emulation 后发送真实 `touchStart/touchEnd`；
- 服务：当前 worktree 根目录的临时只读 localhost 静态服务；
- 页面：`/experiences/surprises/flower-language-bouquet/index.html`。

仓库 `npm start` 在当前隔离 worktree 因共享依赖未安装而失败，首先报告缺少
`node_modules/pannellum/build/pannellum.css`。没有为本项目修改或安装共享依赖；
浏览器 QA 改用只读静态入口，加载内容与 A 级直开文件相同。

### 5.2 必查项

| 检查 | 结果 | 证据 |
| --- | --- | --- |
| 页面身份 | PASS | URL 为目标本地路径；title 为“把花语，系成一束” |
| 非空页面 | PASS | DOM snapshot 含 h1、规则、阶段 region、按钮和 live status |
| framework overlay | PASS | 无框架、无 overlay |
| console health | PASS | desktop/mobile/complete/reduced-motion 均零 warn/error |
| 桌面截图 | PASS | intro、arranging、preview、complete 均实际截图审校 |
| 移动截图 | PASS | 390×844 intro、arranging、preview、complete、export error 实际截图审校 |
| 交互 | PASS | start→三枝→preview→undo→重选→tie→ready；另跑 error/retry |

### 5.3 桌面交互证据

1. 鼠标激活 START 后，焦点进入第一张玫瑰卡；
2. Enter 选择玫瑰，进度变为 `1 / 3`，live 为“已选第 1 枝：玫瑰”，焦点移到
   下一张可用花卡；
3. 鼠标选择向日葵，进度变为 `2 / 3`，三席显示主花玫瑰、陪花向日葵；
4. double-click 满天星后只增加一次，selected 精确为 3，进入 preview；
5. preview 焦点落在“三枝花已经选好”，角色与组合句完整；
6. 撤回后进度回到 `2 / 3`，live 为“已撤回：满天星”，焦点回到满天星；
7. Space 重选满天星，再激活 TIE，焦点进入最终标题；
8. complete 的 link href 为 `blob:`，download 为
   `flower-language-bouquet.svg`，保存与重开控件高度均 56px；
9. 激活保存 link 后 panel 保持 ready，live 精确为“已交给浏览器处理”。

桌面 1395px 下始终 `scrollWidth === clientWidth`。修复后较矮视口的 intro 按钮
位于 `y≈432`，三席位于 `y≈224–399`，花池从 `y≈415` 开始。

### 5.4 移动与触控证据

390×844 下：

- intro 舞台约 360×282px，START 为 358×56px，全部在首屏；
- 真实 touch 进入 arranging，并用 touch 选择第一枝玫瑰；
- 六张花卡均约 358×83px；
- preview 舞台约 280px，TIE 和 UNDO 均为 358×56px；
- complete 的保存 link 为 317×56px，RESTART 为 358×56px；
- export panel 高 176px；
- 全流程 `scrollWidth === clientWidth === 390`，没有横向溢出。

### 5.5 错误、重试与低动态

浏览器验收页临时把当前 document 的 `URL.createObjectURL` 改为抛错，仅用于
测试；RESTART 后重新完成花束，得到：

```text
title: 这次没能准备好保存文件
detail: 花束和留言都还在。
retry: 重新准备保存文件
linkPresent: false
live: 暂时没准备好文件，花束仍在这里
```

再次激活 retry 后仍保持可重试 error，结果标题和留言没有丢失。测试覆盖只存在于
临时浏览器 document，重新加载即清除，没有写入生产文件。

Chrome 设为 `prefers-reduced-motion: reduce` 后：

```text
matchMedia: true
SVG animation-duration: 1e-06s
animation-iteration-count: 1
button transition-duration: 1e-06s
```

页面仍零横溢、零 console warning/error。forced-colors 在本轮只由 CSS 契约
测试覆盖，没有把它写成真实浏览器已验收项。

### 5.6 保存证据边界

真实保存 link、blob href、download 文件名、激活后的 live 文案和 ready 状态均已
在 Chrome 证明。但 Chrome 控制层在激活后没有产生可读取的 download event；
其安全策略还明确阻止直接导航 `blob:` URL，因此本轮没有绕过策略、没有声称
重新打开了下载文件。

standalone SVG 的数据内容、recipient 排除、最大 22 行、viewBox 和确定性 scene
由核心测试覆盖；renderer 白名单、结构排除、256 KiB、对象 URL 生命周期和禁止
自动 click 由 UI 契约测试覆盖。真正落盘、重新打开文件、Safari/iOS 的
download/preview 行为仍属于后续人工 Gate。

## 6. 测试与仓库 Gate

### 6.1 项目定向

```sh
node --check experiences/surprises/flower-language-bouquet/app.js
node --test --test-reporter=spec \
  experiences/surprises/flower-language-bouquet/logic.test.js \
  experiences/surprises/flower-language-bouquet/ui-contract.test.js
git diff --check
```

结果：47/47 通过，0 fail；语法与差异检查通过。39 项既有核心测试加 8 项生产
UI 契约共同覆盖 120 排列、hostile input、隐私、scene、导出模型、DOM、SVG、
controller、样式、离线边界、README 与借鉴声明。

### 6.2 全仓测试

```sh
npm test
```

结果：

```text
tests 2312
pass 2308
fail 4
```

四项失败均位于本项目范围外：

- 三项 `scripts/start-reuse.integration.test.mjs` 启动器复用测试；
- 一项 `shared/runtime/server.test.js`，报
  `ERR_MODULE_NOT_FOUND: Cannot find package 'qrcode'`。

当前 worktree 没有完整共享依赖，因而这些结果不归因于 Flower 生产 UI。没有
执行 `npm ci`，避免越过“不修改共享依赖”的任务边界。

### 6.3 仓库验收

```sh
npm run verify
```

结果失败于既有 `panorama-memory` 的两项 vendor 文件缺失：

```text
/vendor/pannellum/2.5.7/pannellum.css
/vendor/pannellum/2.5.7/pannellum.js
```

与 `npm start` 的 pannellum 缺失和全仓 `qrcode` 缺失一致，属于隔离 worktree
共享依赖未安装；Flower 项目定向 Gate 不受影响。总控集成时应在已统一依赖的
主 worktree 复跑 `npm test`、`npm run verify` 与仓库启动器。

## 7. 借鉴与资产

README 和 `assets/ATTRIBUTION.md` 都列明六个机制参考项目与五个标准仓库的固定
commit、借鉴抽象和零复制边界。README 明确写出三条关键固定对象：

- `8db7a51b4b4bfc4b9a0b05df1cf5d4dda4d923c9`
- `cea522bc41bfadc364837293d0c4dc585a65ac46`
- `c7573530343759ace8e46438a1fa2c44515b5554`

十张 ImageGen 概念图、尺寸、SHA-256、输入链、prompt 与权利边界继续由
[`docs/assets/flower-language-bouquet/GENERATION.md`](./assets/flower-language-bouquet/GENERATION.md)
记录。生产文件不读取这些图片，不复制第三方代码、路径、图片、布局表、保存
兼容代码或序列化器。

## 8. 仍需总控处理

- 把作品登记到 catalog、根门户和 surprises 分类入口；
- 在统一依赖环境复跑全仓测试、verify 和 `npm start`；
- 如最终 Gate 要求真实落盘，人工激活并重新打开 SVG；
- 如要求跨浏览器，补 Safari/iOS 对下载转预览/系统文件的实际观察；
- 在集成分支完成后再把作品标记为 installed。
