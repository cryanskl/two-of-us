# 绕词对决生产 UI 最终验证

- 日期：2026-07-26
- 分支：`codex/exp-word-detour-duel-production-ui`
- 基线：`bda0d45`
- 项目：`experiences/versus/word-detour-duel/`
- 结论：**PASS，可进入集成**

## 1. 交付范围

本轮只修改：

- `experiences/versus/word-detour-duel/**`
- `learn/word-detour-duel-timer-rendering-and-secret-dom.md`
- 本验证文档

没有修改 catalog、根门户、分类 README、`docs/README.md` 或 orchestration board。
没有创建 bug 文件，因为最终验收未发现属于本项目的产品缺陷。

分段提交：

1. `073499e`：红灯生产 UI 契约
2. `09bf3f2`：生产热座 UI
3. `8a78d8b`：README 与借鉴声明
4. `e97c877`：计时渲染与秘密 DOM 学习记录

## 2. 生产包

新增或完成：

- `index.html`：经典相对脚本入口、公共比赛轨、诚实 noscript
- `styles.css`：纸面路线系统、六档响应式、reduced-motion、forced-colors
- `app.js`：九阶段 renderer、精确 reducer action、单 timer driver、生命周期卸密
- `assets/favicon.svg`：code-native 本地图标
- `README.md`：直开、玩法、隐私、自定义与测试
- `ATTRIBUTION.md`：来源、独立创作、ImageGen 与零复制边界
- `ui-contract.test.js`：8 组生产静态合同

保留并消费既有 `config.js / logic.js / logic.test.js`，没有改动 72 张卡、三套
schedule、四回合核心规则、公开投影或终局日志。

## 3. 自动化门禁

项目目录：

```text
node --check app.js
node --test logic.test.js ui-contract.test.js
```

结果：`27 / 27` 通过，其中核心 `19 / 19`、生产 UI 合同 `8 / 8`。

仓库根目录：

```text
npm ci
npm test
npm run verify
```

原生产分支结果：

- `npm ci`：安装 55 个锁定包，0 个漏洞
- `npm test`：`2405 / 2405` 通过
- `npm run verify`：通过；68 个作品入口、1 个能力声明、资源与借鉴声明完整

首次未安装根依赖时，共享 runtime 测试因缺少 `qrcode` 失败，verify 同时报告
`panorama-memory` vendor 缺失；执行仓库标准 `npm ci` 后，两项总门禁均通过，
且工作树没有因此产生跟踪文件修改。这属于环境依赖准备，不是本项目 bug。

## 4. Chrome 真实流程

受控 Chrome 通过 localhost 打开：

```text
http://127.0.0.1:8127/experiences/versus/word-detour-duel/
```

### 4.1 计时与不计时

- 非默认“星灯 + 30 秒”成功进入 handoff。
- handoff 中 `secret-card / target-word / forbidden-list` 均不存在。
- 开卡后只出现当前 1 张目标和恰好 4 个禁词；目标节点获得程序焦点。
- Enter 启动后公共计时与题卡计时同时为 `00:30`。
- 手动暂停后当前 5 个秘密 marker 在整页 HTML 中全部为 0，焦点迁移到中性标题。
- 恢复只回到 `card-ready`，结果按钮为 0、计时显示“未开始”；必须再次点击开始。

不计时模式完整完成四回合：

- 描述席顺序为玩家 1 / 玩家 2 / 玩家 1 / 玩家 2。
- 每回合 6 张，三种结果均经真实按钮操作。
- 首回合由 `2 猜中 / 2 踩词 / 2 跳过 / 净分 0`，共同复核把一项踩词更正为猜中，
  精确变为 `3 / 1 / 2 / 净分 2`。
- 确认后公共比分才从 `0:0` 变为 `2:0`。
- 终局有双方净分和 4 条回合统计，题卡节点与当前秘密 marker 均为 0。
- “再来一局”回到 intro；比分为 `— / —`、历史为 0、秘密节点为 0。
- 再进 setup 后默认精确恢复为牌组 `0` 与 `60` 秒。

