# 「这一格归谁」验收记录

> 验收日期：2026-07-18；调研提交：`81d7ed5`；规格提交：`9494a07`、`0180462`；视觉提交：`abecfa7`；功能提交：`aeed5bb`、`d03d62f`、`61cf89a`；状态修复：`6fdaf97`；localhost 修复：`6502c86`。

## 1. 结论

「这一格归谁」已作为第 27 个无第三方运行依赖的 A 级作品接入门户。真实 `file://` 入口完成了开局、普通换手、单格续走、一笔双格、40 边终局、平局结果、轮换首发重开、键盘焦点、窄屏、纹理失败回退、reduced motion 与控制台验收。

运行时只有经典 HTML、CSS、JavaScript 和仓库内本地素材，不读取存储、不联网，也不依赖构建工具。规则依据传统 Dots and Boxes 的“完成方得分并继续”机制；开源仓库只用于比较状态边界与工程风险，未复制代码、依赖或素材。完整来源与借鉴声明见 [`69-dots-and-boxes-research.md`](./69-dots-and-boxes-research.md)、作品 [`README.md`](../experiences/versus/dots-and-boxes/README.md) 和素材 [`ATTRIBUTION.md`](../experiences/versus/dots-and-boxes/assets/ATTRIBUTION.md)。

## 2. 自动检查

| 检查 | 结果 |
| --- | --- |
| `node --test experiences/versus/dots-and-boxes/logic.test.js` | 17 / 17 通过 |
| `npm test` | 442 / 442 通过 |
| `npm run verify` | 35 个作品入口、1 个能力声明通过 |
| `git diff --check` | 通过 |

定向测试覆盖 40 条规范边、严格 ID、配置整份回退、普通换手、单格与双格闭合、重复边幂等、完整事件重放、伪造派生字段拒绝、确定性 8–8 终局、视图隔离、终局文案安全回退和轮换首发重开。

## 3. 浏览器方法与环境

- 首选应用内 Browser 插件；当前环境返回 `No browser is available`，并且故障文档指向旧版本缓存目录，已记录在 [`bugs/2026-07-18-browser-plugin-version-drift.md`](../bugs/2026-07-18-browser-plugin-version-drift.md)；
- 回退方法：`playwright-cli` 驱动本机 Chromium；通过页面级导航真实打开 `file://{repo-root}/experiences/versus/dots-and-boxes/index.html`，并以 `127.0.0.1:8769` 复验资源与故障降级；
- 直接文件入口与 localhost 正常路径均为 0 error；localhost 自动 favicon 请求曾产生 404，现已使用体验内相对 SVG 修复并记录在 [`bugs/2026-07-18-dots-boxes-localhost-favicon-404.md`](../bugs/2026-07-18-dots-boxes-localhost-favicon-404.md)；
- 桌面尺寸：1504×1046；手机尺寸：390×844；最窄 Gate：320×700。

## 4. 实玩路径

| 路径 | 证据与结果 |
| --- | --- |
| intro → playing | 开始前 40 条边禁用；点击“开始落笔”后焦点落到第一条可用边 |
| 普通落笔 | 未闭格时严格换手，`moveNumber` 与已落边同步增加 |
| 单格闭合 | `H:0:0 → V:0:0 → V:0:1 → H:1:0` 后蓝方得 1 格并继续 |
| 一笔双格 | 既定 7 边轨迹以 `V:0:1` 收尾，朱方一次得到 2 格并继续 |
| 完整终局 | 真实点击其余边直至第 40 笔；16 格全部归属、空边为 0、结果卡唯一出现并获得焦点 |
| 8–8 平局 | 验收轨迹显示“这一页写满了 · 8 比 8”，双方各占 8 格 |
| 再来一页 | 分数、边与格清零，结果节点删除，首发从朱方轮换为蓝方 |
| 可访问归属 | 格子暴露“第 1 行第 1 格，归朱方”等语义；已落边不可再次激活 |

## 5. 状态、规则与本地边界

- `moves: [{ edgeId, player }]` 是唯一可持久重放的权威事实，`moveNumber`、分数、格子、当前玩家与终局均由完整重放验证；
- UI 只消费按规范顺序派生的 `view.edges`，不同时维护第二份可漂移的边集合；
- 一条物理边只对应一个规范 ID；中间边可以在同一步闭合两个相邻格，但只追加一个事件；
- 闭格者继续，否则换手；40 条边后强制终局，16 格总分与所有边形成封闭不变量；
- `config.js` 只允许改双方名字和终局语气，规则、棋盘尺寸、分数与胜负不可由配置改写；
- 页面没有远程 URL、模块脚本、网络 API、存储 API、上传、音频或第三方运行依赖。

## 6. 响应式、失败回退与可访问性

