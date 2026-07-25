# `four-symbol-film-duel` 生产 UI 最终验收

> 验收日期：2026-07-26  
> 项目 ID：`four-symbol-film-duel`  
> 对外唯一标题：**四符片名擂台**  
> 分类：双人对抗  
> 本地等级：A  
> 分支：`codex/exp-four-symbol-film-duel-production-ui`  
> worktree：`/Users/zenith/Desktop/two-of-us-worktrees/four-symbol-film-duel-production-ui`  
> 基线：`69a3b286e3ff5df18c9c9c778fe2e562eca6844e`

## 1. 结论

项目生产 UI 已完成，可从本目录 `index.html` 使用原生 HTML、CSS、JavaScript 和
Unicode 运行。没有运行时第三方依赖、远程资源、图片、字体、音频、存储或网络
请求。

冻结玩法完整保留：

- 32 张原创题卡、4 个题包；
- 一局固定 8 题，A / B 严格交替，各 4 题；
- 每人 2 枚聚光灯，每题最多使用一次；
- 直接答对 2 分、聚光灯后答对 1 分、答错 0 分；
- 选择、确认、结算、交接和终局均为独立阶段；
- 八题终局显示胜负、双方分数、聚光灯使用数与逐题结果；
- 终局可回到干净开场。

项目级 Gate 全部通过。全仓 Gate 仍被本分支基线中两个共享依赖问题阻塞，详见
第 8 节；失败不来自本项目代码，也不在本执行 Session 的授权修改范围。

## 2. 交付文件

生产目录新增：

- `index.html`：本地入口、相对脚本顺序、诚实的无 JavaScript 回退；
- `style.css`：影院票根、幕布、响应式和系统可访问模式；
- `app.js`：只消费核心 `getPublicView(state)` 的 DOM 投影与交互；
- `ui.test.js`：8 项生产 UI 静态合同；
- `README.md`：直开、玩法、隐私、输入和借鉴说明。

原 `config.js`、`logic.js`、`logic.test.js` 保持不变。`ATTRIBUTION.md` 只补充了
生产 UI 独立实现和概念图不进入运行时的边界。

## 3. 隐私与本地边界

### 3.1 热座交接

交接页不是 CSS 遮罩。每次进入 `handoff`：

- `currentCard` 的公开投影为 `null`；
- 题面符号、中文标签、四个选项、答案和解释节点均不创建；
- 不存在 `data-card`、`data-answer`、`data-option`、`data-rationale`、
  `data-token` 或静态 `<template>`；
- 下一位点击“已准备好”后才创建当前题面。

Chrome 以首题唯一选项“雨伞借走了晚钟”为 sentinel 实测：

```text
phase = handoff
symbolNodes = 0
optionNodes = 0
secretAttrs = 0
sentinelVisible = false
```

确认页同样没有答案和解释节点；只有进入 `result` 后才显示正确片名与解释。

这个边界保护普通同设备交接、页面查找和可访问树，不宣称加密，也不抵抗主动打开
DevTools 或读取本地 `config.js`。

### 3.2 本地等级 A

入口只引用同目录的 `style.css`、`config.js`、`logic.js` 和 `app.js`，没有
`fetch`、XHR、WebSocket、Storage、媒体、计时器或远程 URL。CDP 重新加载实测
只有以下 5 个 localhost 映射请求：

```text
index.html
style.css
config.js
logic.js
app.js
```

自动化 Chrome 的 URL 安全策略明确拒绝访问 `file://`，且禁止改用 CDP 或其他
浏览器绕过，因此没有伪造“浏览器自动化 file:// 通过”。直开合同由入口的纯相对
资源闭包、零网络 API 静态测试和 README 启动说明证明；localhost 只用于真实 UI
自动化。

## 4. Chrome 完整路线

Chrome 从开场完成了一整局：

```text
setup
→ handoff
→ question
→ confirm
→ result
→ handoff
…重复到第 8 题
→ summary
```

结果证据：

- 八题全部经真实 DOM 按钮提交；
- A / B 回合严格交替；
- 终局 `reviewCount = 8`；
- 本次固定选择路径比分为 `2 : 2`，显示“今晚平分秋色”；
- 两席逐题记录各 4 条；
- 第一题键盘数字 `1` 选择后，唯一选项为
  `aria-pressed="true"`，继续按钮启用；
- 移动端使用 CDP `Input.dispatchTouchEvent` 的真实 touch start/end 激活
  “已准备好”，成功从交接进入题面；
- 聚光灯实测原子消耗资源、排除一项、清除被排除的原选择并禁用继续按钮；
- 最终控制台 warning / error 为 0。

## 5. 响应式、触控和系统模式

同一 `question` 状态检查 6 个视口：

| 视口 | 页面宽 | 页面高 | 横向溢出 | 最小按钮高度 |
|---|---:|---:|---|---:|
| 桌面 | 1440 | 1024 | 无 | 50.5 px |
| 笔记本 | 1024 | 768 | 无 | 50.5 px |
| 平板 | 768 | 1024 | 无 | 50.5 px |
| 移动端 | 390 | 844 | 无 | 50.5 px |
| 320 / 放大等价窄屏 | 320 | 568 | 无 | 50.5 px |
| 短横屏 | 844 | 390 | 无，纵向滚动 | 50.5 px |

