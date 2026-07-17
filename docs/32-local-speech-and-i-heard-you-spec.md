# 本地语音能力包与「我听见了」规格

> 状态：brainstorm、技术路线与产品边界冻结；里程碑 A 与 B1 能力服务边界完成，B2 WASM 构建、B3 自检和 C 体验待实现
> 日期：2026-07-17
> 目标等级：D（安装一次本地语音能力包，此后双击启动器）
> 主分类：双人合作
> 设备：同一台 macOS / Windows 电脑，两人轮流使用麦克风

## 1. 为什么首个 D 级作品选语音

仓库已有 A 级直开、B 级 localhost 与 C 级局域网房间，但还没有验证“运行时 + 模型 + 权限 + 大文件 + 本机推理”的完整 D 级交付链。首个 D 级样板不应该同时引入 LLM、TTS、声纹、情绪识别或双设备 HTTPS；它只验证一条窄而完整的能力：**用户主动录一段短句，模型完全在当前电脑转写，用户本人校正并确认，原始音频随即释放。**

作品名定为「我听见了」，目录 ID 为 `i-heard-you`。它不是语音记事本，而是一段两人轮流倾听的关系练习：第一人说一句感谢，第二人听完后回应，最终留下两句由各自本人确认的文字。

## 2. Brainstorm 取舍

| 方向 | 情侣价值 | 技术价值 | 本轮结论 |
| --- | --- | --- | --- |
| 我听见了 | 先完整听完，再回应；没有输赢压力 | 验证短句 ASR、校正、交接与内存清理 | **采用** |
| 同声成诗 | 六句轮流接成短诗，成品感强 | 同一能力重复六次 | 暂缓，首版流程过长 |
| 一句默契 | 两人秘密说短词后同时揭晓 | 短词识别负担低 | 暂缓，与“和你一样”结构重复 |
| 语音暗号竞猜 | 转写后遮住关键词让对方猜 | 更像游戏 | 暂缓，自动/人工评分与遮挡流程扩大范围 |
| 情绪识别 / 声纹 | 表面惊喜感强 | 引入高风险推断 | 不做；模型不能替用户判断感情或身份 |

首版不保存音频、不导出卡片、不自动总结、不分析情绪、不识别人、不评分，也不提供云 ASR 兜底。转写必须可编辑；模型结果只是草稿，不能冒充用户的准确原话。

## 3. 玩家流程

### 3.1 能力与权限前置页

1. 作品由本地启动器打开；页面先读取 `speech-whisper-base@1` 能力状态；
2. 缺少能力时显示名称、约 200 MiB 磁盘预算、来源、安装入口和“返回门户”，不在页面内隐式下载；
3. 能力损坏时显示 `doctor` / 重新安装命令，不把损坏伪装成麦克风失败；
4. 能力可用后，说明数据路径“麦克风 → 当前浏览器 → 当前电脑的 WASM Worker”；
5. 只有用户点击“启用麦克风”后才调用 `getUserMedia()`。

### 3.2 两句回应

第一轮提示固定为：

> 最近最想谢谢你的一件事是……

第一人点击开始、说 `2–12s`、再次点击结束。页面把单声道 PCM 重采样到 `16 kHz`，交给本机 Worker；转写完成后第一人可修改文字，点击“这就是我想说的”。原始 PCM、MediaStream 与临时推理输入随后释放。

页面进入明确交接页，由第二人点击“我准备听了”。第二轮提示固定为：

> 听完这句话，我想对你说……

第二人完成同样的录音、转写、校正与确认。结果页把两句确认文本并排呈现为“我们的回声”，提供“重新开始”和“返回门户”。重开、刷新或关闭页面都清空结果；首版没有保存和导出。

### 3.3 状态机

```text
checking-capability
  ├─ missing / corrupt / incompatible → unavailable
  └─ ready → permission-intro
permission-intro
  ├─ denied / no-device / busy → permission-error
  └─ granted → prompt-one
prompt-one / prompt-two
  ├─ start → recording
  ├─ recording + stop / 12s → transcribing
  ├─ transcribing + result → reviewing
  ├─ reviewing + retry → prompt
  └─ reviewing + confirm → handoff / complete
complete
  └─ replay → prompt-one
```

浏览器 UI 状态与能力安装状态分开。安装状态由本地服务读取 receipt 与哈希；页面不能只凭一个布尔变量宣称模型已经安装。

## 4. 语音能力包决策

### 4.1 选择 whisper.cpp WASM

