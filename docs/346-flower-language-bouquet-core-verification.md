# Flower Language Bouquet 非视觉核心复验证明

- 复验日期：2026-07-25
- 基线：`1ce7c6ad10e6cfc56e5c5ed4ae64d5f9f1fb3e72`
- 分支：`codex/exp-flower-language-bouquet-core-audit`
- worktree：`{worktree-base}/flower-language-bouquet-core-audit`
- 范围：既有配置、纯逻辑、导出数据合同、来源/资产与重复机制审计；不创建生产 UI

## 1. 结论

`flower-language-bouquet` 的非视觉核心在本次复验开始前已经完整存在于 main，
并与 [`188-flower-language-bouquet-plan.md`](./188-flower-language-bouquet-plan.md)
子任务 A 的合同一致。重新实现配置、状态机、120 排列、scene 或导出模型会覆盖
已经通过独立回归的成果。

本轮没有发现可复现的核心缺口：

- 六段默认花语、标题、留言与组合句均保持本仓库私人表达边界；
- hostile snapshot、五动作 reducer、revision headroom 与 120 种有序排列完整；
- public view 在四阶段按合同延迟公开最终私人字段；
- complete 导出模型只包含三枝已选花、最终标题、组合句、留言和署名，不含
  recipient、未选 catalog、历史、时间或浏览器 controller；
- 11 个固定来源、许可证载体、权利主体、证据哈希与零复制声明完整；
- 10 张 ImageGen PNG 的尺寸、SHA-256、引用链和 docs-only 边界一致；
- 定向测试、全仓测试、仓库验收与差异检查全部通过。

本轮没有修改 `config.js`、`logic.js`、测试、借鉴声明、共享运行时、根依赖、
launcher 或 catalog，也没有新增 bug/learn。唯一新增文件是本复验证明。

## 2. 历史实现证据

| Commit | 职责 |
| --- | --- |
| `2735380` | 定向调研、机制比较与零复制边界 |
| `d4cef0c` | 可执行规格、canonical hash、隐私与导出合同 |
| `f4cbd22` | v1/v2 视觉概念、生成台账与权利边界 |
| `26c25d6` | 分步实施计划与独立提交边界 |
| `0ad2d19` | `config.js`、`logic.js` 与纯逻辑测试 |
| `884612c` | 11 个固定来源的维护复核 |
| `482abcf` | 体验目录借鉴声明与归因回归测试 |

`0ad2d19` 已新增并冻结：

```text
experiences/surprises/flower-language-bouquet/config.js
experiences/surprises/flower-language-bouquet/logic.js
experiences/surprises/flower-language-bouquet/logic.test.js
```

后续 `482abcf` 增加
`experiences/surprises/flower-language-bouquet/assets/ATTRIBUTION.md`，同时增加
固定来源、许可证和 docs-only 生成资产的回归断言。当前项目测试共有 39 个顶层
用例。

## 3. 核心与原创数据合同

### 3.1 配置和私人表达

- 固定 ID 为 `rose / tulip / daisy / sunflower / lisianthus / gypsophila`；
- 六段 meaning、finalTitle、finalNote 与固定组合句均在规格和借鉴声明中明确
  标为私人表达，不声称是植物学事实、统一文化标准或权威花语词典；
- 全仓精确文案搜索只命中本项目的调研、规格、概念台账、配置和测试，没有命中
  其他已安装作品或第三方 vendored 内容；
- 配置只接受称呼、署名、标题、留言、花名与 meaning 的纯文本，不能注入 path、
  markup、href、style、模板或函数；
- 任一非法字段令整份配置回退，避免默认值与调用方私人字段混合。

### 3.2 状态、排列与 scene

- 权威阶段固定为 `intro / arranging / preview / complete`；
- 动作固定为 `START / ADD_FLOWER / UNDO_LAST / TIE_BOUQUET / RESTART`；
- 六选三按点击顺序产生 `6P3 = 120` 个唯一排列，全部可以到达 preview 和
  complete；
- 第一、二、三枝分别映射主花、陪花、点缀；同一 `selectedIds` 同时派生角色、
  组合句和确定性 scene，不维护第二份选择状态；
- revision 与撤回/重开额外 headroom 保留最晚完整前进路径，不会越过
  `Number.MAX_SAFE_INTEGER`；
- 配置、state、action 与数组输入拒绝 accessor、Symbol、extra key、稀疏数组、
  数组子类、异常原型和抛错 Proxy；输出断开调用方引用并递归冻结；
- 模块加载不访问 DOM、SVG、Blob、URL、XMLSerializer、时间、随机、timer、
  storage、网络、权限或浏览器环境。

### 3.3 Public view 与导出数据

四阶段公开边界复核结果：

