# Shadow Duet 最终验收与集成 Runbook

日期：2026-07-25
工作树：`{worktree-base}/shadow-duet-ui`
分支：`codex/exp-shadow-duet-ui`
基线：`aec935f`

## 结论

Shadow Duet 已完成 A 级生产 UI：两位玩家在同一设备上分别用四个姿态键，
在六幕纸幕剧场中同时定格目标姿势。作品保持纯本地、无网络、无持久化、
无第三方运行时资源，可直接用 `file://` 打开。

本分支只修改：

- `experiences/co-op/shadow-duet/**`
- Shadow Duet 专属的 `bugs/**` 与 `learn/**`
- 本验收文档

目录入口、共享运行时、依赖清单和根文档均未修改，留给主集成分支统一处理。

## 提交序列

按完成部分拆分为以下提交：

1. `d4defed` — 冻结生产 UI 契约测试
2. `d7cf55c` — 完成本地双人控制器与语义 HTML
3. `58b747c` — 完成纸幕剧场视觉、README 与借鉴声明
4. `8426835` — 修复终局主操作首屏不可见
5. `bf4c936` — 修复强制色模式下人影消失
6. `7691c2d` — 删除未冻结的额外眉题文案
7. 最终验收文档提交 — 本文、依赖复用问题与学习记录

主分支可按上述顺序 cherry-pick，或在确认范围后合并整个分支。

## 自动化门禁

### Shadow Duet 定向

```text
node --test experiences/co-op/shadow-duet/logic.test.js \
  experiences/co-op/shadow-duet/ui-contract.test.js

tests 38
pass 38
fail 0
```

其中逻辑核心原有 28 项保持通过，新增生产 UI 契约 10 项通过。契约覆盖：

- 经典脚本顺序与 `file://` 边界
- 语义 HTML、八个原生姿态按钮和无脚本回退
- 控制器只消费公开 view
- 键盘与精确 keyup 清理
- 指针所有权、pointer capture 与 click-free 语义
- 单 RAF 时钟与限幅追帧
- blur、visibility、pagehide、焦点与 live region
- 纸幕视觉、减弱动效和强制色回退
- 终局六张记录与主操作首屏约束
- 本地隐私、声明与无运行时外链

### 全仓

```text
npm run verify
仓库验收通过：60 个作品入口（52 个 A 级直开、8 个非 A 启动器）、
1 个能力声明、资源与借鉴声明完整。
```

首次完整 `npm test` 为 `2336/2336`。最终复核中，默认并发执行两次均得到
`2335/2336`，唯一失败是：

```text
scripts/start-reuse.integration.test.mjs
a sequential second launcher reuses the first process and leaves the next port free
等待 child process 退出超时（6 秒）
```

该文件单独执行为 `3/3`，首项约 1 秒；用 Node 官方单并发模式执行同一批
全仓测试为：

```text
tests 2336
pass 2336
fail 0
duration_ms 77771.605583
```

因此该红灯被保留为默认并发下的启动器退出时序问题，不是 Shadow Duet
功能或文件范围回归。未越权修改 `scripts/**`。

## 浏览器验收

验收使用实际 Chrome 页面
`http://127.0.0.1:4173/experiences/co-op/shadow-duet/index.html`。
结束前已关闭本地 HTTP 服务、复位临时 viewport，并关闭验收标签页。

### 六档响应式矩阵

| 视口 | 阶段 | 页面宽/滚动宽 | 舞台尺寸 | 最小姿态按钮 | 结果 |
| --- | --- | --- | --- | --- | --- |
| 1504×1046 | 初始/活动/完成 | 1504/1504 | 1180×390 | 133.25×59.58 | 无横向滚动，初始和完成主操作均在首屏 |
| 1280×800 | 活动/完成 | 1280/1280 | 1180×390 | 133.25×59.58 | 无横向滚动 |
| 844×390 | 活动/完成 | 844/844 | 458.95×232 | 75.76×59.58 | 无横向滚动 |
| 390×844 | 活动/完成 | 390/390 | 366×246 | 83.75×59.58 | 无横向滚动 |
| 320×568 | 活动/完成 | 320/320 | 300×246 | 67.25×59.58 | 无横向滚动 |
| 752×523 | 200% 等效回流代理 | 752/752 | 728×340 | 76.75×59.58 | 无横向滚动 |

短视口中按钮需要纵向滚动，但逐个滚动到视口中央后，
`elementFromPoint` 均命中按钮自身，没有被舞台、装饰层或相邻控件遮挡。

### 完整流程与输入

- 无输入等待约 2.3 秒后进入 `missed`，重试保持中性。
- 六幕完整完成时生成六条顺序正确的合照记录；干净路径为 6 次尝试、
  0 次重试。
