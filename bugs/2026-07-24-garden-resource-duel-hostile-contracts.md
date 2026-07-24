# 这一朵，我先养开：动态 Proxy、revision 与 CommonJS 合同失真

- 状态：`fixed`
- 日期：2026-07-24
- 影响作品：这一朵，我先养开
- 发现版本 / commit：逻辑首次实现，提交前独立审查发现

## 环境

- macOS；Node.js 22
- 仓库根 `package.json` 为 `"type": "module"`
- 启动等级与入口：A；`garden-resource-duel` 纯逻辑 API

## 症状与最小复现

### 1. 动态 action descriptor 改写动作类型

用 Proxy 让 `getOwnPropertyDescriptor(action, "type")` 第一次返回
`START_MATCH`、第二次返回 `RESTART_MATCH`。原解析器先读一次 type 决定字段，再
由 `readExactRecord()` 读取第二次；最终通过的是一份自相矛盾的动作快照。

### 2. state 验证后再次触发 Proxy get

用合法冻结 state 作为 Proxy target，让属性 descriptor 保持合法，但任何普通
`get` 都抛错。原 reducer、`getPublicView()` 和 `getPlayerView()` 在
`assertState()` 通过后继续读取原 state，因此形成验证与使用之间的 TOCTOU 窗口。
合法 no-op 也可能在判断阶段触发调用方代码。

### 3. 最大 revision 产生不安全整数

把合法 state 的 revision 设为 `Number.MAX_SAFE_INTEGER` 后执行一个本应转换阶段
的合法动作。原 `transition()` 无条件计算 `revision + 1`，会产生超出安全整数
范围的权威状态。

### 4. UMD 外形没有形成真实 require 合同

从仓库根执行：

```bash
node -e 'console.log(require("./experiences/versus/garden-resource-duel/logic.js"))'
```

根级 ESM 规则先把 `.js` 当作 ES module；仅在测试里通过全局导入或模拟
`module.exports`，不能证明 Node 的真实 CommonJS 入口成立。

## 预期结果

- 每个外部 action/state 对象只形成一份稳定 descriptor 快照；
- reducer 与 view 只消费规范化内部副本，合法 no-op 返回原 state；
- revision 无法安全递增时保持原 state，不生成非法状态；
- 同目录真实 `require()` 与浏览器经典脚本分别通过，并暴露同构冻结 API。

## 根因

四项问题都来自“接口外形等于真实合同”的错误假设：

- action 的校验与转换不是同一次快照；
- state 只验证了原对象，却没有把验证结果作为后续唯一输入；
- transition 假定 revision 永远有递增余量；
- UMD 包装器不能覆盖 Node 按最近 `package.json` 决定的模块格式。

## 解决方案

- action 通过一次 `ownKeys + data descriptor` 快照同时确定类型、键和值；
- state 顶层、数组、hand、history 与 result 分层建立 descriptor 快照，验证后
  生成规范化冻结副本；reducer/view 不再读取原 Proxy；
- `transition()` 在 revision 已到 `Number.MAX_SAFE_INTEGER` 时 fail closed，
  返回调用方原 state 引用；
- 新增只含 `{"type":"commonjs"}` 的体验级 `package.json`，测试改为 CJS 并直接
  `require()` config/logic，同时用隔离 VM 验证浏览器经典脚本全局。

## 回归验证

- [x] 动态 type descriptor 只读取一次，`START_MATCH` 正确进入 season
- [x] reducer 合法转换、合法 no-op、public view 与 player view 均不触发 Proxy get
- [x] 最大 revision 合法动作保持原 state 和安全 revision
- [x] 真实 CommonJS require 与浏览器经典脚本暴露同构冻结 API
- [x] 单项目测试 22 / 22 通过
- [x] 全仓 `npm test` 1792 / 1792 与 `npm run verify` 通过

## 相关提交

- 随作品逻辑首次提交一并修复，仓库历史不会保留带上述已知缺陷的生产版本。
