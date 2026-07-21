# D 级可选能力统一安装 Brainstorm

- 日期：2026-07-21
- 类型：功能 / 安装流程重构
- 目标：用户首次双击根目录 setup 时，能在同一流程中选择安装 D 级能力；完成后仍从作品启动器或统一门户直接打开

## 1. 当前缺口

根 `setup.command` / `setup.bat` 只运行 `npm install`。D 级“我听见了”所需的 `speech-whisper-base@1` 已有完整 manifest、原子下载、SHA-256、receipt、doctor 与 remove，但用户必须自行查找并输入：

```text
node scripts/capabilities.mjs install speech-whisper-base
```

这与“依赖统一起来、安装完直接打开”的目标不一致。问题不在下载实现，而在首次安装 UX 没有把基础依赖和可选能力串起来。

## 2. 不可破坏的边界

1. 不静默下载模型；安装前显示 ID、用途、下载体积、来源 origin、数据目录和许可证。
2. 用户拒绝可选能力时，基础安装仍成功，A/B/C 不受影响。
3. 非交互环境不得等待 stdin；跳过可选能力并输出明确的后续命令。
4. 已通过 doctor 的能力不重复下载。
5. 用户主动选择安装后，继续复用现有 `capabilities-lib.mjs` 原子下载和完整性校验，不另写第二套 downloader。
6. setup 不修改 Homebrew、系统 Python、shell profile、全局 npm 或系统模型缓存。
7. 不把作品启动时的隐式下载加入本批；能力安装只发生在明确的 setup/管理动作中。

## 3. 方案比较

### 方案 A：setup 完成 npm 后逐个询问缺失能力（采用）

- 从 manifest 动态枚举能力，而不是硬编码作品名；
- 只对非 `available` 能力展示一次安装说明和确认；
- 用户接受后直接调用已有安装库并显示进度；
- 用户拒绝或非 TTY 时保留明确的手动重试命令。

优点：真正统一入口；未来新增能力仍沿同一流程；不复制 downloader。代价：setup 需要从当前顶层脚本重构为可测试的 `main()` 和依赖注入。

### 方案 B：setup 只打印能力命令

改动最小，但用户仍必须打开终端并复制命令，无法解决目标缺口，排除。

### 方案 C：默认安装全部能力

最像“一步完成”，但会在不知情时下载大型模型、接受许可与占用磁盘；未来能力增加后成本不可控，排除。

### 方案 D：给每个 D 作品复制专用安装器

会导致下载、哈希、receipt 与错误修复分叉，也破坏统一依赖目标，排除。

## 4. 采用流程

```text
Node 版本检查
  → npm install --no-audit --no-fund
  → 枚举 capability manifest
  → doctor/status
      available：报告可用，继续
      missing/corrupt/incompatible：显示安装说明
          交互终端：逐项询问 y/N
          非交互：跳过并打印精确 install 命令
      接受：原子安装 + 安装后 doctor
  → 汇总基础依赖、已可用能力、已安装能力、已跳过能力
  → 输出可以直接双击的入口
```

如果用户明确接受某能力但安装失败，setup 返回非零并说明：基础依赖已完成、该 D 级能力未完成、可安全重试。这样不会误报“全部完成”，也不会回滚已成功的 npm 基础安装。

## 5. 测试策略

- Node 版本不足时不启动 npm；
- npm 成功/失败/信号/无法 spawn 的退出合同；
- 无能力、能力已 available、用户拒绝、非 TTY 跳过；
- 用户接受后安装一次并报告成功；
- 用户接受但能力安装失败时返回非零，同时明确基础依赖已完成；
- 多能力按稳定 ID 顺序处理，单项拒绝不影响后续项；
- confirmation、下载和状态检查全部可注入，测试不访问公网、不写真实用户目录。

## 6. 借鉴与来源声明

本方案只整合仓库现有 `scripts/setup.mjs`、`scripts/capabilities.mjs` 与 `scripts/capabilities-lib.mjs`，没有参考、复制或改写新的第三方开源项目。模型、whisper.cpp、Emscripten 与相关许可证继续以 `capabilities/speech-whisper-base/README.md`、manifest 和 `licenses/` 为准。
