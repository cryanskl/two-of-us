# speech-whisper-base

`speech-whisper-base@1` 是 Two of Us 的可选本地语音转写能力。它为 D 级作品提供多语种 Whisper base 模型，并由浏览器中的 whisper.cpp WASM Worker 完成本机推理；首个使用者是「我听见了」。

当前目录已经从固定源码构建并提交 WASM/JS 引擎资产，同时用 [`browser-build.json`](./browser-build.json) 记录源码、工具链、字节数和 SHA-256。结构化 Worker 协议与 D 级隔离响应头也已完成；作品 UI 与端到端 Gate 仍是后续里程碑，在它们完成前不应宣称「我听见了」已经可运行或已在 macOS / Windows 验收。

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
| Emscripten | `4.0.23` / `7a5d93b50f6a3a35e85a0d2fc9e667b8498e6aed` |
| 引擎 JS | `95794` bytes / `5982cab6…5c5c942` |
| 引擎 WASM | `1251026` bytes / `48ef5f6d…355751f` |
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

## 可复现浏览器构建

维护者构建使用固定 `whisper.cpp v1.8.6` 与 `emsdk 4.0.23`。工具链只放在仓库忽略的 `tmp/` 中，不修改 shell profile 或全局环境。激活固定 emsdk 后运行：

```text
source tmp/emsdk-4.0.23/emsdk_env.sh
node capabilities/speech-whisper-base/build-browser.mjs
```

构建脚本先核对 whisper.cpp 完整 revision 与 Emscripten 版本，再把产物写到忽略的 `tmp/speech-whisper-browser-build/browser/` 并打印哈希。只有产物与 [`browser-build.json`](./browser-build.json) 一致时才可更新 `browser/`。普通使用者不需要 Emscripten、CMake、Python 或 C++ 工具链。

本仓库的 [`src/emscripten.cpp`](./src/emscripten.cpp) 是面向作品协议的薄绑定：借鉴官方 `whisper.wasm` 示例将 JavaScript `Float32Array` 安全复制到 WASM 内存的技术方法，但没有复制其页面、文案或控制台解析方式。绑定在应用 Worker 中同步执行，返回结构化的文本、分段时间和推理耗时，并复用单个已加载模型。

## Worker 协议

页面从能力状态 API 取得三个可用 URL 后创建 `transcriber-worker`。Worker 只接受同源且路径精确匹配 manifest 白名单的 `engine-js`、`engine-wasm` 与 `ggml-base`，不接受任意资源 URL。

```text
init       → ready | error
transcribe → transcript | error
dispose    → disposed
```

`init` 把模型写入 WASM 内存文件系统并只初始化一次；后续两轮转写复用同一个 context。`transcribe` 只接受 `Float32Array` 且最多 `192000` 个 16 kHz 样本。`dispose` 释放 whisper context、删除 WASM 内存中的模型文件，页面随后应终止 Worker。Worker 不使用控制台转写、localStorage、IndexedDB、Cache API、服务端日志或公网 fallback。

## 许可证文件

- [`licenses/whisper.cpp-MIT.txt`](./licenses/whisper.cpp-MIT.txt)：从 whisper.cpp `v1.8.6` 的 [`LICENSE`](https://github.com/ggml-org/whisper.cpp/blob/v1.8.6/LICENSE) 原文复制；
- [`licenses/openai-whisper-MIT.txt`](./licenses/openai-whisper-MIT.txt)：从 OpenAI Whisper `v20250625` 的 [`LICENSE`](https://github.com/openai/whisper/blob/v20250625/LICENSE) 原文复制。
- [`licenses/emscripten-MIT-UIUC.txt`](./licenses/emscripten-MIT-UIUC.txt)：从 emsdk `4.0.23` 内固定 Emscripten 分发的 `LICENSE` 原文复制，覆盖构建输出所含 Emscripten runtime。

固定 revision 的 `ggerganov/whisper.cpp` 模型仓库在模型卡元数据中声明 `license: mit`，但该 revision 没有单独的 `LICENSE` 文件；本目录因此不伪造第三份许可证文本，而是保留模型卡、固定 revision、上游 OpenAI Whisper 许可证和模型对象哈希作为分开的来源证据。

## 借鉴与来源声明

| 项目 | 原作者与固定来源 | 借鉴 / 使用类型 | 本能力实际使用 | 许可证 | 本仓库处理 |
| --- | --- | --- | --- | --- | --- |
| whisper.cpp | [ggml-org/whisper.cpp `v1.8.6` / `23ee035`](https://github.com/ggml-org/whisper.cpp/tree/23ee03506a91ac3d3f0071b40e66a430eebdfa1d) | 第三方依赖与架构参考 | WASM 推理引擎；参考官方 `whisper.wasm` 示例的 typed-array 内存复制、pthread 构建参数和本机数据边界 | [MIT](https://github.com/ggml-org/whisper.cpp/blob/v1.8.6/LICENSE) | 保留许可证原文；自写结构化绑定；从固定 tag 构建并记录工具与产物哈希；不复制官方页面视觉或文案 |
| Emscripten | [emsdk `4.0.23`](https://github.com/emscripten-core/emsdk) | 固定构建工具与输出 runtime | 把 C/C++ 引擎编译为浏览器 JS/WASM/pthread runtime | MIT 与 University of Illinois/NCSA | 普通用户不安装；仓库保留分发许可证、emsdk revision、release revision 和 Emscripten revision |
| OpenAI Whisper | [openai/whisper `v20250625` / `31243ba`](https://github.com/openai/whisper/tree/31243bad24cc746f07d4c8bfdd2d974872cb1803) | 模型上游 | `ggml-base` 的上游模型架构、权重与 tokenizer 来源 | [MIT](https://github.com/openai/whisper/blob/v20250625/LICENSE) | 保留许可证原文；与 whisper.cpp 引擎来源分开声明 |
| whisper.cpp 模型仓库 | [ggerganov/whisper.cpp `5359861`](https://huggingface.co/ggerganov/whisper.cpp/tree/5359861c739e955e79d9a303bcbc70fb988958b1) | 模型与素材 | 安装期下载固定 `ggml-base.bin` 转换权重 | [模型卡声明 MIT](https://huggingface.co/ggerganov/whisper.cpp/blob/5359861c739e955e79d9a303bcbc70fb988958b1/README.md) | 不把模型提交到 Git；固定 URL、字节数和对象 SHA-256，并在安装时复算 |
| sherpa-onnx | [k2-fsa/sherpa-onnx](https://github.com/k2-fsa/sherpa-onnx) | 技术比较 | 只比较实时 ASR、KWS、VAD 与 TTS 能力矩阵；当前能力不引入其代码、包或模型 | Apache-2.0（引擎） | 当前候选 KWS 模型许可未闭环，因此不复制代码或模型，也不放入运行依赖 |

### 独立实现说明

除上表明确列出的第三方引擎、构建 runtime 与模型外，结构化 C++ 绑定、能力管理协议、安装与校验流程、状态语义、服务白名单、作品流程、中文文案、视觉和交互均由本仓库自行设计。当前目录没有复制 whisper.cpp 官方页面的 DOM、CSS、视觉、文案或素材。
