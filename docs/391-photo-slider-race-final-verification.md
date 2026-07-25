# “同一张，谁先拼回”生产 UI 最终验收

- 验收日期：2026-07-26
- 实现基线：`df4d0cc2b6232fb034ccee0b2970928debc6f5c6`
- 分支：`codex/exp-photo-slider-race-production-ui`
- 作品目录：[`../experiences/versus/photo-slider-race/`](../experiences/versus/photo-slider-race/)
- 视觉方案：[`295-photo-slider-race-design-proposal.md`](./295-photo-slider-race-design-proposal.md)

## 1. 结论

生产 UI、规则接线、本地隐私边界和响应式布局已经完成。定向测试 41 / 41、
安装锁定依赖后的全仓测试 2,449 / 2,449 均通过；Chrome 中完成了默认图完整对局、
暂停与显式恢复、重赛、键盘和真实指针操作、失焦暂停、六视口与 no-JS 检查。

随后独立 Chrome/CDP 补验完成了真实 touch、两张本地图片的完整处理与切换、
`prefers-reduced-motion` 和 `forced-colors`。本地图片证据覆盖 loading → ready、
预览与双棋盘共用 active Blob URL、下一帧释放旧 URL，以及 DOM / ARIA /
console 不泄漏文件名和 Blob 文本。

最终 Gate 结论为 **PASS，可进入主分支共享安装**。受控 Chrome 的 URL policy
仍禁止打开 `file://`，因此和仓库其他 A 级项目一致，以经典相对脚本、递归本地
资源闭包和零请求式运行合同作为直开证据。生命周期已有真实 blur 暂停；hidden /
pagehide 由核心和静态合同锁定。CDP `frozen` 不会把页面变成
`document.hidden`，不把这一工具语义差异伪装成产品失败。本轮没有新增产品 bug。

## 2. 生产包与本地直开边界

生产包包含：

- `index.html`
- `style.css`
- `config.js`
- `logic.js`
- `app.js`
- `assets/favicon.svg`
- `README.md`
- `ATTRIBUTION.md`

页面使用 `config.js → logic.js → app.js` 的相对路径经典脚本，不使用 ES module、
构建产物、远程字体、CDN、服务端 API、存储或遥测。生产资源扫描只有上述本地
HTML、CSS、JS 和 SVG favicon。浏览器禁用脚本时只显示标题、返回入口和
“请启用 JavaScript”，不伪造可玩棋盘。

Chrome 交互验收地址为：

```text
http://127.0.0.1:8128/experiences/versus/photo-slider-race/
```

localhost 证据只用于交互和布局验收；`file://` 能力由经典相对脚本、零请求式加载、
零运行时第三方资源及静态契约共同约束，本报告不把 localhost 通过写成真实
`file://` 实测。

## 3. 图片与隐私边界

默认图片由本地 Canvas 生成；用户图片只在当前页面内完成解码、校验、居中裁切和
JPEG 编码，不上传、不保存、不写浏览器存储。

上传合同包括：

- 只接受 JPEG、PNG、WebP；
- 文件最大 20 MiB；
- 最短边至少 600 px，最长边不超过 6,000 px；
- 总像素不超过 24 MP；
- 输出最长边不超过 1,200 px，JPEG 质量为 0.9；
- `createImageBitmap` 使用 `imageOrientation: "from-image"`；
- 成功候选才原子切换，失败候选不污染当前图片；
- 预览和双棋盘共同引用一个 active Blob URL；
- 旧 URL 在新图完成切换后的下一帧回收；
- 重赛沿用当前 URL，只生成新排列；
- reload、恢复默认、`pagehide`、`beforeunload` 都有清理路径。

这套单一所有权与两阶段交接方式已经沉淀到
[`../learn/photo-slider-race-object-url-ownership.md`](../learn/photo-slider-race-object-url-ownership.md)。

## 4. 完整玩法 Gate

Chrome 使用默认图完成一局真实流程：

1. 点击开始，经过 3 / 2 / 1 后进入竞速；
2. 左右棋盘起始排列完全相同，但移动状态互相独立；
3. `W` 只增加左席步数，右席保持不变；
4. 主动暂停后计时冻结超过 1.2 秒；
5. 继续时重新经过显式 3 / 2 / 1，不会失焦后自动偷跑；
6. 通过真实按键解完左席，100 ms 结算窗口后显示
   “左边的你先拼回来了”；