### 4.2 输入与生命周期

- 结果按钮真实双击：进度只从第 `1 / 6` 张变为第 `2 / 6` 张。
- Chrome touch emulation + `Input.dispatchTouchEvent` 在按钮可见区域执行真实触摸：
  进度只从第 `1 / 6` 张变为第 `2 / 6` 张。
- Enter 与 Space 均通过原生 button 行为完成操作。
- 在真实 Chrome 页面上分别触发 blur、hidden visibilitychange、pagehide：
  三者都立即卸载 `secret-card / target-word / forbidden-list`。
- hidden 后重新 visible 不自动恢复，页面仍停在中断中性页。
- 生命周期事件通过 Chrome DevTools 协议定向触发；浏览器扩展新建标签不会把受控
  标签真实切到后台，因此没有把“新标签页”误记为 visibility 验证。

### 4.3 秘密 DOM Gate

验证的 presence/absence：

- intro / setup / handoff / interrupted / turn-ended / match-result：秘密 marker 为 0
- card-ready / describing：只有当前目标与四个禁词
- turn-review：只列本回合实际出现的 6 张
- match-result：只列派生统计，不回放目标词、禁词或 card ID
- `global-status` 始终只使用公开状态文字，不含目标或禁词

舞台迁移使用 `stage.replaceChildren()`，不是 `hidden`、透明、模糊或 `aria-hidden`
保留秘密节点。

## 5. 响应式与辅助模式

描述阶段量化结果：

| 视口 | 横向溢出 | 禁词布局 | 三结果布局 | 最小按钮 |
| --- | --- | --- | --- | --- |
| 1440×900 | 无 | 四角 / 2×2 语义 | 同排等宽 | 52px |
| 1280×720 | 无 | 四角 / 2×2 语义 | 同排等宽 | 52px |
| 768×1024 | 无 | 2×2 | 同排等宽 | 52px |
| 390×844 | 无 | 2×2 | 同排，78px 高 | 52px |
| 320×568 | 无 | 单列 | 单列，56px 高 | 52px |
| 844×390 | 无 | 2×2，纵向可滚动 | 同排 | 52px |

200% 等效窄屏检查使用 `720×900 + OS text scale 2`：

- `documentElement clientWidth / scrollWidth / body scrollWidth` 均为 `720`
- 无横向溢出
- 主操作按钮仍为 52px 高且可达

辅助模式：

- reduced-motion：按钮 `transition-duration: 0s`、`animation-duration: 0s`
- forced-colors：三结果仍有 3 个 SVG 图形、完整文字和分值；系统色生效
- 无 JavaScript：只显示“绕词对决”、返回入口和“不录音、不联网”的启用提示；
  动态舞台子节点 0、按钮 0、秘密节点 0
- Chrome console：两个验收标签均 0 error / warn

Chrome Browser Use 安全策略拒绝导航到 `file://`，因此没有伪称自动化已完成
`file://` 点击流程。直开能力由以下证据闭合：

- `config.js → logic.js → app.js` 经典相对脚本顺序
- 无 module、外链运行资源、fetch、Storage、Worker、录音或权限 API
- 所有 `./` 运行资源存在
- 项目 README 给出双击入口
- 项目静态 UI 合同与仓库 verify 均通过

## 6. 视觉 fidelity ledger

与两张已确认概念图同轮对照：

1. 保留暖纸色、深蓝路线墨线、红色封路圈和青 / 红 / 赭三结果语义。
2. 保留玩家 1 → 中央计时 → 玩家 2 的等权公共比赛轨和固定阅读顺序。
3. 保留中央圆形目标、四个外围禁词节点与实线 / 虚线路线构图。
4. 保留三结果同层级、同面积，并用图形 + 文字 + 分值三重表达。
5. 保留手机 2×2 禁词、中央目标和滚动可达的三操作；320px 进一步安全改单列。
6. 概念图中的纸张噪点、复杂装饰接头和机械端点被有意简化为 code-native
   CSS / SVG，避免运行时 PNG、外部纹理与纯装饰资产。
