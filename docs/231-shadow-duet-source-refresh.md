# “把影子，跳成我们”固定来源维护复核

- 复核日期：2026-07-24
- 对应调研：[171-shadow-duet-research.md](./171-shadow-duet-research.md)
- 对应规格：[172-shadow-duet-spec.md](./172-shadow-duet-spec.md)
- 对应计划：[203-shadow-duet-plan.md](./203-shadow-duet-plan.md)
- 对应视觉提案：[205-shadow-duet-design-proposal.md](./205-shadow-duet-design-proposal.md)
- 范围：来源维护；不修改纯逻辑、不创建生产页面、不引入依赖、不改变视觉确认 Gate

## 1. 复核结论

截至 2026-07-24，四个已登记开源来源均仍公开、未归档、未禁用。Bemuse、
PixiJS 与 MediaPipe 的固定 commit 仍等于当前 `HEAD`；osu! 已前进到新
`HEAD`，但原固定 commit 仍可访问，许可证和 README 权利边界没有因此失效。

本次最重要的两项结论是：

1. Bemuse 的根 `LICENSE` 是 AGPLv3 全文，根 README 也称主项目为
   AGPLv3，但 `bemuse/package.json` 历史 metadata 写有 `AGPL-1.0`。
   本作不尝试替上游解释该冲突，不复制、翻译、改写或链接 Bemuse 代码；
2. osu! 的 MIT 只覆盖代码和 framework。固定 README 明确把 `osu!` /
   `ppy` 品牌排除在该许可之外，并说明游戏资源另有许可证。本作不使用其
   品牌、资源、谱面、声音、界面或 trade dress。

“固定 commit 仍是 HEAD”或“固定 commit 仍可访问”都只是本次维护快照。
生产借鉴声明继续引用固定对象，不自动跟随上游最新版。

## 2. 方法与证据口径

本次使用四类相互独立的证据：

1. `git ls-remote <repo> HEAD` 确认 Git 远端当前对象；
2. GitHub REST 仓库/commit 元数据确认默认分支、公开/归档状态和 commit
   日期；
3. 固定 commit 的 `raw.githubusercontent.com` 原始许可证载体计算
   SHA-256，并单独读取存在冲突或额外边界的 README/package metadata；
4. W3C/WHATWG 当前规范页确认标准名称、发布日期、文档状态与迁移位置。

GitHub 的 `license.spdx_id` 只作为自动识别旁证，不能替代固定文件内容，也
不能覆盖 README 对资源和商标的单独说明。

## 3. 仓库状态

