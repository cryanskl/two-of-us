# capsule-docking 非视觉核心验证

- 日期：2026-07-25
- 分支：`codex/exp-capsule-docking`
- 基线：`a6ca6891e5f23c8a677daaa8d1d87487d7b15c90`
- 范围：plan、纯配置、纯领域逻辑、固定 fixture、项目测试与来源声明
- 浏览器：N/A；本阶段没有 UI，且视觉概念尚未获得用户确认

## 1. 阶段结论

非视觉核心已达到 Ready for Review：

- 目录级 `{"type":"commonjs"}` 建立真实 `require()` 边界；
- `logic.js` 同时通过 CommonJS 与无 `module` 的浏览器经典脚本 VM 加载；
- 256 格整数三角表、整数物理、微步碰撞、六项 Gate 和七阶段 reducer 已实现；
- 三条冻结 fixture 分别在 367 / 382 / 386 tick 达到规格精确终态；
- 三条路线均包含姿态席和推进席有效输入，单席缺失与持续按键不能完成；
- public view 不公开个人 control tick、金路径、评分、燃料或个人失误；
- Gymnasium、p2.js、SAT.js、Phaser 与 NASA 资料均无运行时引入，项目级
  `ATTRIBUTION.md` 已固定 commit、许可证、版权、借鉴点和零复制范围。

本阶段**不是可玩作品**，不具备 `index.html`、浏览器输入、响应式、可访问性或
真实 `file://` 启动证据，因此不能加入 catalog、不能标记 installed，也不能增加
75 项目标计数。

## 2. 项目级验证

执行：

```bash
node --check experiences/co-op/capsule-docking/config.js
node --check experiences/co-op/capsule-docking/logic.js
node --check experiences/co-op/capsule-docking/golden-fixtures.js
node --check experiences/co-op/capsule-docking/logic.test.js
node --test experiences/co-op/capsule-docking/logic.test.js
```

结果：

```text
tests 21
pass 21
fail 0
duration_ms 1238.228708
```

覆盖包括 CommonJS/经典脚本双出口、API/常量、三角表 SHA-256、整数 helper、
闭集碰撞、data descriptor Proxy、六项 Gate、action/state exact schema、phase
invariant、三条 fixture、TICK 分片一致性、合作必要性、高速微步、失败/重试、
SUSPEND、三段终局、public view 隐私、配置隔离与静态零网络边界。

## 3. Repository verify

执行：

```bash
npm run verify
```

结果：

```text
仓库验收通过：58 个作品入口（50 个 A 级直开、8 个非 A 启动器）、
1 个能力声明、资源与借鉴声明完整。
```

计数保持 58，因为本项目仍未 installed。

## 4. 全仓测试

本 worktree 执行：

```bash
npm test
```

结果：

```text
tests 1872
pass 1871
fail 1
```

唯一失败来自 `shared/runtime/static.test.js:8` 的既有 worktree 路径断言：它只接受
`/two-of-us/index.html`，而本次合法 worktree 实际为
`/two-of-us-worktrees/capsule-docking/index.html`。capsule-docking 的 21 项测试
在同一全仓进程中全部通过。该共享根因已由并行项目记录为
`bugs/compliment-reels-worktree-static-test-path.md`，并由总控串行修复；本分支
不重复记录、不越权修改共享 runtime。总控集成后需在包含共享修复的 main 和独立
worktree 重跑全仓测试。

## 5. 实际 bug

本阶段实际发现并修复：

1. `bugs/capsule-docking-commonjs-test-url.md`：CommonJS 测试误用 ESM
   `import.meta.url`；
2. `bugs/capsule-docking-negative-zero-trig.md`：象限展开在坐标轴产生 `-0`；
3. `bugs/capsule-docking-terminal-state-validation.md`：合法三段终局被错误回退
   到初态。

三项均已有定向回归覆盖。

## 6. 尚未通过的 Gate

- 视觉概念与用户确认；
- `index.html`、`app.js`、CSS 与运行资产；
- 键盘、双 pointer、input epoch、rAF generation、焦点与 live region；
- 四档视口、200% zoom、reduced-motion、forced-colors、图片阻断与无脚本；
- A 级三层启动证据、浏览器控制台/网络检查；
- README、catalog、门户、分类索引与最终 installed 集成。

这些 Gate 必须等待用户确认视觉概念后继续，不能由本次核心验证替代。
