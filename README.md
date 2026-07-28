# Two of Us

> 给情侣、夫妻、朋友，或任意两个人的本地游乐场。<br>
> Private by default. Local first. Made for two.

*English: [README.en.md](./README.en.md)*

Two of Us 收集并实现了一组点开即玩的轻量互动网页：可以准备一份惊喜、一起完成挑战，也可以面对面对抗。项目默认不要求账号，不依赖云端房间，不把私人照片、语音或游戏内容上传到外部服务。

当前 Catalog 收录 **75 个已安装体验**：

| 单人惊喜 | 双人合作 | 双人对抗 | 启动等级 |
| ---: | ---: | ---: | --- |
| 24 | 27 | 24 | 67 个 A 级 · 1 个 B 级 · 6 个 C 级 · 1 个 D 级 |

## 第一次玩，从这九个开始

75 个体验一次看完太多。下面九个覆盖三种类型，也覆盖“一个人准备”“同屏合作”“两台设备”三种玩法；门户里把「精选」筛选切到“只看精选”会得到同一组。

| | | |
| --- | --- | --- |
| [<img src="./experiences/surprises/hand-crank-music-box/preview.webp" alt="把这首转给你" width="260">](./experiences/surprises/hand-crank-music-box/)<br>**[把这首转给你](./experiences/surprises/hand-crank-music-box/)** · 单人惊喜 · A<br>转动摇柄，让原创旋律逐音响起、纸雕夜景展开。 | [<img src="./experiences/surprises/scratch-surprise/preview.webp" alt="爱的刮刮卡" width="260">](./experiences/surprises/scratch-surprise/)<br>**[爱的刮刮卡](./experiences/surprises/scratch-surprise/)** · 单人惊喜 · A<br>亲手刮开涂层，揭晓一张可定制的约会券。 | [<img src="./experiences/surprises/wish-fireworks/preview.webp" alt="今晚，点三束光" width="260">](./experiences/surprises/wish-fireworks/)<br>**[今晚，点三束光](./experiences/surprises/wish-fireworks/)** · 单人惊喜 · A<br>按住蓄光放出三束烟火，每束留下一个字。 |
| [<img src="./experiences/co-op/four-hands-harmony/preview.webp" alt="这一拍，刚好和你" width="260">](./experiences/co-op/four-hands-harmony/)<br>**[这一拍，刚好和你](./experiences/co-op/four-hands-harmony/)** · 双人合作 · A<br>一台设备、两个人：低音席与高音席同时按下同一拍。 | [<img src="./experiences/co-op/closer-cards/preview.webp" alt="靠近一点" width="260">](./experiences/co-op/closer-cards/)<br>**[靠近一点](./experiences/co-op/closer-cards/)** · 双人合作 · A<br>六张原创谈话卡，不评分、不记录、随时可换。 | [<img src="./experiences/co-op/together-lock/preview.webp" alt="同心解锁" width="260">](./experiences/co-op/together-lock/)<br>**[同心解锁](./experiences/co-op/together-lock/)** · 双人合作 · C<br>两块屏幕同时按住 2.5 秒，一起打开机关。 |
| [<img src="./experiences/versus/reaction-duel/preview.webp" alt="反应力对决" width="260">](./experiences/versus/reaction-duel/)<br>**[反应力对决](./experiences/versus/reaction-duel/)** · 双人对抗 · A<br>等绿灯亮起再抢按，抢跑就把分数送给对方。 | [<img src="./experiences/versus/sealed-rps/preview.webp" alt="密封猜拳" width="260">](./experiences/versus/sealed-rps/)<br>**[密封猜拳](./experiences/versus/sealed-rps/)** · 双人对抗 · C<br>先各自密封出拳，本机裁判收齐后同时揭晓。 | [<img src="./experiences/versus/paper-soccer/preview.webp" alt="纸上球局" width="260">](./experiences/versus/paper-soccer/)<br>**[纸上球局](./experiences/versus/paper-soccer/)** · 双人对抗 · A<br>在点阵上画线推进，把球送进对方球门。 |

## 一分钟开始

### 方式一：直接打开

双击根目录的 [`index.html`](./index.html) 即可浏览门户，并直接打开其中 **67 个 A 级体验**。

这种方式：

