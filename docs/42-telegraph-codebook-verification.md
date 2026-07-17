# 「默契电报码」实现与验收记录

## 1. 结论

「默契电报码」已作为 A 级双人合作作品接入门户。作品可直接打开本地 HTML，不需要安装依赖、账号或公网；六码本、四轮交替发送、三拍封存、交接遮挡、逐拍播放、一次重听、四选一译码、四类结果、共同分与重新开始均已实现。

本批提交：

- `bc8fbeb`：玩法规格、视觉概念与文档索引；
- `7b86b15`：运行页、纯逻辑、catalog、门户、测试、响应式修复与来源声明；
- 本文所在提交：验收截图、bug 记录与学习沉淀。

## 2. 自动 Gate

### 2.1 作品纯逻辑

`node --test experiences/co-op/telegraph-codebook/logic.test.js`：9 / 9 通过，覆盖：

- 固定六码本的六种唯一编码与深冻结；
- senderHandoff / sending / receiverHandoff / playback / guessing / result Gate；
- 三拍上限、撤回和恰好三拍封存；
- 过期 playback token 拒绝推进与一次重听上限；
- `delivered / encodingError / decodingError / bothError` 四类结果；
- 四轮目标、候选、交替推进与最后完成；
- 可注入洗牌、异常随机回退和畸形状态安全。

### 2.2 整仓

- `npm test`：273 / 273 通过；
- `npm run verify`：23 个作品入口、1 个能力声明、资源与借鉴声明完整；
- `git diff --check`：通过；
- `rg 'gradient\(' experiences/co-op/telegraph-codebook`：无匹配；
- catalog 静态检查确认没有 Module、远程 URL、网络、存储与 Service Worker API；HTML 没有硬编码六个目标词。

## 3. 真实浏览器全流程

先按仓库前端验收规则尝试内置 Browser/IAB；本次环境的旧插件缓存路径失效，重建连接后仍返回 `No browser is available`，因此使用 Playwright CLI 的 headed Chromium 作为明确 fallback。Playwright CLI 本身会阻止 `file://` 导航，所以交互验收通过 `python3 -m http.server 4177 --bind 127.0.0.1` 服务同一目录；A 级直开边界由经典脚本、相对资源、无远程 URL/网络 API 与 catalog Gate 单独证明。

完整四轮实际结果：

| 轮次 | 角色 | 发送 | 译码 | 结果 |
| --- | --- | --- | --- | --- |
| 1 | 珊瑚方 | 云朵 `·——`，正确 | 选择云朵 | `delivered`，共同分 1 |
| 2 | 青绿方 | 热茶目标，实际发送 `···` | 选择热茶 | `encodingError`，不加分 |
| 3 | 珊瑚方 | 散步 `——·`，正确 | 选择电影 | `decodingError`，不加分 |
| 4 | 青绿方 | 电影 `—·—`，正确 | 选择电影 | `delivered`，共同分 2 |

浏览器同时验证：

- 珊瑚方 / 青绿方严格交替；
- `S / L + Enter` 键盘发送可完成；
- 接收方重听一次后按钮显示“重听机会已用”并 disabled；
- receiverHandoff 的页面文本与完整 DOM 不包含本轮“云朵”、其标准报码或已发完整序列；
- playback 与 guessing 的三盏灯恢复等待态，猜测页只出现四个候选；
- 最终显示 2 / 4，并明确“只记录今晚的报码，不评价你们的关系”；
- favicon 修复后新会话浏览器控制台无错误；
- 网络记录只有同源 `index.html / styles.css / logic.js / app.js`，没有外部请求。

## 4. 响应式与触控

| 视口 | 结果 |
| --- | --- |
| 1503×1046 | `scrollWidth = innerWidth = 1503`，`scrollHeight = innerHeight = 1046`；概念原生尺寸首屏完整 |
| 390×844 | intro `scrollWidth = 390`、`scrollHeight = 844`；码本、标题与主动作完整在首屏 |
| 320×760 | intro `scrollWidth = 320`、`scrollHeight = 764`；只有 4px 纵向余量，无横向溢出 |
| 320×760 sending | 两枚电键高度 116px，撤回/封存高度 52px，全部超过 48px 触控 Gate |

