# “把星光，一笔一笔交给你”验收记录

- 日期：2026-07-21
- 作品：`experiences/co-op/constellation-relay/`
- 等级：A（经典相对脚本、纯本地资源、零第三方运行依赖、零网络、零存储、零时间、零随机、零音频）
- 对应调研：[166-constellation-relay-research.md](./166-constellation-relay-research.md)
- 对应规格：[167-constellation-relay-spec.md](./167-constellation-relay-spec.md)
- 视觉冻结：[168-constellation-relay-design.md](./168-constellation-relay-design.md)
- 分步计划：[169-constellation-relay-plan.md](./169-constellation-relay-plan.md)

## 1. 结论

作品已完成为单设备公开轮流的双人 Euler 接线游戏。两席从同一线轴出发，每次只追加一根公开轮廓边；重复边、轮廓外边、既有线穿越和会令剩余路线无解的前缀都会原子拒绝。十根线严格交替提交后，两席各完成五根，共同得到一只双翼星鸢。

生产浏览器跑通鼠标完整路线与星点纯键盘完整路线，覆盖四种失败、重试、十次公开交接、结果确认、完成纪念与重开。1504、1280、390、320 和等效 200% 缩放宽度均无横向溢出；reduced-motion、forced-colors 与两张图片同时阻断均实测；控制台无 error/warn。

浏览器安全策略明确拒绝 `file://` 导航，且禁止改用其他浏览器接口规避，因此没有把 HTTP 访问冒充真实双击。A 级边界由经典相对脚本、零 module/fetch/网络/存储、55 项入口验证和本地资产证明；真实双击保留一次人工发布 Gate。

## 2. 实现简报

- `config.js`：两席称呼与完成结语；
- `logic.js`：9 点 10 边冻结题面、整数相交分类、四条完整 Euler 路径、后缀计数、六结果 evaluator、七阶段 reducer、配置归一化、公开 view 与敌意输入快照；
- `logic.test.js`：41 项定向测试，含 630 对线段 Oracle、9,216 个 `cursor × mask` 状态、四条完整路线、四种失败、失败重试、hostile state/action、JSON 重放和公开投影；
- `index.html` / `style.css` / `app.js`：9 个稳定 HTML 星点按钮、SVG 目标/完成/预览线层、roving tabindex、方向键、Enter/Space、Escape、Pointer、交接、live region、十行日志、焦点归位、响应式与坏图降级；
- 两张 PNG 与原创 favicon：只承担观测台材质和完成纪念氛围，规则、点位、线路、进度与答案仍由 DOM/SVG/权威状态生成；
- `README.md` / `ATTRIBUTION.md`：直开方式、玩法、同机信任边界、配置、隐私、五个固定研究来源、许可证/版权、Vanta 排除、ImageGen 与零复制声明。

## 3. 自动检查

最终执行：

```sh
node --check experiences/co-op/constellation-relay/config.js
node --check experiences/co-op/constellation-relay/logic.js
node --check experiences/co-op/constellation-relay/app.js
node --test experiences/co-op/constellation-relay/logic.test.js
node --test shared/runtime/catalog.test.js
npm run verify
npm test
cmp docs/assets/constellation-relay/observatory-console-background-source.png experiences/co-op/constellation-relay/assets/observatory-console-background.png
cmp docs/assets/constellation-relay/completion-keepsake-source.png experiences/co-op/constellation-relay/assets/completion-keepsake.png
git diff --check
```

结果：

- 作品逻辑：41 / 41 通过；
- 目录与静态 Gate：88 / 88 通过；
- 全仓：1492 / 1492 通过，0 失败；
- `verify`：55 个作品入口、1 个能力声明通过；
- 两张运行时 PNG 与 docs 源稿逐字节一致；
- `git diff --check`：通过。

资产 SHA-256：

| 资产 | SHA-256 |
| --- | --- |
| `observatory-console-background.png` | `077022eef9197b4ea1aa6fed89775b6aa3cb16c1943f7f83859095953a95da63` |
| `completion-keepsake.png` | `55802680a4ab40a33e2ce52e6dba730e8c89e5e43b2d8998d30a8a189ffbb64b` |

规则测试还证明：冻结题面完整路线严格为 4；全部 630 对测试线段与独立几何 Oracle 一致；全部 9,216 个线头/位掩码状态与独立 DFS 一致；失败不提交前缀；成功严格轮换；四条完整路线和失败→重试→完成流程都能 JSON 重放；public view 不包含 memo、后缀解数或答案路线。

