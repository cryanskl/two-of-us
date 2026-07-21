# 可选能力包

`capabilities/` 保存 D 级作品的能力声明、浏览器运行资产与第三方许可证。根目录统一安装会在基础依赖完成后逐项询问是否安装缺失能力；用户拒绝、使用 `--skip-optional` 或处于非交互环境时不会下载。不使用本地 AI、语音或大型资源的 A/B/C 级作品始终不需要这些能力包。

## 当前能力

| ID | 协议 | 用途 | 运行资产 | 大文件 |
| --- | --- | --- | --- | --- |
| [`speech-whisper-base`](./speech-whisper-base/) | `speech-whisper-base@1` | 浏览器内中文短句转写 | whisper.cpp WASM（里程碑 B 构建） | `ggml-base.bin`，按需安装到用户数据目录 |

## 目录契约

每个能力目录至少包含：

- `manifest.json`：固定 schema、协议、引擎、模型、下载 artifact、完整性校验和运行要求；
- `README.md`：说明安装边界、数据流、限制以及借鉴与来源；
- `licenses/`：保留实际引入的第三方许可证原文；
- `browser/`：仅在需要时提交经过审计、可复现构建的浏览器运行资产。

模型、大型缓存、安装 receipt 和 `.part` 临时文件不提交到 Git。默认安装位置为：

| 平台 | 数据根目录 |
| --- | --- |
| macOS | `~/Library/Application Support/TwoOfUs/` |
| Windows | `%LOCALAPPDATA%\TwoOfUs\` |
| Linux / CI | `$XDG_DATA_HOME/two-of-us/`，未设置时为 `~/.local/share/two-of-us/` |

测试或便携安装可以用 `TWO_OF_US_DATA_DIR` 显式覆盖。能力管理器不得修改全局 Python、shell profile、Homebrew 或系统模型缓存。

## 管理命令

首次安装优先双击根目录 `setup.command` / `setup.bat`，或运行：

```text
npm run setup
```

它只在交互终端询问可选能力，且必须得到当次确认才下载。仅安装基础依赖可运行 `npm run setup -- --skip-optional`；非交互环境也会跳过能力并打印后续命令。

诊断、卸载或 CI 中明确预装单一能力时，使用精确管理入口：

```text
node scripts/capabilities.mjs status
node scripts/capabilities.mjs install <capability-id>
node scripts/capabilities.mjs doctor <capability-id>
node scripts/capabilities.mjs remove <capability-id>
```

无交互预装必须同时给出精确能力 ID 与 `--yes`，例如 `node scripts/capabilities.mjs install speech-whisper-base --yes`；不要用脚本默认接受未来新增的全部大型能力。

安装只从 manifest 的固定 URL 下载，先写入 `.part`，再校验长度和 SHA-256；全部通过后才原子写入正式目录与 receipt。状态分为 `available`、`missing`、`corrupt` 和 `incompatible`，作品页面不能用单一布尔值代替完整状态。

作品启动时不得隐式下载、自动升级或切换模型。缺少能力时应显示安装、诊断和清理方法；移除命令只能删除对应能力目录。

## 新能力包检查清单

1. 固定引擎、模型、构建工具与下载 revision，不跟随浮动分支；
2. 分别记录代码、模型、素材的来源和许可证，不把引擎许可证代替模型许可证；
3. 大文件写入用户数据目录，manifest 记录字节数与实测或上游对象 SHA-256；
4. README 写明最低资源、权限、数据路径、公网边界与卸载方法；
5. 保留第三方许可证原文，并按仓库的[借鉴与来源声明规范](../docs/05-reference-and-attribution-spec.md)区分依赖、模型、技术比较和独立实现；
6. 完成安装中断、哈希错误、损坏、协议不兼容和断网运行测试后，才把能力标记为可发布。
