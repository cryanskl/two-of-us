# “这一串，我还记得”验收记录

- 日期：2026-07-19
- 结论：通过，可作为 A 级本地直开双人对抗作品收录
- 作品入口：[`../experiences/versus/memory-bid/index.html`](../experiences/versus/memory-bid/index.html)
- 规格：[`127-memory-bid-spec.md`](./127-memory-bid-spec.md)
- 视觉：[`128-memory-bid-design.md`](./128-memory-bid-design.md)
- 计划：[`129-memory-bid-plan.md`](./129-memory-bid-plan.md)

## 1. 发布结果

“这一串，我还记得”已经完成逻辑、前端、目录、借鉴声明、bugs、learn 与最终浏览器闭环。作品使用经典脚本和相对本地资源，不需要依赖安装、服务、账号或网络；默认配置可直接完成完整四轮，也可只改 `config.js` 的纯文本结语策略。

正式赛制固定四轮，双方各先开价两次；2–2 是正式平局，不临时增加不对称加赛。每轮八件中六种齐全、两种各重复一次且没有相邻相同；公开升价 2–8，最高报价者证明前缀，成功自己得分，首错或认输则对方得分。

## 2. 自动检查

| 检查 | 结果 |
| --- | --- |
| `node --check experiences/versus/memory-bid/app.js` | 通过 |
| `node --test experiences/versus/memory-bid/logic.test.js` | 26 / 26 通过 |
| `node --test shared/runtime/catalog.test.js` | 71 / 71 通过 |
| `npm test` | 1213 / 1213 通过 |
| `npm run verify` | 通过：47 个作品入口、1 个能力声明 |
| `git diff --check` | 通过 |

26 项逻辑测试覆盖：

- 冻结 API、配置、初始状态与 JSON 往返；
- 固定 seed 已知向量与 512 个 seed 的结构约束；
- 自动 show/hide、手动逐件、暂停/恢复与旧 generation；
- 首报 2–8、严格升价、换手、退出与上限自动锁定；
- 重复物件证明、指定删除、清空、未满、成功、首错与认输；
- 4–0、3–1、2–2、1–3、0–4 与双方获胜；
- public view 精确字段、竞价/证明/终局无答案、重放与深克隆隔离；
- 畸形 action、getter、symbol、原型、多余字段、伪造得分/答案/generation 与配置策略回退。

目录门禁另外固定：A 级、单设备轮流、无公网、经典脚本、无远程资源、无网络/存储/Worker/音频/传感器、无共享运行时、`replaceChildren()`、页面隐藏生命周期、公开 view、两张生产资产、四个固定开源提交、零代码/零素材声明和竞价终点读屏文案。

## 3. A 级本地边界

Codex In-app Browser 的安全层拒绝自动导航到 `file://`，因此没有把该工具拒绝冒充为页面失败。A 级合同由以下证据共同确认：

- `index.html` 只按 `config.js → logic.js → app.js` 加载同目录经典脚本，没有 `type="module"`；
- HTML、CSS 与脚本运行资源全部是相对路径；
- 运行源不含 `fetch`、XHR、WebSocket、Storage、IndexedDB、Service Worker、Worker、FileReader、媒体设备、运动传感器或 AudioContext；
- 不引用 `shared/`，整个 `memory-bid` 目录可独立复制；
- 同一组未构建静态文件通过 localhost 完成全部浏览器实玩；
- `npm run verify` 确认入口、README、借鉴声明和资源均存在。

因此用户仍可直接双击作品 `index.html`；localhost 只用于自动化工具访问相同文件，不是作品运行依赖。

## 4. 完整实玩路径

### 4.1 手动展示与 2–2 终局

真实浏览器完成一场四轮：

1. 第 1 轮：你报 8，连续摆入八张旧车票，首件即错，TA 得分；
2. 第 2 轮：TA 报 2，你退出，TA 连续摆入两张旧车票，首件即错，你得分；
3. 第 3 轮：你报 8 后主动认输，TA 得分；
4. 第 4 轮：TA 报 2，你退出，TA 主动认输，你得分。

终局精确显示 `2 · 2`、“平局也是正式结果”和四行账簿；四轮先手为你 / TA / 你 / TA。终局 DOM 有 4 行结果、0 个 `.sequence-item`，没有 `data-sequence`、`data-seed` 或 `data-answer` 一类属性；重开按钮完整可见。

另一路四轮全部报 8 后认输，也得到对称 2–2，证明上限自动锁定、换轮和终局不依赖填写证明。

