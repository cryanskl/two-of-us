# 运行时内容身份修复规格与实施计划

- 日期：2026-07-25
- 基线：`1169d67b1cee3dc6f5bd1a57b54867c06114d059`
- 分支：`codex/fix-runtime-content-identity`
- 性质：非 UI 的共享运行时与启动器一致性修复
- 关联审计：[`362-launch-contract-and-dependency-audit.md`](./362-launch-contract-and-dependency-audit.md)
- 关联缺陷：[`2026-07-25-runtime-reuse-cross-checkout-drift.md`](../bugs/2026-07-25-runtime-reuse-cross-checkout-drift.md)
- 关联沉淀：[`2026-07-25-runtime-compatibility-is-not-content-identity.md`](../learn/2026-07-25-runtime-compatibility-is-not-content-identity.md)

## 问题与目标

当前 launcher 只验证运行时身份头、服务名、协议版本、端口和本机 URL。两个 checkout 使用相同协议、但包含不同作品内容时，后启动的 checkout 会静默复用先启动的旧进程。

本轮引入 deterministic `contentIdentity`：

1. 相同内容、相同协议可以跨目录复用同一个进程；
2. 不同 checkout 或 dirty worktree 只要实际内容不同，就拒绝复用；
3. 拒绝复用时不结束、不修改既有进程，而是在允许的端口窗口内启动新运行时；
4. 健康接口只公开不透明摘要，不公开 checkout 的绝对路径、Git 信息或文件清单；
5. 无法可靠证明内容身份时 fail closed，不把“身份未知”当作“内容相同”。

不在范围：

- 不修改生产 UI、Board、catalog 或共享索引；
- 不改变房间协议、作品玩法和静态路由；
- 不引入后台 watcher、持久缓存或新的 npm 依赖；
- 不处理本轮之外的 setup、动态公网依赖或借鉴链接问题。

## 身份定义

`contentIdentity` 是带版本域分隔的 SHA-256 摘要，格式固定为：

```text
sha256:<64 个小写十六进制字符>
```

哈希输入只使用仓库内 POSIX 风格相对路径、文件长度和文件实际字节；每段使用明确的长度前缀，文件按相对路径的确定性字节顺序排列。绝对路径、mtime、inode、Git HEAD、分支名和操作系统路径分隔符都不进入摘要，因此两份内容相同但所在目录不同的 checkout 会得到相同结果。

### 覆盖范围

最小身份清单覆盖：

- `package.json` 与 `package-lock.json`；
- 根 `index.html`；
- `experiences/catalog.json`；
- catalog 中每个 `installed: true` 项的完整作品目录，包括入口、README、脚本、样式、媒体与嵌套资源；
- 完整 `shared/`，包括共享运行时及通过 `/shared/*` 可提供的资源；
- 完整 `capabilities/`，包括影响能力 API 的 manifest 与可提供的浏览器资产；
- `shared/runtime/vendor.js` 白名单声明的实际 vendor 文件；
- 共享运行时会直接调用的 `scripts/capabilities-lib.mjs`。

catalog 项为未安装时，其作品目录不进入身份；catalog 文件自身始终进入身份，因此 installed 状态改变仍会改变摘要。用户数据目录和可选大模型不进入 checkout 内容身份：它们有既有 manifest、字节数和 SHA-256 校验，并且属于机器能力状态，不属于仓库内容。

### dirty worktree 策略

不读取 Git 状态，也不使用提交号。每次 launcher 启动时直接扫描并哈希当前磁盘字节：

- dirty 修改、未提交的新文件、删除和重命名只要位于上述覆盖范围，都会改变身份或使计算失败；
- 修改发生在已运行进程启动之后时，该进程继续保留启动时身份；下一次 launcher 以当前字节重算，身份不同即另启端口；
- 覆盖范围外的文档、测试报告或 Git 元数据不改变运行时内容身份。

这使源码 checkout、无 `.git` 分发目录和不同绝对路径使用同一条规则。

## 文件系统安全与 fail-closed

身份计算遵守以下保守策略：

