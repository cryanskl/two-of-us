# “稳稳地，和你一起向前”验收记录

- 日期：2026-07-18
- 作品：[`../experiences/co-op/steady-together/`](../experiences/co-op/steady-together/)
- 等级：A，本地经典脚本，无新增安装依赖、账号、存储、音频或公网请求
- 玩法：两人分别按住天平两端，把滚珠稳在中央，经过三段相反坡势、两处检查灯和终点 30 tick 保持

## 1. 结论

功能、可达性、确定性、本地边界、目录接入、来源声明与基础视觉实现通过验收；截图式响应式与像素 fidelity 保留为待独立复核项：

- 83 项 reducer 测试覆盖升力、倾角、球位/速度、复合稳定 Gate、12 tick 预热、检查点回退、双松手、暂停、严格镜像、重放和真实三段完成日志；
- 完整可达日志只使用生产 `PRESS`、`RELEASE` 与单步 `TICK`，约 900 tick 完成，左右双方各有 300 次以上按下/松开，不存在测试专用后门；
- 经典脚本、相对资源、无远程请求/浏览器存储/媒体 API、精确 pointerId 生命周期、A/L 键盘与 500ms 长帧中断由目录 Gate 固定；
- 前端实现子任务在 Chrome 中完成真实 `file://` 直开渲染，三个脚本语法、83 项逻辑和静态边界均通过；
- 主任务的内置浏览器安全策略拒绝 `file://` 导航，并明确禁止换表面或底层命令绕过，因此本轮没有新增实现截图、DOM 几何或 forced-colors 真实截图；
- 目录现有 42 个作品入口，其中 34 个 A 级；C06 在目录、门户回退目录和 backlog 中各有唯一条目；
- README 与 ATTRIBUTION 固定十个机制项目、四份 Web 规范、许可证/权利主体、ImageGen 无第三方输入和完整零复制声明；
- 两个真实问题均已记录并闭环：WebP 编码器不可用和非等幅坡势与严格镜像契约冲突。

当前受限项是自动化证据能力，不是已复现产品缺陷。由于没有最新实现截图，本报告不宣称完成像素级视觉验收。

## 2. 自动检查

| 检查 | 结果 |
| --- | --- |
| `node --check` 三个生产 JavaScript | PASS |
| `node --test experiences/co-op/steady-together/logic.test.js` | 83 / 83 PASS |
| `node --test shared/runtime/catalog.test.js` | 61 / 61 PASS |
| `npm test` | 700 / 700 PASS |
| `npm run verify` | 42 个作品入口、1 个能力声明 PASS |
| `git diff --check` | PASS |

目录 Gate 额外固定：

- 无 module、远程 `src/href`、fetch/XHR/WebSocket、Worker、浏览器存储、传感器、录音、音频、`Math.random` 或共享运行时引用；
- `requestAnimationFrame` 只驱动 20ms 整数 tick；超过 `MAX_FRAME_GAP_MS` 的长帧中断，不补算后台时间；
- `pointerup`、`pointercancel`、`lostpointercapture` 与 document 释放按精确 `pointerId` 汇聚；
- Pointer 与键盘都映射到物理 `inputId`，重复按下、旧 RELEASE、blur/hidden 和 Escape 均安全清理；
- `touch-action:none` 只用于两个按住 pad；48px 辅助控件、reduced motion 和 forced colors 有静态回归；
- 背景缺失时原生 SVG 路线、检查灯、横梁、滚珠、中央区和文字仍保留完整规则。

## 3. 确定性玩法验收

### 3.1 权威状态与更新顺序

权威层只保存有界整数：升力 `0..1000`、倾角 `-300..300`、球位 `-6000..6000`、球速 `-72..72`、路线 `0..2400` 和整数 tick。每 tick 按“升力 → 倾角 → 球速 → 球位 → 稳定判定 → 路线/检查点/完成”更新，DOM、CSS、rAF 时间戳和图片都不能写回规则。

稳定前进同时要求：

- 双方总支撑不低于 1240；
- 滚珠位于中央 `±500`；
- 球速绝对值不高于 18；
- 横梁倾角绝对值不高于 48；
- 连续预热 12 tick 后，每 tick 前进 3；
- 终点连续保持 30 tick 才完成。

### 3.2 公平、镜像与可达