## 4. 浏览器生产路径

通过仓库本地服务加载生产文件，实际完成：

1. 开始后确认公开交接，A 从线轴接到西翼枢纽；
2. B 选择东翼上星，触发 `off-outline`；重试后过早接东翼枢纽，触发 `future-stranded`；
3. 走到西翼尖星后选择东翼上星，触发 `wire-crossed`；
4. 西翼闭环后尝试重复西翼下边，触发 `edge-used`；
5. 每种失败都停在 `jammed`，完成数、席位和当前线头不推进，RETRY 后继续当前边；
6. 按尾线→西上→西尖上→西尖下→西下→桥→东上→东尖上→东尖下→东下完成十根；
7. 第十根进入 `constellation-result`，焦点落到“十根星线全部接通”，日志 10 条，A/B 各 5；
8. FINISH 后进入 complete，焦点落到完成标题，RESTART 回到 exact intro、0/10 与两席 0/5；
9. 另开一局用方向键移动所有星点，以 Enter 与 Space 接线，Escape 回当前线头，完成同一十步路线；
10. 控制台 error/warn 为 0。

按钮的原生 Enter/Space 行为由浏览器控件语义承担；浏览器自动化的 locator `press` 对节点切换会等待超时，因此星点键盘流使用低层真实键盘事件验证，动作按钮仍用可访问原生 button 并由目录静态 Gate 检查。

## 5. 响应式、可访问性与降级

| 视口 / 模式 | 实测结果 |
| --- | --- |
| 1504×1046 intro/result | 主棋盘 `740×806px`，右栏 `320px`，页面 `scrollWidth = clientWidth = 1504`；结果标题持有焦点 |
| 1280×800 intro | 棋盘 `560×626px`，右栏 `320px`；9 个星点均为 `58×58px`，主动作高 `52px`，无横向溢出 |
| 390×844 intro | 阶段卡在棋盘之前；棋盘宽 `366px`；9 个星点均为 `44×44px`，主动作高 `52px`，无横向溢出 |
| 320×568 intro | 棋盘宽 `304px`；星点 `44×44px`，主动作 `268×52px`，无横向溢出，允许必要纵滚 |
| 752×523 等效 200% 宽度 | 自动切入单列，棋盘宽 `366px`，星点 `44px`，`scrollWidth = clientWidth = 752` |

- DOM 阅读顺序为阶段→棋盘→两席图例→接线日志；桌面只用 grid area 改视觉位置；
- 两席除橙/青颜色外，还有 A/B、称呼、实/虚线与实心/双环端帽；
- 9 个按钮维持单一 roving `tabindex=0`，阶段切换把焦点送到线头、结果标题或主动作；
- `prefers-reduced-motion: reduce` 实测 transition/animation 均缩到 `0.00001s`；
- `forced-colors: active` 实测媒体查询命中，按钮与面板使用系统色；测试后已恢复默认媒体状态；
- 同时阻断两张 PNG 后，body 不添加 ready class，纪念图 `naturalWidth=0`，标题、规则、棋盘与交互仍完整；解除阻断后纪念图恢复 `naturalWidth=1448`；
- HTTP 生产路径无横向滚动、远程请求、持久化或控制台异常。

## 6. 视觉 fidelity ledger

| 概念冻结点 | 生产结果 |
| --- | --- |
| 夜班观测台而非通用卡片页 | 哑光暗梅/石墨背景、细铜边和仪器式插孔进入生产；卡片只承担阶段说明 |
| 9 点 10 线双翼星鸢 | 生产层严格生成 9 个稳定按钮与 10 根目标线，完成态拓扑与冻结稿一致 |
| 公共棋盘是主角 | 1504px 桌面棋盘 740px、右栏 320px；核心轮廓明显高于文案权重 |
| 两席同等贡献 | 顶部始终显示 A/B 计数，完成态固定 5/5，无赢家、奖杯或个人总分 |
| 线路可辨而不只靠颜色 | A 为实线+实心端帽，B 为虚线+双环端帽；图例和日志重复编码 |
| 机械插孔与克制发光 | 星点维持实体同心环，只有当前线头和已接线获得有限光晕 |
| 窄屏先行动后棋盘 | 390/320 的 DOM 和视觉都先给当前行动，再给棋盘、图例、日志 |
| 图片不持有规则真相 | 背景可阻断；完成纪念图只在终局显示，目标边和进度继续由 SVG/DOM 生成 |

