# Two of Us 文档总览

这个目录把仓库规范、全网调研、创意池和第三方引入规则放在一起。调研快照日期为 **2026-07-15**；上游仓库会继续变化，真正引入前必须重新核验 commit、许可证和资源依赖。

## 文档地图

| 文档 | 用途 |
| --- | --- |
| [01-classification-spec.md](./01-classification-spec.md) | 主分类、标签、目录规范、本轮范围和验收标准 |
| [02-research-method.md](./02-research-method.md) | 调研字段、信息源优先级和推荐口径 |
| [03-local-first-research-spec.md](./03-local-first-research-spec.md) | 第二轮 A–D 本地优先调研范围、字段与证据 Gate |
| [04-implementation-program-spec.md](./04-implementation-program-spec.md) | 统一依赖、一键启动与分批建设计划 |
| [05-reference-and-attribution-spec.md](./05-reference-and-attribution-spec.md) | 所有参考项目的借鉴与来源声明规范 |
| [06-together-lock-spec.md](./06-together-lock-spec.md) | 首款 C 级双设备合作作品的 brainstorm、状态机与验收标准 |
| [07-lan-pictionary-spec.md](./07-lan-pictionary-spec.md) | 局域网你画我猜的隐藏信息协议、主机权威状态机与验收标准 |
| [08-scratch-surprise-spec.md](./08-scratch-surprise-spec.md) | A 级爱的刮刮卡的遮罩擦除、可访问降级与来源声明规格 |
| [09-lan-connect-four-spec.md](./09-lan-connect-four-spec.md) | 首个 C 级双设备对抗作品的棋盘状态、主机权威协议与来源声明规格 |
| [10-surprise-research.md](./10-surprise-research.md) | 41 个惊喜类许可明确/灵感候选与优先顺序 |
| [11-date-wheel-spec.md](./11-date-wheel-spec.md) | A 级约会转盘的等概率选择、SVG 角度、配置与来源声明规格 |
| [12-sealed-rps-spec.md](./12-sealed-rps-spec.md) | C 级密封猜拳的可信本机裁判、秘密提交、同步揭晓与信任边界规格 |
| [13-panorama-memory-spec.md](./13-panorama-memory-spec.md) | 首个 B 级全景回忆作品的本地 vendor、私人照片、对象 URL 与 WebGL 生命周期规格 |
| [14-panorama-memory-verification.md](./14-panorama-memory-verification.md) | 全景回忆的自动检查、Chrome 流程、资源回收与视觉忠实度证据 |
| [15-photo-swap-puzzle-spec.md](./15-photo-swap-puzzle-spec.md) | A 级私人照片交换拼图的文件导入、中心裁切、排列状态机与 blob 生命周期规格 |
| [16-photo-swap-puzzle-verification.md](./16-photo-swap-puzzle-verification.md) | 私人照片交换拼图的自动检查、Chrome 流程、资源回收与视觉忠实度证据 |
| [17-compatibility-quiz-spec.md](./17-compatibility-quiz-spec.md) | C 级双设备默契问答的密封选择、两人房间、状态机与来源声明规格 |
| [18-compatibility-quiz-design.md](./18-compatibility-quiz-design.md) | “和你一样”的桌面作答、揭晓、移动端状态与视觉令牌规格 |
| [19-compatibility-quiz-verification.md](./19-compatibility-quiz-verification.md) | “和你一样”的自动检查、Chrome 双端流程、响应式与视觉忠实度证据 |
| [20-co-op-research.md](./20-co-op-research.md) | 你画我猜、双人解谜、卡牌、拼图等合作候选 |
| [21-ribbon-tug-spec.md](./21-ribbon-tug-spec.md) | A 级“心动拔河”的固定步长、公平输入 Gate、视觉方向与验收规格 |
| [22-ribbon-tug-verification.md](./22-ribbon-tug-verification.md) | “心动拔河”的自动检查、Chrome 实玩、响应式与坐标忠实度证据 |
| [23-heart-sprint-spec.md](./23-heart-sprint-spec.md) | C 级“心跳冲刺”的手机控制器、主机权威输入、视觉概念与验收规格 |
| [30-versus-research.md](./30-versus-research.md) | 24 个共享壳玩法与 13 个独立对抗项目 |
| [40-idea-backlog.md](./40-idea-backlog.md) | 三类各 20 个、共 60 个适合自行实现的创意 |
| [50-license-and-import-guide.md](./50-license-and-import-guide.md) | 许可证、素材、离线化、隐私和引入检查清单 |
| [60-local-first-second-pass-research.md](./60-local-first-second-pass-research.md) | A–D 全量候选、横纵向比较、实现优先级与来源声明建议 |

