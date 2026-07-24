# Two of Us 第二轮候选维护增量

> 复核日期：2026-07-24  
> 对应基线：[第二轮本地优先项目调研](./60-local-first-second-pass-research.md)  
> 范围：新增 21 个未出现在基线表中的 A/B/C/D 候选  
> 证据：固定提交、仓库许可证、项目 README 与官方文档  
> 本轮边界：只做调研与选型，不复制第三方源码、不新增根依赖

## 0. 结论

本批次把候选分成三类：

| 结论 | 数量 | 含义 |
| --- | ---: | --- |
| 可直接或满足条件后整合 | 10 | 许可证和本地运行边界基本清楚；真正引入时仍须单独做规格、归因、资源审计与提交 |
| 只借鉴机制并自行实现 | 8 | 原项目过时、过重、强耦合或附带传播义务；保留玩法思想，不复制实现 |
| 不进入默认路线 | 3 | 许可证、运行规模或安全边界与当前双人本地仓库不匹配 |

最值得优先验证的是：

1. **Splide、wavesurfer.js、Rough.js**：分别补足无障碍照片轨道、本地音频波形、手绘质感三个可复用前端能力；
2. **StatiCrypt**：可以把静态惊喜包装成真正加密的 HTML，但密码强度与解密链接传递方式必须写清楚；
3. **Birthday-V3、Soundboard PWA**：适合演化成新的单人惊喜作品；音乐、字体和图片仍需使用自有或可分发资源；
4. **Posio**：适合重写为 C 级“双人猜我们的旅行地点”，复用仓库已有 Socket.IO 房间，不引入原项目的 Django、Redis 和在线地图依赖；
5. **Owncast**：只作为可选 C/D 直播能力旁车，不进入所有作品的统一基础安装。

## 1. 判定规则

- **直接整合**：可以固定版本并保留上游许可证与借鉴声明；依赖和资源必须本地化。
- **条件整合**：代码许可可接受，但默认配置包含公网、敏感权限、额外服务或独立资源许可。
- **机制重写**：仅参考交互、状态机或规则结构，使用本仓库代码独立实现，并在 `ATTRIBUTION.md` 写明灵感来源与“未复制源码”。
- **不进入默认路线**：不作为根依赖或正式作品源码；必要时只保留研究链接。

代码许可证不自动覆盖音乐、照片、字体、地图瓦片、题库、模型权重、游戏品牌或第三方素材。

## 2. A/B 级与共享前端能力