| 视口 / 能力 | 结果 |
| --- | --- |
| 1504×1046 | `scrollWidth = clientWidth = 1504`，`scrollHeight = clientHeight = 1046`；双列首屏完整可见 |
| 390×844 | 棋盘宽 366px，最小边命中区 44px，无横向或纵向溢出 |
| 320×700 | 棋盘宽 300px，最小边命中区 44px，`scrollWidth = clientWidth = 320`，`scrollHeight = clientHeight = 700` |
| 纹理失败 | 阻断 `paper-texture.png` 后仍保留 `rgb(244, 237, 221)` 纸色与代码方格，并可正常落第 1 笔 |
| reduced motion | 命中线伪元素的 transition / animation 均为 `0.00001s`，规则推进不等待动画 |
| 键盘与焦点 | 原生 button 提供顺序键盘导航；开局聚焦第一空边，终局聚焦结果标题 |
| 语义 | H1/H2、比分区、40 个具名边按钮、16 个具名格、live region 和唯一结果卡均随状态更新 |

## 7. 视觉概念与运行截图

- [桌面进行态概念 1504×1046](assets/dots-and-boxes/concept-desktop-playing.png)；
- [手机进行态概念 853×1844](assets/dots-and-boxes/concept-mobile-playing.png)；
- [桌面终局概念 1504×1046](assets/dots-and-boxes/concept-desktop-finished.png)；
- [桌面进行态运行截图](assets/dots-and-boxes/render-desktop-playing.png)；
- [桌面终局运行截图](assets/dots-and-boxes/render-desktop-finished.png)；
- [手机进行态运行截图](assets/dots-and-boxes/render-mobile-playing.png)。

运行截图来自当前 HEAD 的真实 Chromium 页面；概念图只作设计证据，不在运行时加载。概念中的 3–2、9–7 是构图占位数据，运行截图的 2–0、8–8 来自真实点击轨迹。

## 8. 保真账本

| 比较点 | 概念证据 | 运行证据 / 处理 |
| --- | --- | --- |
| 单一大棋盘 | 右侧 5×5 点阵为唯一主物件 | 桌面保留不对称双列与最大棋盘；无嵌套卡片分散注意力 |
| 纸与桌面 | 暖象牙纸压在炭棕桌面 | 本地低对比纸纹、代码方格与深棕外框保持同一材质关系 |
| 字体层级 | 大宋体标题、短规则、紧凑状态 | 标题固定单行；状态、比分与动作压成左侧清晰纵向节奏 |
| 双方颜色 | 朱红与靛蓝墨迹 | 已落边、格子洗色、比分与“朱/蓝”印记使用同一双色系统 |
| 棋盘几何 | 5×5 点、4×4 格、细笔画 | 40 个独立命中区覆盖薄线视觉；点、边、格来自同一 CSS 网格 |
| 手机顺序 | 标题、比分、棋盘、状态 | 390 与 320 均保持这个优先顺序，棋盘不缩小命中区 |
| 终局密度 | 所有格均有归属并突出最终比分 | 实际 8–8 轨迹完整填满 16 格，空边清零并只出现一个结果卡 |
| 交互反馈 | 墨迹逐笔增长、占格后续走 | 线与洗色由权威状态即时绘制；reduced motion 下仍完整表达 |

有意偏差：运行版不复制概念图中的钢笔、墨水瓶、撕纸边缘或 A/B 字母，因为它们不承载规则且会增加小屏与本地资源负担；双方改用中文“朱/蓝”。视觉数据也不伪造概念比分，而以实际轨迹为准。

## 9. 来源、借鉴与问题沉淀

- 传统规则核对：[AAAI Dots-and-Boxes 论文](https://ojs.aaai.org/index.php/AAAI/article/download/8144/8002)；
- MIT 工程边界比较：[Upside-Down-Collective/dots-game 固定提交](https://github.com/Upside-Down-Collective/dots-game/tree/c9fdec7ba334412c1ce9798c341e29900cadebde) 与 [许可证](https://github.com/Upside-Down-Collective/dots-game/blob/c9fdec7ba334412c1ce9798c341e29900cadebde/LICENSE)；
- MIT 风险比较：[jessefischer/dots-and-boxes 固定提交](https://github.com/jessefischer/dots-and-boxes/tree/4e3382aa04d844f9c46932d7df9161bb8d6745bd) 与 [许可证](https://github.com/jessefischer/dots-and-boxes/blob/4e3382aa04d844f9c46932d7df9161bb8d6745bd/LICENSE)；
- 无许可证候选只作发现线索：[wannesm/dotsandboxes 固定提交](https://github.com/wannesm/dotsandboxes/tree/70ba3a9f1c99a8aee4de0347d0b276bf9093ca4c)。

以上来源均未复制代码、依赖、素材或文案。实现期间发现并记录了状态规格并行漂移、Browser 插件版本漂移和 localhost favicon 404；通用状态建模经验沉淀在 `learn/`。
