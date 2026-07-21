# “把花语，系成一束”分步实施计划

- 日期：2026-07-21
- 状态：执行中；核心逻辑可先行，生产 UI 等待视觉确认
- 对应调研：[`185-flower-language-bouquet-research.md`](./185-flower-language-bouquet-research.md)
- 对应规格：[`186-flower-language-bouquet-spec.md`](./186-flower-language-bouquet-spec.md)
- 对应视觉提案：[`187-flower-language-bouquet-design-proposal.md`](./187-flower-language-bouquet-design-proposal.md)
- 目标：A 级 `file://` 单人惊喜，零第三方运行依赖、零网络、可显式保存 standalone SVG

## 1. 独立提交边界

用户要求“每完成一个项目或者一部分，就提交一次”。本作按以下边界推进：

1. 定向调研：已提交 `2735380`；
2. 可执行规格：已提交 `d4cef0c`；
3. v1/v2 视觉提案、生成台账与权利边界：已提交 `f4cbd22`；
4. 本实施计划：独立提交；
5. `config.js + logic.js + logic.test.js`：独立提交；
6. 用户接受视觉方向后，设计状态与 design-system inventory：独立提交；
7. semantic DOM、输入、焦点、live 与页面 SVG：独立提交；
8. standalone SVG renderer、export controller 与其浏览器测试：独立提交；
9. styles、响应式、reduced/forced 与概念保真修订：独立提交；
10. README、ATTRIBUTION、favicon、catalog、分类索引和创意池：按职责独立提交；
11. 每个独立 bug：回归测试、修复和 `bugs/` 记录同一提交；
12. 每个可复用主题：实现证据与 `learn/` 记录独立提交；
13. 最终验证报告：独立提交。

每次 commit 前运行：

```bash
git branch --show-current && git rev-parse --show-toplevel
```

并确认分支为 `main`、根目录为 `/Users/zenith/Desktop/two-of-us`。子任务不 stage、不 commit；主线程审阅、验证并提交。

## 2. 子任务与文件所有权

### 2.1 子任务 A：配置、纯逻辑与 oracle 测试

唯一可写文件：

```text
experiences/surprises/flower-language-bouquet/config.js
experiences/surprises/flower-language-bouquet/logic.js
experiences/surprises/flower-language-bouquet/logic.test.js
```

职责：

- 实现 classic browser global/CommonJS 双出口；
- config 提供规格冻结的六种花、称呼、标题、留言与约 5–10 行学习 TODO；
- 捕获反射、数组、字符串等 intrinsic，以 descriptor snapshot 处理 hostile 输入；
- exact schema、整份 config fallback、Unicode/control/lone surrogate 与递归冻结；
- canonical 初态、五类 action、revision headroom 和 malformed-state 回初态；
- 任意顺序 dense unique selectedIds 与 `6P3 = 120` 个排列；
- 组合句、progressive scene、full scene、public view、wrap、layout 与 export model；
- 固定默认/全排列 SHA-256 与最大 22 行 fixture；
- JSON action log 重放、断引用、无运行时副作用和 hostile Proxy；
- 测试 hash 必须调用生产 helper，不维护第二份完整派生集合；
- 不访问 DOM、SVG、Blob、URL、XMLSerializer、Date、random、performance、timer、storage、network 或权限 API；
- 不修改 UI、README、ATTRIBUTION、catalog、docs、bugs 或 learn。

完成 Gate：

```bash
node --check experiences/surprises/flower-language-bouquet/logic.js
node --check experiences/surprises/flower-language-bouquet/config.js
node --test experiences/surprises/flower-language-bouquet/logic.test.js
npm test
npm run verify
git diff --check
```

### 2.2 子任务 B：semantic DOM、输入与页面 SVG

视觉确认后才允许写：

```text
experiences/surprises/flower-language-bouquet/index.html
experiences/surprises/flower-language-bouquet/app.js
```

职责：

