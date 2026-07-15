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
| [10-surprise-research.md](./10-surprise-research.md) | 41 个惊喜类许可明确/灵感候选与优先顺序 |
| [20-co-op-research.md](./20-co-op-research.md) | 你画我猜、双人解谜、卡牌、拼图等合作候选 |
| [30-versus-research.md](./30-versus-research.md) | 24 个共享壳玩法与 13 个独立对抗项目 |
| [40-idea-backlog.md](./40-idea-backlog.md) | 三类各 20 个、共 60 个适合自行实现的创意 |
| [50-license-and-import-guide.md](./50-license-and-import-guide.md) | 许可证、素材、离线化、隐私和引入检查清单 |

持续建设期间，已复现缺陷记录在 [`bugs/`](../bugs/)，可跨作品复用的知识记录在 [`learn/`](../learn/)。

## 这轮得出的核心判断

### 1. 本地优先，不限于双击 HTML

核心承诺是默认本地运行、无需账号、私人内容不上传。不同玩法按启动方式分为四级：A 双击 HTML，B 双击启动器运行本地服务，C 同一局域网双设备，D 本地 AI/语音/3D 等重型体验。四级都可进入仓库；必须依赖公网且没有本地替代的项目通常只作灵感。

### 2. 先实现三种样板

如果下一轮开始开发，建议各分类先选一个：

| 分类 | 首个建议 | 理由 |
| --- | --- | --- |
| 单人惊喜 | 拆信封告白 | 小而完整，能建立统一 `config.js` 和素材规范 |
| 双人合作 | 你画我猜 | A 级热座版可先建立 Canvas 与交接遮挡；之后可扩展 C 级局域网双设备 |
| 双人对抗 | 反应力对决 | 体积小，能建立双人按键、计分、重开和赛后反馈样板 |

完成这三个样板后，再决定是否做统一作品启动器。当前根 `index.html` 继续直达 LoveTree，避免只有一个作品时先做空壳门户。

### 3. 玩法可以借鉴，代码不能默认复制

本轮优先记录 MIT、Apache-2.0、ISC、MPL 和 GPL 项目。没有正式许可证的仓库只保留链接与机制描述。即使代码可复制，图片、GIF、字体、音效和音乐仍要单独核验。

### 4. 本地启动是独立验收项

在线 demo 正常不代表本地可用。每个正式收录作品都要声明 A–D 等级和公网依赖，并按对应路径验收：A 验证 `file://`，B 验证一键启动与退出，C 验证同一局域网加入，D 验证运行时、模型、权限和硬件要求。

## 当前仓库状态

- 已收录：[Love Tree](../experiences/surprises/love-tree/)；
- 已建立：`surprises / co-op / versus` 三类目录；
- 已归档：原始 RAR 和与项目不匹配的 Azure workflow；
- 尚未执行：复制或改造任何第三方作品；
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