其他 Gate：

- `prefers-reduced-motion: reduce` 命中，动画和过渡计算值为 `0.01ms`；
- `forced-colors: active` 命中，票面与控件使用系统色和 2px 可见边界；
- 无 JavaScript 时只显示标题、启用提示、玩法、隐私、Unicode 等价说明和返回
  链接，不含题卡、选项、答案或 sentinel；
- 页面不限制缩放和方向；
- 全部主操作为原生按钮，触控高度大于 44px；
- 选项使用文字、边框和 `aria-pressed`，不是只靠颜色；
- 正误颜色只在结算后出现。

## 6. 视觉保真

最终 UI 与 `docs/318-four-symbol-film-duel-design-proposal.md` 和两张确认概念图
完成同屏核对，保留了至少以下视觉锚点：

1. 深酒红幕布包围单张暖纸票根；
2. 中文衬线标题“ 四符片名擂台 ”居中且只出现一次；
3. A / B 对称计分轨与居中轮次；
4. 四枚 Unicode 符号组成主视觉焦点；
5. 四个等权片名按钮使用 2 × 2 构图；
6. 黄铜线与酒红主操作构成明确的操作层级；
7. 移动交接态使用完全不透明的闭幕面；
8. 无嵌套 dashboard 卡片、英文副标题、品牌、海报或真实影视素材。

概念图只用于方向确认，没有进入运行页。生产版主动移除了概念图中的厂商式
Emoji 图片、生成式聚光灯图标、重纸纹和 A / B 装饰圆章，改用系统 Unicode、
CSS 色面和语义化文字。

首屏文案差异均为规则真值或可访问性需要：

- 概念桌面分数 `2 : 1` 是构图样例；生产首局从核心真实状态 `0 : 0` 开始；
- 生产题面增加“玩家 A，这部片叫什么？”和“城市 · 难度 1”，以文字明确当前席
  和题目元信息，不依赖颜色；
- 移动交接沿用“请交给 玩家 A / 下一题将在确认后出现 / 玩家 A 已准备好 /
  确认前不会显示符号、选项或答案”，只把样例轮次与分数替换为真实状态。

## 7. 实际 Bug 与可复用 Learn

真实浏览器验收发现聚光灯重绘后焦点落回 `body`。根因是被激活的聚光灯按钮在
新 DOM 中立即变为 disabled，不能继续持有焦点。

已修复为：聚光灯成功后把焦点送到 `tabindex="-1"` 的当前题标题，不污染普通
Tab 顺序。回归结果：

```text
focusId = question-heading
selected = 0
eliminated = 1
continueDisabled = true
```

记录：

- `bugs/four-symbol-film-duel-spotlight-focus-loss.md`
- `learn/four-symbol-film-duel-focus-after-destructive-choice.md`

## 8. 自动化测试

### 8.1 项目级

```text
node --check app.js                         通过
node --test logic.test.js ui.test.js        38 / 38 通过
git diff --check                            通过
```

其中核心 30 项、UI 合同 8 项。

### 8.2 全仓

`npm test`：

```text
tests 2389
pass  2385
fail  4
```

失败均为共享基线依赖：

- 3 个 `scripts/start-reuse.integration.test.mjs` 场景因
  `node_modules/pannellum/build/pannellum.css` 缺失而启动超时；
- `shared/runtime/server.test.js` 因共享 runtime 无法 import `qrcode` 失败。

`npm run verify`：

```text
panorama-memory 引用的浏览器依赖不存在：
/vendor/pannellum/2.5.7/pannellum.css
/vendor/pannellum/2.5.7/pannellum.js
```

这些文件、根依赖和共享 runtime 均不属于本项目授权范围；本 Session 没有修改或
安装它们。

## 9. 借鉴与许可证

没有参考或复制开源项目、第三方游戏代码、题库、电影表达、海报、剧照、Logo、
字体、音频、视频或厂商 Emoji 图像。

`ATTRIBUTION.md` 已明确：

- 玩法、题库、状态机、生产 UI、CSS 视觉和测试为仓库独立实现；
- 两张 ImageGen 概念图仅为 docs 设计证据，不进入生产；
- 标准与权利资料只用于校准 Unicode、可访问性、版权和商标边界；
- 未来若参考开源项目，必须记录固定 commit/tag、LICENSE、版权人、实际借鉴点
  和未复制范围。

## 10. 提交

- `f35d3a8` `test(four-symbol-film-duel): freeze production ui contract`
- `74505af` `feat(four-symbol-film-duel): build ticket booth production ui`
- `d6fe11a` `docs(four-symbol-film-duel): document local play and attribution`
- `08b7aeb` `fix(four-symbol-film-duel): preserve focus after spotlight`

本文件将在第五个独立提交中交付。未 push。
