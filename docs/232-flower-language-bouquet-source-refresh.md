# “把花语，系成一束”固定来源维护复核

- 复核日期：2026-07-24
- 对应调研：[185-flower-language-bouquet-research.md](./185-flower-language-bouquet-research.md)
- 对应规格：[186-flower-language-bouquet-spec.md](./186-flower-language-bouquet-spec.md)
- 对应视觉提案：[187-flower-language-bouquet-design-proposal.md](./187-flower-language-bouquet-design-proposal.md)
- 对应计划：[188-flower-language-bouquet-plan.md](./188-flower-language-bouquet-plan.md)
- 范围：来源维护；不修改纯逻辑、不创建生产 UI、不引入依赖、不改变视觉确认 Gate

## 1. 复核结论

截至 2026-07-24，六个机制参考项目和五个标准仓库均仍公开、未归档、未
禁用；11 个固定 commit 与对应许可证载体全部仍可访问。

其中八个固定 commit 仍等于当前 `HEAD`。Fabric.js、SVG WG 与 CSSWG 的
`HEAD` 已前进，但三个当前许可证载体与固定载体的 SHA-256 分别仍相同。固定
来源无需追版，原调研中的固定对象和零复制边界继续有效。

本次复核不改变以下产品结论：

- 六个项目只作机制研究，不是 dependency、devDependency、vendor 或 runtime
  script；
- 状态机、120 种有序三花排列、scene slot、SVG primitive、组合句与导出逻辑
  由本仓库独立实现；
- 花语是私人表达，不是植物学事实、统一文化结论或权威花语数据库；
- 十张 ImageGen 概念图继续只用于 docs 设计评审，不进入运行时；
- 生产 UI 仍等待用户明确接受视觉提案，本文件不授权越过该 Gate。

## 2. 方法与证据口径

本次使用五类证据：

1. `git ls-remote <repo> HEAD` 确认 Git 远端对象；
2. GitHub REST 仓库元数据确认默认分支、归档/禁用状态和自动识别的 SPDX；
3. 固定 commit 的原始许可证载体确认文件可达，并计算 SHA-256；
4. 对三个 HEAD 已漂移的仓库，额外计算当前许可证载体 SHA-256，与固定载体
   逐字节比较；
5. WHATWG/W3C 当前发布页确认规范名称、发布日期、文档状态和适用边界。

GitHub 的 `license.spdx_id` 只作为旁证，不能替代固定文件内容。SVG.js 与
FileSaver.js 当前返回 `NOASSERTION`，但固定载体分别包含 MIT 形式许可文本和
MIT 全文；W3C/WHATWG 标准仓库也必须以其固定 LICENSE 文件的具体声明为准。

## 3. 仓库状态