### 4.2 自动展示生命周期

- 第一件自动显示时可点击“先停一下”；
- 暂停前是第 `1 / 8` 件，物件可见；暂停后物件立即删除，只显示“旧物已经盖住”；
- 等待 1.5 秒后仍为第 `1 / 8` 件，没有被旧计时推进；
- 点击“继续看这一件”后从同一件恢复，约 10.5 秒后完整进入竞价；
- 竞价阶段没有 `.item-portrait`、`.sequence-item` 或答案式属性；
- live region 精确更新为“八件旧物已经收好，开始竞价。”，不保留展示阶段旧消息。

### 4.3 键盘证明

在证明阶段以候选按钮为焦点：

- 数字键 `1`：草稿从 0 增至 1；
- Backspace：草稿从 1 回到 0；
- 数字键 `2`、`3`：草稿增至 2；
- Escape：草稿从 2 清到 0；
- 焦点回到可继续选择的候选按钮，页面无横向位移。

## 5. 响应式矩阵

| 视口与状态 | 量化结果 | 结论 |
| --- | --- | --- |
| 1586×992 bidding | `scrollWidth=1586`、`scrollHeight=992`、三栏 `257.758 / 558.477 / 257.766px`、答案节点 0 | 约 24 / 52 / 24，完整首屏 |
| 1280×800 proof | `scrollY=0`、`scrollHeight=800`；顶部 8–90、账簿 102–693、提交 556–596、认输 603–643、隐私底 724.57px | 最高报价全部动作可见 |
| 768×1024 proof | `scrollWidth=768`、`scrollHeight=1024`；提交底 844.45、认输底 900.45、最小按钮 46px | 平板单列完整 |
| 390×844 proof | `scrollWidth=390`、`scrollHeight=875`；提交与认输均在首屏；候选 171.5×77px、槽位高 82px | 5+3 槽、2×3 候选、主动作可见 |
| 320×700 proof | `scrollWidth=320`、`scrollHeight=874`、最小按钮 46px；提交从 675px 开始 | 允许纵向滚动，零横向溢出 |

移动标题修复后：390px 为 19.5px / 21.05px 单行，320px 为 16.8px / 18.14px 单行；不再把最后一个“得”挤成孤行。

## 6. 图片与故障回退

### 6.1 正常资产

- 六个证明按钮的精灵在 1280×800 为 `72×72`；
- 背景位置依次为 `0% 0%`、`50% 0%`、`100% 0%`、`0% 100%`、`50% 100%`、`100% 100%`；
- 生产背景 SHA-256：`204eb66cb52cee0ba2c87810df7d91e60838ab2d0e029794d906e7fe39e28531`；
- 生产图集 SHA-256：`ff8ded1e60e8b96086995619afe5ded1e8eddba650817e8462f3a3fd6493fcb8`，真实 alpha 范围 `0..255`。

### 6.2 无图四轮

在干净工作树中把背景与图集两条 CSS URL 临时精确替换为 `none`，390×844 重载后：

- body 与 sprite 的计算背景均为 `none`；
- 六个编号与名称全部存在；
- sprite 保持 `60×60`，`::before` 有 3px solid 轮廓；
- 页面横向溢出为 0；
- 无图状态完整完成四轮，进入 `match-result`，显示 2·2 与四行账簿。

随后用反向精确补丁恢复两条 URL，重载确认背景与图集重新加载；`git diff --exit-code` 与 `git status --short` 均为空，故障注入没有留在仓库。

## 7. 可访问性与媒体偏好

- 原生按钮承担所有动作，阶段标题在切换后接收焦点；
- 比分、报价、首错、成功和认输都有完整文字，不只靠颜色；
- proof 槽位有顺序号，已填槽可点击删除且有完整 `aria-label`；
- live region 在无消息帧会清空旧文本，阶段终点有专门竞价播报；
- 320px 与 390px 的按钮不低于 46px；
- `prefers-reduced-motion: reduce` 把动画与过渡压到 `.001ms`，自动展示规则计时不变，手动模式提供无自动切换等价路径；
- `forced-colors: active` 移除背景图和精灵图，以 `CanvasText` 2px 边框、编号、名称、顺序号及 3px 占位轮廓保留全部规则。

In-app Browser 没有媒体偏好覆盖能力，因此 reduced motion 与 forced colors 以 CSS 分支静态核对、手动等价路径和真实无图四轮联合验收；没有伪称执行了工具不支持的 OS 级模拟。浏览器日志最终为空数组，无 warning / error。