首版固定 [ggml-org/whisper.cpp `v1.8.6` / `23ee035`](https://github.com/ggml-org/whisper.cpp/tree/23ee03506a91ac3d3f0071b40e66a430eebdfa1d)。官方 WASM 示例明确支持浏览器内推理、麦克风输入、WASM SIMD 与 `tiny/base` 模型，并声明音频留在本机；代码采用 [MIT](https://github.com/ggml-org/whisper.cpp/blob/v1.8.6/LICENSE)。

WASM 从固定 tag 的源码可复现构建，首版保留 Pthreads 与 SIMD，因此 D 级页面和能力资源需要作用域限定的：

```text
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
Cross-Origin-Resource-Policy: same-origin
```

这些响应头不能全局加到门户或 A/B/C 作品，避免改变现有窗口、局域网与第三方资源行为。

### 4.2 固定多语种 ggml-base

模型使用 [ggerganov/whisper.cpp 模型仓库固定 revision `5359861`](https://huggingface.co/ggerganov/whisper.cpp/tree/5359861c739e955e79d9a303bcbc70fb988958b1) 的 `ggml-base.bin`：

| 字段 | 冻结值 |
| --- | --- |
| 文件 | `ggml-base.bin` |
| 语言 | 多语种，首版 UI 固定中文转写 |
| 字节数 | `147951465` |
| 下载响应 `x-linked-etag` | `60ed5bc3dd14eea856493d334349b405782ddcaf0028d4b5df4088345fba2efe` |
| whisper.cpp 模型表 SHA | `465707469ff3a37a2b9b8d8f89f2f99de7299dac` |
| 来源许可 | 模型仓库声明 MIT；上游 [OpenAI Whisper `v20250625` / `31243ba`](https://github.com/openai/whisper/tree/31243bad24cc746f07d4c8bfdd2d974872cb1803) 亦为 [MIT](https://github.com/openai/whisper/blob/v20250625/LICENSE) |

安装实现前必须实际下载一次并重新计算 SHA-256，不能把 HTTP 头字段未经验证地当作最终本地文件哈希。最终 manifest 只写实测 SHA-256；上表的两种上游哈希保留为来源交叉证据。

选择 base 而不是 tiny，是为了降低中文口语、人名和地名的明显错误；选择 base 而不是 small，是为了把单模型限制在约 142 MiB。即使如此，转写仍必须允许本人校正，不承诺逐字准确。

### 4.3 为什么本轮不选 sherpa-onnx

[sherpa-onnx](https://github.com/k2-fsa/sherpa-onnx) 的 Apache-2.0 引擎同时支持 macOS、Windows、JavaScript、WASM、ASR、VAD、关键词和 TTS，是未来统一实时语音能力的重要候选。当前 npm `sherpa-onnx@1.13.4` 的解包体积约 `21.3 MB`；中文/英文开放词表关键词模型压缩包约 `32.9 MB`。

但该关键词模型发布包没有随包提供独立许可证文本，模型训练与再分发边界还需继续追溯；而「我听见了」需要自由短句转写，不是关键词触发。首版不为“未来也许需要”的 VAD、KWS、TTS 引入更大的模型矩阵。第二个语音作品若明确需要实时暗号，再重新评估独立的 `speech-kws-zh` 能力包。

## 5. 统一能力目录

根基础安装保持轻量，A/B/C 用户不下载语音模型。新增按需能力层：

```text
two-of-us/
├── capabilities/
│   └── speech-whisper-base/
│       ├── manifest.json       # 固定引擎、模型、构建与许可
│       ├── browser/            # 已审计的 WASM/JS/Worker 运行资产
│       ├── licenses/           # whisper.cpp 与 OpenAI Whisper 许可
│       └── README.md
├── scripts/
│   └── capabilities.mjs        # status/install/doctor/remove
└── experiences/co-op/i-heard-you/
    ├── start.command / start.bat
    └── ...
```

大模型不提交到 Git。默认数据目录：

| 平台 | 目录 |
| --- | --- |
| macOS | `~/Library/Application Support/TwoOfUs/` |
| Windows | `%LOCALAPPDATA%\TwoOfUs\` |
| Linux 开发/CI | `$XDG_DATA_HOME/two-of-us/` 或 `~/.local/share/two-of-us/` |

测试和便携包可用 `TWO_OF_US_DATA_DIR` 显式覆盖。不得修改用户全局 Python、shell profile、Homebrew 或系统模型缓存。

## 6. Manifest 与安装契约

manifest 至少包含：

```json
{
  "schemaVersion": 1,
  "id": "speech-whisper-base",
  "protocolVersion": 1,
  "engine": {
    "name": "whisper.cpp",
    "version": "1.8.6",
    "revision": "23ee03506a91ac3d3f0071b40e66a430eebdfa1d",
    "license": "MIT"
  },
  "model": {
    "name": "ggml-base multilingual",
    "revision": "5359861c739e955e79d9a303bcbc70fb988958b1",
    "bytes": 147951465,
    "sha256": "IMPLEMENTATION_MUST_REPLACE",
    "license": "MIT"
  },
  "requirements": {
    "microphone": true,
    "worker": true,
    "wasmSimd": true,
    "crossOriginIsolated": true,
    "recommendedMemoryMiB": 8192
  }
}
```

占位哈希使 manifest 在实现完成前明确不可安装，防止“规格草稿”被误认为发布包。

统一命令：

```text
node scripts/capabilities.mjs status
node scripts/capabilities.mjs install speech-whisper-base
node scripts/capabilities.mjs doctor speech-whisper-base
node scripts/capabilities.mjs remove speech-whisper-base
```

安装必须：

1. 先显示下载体积、来源、许可证、磁盘位置和清理命令；
2. 用户确认后才下载；测试可使用显式 `--yes`；
3. 下载写入 `.part`，检查 HTTP 状态、长度和 SHA-256；
4. 只有校验全部通过才原子改名并写 receipt；
5. 中断、哈希错误或空间不足不会留下“已安装”假状态；
6. `doctor` 重新检查所有固定资产；
7. `remove` 只删除该能力包自己的目录，不碰其他作品或用户文件。

作品启动时不得联网下载、自动升级或切换模型。能力缺失只显示可操作提示。

## 7. 本地服务与门户契约

catalog 条目声明：

```json
{
  "id": "i-heard-you",
  "title": "我听见了",
  "category": "co-op",
  "level": "D",
  "players": "2 人轮流",
  "devices": "本机单设备",
  "networkRequired": false,
  "capabilities": ["speech-whisper-base@1"]
}
```

`installed` 仍表示作品代码存在；能力状态由本地 API 动态给出：`available / missing / corrupt / incompatible`。麦克风授权是浏览器会话状态，不写成安装状态。

本地服务只通过 manifest 白名单路由暴露所需模型文件，不把整个用户数据目录变成静态根；API 不返回绝对用户路径。D 级启动器复用现有 Node 服务，打开单一作品 URL。重复双击需要复用健康的已有服务，避免同时加载多个 142 MiB 模型。

## 8. 录音、推理与隐私边界

- 只在用户点击后请求单个音频轨；
- Web Audio 直接取得 PCM 并重采样为 `16 kHz` 单声道，不引入 FFmpeg；
- 一次最长 `12s`，页面同一时间只有一个 MediaStream、AudioContext 和 Worker 任务；
- 录音停止后立即停止全部 track；确认或重录后释放 PCM；
- Worker 不记录原始音频、转写、用户名、耗时或设备标识；
- 转写文本只保存在本轮内存状态，不使用 localStorage、IndexedDB、Cache API 或服务端文件；
- 页面关闭、重开、隐藏或异常时终止录音并释放资源；
- Network 验收只允许 localhost，不允许模型源、遥测、错误上报或云 ASR；
- 不声称声纹验证、“只有对方能看见”或模型理解了情绪。

如果未来提供保存声音或导出卡片，必须成为用户明确触发的独立功能，并重新设计文件生命周期；不能借首版顺手持久化私人录音。

## 9. 视觉与交互方向

页面是一张开放的暖纸，不做录音棚仪表盘或卡片网格。顶部显示“我听见了”和 `1 / 2`；中间只有当前提示、一条双声轨和一个主要录音按钮；下方是可编辑转写与“重新说 / 确认这句话”。两人都确认后，两条声轨在中央汇合，两句文字并排出现。

状态不能只靠颜色：录音使用文字“正在听”、计时和实心圆；转写使用“正在本机整理”；错误给具体恢复动作。`prefers-reduced-motion` 下声轨不滚动，只保留即时音量柱和状态文字。所有麦克风与重试按钮至少 `44 × 44px`。

## 10. 明确不做

- 实时逐字字幕、VAD 自动结束或关键词唤醒；
- LLM 改写、总结、情感建议或自动回复；
- 情绪、关系质量、谎言、声纹或身份判断；
- TTS、声音克隆、变声、说话人分离；
- 云 ASR fallback、账号、遥测、排行榜或分享；
- 多模型选择、GPU/WebGPU 后端或自动升级；
- Python 服务、FFmpeg、Electron 或全局命令安装；
- 手机扫码录音、局域网麦克风或 C+D 组合；
- 自动保存音频、转写或最终结果。

## 11. 实现计划与提交边界

### 里程碑 A：能力管理器

- 建立 manifest schema、数据目录、status/install/doctor/remove；
- 完成 `.part`、长度、SHA-256、原子 receipt 与错误测试；
- 下载并实测模型哈希；
- 独立提交。

### 里程碑 B：WASM 构建与服务边界

- B1（已完成）：加入脱敏能力状态 API、loopback 限制与白名单模型路由；
- B2a（已完成）：从固定 whisper.cpp tag 构建自有结构化绑定，提交 JS/WASM、Emscripten 许可证与完整产物哈希；
- B2b（已完成）：把固定 JS/WASM 加入 manifest，加入 loopback 白名单引擎路由并在状态检查与服务时双重校验；
- B2c：加入 D 级作用域响应头；
- B3：完成单实例模型复用与结构化 Worker 协议；
- 用固定短 WAV 做断网自检；
- 独立提交。

### 里程碑 C：我听见了

- 完成录音、PCM、Worker、两轮交接、校正和释放；
- 接入 catalog、门户、macOS/Windows 启动器与借鉴声明；
- 自动测试、Chrome 实录、断网 Network、权限拒绝和资源释放验收；
- Bug 写入 `bugs/`，可复用经验写入 `learn/`；
- 独立提交。

任何里程碑只有门禁通过才提交，不把多个已完成部分攒成一个大提交。

## 12. 完成 Gate

- 空数据目录安装成功；下载中断与哈希错误不会产生 receipt；
- `doctor` 可区分 missing、corrupt 与 incompatible；
- 安装完成后断开公网，双方都能录音、转写、校正、确认与重开；
- 12 秒音频在目标基准机上的推理时间被实际记录，不以官方示例数据代替；
- 麦克风拒绝、无设备、占用和页面隐藏都有明确状态；
- 确认、重录、重开和关闭后麦克风轨与 Worker 被释放；
- Network 只有 localhost；A/B/C 作品不加载语音 WASM 或模型；
- macOS arm64 与 Windows x64 至少各实测一次；未实测的平台必须诚实标为待验证；
- 删除能力包后作品回到可操作的安装提示；
- 引擎、模型、上游 Whisper、构建工具和实际参考代码分别声明来源与许可证；
- 当前有 Node 的机器可以安装一次后点开即用；面向全新普通电脑的发行包在捆绑固定 Node runtime 前，不宣称“零前置安装”。

## 13. 借鉴与来源声明草案

| 项目 | 固定来源 | 借鉴 / 使用类型 | 许可证与处理 |
| --- | --- | --- | --- |
| whisper.cpp | [`v1.8.6` / `23ee035`](https://github.com/ggml-org/whisper.cpp/tree/23ee03506a91ac3d3f0071b40e66a430eebdfa1d) | 第三方 WASM 推理引擎；参考官方浏览器示例的 Worker、模型加载和麦克风边界 | MIT；保留许可证，记录构建工具与产物哈希，不复制官方页面视觉或文案 |
| OpenAI Whisper | [`v20250625` / `31243ba`](https://github.com/openai/whisper/tree/31243bad24cc746f07d4c8bfdd2d974872cb1803) | ggml-base 的上游模型与 tokenizer 来源 | MIT；模型来源与引擎许可分开声明 |
| ggerganov/whisper.cpp model repository | [`5359861`](https://huggingface.co/ggerganov/whisper.cpp/tree/5359861c739e955e79d9a303bcbc70fb988958b1) | 固定 `ggml-base.bin` 转换权重 | MIT；安装期下载、实测 SHA-256，不提交模型到 Git |
| sherpa-onnx | [官方仓库](https://github.com/k2-fsa/sherpa-onnx) 与 [KWS 文档](https://k2-fsa.github.io/sherpa/onnx/kws/index.html) | 技术比较：实时 ASR / KWS / VAD 能力矩阵 | Apache-2.0 引擎未引入；当前 KWS 模型许可未闭环，不复制代码或模型 |

作品中文文案、两轮倾听流程、状态机、视觉和交互自行设计；正式 README 必须根据最终真实依赖、构建产物和模型 manifest 更新本表，不能机械复制草案。