三段坡势固定为 `+84 / -84 / 0`。交换左右升力和输入、反转倾角/球位/速度符号后，下一 tick 的局部物理字段严格镜像；检查点和路线进度属于旅程元数据，不错误纳入局部镜像断言。

同一生产动作日志重放深相等，嵌套 action 不被修改。可达控制器根据公开物理状态反解两端目标升力，真实穿过 800、1600 两处检查点并完成 2400 路线和 30 tick 终点保持，证明规则不是只有安全边界却无法完成。

## 4. 输入、生命周期与阶段 DOM

| 路径 | 验收结果 |
| --- | --- |
| 键盘 | `KeyA` / `KeyL` 使用物理 code；repeat、修饰键、IME 与可编辑目标不进入玩法；tracked keyup 始终可释放 |
| Pointer | 两个 pointerId 可分别占据左右席；同一 pointer 不重复占席；capture 失败时 document pointerup 兜底 |
| 释放 | pointerup/cancel/lost capture 幂等；过期 inputId 不释放新输入 |
| 暂停 | Escape、blur、hidden、长帧清空本地输入与 accumulator；恢复不补算后台时间 |
| 掉落 | 进入 release gate；两边全部松开后从最近检查灯继续，不指责某一席 |
| DOM | intro、interaction、ready、paused、complete 各自拥有结构；完成赠语只在 complete 创建 |
| 焦点/播报 | 结构变化后聚焦阶段标题或主动作；普通与紧急 live region 分层，不逐 tick 刷屏 |

## 5. 视觉与 fidelity 证据

同轮以原始分辨率复核：

- [`../design/steady-together/concept-desktop-playing.png`](../design/steady-together/concept-desktop-playing.png)，1504×1046；
- [`../design/steady-together/concept-mobile-playing.png`](../design/steady-together/concept-mobile-playing.png)，853×1844；
- [`../design/steady-together/concept-desktop-complete.png`](../design/steady-together/concept-desktop-complete.png)，1503×1046；
- [`../experiences/co-op/steady-together/assets/balance-journey.webp`](../experiences/co-op/steady-together/assets/balance-journey.webp)，1536×1024。

生产背景与概念同属暖象牙宣纸山水、双边山路和 rose/teal 两盏环境灯；背景中央留白足够承载原生平衡车，没有文字、UI、横梁、滚珠、品牌或水印。

由于当前主浏览器不能打开本地文件且没有保存前端子任务截图，以下是“设计概念 ↔ 生产源码”的静态 fidelity ledger，不是像素截图比较：

| 项目 | 静态结果 | 证据与限制 |
| --- | --- | --- |
| 标题与首屏文案 | PASS | DOM 使用冻结标题和“把滚珠接回中央，我们才会一起向前”；intro/complete 个性化文案来自安全配置 |
| 三段路线 | PASS | 原生 SVG 生成“向右接住 / 换边接回 / 一起回正”、两灯和终点双环；不依赖背景裁切 |
| 主焦点 | PASS | 平衡车、横梁、滚珠和中央区由同一 stage SVG 生成，transform 只来自 view model |
| 色彩关系 | PASS | CSS 锁定 paper、porcelain、brass、rose、teal 与 ink 令牌；左右席另有文字、位置和轮廓 |
| 双 pad | PASS | 桌面两列、移动仍两列；pad 使用 `touch-action:none`，移动最窄规则仍保留 122px 以上高度 |
| 开放舞台 | PASS | body 直接承载背景与舞台，没有新增侧栏、玻璃卡片、计分器、生命或统计 HUD |
| 移动重排 | CODE PASS / SCREENSHOT PENDING | 700px 与 340px media query 保留路线、舞台、状态、双 pad；真实 390×844/320×700 几何未在主任务复核 |
| 完成态 | CODE PASS / SCREENSHOT PENDING | complete DOM 创建水平终局文案、再走一次和返回作品集；83 项 reducer 到达 complete，无浏览器终局截图 |
| 降级模式 | CODE PASS / BROWSER PENDING | reduced motion、forced colors 与背景缺失规则均实现；真实媒体查询截图未取得 |

### 文案差异

- 概念进行态短句“把滚珠接回中央，我们才会一起向前”逐字保留；
- 生产 intro 允许配置为“托住两端，把滚珠稳在中央，我们才会一起向前。”，比概念多解释共同支撑，但只出现在开始前；
- 完成赠语逐字保留“不是从来不摇晃，是每次偏离时，我们都愿意把彼此接回来。”；
- 生成概念中的装饰性假字不进入产品，所有可见文字均为真实 DOM。

