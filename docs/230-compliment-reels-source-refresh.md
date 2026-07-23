# “每一格，都是喜欢你的理由”固定来源维护复核

- 复核日期：2026-07-24
- 对应调研：[178-compliment-reels-research.md](./178-compliment-reels-research.md)
- 对应文案审计：[179-compliment-reels-copy-audit.md](./179-compliment-reels-copy-audit.md)
- 对应规格：[180-compliment-reels-spec.md](./180-compliment-reels-spec.md)
- 对应视觉提案：[198-compliment-reels-design-proposal.md](./198-compliment-reels-design-proposal.md)
- 范围：来源维护；不创建生产目录、不引入依赖、不改变视觉确认 Gate

## 1. 复核结论

截至 2026-07-24，四个已登记开源来源均仍公开、未归档、未禁用，固定 commit
仍分别等于仓库当前 `HEAD`。许可证载体、版权主体和借鉴边界与 178/180 一致：

- Slot Machine Generator：MIT，独立 reel 与结果预选只作职责分层参考；
- seedrandom：仓库没有独立 LICENSE，MIT 全文仍位于 README；
- Tween.js：LICENSE 同时保留 Tween.js MIT 版权行和 Robert Penner easing
  版权行；
- canvas-confetti：ISC，只研究动画清理与 reduced-motion 原则。

“固定 commit 仍是 HEAD”只是本次维护快照，不把借鉴声明改成跟随最新版本。后续
HEAD 变化时，生产声明仍引用本文件记录的固定 commit，除非重新审计并明确更新。

## 2. 方法与证据口径

本次使用四类相互独立的证据：

1. `git ls-remote <repo> HEAD` 确认 Git 远端当前对象；
2. GitHub REST 仓库/commit 元数据确认默认分支、公开/归档状态和 commit 日期；
3. 固定 commit 的 `raw.githubusercontent.com` 原始许可证载体计算 SHA-256；
4. W3C 当前技术报告页确认标准名称、发布日期与文档状态。

GitHub 的 `license.spdx_id` 只作为自动识别旁证，不能替代固定文件内容。尤其：

- seedrandom 返回 `none`，因为 MIT 全文位于 README 而非独立 LICENSE；
- Tween.js 返回 `NOASSERTION`，但固定 LICENSE 明确包含 MIT 授权和两项版权行。

## 3. 仓库状态

