# Snow Globe Message 生产 UI 最终验收

- 日期：2026-07-25
- 项目 ID：`snow-globe-message`
- 对外标题：`等雪停下`
- 分支：`codex/exp-snow-globe-message-ui`
- 基线：`3aaba821ecbb3a5db06c4cb9139d4e15a96116e3`
- 结论：**生产 UI Go；共享 catalog 接入不在本分支授权范围内**

## 1. 完成范围

本轮从已验收的非视觉核心继续，新增：

- `index.html`：经典脚本、本地相对资源、精确无 JavaScript 降级；
- `app.js`：准备流程、四方向按钮、Pointer、token 化 settling、Canvas/CSS 点阵、
  焦点、live 与生命周期清理；
- `styles.css`：批准的冬夜床头雪球视觉、六档响应式、forced-colors 与
  reduced-motion；
- `README.md`：双击使用、自定义方法、隐私边界和逐项借鉴声明；
- `ui-contract.test.js`：生产入口、隐私 DOM、降级、输入、动画和来源合同；
- 四张 Chrome 验收截图；
- W3C 来源版权所有者补充。

没有修改 catalog、根入口、分类 README、共享 runtime、共享依赖、Board 或其他体验。

阶段提交：

| Commit | 内容 |
| --- | --- |
| `61ef09c` | 先提交失败的生产 UI 合同测试 |
| `b236d00` | 本地页面、语义 DOM 与完整交互 runtime |
| `ae2e466` | 按批准概念重建视觉与响应式系统 |
| `3680b00` | 使用说明、固定 revision 与零复制声明 |
| `9b225ce` | Chrome 横屏 fidelity 修正与验收截图 |

## 2. 直开与隐私结论

`index.html` 使用 `config.js → logic.js → app.js` 的经典脚本顺序，所有样式和脚本均为
同目录相对资源。生产源码没有 `fetch`、XHR、远程 URL、模块脚本、浏览器存储或传感器
接口，运行时第三方依赖为 0。

按总控校正，本轮没有让 Chrome 访问 `file://`。A 级双击能力由以下静态与定向证据
独立证明：

- HTML 只有本地相对资源；
- 没有模块、构建、服务器专属 API 或跨域资源；
- UI 合同精确核对脚本顺序与远程资源为 0；
- 无 JavaScript 时只出现标题、固定说明、静态雪球、启用提示和隐私说明；
- 项目 README 明确双击 `index.html` 的使用方式。

完成前，`patternLabel`、`recipient`、`sender`、`finalTitle`、`finalNote` 不进入静态
HTML。390×844 Chrome 首屏再次扫描三个默认私密长文本，结果均为 false。完成态才创建
精确五节点结果子树；重播时整树物理移除。

## 3. Chrome 交互与可访问性验收

浏览器方法：ChatGPT Chrome Extension 的 Browser 控制面，访问
`http://127.0.0.1:4173/experiences/surprises/snow-globe-message/index.html`。没有切换
到独立 Playwright、Computer Use 或 `file://`。

### 3.1 主流程

- 四个原生按钮按上、右、下、左依次首次收集，主进度精确到 1/4、2/4、3/4 和 armed；
- 第四个按钮后四个控件均为 disabled + pressed，同一个主按钮成为 active；
- 点击“让雪落下”后进入 complete；
- 完成态雪球取得 `role=img` 和 `aria-labelledby=pattern-label`；
- 结果直接子节点顺序为 pattern label、recipient、H2、note、signature；
- 前台完成后 `#final-title` 成为 active；
- live 精确播报 `雪已经停下，留言已展开。`；
- Enter 键可收集上风，进度进入 1/4；
- Chrome 真触摸事件从雪球中心向右拖动后，右风 `aria-pressed=true`，进度进入 1/4；
- `prefers-reduced-motion: reduce` 下点击主动作约 287ms 内进入同一 complete 结果，
  没有等待 900ms 动画。

### 3.2 响应式矩阵

| 视口 | 结果 |
| --- | --- |
| 1504×1046 | 页面 scroll 精确 1504×1046；雪球 592×646；方向按钮 186×112 |
| 1280×800 | 页面 scroll 精确 1280×800 |
| 390×844 | 横向 390、纵向 883；雪球 312；2×2 按钮约 171×86 |
| 320×568 | 横向 320、纵向 842；雪球 264；按钮高 74 |
| 844×390 | 修正后 scroll 精确 844×390；雪球 224；四个按钮高 48 |

窄屏允许纵向滚动，所有矩阵横向滚动为 0。844×390 初测雪球为 288px，虽未溢出，
但偏离批准概念；本轮将其收紧到 224px 并在 Chrome 复验。

