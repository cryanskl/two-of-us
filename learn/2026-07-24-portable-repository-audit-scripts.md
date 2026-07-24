# 可移植仓库审计脚本：避开 zsh 特殊变量与 Node 模块歧义

## 适用范围

适用于在 macOS/zsh 和 Node.js 中批量读取上游仓库、许可证、提交与哈希的临时审计脚本。这里记录的是工具脚本边界，不是某个体验的运行时 bug。

## zsh 的 `path` 不是普通变量

在 zsh 中，`path` 是与标量环境变量 `PATH` 绑定的特殊数组。下面这种看似普通的循环赋值会重写当前 shell 的命令搜索路径：

```zsh
path="LICENSE"
```

其后可能连续出现 `command not found: curl`、`base64`、`shasum` 或 `cut`。这不是这些工具突然被卸载，也不应通过重新安装依赖解决。

审计脚本应：

- 避免把临时字段命名为 `path`；
- 使用 `license_path`、`file_path` 等明确名称；
- 让每次审计命令在新的非交互 shell 中运行，避免污染调用者；
- 遇到一串不同工具同时“找不到”时，先检查 `PATH`/`path`，不要立刻改系统环境。

## Node 22 的 stdin 模块格式歧义

Node.js 22 对 `node <<'NODE'` 或 `node -e` 中的模块格式进行语法检测。若同一脚本同时包含 CommonJS `require()` 和顶层 `await`，会抛出：

```text
ERR_AMBIGUOUS_MODULE_SYNTAX
```

这不是网络、GitHub API 或依赖错误。两种可靠写法是：

1. CommonJS 风格：保留 `require()`，把异步流程包在 async IIFE 中；
2. ESM 风格：使用 `node --input-type=module` 与 `import`，保留顶层 `await`。

仓库当前大量目录通过最近的 `package.json` 区分 CommonJS/ESM。临时审计脚本不应依赖当前工作目录恰好采用哪种模块类型，最好显式选择一种语义。

## 推荐骨架

```js
const crypto = require("node:crypto");

(async () => {
  const response = await fetch(sourceUrl);
  const bytes = Buffer.from(await response.arrayBuffer());
  const sha256 = crypto.createHash("sha256").update(bytes).digest("hex");
  process.stdout.write(`${sha256}\n`);
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
```

这个骨架显式保持 CommonJS，使用 Node 自带的 `fetch` 与 `crypto`，避免依赖 `jq`，并通过非零退出码让自动化知道审计失败。

## 验证顺序

1. 先打印 `node --version` 与 shell 类型；
2. 首次失败后区分“命令查找失败”“模块解析失败”“HTTP 失败”与“证据内容不符”；
3. 只有 HTTP 成功且内容解码成功后才计算哈希；
4. 固定 commit、许可证载体路径和 SHA-256 一起记录；
5. 临时脚本成功不等于候选可引入，仍需审计依赖、远程资源、模型、素材与商标。
