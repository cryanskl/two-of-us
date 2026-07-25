# “影子剑术”生产 UI 最终验收

- 验收日期：2026-07-25
- 实现基线：`2bf3c80f10a5dba82e21d44ddae397092f3d8cf8`
- 分支：`codex/exp-shadow-sword-duel-ui`
- 作品目录：[`../experiences/versus/shadow-sword-duel/`](../experiences/versus/shadow-sword-duel/)
- 冻结规格：[`220-shadow-sword-duel-spec.md`](./220-shadow-sword-duel-spec.md)
- 实现计划：[`221-shadow-sword-duel-implementation-plan.md`](./221-shadow-sword-duel-implementation-plan.md)
- 视觉方案：[`222-shadow-sword-duel-design-proposal.md`](./222-shadow-sword-duel-design-proposal.md)
- 核心验收：[`359-shadow-sword-duel-core-verification.md`](./359-shadow-sword-duel-core-verification.md)

## 1. 结论

“影子剑术”的生产 UI 已达到本阶段 A 级交付标准：

- `index.html` 使用本地相对路径经典脚本，零作品级安装依赖、零网络依赖；
- UI 只消费 `getScreenView(machine)` 返回的公开投影，权威状态只经 `reduce` 推进；
- 两席秘密在 handoff、第二席选招和 ready 阶段不会留在公开 DOM；
- 鼠标、键盘和真实 CDP touch 均可完成操作，双击、连续按键、触控取消、失焦、
  `pagehide` 不会偷推进；
- 九回合上限平局和五回合双 KO 两条完整对局均已在 Chrome 实走；
- 六种视口无横向溢出，交互目标最小高度 48 px；
- `prefers-reduced-motion`、`forced-colors`、无 JavaScript 提示、焦点迁移和单一
  live status 均通过；
- 浏览器控制台零 warning/error；修复隐式 favicon 探测后，页面只请求五个本地
  生产文件；
- 定向测试 36 / 36、全仓测试 2,340 / 2,340、仓库验证 61 个入口通过。

本轮 Chrome 主 Gate 后在 HTTP server access log 发现并修复 1 个隐式 favicon
404；已按红测 → 修复 → 记录闭环沉淀到：

- [`../bugs/2026-07-25-shadow-sword-duel-favicon-404.md`](../bugs/2026-07-25-shadow-sword-duel-favicon-404.md)
- [`../learn/2026-07-25-data-favicon-for-local-html.md`](../learn/2026-07-25-data-favicon-for-local-html.md)

## 2. 生产包与本地直开边界

生产包包含：

- `index.html`
- `styles.css`
- `config.js`
- `logic.js`
- `app.js`
- `README.md`
- `ATTRIBUTION.md`

页面按 `config.js → logic.js → app.js` 加载相对路径经典脚本，不使用 module、
`fetch`、远程字体、远程图片、CDN、服务端 API、存储、随机数或真实时钟。UI 静态
契约同时拒绝 `<base>`、表单提交、iframe 和运行时概念图引用，因此满足
`file://` 双击直开的 A 级闭包。

本次浏览器 Gate 按编排约束直接从 localhost 开始，没有先尝试 `file://`：

```text
http://127.0.0.1:4175/experiences/versus/shadow-sword-duel/
```

这一区分很重要：浏览器实测证明交互、布局与生命周期；静态契约证明直开路径和零
网络闭包。两类证据共同成立，不把 localhost 成功冒充为唯一启动方式。

作品没有新增 npm 包。新 worktree 首次跑全仓测试时，根 `node_modules` 尚未安装，
`shared/runtime/server.js` 因找不到锁文件已有的 `qrcode` 依赖而失败；执行
`npm ci` 后安装 55 个根依赖包，`npm audit` 报告 0 个漏洞，未修改
`package.json` 或 `package-lock.json`，随后全仓测试通过。这是工作区依赖恢复，
不是“影子剑术”的生产 bug。

## 3. UI 数据与隐私边界

控制器持有不可公开的 `machine`，每次渲染只把
`ShadowSword.getScreenView(machine)` 交给 renderer。UI 不调用
`ACTIONS`、`isActionAvailable`、`resolveRound` 或 `replayHistory` 重建规则，也不
读取 `machine.*`。

各阶段使用 `stage.replaceChildren(...)` 整体替换节点。Chrome 对第一席四种秘密
“攻 / 防 / 闪 / 蓄”逐一封招后得到：

- 四份 handoff `#stage.innerHTML` 完全一致；
- 舞台只显示“请把设备交给右席”和“我拿好了”；
- `[aria-pressed]` 与 `[data-control^="choose-"]` 节点数均为 0；
- status 都是“请把设备交给右席”。

第二席封招后的 ready 页也只显示中性揭晓门。核心测试继续覆盖四种第一手 × 四种
第二手的 16 个 ready 组合，未揭晓 view 不含 `sealedActions`、`draftAction` 或可
推断秘密的差异。

主动“先遮住页面”、`window.blur` 和 `pagehide` 都会进入“页面已遮住”，清空未确认
草稿并销毁动作节点；随后触发 `focus` 仍保持遮屏，只把焦点放到遮屏标题，必须由
当前席主动按“继续选招”。