### 3.3 console 与资源

- Chrome console warning/error：0；
- DOM 声明的资源只有本机 `styles.css`、`config.js`、`logic.js`、`app.js`；
- 远程资源：0。

## 4. 截图与视觉 fidelity

批准概念：

- `docs/assets/snow-globe-message/desktop-complete-concept.png`
- `docs/assets/snow-globe-message/mobile-complete-concept.png`

Chrome 截图方法：

- 桌面使用 Chrome 原生 1395×607 视口，`tab.screenshot({ fullPage: true })`；
- 移动使用 viewport capability 设为原生 CSS 视口 390×844，再执行相同截图；
- 截图写入生产体验目录后，与批准概念一起用 `view_image(detail="original")` 在同一
  QA pass 目检。

截图：

- `experiences/surprises/snow-globe-message/screenshots/desktop-gathering.png`
- `experiences/surprises/snow-globe-message/screenshots/desktop-complete.png`
- `experiences/surprises/snow-globe-message/screenshots/mobile-gathering-390x844.png`
- `experiences/surprises/snow-globe-message/screenshots/mobile-complete-390x844-reduced-motion.png`

Fidelity ledger：

| 对比点 | 结果 |
| --- | --- |
| 深墨蓝背景、奶油字、暖金线、莓红底座 | 匹配 |
| 桌面左侧主雪球、右侧 2×2 控件与短笺 | 匹配 |
| 移动端标题、雪球、控件、留言的单列节奏 | 匹配 |
| 厚冷蓝玻璃、高光、雪坡和低矮底座 | 用 CSS/Canvas 原生重建，材质方向匹配 |
| 完成态保留雪球并在页面流中展开短笺 | 匹配；没有 modal、翻卡或覆盖层 |
| 四方向的固定顺序与“✓ 已收好” | 匹配 |
| 标题、说明、状态、五段结果、重播与隐私顺序 | 匹配 |
| 9×11 图案 | 生产严格使用 63 点冻结矩阵；比概念图更离散、更稀疏，属于规则优先 |

可见 copy diff：生产逐字使用规格冻结文案，没有从概念图 OCR，也没有新增 badge、
导航、技术说明或营销文案。

有意偏差：概念图包含照片级台灯、窗景、书本与墨水瓶；生产为满足零运行时位图、
零远程素材和高对比降级，保留抽象窗光与桌面层次，不复刻具体道具。该偏差不改变
布局、色彩、仪式感或交互。

## 5. 自动门禁

定向：

```text
node --check config.js / logic.js / app.js
node --test logic.test.js ui-contract.test.js

22 tests
22 passed
0 failed
```

全仓首次运行因 worktree 未安装根锁定依赖，四项共享 runtime 测试报
`ERR_MODULE_NOT_FOUND: qrcode`；执行 `npm ci` 后未改动 `package.json` 或
`package-lock.json`，再验：

```text
npm test
2315 tests
2315 passed
0 failed
```

```text
npm run verify
仓库验收通过：58 个作品入口（50 个 A 级直开、8 个非 A 启动器）、
1 个能力声明、资源与借鉴声明完整。
```

上述 58 个入口仍不包含本体验；共享接入由总控在允许的集成阶段完成。横屏一行 CSS
修正后再次运行 Snow Globe 定向 22/22 与 `git diff --check`，均通过。

## 6. 来源与记录

README 与 `assets/ATTRIBUTION.md` 均逐项写出：

- 来源仓库；
- 固定 commit；
- 许可证；
- 版权所有者；
- 实际借鉴的抽象原则；
- 没有复制的代码、参数、素材与依赖范围。

正式参考仍为 tsParticles、canvas-text-particle、canvas-confetti 与 W3C Device
Orientation；`shake.js` 保持 `NOASSERTION` 排除。生产没有 vendor 或第三方 runtime。

本轮没有遗留可稳定复现的产品 bug，不新增 `bugs/`。除既有调研、规格、计划和来源
记录外，没有形成需要独立抽象的新通用结论，不新增 `learn/`。

## 7. 剩余边界

- 本分支未获授权修改 catalog、门户、分类索引或共享入口，因此项目尚未计入全仓
  58 个已安装入口；
- Chrome 未直接访问 `file://`，原因是总控明确要求以静态合同证明双击能力；
- 准备 helper 故障和 Canvas context 丢失已有生产降级与静态合同，本轮没有在 Chrome
  中破坏浏览器原生能力来强制复现。

在本分支授权范围内，`snow-globe-message` 生产 UI、交互、响应式、隐私、来源声明和
浏览器证据均已完成。