- 先将根目录规范化，再只接受位于根目录内的相对路径；
- 所选目录树内遇到符号链接、socket、FIFO、设备等非普通文件即失败；
- 精确文件路径的任一中间组件出现符号链接即失败；
- 文件使用 no-follow 语义打开；读取前后比较稳定元数据，检测计算期间的替换或改写；
- 目录在读取后重新枚举，检测计算期间的新增、删除或类型变化；
- catalog 以用于选取 installed 目录的同一份字节进入摘要，并在结束前确认未变化；
- 缺失、权限错误、解析错误、越界、读取错误和并发变化都使身份计算失败；
- 错误消息只指出仓库相对路径，不输出绝对路径。

launcher 在 expected identity 计算失败时直接报告启动失败；probe 在 expected identity 缺失、格式无效、health 未提供、格式无效或不精确相等时返回“不复用”。运行时在无法计算自身身份时不监听端口。

## API 与启动流程

新增共享内容身份模块，提供一次性计算函数和格式校验：

```text
computeContentIdentity(rootDir) -> Promise<string>
isContentIdentity(value) -> boolean
```

启动流程：

```text
launcher 计算 expected identity
  -> 逐端口 probe health
     -> 服务/协议/地址/expected identity 全部相等：读取 catalog 并复用
     -> 任一不相等：跳过该端口
  -> 无可复用运行时：创建新运行时并传入已计算 identity
```

`/api/health` 增加 `contentIdentity`，仍保留当前身份头和协议版本。protocol version 暂不提升：旧进程缺少该字段时会被新 probe 明确拒绝，内容身份属于复用条件而不是房间消息协议变更。

为了控制启动成本，launcher 每次只计算一次摘要，并把结果同时用于 probe 与新 server；不会针对每个候选端口重复扫描。实现不持久缓存，避免缓存失效规则重新引入 dirty drift。当前约 102 MB / 700 余个仓库文件的读取成本将在验证阶段实测记录。

## 测试先行计划

### 阶段 1：规格

- 提交本文件；
- 不改生产代码。

### 阶段 2：红测

先提交失败测试，证明旧实现缺少能力：

1. 相同文件、不同绝对根目录得到相同 identity；
2. 分别修改 lock、catalog、共享 runtime、已安装作品文件会改变 identity；
3. 未安装作品目录不进入 identity；
4. 符号链接、读取失败、计算期间变化 fail closed，错误不泄露根路径；
5. probe 仅接受格式合法且与 expected 精确相等的 health identity；
6. health 暴露合法 identity，响应不含绝对路径；
7. 真实双根：同内容同协议复用；修改第二根静态 marker 后拒绝并占用下一端口；原进程仍存活；
8. 停止各自进程后对应端口可重新监听。

### 阶段 3：最小实现

- 新增内容身份模块；
- launcher 启动时计算一次 expected identity；
- probe 把 expected identity 作为必要复用条件；
- server 在 health 暴露 identity；
- 保持现有端口扫描、重定向拒绝和外部进程保护逻辑不变。

### 阶段 4：验证与证据

- 内容身份、probe、server、launcher integration 定向测试；
- `npm test`；
- `npm run verify`；
- 真实双根独立进程验证相同内容复用、不同内容另启端口、旧进程不被杀和端口释放；
- 记录一次身份计算耗时；
- `git diff --check 1169d67..HEAD`；
- 将结果写入 `docs/372-runtime-content-identity-verification.md` 并独立提交。

## 验收条件

- `contentIdentity` deterministic、路径无关、格式固定；
- 覆盖 lock、catalog、共享 runtime 与全部已安装可服务文件；
- 同内容同协议复用；
- 不同内容、不同协议、身份缺失/无效均拒绝复用；
- mismatch 不杀死其他进程，新运行时选择后续可用端口；
- dirty worktree、符号链接和读取错误策略有测试且 fail closed；
- health 与错误输出不泄露绝对路径；
- 定向测试、全仓测试、verify、真实双根和 diff-check 全部通过；
- 没有修改生产 UI、catalog、Board 或共享索引。

## 借鉴声明

本规格和后续实现是针对本仓库运行时复用缺陷的独立设计。摘要只使用 Node.js 标准库提供的文件系统与 SHA-256 API，没有复制或改写其他开源项目的代码、页面、文案、视觉或素材，也没有新增第三方依赖。
