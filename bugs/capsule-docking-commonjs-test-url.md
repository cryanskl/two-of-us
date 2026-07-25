# capsule-docking CommonJS 测试误用 `import.meta.url`

- 日期：2026-07-25
- 影响范围：`experiences/co-op/capsule-docking/logic.test.js`
- 状态：已修复

## 复现

在目录级 `package.json` 精确声明 `{"type":"commonjs"}` 后运行：

```bash
node --test experiences/co-op/capsule-docking/logic.test.js
```

Node 在加载测试文件时抛出：

```text
SyntaxError: Cannot use 'import.meta' outside a module
```

## 根因

测试需要读取同目录的 `package.json` 和 `logic.js`，却错误使用了 ESM 专属的
`import.meta.url`。本项目为了同时证明真实 `require()` 和浏览器经典脚本，明确
采用目录级 CommonJS；测试工具不能反向破坏这个边界。

## 修复

测试改用 CommonJS 提供的 `__dirname` 与 `node:path.join()` 解析同目录文件。
没有修改项目的模块类型，也没有引入构建、依赖或双重 package 配置。

## 回归

回归命令：

```bash
node --test experiences/co-op/capsule-docking/logic.test.js
```

后续 core verification 文档记录完整通过结果。