7. 终局数据为左席 `107.0 秒 · 26 步`、右席 `未完成 · 0 步`；
8. 点击“同图再赛”后 Blob URL 不变，双方仍使用同一新排列，且排列与上一局不同。

控制器只持有核心状态，所有游戏流转都经 reducer action；倒计时、暂停、结算和重赛
不会在 DOM 里另造第二套规则。随机种子优先来自 Web Crypto，回退为本地 LCG，不用
`Math.random()` 或 `Date.now()`。

## 5. 输入、生命周期与浏览器证据

| 场景 | 证据 | 结果 |
| --- | --- | --- |
| 键盘 | WASD 只控制左席，方向键只控制右席；repeat 和 modifier 被过滤 | PASS |
| 原生按钮 | 棋块为 native button，可点击移动 | PASS |
| 真实指针 | 在 390 px 页面上用浏览器真实指针点击可移动棋块，左席步数 0 → 1 | PASS |
| 主动暂停 | 计时冻结，继续必须重新倒数 | PASS |
| blur | 指针移出 iframe 后真实触发 blur，竞速立即进入 paused | PASS |
| hidden / pagehide | 核心与静态合同覆盖；真实 blur 已验证同一公平暂停入口 | PASS（组合证据） |
| 真实触控 | CDP touch 产生 pointerId=2，左席步数 0 → 1，右席保持 0 | PASS |
| 本地图片 | 两张 PNG 经原生 input change、解码、裁切、JPEG 编码和原子切换 | PASS |
| 控制台 | 桌面、移动和辅助标签页 warning/error 均为空 | PASS |

第一张本地图片进入 loading 时保留旧图且禁用开始，约 700 ms 后 ready；预览与
左右各八个可见图块严格共享同一 Blob URL。第二张图片 ready 后，旧 URL 只在
样式引用切换完成后的下一帧回收。文件 input 随即清空，正文、48 项 ARIA、
accessibility snapshot 和 console 均不含文件名或 `blob:` 文本。

## 6. 六视口与可访问性 Gate

| 视口 | 双棋盘宽度 | 最小棋块 | 暂停按钮 | 横向溢出 |
| --- | ---: | ---: | ---: | ---: |
| 1440 × 900 | 各 547.203 px | 170.398 px | 194 × 52 px | 0 px |
| 1024 × 768 | 各 392 px | 121.328 px | 146 × 52 px | 0 px |
| 768 × 1024 | 各 264 px | 78.664 px | 146 × 52 px | 0 px |
| 390 × 844 | 各 178 px | 52.664 px | 152.5 × 48 px | 0 px |
| 320 × 568 | 各 148 px | 44 px | 128.5 × 48 px | 0 px |
| 844 × 390 | 各 280 px | 87.328 px | 128 × 44 px | 0 px |

桌面使用中轴竖向 HUD，移动端使用上方横向 HUD；两块棋盘始终同宽。320 px 宽度下
棋块严格保住 44 px 触控尺寸。844 × 390 横屏允许自然纵向滚动，但没有横向溢出。

无 JavaScript 的 390 px 检查中，可用按钮数为 0、竞技场不存在、无横向溢出，也
没有上传或保存假入口。`prefers-reduced-motion` 下图块 transition /
animation 均为 `0s`，真实 touch 后规则状态仍正确推进；`forced-colors` 下棋盘、
图块和暂停按钮采用系统色，真实 touch 后计分逻辑不变。两项均已从静态合同升级为
浏览器实测 PASS。

## 7. 视觉 fidelity ledger

同一 QA pass 中查看了两张已接受概念图和两张最新 Chrome 截图：

- 桌面概念：[`assets/photo-slider-race/desktop-active-race-concept.png`](./assets/photo-slider-race/desktop-active-race-concept.png)
- 移动概念：[`assets/photo-slider-race/mobile-active-race-concept.png`](./assets/photo-slider-race/mobile-active-race-concept.png)
- 桌面实测截图：`/tmp/photo-slider-race-browser-1536x1024.png`
- 移动实测截图：`/tmp/photo-slider-race-browser-390x844.png`

生产页面没有引用概念 PNG；默认图和装饰均由本地 Canvas / CSS 原创生成。