最终概念稿 [`desktop-complete-concept.png`](./assets/constellation-relay/desktop-complete-concept.png) 与浏览器完成截图均以原始细节查看。概念稿的英文伪标签、装饰螺丝和非生产拓扑没有直接裁切进页面；生产布局保留其材料、层级、等权双席和公共棋盘意图。浏览器截图保存在临时目录，没有作为运行资产提交。

## 7. 借鉴、bugs 与 learn

[`ATTRIBUTION.md`](../experiences/co-op/constellation-relay/ATTRIBUTION.md) 固定并声明五个机制研究来源：MIT 的 Cross-Link `97e2d01…`、robust-segment-intersect `cbf20e2…` 与 Paper.js `92775f5…`，BSD-3-Clause 的 NetworkX `e6dda29…` 与 d3-celestial `7e720a3…`。每项均写明版权主体、只研究的抽象点和未复制范围；运行目录没有复制、改写、翻译、打包或依赖其源码、测试、关卡、数据、UI、素材或文案。Vanta.js 只作为明确排除项记录。

两张生产图由 OpenAI 内置 ImageGen 依据纯文字提示生成，没有输入第三方参考图、开源截图、商业素材、字体、角色或照片。概念、源稿、生产副本、尺寸、哈希和生成边界见 [168 号设计记录](./168-constellation-relay-design.md)。

本轮记录并解决八个问题：

- [配置归一化 API 契约缺口](../bugs/2026-07-21-constellation-relay-config-normalization-api.md)；
- [加载自检误传内部点对象](../bugs/2026-07-21-constellation-relay-internal-point-dto.md)；
- [自定义数组与延迟 Proxy 绕过状态校验](../bugs/2026-07-21-constellation-relay-hostile-state-snapshot.md)；
- [721–829px 双栏横向溢出](../bugs/2026-07-21-constellation-relay-mid-width-overflow.md)；
- [移动视觉顺序与 DOM/Tab 顺序相反](../bugs/2026-07-21-constellation-relay-mobile-dom-order.md)；
- [第十根后焦点停在星点](../bugs/2026-07-21-constellation-relay-result-focus.md)；
- [全局键盘保护漏掉 contenteditable](../bugs/2026-07-21-constellation-relay-editable-key-guard.md)；
- [焦点调度引入禁用的动画帧依赖](../bugs/2026-07-21-constellation-relay-focus-raf.md)。

可复用方法见 [Euler 接力路径：整数相交、后缀可解性与原子重试](../learn/2026-07-21-euler-relay-geometry-and-suffix-solvability.md)。

## 8. 独立提交

| 完成部分 | commit |
| --- | --- |
| 定向调研 | `b2b0764` |
| 可执行规格 | `fa028bd` |
| 视觉与 ImageGen 源稿/生产资产 | `45e5c91` |
| 实施计划 | `43cfc9e` |
| 配置 API 规格修复 | `b4bfef0` |
| 逻辑、配置与 41 项测试 | `6c905ca` |
| 逻辑审查 Bugs 记录 | `bd2c54a` |
| 前端与来源声明 | `81c3428` |
| 前端审查 Bugs 记录 | `60ecfaa` |
| catalog、创意池与目录 Gate | `157076d` |
| learn 沉淀 | `7b294fb` |
| 本验收记录、计划状态、Bug 回归与文档索引 | 本次提交 |

## 9. 发布判断

作品达到 9 点 10 边冻结题面、四条完整路线、四种原子失败、后缀可解性、严格轮换 5/5、完整重放、公开交接、双输入、阶段焦点、坏图降级、A 级静态边界、统一门户、真实浏览器完整生产路径、四档宽度、reduced-motion、forced-colors、视觉对照、固定来源、bugs/learn 与独立提交的当前发布标准。

保留的人工 Gate 是：真实 `file://` 双击、真实浏览器 200% 字体缩放而非等效宽度、读屏器逐句朗读与实体触屏双人交接。它们是自动化或设备能力边界，没有写成已实测。完成本作不等于长期目标完成；后续继续选择下一个未实现候选。