持续建设期间，已复现缺陷记录在 [`bugs/`](../bugs/)，可跨作品复用的知识记录在 [`learn/`](../learn/)。

## 这轮得出的核心判断

### 1. 本地优先，不限于双击 HTML

核心承诺是默认本地运行、无需账号、私人内容不上传。不同玩法按启动方式分为四级：A 双击 HTML，B 双击启动器运行本地服务，C 同一局域网双设备，D 本地 AI/语音/3D 等重型体验。四级都可进入仓库；必须依赖公网且没有本地替代的项目通常只作灵感。

### 2. 三种首批样板已经实现

如果下一轮开始开发，建议各分类先选一个：

| 分类 | 已实现样板 | 当前结果 |
| --- | --- | --- |
| 单人惊喜 | [拆信封告白](../experiences/surprises/memory-letter/) | 建立可编辑 `config.js`、分段回忆与结尾邀请流程 |
| 双人合作 | [同机你画我猜](../experiences/co-op/hot-seat-pictionary/) | 建立 Canvas、热座遮挡、计时和共同计分样板 |
| 双人对抗 | [反应力对决](../experiences/versus/reaction-duel/) 与 [心动拔河](../experiences/versus/ribbon-tug/) | 建立抢跑判定，并补齐固定步长、同帧公平结算和持续双人输入样板 |

根 `index.html` 现在是统一门户：直接双击时读取内置目录；通过启动器打开时读取本地 API，并显示局域网二维码。

### 3. 玩法可以借鉴，代码不能默认复制

本轮优先记录 MIT、Apache-2.0、ISC、MPL 和 GPL 项目。没有正式许可证的仓库只保留链接与机制描述。即使代码可复制，图片、GIF、字体、音效和音乐仍要单独核验。

### 4. 本地启动是独立验收项

在线 demo 正常不代表本地可用。每个正式收录作品都要声明 A–D 等级和公网依赖，并按对应路径验收：A 验证 `file://`，B 验证一键启动与退出，C 验证同一局域网加入，D 验证运行时、模型、权限和硬件要求。

## 当前仓库状态

- 已收录：Love Tree、慢慢打开的信、爱的刮刮卡、今晚做什么、回到那一天、拼回这一刻、同机你画我猜、反应力对决、心动拔河、同心解锁、隔屏画猜、和你一样、连心四子棋、密封猜拳；
- 已建立：`surprises / co-op / versus` 三类目录；
- 已建立：Node 18+ 统一安装、跨平台启动器、Socket.IO 房间协议和本地二维码；
- 已归档：原始 RAR 和与项目不匹配的 Azure workflow；
- 已执行：八个无第三方运行依赖的独立 A 级样板，其中爱的刮刮卡覆盖 Canvas 遮罩与可访问降级，今晚做什么覆盖 SVG 与等概率选择，拼回这一刻覆盖私人照片预处理与交换拼图状态机，心动拔河覆盖固定步长与公平双人输入；
- 已实现首个 C 级样板：同心解锁，复用共享房间协议完成双设备同时按住机关；
- 已实现第二个 C 级样板：隔屏画猜，增加主机权威状态、定向秘密消息与归一化笔迹同步；
- 已实现首个 C 级对抗样板：连心四子棋，增加确定性棋盘 reducer、轮流落子和双端胜负同步；
- 已实现首个 C 级秘密同时选择样板：密封猜拳，增加可信本机裁判、两端同时揭晓与结果复算；
- 已实现首个 C 级密封合作问答：和你一样，增加固定双选题库、双方私密作答、乱序状态门控与中性默契计分；
- 已实现首个 B 级样板：回到那一天，增加精确浏览器依赖映射、本机照片 Gate 与对象 URL 生命周期；
- 下一批：C 级手机控制器实时对抗、双人解谜，或 D 级本地语音体验的能力验证；
- 尚未决定：整个仓库的统一许可证，以及 LoveTree 商业音乐的替换方案。

## 下一轮选题时的最小输入

只需从文档中指定一个候选或创意，并确认：

- 惊喜 / 合作 / 对抗；
- 目标本地启动等级 A / B / C / D；
- 主机平台、参与设备数量和浏览器范围；
- 是否使用真实照片、音乐与私人文案；
- 是否包含本地 AI、语音、3D 或大型资源；
- 是参考机制自行实现，还是评估引入开源代码。

然后为该单一作品走 brainstorm → spec → plan → 实现，不同时启动多个作品。