窄屏 intro 有一项有意适配：先显示六码本、目标牌和“开始守台”，把禁用的表盘、灯带和双键延后到开局后出现，避免主动作落到深折叠区。它不改变桌面构图或玩法状态。

截图：

- [1503×1046 桌面 intro](assets/telegraph-codebook/implementation-desktop.png)
- [390×844 移动端 intro](assets/telegraph-codebook/implementation-mobile-390.png)
- [320×760 移动端 intro](assets/telegraph-codebook/implementation-mobile-320.png)
- [320×760 移动端发送控制](assets/telegraph-codebook/implementation-mobile-sending-320.png)

## 5. 视觉忠实度账本

概念：[1503×1046 深夜双人无线电台](assets/telegraph-codebook/concept.png)。最终 QA 在同一次检查中以 `view_image` 原生尺寸并排查看概念与最新 Chromium 截图。

| 比较点 | 概念证据 | 实现证据与处理 |
| --- | --- | --- |
| 背景与色板 | 深汽油蓝、奶油字、黄铜线、珊瑚/薄荷双色 | 固定 token 对齐；无 CSS 渐变，纯色与阴影形成层次 |
| 标题层级 | 左上超大宋体标题、安静顶栏 | H1 比例、位置与留白一致；状态与共同分保持左右平衡 |
| 码本侧轨 | 左侧贯穿设备的六行码本 | 六行顺序、分隔线、短长符号和窄轨比例一致 |
| 中央仪表 | 目标牌、琥珀表盘、三拍灯带 | 全部代码原生复现，并随阶段安全改变内容 |
| 双电键 | 珊瑚与薄荷金属电键是主视觉 | CSS 电键保留杆、旋钮、底座和按下位移，按钮语义与触控面积真实可用 |
| 主动作层级 | 封存/开始是唯一高强调动作 | 珊瑚主动作、黄铜描边和 disabled 状态保持相同层级 |
| 移动端 | 单列仪表与纵向双键 | 390/320 独立截图验证堆叠；intro 为首屏任务做阶段性收敛 |

### 有意偏差

- 概念展示发送阶段，最终桌面对比截图展示 intro；发送阶段在单独实玩和移动截图中验证，intro 不提前泄露随机目标；
- 概念有更丰富的真实金属、杯子与纸册道具。实现没有把生成图裁成运行资产，而使用轻量 CSS 仪表，保持 A 级目录可复制、文字可访问、控件可交互；这是规格中“概念图不作为运行依赖”的明确边界；
- 概念把手机作为桌面画面右侧插图，实际交付改为独立 390/320 响应式页面，不在桌面重复绘制假手机；
- 320/390 intro 隐藏尚不可用的表盘、灯带和双键，使“记码本 → 开始”成为首屏唯一任务。

以上偏差都有功能或本地优先理由；构图、色板、类型层级和核心仪表语言达到可签收忠实度。

## 6. 缺陷与沉淀

- [空码本侧轨覆盖 hidden 语义](../bugs/2026-07-17-telegraph-hidden-semantics.md)
- [缺失 favicon 导致控制台 404](../bugs/2026-07-17-telegraph-favicon-404.md)
- [390px intro 主动作落到过深位置](../bugs/2026-07-17-telegraph-mobile-intro-depth.md)
- [阶段拥有 DOM 与播放 token 的热座秘密模型](../learn/2026-07-17-stage-owned-dom-and-playback-tokens.md)

## 7. 借鉴与来源复核

运行代码、规则、词表、视觉组件、文案和测试均为仓库原创。只借鉴短 / 长脉冲编码、Fisher–Yates 洗牌和 Web Audio 的通用知识，没有参考或复制特定开源项目。视觉概念由 OpenAI ImageGen 生成，只作设计基准，不进入运行时。完整声明见作品 [`README.md`](../experiences/co-op/telegraph-codebook/README.md) 与 [`assets/ATTRIBUTION.md`](../experiences/co-op/telegraph-codebook/assets/ATTRIBUTION.md)。
