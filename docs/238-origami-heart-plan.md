# “沿着折痕，折到你心里”分步实施计划

- 日期：2026-07-24
- 状态：执行中
- 对应 Brainstorm：[`234-origami-heart-brainstorm.md`](./234-origami-heart-brainstorm.md)
- 对应调研：[`235-origami-heart-research.md`](./235-origami-heart-research.md)
- 对应规格：[`236-origami-heart-spec.md`](./236-origami-heart-spec.md)
- 对应设计：[`237-origami-heart-design.md`](./237-origami-heart-design.md)
- 目标：A 级 `file://` 单人惊喜，零第三方运行依赖

## 1. 独立提交边界

用户要求“每完成一个项目或者一部分，就提交一次”。本作采用：

1. Brainstorm + 调研：`ba924f2`；
2. 许可证推断 bug 与来源修正：`51932bb`；
3. 可执行规格：`fd0d8e7`；
4. 代码原生视觉：`ac2ef27`；
5. 本实施计划：独立提交；
6. 配置、逻辑与逻辑测试：独立提交；
7. 生产 UI、README、ATTRIBUTION 与 favicon：独立提交；
8. catalog、门户、分类索引、创意池与共享测试：独立提交；
9. 浏览器发现的每个独立 bug：记录与修复独立提交；
10. 可跨项目复用的 learn：独立提交；
11. 最终验证报告与状态索引：独立提交。

每次 commit 前运行：

```bash
git branch --show-current && git rev-parse --show-toplevel
```

确认分支与 `/Users/zenith/Desktop/two-of-us` worktree 匹配。子任务不 stage、不 commit；主线程审阅、测试后按边界提交。

## 2. 子任务 A：纯逻辑

唯一可写文件：

```text
experiences/surprises/origami-heart/config.js
experiences/surprises/origami-heart/logic.js
experiences/surprises/origami-heart/logic.test.js
```

职责：

- 实现经典脚本 + CommonJS 共用的冻结 API；
- 实现默认配置、严格快照、NFC/空白规范化、整份回退；
- 实现五道折痕表、向量、距离因子和进度投影；
- 实现 canonical state、exact action、严格前缀 reducer；
- 实现 `intro → folding → turning → complete` 与重开；
- 实现 complete 前不含配置值的公开 DTO；
- 测试所有阈值、越序/重复、hostile schema、JSON 往返、隐私 sentinel 和无运行时副作用；
- 不创建 DOM，不修改 UI、catalog、README、docs、bugs 或 learn。

完成 Gate：

```bash
node --check experiences/surprises/origami-heart/config.js
node --check experiences/surprises/origami-heart/logic.js
node --test experiences/surprises/origami-heart/logic.test.js
npm test
git diff --check
```

## 3. 子任务 B：生产 UI 与来源声明

唯一可写文件：

```text
experiences/surprises/origami-heart/index.html
experiences/surprises/origami-heart/styles.css
experiences/surprises/origami-heart/app.js
experiences/surprises/origami-heart/README.md
experiences/surprises/origami-heart/ATTRIBUTION.md
experiences/surprises/origami-heart/assets/favicon.svg
```

职责：

- 只消费 `window.OrigamiHeartLogic` 和公开 view，不读取权威 state 私有字段；
- 使用 `config.js → logic.js → app.js` 经典脚本；
- 实现四阶段 phase-owned DOM、五折有序列表与单一 live region；
- 实现 app-local Pointer session、generation、capture/cancel/lost/blur/hidden 清理；
- 实现 2D 基线、可关闭 3D 增强、reduced-motion、forced-colors；
- complete 前 DOM/属性/ARIA 不含四个配置值，complete 才用 `textContent` 创建；
- README 写直开、玩法、隐私、定制和借鉴摘要；
- ATTRIBUTION 写两个固定 MIT 来源、四个固定排除项、标准、零复制、零素材与独立实现；
- favicon 只用本仓库原创 SVG 基本形；
- 不修改 logic/config/test、catalog、根文档、bugs 或 learn。

完成 Gate：

```bash
node --check experiences/surprises/origami-heart/app.js
npm test
npm run verify
git diff --check
```

前端若发现公开 API 与规格不一致，必须回报主线程，不把规则复制进 app。

## 4. 主线程整合与 catalog

主线程顺序：