| 阶段 | 可见数据 | 仍遮蔽的数据 |
| --- | --- | --- |
| intro | 固定规则与开始能力 | 六花配置和全部最终私人字段 |
| arranging | 六花 name/meaning、已选顺序、progressive scene | recipient、sender、finalTitle、finalNote |
| preview | 六花题面、三枝角色、组合句和完整 scene | 全部最终私人字段 |
| complete | 三枝结果、组合句与最终私人字段 | 未选 catalog |

以默认 `rose / sunflower / gypsophila` 完成路径独立派生 export model，得到：

```text
filename: flower-language-bouquet.svg
mimeType: image/svg+xml;charset=utf-8
viewBox: 0 0 1000 1800
scene stems: rose / sunflower / gypsophila
text blocks: title 1 / composition 6 / note 2 / sender 1
```

模型精确只有
`version / filename / mimeType / width / height / viewBox / documentTitle /
documentDescription / scene / textLines`。序列化检查确认其中没有 recipient 或
未选的 `tulip / daisy / lisianthus`，也没有 revision、action log、URL、
timestamp、controller 或保存历史。

这只证明纯数据合同。当前没有生产 renderer/controller，因此没有生成真实 Blob
或 SVG 文件，也没有验证 XML namespace、元素/属性白名单、256 KiB 上限、对象
URL 生命周期、保存链接、Safari/iOS 预览或真正落盘。

## 4. 与 installed 机制去重

S13 仍只出现在 `docs/40-idea-backlog.md`，没有 `experiences/catalog.json` 条目、
生产入口或分类 README 登记。相邻 installed 作品没有重复本作的完整机制：

| 相邻作品 | 已有机制 | 本作保持的独立边界 |
| --- | --- | --- |
| `future-cookie-notes` | 打开三枚固定语义 future notes 后合成邀请 | 同池六选三；点击顺序决定角色、构图和文案顺序 |
| `future-ticket` | 三个固定步骤分别选择一次并打孔揭晓 | 没有三个类别；三次都从同一花池选择且不能重复 |
| `seven-day-garden` | 双人有限资源、精确覆盖和可解性约束 | 单人无库存、无唯一解、无失败；120 个排列全部成功 |
| `cloud-recipe` | 双人调区间接正确雨滴，错误会失败 | “配方”只表示自由组合，不是答案判定 |
| `instant-photo` | 摇动显影本地照片 | 本作不依赖照片；只在 complete 派生显式 SVG 数据合同 |

独立增量仍是：**同一公开花池连续选三种不同花，选择顺序同时塑造
主花/陪花/点缀 scene 和三段私人表达，preview 可撤回，主动系束后才开放最终
留言与受控 SVG 导出模型。**

## 5. 来源、许可证与借鉴声明

### 5.1 2026-07-25 远端快照

通过 GitHub 仓库元数据与默认分支 commit API 复核，11 个仓库均未归档、未
禁用：

| 来源 | 当前 HEAD | 固定 commit |
| --- | --- | --- |
| Emoji bouquet generator | `8db7a51b4b4bfc4b9a0b05df1cf5d4dda4d923c9` | 相同 |
| Procedural-Flower | `d857fbe846d5899cd5cf8ea6a47d37e6030f53c0` | 相同 |
| SVG.js | `6f58d4b2aa10e2d7ed6e38ff84caeb04b210af4e` | 相同 |
| Fabric.js | `e009409980c199ee2c1bcbc42ef1a3689105f1db` | `723838fcbb9feaa87c8840082640de2ed82383da` |
| d3-hierarchy | `c4ae7066d5a52e8aeaab24b3f7113e25c38183f2` | 相同 |
| FileSaver.js | `cea522bc41bfadc364837293d0c4dc585a65ac46` | 相同 |
| WHATWG HTML | `24c5e48bf66ea61bc199ec6338c81258275ba9c6` | 相同 |
| W3C File API | `cd1d1da9a5375af0622af4b36e76c6e6bd9d130b` | 相同 |
| W3C SVG WG | `4bdcf1565050caa94464a016e198a3abaa20d56f` | `8b521081b0c65490c9b80633be68871f7bf441fa` |
| W3C WCAG | `07123b871c103268375880980fd715b2b26b2ff0` | 相同 |
| CSSWG Drafts | `5849ec370c7edc65dcade47d25e113d8798d33b8` | `c7573530343759ace8e46438a1fa2c44515b5554` |

结果与
[`232-flower-language-bouquet-source-refresh.md`](./232-flower-language-bouquet-source-refresh.md)
一致：8 个固定对象仍是 HEAD；Fabric.js、SVG WG 与 CSSWG 保持已记录的 HEAD
漂移。固定对象不自动追随上游。

### 5.2 固定许可证载体

重新下载 11 个固定 commit 的许可证载体后，SHA-256 全部与
`assets/ATTRIBUTION.md` 一致。三个 HEAD 已漂移仓库的当前许可证载体也重新
计算，分别仍与固定载体逐字节相同：

