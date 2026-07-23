# Two of Us 第二轮本地优先项目调研

> 调研日期：2026-07-15；来源维护复核：2026-07-17、2026-07-24
> 研究对象：情侣惊喜、双人合作、双人对抗与共享本地运行基础设施
> 研究方法：技术演进纵轴 × 当前 A/B/C/D 启动等级横轴
> 证据范围：原作者仓库、仓库许可证、官方文档与开放标准；本轮不复制第三方源码
> 2026-07-24 维护批次：
> [`227-wish-fireworks-source-refresh.md`](./227-wish-fireworks-source-refresh.md)、
> [`228-capsule-docking-source-refresh.md`](./228-capsule-docking-source-refresh.md)

## 0. 结论先行

上一轮把“双击 HTML”当作最重要的筛选条件，找到了很多轻巧作品，也天然漏掉了三类很有价值的体验：需要 `localhost` 才能安全调用浏览器能力的作品、需要局域网房间的双设备玩法，以及依靠本地模型或 GPU 的重型互动。

第二轮把目标改成“安装可以统一，游玩必须直接打开”。调研共整理 **76 个互不重复的开源候选**：惊喜 20 个、合作 15 个、对抗 15 个、共享基础设施 26 个。它们不是 76 个都要照搬的待办清单，而是一张能力地图。

核心判断有五条：

1. **A 级仍然最适合第一批作品**。反应力、热座问答、转盘、相册和拆信封不需要服务，最容易建立统一作品规范。
2. **B 级不是妥协，而是浏览器安全边界的正常结果**。PWA、WASM、模块脚本、本地文件读取和麦克风常常需要 `localhost`；用启动器封装后，用户仍然只是双击一次。
3. **C 级最值得成为仓库的差异化能力**。Socket.IO + 本机 Node + 二维码足以覆盖画猜、抢答、棋类、手机控制器和同步机关，无需公网账号或云房间。
4. **D 级应按能力包安装，不应成为所有作品的基础依赖**。语音、姿态、3D 和本地模型各自体积、硬件与许可差异很大，应该按需启用。
5. **许可证必须分层记录**。代码许可证不等于模型权重许可证，也不等于图片、音乐、字体和题库许可证。一个 MIT 前端调用了限制商用的模型，最终作品就不能只写“MIT”。

## 1. 研究口径

### 1.1 A/B/C/D 是最终启动方式

| 等级 | 用户动作 | 典型技术 | 本轮判定边界 |
| --- | --- | --- | --- |
| A | 双击 `index.html` | 原生 HTML/CSS/JS、Canvas、本地媒体 | 无服务、无外部请求 |
| B | 双击启动器 | localhost、ES Modules、PWA、WASM、本机文件服务 | 启动器自动开服务和浏览器 |
| C | 双击主机入口，第二台设备扫码加入 | WebSocket、Socket.IO、CRDT、WebRTC、本地房间 | 核心玩法在同一局域网完成 |
| D | 双击入口，按需加载已安装能力包 | 本地 ASR、视觉模型、LLM、3D、大型素材 | 无云 API；缺能力时给可操作提示 |

同一作品可以写成 `C+D`：例如两台手机分别运行 MediaPipe 姿态识别，再通过局域网同步得分。等级描述的是用户实际使用路径，而不是开发者是否用过 Vite、Webpack 或 Python。

### 1.2 “本机后端”不等于“公网后端”

| 类型 | 数据路径 | 是否符合本地优先 | 例子 |
| --- | --- | --- | --- |
| 本机静态服务 | 浏览器 ↔ 当前电脑 | 是 | Vite 预览、统一静态服务器 |
| 本机状态服务 | 两台设备 ↔ 当前电脑 | 是 | Socket.IO 房间、Colyseus |
| 本机推理服务 | 浏览器 ↔ 当前电脑上的模型进程 | 是 | whisper.cpp、ComfyUI |
| 设备直连 | 两台设备 P2P，另有本地信令 | 是，但需核验 ICE | PeerJS、simple-peer |
| 公网可选服务 | 只用于异地分享、下载或更新 | 可以作为增强 | 可选 STUN/TURN、模型下载 |
| 公网必需服务 | 核心状态、账号或推理只能在第三方云端 | 不进入正式本地实现 | Firebase 房间、云 ASR |

### 1.3 置信度

- **高**：仓库说明、架构和许可证一手文件相互一致；仍需在引入时固定版本。
- **中**：许可证清楚，但严格断网、跨平台启动或浏览器权限仍需实机复测。
- **低**：缺许可证、维护状态不明或本地替代路线尚未跑通；只能作方向线索。

## 2. 纵轴：从一张静态情书到本地智能体验

### 2.1 第一阶段：静态页面把“礼物”变成可复制文件

最早、也最耐用的路径，是把所有表达压进 HTML、CSS、JavaScript 和本地素材。它的优势不是技术简单，而是交付关系清晰：准备者复制一个文件夹，接收者打开入口，不存在账号、服务器过期和第三方隐私政策。Love Tree、照片墙、刮刮卡、转盘、Canvas 烟花都属于这条线。

这条路线塑造了 A 级标准：作品必须在断网环境完整成立，个性化内容集中配置，音乐由用户手势启动，不能用前端密码伪装真正加密。

### 2.2 第二阶段：浏览器应用开始需要一个本地“门卫”

当页面使用 ES Modules、`fetch()`、Service Worker、WASM、麦克风或摄像头，`file://` 的源策略和安全上下文会成为约束。解决方式不是把数据上传到云端，而是在当前电脑启动一个极小的 HTTP 服务。

B 级由此出现。它把“用户会不会命令行”从体验中拿掉：安装阶段统一准备依赖，游玩阶段双击启动器，自动选择端口、启动服务、打开浏览器并在退出时回收进程。技术上多了一层，用户动作没有变多。

### 2.3 第三阶段：局域网房间让手机成为第二块界面

