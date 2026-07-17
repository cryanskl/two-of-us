# 未限定的测试发现误入 tmp 工具链

- 状态：`fixed`
- 发现日期：2026-07-17
- 影响范围：`npm test`

## 复现

1. 在仓库已忽略的 `tmp/` 下安装 Emscripten SDK；
2. 运行 `npm test`；
3. Node 不仅执行 Two of Us 测试，还进入 `tmp/emsdk-*/upstream/emscripten/test/`，执行第三方浏览器与编译器测试。

表现包括数百个无关测试、`document is not defined`、测试耗时异常增长，甚至看似挂起。

## 根因

根脚本使用裸 `node --test`。Node 的自动发现以工作目录为边界，不理解 `.gitignore`；任何放在仓库内的工具链、缓存或下载源码都可能被扫描。

## 修复

新增跨平台 `scripts/run-tests.mjs`，只递归枚举：

- `experiences/`
- `shared/`
- `scripts/`

并把明确的 `.test.js` / `.test.mjs` 文件列表交给当前 Node 进程。没有使用依赖 shell 的 `find`、globstar 或命令替换，保持 macOS、Windows、Linux 与 Node 18 兼容。

## 验证

- 在测试 fixture 的 `tmp/vendor/foreign.test.js` 放置伪测试，确认不会被收集；
- 保留真实 `tmp/emsdk-4.0.23` 后运行 `npm test`，确认只执行 Two of Us 项目测试；
- 运行 `npm run verify` 与 `git diff --check`。