| 来源 | 当前许可证 SHA-256 |
| --- | --- |
| Fabric.js | `eda412692b7398293a049ecf913319da26eb8f7fe27f10709821dd187b517e0b` |
| SVG WG | `6bb0235e84e19f807f271b54459eb494742a421e1c5c36a1de702c151ecb15f3` |
| CSSWG Drafts | `232da9c6c2b9f7e19e5d85cc7cf43760d80b7c4174406ac6404fa2c1b51d531b` |

借鉴声明继续明确：六个项目只提供有限元素构图、局部部件、scene/renderer
分层、packing 方案排除和浏览器保存限制等研究抽象；五个标准只校准平台合同。
本仓库没有安装、链接、vendor 或复制它们的源码、API、算法、参数、布局表、
serializer、兼容代码、测试、示例、图片或构建产物。

## 6. docs-only 图片与隐私

`docs/assets/flower-language-bouquet/` 精确包含 10 张 PNG：

- 六张桌面图均为 `1586×992`；
- `mobile-preview-concept.png`、`mobile-preview-v2-concept.png` 与
  `mobile-export-error-v2-concept.png` 均为 `852×1846`；
- `mobile-preview-v2-draft.png` 为 `852×1847`；
- 10 个实际 SHA-256 均与 `GENERATION.md`、视觉提案和体验目录借鉴声明一致。

PNG chunk 审计显示每张图都含 OpenAI 生成流程的 `caBX` C2PA/JUMBF 来源凭证，
与生成台账的来源说明一致；没有 `tEXt / zTXt / iTXt / eXIf` chunk，字符串扫描
未发现用户名、本机路径或 prompt。C2PA 凭证中可识别 `gpt-image 2.0`、
`OpenAI Media Service API` 和 trained algorithmic media 来源；这些是来源信号，
不是权利或准确性证明。

体验目录只有 `config.js / logic.js / logic.test.js / assets/ATTRIBUTION.md`。
除借鉴声明中的台账文字外，没有生产代码引用 PNG、docs 图片路径、fetch、
preload 或 CSS background；这些图不会进入当前纯逻辑数据、public view 或
export model。

## 7. 实测命令与结果

### 7.1 定向核心

```sh
node --check experiences/surprises/flower-language-bouquet/logic.js
node --check experiences/surprises/flower-language-bouquet/config.js
node --test experiences/surprises/flower-language-bouquet/logic.test.js
git diff --check
```

结果：39/39 通过；语法与差异检查通过。覆盖 browser global/CommonJS、零宿主
副作用、canonical hash、hostile config/state/action、Unicode、headroom、
120 排列、scene、文本换行与最大 22 行、四阶段 privacy sentinel、导出模型和
借鉴声明。

### 7.2 全仓

新 worktree 初始没有 `node_modules`。按现有 lockfile 执行 `npm ci`，安装 55
个已声明 package，审计 56 个 package，0 vulnerability；没有修改
`package.json` 或 `package-lock.json`。

```sh
npm test
```

结果：

```text
tests 2269
pass 2269
fail 0
cancelled 0
skipped 0
todo 0
```

```sh
npm run verify
```

结果：

```text
仓库验收通过：58 个作品入口（50 个 A 级直开、8 个非 A 启动器）、
1 个能力声明、资源与借鉴声明完整。
```

58 个入口不包含 `flower-language-bouquet`，这与本轮不登记 installed 的边界
一致。

## 8. bug 与 learn

本轮没有发现新的可复现产品 bug，因此不新增 `bugs/`。图片 C2PA 来源凭证、
阶段隐私、scene 与导出模型的结论都已经冻结在本项目调研、规格、生成台账和
借鉴声明中；本轮没有形成需要脱离既有文档单独维护的新通用结论，因此不新增
`learn/`。

## 9. 仍未验收的 Gate

本文件只证明非视觉核心和纯数据合同，不证明作品已经可打开、可玩、可保存或
installed。以下内容仍未完成：

- 用户尚未明确接受
  [`187-flower-language-bouquet-design-proposal.md`](./187-flower-language-bouquet-design-proposal.md)
  的 v2 视觉方向；
- 没有生产 `index.html`、`app.js`、`styles.css`、README 或 favicon；
- 没有页面 SVG primitive registry、DOM、输入、焦点、live region 或隐私
  sentinel 浏览器接线；
- 没有 standalone SVG renderer、结构白名单、XMLSerializer、Blob、对象 URL、
  retry/generation controller 或真实保存 link；
- 没有重新打开导出文件、最大文本可见性、Safari/iOS 预览/系统文件或落盘结果；
- 没有六档视口、200%/400%、reduced-motion、forced-colors、56px target、
  键盘/触屏或 `file://` 浏览器验收；
- 没有 catalog、根门户、surprises 分类索引、创意池 installed 状态或 launcher
  登记。

只有视觉确认、生产 UI、浏览器/file/export Gate、最终归因复核和目录登记全部
完成后，`flower-language-bouquet` 才能标记为 installed。本轮严格不越过该
边界。