- classic scripts 固定为 `config.js → logic.js → app.js`；
- app 只消费 public view 与 export model，不复制 reducer、角色、组合句或布局规则；
- intro/arranging/preview/complete 使用 phase-owned DOM，不缓存 private hidden/template；
- 六花 card 使用稳定 DOM node、`aria-disabled=true` 与 guard，不 native-disable；
- 原生 button/link、detail/repeat 去重、editable/modifier 保护与 held-key 清理；
- render 后 `queueMicrotask + focusRequestToken` 统一调度 START/ADD/UNDO/TIE/RESTART；
- ADD1/2 与 UNDO 走单 live channel，ADD3/TIE 只走 heading focus；
- 页面 inline SVG `aria-hidden=true`，真实 role list/meaning/composition 保留语义；
- primitive registry 严格只用规格 element whitelist，不读取 config path/markup/style；
- 不实现 export renderer/controller、不写 styles、不修改逻辑层。

完成 Gate：

```bash
node --check experiences/surprises/flower-language-bouquet/app.js
npm test
npm run verify
git diff --check
```

### 2.3 子任务 C：standalone SVG 与 export controller

唯一重叠文件为 `app.js`，必须在子任务 B 提交后串行执行。职责：

- 从 frozen export model 新建独立 SVG tree，不 clone 页面 DOM；
- exact element/attribute whitelist、唯一固定 SVG namespace 与结构审计；
- config/派生文本只进入 `title/desc/text/tspan.textContent`；
- 只读取已选 scene key 选择 registry/定位，不把内部 key 输出到结构或 text；
- 256 KiB、全部 text sentinel、最大行数/baseline 与 fail-closed；
- capability detection、idle/unsupported/preparing/ready/error 与 generation guard；
- retryable error 与 exhaustion 不可重试语义；
- object URL stale generation/RESTART cleanup，click/pagehide 不提前 revoke；
- 真实 `<a download>`，不自动 `.click()`，不说“保存成功”；
- state/revision 在导出失败、重试和保存激活后保持不变。

### 2.4 子任务 D：已接受视觉、README 与归因

视觉确认后写：

```text
experiences/surprises/flower-language-bouquet/styles.css
experiences/surprises/flower-language-bouquet/README.md
experiences/surprises/flower-language-bouquet/assets/ATTRIBUTION.md
experiences/surprises/flower-language-bouquet/assets/favicon.svg
```

职责：

- 从已接受 v2 提取并冻结颜色、字体、spacing、radius、container、controls 与花型 geometry；
- 不加载十张 docs-only 概念 PNG，不引入运行时图片或远程字体；
- 1586/1280/844×390/390/320、200% text、400% zoom、56px 与 safe-area；
- reduced-motion、forced-colors、3px focus、长文案和最大配置；
- README 说明双击、玩法、配置、隐私、SVG 保存限制和花语非权威；
- README/ATTRIBUTION 各自完整列出十一项机制来源及 repo/commit/license URL；
- README/ATTRIBUTION 各自列十张 docs-only ImageGen 资产和 `GENERATION.md`；
- 明确零复制、零第三方运行依赖与未来复制/生产资产重新审计。

## 3. 主线程整合顺序

1. 提交本实施计划；
2. 审查子任务 A 的 API、canonical hash、状态闭包、oracle 独立性和测试；
3. 跑定向/全仓/静态 Gate并独立提交核心逻辑；
4. 等待用户明确接受或调整 v2；接受后把 187 状态改为“已冻结”，补 design-system inventory 并独立提交；
5. 依次实现/审查 semantic DOM 与 export controller，避免两个子任务并发写 `app.js`；
6. 实现 styles、README、ATTRIBUTION 与 favicon；
7. 在 `experiences/catalog.json`、根门户、`experiences/surprises/README.md`、根 README、docs 索引和创意池登记；
8. 在共享 catalog 测试加入 A 级、经典脚本、零外链、来源与生成资产边界；
9. 浏览器发现问题时先写回归测试/复现，再修复并写 bugs；
10. 沉淀有跨项目证据的 learn；
11. 提交最终验证报告并保持 worktree clean。

目录总数以 `npm run verify` 实测为准，不提前手写未经验证的总数。

## 4. 浏览器验证顺序

### 4.1 核心玩法