1. 审查逻辑 diff、API、隐私与测试；
2. 跑定向测试和全仓测试，独立提交逻辑；
3. 审查 UI、阶段 DOM、手势、视觉、README 与 ATTRIBUTION；
4. 跑语法、全仓和静态检查，独立提交 UI；
5. 浏览器实玩，先修复发现的 bug；
6. 更新：
   - `experiences/catalog.json`
   - 根 `index.html` 内置目录
   - `experiences/surprises/README.md`
   - 根 `README.md`
   - `docs/README.md`
   - `docs/40-idea-backlog.md` 的 S16
   - `shared/runtime/catalog.test.js`
   - `scripts/experience-contracts.test.mjs` 的 installed/A/non-A 精确计数
7. 只有入口、来源、浏览器路径和共享测试通过后才登记 installed。

当前实测目录为 55 个作品入口、47 个 A 级。若本作完成，预计变为 56 / 48；创意池预计从已实现 39、惊喜 11、未实现 21，变为 40 / 12 / 20。所有数字以 `npm run verify` 和测试实测为准。

## 5. 浏览器验证

必须使用 Chrome MCP / 浏览器工具验证真实生产文件。

### 5.1 玩法与隐私

1. 通过仓库统一服务打开作品；
2. 记录 console、network 和经典脚本加载；
3. intro 扫描 outerHTML、文本、属性与 ARIA，四个唯一私密 sentinel 零命中；
4. 只用按钮完成五折、翻面、查看短笺并重开；
5. 每个 folding 前缀与 turning 重复隐私扫描；
6. complete 才出现四个值，重开后再次零命中；
7. complete 刷新回 exact intro。

### 5.2 Pointer 与生命周期

1. 五个方向分别真实拖动；
2. `0.71` no-op、`0.72` commit；
3. 反向、正交、越界、capture 失败 fallback；
4. `pointercancel`、`lostpointercapture`、blur、hidden、pagehide；
5. Pointer 成功 + compatibility click 只推进一次；
6. 迟到旧 generation 不能推进下一折；
7. Pointer、点击、Enter/Space、ArrowRight 混合仍严格五步。

### 5.3 视觉与无障碍

- 1728×906、1280×800、390×844、320 CSS px；
- 1280×800 / 400% zoom；
- 200% 文本；
- Tab/Shift+Tab、focus-visible、阶段焦点和 live region；
- reduced-motion、forced-colors；
- 移除 `.has-3d` 后完整完成；
- 阻断 CSS 与 favicon 后仍可操作；
- 无脚本只显示公开说明；
- `scrollWidth <= clientWidth`，真实按钮和 handle 尺寸达到 Gate。

浏览器自动化若拒绝 `file://`，如实记录工具边界；用经典相对脚本、零网络静态 Gate 和 localhost 同文件实玩证明 A 级合同，不能把 localhost 声称为真实 file 导航。

## 6. Bug 记录

所有真实复现缺陷写入：

```text
bugs/2026-07-24-origami-heart-<slug>.md
```

至少包括环境、复现、预期、实际、根因、修复、回归验证和相关 commit。

已存在：

- [`2026-07-24-origami-heart-license-inference.md`](../bugs/2026-07-24-origami-heart-license-inference.md)：历史 vendored 许可证错误倒推，已于 `51932bb` 修复。

相同根因追加原记录，不建立重复 bug。

## 7. Learn 候选

完成后至少评估：

1. **渐进增强不能成为业务状态**：2D/3D/reduced/forced 如何共享同一 reducer；
2. **临时手势与原子提交**：Pointer progress 为何留在 app，而 state 只接收完成 action；
3. **隐私内容的结构性缺失**：为什么 complete 前 public DTO 和 DOM 都不应该有字段；
4. **固定历史对象的许可证审计**：为什么不能用今天的上游许可证倒推历史 vendored 文件。

只有能跨两个以上作品复用且有实现/测试证据时写入 `learn/`。

## 8. 完成条件

- 236/237 的玩法和视觉合同全部实现；
- 逻辑、UI、catalog、bugs、learn、验证按计划独立提交；
- 定向测试、全仓测试、verify、五折、翻面、隐私、输入、四档响应式和降级通过；
- 来源 commit、许可证哈希、版权、排除项和零复制声明一致；
- 最终验证报告记录命令、测试总数、目录总数、浏览器证据、已知限制与 commits；
- worktree clean。

本作品完成不等于长期目标完成；完成后继续选择下一候选，不调用 goal complete。
