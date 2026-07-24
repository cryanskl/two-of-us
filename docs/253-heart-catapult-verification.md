# “这一颗，绕回来找你”验收记录

- 验收日期：2026-07-24
- 稳定 ID：`heart-catapult`
- 等级：A，单设备轮流，2 人对抗
- 结论：通过；作品、目录、借鉴声明、bugs 与 learn 已提交

## 1. 交付范围

作品位于
[`experiences/versus/heart-catapult/`](../experiences/versus/heart-catapult/)：

- `config.js`：纯文本产品、席位与公开结语配置；
- `logic.js`：Q12 确定性投射、事件排序、单次反弹、完整轮 reducer 与公开投影；
- `logic.test.js`：规则矩阵、镜像 Oracle、hostile 输入、重放与阶段 DTO；
- `index.html`、`app.js`、`styles.css`：七个权威 phase、十个可见子态和纸雕 Canvas；
- `assets/favicon.svg`：代码原生本地图标；
- `README.md`：玩法、键盘、热座隐私、降级与运行边界；
- `ATTRIBUTION.md`：五个固定 MIT 来源、许可证、权利主体、哈希与零复制声明；
- `package.json`：真实 CommonJS 测试边界。

没有新增 npm 依赖、远程资源、字体、图片、音频、网络、存储、账号、权限、媒体或
传感器。

## 2. 规则、确定性与公平

执行：

```bash
node --check experiences/versus/heart-catapult/app.js
node --test experiences/versus/heart-catapult/logic.test.js
```

结果：`19 / 19` 通过。

覆盖：

- exact 15-key API、30-key 常量、真实浏览器经典脚本与 CommonJS 同构；
- ties-to-even、正负半值、canonical zero、Q12 安全边界；
- 连续线段事件、闭 AABB、同刻优先级和精确最早事件排序；
- `99` 个角度/力度组合与 `198` 个镜像结果；
- 结果分布为 direct / bounce / second-ground / horizontal-exit =
  `23 / 45 / 25 / 6`；
- 五条 golden 轨迹、单次反弹、城堡接触和终止 tick；
- 七 phase、错席、stale revision、旧 token、最大 revision 与 hostile state；
- 第二发完成后才联合计分，达到目标同分则延长，12 轮上限平局；
- JSON clone 历史重放、派生字段防伪和逐阶段 `getPublicView()` 解密。

规则结果只由 `logic.js` 决定；Canvas、动画时长、跳过、降动效或绘制失败都不参与
物理与计分。

## 3. 全仓库与目录

执行：

```bash
node --test shared/runtime/catalog.test.js
npm test
npm run verify
```

结果：

- 目录定向测试 `97 / 97` 通过；
- 全仓库 `1851 / 1851` 通过；
- `58` 个作品入口：`50` 个 A 级直开、`8` 个非 A 启动器；
- `1` 个能力声明；
- 本地资源闭包和借鉴声明完整。

目录同时确认：

- `catalog.json`、门户内嵌目录与对抗类索引都有唯一 `heart-catapult`；
- `level=A`、`installed=true`、`networkRequired=false`；
- 门户重启后显示 58 张卡，新卡有
  `打开《这一颗，绕回来找你》` 可访问名称和正确本地 URL；
- HTML 使用经典相对脚本，本地 CSS 与 favicon 全部存在；
- 运行文件没有远程资源、网络/存储/媒体/传感器 API 或共享目录依赖；
- README 保留直开、联合计分、热座隐私与降级承诺；
- ATTRIBUTION 保留固定 commit 和零代码、零素材复制边界。

新增作品后完整测试曾准确拦住旧 `57 / 49 / 8` 计数，修复为 `58 / 50 / 8`；复发
证据已追加到
[`catalog-count-gate-after-new-experience`](../bugs/2026-07-24-catalog-count-gate-after-new-experience.md)。

## 4. Chrome 真实交互

真实浏览器使用与直开入口相同的静态文件集：

```text
http://127.0.0.1:4173/experiences/versus/heart-catapult/index.html
```

### 4.1 完整热座一轮

Chrome 实际完成：

1. 开始游戏并进入第一位交接；
2. 第一位锁定 `65° / 11.5`；
3. 第二位交接页和瞄准页均不可见第一份参数；
4. 第二位修改草稿后按 Escape，遮罩出现并销毁未锁草稿；
5. 重新接管后恢复默认档位，再锁定 `15° / 8`；
6. reveal-ready 仍不显示两份参数；
7. 第一发只公开 `65° / 11.5`，没有第二份参数；
8. 第二发新增 `15° / 8`，此时比分仍为 `0 / 0`；
9. 查看本轮结果后一次性显示双方摘要并更新为 `1 / 0`。

这条路径验证了十个可见子态中的 intro、两次 handoff、两次 aiming、reveal-ready、
两次 flying 和 round-result。终局与 12 轮平局由生产 reducer 的自动化轨迹覆盖。

### 4.2 隐私、焦点和失败边界

- 初次打开聚焦唯一产品 `h1`，后续 phase 聚焦当前 `h2`；
- aiming 标题后的自然第一次 Tab 进入“角度”range；
- 两个 slider 的可访问名称为“角度”“力度”；
- 四个步进按钮视觉为“− / +”，可访问名称仍是完整中文动作；
- 遮罩期间游戏根节点同时为 `inert` 和 `aria-hidden="true"`；
- 遮罩标题接收焦点，页面恢复可见时补偿焦点，继续后返回 phase 标题；
- `requestAnimationFrame`、取消和 Canvas 绘制均有失败降级与单次 `settled` 守卫；
- 正常结束、跳过、减少动态和失败路径共享同一个业务结算入口。