1. 统一服务与真实 `file://` 分别打开；
2. intro 只显示题名、规则与 START，无 private sentinel；
3. START 后六花 name/meaning 全部可读；
4. 依次选玫瑰、向日葵、满天星，核对 main/companion/accent scene 与列表；
5. ADD1/2 焦点去下一未选 card，ADD3 去 preview heading；
6. preview 撤回满天星，焦点回该 card，再选回并 TIE；
7. complete 才显示 recipient/finalTitle/finalNote/sender；
8. 保存 controller 覆盖 ready、capability missing、throw、retry、stale generation 与 exhaustion；
9. 真实激活 download link，确认没有自动 click、保存成功谎称或过早 revoke；
10. RESTART 清除 complete/export URL，回 exact intro；刷新不恢复旧局。

### 4.2 输入、隐私与可访问性

- 纯 pointer 与纯键盘各完成一次；
- 快速双击、repeat key、modifier、editable target、blur/hidden 不重复推进；
- 单 live channel 不重复读 heading；
- intro/arranging/preview/complete 的 DOM/attribute/console/privacy sentinel；
- export model/SVG/Blob 的来源轨迹、collision fixture 与 recipient/未选字段排除；
- 200% text、400% zoom、reduced-motion、forced-colors；
- SVG/Blob/URL/XMLSerializer/createElementNS/revoke 抛错降级；
- console、network、storage、clipboard、history 均无越界访问。

### 4.3 视口与 fidelity

- 1586×992：v2 desktop intro/arranging/complete 原尺寸对照；
- 1280×800：花束与主动作同屏、右栏不造成横溢；
- 844×390：横屏可达花束、控制与 export；
- 390×844：花束 240–280px，computed interactive block-size ≥56px；
- 320×568：内容 288–304px、零横溢、允许纵滚；
- mobile retryable error 与 ready/exhausted 同 container anatomy；
- 用 Browser/IAB 截图，再对概念和浏览器图同时 `view_image(detail="original")`；
- fidelity ledger 至少记录文案、布局、花型、配色、字体、间距、控制尺寸与 export 状态八项。

Browser/IAB 不支持 `file://` 时记录工具限制；统一服务必须完整互动，A 级另以经典相对脚本、零 fetch/module/network、人工双击和目录 Gate 共同证明。

## 5. Bug 记录规则

新问题写：

```text
bugs/YYYY-MM-DD-flower-language-bouquet-<slug>.md
```

必须含环境、复现、预期、实际、根因、修复、回归验证和相关提交。导出问题额外记录 browser/OS、controller phase、generation、Blob/XML/URL 能力与 object URL 生命周期；视觉问题记录视口、节点、computed size 和概念对照。

同根因已有记录时补充原文件，不建立重复条目。修复前优先增加能失败的回归测试。

## 6. Learn 候选

仅在有真实实现与回归证据后评估：

1. **配置与阶段隐私**：磁盘明文 config 与 DOM/导出延迟公开不是同一安全边界；
2. **有序选择双驱动**：同一 selectedIds 同时生成 scene 与自然语言，避免两套状态漂移；
3. **standalone SVG 安全导出**：DOM tree whitelist、namespace 与 textContent 如何替代 XML 字符串拼接；
4. **Blob URL 生命周期**：为什么 click/pagehide 不应立即 revoke，以及 stale generation 如何清理；
5. **字段来源隐私测试**：为何不能用裸字符串 absence 判断内部 ID 泄漏；
6. **ImageGen 概念可实现性**：中心资产为何必须与最终 primitive 复杂度一致。

只有跨项目可复用且具备代码、测试或浏览器证据时才写入 `/learn`。

## 7. 完成条件

- 185/186/获接受的 187 全部实现；
- config/logic/UI/export/styles/归因/catalog/bugs/learn/验证按边界分别提交；
- 120 排列、hash、最大 22 行、privacy collision、export error/retry/exhaustion 全过；
- Chrome/Firefox/Safari desktop `file://` 与 Android Chrome/iOS Safari 保存结果有实际记录；
- 六档视口、200/400%、reduced、forced、零网络、零 storage、零 console error/warning 通过；
- 十一项机制来源与十张 docs-only 生成资产在研究、规格、README、ATTRIBUTION 一致；
- 最终报告含 commits、测试数、目录数、浏览器路径、截图、fidelity ledger、限制与 asset hash；
- worktree clean。

本作品完成不等于长期目标完成；完成后继续下一候选，不调用 goal complete。