| 来源 | 默认分支 | 2026-07-24 `HEAD` | 固定 commit | 归档/禁用 | GitHub 自动识别 |
| --- | --- | --- | --- | --- | --- |
| [nuxy/slot-machine-gen](https://github.com/nuxy/slot-machine-gen) | `master` | `56c9017e839583dcb8fcb5cc88b08b30ed63f66a` | 相同 | 否/否 | MIT |
| [davidbau/seedrandom](https://github.com/davidbau/seedrandom) | `released` | `4460ad325a0a15273a211e509f03ae0beb99511a` | 相同 | 否/否 | 无独立识别 |
| [tweenjs/tween.js](https://github.com/tweenjs/tween.js) | `main` | `20079e65f77bb2b8e52cc9d7dbed044b86e537d3` | 相同 | 否/否 | `NOASSERTION` |
| [catdad/canvas-confetti](https://github.com/catdad/canvas-confetti) | `master` | `20eebad51dde793070c373d594099a7ed8d96e22` | 相同 | 否/否 | ISC |

GitHub 元数据中的最近 push/固定 commit 时间：

| 来源 | 最近 push / 固定 commit 时间（UTC） |
| --- | --- |
| slot-machine-gen | 2026-07-02 18:36:41 / 2026-07-02 18:36:03 |
| seedrandom | 2024-04-25 08:17:08 / 2019-09-17 10:37:21 |
| Tween.js | 2025-01-11 02:00:20 / 2025-01-11 01:54:20 |
| canvas-confetti | 2025-10-25 05:17:21 / 2025-10-25 05:17:19 |

时间只用于定位复核快照，不用于推断维护质量、稳定性或安全性。

## 4. 许可证载体与内容哈希

| 来源 | 固定许可证载体 | SHA-256 | 必须保留的事实 |
| --- | --- | --- | --- |
| slot-machine-gen | [`LICENSE`](https://github.com/nuxy/slot-machine-gen/blob/56c9017e839583dcb8fcb5cc88b08b30ed63f66a/LICENSE) | `7987bf8e3a61b7053c90564efbe4f99b2d2460b6d89eb930509fd96b67bc5e27` | MIT；Copyright (c) 2020-2025 Marc S. Brooks (https://mbrooks.info) |
| seedrandom | [`README.md`](https://github.com/davidbau/seedrandom/blob/4460ad325a0a15273a211e509f03ae0beb99511a/README.md) | `4f42a296eee4f5ae3a8dadba94c2b0b5fb57662b96b8749f4d5288d4629b6240` | `LICENSE (MIT)`；Copyright 2019 David Bau.；无独立 LICENSE |
| Tween.js | [`LICENSE`](https://github.com/tweenjs/tween.js/blob/20079e65f77bb2b8e52cc9d7dbed044b86e537d3/LICENSE) | `c95fecd88f2709bfc34e4d1f1ccc36d17048990e6ba26c283cfecdef0432936b` | MIT；Copyright (c) 2010-2012 Tween.js authors.；Easing equations Copyright (c) 2001 Robert Penner |
| canvas-confetti | [`LICENSE`](https://github.com/catdad/canvas-confetti/blob/20eebad51dde793070c373d594099a7ed8d96e22/LICENSE) | `fd44477c30a832a1dee9ef0b6cfb34677fbe5ef58c0cf655d27c646f11bb2f7a` | ISC；Copyright (c) 2020, Kiril Vatev |

这些哈希证明本次检查的许可证载体内容；它们不是代码 vendoring receipt，也不表示
仓库已复制任何第三方文件。

## 5. 排除来源复核

[josex2r/jQuery-SlotMachine](https://github.com/josex2r/jQuery-SlotMachine)
仍保持排除：

- 当前 `HEAD` 与固定对象均为
  `bf436495aaf84cea5808734371649850e9704325`；
- 根 `LICENSE` 是 GPL-3.0 文本，SHA-256 为
  `fce02ebb691c768cde194afbe91b8025fd7b1f49031f33996deb246a5926f0e2`；
- `package.json` 明示 `GPL-3.0-only`，SHA-256 为
  `70efbb38b61df4fd42a42ebd773e43ccb1b5fd51d2331eece54c402bfe7d8c77`；
- README 的 License 段仍声称 MIT，README SHA-256 为
  `1d6eb21cb3125030533ff6b89caf2c450869620531e69e2920b4a2e0655ef484`。

根 LICENSE/package metadata 与 README 冲突，继续按更明确的 GPL-3.0-only
元数据处理；本项目不复制、链接、翻译、改写或依赖其代码、API、CSS、素材和
trade dress。

无仓库级许可证的 Gist、来源不明图片/音效、商业赌场机台、品牌 Logo、BAR、
数字 7、铃铛、樱桃、金币和特色 trade dress 也继续排除。

## 6. W3C 标准状态复核

| 资料 | 2026-07-24 状态 | 本作只使用的校准点 |
| --- | --- | --- |
| [Web Cryptography Level 2](https://www.w3.org/TR/webcrypto-2/) | 2025-04-22 First Public Working Draft；工作草案，不代表 W3C 背书 | `getRandomValues` 同步填充整数 typed array 的接口边界 |
| [Web Animations Level 1](https://www.w3.org/TR/web-animations-1/) | 2023-06-05 Working Draft；仍是 work in progress | 动画完成、取消、等待和规则/表现分层 |
| [WAI-ARIA 1.2](https://www.w3.org/TR/wai-aria-1.2/) | 2023-06-06 W3C Recommendation | 已存在 `status` live region 的语义 |
| [WCAG 2.2](https://www.w3.org/TR/WCAG22/) | 当前发布版本为 2024-12-12 W3C Recommendation | 1.4.10 reflow、2.3.3 interaction motion、2.5.8 target size、4.1.3 status messages |

WCAG Understanding 页面是解释性资料，不是规范正文。当前
[Target Size (Minimum)](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html)
明确的 AA 最低值是 `24×24 CSS px` 或满足例外；本项目冻结的主把手
`≥48×48 CSS px` 是主动提高的项目 Gate，不能写成 WCAG AA 的原文要求。

同理：

- 320 CSS px 下避免二维滚动来自 1.4.10 reflow；
- interaction motion 可禁用是 2.3.3 的 AAA 条件，本项目选择在
  `prefers-reduced-motion` 下直接落定，但不据此声称完整 WCAG 认证；
- 状态消息使用已存在 live region，不表示页面其他无障碍要求已自动满足。

## 7. 借鉴与未复制边界

来源复核不改变 178/180 已冻结的借鉴声明：

- 只研究独立 reel、结果预选、局部可重现随机、动画生命周期、规则/表现分层和
  reduced-motion 等抽象机制；
- 六抽协调计划、拒绝采样消费合同、状态机、token、public view、18 条内容、
  216 句审稿、视觉与测试均由本仓库独立设计；
- 不复制源码、API、随机算法、缓动公式、默认参数、测试、DOM、CSS、文案、
  图片、音频、字体、Logo、品牌或 trade dress；
- 四个项目和 W3C 文档都不是运行依赖；
- 若未来实际复制代码或素材，必须停止“独立实现”结论，重新审计许可证、版权
  通知、修改说明和分发义务。

## 8. 对后续实施的影响

- 固定来源无需换版，规格中的四个 commit 继续有效；
- 根 `package.json` 不增加 dependency/devDependency；
- `compliment-reels` 仍保持 A 级、经典脚本、`file://`、零第三方运行依赖；
- 视觉提案仍等待用户确认；本文件不授权创建 `index.html`、`app.js`、
  `styles.css` 或实施计划；
- README/ATTRIBUTION 阶段必须同时写固定 commit、许可证载体、版权主体、
  实际借鉴和未复制范围，不能只链接本维护文档；
- 后续复核若发现 HEAD、归档状态、许可证载体或标准状态变化，新增维护记录，
  不覆写本次快照。