## 4. 完整玩法 Gate

### 九回合上限

Chrome 实走九轮“防 / 防”：

1. 每轮完整经过 choosing → handoff → choosing → ready → result；
2. 下一回合先行动席严格左右交替；
3. 第 1–8 回合结果页有且只有一个“下一回合”；
4. 第 9 回合进入“九回合结束，仍是平局”；
5. 终局有且只有一个“再来一场”；
6. “此前已揭晓回合”只列第 1–8 回合，当前第 9 回合不重复进入历史。

### 双 KO

Chrome 实走：

```text
攻/攻 → 蓄/蓄 → 攻/攻 → 蓄/蓄 → 攻/攻
```

第 5 回合双方从同一 before snapshot 同时归零，进入“双方倒下，平局”；因果顺序
依次显示两席动作、两席耗气和两席各受 1 点伤害，没有因渲染顺序把其中一席先判负。

### 规则因果分支

另一路径覆盖：

- 普通攻 / 防：无人受伤，防守方取得先机；
- 下一回合先机攻 / 防：先机攻破防，防守方受伤；
- 蓄 / 蓄：双方未受伤，各回复 1 点气；
- 攻 / 闪：无人受伤，攻击方仍支付气；
- 攻 / 蓄：蓄力方受伤且不回气。

结果页仅从公开 effect 排列“动作 → 耗气/耗先机 → 受伤/无人受伤 → 回气/获先机”
因果，不从 DOM 重新推导胜负。

## 5. 输入、焦点与生命周期 Gate

| 场景 | Chrome 证据 | 结果 |
| --- | --- | --- |
| 鼠标单击 | 完成选招、确认、交接、揭晓、下一回合、重开 | PASS |
| 键盘 | Enter 选招；连续三次 Enter 仍只有一个选中项且不确认 | PASS |
| 重复 click | 对“封好这一招”真实 `dblclick` 后只到 handoff，没有越过交接门 | PASS |
| 真实触控 | CDP `touchStart` + `touchEnd` 点击开始后进入第一席 choosing | PASS |
| 触控取消 | CDP `touchStart` + `touchCancel` 后 0 个选中项，确认仍 disabled | PASS |
| 主动遮屏 | 已选草稿被清空，动作节点被销毁 | PASS |
| blur | choosing 立即转为 covered | PASS |
| focus | covered 不自动 resume，焦点落到“页面已遮住”标题 | PASS |
| pagehide | choosing 立即转为 covered | PASS |
| 阶段焦点 | 每次阶段替换后，阶段 `h2[tabindex="-1"]` 获得焦点 | PASS |
| 可见焦点 | 键盘选招后 `:focus-visible` 为 true，3 px solid outline、4 px offset | PASS |

生产输入监听只有 `click` 和键盘防重复保护，不在 `pointerdown`、`touchstart` 或真实
时间窗口里推进状态。一次性节点还带 consumed 门，旧节点和双击第二次不能重复派发。

## 6. 六视口与可访问性 Gate

| 视口 | 布局证据 | 横向溢出 | 首屏按钮高度 |
| --- | --- | ---: | ---: |
| 1440 × 900 | 262 / 600 / 262 三栏 | 0 px | 48 px |
| 1280 × 800 | 252 / 577 / 252 三栏 | 0 px | 48 px |
| 768 × 1024 | 双 rail 两栏，stage 跨栏 620 px | 0 px | 48 px |
| 390 × 844 | 双 rail 各 172 px，stage 358 px | 0 px | 48 px |
| 320 × 568 | 双 rail 各 141 px，stage 296 px | 0 px | 48 px |
| 844 × 390 | 横屏双 rail 各 371 px，stage 620 px | 0 px | 48 px |

页面始终只有一个 `h1` 和一个 `[role="status"]`。窄屏允许自然纵向滚动，不缩小
触控目标、不裁掉资源 rail，也不制造横向滚动。

媒体与降级检查：

- `prefers-reduced-motion: reduce` 命中，按钮 transition/animation 被压至
  `0.000001s`；
- `forced-colors: active` 命中，文字、按钮边框和焦点 outline 映射为系统色；
- 禁用 JavaScript 后，空舞台不会伪装成可玩状态，`noscript` 显示“此体验需要浏览器
  启用 JavaScript”；
- 可用动作使用 native button，零气时“攻”同时 disabled 并写明“需要 1 点气”，
  不只靠颜色传意。

## 7. 视觉 fidelity ledger

最终视觉在同一 QA pass 中逐像素查看
[`concept-result-desktop.png`](./assets/shadow-sword-duel/concept-result-desktop.png)
与 Chrome 1440 × 900 结果页。生产页面没有引用概念 PNG；所有装饰由 CSS 绘制。