| 候选 | 固定来源与许可证 | 等级 | 结论 | 本地边界与用途 |
| --- | --- | --- | --- | --- |
| [Splide](https://github.com/Splidejs/splide/tree/d7e1f08e6b4f4b02a7c6ccbfbeb2d569d85715e6) | `d7e1f08`；MIT；许可证 SHA-256 `0ebc4cd9114647da9febbe8a2c17e847eca42631e9fcf8b273bc9306d0735f96` | A | 可直接整合 | 无依赖、支持触控与无障碍，可用于照片时间线；固定并本地分发 JS/CSS |
| [wavesurfer.js](https://github.com/katspaugh/wavesurfer.js/tree/ae8d3cd32ebb27273051935c01fc6e4001cde3af) | `ae8d3cd`；BSD-3-Clause；许可证 SHA-256 `0fc992dc27cc34dde78bfeb024b4cadff6320f0dcbee2f1228efaeb533ca1364` | A/B | 条件整合 | 本地音频可做语音留言与双轨合唱；麦克风插件走 B 级，音频版权另审 |
| [Rough.js](https://github.com/rough-stuff/rough/tree/56a2762171b1294d643501e8d14f120db6b27bd7) | `56a2762`；MIT；许可证 SHA-256 `dca9a392272606ac748ac0976a2a1133f14eef841c27beaa51a844d53c56a09d` | A | 可直接整合 | 为 Canvas/SVG 提供手绘线条；只固定本地 bundle，不增加运行时公网请求 |
| [MapLibre GL JS](https://github.com/maplibre/maplibre-gl-js/tree/ad2fcdb035f13206d64bdad439c47d9459246bf3) | `ad2fcdb`；`LICENSE.txt` BSD-3-Clause；许可证 SHA-256 `ee5fc05a0677eaf69601d2c7db0d9ecd6cc27c3abc1d0733bc9ed34707cf8ef2` | B | 条件整合 | 只有在地图样式、瓦片、字形和精灵全部本地化且逐项许可通过后，才用于回忆地图 |
| [browser-image-compression](https://github.com/Donaldcwl/browser-image-compression/tree/d933bc8e483a9853ed2b57338e035e8c45e40dc7) | `d933bc8`；MIT；许可证 SHA-256 `6aeb9cd1549315900b91eea89819e509818c733ea3040d59d67041c168703694` | B/共享 | 条件整合 | 本地照片预处理；默认 Worker 地址可能指向 CDN，必须自托管 `libURL` 或关闭 Worker |
| [Birthday-V3](https://github.com/sapthesh/Birthday-V3/tree/89c1194f04b8ccc6bd3698a9f076519763c597c0) | `89c1194`；MIT；许可证 SHA-256 `b5381835b1e0569e1e00ffb41ab0128b05a75e3680e022460f31e5e0e3a5d5c1` | A | 可直接整合或重写 | 信封、信件、蛋糕、气球与烟花形成完整生日叙事；应替换为自有文案与资源，补减弱动态 |
| [StatiCrypt](https://github.com/robinmoisson/staticrypt/tree/3594426d316af37dcd94f3e0ffb0c9cd6c3c5d9f) | `3594426`；MIT；许可证 SHA-256 `b2adb97c836afbb76c248124be7fa718039bd374caf47b983265741079f17614` | B/构建 | 可直接整合 | 用 Web Crypto 将完整静态页加密；生成阶段需要 Node，解密页需要 HTTPS/localhost，弱密码仍可离线爆破 |
| [Soundboard PWA](https://github.com/digitalcolony/soundboard-pwa/tree/38348cb1a54e5bbd9c0538d8ea4cd21e60d838b7) | `38348cb`；MIT；许可证 SHA-256 `e2e133d148de2cc7772305f4ad0da19d47f279918bad0426e6b208dc4801712d` | B | 条件整合 | 可演化为“我们的声音按钮”；需本地化 Google Fonts、OG 地址和音频，并关闭不可控自动更新 |
| [2048](https://github.com/gabrielecirulli/2048/tree/478b6ec346e3787f589e4af751378d06ded4cbbc) | `478b6ec`；MIT；许可证 SHA-256 `57e12c39a6ad9d98b2e451065bfdfbd15fc9e0c2ed3bf4dc1d09acab41ff02fc` | A | 机制重写 | 借鉴滑动合并和确定性状态；改成共同回忆合成或同种子对抗，不沿用名称、数字皮肤与传播外观 |
| [smile-detection](https://github.com/talhasarit/smile-detection/tree/e81cfc723bf8e3d345ab555935be77cfff449559) | `e81cfc7`；根许可证 MIT；许可证 SHA-256 `d747b121dba51749ad79483e75b26235027713932b337f358a6cda99484e1fc9` | B | 机制重写 | 可借鉴“双人十秒笑容挑战”；不复制未单独确权的模型和权重，摄像头不保存、不上传并主动停止 |

## 3. C/D 级玩法与基础设施

| 候选 | 固定来源与许可证 | 等级 | 结论 | 本地边界与用途 |
| --- | --- | --- | --- | --- |
| [Socket.io-whiteboard](https://github.com/over-engineer/Socket.io-whiteboard/tree/65a7ffd3c5c7c5c7edc2813efe51177c147be39c) | `65a7ffd`；MIT；许可证 SHA-256 `1aa486c355f48413d06c95a4c2f58cdb4d8945d06ac3af93c85d6f276299e868` | C | 机制重写 | 仅参考多人画布事件；原项目使用旧 Node/Socket.IO 与 CDN，正式作品复用仓库现有 Socket.IO 4 房间 |
| [codenames-game](https://github.com/koldoon/codenames-game/tree/441e35042b801f4e814fcf67324e64aa874ca8be) | `441e350`；AGPL-3.0；许可证 SHA-256 `8486a10c4393cee1c25392769ddd3b2d6c242d6ec7928e1414efff7dfb2f07ef` | C | 机制重写 | 仅借鉴隐藏身份、线索和回合；自创名称、规则和题库，避免 AGPL 网络义务与品牌/词库问题 |
| [HyperVox](https://github.com/CaperCube/HyperVox/tree/e8705c45068c15216179a155126a7c70e15d58fd) | `e8705c4`；MIT；许可证 SHA-256 `32179450655aafb1da849cc7460c9aa7adab0074a6859b76c7882c0288521761` | C+D | 机制重写/延后 | Babylon.js + Node + Socket.IO 的体素沙盒过重；只保留共同搭建空间的方向，素材与模组另审 |
| [Posio](https://github.com/abrenaut/posio/tree/00262568749fa841994f4c7d6d9a8c75115955d7) | `0026256`；MIT；许可证 SHA-256 `dfe90d3a356bb91455fe10c8321e596808f7849b42fde200e08d5d1ca5796feb` | C | 机制重写 | 把同步地图猜测改为“猜我们的旅行地点”；不引入 Django/Redis/在线瓦片，沿用本仓库房间服务 |
| [Owncast](https://github.com/owncast/owncast/tree/ce838853bef3f10215972d51e16c16f28b09ba94) | `ce83885`；MIT；许可证 SHA-256 `792c6849ff3b75a7ad019ded332965b767b0ebf1c8f6188b8b00b1807eabf758` | C+D | 可选旁车 | 可承载私密直播惊喜；需 FFmpeg/OBS，随机化管理员密码与串流密钥，关闭目录、联邦与公网发现 |
| [Mindustry](https://github.com/Anuken/Mindustry/tree/9af6cc0c6a21be3bb7813506e45a905b072366c7) | `9af6cc0`；GPL-3.0；许可证 SHA-256 `963392e038d7bea128e55cc67dd691c204593db3527060667f0c82f0f0a1be64` | C | 机制重写 | 借鉴共同资源、分工建造和防守；原项目需 JDK、专用服务端和原生客户端，不满足点开即玩 |
| [OpenTTD](https://github.com/OpenTTD/OpenTTD/tree/9130c591dc1e489311aaad592a938f841d2b6f6a) | `9130c59`；GPL-2.0；许可证 SHA-256 `50ac792e113700dd23ecb25ed6f341eb383bed36cb8fd87aa164f4e44f2760b3` | C | 机制重写 | 借鉴共同预算和长期目标；原生客户端、版本/模组一致性与素材许可不适合统一网页运行时 |
| [Nakama](https://github.com/heroiclabs/nakama/tree/73ad9c15d64e75eba241a80211ba1adb94019010) | `73ad9c1`；Apache-2.0；许可证 SHA-256 `cfc7749b96f63bd31c3c42b5c471bf756814053e847c10f3eb003417bc523d30` | C/D 基础设施 | 不进入默认路线 | 面向账号、数据库、匹配和持久化的完整游戏后端；两人临时局域网房间不需要这组复杂度 |
| [Y-Sweet](https://github.com/jamsocket/y-sweet/tree/4f1909b2c3390ced54d32b82a673f4f7ee8ac780) | `4f1909b`；MIT；许可证 SHA-256 `56cfde1526517c329a754a8559bdee0cd59efb66ace9766f2eff6b69172a85cc` | C/共享 | 条件整合 | 仅在共同日记/画布需要持久 CRDT 文档时启用；当前短局游戏继续使用现有内存房间 |
| [tldraw](https://github.com/tldraw/tldraw/tree/f8a4bdc003b1031990ae9dee88c14da3c76dab21) | `f8a4bdc`；tldraw 自定义许可证；许可证 SHA-256 `9578fcddc20e404b6a29f44b6fea81d8b331698c0e7e9be34132d6f4394fa533` | C/共享 | 排除直接打包 | SDK 生产使用需要单独许可密钥，并包含执行与遥测相关条款；只研究白板 UX，不把 SDK 放入作品 |
| [Marinara Engine](https://github.com/Pasta-Devs/Marinara-Engine/tree/b7545a63e7e264a1cd9eeea1a5490d50c08ddb29) | `b7545a6`；AGPL-3.0；许可证 SHA-256 `6142a08dcee50c978f552701c345788d2618548bc80b85ea58999bec94d3bdc4` | D/C+D | 不进入默认路线 | Alpha 阶段本地 AI GM，依赖 Node 24–26、模型与多媒体能力；代理脚本权限和模型许可面过大 |

## 4. 排除和去重

- `nivaboaz/CoupleCards` 与基线已有的 `michaelsboost/CoupleCards` 路线重复，不再计数。
- `ivysone/Will-you-be-my-Valentine` 的核心互动通过不断放大“同意”按钮压缩拒绝空间，不符合本仓库的同意与尊重原则；同时默认 GIF 带公网依赖，因此排除。
- `Flatris` 使用 Firebase 与 Rollbar，核心房间和诊断不是本地优先；若要俄罗斯方块式对抗，应自行实现本地状态机。

## 5. 推荐实施顺序

| 优先级 | 候选 | 下一步 |
| --- | --- | --- |
| P0 共享能力验证 | Splide、wavesurfer.js、Rough.js、StatiCrypt | 每项先做一个最小隔离样板；只有被具体作品采用时才进入统一依赖 |
| P1 新作品 | Birthday-V3、Soundboard PWA、Posio | 各自走 brainstorm → spec → plan → 实现；每个项目独立提交 |
| P1 可选能力 | Owncast | 做独立安装清单与关闭公网发现的验收，不纳入默认 setup |
| P2 条件能力 | MapLibre、browser-image-compression、Y-Sweet | 等具体作品提出地图、照片压缩或持久协作需求后再引入 |
| P2 机制储备 | 2048、smile-detection、Socket.io-whiteboard、codenames-game、HyperVox、Mindustry、OpenTTD | 只保留原创改编方向，不复制源码、品牌、题库、模型或素材 |
| 排除默认集 | Nakama、tldraw、Marinara Engine | 保留研究证据，不新增依赖 |

## 6. 后续项目的借鉴声明要求

任何采用本页候选的正式作品，至少需要：

1. 在作品目录新增或更新 `ATTRIBUTION.md`；
2. 写明仓库、固定提交、许可证、实际借鉴的机制或复制的文件；
3. 区分代码、图片、字体、音乐、地图、题库和模型许可证；
4. 若为独立重写，明确写出“参考机制，未复制上游源码或素材”；
5. 完成断网检查、对应 A/B/C/D 启动检查和浏览器实测；
6. 把该作品或明确阶段作为一个独立 Git 提交。

这份调研不是引入 21 组依赖的授权。统一依赖只收录至少被一个正式作品实际使用、能够固定版本、可以断网安装/运行且通过许可审计的组件。