## 8. 视觉 fidelity 对照

同一 QA 轮次用原始尺寸 `view_image` 打开三张冻结概念，并立即对照最新的 1586×992 bidding、390×844 proof 与 1586×992 match-result 浏览器截图。

| 概念真源 | 实际结果 | 判定 |
| --- | --- | --- |
| 墨蓝顶部、左标题、右比分/轮线 | 实际保持单一安静横栏，无导航、badge 或第二标题 | 通过 |
| 竞价账页 24 / 52 / 24 | 计算列为 257.758 / 558.477 / 257.766px | 通过 |
| 暗红票签作为主要承诺 | 当前首个合法报价和主动作使用暗红 + 黄铜内边 | 通过 |
| 六件写实旅行旧物 | 透明 3×2 图集，六格位置正确，并保留编号/名称 | 通过 |
| 移动证明槽 + 2×3 候选 | 实际八格按 5+3 换行，候选固定 2×3，提交首屏可见 | 通过 |
| 终局左结果、右四轮账簿 | 实际 46 / 54 双栏、四行复盘、下方结语与重开 | 通过 |
| 墨蓝木桌与边缘金属件 | 原生产背景直接显示，中央不与账簿争夺 | 通过 |
| 勾/警示形状加文字 | 结果与账簿使用形状、完整结果词和得分者 | 通过 |
| 羊皮纸与细黄铜线 | 实际使用不透明暖纸、低圆角、细边和中缝 | 通过 |
| 概念时间戳/英文票据需拒绝 | 运行 DOM 没有时间、英文装饰、倒计时、奖杯或排行榜 | 通过 |
| 图片不能承载规则 | 无图完整完成四轮并正常结算 | 通过 |

实际实现比概念更克制：删除了 22:14 / 22:15、英文车票、装饰物件行、霓虹焦点和奖杯；移动概念的 1844px 宽松高度压缩为 390×844 首屏主提交可见。整体仍保持同一深夜铁路失物账簿语言，达到发布 sign-off。

## 9. 来源、bugs 与 learn

借鉴声明完整列出四个固定研究版本、MIT、权利主体、只研究范围、Hasbro 商业表达边界、平台规范、ImageGen 无第三方输入、处理参数与全部哈希。README 自身也有可独立阅读的来源摘要，不只跳转详版。

本批次记录五个已修复问题：

- [`../bugs/2026-07-19-memory-bid-chroma-python-runtime.md`](../bugs/2026-07-19-memory-bid-chroma-python-runtime.md)
- [`../bugs/2026-07-19-memory-bid-sprite-grid-collapse.md`](../bugs/2026-07-19-memory-bid-sprite-grid-collapse.md)
- [`../bugs/2026-07-19-memory-bid-proof-desktop-overflow.md`](../bugs/2026-07-19-memory-bid-proof-desktop-overflow.md)
- [`../bugs/2026-07-19-memory-bid-stale-live-announcement.md`](../bugs/2026-07-19-memory-bid-stale-live-announcement.md)
- [`../bugs/2026-07-19-memory-bid-mobile-title-orphan.md`](../bugs/2026-07-19-memory-bid-mobile-title-orphan.md)

可复用结论沉淀为 [`../learn/2026-07-19-even-round-open-bidding-and-playback-generation.md`](../learn/2026-07-19-even-round-open-bidding-and-playback-generation.md)：偶数轮先手对称、公开升价证明责任、受约束序列、播放 generation 与阶段公开投影。

## 10. 发布 Gate

- [x] 默认配置可直接完成四轮；
- [x] 自动与手动展示均可用，暂停不偷跑；
- [x] 双方各先手两次，2–2 正式平局；
- [x] 上限报价、退出、成功、首错、认输和重开可达；
- [x] 竞价/证明/终局 DOM 不泄露未公开序列；
- [x] 1586、1280、768、390、320 五档无横向溢出；
- [x] 390 主提交首屏可见，320 保持可滚动与 46px 控件；
- [x] 数字键、Backspace、Escape 与阶段焦点可用；
- [x] 无图完整完成四轮；
- [x] reduced motion、forced colors、live region 与非颜色反馈合同完整；
- [x] 26 项逻辑、71 项目录、1213 项全仓与 47 入口校验通过；
- [x] 三张概念与三张最新实装截图同轮对照达到 sign-off；
- [x] 借鉴声明、bugs 与 learn 完整。