| 视觉锚点 | 概念方案 | 生产实现与判定 |
| --- | --- | --- |
| 深靛纸面 | 深蓝纸纹背景 | 深靛渐变加细纸纹，保持安静、低眩光的对决氛围 |
| 双席色彩 | 左朱红、右青蓝 | 标题、动作、资源 rail 始终按席位着色，不把颜色作为唯一信息 |
| 中轴结构 | 左资源 / 中结果 / 右资源 | 桌面三栏完全保留；标题、回合、结论和 CTA 位于中轴 |
| 纸折装饰 | 两侧弧形折纸层 | 用伪元素和渐变实现抽象折纸弧，不引入运行时图片 |
| 结果层级 | 回合 → 双方动作 → 大结论 → 因果 | 生产页保持同序，并把可扫描因果列表置于 CTA 前 |
| 控件质感 | 象牙纸按钮与细描边 | 生产 CTA 改为朱红高对比按钮；次要控件使用透明纸面描边 |
| 密度 | 概念含较多装饰和当前回合历史 | 生产删掉同一回合的重复历史，首屏 900 px 内完整呈现结果 |
| 响应式 | 概念以桌面构图为主 | 生产新增 768、390、320 和横屏布局，资源信息仍成对可比 |

这是“吸收构图语言、独立代码实现”，不是复刻概念位图。docs 下三张概念图仍仅作
评审证据，生产生成资产为零。

## 8. 控制台、网络与无外联

最终两张 Chrome 验收页的 warning/error 均为空。

重新加载时观察到的页面请求只有：

1. 当前 `index.html`；
2. `styles.css`；
3. `config.js`；
4. `logic.js`；
5. `app.js`。

第一次关闭验收 server 时，access log 暴露浏览器额外探测 `/favicon.ico` 并得到
404。先增加失败的静态回归，再在 `<head>` 声明空 data favicon；静态合同随后
7 / 7 通过，并证明图标已由不发起 HTTP 的 data URL 显式接管，生产网络继续闭合为
上面五个本地文件。

五个生产请求均位于同一 `127.0.0.1:4175` 作品目录。浏览器自动化扩展自身的
`chrome-extension://.../cursor-chat.png` 不属于页面发起的生产请求；生产 DOM、
CSS 和 JS 都没有该 URL，也没有任何 HTTP(S) 第三方资源。

## 9. 借鉴与许可证复核

[`README.md`](../experiences/versus/shadow-sword-duel/README.md) 含精确标题
`## 借鉴与来源声明`；
[`ATTRIBUTION.md`](../experiences/versus/shadow-sword-duel/ATTRIBUTION.md) 独立闭合
同一声明。两者分别记录：

- OpenSpiel 固定 commit、Apache-2.0 LICENSE URL、SHA-256、DeepMind 权利行；
- boardgame.io 固定 commit、MIT LICENSE URL、SHA-256 与 2017 权利行；
- PrinceJS 固定 commit、Unlicense URL、SHA-256、public-domain 表述和
  Prince of Persia 品牌/角色/素材排除；
- WCAG 2.2 固定 Recommendation、W3C Document License 2023 URL、页面
  SHA-256 与 W3C 权利行。

每项都区分“本作仅借鉴”和“明确未复制”。当前仍是零第三方运行依赖、零第三方
代码复制、零第三方资产复制；三张 ImageGen 概念图的提示、尺寸和 SHA-256 单独见
[`GENERATION.md`](./assets/shadow-sword-duel/GENERATION.md)。

## 10. 自动化与范围审计

| 检查 | 最终结果 |
| --- | --- |
| `node --check` config / logic / app / 两个测试文件 | PASS |
| `node --test .../logic.test.js .../ui-contract.test.js` | 36 / 36 PASS |
| `npm ci` | 安装 55 包；0 vulnerabilities；锁文件无变化 |
| `npm test` | 2,340 / 2,340 PASS |
| `npm run verify` | 61 个作品入口、1 个能力声明 PASS |
| `git diff --check $(git merge-base main HEAD)..HEAD` | PASS |

最终 range 起点是
`2bf3c80f10a5dba82e21d44ddae397092f3d8cf8`。生产与测试改动只位于：

```text
experiences/versus/shadow-sword-duel/
```

另仅新增本验收与缺陷沉淀文档：

```text
docs/382-shadow-sword-duel-final-verification.md
bugs/2026-07-25-shadow-sword-duel-favicon-404.md
learn/2026-07-25-data-favicon-for-local-html.md
```

没有修改 catalog、根入口、分类、根 README、docs README、Board、共享运行时或共享
依赖。`npm ci` 只恢复被忽略的本地 `node_modules`。

## 11. 最终 Gate

| Gate | 状态 |
| --- | --- |
| A 级本地经典脚本闭包 | PASS |
| 两席完整对局与所有关键规则分支 | PASS |
| 未揭晓 DOM 隐私 | PASS |
| 鼠标、键盘、触控与重复输入 | PASS |
| blur、pagehide、cover 与 focus | PASS |
| 六视口、触控尺寸与无横向溢出 | PASS |
| reduced-motion、forced-colors、no-JS | PASS |
| 控制台、网络与零外联 | PASS |
| 视觉 fidelity | PASS |
| 借鉴与许可证声明 | PASS |
| 定向、全仓与 repository verify | PASS |
| 范围隔离 | PASS |

结论：本分支已经具备合并条件。catalog 与根入口接入明确留给总控，避免在并行
worktree 中触碰共享文件。