| 视觉锚点 | 概念方案 | 生产实现与判定 |
| --- | --- | --- |
| 核心文案 | “同一张，谁先拼回” | 标题精确保留；没有额外 eyebrow 或宣传 badge |
| 双棋盘 | 左金、右珊瑚，同图对称竞速 | 等宽棋盘、同一排列，席位边框精确保留 |
| HUD | 桌面中轴，移动端上置 | 两种断点结构均实现，读数保持同层级 |
| 夜空色盘 | 冷午夜蓝、暖标题、金与珊瑚 | 色彩关系保留，正文对比度更适合实际游玩 |
| 字体层级 | 展示衬线、系统无衬线、等宽数字 | 标题、说明和计时分别落到三套角色 |
| 席位符号 | 左菱形星、右圆与三角 | 以 CSS 轮廓实现，不依赖图片或颜色单独传意 |
| 底部控制 | 单一底部 dock | 生产只保留一个暂停主动作，消除概念中的重复按钮 |
| 默认图片 | 星球与轨道主题 | 位置、轨道和双色主题保留；改为可离线生成的抽象画面 |
| 时间精度 | 概念近似百分秒 | 生产使用 0.1 秒，减少视觉噪声并匹配规则合同 |
| 移动留白 | 概念有较大氛围留白 | 生产压缩留白，确保 320 × 568 的核心操作首屏可见 |

视觉判断为可接受 fidelity；差异均来自已记录的产品化取舍，而不是遗漏。

## 8. 借鉴与许可证

[`README.md`](../experiences/versus/photo-slider-race/README.md) 和
[`ATTRIBUTION.md`](../experiences/versus/photo-slider-race/ATTRIBUTION.md) 都包含
“借鉴与来源声明”。实现记录了所参考的官方 Web 标准，以及只用于方案评审的
OpenAI Image Gen 概念图路径与 SHA-256。

当前结论：

- 零第三方运行时依赖；
- 零第三方源代码复制；
- 零第三方图片、字体或音频复制；
- 概念图仅存于 `docs/`，不进入生产运行时。

## 9. 自动化、依赖与范围审计

| 检查 | 结果 |
| --- | --- |
| `node --check app.js` | PASS |
| `node --test logic.test.js ui-contract.test.js` | 41 / 41 PASS |
| `npm ci` | 安装锁文件已有的 55 个包；0 vulnerabilities；锁文件无变化 |
| `npm test` | 2,449 / 2,449 PASS |
| `npm run verify` | 主分支依赖齐备后 PASS |
| `git diff --check` | PASS |

第一次全仓测试在未安装依赖时因找不到锁文件已有的 `qrcode@1.5.4` 失败；执行
`npm ci` 后全仓通过，没有修改 `package.json` 或 `package-lock.json`。

生产 worktree 初次 verify 曾因共享 Pannellum vendor 尚未生成而失败；这不属于
项目分支范围。主分支统一依赖齐备后，repository verify 已通过，未为本项目新增或
修改共享依赖。

相对基线的改动只位于：

```text
experiences/versus/photo-slider-race/
learn/photo-slider-race-object-url-ownership.md
docs/391-photo-slider-race-final-verification.md
```

没有修改 catalog、根入口、分类 README、docs README、Board、共享运行时或共享
依赖。浏览器验收使用的临时 `qa-popup.html` 已删除。

## 10. 最终 Gate

| Gate | 状态 |
| --- | --- |
| A 级本地经典脚本闭包 | PASS（静态合同） |
| 默认图完整对局、暂停、恢复与重赛 | PASS |
| 双席同图同排列、独立操作与结算 | PASS |
| 键盘、原生按钮与真实指针 | PASS |
| blur 暂停 | PASS |
| hidden / pagehide 生命周期 | PASS（真实 blur + 核心/静态合同） |
| 六视口、44 px 触控尺寸与无横向溢出 | PASS |
| no-JS 降级 | PASS |
| reduced-motion、forced-colors | PASS（浏览器媒体模拟 + 真实 touch） |
| 控制台与零外联 | PASS |
| 本地图片成功 / 切换 / 释放流程 | PASS |
| 真实 touch | PASS |
| 真实 `file://` 启动 | PASS（仓库统一静态 A 闭包；Browser URL policy 禁止 live scheme） |
| 视觉 fidelity | PASS |
| 借鉴与许可证声明 | PASS |
| 定向与全仓测试 | PASS |
| repository verify | PASS（主分支统一依赖环境） |
| 范围隔离 | PASS |

结论：本项目生产实现与独立补验均已完成，最终状态为 **PASS**。可交给总控完成
catalog、根门户、分类索引和主分支全仓回归。
