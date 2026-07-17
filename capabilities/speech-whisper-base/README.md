# speech-whisper-base

`speech-whisper-base@1` 是 Two of Us 的可选本地语音转写能力。它为 D 级作品提供多语种 Whisper base 模型，并由浏览器中的 whisper.cpp WASM Worker 完成本机推理；首个使用者是「我听见了」。

当前目录完成的是能力声明、固定模型来源与许可证留存。WASM/JS/Worker 运行资产将在里程碑 B 从固定源码构建并记录构建工具与产物哈希；在这些资产和端到端 Gate 完成前，不应宣称能力已经可运行或已在 macOS / Windows 验收。

## 冻结版本

| 项目 | 固定值 |
| --- | --- |
| 协议 | `speech-whisper-base@1` |
| 推理引擎 | whisper.cpp `v1.8.6` |
| 引擎 revision | `23ee03506a91ac3d3f0071b40e66a430eebdfa1d` |
| 上游 Whisper | OpenAI Whisper `v20250625` |
| 上游 Whisper revision | `31243bad24cc746f07d4c8bfdd2d974872cb1803` |
| 转换模型仓库 revision | `5359861c739e955e79d9a303bcbc70fb988958b1` |
| 模型 | `ggml-base.bin`，多语种 |
| 模型字节数 | `147951465` |
| 模型 SHA-256 | `60ed5bc3dd14eea856493d334349b405782ddcaf0028d4b5df4088345fba2efe` |
| 模型表 SHA-1 | `465707469ff3a37a2b9b8d8f89f2f99de7299dac`（交叉证据，不作安装校验） |
| 建议内存 | `8192 MiB` |

manifest 中的 SHA-256 来自固定 revision 的 Git LFS 对象 `oid sha256`，并与该 revision 下载响应的 `x-linked-etag` 一致；安装器仍会对实际收到的 `147951465` 字节文件重新计算 SHA-256，不能只信任 HTTP 头。`manifest.json` 的 `model.sha256` 与 `artifacts[].sha256` 必须始终同步。

## 安装与存储边界

模型不随 Git 仓库分发。能力管理器按 [`manifest.json`](./manifest.json) 的固定 URL 下载，并把模型安装到用户数据根目录下的 `capabilities/speech-whisper-base/models/ggml-base.bin`。仓库内的同名路径已加入 `.gitignore`，用于防止误把约 142 MiB 的模型提交到源码。

```text
node scripts/capabilities.mjs status
node scripts/capabilities.mjs install speech-whisper-base
node scripts/capabilities.mjs doctor speech-whisper-base
node scripts/capabilities.mjs remove speech-whisper-base
```

安装前应展示来源、下载体积、许可证、磁盘位置和移除命令；只有长度与 SHA-256 校验通过后才能写 receipt。作品启动时不联网下载、不自动升级，也不切换到其他模型。

## 运行要求与数据路径

- 支持 `Worker`、WASM SIMD 和 `crossOriginIsolated` 的现代浏览器；
- 本地服务仅对该 D 级页面和能力资源设置所需的 COOP/COEP/CORP 响应头；
- 一次只申请一个麦克风音频轨，用户主动点击后才请求权限；
- 音频路径为“麦克风 → 当前浏览器 → 当前电脑的 WASM Worker”；
- 不使用云 ASR，不上传音频或转写，不写入遥测；
- 原始 PCM 和转写只保留在当前页面内存中，确认、重录、重开或关闭后释放；
- 模型安装完成后，核心转写流程应可在断开公网时运行。

base 模型不能保证逐字准确，尤其是人名、地名、口音和环境噪声。使用它的作品必须把识别结果视为可编辑草稿，让说话者本人确认；不得据此推断身份、情绪、关系质量或是否说谎。

## 许可证文件

- [`licenses/whisper.cpp-MIT.txt`](./licenses/whisper.cpp-MIT.txt)：从 whisper.cpp `v1.8.6` 的 [`LICENSE`](https://github.com/ggml-org/whisper.cpp/blob/v1.8.6/LICENSE) 原文复制；
- [`licenses/openai-whisper-MIT.txt`](./licenses/openai-whisper-MIT.txt)：从 OpenAI Whisper `v20250625` 的 [`LICENSE`](https://github.com/openai/whisper/blob/v20250625/LICENSE) 原文复制。

固定 revision 的 `ggerganov/whisper.cpp` 模型仓库在模型卡元数据中声明 `license: mit`，但该 revision 没有单独的 `LICENSE` 文件；本目录因此不伪造第三份许可证文本，而是保留模型卡、固定 revision、上游 OpenAI Whisper 许可证和模型对象哈希作为分开的来源证据。

## 借鉴与来源声明

| 项目 | 原作者与固定来源 | 借鉴 / 使用类型 | 本能力实际使用 | 许可证 | 本仓库处理 |
| --- | --- | --- | --- | --- | --- |
| whisper.cpp | [ggml-org/whisper.cpp `v1.8.6` / `23ee035`](https://github.com/ggml-org/whisper.cpp/tree/23ee03506a91ac3d3f0071b40e66a430eebdfa1d) | 第三方依赖与架构参考 | 里程碑 B 的 WASM 推理引擎固定源码；参考官方浏览器示例的 Worker、模型加载、麦克风和本机数据边界 | [MIT](https://github.com/ggml-org/whisper.cpp/blob/v1.8.6/LICENSE) | 保留许可证原文；从固定 tag 可复现构建并记录工具与产物哈希；不复制官方页面视觉或文案 |
| OpenAI Whisper | [openai/whisper `v20250625` / `31243ba`](https://github.com/openai/whisper/tree/31243bad24cc746f07d4c8bfdd2d974872cb1803) | 模型上游 | `ggml-base` 的上游模型架构、权重与 tokenizer 来源 | [MIT](https://github.com/openai/whisper/blob/v20250625/LICENSE) | 保留许可证原文；与 whisper.cpp 引擎来源分开声明 |
| whisper.cpp 模型仓库 | [ggerganov/whisper.cpp `5359861`](https://huggingface.co/ggerganov/whisper.cpp/tree/5359861c739e955e79d9a303bcbc70fb988958b1) | 模型与素材 | 安装期下载固定 `ggml-base.bin` 转换权重 | [模型卡声明 MIT](https://huggingface.co/ggerganov/whisper.cpp/blob/5359861c739e955e79d9a303bcbc70fb988958b1/README.md) | 不把模型提交到 Git；固定 URL、字节数和对象 SHA-256，并在安装时复算 |
| sherpa-onnx | [k2-fsa/sherpa-onnx](https://github.com/k2-fsa/sherpa-onnx) | 技术比较 | 只比较实时 ASR、KWS、VAD 与 TTS 能力矩阵；当前能力不引入其代码、包或模型 | Apache-2.0（引擎） | 当前候选 KWS 模型许可未闭环，因此不复制代码或模型，也不放入运行依赖 |

### 独立实现说明

除上表明确列出的第三方引擎与模型外，能力管理协议、安装与校验流程、状态语义、服务白名单、作品流程、中文文案、视觉和交互均由本仓库自行设计。当前目录没有复制 whisper.cpp 官方页面的 DOM、CSS、视觉、文案或素材。