- 不需要安装依赖；
- 不需要启动本地服务；
- 适合单设备惊喜、同屏合作和面对面对抗；
- 浏览器地址会以 `file://` 开头，B/C/D 级能力暂不可用。

### 方式二：启动完整本地门户

完整门户会启用 B/C/D 级体验、本地房间、局域网地址和加入二维码。

首次使用：

- macOS：双击 `setup.command`
- Windows：双击 `setup.bat`

以后启动：

- macOS：双击 `start.command`
- Windows：双击 `start.bat`

也可以使用终端：

```bash
# 安装基础依赖，并跳过可选的大型本地能力
npm run setup -- --skip-optional

# 启动门户
npm start
```

默认本机入口是 [http://127.0.0.1:4173/](http://127.0.0.1:4173/)。如果端口已被占用，运行时会自动寻找后续可用端口。

> **扫描二维码前，请确认手机与运行门户的电脑连接在同一个 Wi‑Fi／局域网。**<br>
> 蜂窝网络、访客 Wi‑Fi、VPN 或路由器的“设备隔离”可能阻止手机访问。局域网地址由当前网络动态生成，不应保存为固定书签。

## 选择一个体验

门户的每张卡片都带一张预览图，并提供精选、等级和类型三组筛选；也可以点击“随机开启”从当前结果中挑选：

| 分类 | 目录 | 适合 |
| --- | --- | --- |
| 单人惊喜 | [`experiences/surprises/`](./experiences/surprises/) | 一个人准备，另一个人打开：情书、纪念日、照片、音乐和小仪式 |
| 双人合作 | [`experiences/co-op/`](./experiences/co-op/) | 两个人共同完成：默契、节奏、推理、操作和交流挑战 |
| 双人对抗 | [`experiences/versus/`](./experiences/versus/) | 两个人比较分数或争夺胜负：反应、策略、记忆和同屏竞速 |

[`experiences/catalog.json`](./experiences/catalog.json) 是体验数量、入口、预览图、人数、设备、等级、精选标记和安装状态的唯一事实来源。

### 预览图

每个作品目录下的 `preview.webp` 是门户和本文件使用的封面，由 [`scripts/previews.mjs`](./scripts/previews.mjs) 用本机 Chromium 截取作品自己的画面并直接编码为 WebP：

```bash
npm run previews              # 重新生成全部预览图
npm run previews -- --only=light-grown-tree,sealed-rps
```

- 绝大多数预览就是作品的开场画面；只有开场本身没有可看内容的作品，才在脚本里登记一条最小配方，先替体验者走几步；
- 预览图**不是运行依赖**：作品本身从不加载它，门户在缺图或加载失败时退回纯文字卡片；
- Chromium 只在制作预览时使用，不进入 `package.json` 的依赖，也不参与任何作品的运行；
- 预览内容全部来自本仓库自己的页面，不引入新的第三方素材；画面中出现的作品自有资产，来源仍以各作品的 `README.md`／`ATTRIBUTION.md` 为准。

## A / B / C / D 是什么

等级表示用户如何启动和连接，不表示作品质量或开发难度。

| 等级 | 启动方式 | 典型能力 |
| --- | --- | --- |
| **A · 直接打开** | 双击作品的 `index.html` | 原生 HTML/CSS/JS、Canvas、Web Audio、本机文件 |
| **B · 一键本地服务** | 双击启动器，由本机服务打开 | ES Modules、`fetch()`、WebAssembly、本地浏览器依赖 |
| **C · 局域网双设备** | 一台电脑启动，另一台设备扫码加入 | 本地 HTTP、Socket.IO、双人房间和二维码 |
| **D · 本地重型能力** | 安装可选模型或大型资源后启动 | 本地语音识别、Worker、WASM 和可校验能力包 |

A–D 都以离线完成核心体验为目标。D 级可选能力不会在作品启动时偷偷下载；拒绝安装不会影响 A/B/C 级体验。

## 本地优先与隐私边界

- **无账号**：核心体验不要求注册或登录。
- **默认无公网依赖**：安装完成后，核心玩法在本机或同一局域网内完成。
- **私人素材留在设备上**：照片、录音和自定义内容默认只在当前页面或本地运行时处理。
- **C 级只在局域网传输**：两台设备通过用户自己的本地 Node 服务通信。
- **D 级模型本地运行**：能力包有独立 manifest、哈希、体积和许可证记录。
- **可信主机模型**：本地房间信任启动服务的电脑；这不是端到端加密，也不适合不受信任的公共网络。

## 项目结构

```text
two-of-us/
├── index.html                 # Catalog 驱动的统一门户
├── setup.command / setup.bat  # 首次安装入口
├── start.command / start.bat  # 统一启动入口
├── experiences/
│   ├── catalog.json           # 75 个体验的唯一目录事实
│   ├── surprises/             # 单人惊喜
│   ├── co-op/                 # 双人合作
│   └── versus/                # 双人对抗
├── shared/
│   ├── runtime/               # HTTP、二维码、房间和静态资源服务
│   └── ...                    # 跨体验共享组件
├── capabilities/              # D 级可选能力定义与浏览器资产
├── scripts/                   # 安装、启动、测试和仓库验收
├── docs/                      # 调研、规格、设计、计划与验收记录
├── bugs/                      # 已复现问题、根因和回归证据
└── learn/                     # 可跨体验复用的工程知识
```

每个体验通常包含自己的 `README.md`、入口、逻辑、样式、测试、门户预览图 `preview.webp` 和来源声明。B/C/D 级体验还提供薄启动器，但统一复用根目录的依赖和本地运行时。

## 开发

要求：

- Node.js 18 或更高版本；
- macOS 或 Windows 可使用双击启动器；
- 现代 Chromium、Safari 或 Firefox 浏览器。

常用命令：

| 命令 | 作用 |
| --- | --- |
| `npm run setup -- --skip-optional` | 安装共享依赖，不安装 D 级可选能力 |
| `npm start` | 启动统一门户 |
| `npm start -- --experience <id>` | 启动并直达指定体验 |
| `npm run previews` | 用本机 Chromium 重新生成作品预览图 |
| `npm run capabilities` | 查看本地能力 CLI 帮助 |
| `npm test` | 运行仓库自动发现的全部测试 |
| `npm run verify` | 校验 Catalog、入口、资源闭包和来源声明 |

例如直达全景回忆：

```bash
npm start -- --experience panorama-memory
```

新增或修改体验时，至少应保持：

1. Catalog 与真实文件入口一致；
2. 在 Catalog 中声明 `preview`，并用 `npm run previews -- --only=<id>` 生成预览图；
3. 声明的 A/B/C/D 启动方式可重复验证；
4. 私人数据、公网依赖和权限边界写清楚；
5. 玩法核心尽量确定、可重放、可测试；
6. 借鉴、代码、素材和依赖来源可追溯；
7. `npm test` 与 `npm run verify` 通过。

## 文档与工程记录

- [文档索引](./docs/README.md)：调研、规格、设计、实施计划和验收记录
- [分类与收录规范](./docs/01-classification-spec.md)：分类、标签和 A/B/C/D 等级定义
- [持续建设规格](./docs/04-implementation-program-spec.md)：统一运行架构与交付边界
- [借鉴与来源声明规范](./docs/05-reference-and-attribution-spec.md)
- [共享本地运行时](./shared/runtime/README.md)
- [Bug 记录](./bugs/README.md)
- [工程知识库](./learn/README.md)

## 常见问题

### 手机扫码后打不开

确认手机和电脑在同一个 Wi‑Fi／局域网，并暂时关闭蜂窝网络或 VPN 后重试。访客网络和 AP 隔离可能让同一 Wi‑Fi 下的设备仍然无法互访。

### 页面没有声音

浏览器通常会阻止未经过用户操作的自动播放。先点击页面内的主要按钮或互动区域，再检查标签页和系统音量。

### 端口 4173 已被占用

启动器会在有限范围内寻找下一个可用端口，并在终端和门户中显示实际地址。请以当次启动显示的地址和二维码为准。

### 不想安装本地语音模型

使用 `npm run setup -- --skip-optional`。D 级能力是可选项，不影响其他体验。

## 来源与许可

仓库包含独立实现、本地生成或自制素材，以及固定版本的第三方依赖。每个体验的 `README.md`／`ATTRIBUTION.md` 和 [`shared/runtime/README.md`](./shared/runtime/README.md) 分别记录实际参考范围、代码、素材、模型与许可证。

本仓库目前没有用一个根许可证覆盖所有内容。复用或再分发某个体验前，请以该目录的来源与许可记录为准；不要把“公开可见”理解为“可以任意复制”。