| 来源 | 默认分支 | 2026-07-24 `HEAD` | 固定 commit | 归档/禁用 | GitHub 自动识别 |
| --- | --- | --- | --- | --- | --- |
| [bemusic/bemuse](https://github.com/bemusic/bemuse) | `master` | `5688164b1904c0cc129b832c91160704b96b3cf3` | 相同 | 否/否 | AGPL-3.0 |
| [ppy/osu](https://github.com/ppy/osu) | `master` | `e643ee36788f31ac2c2d07a3e19cd6fb563f2258` | `b11b274d1cb5c22eabe9dba5df14fa1e4ecc4e6d` | 否/否 | MIT |
| [pixijs/pixijs](https://github.com/pixijs/pixijs) | `dev` | `1d90a20c62433ba68dff78466e06ee372a5a5232` | 相同 | 否/否 | MIT |
| [google-ai-edge/mediapipe](https://github.com/google-ai-edge/mediapipe) | `master` | `0ad5a71bcdff3d756dc5b07f93765aaeb4152538` | 相同 | 否/否 | Apache-2.0 |

GitHub 元数据中的最近 push/固定 commit 时间：

| 来源 | 最近 push / 固定 commit 时间（UTC） |
| --- | --- |
| Bemuse | 2026-07-20 12:42:04 / 2026-07-20 12:41:28 |
| osu! | 2026-07-23 15:02:21 / 2026-07-17 12:24:35 |
| PixiJS | 2026-07-19 08:27:58 / 2026-07-13 08:40:32 |
| MediaPipe | 2026-07-17 16:28:14 / 2026-07-17 16:28:11 |

时间只用于定位复核快照，不用于推断维护质量、稳定性或安全性。

## 4. 许可证载体与内容哈希

| 来源 | 固定证据载体 | SHA-256 | 必须保留的事实 |
| --- | --- | --- | --- |
| Bemuse | [`LICENSE`](https://github.com/bemusic/bemuse/blob/5688164b1904c0cc129b832c91160704b96b3cf3/LICENSE) | `06b332e1fa559c005a0fc8099741d88beb63d2433548c23931d2c396ca41aa72` | GNU AGPL Version 3, 19 November 2007 全文 |
| Bemuse | [`README.md`](https://github.com/bemusic/bemuse/blob/5688164b1904c0cc129b832c91160704b96b3cf3/README.md) | `23dc204d5f06b640dde7fe82ffac648c1c09485b6f4a17250f8a311544bc84ac` | 主项目标注 AGPLv3；子项目各有自己的许可 |
| Bemuse | [`bemuse/package.json`](https://github.com/bemusic/bemuse/blob/5688164b1904c0cc129b832c91160704b96b3cf3/bemuse/package.json) | `65a9c6d2af53797cd389ac4ec9838f8409a15e85b658912d63f07c1d0cd7323a` | author 为 Thai Pangsakulyanont；历史 metadata 写 `AGPL-1.0` |
| osu! | [`LICENCE`](https://github.com/ppy/osu/blob/b11b274d1cb5c22eabe9dba5df14fa1e4ecc4e6d/LICENCE) | `2e73c7c4295cc3da18697ac982f64a4ec449e0781e8f4c59318216e13998864a` | MIT；Copyright (c) 2025 ppy Pty Ltd |
| osu! | [`README.md`](https://github.com/ppy/osu/blob/b11b274d1cb5c22eabe9dba5df14fa1e4ecc4e6d/README.md) | `fb95dc87d17380e49a50d26d06e648e5bbb861bbd64da662b19e07a6fce50847` | 代码/framework 为 MIT；品牌受商标法保护；游戏资源另有许可证 |
| PixiJS | [`LICENSE`](https://github.com/pixijs/pixijs/blob/1d90a20c62433ba68dff78466e06ee372a5a5232/LICENSE) | `5ce7447bc57f7349ffc48338782fbcabe613696e00712b20d66bc58e780f9473` | MIT；Copyright (c) 2013-2023 Mathew Groves, Chad Engler |
| MediaPipe | [`LICENSE`](https://github.com/google-ai-edge/mediapipe/blob/0ad5a71bcdff3d756dc5b07f93765aaeb4152538/LICENSE) | `8707eef0533987efc5b155d64761eeb6e20793f50b9bd1a68dad1cf4719d0ed8` | Apache License 2.0，January 2004 |

这些哈希证明本次检查的固定证据内容；它们不是 vendoring receipt，也不表示
仓库复制了任何第三方文件。

### Bemuse 冲突处理

根许可证全文、根 README 和目录级 package metadata 在版本号上不一致。本作
不把 `AGPL-1.0` 擅自改写成 `AGPL-3.0-only` 或 `AGPL-3.0-or-later`，也不据此
判断上游作者意图。实施边界保持：

- 只研究公开时间线、输入与反馈分层等抽象问题；
- 不复制、翻译、改写、链接或打包 Bemuse 源码；
- 不使用 BMS 谱面、音频、图片、视频、名称、品牌或 UI；
- 如果未来要引入任何 Bemuse 文件，必须暂停实施并向上游或法律专业人士确认
  适用许可证，而不是沿用本文件的“独立实现”结论。

### osu! 代码、资源与品牌分层

- `LICENCE` 证明固定代码载体是 MIT；
- README 的 MIT 说明只覆盖代码和 framework；
- `osu!` / `ppy` branding 不在该许可内；
- game resources 由 `ppy/osu-resources` 单独说明。

因此，本作只研究判定时间与视觉表现分层、输入可重放等抽象机制；不复制
C# 源码、framework、ruleset、判定参数、谱面、资源、声音、测试、UI、Logo、
名称、品牌或 trade dress。

## 5. 其他来源的排除边界

- PixiJS 只用于研究 ticker、场景状态、纹理表现与命中测试应分责；本作不引入
  引擎、Renderer/Ticker/EventSystem API、源码、测试、示例、精灵、滤镜或构建
  配置；
- MediaPipe 只用于确认真人姿态识别需要图像/视频输入、模型与推理生命周期；
  本作不引入源码、模型、WASM、landmark 数据、API、demo、相机流程或视觉；
- 四个项目都不是运行依赖；根 `package.json` 无需增加 dependency 或
  devDependency。

## 6. Web 标准状态复核

| 资料 | 2026-07-24 状态 | 本作只使用的校准点 |
| --- | --- | --- |
| [UI Events KeyboardEvent code Values](https://www.w3.org/TR/uievents-code/) | 2025-04-22 W3C Recommendation | `KeyboardEvent.code` 表示物理键位置，不随当前 locale 改变 |
| [Pointer Events Level 3](https://www.w3.org/TR/pointerevents3/) | 2026-06-30 W3C Recommendation | mouse、pen、touch 的统一事件以及 capture/cancel 生命周期 |
| [Page Visibility Level 2](https://www.w3.org/TR/page-visibility-2/) | 2022-06-23 W3C Discontinued Draft；已退役，不应继续用于技术工作 | 只作为历史迁移记录 |
| [HTML Living Standard：Page visibility](https://html.spec.whatwg.org/multipage/interaction.html#page-visibility) | WHATWG Living Standard 的现行 Page visibility 章节 | `visibilityState` / `hidden` / `visibilitychange` 的现行定义 |
| [WCAG 2.2](https://www.w3.org/TR/WCAG22/) | 当前发布版本为 2024-12-12 W3C Recommendation | target size、pointer cancellation、reflow、非颜色信息与状态语义 |

原调研中的 Page Visibility 链接仍可作为历史证据，但正式实现与后续文档应改引
HTML Living Standard 的现行章节。后台恢复后“不追赶丢失 tick”是本项目的规则
选择，不是规范替本作规定的游戏逻辑。

WCAG 2.2 的 Target Size (Minimum) 2.5.8 是 AA，正文最低值为
`24×24 CSS px` 或满足列出的例外；`44×44 CSS px` 属于 Target Size
(Enhanced) 2.5.5 的 AAA 条件。规格冻结的 `≥44×44 CSS px` 是本项目主动采用
的更严格 Gate，不能写成 WCAG 2.2 AA 原文要求，也不等同于完整 WCAG 认证。

## 7. 借鉴与未复制边界

来源复核不改变 171/172 已冻结的借鉴声明：

- 只研究 Bemuse 与 osu! 的时间线/判定分层、PixiJS 的 ticker/场景/交互职责
  分离，并用 MediaPipe 确认摄像头姿态识别的依赖与隐私边界；
- 四姿势词汇、六幕姿势对、30Hz 整数 tick、状态机、持有栈、public view、
  视觉、中文文案和测试均由本仓库独立设计；
- 不复制、翻译、改写、链接或打包上述项目的源码、算法表达、判定参数、谱面、
  模型、WASM、资源、品牌、界面、素材或测试；
- 若未来实际复制代码或素材，必须停止“独立实现”结论，重新审计许可证、版权
  通知、修改说明、资源许可和商标边界。

## 8. 对后续实施的影响

- 四个固定 commit 继续有效；osu! 的 HEAD 变化不触发自动换版；
- `shadow-duet` 仍保持 A 级、经典脚本、`file://`、零第三方运行依赖；
- 现有纯逻辑与测试不受本次文档维护影响；
- 视觉提案仍等待用户确认；本文件不授权创建 `index.html`、`app.js` 或
  `styles.css`；
- README/ATTRIBUTION 阶段必须写固定 commit、证据载体、版权主体、实际借鉴和
  未复制范围，且分别说明 osu! 的代码、资源与品牌边界；
- 后续复核若发现 HEAD、归档状态、许可证载体或标准状态变化，新增维护记录，
  不覆写本次快照。
