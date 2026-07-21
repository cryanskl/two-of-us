# 我听见了

两个人在同一台电脑上轮流说一句想让对方认真听见的话。本地 `whisper.cpp` 把录音转成可编辑草稿；每个人亲自校正并确认后，两句话才在同一页相遇。

## 打开方式

这是 D 级作品，不能用 `file://` 直接运行。首次使用先双击仓库根目录的 `setup.command`（Windows 使用 `setup.bat`），在可选能力提示中确认安装 `speech-whisper-base`。也可以在终端运行：

```text
npm run setup
```

然后直接双击本目录的 `start.command`（Windows 使用 `start.bat`），或从根门户进入「我听见了」。单作品启动器会复用仓库统一 Node 运行时，不会额外安装或后台下载模型。模型只安装一次；完成安装后，作品核心流程不需要公网。

如果首次 setup 时拒绝或跳过了模型，可精确补装、诊断或移除：

```text
node scripts/capabilities.mjs install speech-whisper-base
node scripts/capabilities.mjs doctor speech-whisper-base
node scripts/capabilities.mjs remove speech-whisper-base
```

## 隐私与限制

- 用户点击录音按钮后才请求一个麦克风音频轨；
- 每句最长 12 秒，AudioWorklet 采集单声道 PCM，页面重采样为 16 kHz；
- PCM 转交本机 Worker 后不持久化，重录、确认、隐藏页面或关闭页面都会释放对应资源；
- 转写只保留在当前页面内存，不写 localStorage、IndexedDB、Cache API 或服务端文件；
- 不使用云 ASR、遥测、情绪判断、声纹识别或声音克隆；
- base 模型可能听错人名、地名和口音，所以草稿必须由本人校正，不能把结果当作逐字真相。

## 借鉴与来源声明

| 来源 | 类型 | 本作品实际使用 / 借鉴 | 处理方式 |
| --- | --- | --- | --- |
| [whisper.cpp `v1.8.6`](https://github.com/ggml-org/whisper.cpp/tree/23ee03506a91ac3d3f0071b40e66a430eebdfa1d) | 第三方本地推理依赖 | 通过仓库 `speech-whisper-base@1` 能力包执行 WASM 转写 | MIT；许可证、固定 revision、构建工具和哈希保存在能力目录 |
| [OpenAI Whisper `v20250625`](https://github.com/openai/whisper/tree/31243bad24cc746f07d4c8bfdd2d974872cb1803) | 模型上游 | `ggml-base` 权重、模型架构与 tokenizer 的上游来源 | MIT；与 whisper.cpp 引擎来源分开声明 |
| whisper.cpp `whisper.wasm` 官方示例 | 技术参考 | 参考浏览器内模型加载、typed-array 到 WASM 内存的复制和 pthread 运行边界 | 未复制示例 DOM、CSS、视觉、文案或控制台输出协议；本仓库自写结构化绑定与 Worker |
| OpenAI ImageGen 概念图 | 设计过程素材 | [`docs/assets/i-heard-you/concept.png`](../../../docs/assets/i-heard-you/concept.png) 用于确定暖纸、双声轨和单主控方向 | 概念图不作为页面运行资产；最终 DOM、CSS、图形和交互由本仓库实现 |

两轮交接状态机、中文文案、AudioWorklet 录音、重采样、Worker 客户端、隐私生命周期和最终视觉均为本仓库独立实现。没有复制其他情侣页面或开源作品的界面与素材。