7. 暂停操作在生产版放在结果区下方，避免与全局标题混淆，并保持秘密阶段内始终可达。

运行时没有引用 `docs/assets/` 的概念 PNG。

## 7. 来源、许可与借鉴声明

`ATTRIBUTION.md` 保留 13 项一手来源，覆盖：

- 三项商业官方页面
- USPTO 与美国版权局三项商标 / 版权边界材料
- Web Speech API
- WCAG Keyboard / Timing Adjustable / Focus Visible / Status Messages / C39
- WHATWG Page Visibility

实际只借鉴抽象机制与无障碍、生命周期边界；没有复制或改写商业规则、示例、题卡、
卡面、蜂鸣器、包装、源码或素材。

作品名称、四回合结构、schedule、复核、状态机、中文文案和 72 张卡均为仓库独立
创作。两张 OpenAI ImageGen 图只作为 docs 内设计参考，不进入运行时。当前实现为
零第三方代码复制、零第三方资产复制，没有第三方开源运行依赖，也没有需要固定
commit/tag 的 OSS 许可证。

若后续参考开源实现，README 与 ATTRIBUTION 已冻结要求：合入前必须记录固定
commit/tag、LICENSE URL、版权主体、实际借鉴点与未复制范围。

## 8. Bug 与学习沉淀

- 新增 bug：无
- 学习记录：
  `learn/word-detour-duel-timer-rendering-and-secret-dom.md`
- 关键结论：公共高频计时值增量更新，秘密阶段边界整体换树；这样同时守住焦点、
  防重复输入与 DOM presence/absence 隐私合同。

## 9. 最终状态

项目核心、生产 UI、文档、来源、浏览器流程、响应式、辅助模式与仓库总门禁全部
通过。工作树范围符合授权，没有 push。

## 10. 主线接入复验

2026-07-26 逐项 cherry-pick 到 `main`：

1. `8c359e8`：红灯生产 UI 契约
2. `3755703`：生产热座 UI
3. `bb2d7bc`：README 与借鉴声明
4. `331915e`：计时与秘密 DOM 学习记录
5. `fe1ea55`：独立生产分支最终验证

总控目录接入后：

```text
npm test       2441 / 2441 通过
npm run verify 72 个作品入口通过
               64 个 A 级直开、8 个非 A 启动器
```

共享定向回归包含项目 27 项测试、catalog、入口闭包与 favicon 合同，全部通过。
新增目录契约按本项目真实实现锁定 `defer` 经典脚本顺序、`logic.getView(state)`
公开投影与无脚本提示，没有为了迁就测试修改生产代码。

主门户 localhost Chrome 复验：

- “绕词对决”标题、卡片和链接各 1 个，分类、等级、安装状态、人数与设备信息正确；
- 真实点击进入正确项目 URL，返回作品集也真实导航回根门户；
- intro → setup → handoff → card-ready → describing 真实点击通过；
- intro、setup、handoff 的秘密节点均为 0；describing 恰好出现 1 个目标“雨伞”
  与 4 个禁词；
- 390 × 844 开场主按钮 `y = 695.8`、`bottom = 747.8`，完整位于首屏；设置页
  主按钮 `y = 1033`、`bottom = 1085`，不在首屏但可纵向滚动到达；
- 320 × 568 与 844 × 390 均无横向溢出，全部 8 个设置与操作可纵向到达；
- console error / warn、Runtime exception、Network loading failed、意外公网请求和
  非预期 HTTP 错误均为 0；根与项目 favicon 均返回 200 / 304。

项目现已完成主线接入，目录总数由 71 增至 72；未 push。
