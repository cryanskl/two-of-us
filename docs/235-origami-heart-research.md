# S16“折纸心机关”定向调研

- 调研日期：2026-07-24
- 对应 Brainstorm：[`234-origami-heart-brainstorm.md`](./234-origami-heart-brainstorm.md)
- 推荐目录：`experiences/surprises/origami-heart/`
- 推荐题名：**沿着折痕，折到你心里**
- 推荐启动等级：A

## 1. 结论

S16 可以在本仓库独立实现为零依赖、可直接双击的轻量惊喜。核心不需要真实折纸求解器：用有限状态机冻结五道折痕，用 HTML/CSS 分层平面表达稳态，用 Pointer 只提供临时手势进度，用原生按钮提供完整等价路径。

生产实现不引入开源代码或素材。两个 MIT 项目只用于确认“DOM/CSS 平面能够制造折叠感”和“折叠表现应有明确生命周期”；GPL、无许可证和商业折纸图解全部排除。

## 2. 来源核验

### 2.1 正式参考

| 来源 | 固定 commit | 状态 | 许可证 |
|---|---|---|---|
| [`joumorisu/CSS-Origami`](https://github.com/joumorisu/CSS-Origami/tree/2b25ed2f7e7162eb3234fda1093617f4f7134c03) | `2b25ed2f7e7162eb3234fda1093617f4f7134c03` | 默认分支 HEAD；未归档、未禁用；README 明示不再维护 | MIT；Copyright (c) 2017 Joseph |
| [`dmotz/oriDomi`](https://github.com/dmotz/oriDomi/tree/f90830504d6843dfdf5b72d873c01cd716538485) | `f90830504d6843dfdf5b72d873c01cd716538485` | 默认分支 HEAD；未归档、未禁用 | MIT；Copyright (c) 2014 Dan Motzenbecker |

许可证载体：

| 来源 | 固定载体 | SHA-256 |
|---|---|---|
| CSS-Origami | [`LICENSE`](https://github.com/joumorisu/CSS-Origami/blob/2b25ed2f7e7162eb3234fda1093617f4f7134c03/LICENSE) | `a4dcc29992c5879066e457d3bb2540a194d5334620b1882450c332fdb9602f42` |
| oriDomi | [`LICENSE`](https://github.com/dmotz/oriDomi/blob/f90830504d6843dfdf5b72d873c01cd716538485/LICENSE) | `8588b3379ce3245f3753bd31e463bd334b9b7301a3e796450ac723ca42093e5e` |

固定 commit 与当前 HEAD 相同只说明本次无需追版；生产声明仍固定到上述对象。

### 2.2 借鉴声明

CSS-Origami 只用于确认：

- 多个平面、`transform-origin` 与遮挡次序可以表达“纸被折起”的视觉感；
- 2D 内容和折叠表现可以分层；
- 表现需要在没有动画时仍有可读稳态。

oriDomi 只用于确认：

- 折叠表现需要清晰的初始化、效果调用/内容修改、重置与销毁边界；
- 一个 DOM 对象可被表现为多个折面；
- 本项目据此推导“表现 API 不应成为业务状态本身”；这条是本仓库架构结论，不是上游主张。

本作不复制、改写、翻译、链接、打包或 vendoring 两个项目的源码、CoffeeScript、CSS、API、数学、常量、示例、SVG、图片、文案或页面。生产代码不依赖它们。

### 2.3 排除来源

- [`rabbit-ear/rabbit-ear@b717948c`](https://github.com/rabbit-ear/rabbit-ear/tree/b717948c712324dba2132450a12c0260a48e8aeb) 为 GPL-3.0，固定 `license` SHA-256 为 `2fcbc59fd6474f7451a53b73bb38648034eeb71fcd3613330b0ffd6296d94784`；
- [`raphamorim/origami.js@b77fb0b4`](https://github.com/raphamorim/origami.js/tree/b77fb0b45188e66ea5644884279b8cff24b5bf81) 为 GPL-3.0 且仓库已归档，固定 `COPYING` SHA-256 为 `0ae0485a5bd37a63e63603596417e4eb0e653334fa6c7f932ca3a0e85d4af227`；
- [`mangaslave/HeartOrigami@3d045f4e`](https://github.com/mangaslave/HeartOrigami/tree/3d045f4e580820039940d72c64de67bf2096fed3) 未发现清晰仓库级许可证，不作为可复制来源；
- [`hannahapuan/shetech-origami-heart@d18dd223`](https://github.com/hannahapuan/shetech-origami-heart/tree/d18dd223a7f021318708efaaf784674280b08a9b) 没有清晰仓库级许可证，且包含来源与许可载体未完整随附的 vendored 代码和外部折纸教程步骤；不能用相关项目后来的许可证状态倒推其 2019 固定对象，因此只作排除记录，不复制代码、FOLD/SVG、折叠步骤或视觉，也不依赖；
- CodePen、短视频、博客图解、商业折纸书与品牌贺卡只用于发现，不复制步骤图、折线图、照片、文案、版式或 trade dress；
- 不使用系统 emoji、第三方图标库、图片心形、远程字体或音频。

## 3. Web 平台边界

### 3.1 CSS transforms

[CSS Transforms Level 1](https://www.w3.org/TR/css-transforms-1/) 定义二维 transform 与 `transform-origin`；当前发布页是 2019-02-14 W3C Candidate Recommendation。[CSS Transforms Level 2](https://www.w3.org/TR/css-transforms-2/) 扩展 3D transform、`perspective`、`transform-style` 与 `backface-visibility`；当前发布页是 2021-11-09 Working Draft。

Level 2 明确允许用户代理只支持二维子集。因此生产实现不能把 3D transform 当作规则能力：

- state 只保存折痕前缀；
- 3D 只负责增强表现；
- 2D fallback 与 reduced-motion 使用同一状态；
- 不读取 computed transform 判定完成。

### 3.2 Pointer

[Pointer Events Level 3](https://www.w3.org/TR/pointerevents3/) 当前发布状态为 2026-06-30 W3C Recommendation。实现只使用统一 Pointer 流、capture、`pointercancel` 与 `lostpointercapture`：

- capture 丢失或取消只清空 app 层手势；
- `pointerup` 后浏览器会隐式释放 capture，代码不能依赖手动释放成功推进业务；
- 原生按钮是完整替代，不把拖动设为唯一方式。

### 3.3 动效、强制颜色与可访问性

- [Media Queries Level 5](https://www.w3.org/TR/mediaqueries-5/) 当前为 2026-02-19 Working Draft，用于校准 `prefers-reduced-motion`；
- [CSS Color Adjustment Level 1](https://www.w3.org/TR/css-color-adjust-1/) 当前为 2025-12-16 Candidate Recommendation Snapshot，用于校准 `forced-colors`；
- [WCAG 2.2](https://www.w3.org/TR/WCAG22/) 当前为 2024-12-12 W3C Recommendation。

与本作直接相关的项目 Gate：

| 准则 | 等级 | 本作处理 |
|---|---:|---|
| 1.3.1 Info and Relationships | A | 有序列表表达五道折痕与当前步骤 |
| 1.4.4 Resize Text | AA | 文本放大到 200% 仍不丢失内容或功能 |
| 1.4.10 Reflow | AA | 320 CSS px 等效宽度（典型 1280px/400% zoom）不丢功能或要求非必要双向滚动 |
| 2.1.1 Keyboard | A | 不使用 Pointer 也能完成五折、翻面与重开 |
| 2.4.7 Focus Visible | AA | 所有键盘焦点都有至少 3px 可见轮廓 |
| 2.3.3 Animation from Interactions | AAA | reduced-motion 直接切稳态 |
| 2.5.2 Pointer Cancellation | A | 只在 pointerup 提交；cancel/lost 不推进 |
| 2.5.7 Dragging Movements | AA | 原生按钮完整替代拖动 |
| 2.5.8 Target Size (Minimum) | AA | 项目使用至少 48×48 CSS px，严于 24×24 最低值 |
| 4.1.3 Status Messages | AA | 单一稳定 live region 播报步骤结果 |

这份设计目标不等于完整 WCAG 认证；48px 与 3px focus ring 是项目自定强化 Gate。

## 4. 技术可行性

| 项目 | 决策 |
|---|---|
| 启动 | A 级，经典脚本与相对资源，`file://` 直接打开 |
| 依赖 | 无 dependency、devDependency、vendor 或 CDN |
| 状态 | 纯 reducer，严格五步前缀、turning、complete |
| 表现 | HTML/CSS 基本形；可选 3D，必须有 2D 稳态 |
| 手势 | Pointer 临时进度；阈值提交；按钮完全等价 |
| 私密 | complete 前不进入公开 view 或 DOM |
| 数据 | 只在内存；无 Storage、URL、网络、日志 |
| 素材 | 无生产图片、第三方字体、图标、音频或模型 |
| 响应式 | 1728、1280、390、320、200% zoom |
| 降级 | reduced-motion、forced-colors、无 3D、无脚本 |

## 5. 风险与缓解

| 风险 | 缓解 |
|---|---|
| CSS 看起来像“变形”而非折纸 | 每步同时显示折痕、活动边、编号和动词，不靠动画单独表达 |
| 3D 层叠在浏览器间不同 | 冻结 2D 稳态；3D 是增强，不参与规则 |
| 拖动中途离开元素 | pointer capture；cancel/lost/blur/hidden 清理 |
| 点击与 pointerup 重复提交 | Pointer 成功提交后抑制同一交互产生的兼容 click；reducer 对重复 action no-op |
| 私信被提前埋在页面 | phase-owned DOM；complete 前 public view 没有私密字段 |
| 折纸步骤被误认为传统教程 | README 明确“网页仪式步骤，非传统模型教学” |
| CSS 失败后无法继续 | 原生有序列表和按钮保持业务路径 |

## 6. Go / No-Go

结论：**Go**。

进入规格时冻结：

1. 五个 fold ID、顺序与公开文案；
2. Pointer 投影方向、归一化距离和 `0.72` 提交阈值；
3. reducer 状态、action schema、revision 与公开 DTO；
4. complete 前私密字段零暴露；
5. 代码原生视觉、2D/3D/reduced/forced/no-script 降级；
6. README 与 ATTRIBUTION 的逐项借鉴声明；
7. 逻辑、UI、catalog、浏览器、bugs/learn 和最终验证的独立提交边界。