最终 Chrome warning/error 日志为 `[]`。

### 4.3 响应式与颜色

实测视口：`320×568`、`390×844`、`768×1024`、`1280×800`、`1728×1000` 与
`844×390`。全部满足：

```text
document.documentElement.scrollWidth === innerWidth
```

关键量化结果：

- 390×844 开场主动作底边为 `771.63px`，尺寸 `330×49.59px`；
- 1280×800 瞄准主动作底边为 `698.75px`；
- 四个步进目标均为 `48×48px`；
- 960×540 逻辑 Canvas 始终按 16:9 响应式缩放。

品牌色对比度：

```text
ink-night / paper-warm   11.32 : 1
paper-warm / heart-berry  4.91 : 1
honey-glow / ink-night    6.33 : 1
```

CDP 媒体仿真确认 `prefers-reduced-motion: reduce` 与 `forced-colors: active` 同时命中；
强制色下标题、说明、按钮和页脚均使用系统色并保持可见。临时媒体与 viewport 覆盖
在验收后已 reset。

### 4.4 A 级直开与工具限制

HTML 只按顺序加载：

```text
./styles.css
./config.js
./logic.js
./app.js
```

所有引用均为相对本地文件，没有 module、base、远程 URL 或仓库外资源。仓库 A 级
合同递归验证入口、CSS、SVG 和脚本闭包，因此结构上支持双击 `index.html`。

Chrome 自动化的 URL 安全策略明确拒绝 `file://`，并禁止通过 CDP 或其他表面绕过。
本次没有把 localhost 实玩冒充为 file 导航通过；人工交付时仍保留一次真实双击作为
环境侧补充 Gate。该限制属于验收工具，不是作品代码错误。

## 5. 视觉 fidelity

| 冻结设计项 | 实现证据 | 结果 |
| --- | --- | --- |
| 连续纸雕贺卡 | 单张暖纸、中央折痕、左右比分折页和城堡 Canvas | 通过 |
| 回弹缝线 signature | 舞台软垫、纸面虚线和结果分隔统一使用 sage stitch | 通过 |
| 五色系统 | 只使用五个令牌及透明派生；强制色改用系统色 | 通过 |
| 阶段私密 | 每阶段重建 DOM，只渲染 `getPublicView()` | 通过 |
| 唯一主动作 | 每个 phase 至多一个莓红主按钮 | 通过 |
| 响应式 | 六档视口零横向溢出，手机开场动作在首屏 | 通过 |
| 降动效/失败 | 动画即时结算，Canvas 失败显示同一文字结果 | 通过 |

没有引入 ImageGen 或第三方视觉资产；favicon、场地、城堡、爱心和轨迹均为代码原生。

## 6. 借鉴与来源声明

只研究五个 MIT 项目的抽象机制：

- `tridpt/TwoPlayerGames@c96b802`：瞄准、飞行、结算与换手阶段；
- `niccolofanton/tanks-game@e4eb4c6`：显式反弹预算与离散穿入反例；
- `liabru/matter-js@acb99b6`：物理/渲染分层；
- `schteppe/p2.js@2beb275`：固定步与展示插值分离；
- `jriecken/sat-js@20e6126`：碰撞检测与响应分层。

完整许可证、版权主体、LICENSE SHA-256 和未复制范围见
[`ATTRIBUTION.md`](../experiences/versus/heart-catapult/ATTRIBUTION.md)。本作没有复制、
改写、翻译、移植、链接或打包五个来源的代码、API、参数、测试、素材、品牌、规则
原句或界面。

## 7. Bugs 与学习沉淀

已记录并修复：

- 逻辑：碰撞事件排序、反弹速度源、轮次上限、负零 ties-to-even；
- 设计：aiming 初始焦点合同、文档编号漂移；
- 交互：Canvas/动画失败、遮罩焦点、阶段历史泄露、slider 名称；
- 视觉：生成内容名称、步进文字换行、手机首屏、CJK `ch` 换行、强制色文字；
- 接入：目录精确计数 Gate 复发。

完整列表见 [`bugs/README.md`](../bugs/README.md)。

可复用结论见：

- [`public-view-animation-and-privacy-lifecycle`](../learn/2026-07-24-public-view-animation-and-privacy-lifecycle.md)：
  阶段公开投影、播放幂等、Canvas 降级与遮罩生命周期；
- [`rule-authority-before-motion`](../learn/2026-07-18-rule-authority-before-motion.md)：
  规则先于动画、固定步与连续碰撞；
- [`stage-owned-dom-and-playback-tokens`](../learn/2026-07-17-stage-owned-dom-and-playback-tokens.md)：
  阶段拥有 DOM 与播放 token。

## 8. 独立提交

```text
19d3987 docs: research heart catapult duel
2553387 docs: specify heart catapult duel
d1b48ff docs: plan heart catapult implementation
f845b13 feat: add heart catapult logic
995699f docs: design heart catapult interface
04d903f feat: add heart catapult interaction
16252f4 fix: stabilize heart catapult step button names
6fcfebf feat: style heart catapult
58189cc feat: catalog heart catapult
4441c14 docs: capture hot-seat playback lifecycle learnings
```

逻辑、设计、交互、语义修复、视觉、目录和学习沉淀均可独立回退；bugs 也按发现阶段
单独提交。本验收记录另作最后一个文档提交。

## 9. 剩余边界

- 正常热座只防正常交接时的视觉泄露，不抵御主动检查开发者工具或进程内存；
- 刷新或关闭会清空对局，不提供存档、恢复、统计、导出或联网；
- Chrome 自动化不允许 file 导航，真实双击属于人工环境补充项；
- 当前未发现未解决的项目代码缺陷。