### 有意偏离

- 栅格概念里的精细瓷盘、黄铜与珍珠由原生 SVG 重建，以便连续投影、缩放和 forced-colors；
- 环境灯只负责叙事，真正检查点另由 SVG 表达，防止移动裁切丢失规则；
- 运行态增加四项非颜色稳定说明，解释为何没有前进；
- 背景没有把横梁和滚珠烘焙进图片，确保规则对象始终由 reducer 控制。

未发现源码层面的未声明视觉偏离；像素尺寸、裁切、焦点环和完成态构图仍需未来能打开 `file://` 的浏览器截图复核。

## 6. 借鉴与来源声明

完整声明见 [`../experiences/co-op/steady-together/ATTRIBUTION.md`](../experiences/co-op/steady-together/ATTRIBUTION.md)。本作品只研究通用机制和技术边界：

- `makenowjust-sandbox/20210411-seesaw@70790b1c0cc57aabddd93f58ad456e473db44d2e`，MIT；
- `ekids9702122935/balance-ball-game@8cc21a213394f0e701ca0643af3fef32562f5d91`，MIT；
- Matter.js `8a67787735585f02c4b46eabf7b9fcc1c7c321da`、Planck.js `93dd64df0fd2e5388551b159bebc6306e7af580a`、Box2D `56edae79f2949d86142b03450d5d60f63bcf5a6f`，均为 MIT；
- Unity ML-Agents `5f2aae68223624559096479695a8d7a94296bfec`，Apache-2.0；
- `pemmyz/js_robotballgame_redux@3ca9f1ac5b16cb7123f8f19cf2e7362b1b019df5`、`imshota1009/Nyan-Cororin@fb9054368526d30929870aae7338b3b956235e7a`、`chriz-3656/tiltmaze@3c959deb5743fea22e9654c69c697e4cf4dc5334`、`neizod/marbles@bb8542028d1665775e46262a86d19ff5baab038a`，均为 MIT；
- W3C Pointer Events `238e8273305bb2e3c76f9f0bb289fb127c3dff74`、WHATWG HTML `56674fb3ac40279141a202e5d19b84f30d99854d`、Page Visibility `8ca533c744e655b8340b5713d1bd5ea97b202b13` 与 WCAG `07123b871c103268375880980fd715b2b26b2ff0`。

没有复制、翻译、改写、打包或依赖上述项目和规范的代码、公式、参数、关卡、素材、图标、字体、音频、截图、图表、页面结构、文案或视觉。三段坡势、整数动力学、检查点、终点保持、页面、原生 SVG、中文文案与测试均为本仓库独立创作。

`balance-journey.webp` 与三张概念由 OpenAI 内置 ImageGen 生成，第三方图像输入为无。

## 7. Bugs 与 Learn

本批记录并处理：

- [FFmpeg 可执行但没有 WebP 编码器](../bugs/2026-07-18-steady-together-webp-encoder-unavailable.md)：制作期改用已核验 WebP 能力的 Pillow，未增加运行依赖；
- [非等幅坡势与严格镜像 Gate 矛盾](../bugs/2026-07-18-steady-together-asymmetric-bias-mirror-contract.md)：改为 `+84/-84/0`，83 项测试闭环严格镜像与完整可达。

本批新增沉淀：

- [对称双人动力学：让 fixture、舍入和镜像 oracle 同时成立](../learn/2026-07-18-symmetric-dynamics-and-mirror-oracles.md)

浏览器 `file://` 安全策略是当前自动化环境限制，只在本报告记录，不作为项目 bug 写入 `bugs/`。

## 8. 独立提交链

```text
f5c267d docs: research steady together
e47e821 docs: specify steady together
8330919 docs: plan steady together
db0d428 design: define steady together visuals
fb9b596 fix: align steady together mirror contract
afffd27 feat: add steady together state engine
9e52941 feat: add steady together experience
4567c77 feat: catalog steady together
e1af08f learn: document symmetric dynamics oracles
a7e9cb1 docs: close steady together mirror regression
```

本验收报告与索引另作一个提交，继续遵守“一部分完成一次提交”。
