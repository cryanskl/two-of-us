# D 级可选能力统一安装实施计划

- 日期：2026-07-21
- Brainstorm：[`193-unified-optional-capability-setup-brainstorm.md`](./193-unified-optional-capability-setup-brainstorm.md)
- 可执行规格：[`194-unified-optional-capability-setup-spec.md`](./194-unified-optional-capability-setup-spec.md)

## 1. 实施原则

- 主代理负责规格、提交、整仓回归、真实 smoke、bugs/learn 与最终验收；
- 实现子代理只修改 `scripts/setup.mjs` 与新建 `scripts/setup.test.mjs`，不提交；
- 独立审查子代理只读检查退出语义、TTY、注入边界、重复调用和敏感输出；
- 不修改 capability 下载、manifest、模型、receipt 或 D 级作品 UI，除非实现证明规格无法成立并先回报；
- 不运行真实模型下载，不修改用户能力数据目录。

## 2. 阶段 A：setup orchestration 测试与实现

所有权：实现子代理。

### 先写测试

新建 `scripts/setup.test.mjs`，使用内存 writable stream、带 `isTTY` 的 readable/stub、注入 runner 和 capability API，覆盖规格第 8 节矩阵。

测试必须断言：

- import 无副作用；
- npm 失败不访问 capability；
- status 必须在 capabilityMain 之后重读；
- 拒绝/非 TTY/skip 不调用 downloader；
- 多能力保持 `listCapabilityIds` 返回顺序；
- 单项失败不阻止后续能力，但最终返回 1；
- 输出只包含允许的状态、ID、命令和错误摘要。

### 再实现

重构 `scripts/setup.mjs`：

1. 导出 `main()` 和默认 npm runner；
2. 使用 CLI entrypoint guard；
3. 解析唯一选项 `--skip-optional`；
4. 完成 Node/npm gate；
5. 动态枚举与读取能力；
6. TTY 时调用现有 `capabilityMain(["install", id], ...)`；
7. 二次 status 分类 installed/skipped/failed；
8. 聚合输出和退出码。

### 定向验证

```text
node --check scripts/setup.mjs
node --test scripts/setup.test.mjs scripts/capabilities.test.mjs
git diff --check
```

### 独立审查

审查重点：

- `stdin.isTTY && stdout.isTTY` 是否严格；
- capabilityMain 返回 0 + missing 是否正确分类为 skipped；
- npm 和 capability 的失败退出是否诚实；
- 是否可能重复安装、隐式下载或触碰真实用户目录；
- import guard 与 child process listener 是否有竞态/双 resolve；
- 输出是否泄露 hash、完整下载 URL 或 artifact 路径。

### 提交

```text
feat: integrate optional capabilities into setup
```

## 3. 阶段 B：说明与知识沉淀

主代理修改：

- 根 `README.md`：首次 setup 会询问 D 级可选能力；拒绝不影响 A/B/C；非交互/CI 与 skip 路径；
- `capabilities/README.md`：统一 setup 与精确管理命令的关系；
- `experiences/co-op/i-heard-you/README.md`：首选根 setup，保留 doctor/remove；
- `learn/`：沉淀“基础依赖与大型可选能力分层安装”的稳定模式；
- `docs/README.md` 与根文档索引：加入 193–196。

借鉴声明明确本批只复用内部 capability 管理器，没有新增外部参考。

### 提交

```text
docs: explain optional capability setup
```

## 4. 阶段 C：整仓与真实无下载验收

### 全量

```text
npm test
npm run verify
git diff --check
```

### 真实 smoke

执行：

```text
node scripts/setup.mjs --skip-optional
```

核对：

- Node gate 通过；
- npm install 状态 0，lockfile 和工作树不变化；
- 明确输出基础依赖完成；
- 明确输出 `--skip-optional`；
- 不访问模型下载、不创建或修改用户 capability 数据目录；
- 最终输出根目录/作品目录启动入口。

真实交互“Y 后下载 141 MB”不在自动验收执行，原因是需要用户在当次动作明确接受网络、磁盘和模型许可。其逻辑由注入测试与既有 capability 真实小 fixture 覆盖。

### 验收记录

新建 `docs/196-unified-optional-capability-setup-verification.md`，记录测试数、smoke 输出、未下载边界、来源和人工模型安装边界。

### 提交

```text
test: verify unified optional capability setup
```

## 5. Bug 与清理

- 实现或 smoke 发现的问题按“一问题一文件”写入 `bugs/`；
- 不提交临时数据目录、npm 日志或终端转储；
- 每个提交前运行 `git branch --show-current && git rev-parse --show-toplevel`；
- 每个提交后检查工作树，仅保留下一阶段有意改动；
- 不 amend，不自动 push。