[RFC 6455](https://www.rfc-editor.org/rfc/rfc6455) 定义的 WebSocket，以及 Socket.IO 一类带重连和降级能力的封装，让本机可以成为两位玩家的房间权威。第二台手机不必安装应用，只需与主机处于同一 Wi‑Fi，扫描二维码即可进入。

这改变了情侣玩法的设计空间：隐藏题目不必再靠“把屏幕递给对方”，手机可以当控制器，双方可以同时按键、画画、猜词、选择秘密行动。C 级的核心不是“在线多人”，而是“没有公网也能实时双人”。

### 2.4 第四阶段：WebRTC 与 CRDT 把传输和状态拆开

[WebRTC](https://www.w3.org/TR/webrtc/) 允许数据、音频和视频在设备间直连，但“P2P”不代表自动离线：发现对方仍要信令，默认配置常包含公共 STUN/TURN。PeerJS、simple-peer 和 Trystero 都要显式改为本机信令并验证 ICE 路径。

Yjs、Automerge 一类 CRDT 则改变了协作状态：每台设备保留副本，局域网服务负责同步，临时断线后仍可编辑。它们适合共同日记、爱情地图和协作画布，不一定适合每秒几十帧的动作游戏。

### 2.5 第五阶段：WASM、WebGPU 与本地模型进入浏览器

[WebAssembly](https://www.w3.org/TR/wasm-core-2/) 让语音、数据库、媒体编解码和计算机视觉可以随网页发布；[WebGPU](https://www.w3.org/TR/webgpu/) 又把浏览器连接到现代 GPU。Transformers.js、ONNX Runtime Web、WebLLM、MediaPipe、whisper.cpp 与 sherpa-onnx 由此成为 D 级能力底座。

这条路线的真正成本不是几行推理代码，而是模型文件、浏览器兼容性、内存、首次加载、缓存清理和模型许可证。因此 D 级应该是 manifest 驱动的可选能力包，而不是根目录的一次性巨型安装。

## 3. 横轴：2026-07-15 的候选全景

### 3.1 数量与定位

| 分组 | 候选数 | A | B | C | D | 主要用途 |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| 单人惊喜 | 20 | 5 | 12 | 0 | 3 | 相册、音乐、360°、3D、媒体与生成式惊喜 |
| 双人合作 | 15 | 4 | 2 | 8 | 1 | 绘画、协作文档、传输、机关、拼图 |
| 双人对抗 | 15 | 6 | 1 | 7 | 1 | 棋类、画猜、派对、局域网小游戏 |
| 共享基础设施 | 26 | 0 | 1 | 14 | 11 | 房间、P2P、CRDT、二维码、游戏引擎、本地 AI |
| **合计** | **76** | **15** | **16** | **29** | **16** | 同一候选只计入一个主分组 |

表中等级按主要目标计数；正文中的 `C+D` 记入 D，`A/B` 取更符合预期交付的等级。公网依赖写的是“完成本地化后的游玩状态”，安装时允许从官方源下载并固定依赖。

### 3.2 单人惊喜：20 个候选

| ID | 候选与一手来源 | 目标等级 / 公网 | 架构与借鉴价值 | 许可证 / 改造点 / 置信度 |
| --- | --- | --- | --- | --- |
| S01 | [tsParticles](https://github.com/tsparticles/tsparticles) | A / 无 | Canvas 粒子、爱心、星尘和庆祝背景 | [MIT](https://github.com/tsparticles/tsparticles/blob/main/LICENSE)；固定浏览器包，去 CDN；高 |
| S02 | [PhotoSwipe](https://github.com/dimsemenov/PhotoSwipe) | A / 无 | 触屏照片浏览、缩放、字幕与回忆画廊 | [MIT](https://github.com/dimsemenov/PhotoSwipe/blob/master/LICENSE)；资源本地化，另核照片许可；高 |
| S03 | [Tone.js](https://github.com/Tonejs/Tone.js) | A / 无 | Web Audio 音序、互动音乐盒、节奏和彩蛋 | [MIT](https://github.com/Tonejs/Tone.js/blob/dev/LICENSE.md)；必须由手势解锁音频；高 |
| S04 | [reveal.js](https://github.com/hakimel/reveal.js) | A / 无 | 分镜式情书、逐页回忆和可控叙事节奏 | [MIT](https://github.com/hakimel/reveal.js/blob/master/LICENSE)；裁掉插件与远程字体；高 |
| S05 | [Webamp](https://github.com/captbaritone/webamp) | B / 无 | 复古 Winamp 歌单、可视化皮肤和年代感 | [MIT](https://github.com/captbaritone/webamp/blob/master/LICENSE.txt)；音乐和皮肤分别核权；中 |
| S06 | [Butterchurn](https://github.com/jberg/butterchurn) | B / 无 | MilkDrop 音乐可视化，适合纪念歌单背景 | [MIT](https://github.com/jberg/butterchurn/blob/master/LICENSE)；本地预置 preset，测试 GPU；中 |
| S07 | [Fabric.js](https://github.com/fabricjs/fabric.js) | A / 无 | 拼贴画、贴纸、照片标注与可编辑纪念卡 | [MIT](https://github.com/fabricjs/fabric.js/blob/master/LICENSE)；构建浏览器发布包；高 |
| S08 | [Sigal](https://github.com/saimn/sigal) | B / 无 | 从本地照片批量生成静态画廊和缩略图 | [MIT](https://github.com/saimn/sigal/blob/main/LICENSE)；生成阶段用 Python，游玩产物可 A；中 |
| S09 | [vite-plugin-pwa](https://github.com/vite-pwa/vite-plugin-pwa) | B / 无 | 安装到主屏、离线缓存和版本化资源 | [MIT](https://github.com/vite-pwa/vite-plugin-pwa/blob/main/LICENSE)；避免更新流程破坏离线包；高 |
| S10 | [sql.js](https://github.com/sql-js/sql.js) | B / 无 | 浏览器内 SQLite，适合大量回忆、搜索和时间线 | [MIT 文本](https://github.com/sql-js/sql.js/blob/master/LICENSE)；WASM 本地加载、明确导入导出；高 |
| S11 | [Pannellum](https://github.com/mpetroff/pannellum) | B / 无 | 360° 回忆地点、热点情书和空间寻宝 | [MIT](https://github.com/mpetroff/pannellum/blob/master/COPYING)；全景图与瓦片本地化；高 |
| S12 | [Marzipano](https://github.com/google/marzipano) | B / 无 | 多场景 360° 导览和热点导航 | [Apache-2.0](https://github.com/google/marzipano/blob/master/LICENSE)；保存构建产物与 NOTICE；高 |
| S13 | [A-Frame](https://github.com/aframevr/aframe) | B / 无 | 声明式 WebXR/3D 回忆房间 | [MIT](https://github.com/aframevr/aframe/blob/master/LICENSE)；本地模型、移动端降级；中 |
| S14 | [`<model-viewer>`](https://github.com/google/model-viewer) | B / 无 | 展示戒指、礼物、纪念物 3D 模型与 AR 入口 | [Apache-2.0](https://github.com/google/model-viewer/blob/master/LICENSE)；模型/环境贴图另核许可；中 |
| S15 | [ffmpeg.wasm](https://github.com/ffmpegwasm/ffmpeg.wasm) | D / 无 | 本地生成纪念视频、音频裁切和格式转换 | [MIT 包装层](https://github.com/ffmpegwasm/ffmpeg.wasm/blob/main/LICENSE)；FFmpeg 组件许可另审，需 COOP/COEP；中 |
| S16 | [WebLLM](https://github.com/mlc-ai/web-llm) | D / 首次下载可选，游玩无 | WebGPU 本地生成文案、线索和互动角色 | [Apache-2.0](https://github.com/mlc-ai/web-llm/blob/main/LICENSE)；固定模型与 WASM，逐个核模型许可；高（引擎）/中（机型） |
| S17 | [ComfyUI](https://github.com/Comfy-Org/ComfyUI) | D / 首次下载可选，游玩无 | 本机图像工作流，可生成专属卡片或风格化回忆 | [GPL-3.0](https://github.com/Comfy-Org/ComfyUI/blob/master/LICENSE)；作为独立进程集成，模型与节点逐项审计；中 |
| S18 | [birthday-bliss `d1e5348`](https://github.com/randillasith/birthday-bliss/tree/d1e534811041a2b33f98ad23527ce7bf97e25d3d) | B / 无 | 倒计时、相册、点击或麦克风吹蜡烛、星夜许愿 | [MIT](https://github.com/randillasith/birthday-bliss/blob/d1e534811041a2b33f98ad23527ce7bf97e25d3d/LICENSE)；本地化 Google Fonts、自备缺失相册图片，麦克风走 localhost；中 |
| S19 | [LoveDiary-Timeline](https://github.com/MoLeft/LoveDiary-Timeline) | B / 无 | 恋爱秒表、照片时间线和选择互动 | [MIT](https://github.com/MoLeft/LoveDiary-Timeline/blob/main/LICENSE)；替换资源与弱密码入口；中 |
| S20 | [anniversaryGift](https://github.com/softnchewy/anniversaryGift) | B / 无 | Three.js 纪念关卡和场景探索 | [MIT](https://github.com/softnchewy/anniversaryGift/blob/master/LICENSE)；升级旧构建链，替换远程素材；中 |

#### 惊喜类重点判断

**PhotoSwipe（A）**是“少做框架、多做内容”的代表。它不需要本机后端，公网依赖可归零；价值在成熟的触屏照片体验。改造重点不是代码，而是统一照片 manifest、EXIF 隐私清理、缩略图生成和素材声明。许可证置信度高，私人照片的公开分发权仍由用户自己决定。

**Pannellum / Marzipano（B）**让“去过的地方”从平面相册变成空间叙事。本机后端只负责瓦片和配置，不接触公网。两者都要解决全景图片体积、移动端内存和热点坐标配置；Pannellum 更轻，Marzipano 更适合多场景。代码许可分别为 MIT 与 Apache-2.0，素材许可独立。

**WebLLM（D）**能在浏览器内用 WebGPU 生成情书、线索和互动对话，但默认模型列表常指向在线资源。本地化必须把模型、模型库和 tokenizer 纳入 manifest，记录版本、哈希、大小、许可证与硬件下限。引擎的 Apache-2.0 许可置信度高；具体 Qwen、Llama、Gemma 等权重不能被引擎许可证覆盖。

### 3.3 双人合作：15 个候选

| ID | 候选与一手来源 | 目标等级 / 公网 | 架构与借鉴价值 | 许可证 / 改造点 / 置信度 |
| --- | --- | --- | --- | --- |
| C01 | [WBO / Whitebophir](https://github.com/lovasoa/whitebophir) | C / 无 | 本机 Node 白板房间，共同画画 | [AGPL-3.0](https://github.com/lovasoa/whitebophir/blob/master/LICENSE)；删遥测外链、加二维码；高 |
| C02 | [Excalidraw](https://github.com/excalidraw/excalidraw) | C / 无 | 手绘风画布、元素模型和导出 | [MIT](https://github.com/excalidraw/excalidraw/blob/master/LICENSE)；关闭图库、分享和远程存储；高 |
| C03 | [excalidraw-room](https://github.com/excalidraw/excalidraw-room) | C / 无 | Express/Socket.IO 协作中继 | [MIT](https://github.com/excalidraw/excalidraw-room/blob/master/LICENSE)；服务地址改局域网；高 |
| C04 | [Drawpile](https://github.com/drawpile/Drawpile) | C+D / 无 | 专业同步绘画、房间和动画 | [GPL-3.0](https://github.com/drawpile/Drawpile/blob/main/LICENSE.txt)；打包原生服务/客户端；高 |
| C05 | [PairDrop](https://github.com/schlagmichdoch/PairDrop) | C / 无 | 设备发现、二维码、WebRTC 文件交换 | [GPL-3.0](https://github.com/schlagmichdoch/PairDrop/blob/master/LICENSE)；替换默认 ICE，测 fallback；高 |
| C06 | [Etherpad](https://github.com/ether/etherpad) | C / 无 | 实时共同写信、故事接龙和历史 | [Apache-2.0](https://github.com/ether/etherpad/blob/develop/LICENSE)；本地数据库、关闭可选网络调用；高 |
| C07 | [HedgeDoc](https://github.com/hedgedoc/hedgedoc) | C / 无 | 共同时间线、旅行计划和 Markdown 纪念册 | [AGPL-3.0](https://github.com/hedgedoc/hedgedoc/blob/develop/LICENSE)；SQLite、本地图片、关闭登录；高 |
| C08 | [Tetrus](https://github.com/frustra/tetrus) | C / 无 | WebRTC 合作方块，适合研究状态与信令分离 | [MIT](https://github.com/frustra/tetrus/blob/master/LICENSE)；替换 Go 公网信令为本机服务；中 |
| C09 | [js_thrustvector](https://github.com/pemmyz/js_thrustvector) | A / 无 | 双飞船保持张力搬运炸弹 | [MIT](https://github.com/pemmyz/js_thrustvector/blob/master/LICENSE)；抽离玩法、补触屏；高 |
| C10 | [game-pjmask](https://github.com/kai-linux/game-pjmask) | A / 无 | 同键盘双人屋顶平台关卡 | [MIT](https://github.com/kai-linux/game-pjmask/blob/master/LICENSE)；核素材并调整按键；中 |
| C11 | [michaelsboost/CoupleCards `94ac422`](https://github.com/michaelsboost/CoupleCards/tree/94ac422ba393d5aa8c709527dab6f1f6e4156cc1) | A / 无 | 情侣问题卡、分类抽取、翻面和进度 | [MIT](https://github.com/michaelsboost/CoupleCards/blob/94ac422ba393d5aa8c709527dab6f1f6e4156cc1/LICENSE.md)，Copyright 2025 Michael Schwartz；重写题库与视觉；高 |
| C12 | [What We Carry](https://github.com/PButters/what-we-carry) | A / 无 | 共同讨论家务与心理负担 | [MIT](https://github.com/PButters/what-we-carry/blob/main/LICENSE)；只借鉴流程，改成中性本地问卷；高 |
| C13 | [grrd01/Puzzle](https://github.com/grrd01/Puzzle) | A/B / 无 | 使用私人照片共同拼图 | [MPL-2.0（包元数据）](https://github.com/grrd01/Puzzle/blob/master/package.json)；仓库无独立许可证文件，引入前需再确认；中低 |
| C14 | [p5.party Co‑Op Puzzle](https://github.com/Yaoc105/p5.party_Co-Op_Puzzle) | C / 现状必须，改造后无 | 双设备合作机关的机制样板 | [MIT](https://github.com/Yaoc105/p5.party_Co-Op_Puzzle/blob/main/LICENSE)；完全替换公共 p5.party 状态服务；中 |
| C15 | [Void Harvest](https://github.com/VictorZakharov/void-harvest-game) | B / 无 | Three.js 双人合作构筑与清怪 | [MIT](https://github.com/VictorZakharov/void-harvest-game/blob/master/LICENSE)；固定构建产物、测试手柄；中 |

#### 合作类重点判断

**WBO（C）**已经证明本机 Node 白板可以承担双人实时绘画。它的 AGPL-3.0 不是不能用，但会影响修改版的网络使用义务；更稳妥的早期路线是借鉴房间和画布交互，用仓库自己的 Socket.IO + Canvas 实现。若直接修改引入，必须保留许可证并提供对应源码。

**Excalidraw + excalidraw-room（C）**的优势是成熟画布与房间中继分离，许可证都是 MIT。完整上游还包含图库、分享、外部存储等能力，本项目只需画布、加密协作消息和导出。断网验收必须确认字体、图标、房间地址、存储和错误上报没有远程请求。

**PairDrop（C）**值得借鉴的不是文件发送界面，而是“设备出现—选择对方—确认传输—失败降级”的流程。自托管后本机 Node 负责发现与信令；数据通常 P2P，fallback 可能经过本机服务。默认 ICE 不能直接沿用，GPL-3.0 也要求把“参考流程”和“复制代码”明确区分。

### 3.4 双人对抗：15 个候选

| ID | 候选与一手来源 | 目标等级 / 公网 | 架构与借鉴价值 | 许可证 / 改造点 / 置信度 |
| --- | --- | --- | --- | --- |
| V01 | [kbennett2000/lan-games](https://github.com/kbennett2000/lan-games) | C / 无 | Node、Socket.IO、SQLite 的八款局域网棋类 | [MIT](https://github.com/kbennett2000/lan-games/blob/main/LICENSE)；统一房间入口与退出；高 |
| V02 | [PocketWebGames](https://github.com/marceld23/PocketWebGames) | C / 无 | 设备自建 Wi‑Fi、浏览器加入的六款小游戏 | [MIT](https://github.com/marceld23/PocketWebGames/blob/main/LICENSE)；移植 M5Stack 主机思想到桌面；高 |
| V03 | [coolboardgamegame](https://github.com/DecodedXR/coolboardgamegame) | C / 无 | pygame + WebSocket 的手机控制派对框架 | [MIT](https://github.com/DecodedXR/coolboardgamegame/blob/main/LICENSE)；统一 Python 能力包和浏览器 WASM；中 |
| V04 | [drawrush.io](https://github.com/ShubhVaish1703/drawrush.io) | C / 现状含部署配置，目标无 | Next.js + Node + Socket.IO 画猜 | [MIT](https://github.com/ShubhVaish1703/drawrush.io/blob/master/LICENSE)；去账号/云部署，题库本地化；中 |
| V05 | [tomalama/hackbox](https://github.com/tomalama/hackbox) | C / 无 | Jackbox 式“大屏 + 手机控制器”框架 | [MIT](https://github.com/tomalama/hackbox/blob/main/LICENSE)；裁出房间、角色与控制器协议；中 |
| V06 | [Massive Decks](https://github.com/Lattyware/massivedecks) | C / 无 | 手机选牌、大屏结算的喜剧卡牌 | [AGPL-3.0](https://github.com/Lattyware/massivedecks/blob/main/LICENSE)；题库与代码义务分开，适合借鉴流程；高 |
| V07 | [Doodle Dash](https://github.com/xenova/doodle-dash) | D / 无 | 浏览器本地图像嵌入驱动的画图竞猜 | **未声明许可证**；只借鉴“画图→本地识别→计分”，不复制代码素材；低 |
| V08 | [Mozilla BrowserQuest](https://github.com/mozilla/BrowserQuest) | C / 无 | 浏览器多人动作、区域广播和服务器权威 | [MPL-2.0](https://github.com/mozilla/BrowserQuest/blob/master/LICENSE)；体量大，主要借鉴协议和地图同步；中 |
| V09 | [connect-four](https://github.com/bryanbraun/connect-four) | A / 无 | 独立四子棋、轮流触屏 | [MIT](https://github.com/bryanbraun/connect-four/blob/master/LICENSE)；情侣化棋子和赛后反馈；高 |
| V10 | [ping-pong-game](https://github.com/ramazancetinkaya/ping-pong-game) | A / 无 | 原生双人 Pong | [MIT](https://github.com/ramazancetinkaya/ping-pong-game/blob/main/LICENSE)；核音效、补移动端控制；高 |
| V11 | [tanks-game](https://github.com/niccolofanton/tanks-game) | A / 无 | Canvas 双人坦克与反弹子弹 | [MIT](https://github.com/niccolofanton/tanks-game/blob/main/LICENSE)；抽出固定 timestep、补暂停；高 |
| V12 | [battle-spaceship-game](https://github.com/XDream-Dev/battle-spaceship-game) | A / 无 | 同键盘双飞船射击 | [Apache-2.0](https://github.com/XDream-Dev/battle-spaceship-game/blob/main/LICENSE)；保留 NOTICE、核素材；中 |
| V13 | [siege-wars](https://github.com/raaaahman/siege-wars) | B / 无 | Webpack 构建的回合攻城对战 | [MIT](https://github.com/raaaahman/siege-wars/blob/master/LICENSE)；升级构建链并生成发布包；中 |
| V14 | [kubowania/battleships](https://github.com/kubowania/battleships) | A / 无 | 原生海战棋与电脑对手 | [README 写 MIT](https://github.com/kubowania/battleships/blob/master/README.md)，但 `package.json` 写 ISC；改热座前先澄清许可；中低 |
| V15 | [google/html-quiz](https://github.com/google/html-quiz) | A / 无 | 双队答题、抢答与计分 | [Apache-2.0 代码](https://github.com/google/html-quiz/blob/master/LICENSE)、题材含 CC BY；替换为私人题库；高 |

#### 对抗类重点判断

**lan-games（C）**最接近本仓库要建设的统一局域网样板：一个 Node 服务同时托管页面、Socket.IO 房间和 SQLite 状态，多款棋类共享登录前的轻量加入流程。可借鉴房间生命周期和断线恢复，但本项目应取消账号语义，改成二维码里的随机房间 token 与临时席位。

**PocketWebGames（C）**展示了更激进的“真正离线”：主机设备自己提供 Wi‑Fi 和网页。桌面版不必复制硬件方案，但可以借鉴它对无账号、无广告、无追踪、无互联网的完整产品约束。代码 MIT；若移植素材或题库，仍需逐项核验。

**Doodle Dash（D）**机制很有价值，但仓库没有明确许可证。它只能作为“浏览器内嵌入模型评估涂鸦相似度”的概念证据。正式作品应使用许可证明确的 Transformers.js/ONNX Runtime 和自行制作的题库、UI、计分逻辑，并在 README 声明只参考玩法机制。

### 3.5 共享基础设施：26 个候选

| ID | 候选与一手来源 | 目标等级 / 公网 | 架构与借鉴价值 | 许可证 / 改造点 / 置信度 |
| --- | --- | --- | --- | --- |
| I01 | [Socket.IO](https://github.com/socketio/socket.io) | C / 无 | 房间、重连、事件与 long-polling 降级 | [MIT](https://github.com/socketio/socket.io/blob/main/LICENSE)；本地打包客户端；高 |
| I02 | [ws](https://github.com/websockets/ws) | C / 无 | 极小 Node WebSocket 服务 | [MIT](https://github.com/websockets/ws/blob/master/LICENSE)；自行补房间、心跳、恢复；高 |
| I03 | [Colyseus](https://github.com/colyseus/colyseus) | C / 无 | 实时权威房间、状态增量和重连 | [MIT](https://github.com/colyseus/colyseus/blob/master/LICENSE)；只用内存房间；高 |
| I04 | [boardgame.io](https://github.com/boardgameio/boardgame.io) | C / 无 | 回合、阶段、日志和隐藏玩家视图 | [MIT](https://github.com/boardgameio/boardgame.io/blob/main/LICENSE)；关闭公共 lobby；高 |
| I05 | [PeerJS](https://github.com/peers/peerjs) | C / 默认有公网，目标无 | WebRTC 数据/媒体客户端封装 | [MIT](https://github.com/peers/peerjs/blob/master/LICENSE)；指定本机 PeerServer/ICE；高 |
| I06 | [PeerServer](https://github.com/peers/peerjs-server) | C / 无 | 本机 WebRTC 发现与信令 | [MIT](https://github.com/peers/peerjs-server/blob/master/LICENSE)；绑定局域网并加房间 token；高 |
| I07 | [simple-peer](https://github.com/feross/simple-peer) | C / 无 | 轻量 WebRTC 封装，不自带信令 | [MIT](https://github.com/feross/simple-peer/blob/master/LICENSE)；配本机 ws/Socket.IO；高 |
| I08 | [Trystero](https://github.com/dmotz/trystero) | C / 默认有公网，目标无 | 多种 P2P 发现策略与自托管 ws-relay | [MIT](https://github.com/dmotz/trystero/blob/main/LICENSE)；只能采用自托管 relay；高 |
| I09 | [Yjs](https://github.com/yjs/yjs) | C / 无 | CRDT 文档副本、协作状态与 awareness | [MIT 文本](https://github.com/yjs/yjs/blob/main/LICENSE)；按数据模型设计，不用于高频物理；高 |
| I10 | [y-websocket](https://github.com/yjs/y-websocket) | C / 无 | Yjs 本机同步 provider | [MIT](https://github.com/yjs/y-websocket/blob/master/LICENSE)；加入本地持久化与鉴权；高 |
| I11 | [Automerge](https://github.com/automerge/automerge) | C / 无 | local-first CRDT、断线编辑和自动合并 | [MIT](https://github.com/automerge/automerge/blob/main/LICENSE)；本地打包 WASM；高 |
| I12 | [node-qrcode](https://github.com/soldair/node-qrcode) | C / 无 | 房间 URL、局域网 IP 的本地二维码 | [MIT](https://github.com/soldair/node-qrcode/blob/master/license)；同时显示短码；高 |
| I13 | [LiveKit](https://github.com/livekit/livekit) | C+D / 无 | 自托管信令与 SFU 音视频 | [Apache-2.0](https://github.com/livekit/livekit/blob/master/LICENSE)；本地 token、内网 IP 和 HTTPS；高 |
| I14 | [Jitsi Meet](https://github.com/jitsi/jitsi-meet) | C+D / 无 | 完整自托管会议栈 | [Apache-2.0](https://github.com/jitsi/jitsi-meet/blob/master/LICENSE)；关闭统计/直播/电话；高但过重 |
| I15 | [MediaPipe](https://github.com/google-ai-edge/mediapipe) | D 或 C+D / 无 | 浏览器姿态、手势、人脸与对象任务 | [Apache-2.0](https://github.com/google-ai-edge/mediapipe/blob/master/LICENSE)；模型/WASM 本地化；高 |
| I16 | [vosk-browser](https://github.com/ccoreilly/vosk-browser) | D 或 C+D / 无 | 浏览器 Worker/WASM 离线 ASR | [Apache-2.0](https://github.com/ccoreilly/vosk-browser/blob/master/COPYING)；语言模型另核；中高 |
| I17 | [whisper.cpp](https://github.com/ggml-org/whisper.cpp) | D 或 C+D / 无 | 浏览器 WASM或本机原生离线转写 | [MIT](https://github.com/ggml-org/whisper.cpp/blob/master/LICENSE)；模型体积、线程和头部配置；高 |
| I18 | [sherpa-onnx](https://github.com/k2-fsa/sherpa-onnx) | D 或 C+D / 无 | ASR、TTS、VAD、关键词识别与 WASM | [Apache-2.0](https://github.com/k2-fsa/sherpa-onnx/blob/master/LICENSE)；按功能裁剪，模型逐项审；高 |
| I19 | [Transformers.js](https://github.com/huggingface/transformers.js) | D / 默认下载，目标无 | 浏览器 ONNX 文本、图像、音频与多模态推理 | [Apache-2.0](https://github.com/huggingface/transformers.js/blob/main/LICENSE)；设置本地模型路径；高 |
| I20 | [ONNX Runtime](https://github.com/microsoft/onnxruntime) | D / 无 | WASM/WebGPU 通用模型执行层 | [MIT](https://github.com/microsoft/onnxruntime/blob/main/LICENSE)；固定 WASM、线程与兼容回退；高 |
| I21 | [Three.js](https://github.com/mrdoob/three.js) | B/D / 无 | 3D 场景、粒子、模型和后处理 | [MIT](https://github.com/mrdoob/three.js/blob/dev/LICENSE)；资源压缩与移动端降级；高 |
| I22 | [Babylon.js](https://github.com/BabylonJS/Babylon.js) | B/D / 无 | 完整 Web 3D 引擎、物理与资产管线 | [Apache-2.0](https://github.com/BabylonJS/Babylon.js/blob/master/license.md)；按模块构建；高 |
| I23 | [Rapier](https://github.com/dimforge/rapier) | B/D / 无 | Rust/WASM 2D/3D 物理 | [Apache-2.0](https://github.com/dimforge/rapier/blob/master/LICENSE)；本地 WASM；高 |
| I24 | [Phaser](https://github.com/phaserjs/phaser) | B/C / 无 | 2D 游戏循环、输入、动画和资源 | [MIT](https://github.com/phaserjs/phaser/blob/master/LICENSE.md)；固定发布包、共享输入层；高 |
| I25 | [PixiJS](https://github.com/pixijs/pixijs) | B/C / 无 | 高性能 2D 渲染和粒子 | [MIT](https://github.com/pixijs/pixijs/blob/dev/LICENSE)；只引入所需模块；高 |
| I26 | [Matter.js](https://github.com/liabru/matter-js) | A/B/C / 无 | 2D 刚体、碰撞与约束 | [MIT](https://github.com/liabru/matter-js/blob/master/LICENSE)；确定性同步需服务端裁决；高 |

#### 基础设施重点判断

**Socket.IO（C）**应成为默认局域网房间层。对两个人的小型游戏，它比 WebRTC 更容易调试，也更容易判断数据到底去了哪里。主机是状态权威，二维码只包含局域网 URL 和随机房间 token；客户端 bundle 必须本地保存。只有音视频或大文件直传确有价值时，再升级到 PeerJS。

**Yjs + y-websocket（C）**适合共同写作、地图和画布。每端保存文档副本，本机 WebSocket 负责同步；与 Socket.IO 的服务器权威模型不同。两者不应该强行统一成同一种状态层：实时游戏用 Socket.IO，长期协作文档用 CRDT。

**MediaPipe（D/C+D）**允许摄像头画面始终留在各自设备，只同步动作类别、关键点摘要或得分。代码 Apache-2.0，但任务模型、示例素材和第三方依赖仍需单独记录。局域网手机访问摄像头通常需要可信 HTTPS，`localhost` 的例外不能自动覆盖内网 IP。

**sherpa-onnx（D）**比“只做转写”的方案覆盖面更广：关键词检测、VAD、ASR、TTS 都可本地运行，也支持 WebAssembly。它适合后续统一语音能力包，但模型矩阵很大，第一版只应选一个功能、一个语言和一个固定模型。

## 4. 横纵交汇：历史如何塑造当前选择

### 4.1 从“作品自带一切”到“仓库提供能力，作品只声明需求”

A 级时代，每个作品复制一份动画库、字体和音效似乎没什么问题。进入 C/D 后，这种方式会迅速失控：每个房间项目带一套 Node，每个语音项目带一份 WASM 和模型，每个 3D 项目重复下载引擎。

技术演进带来的不是“所有作品都更重”，而是需要一个分层仓库：

```text
作品（玩法、文案、素材、experience.json）
  ↓ 声明需要的能力
共享浏览器层（Canvas、输入、计时、遮挡、计分）
  ↓
共享本机层（静态服务、Socket.IO、二维码、进程生命周期）
  ↓ 可选
能力包（语音、视觉、3D、本地模型）
```

这也是统一依赖的合理边界。统一的是启动、版本、缓存和许可证清单，不是强迫所有作品加载同一套巨型 bundle。

### 4.2 A 与 C 是最互补的两极

A 级给出最低风险的完整作品，C 级提供最明显的双人价值。很多玩法可以先 A 后 C：你画我猜先做热座版，再做双设备；海战棋先做遮挡交接，再让双方各看自己的棋盘；问答先同屏轮流，再让两人秘密提交。

B 级是这条路径的共同启动壳，D 级则是可选感官增强。按这个关系建设，比同时做四套互不相干的项目更稳。

### 4.3 WebRTC 并不是 Socket.IO 的升级版

历史上 WebRTC 为实时媒体和点对点数据而生，Socket.IO 为可靠事件和房间状态服务。两者解决的问题不同。两人画猜、棋类、抢答和同步机关用 Socket.IO 更清楚；视频模仿、语音直连和大文件互传才需要 WebRTC。

如果只因为“P2P 听起来更离线”就引入 WebRTC，反而可能悄悄带入公共 STUN/TURN、HTTPS 证书和复杂断线路径。技术选择应由数据类型决定，而不是由名词的新旧决定。

### 4.4 本地 AI 的瓶颈从 API 费用转移到许可与交付

Transformers.js、WebLLM、MediaPipe 和 sherpa-onnx 证明推理不必上传私人内容。但本地推理把问题移动到了模型文件：多大、从哪下载、能否再分发、能否商用、低端机器是否跑得动、清理缓存后怎么恢复。

因此 D 级验收的核心不是“断网时调用成功一次”，而是一个可审计的模型 manifest 与明确的硬件 Gate。

## 5. 三种未来剧本

### 5.1 最可能剧本：A 级作品库 + 一套稳定 C 级房间

仓库先完成拆信封、反应力、热座画猜等小作品，同时建立统一启动器、manifest、Socket.IO 房间和二维码。随后同一房间层复用到四子棋、同步机关、手机控制器和局域网画猜。

这个剧本的优势是每批都有可玩的成果，基础设施由真实作品反向验证。D 级只做一个语音或姿态样板，不拖慢主线。

### 5.2 最危险剧本：把“统一依赖”做成一个重型平台

根安装一次拉入 React、Three.js、LiveKit、ComfyUI、多套模型和数据库；门户看起来完整，却没有任何作品达到开箱即玩。依赖升级互相牵制，许可证清单难以维护，低端电脑安装失败，A 级小作品也被迫经过服务。

触发这个剧本的信号包括：没有作品也先设计万能插件系统、所有候选都进入根依赖、模型在启动时隐式下载、共享层开始包含具体玩法逻辑。

### 5.3 最乐观剧本：本地优先成为情侣体验的产品语言

A 级负责“送给你”，C 级负责“我们一起”，D 级负责“只有我们的设备知道”。私人照片、声音和对话不离开本地，不是后台设置，而成为作品中的明确承诺。

统一启动器读取作品 manifest，按需安装能力包；每个作品都有借鉴声明、隐私说明与可替换素材。局域网房间稳定后，异地公网只作为可插拔中继，不改变默认本地架构。

## 6. 推荐实施顺序

### P0：先建立可验证的最小闭环

1. 统一 `experience.json`、根启动器和本地静态服务；
2. 保留 Love Tree 的 A 级直接打开；
3. 做一个 A 级惊喜、一个 A 级合作、一个 A 级对抗；
4. 用 Socket.IO + node-qrcode 做一个 C 级同步按键样板；
5. 在离线、端口占用、重复启动、退出清理和手机加入五个场景验收。

### P1：复用房间与内容能力

- C 级局域网你画我猜：自制 Canvas + Socket.IO；
- C 级棋类或抢答：复用房间、席位和断线恢复；
- B 级 360° 回忆空间：Pannellum；
- A/B 级私人照片拼图：本地图片导入，不提交照片；
- CRDT 爱情地图：Yjs + y-websocket，仅在真实协作需求出现后引入。

### P2：一次只引入一个 D 级能力

优先次序建议为：MediaPipe 手势/姿态 → sherpa-onnx 或 whisper.cpp 语音 → Transformers.js 小模型 → WebLLM → ComfyUI。每一步先完成能力包、模型 manifest、硬件检查和清理机制，再交给作品使用。

2026-07-17 进入首个 D 级实作前重新复核后，选定 `whisper.cpp v1.8.6` 的浏览器 WASM 与多语种 `ggml-base`，先实现短句本地转写能力包和双人倾听作品“我听见了”。本轮没有采用 sherpa-onnx：其引擎能力完整，但当前目标是自由短句而非关键词，且拟评估的中英 KWS 模型没有随发布包提供独立许可证文本。固定模型、哈希、安装、隐私和借鉴边界见 [`32-local-speech-and-i-heard-you-spec.md`](./32-local-speech-and-i-heard-you-spec.md)。

## 7. 许可证、运行时、模型和素材的四层 Gate

### 7.1 代码许可证

- MIT、Apache-2.0、BSD、ISC：可以优先评估，但保留许可证、版权和适用的 NOTICE；
- MPL-2.0：关注被修改文件的源码义务；
- GPL-3.0、AGPL-3.0：直接引入时单独保持边界，AGPL 还涉及通过网络交互的修改版；
- 未声明许可证：只参考抽象玩法，不复制源码、文案、视觉和题库。

### 7.2 运行时许可

Node.js、Python、浏览器、FFmpeg、原生二进制、WASM 包装层可能采用不同许可证。`ffmpeg.wasm` 的 JavaScript 包装是 MIT，不会自动把所选 FFmpeg 构建变成 MIT。统一安装器必须记录实际分发的二进制与构建选项。

### 7.3 模型许可

Transformers.js、ONNX Runtime、WebLLM、MediaPipe、whisper.cpp 和 sherpa-onnx 是运行引擎；被加载的每个模型有自己的模型卡、权重许可证、训练来源和使用限制。manifest 至少记录：模型名、版本、URL、哈希、大小、许可证、是否允许再分发、最低内存与推荐后端。

### 7.4 素材许可

图片、字体、图标、音乐、音效、题库、3D 模型和 preset 单独列项。私人照片和自录音频可以本地使用，但不默认提交公开仓库；商业音乐不能因为页面代码是 MIT 就一起发布。

## 8. 借鉴声明如何落地

只要实际参考过项目，就在对应作品 README 写明：

```markdown
## 借鉴与来源声明

| 项目 | 原作者与来源 | 借鉴类型 | 实际使用 | 许可证 | 本仓库处理 |
| --- | --- | --- | --- | --- | --- |
| Socket.IO | socketio/socket.io | 第三方依赖 | 局域网房间与重连 | MIT | 固定版本，本地打包客户端 |
| Doodle Dash | xenova/doodle-dash | 玩法机制 | 仅参考本地识图竞猜机制 | 未声明 | 未复制源码、题库或素材 |
```

声明需要区分五种情况：玩法机制、架构设计、修改代码、第三方依赖、模型与素材。即使最终完全重写，也不能用“独立实现”抹掉实际发生过的参考。

## 9. 引入前的实机复核清单

- 固定候选的 tag 或 commit，再重新打开 `LICENSE` / `COPYING` / `NOTICE`；
- 安装结束后断开公网，启动、加入、游玩、重开和退出全部通过；
- 浏览器 Network 中没有 CDN、统计、公共 WebSocket、Firebase、公共模型和意外 STUN/TURN；
- C 级显示真实局域网地址、二维码、短码与停止按钮；
- 摄像头和麦克风在手机访问的可信上下文中工作；
- 模型、WASM、大型素材有 manifest、哈希、大小、许可证和清理方式；
- 作品 README 的借鉴声明与锁文件、源码、素材目录完全一致；
- 新发现的可复现缺陷写入 `bugs/`，跨作品知识写入 `learn/`。

## 10. 来源清单

### 开放标准与官方文档

- [WebSocket Protocol — RFC 6455](https://www.rfc-editor.org/rfc/rfc6455)
- [WebRTC 1.0 — W3C](https://www.w3.org/TR/webrtc/)
- [WebAssembly Core Specification — W3C](https://www.w3.org/TR/wasm-core-2/)
- [WebGPU — W3C](https://www.w3.org/TR/webgpu/)
- [Socket.IO Rooms 官方文档](https://socket.io/docs/v4/rooms/)
- [Yjs y-websocket 官方文档](https://docs.yjs.dev/ecosystem/connection-provider/y-websocket)
- [PeerServer 自托管文档](https://peerjs.com/server/getting-started)
- [LiveKit 本地自托管文档](https://docs.livekit.io/transport/self-hosting/local/)
- [Drawpile 专用服务器文档](https://docs.drawpile.net/help/server/dedicatedserver)

### 重点仓库

- 惊喜：[PhotoSwipe](https://github.com/dimsemenov/PhotoSwipe)、[Pannellum](https://github.com/mpetroff/pannellum)、[Marzipano](https://github.com/google/marzipano)、[WebLLM](https://github.com/mlc-ai/web-llm)、[ComfyUI](https://github.com/Comfy-Org/ComfyUI)
- 合作：[Whitebophir](https://github.com/lovasoa/whitebophir)、[Excalidraw](https://github.com/excalidraw/excalidraw)、[excalidraw-room](https://github.com/excalidraw/excalidraw-room)、[PairDrop](https://github.com/schlagmichdoch/PairDrop)、[Etherpad](https://github.com/ether/etherpad)
- 对抗：[lan-games](https://github.com/kbennett2000/lan-games)、[PocketWebGames](https://github.com/marceld23/PocketWebGames)、[drawrush.io](https://github.com/ShubhVaish1703/drawrush.io)、[Massive Decks](https://github.com/Lattyware/massivedecks)、[Doodle Dash](https://github.com/xenova/doodle-dash)
- 基础设施：[Socket.IO](https://github.com/socketio/socket.io)、[Colyseus](https://github.com/colyseus/colyseus)、[Yjs](https://github.com/yjs/yjs)、[MediaPipe](https://github.com/google-ai-edge/mediapipe)、[sherpa-onnx](https://github.com/k2-fsa/sherpa-onnx)、[Transformers.js](https://github.com/huggingface/transformers.js)、[ONNX Runtime](https://github.com/microsoft/onnxruntime)

候选表中的项目名和许可证均链接到原仓库或其许可证文件。聚合文章和搜索摘要仅用于发现线索，没有作为许可证结论来源。许可证与上游状态会变化，正式引入时必须在固定版本上再次核验。