- 真实 `Escape` 键可从活动幕立即暂停，清空按下状态并把焦点移回阶段标题。
- 快速双击“拉开幕布”只进入一次 `scene-intro`，不会重复推进。
- 普通 click 姿态按钮不会提交姿态；姿态只由按住/释放边界驱动。
- blur 时从两键按下的 `dancing` 回到暂停后的 `scene-intro`，按下数归零。
- 通过 Chrome CDP 发送真实双触点：左右玩家可同时保持 `展开`；
  `touchCancel` 后两席都精确释放，阶段保持安全。
- 浏览器原始键盘 CDP 注入在当前连接器中不可用；六幕自动流程改为通过生产
  listener 派发标准 `KeyboardEvent`。真实键盘的 Escape 路径另行验证通过。
- 双触控验证只在运行时临时挂载 QA 指针日志，没有写入产品代码。

### 无障碍与降级

- 阶段变化后焦点进入阶段标题；状态通过 live region 宣告。
- `prefers-reduced-motion: reduce` 下人影 transition 为 `0s`、animation 为
  `none`。
- `forced-colors: active` 下人影头部具有 3px 系统色实线轮廓，人物完整可辨，
  未用 `forced-color-adjust: none` 破坏用户配色。
- 禁用 JavaScript 后仍显示标题、固定说明、中性纸幕、无脚本说明和隐私边界；
  不显示伪装可用的控制、目标、记录或主操作。
- 浏览器 console 无 error/warning，无框架错误遮罩。
- 网络事件只有本机 HTML、CSS、logic、config、app；没有产品外部请求。

## 参考图保真清单

1. **构图**：纸幕舞台保持页面主视觉，标题、状态、舞台、节拍轨、双席控制、
   主操作按垂直叙事排列。
2. **色彩**：沿用午夜靛青背景、琥珀纸幕、浅金标题和黄铜边框，不引入新的
   高饱和品牌色。
3. **冻结文案**：标题“把影子，跳成我们”、说明
   “四个姿势，两道影子。看准目标，在亮起的这一拍一起定格。”和主操作文案
   保持一致；额外眉题已删除。
4. **控制形态**：两组持续存在的 fieldset 各含四个纸质按键，同时呈现动作名
   与键位，不用图标替代文字。
5. **节拍叙事**：六个停靠点、当前尝试、已定格数和当前姿态构成非竞争式反馈，
   不增加分数、排名或胜负徽章。
6. **终局顺序**：按可用性调整为“六张记录 → 汇总 → 赠言 → 主操作”；
   隐藏非必要终局状态与控制但保留 DOM，保证桌面首屏可完成下一步。
7. **实现边界**：参考图的纸纹、人影和铜钉均用原创 CSS 绘制；未复制参考图
   PNG，也未把第三方素材带入运行时。

阶段标题与短说明是语义状态机和无障碍焦点锚点，属于实现所需状态文案；
除此之外未增加导航、标签、徽章、计分、相机、上传或设置入口。

## 借鉴与来源

- 借鉴声明位于 `experiences/co-op/shadow-duet/ATTRIBUTION.md`。
- README 使用精确标题 `## 借鉴与来源声明`。
- 参考项目只用于玩法或概念调研；生产实现没有复制其代码、图片、音频或品牌。
- 视觉参考图属于仓库设计资料，只借鉴构图与氛围，生产资产均为本仓库原创 CSS。

## 已记录问题与沉淀

问题：

- `bugs/2026-07-25-shadow-duet-terminal-first-screen-overflow.md`
- `bugs/2026-07-25-shadow-duet-forced-colors-silhouettes.md`
- `bugs/2026-07-25-shadow-duet-extra-eyebrow-copy.md`
- `bugs/2026-07-25-worktree-node-modules-symlink.md`

学习：

- `learn/2026-07-25-shadow-duet-persistent-controls-vs-layout.md`
- `learn/2026-07-25-forced-colors-geometric-figures.md`
- `learn/2026-07-25-reference-fidelity-copy-ledger.md`
- `learn/2026-07-25-worktree-dependency-reuse.md`

## 集成后复核

主分支集成并补目录入口后，建议执行：

```bash
node --test experiences/co-op/shadow-duet/logic.test.js \
  experiences/co-op/shadow-duet/ui-contract.test.js
npm test
npm run verify
```

如果默认并发全仓测试再次只出现上述 child process 退出超时，再用以下命令区分
启动器时序与产品回归：

```bash
node --test scripts/start-reuse.integration.test.mjs
node --test --test-concurrency=1 \
  $(rg --files experiences shared scripts | rg '\.test\.(js|mjs)$' | sort)
```