| 来源 | 默认分支 | 2026-07-24 `HEAD` | 固定 commit | 归档/禁用 | GitHub 自动识别 |
| --- | --- | --- | --- | --- | --- |
| [599316527/emoji-bouquet-generator](https://github.com/599316527/emoji-bouquet-generator) | `master` | `8db7a51b4b4bfc4b9a0b05df1cf5d4dda4d923c9` | 相同 | 否/否 | MIT |
| [Platane/Procedural-Flower](https://github.com/Platane/Procedural-Flower) | `master` | `d857fbe846d5899cd5cf8ea6a47d37e6030f53c0` | 相同 | 否/否 | MIT |
| [svgdotjs/svg.js](https://github.com/svgdotjs/svg.js) | `master` | `6f58d4b2aa10e2d7ed6e38ff84caeb04b210af4e` | 相同 | 否/否 | `NOASSERTION` |
| [fabricjs/fabric.js](https://github.com/fabricjs/fabric.js) | `master` | `e009409980c199ee2c1bcbc42ef1a3689105f1db` | `723838fcbb9feaa87c8840082640de2ed82383da` | 否/否 | MIT |
| [d3/d3-hierarchy](https://github.com/d3/d3-hierarchy) | `main` | `c4ae7066d5a52e8aeaab24b3f7113e25c38183f2` | 相同 | 否/否 | ISC |
| [eligrey/FileSaver.js](https://github.com/eligrey/FileSaver.js) | `master` | `cea522bc41bfadc364837293d0c4dc585a65ac46` | 相同 | 否/否 | `NOASSERTION` |
| [whatwg/html](https://github.com/whatwg/html) | `main` | `24c5e48bf66ea61bc199ec6338c81258275ba9c6` | 相同 | 否/否 | `NOASSERTION` |
| [w3c/FileAPI](https://github.com/w3c/FileAPI) | `main` | `cd1d1da9a5375af0622af4b36e76c6e6bd9d130b` | 相同 | 否/否 | `NOASSERTION` |
| [w3c/svgwg](https://github.com/w3c/svgwg) | `main` | `4bdcf1565050caa94464a016e198a3abaa20d56f` | `8b521081b0c65490c9b80633be68871f7bf441fa` | 否/否 | `NOASSERTION` |
| [w3c/wcag](https://github.com/w3c/wcag) | `main` | `07123b871c103268375880980fd715b2b26b2ff0` | 相同 | 否/否 | `NOASSERTION` |
| [w3c/csswg-drafts](https://github.com/w3c/csswg-drafts) | `main` | `5849ec370c7edc65dcade47d25e113d8798d33b8` | `c7573530343759ace8e46438a1fa2c44515b5554` | 否/否 | `NOASSERTION` |

仓库 HEAD 是维护快照，不代表本项目改用最新版。固定 commit、许可证载体和
研究范围只有经过新的显式审计才可更新。

## 4. 固定许可证载体与哈希

| 来源 | 固定许可证载体 | SHA-256 | 必须保留的事实 |
| --- | --- | --- | --- |
| Emoji bouquet generator | [`LICENSE`](https://github.com/599316527/emoji-bouquet-generator/blob/8db7a51b4b4bfc4b9a0b05df1cf5d4dda4d923c9/LICENSE) | `55684ceab9d8a0488e2a5290af7d7932b7299f8f88c4ae78019154de7b9bf062` | MIT；Copyright (c) 2016 Kyle He |
| Procedural-Flower | [`LICENSE`](https://github.com/Platane/Procedural-Flower/blob/d857fbe846d5899cd5cf8ea6a47d37e6030f53c0/LICENSE) | `72979b450c3b3aaa54fb434254841d1ea8462a4bbc427ad2ae9f312be718dad6` | MIT 形式；Copyright (c) 2012 Arthur Brongniart |
| SVG.js | [`LICENSE.txt`](https://github.com/svgdotjs/svg.js/blob/6f58d4b2aa10e2d7ed6e38ff84caeb04b210af4e/LICENSE.txt) | `455113977c98c54dad8598e092b99aad6be0ed8c5c4a0722154acf4b21df4730` | MIT 形式；Copyright (c) 2012–2018 Wout Fierens |
| Fabric.js | [`LICENSE`](https://github.com/fabricjs/fabric.js/blob/723838fcbb9feaa87c8840082640de2ed82383da/LICENSE) | `eda412692b7398293a049ecf913319da26eb8f7fe27f10709821dd187b517e0b` | MIT；2008–2015 Printio（Juriy Zaytsev、Maxim Chernyak）；2016–present Andrea Bogazzi、Shachar Nen 与 contributors |
| d3-hierarchy | [`LICENSE`](https://github.com/d3/d3-hierarchy/blob/c4ae7066d5a52e8aeaab24b3f7113e25c38183f2/LICENSE) | `e008c5e25a6be382593089c29bfabbc553c6378eee02895aec46ce396cc404ee` | ISC；Copyright 2010–2021 Mike Bostock |
| FileSaver.js | [`LICENSE.md`](https://github.com/eligrey/FileSaver.js/blob/cea522bc41bfadc364837293d0c4dc585a65ac46/LICENSE.md) | `2d1d7a93b46e4274355ac2904428707c4ee47ee8c6029fa394ebf405648d3f63` | MIT；Copyright © 2016 Eli Grey |
| WHATWG HTML | [`LICENSE`](https://github.com/whatwg/html/blob/24c5e48bf66ea61bc199ec6338c81258275ba9c6/LICENSE) | `85dc6f5ccb57a6fe8c33d158f9fc8fc7ee5655a5d3db2cdd131c6a3d0f48a864` | 文档 CC BY 4.0；纳入源码的代码部分 BSD 3-Clause；Copyright © WHATWG（Apple、Google、Mozilla、Microsoft） |
| File API | [`LICENSE.md`](https://github.com/w3c/FileAPI/blob/cd1d1da9a5375af0622af4b36e76c6e6bd9d130b/LICENSE.md) | `6eabf929228fcdce39d1aff9a837175928c4a19eafc4517b72d5781db9ece661` | contributors 授权；W3C Software and Document License |
| SVG WG | [`LICENSE.md`](https://github.com/w3c/svgwg/blob/8b521081b0c65490c9b80633be68871f7bf441fa/LICENSE.md) | `6bb0235e84e19f807f271b54459eb494742a421e1c5c36a1de702c151ecb15f3` | contributors 授权；W3C Document License |
| WCAG | [`LICENSE.md`](https://github.com/w3c/wcag/blob/07123b871c103268375880980fd715b2b26b2ff0/LICENSE.md) | `7a3ad7d36b8855bc301276279769da4aff648ea5d7b92f3f023c0823ee948764` | contributors 授权；W3C Document License |
| CSSWG Drafts | [`LICENSE.md`](https://github.com/w3c/csswg-drafts/blob/c7573530343759ace8e46438a1fa2c44515b5554/LICENSE.md) | `232da9c6c2b9f7e19e5d85cc7cf43760d80b7c4174406ac6404fa2c1b51d531b` | contributors 授权；W3C Software and Document License |

这些哈希只证明本次读取的固定证据内容，不是第三方文件已经进入运行时的
vendoring receipt。

三个已漂移仓库的当前许可证载体复算结果：

| 来源 | 当前许可证 SHA-256 | 与固定载体 |
| --- | --- | --- |
| Fabric.js | `eda412692b7398293a049ecf913319da26eb8f7fe27f10709821dd187b517e0b` | 相同 |
| SVG WG | `6bb0235e84e19f807f271b54459eb494742a421e1c5c36a1de702c151ecb15f3` | 相同 |
| CSSWG Drafts | `232da9c6c2b9f7e19e5d85cc7cf43760d80b7c4174406ac6404fa2c1b51d531b` | 相同 |

## 5. 权利与借鉴边界

### 5.1 六个机制参考项目

- Emoji bouquet generator：只研究有限元素与固定位置组成可预期花束；
- Procedural-Flower：只研究局部部件与有限动画生命周期；
- SVG.js：只研究 group、局部坐标与同一 scene 的双投影职责；
- Fabric.js：只研究权威配方、scene model、页面渲染和导出副作用分层；
- d3-hierarchy：只用于比较自动 packing 方案，正式方案明确不用；
- FileSaver.js：只用于确认保存需要用户触发，以及 Safari/iOS 可能退化为预览
  或新页面。

不复制或引入上述项目的源码、API、类名、算法、参数、布局表、随机系统、
serializer、UA sniff、XHR/CORS、fallback、测试、示例、素材、图片、品牌或
构建产物。尤其不能因使用 `<a download>` 就向用户承诺文件已经成功落盘。

### 5.2 标准文档

标准只用于校准浏览器合同，不复制其正文、IDL、算法、示例、图片或测试。
WHATWG HTML 的文档/代码双许可必须分别记录；W3C Document License 也不能
被简写成普通 MIT 软件许可。

### 5.3 花语与生成资产

- 六段默认 meaning、组合句、标题与留言均为本仓库私人表达；
- 不导入商业花店图、商品构图、贺卡文案、社交帖子或花语数据库；
- 不宣称某种花在所有地区、文化和语境中具有统一含义；
- 十张 ImageGen PNG 继续保留在文档生成台账中，不复制到 experience；
- 若任何生成图未来转为 runtime asset，必须新增运行时文件 SHA、处理链、
  失败降级和权利审计，并同步更新 README/ATTRIBUTION。

## 6. 当前平台规范状态

| 资料 | 2026-07-24 状态 | 本作只使用的校准点 |
| --- | --- | --- |
| [WHATWG HTML：Downloading resources](https://html.spec.whatwg.org/multipage/links.html#downloading-resources) | Living Standard；页面显示 2026-07-20 更新 | `download` 表示作者下载意图，属性值只是建议文件名；UA 仍参与最终处理 |
| [File API](https://www.w3.org/TR/FileAPI/) | 2026-06-04 W3C Working Draft；work in progress | `Blob`、对象 URL 创建与撤销的生命周期 |
| [SVG 2](https://www.w3.org/TR/SVG2/) | 2018-10-04 W3C Candidate Recommendation；仍是工作进展 | standalone SVG、viewBox、基本图形、分组与文本 |
| [WCAG 2.2](https://www.w3.org/TR/WCAG22/) | 2024-12-12 W3C Recommendation | 键盘、非文本等价、状态消息、拖动替代、焦点与 reflow |
| [Media Queries Level 5](https://www.w3.org/TR/mediaqueries-5/) | 2026-02-19 W3C Working Draft；work in progress | `prefers-reduced-motion` |
| [CSS Color Adjustment Level 1](https://www.w3.org/TR/css-color-adjust-1/) | 2025-12-16 W3C Candidate Recommendation Snapshot | `forced-colors` 与 `forced-color-adjust` |

规范状态不是浏览器兼容性保证，也不代表本项目取得合规认证。WCAG 2.2
Target Size (Minimum) 2.5.8 的 AA 正文最低值是 `24×24 CSS px` 或满足列出的
例外；本项目冻结的所有 button/link `≥56×56 CSS px` 和 3px focus outline 是
更严格的项目 Gate，不能写成 WCAG 原文要求。

## 7. 对后续实施的影响

- 11 个固定 commit 与固定许可证载体继续有效，不自动追随上游 HEAD；
- 根 `package.json` 不增加任何依赖；
- 现有 `config.js`、`logic.js`、`logic.test.js` 不受本次维护影响；
- 视觉提案仍是“待用户确认，未获准进入生产 UI”；
- 本文件不授权创建或修改 `index.html`、`app.js`、`styles.css`、renderer、
  export controller、runtime asset、作品 README/ATTRIBUTION、favicon、
  catalog、分类入口或 idea backlog；
- 用户未来明确接受视觉方向后，README 与 `assets/ATTRIBUTION.md` 必须各自
  完整列出 11 个固定来源、许可证载体、权利主体、实际借鉴与未复制范围，
  不能只链接回本文件；
- 后续若发现 HEAD、归档状态、许可证载体或标准状态变化，应新增维护记录，
  不覆写本次快照。
