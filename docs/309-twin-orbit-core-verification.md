# “这一圈，和你同时到”非视觉核心验收

- 日期：2026-07-25
- 稳定工作 ID：`twin-orbit`
- 验收范围：I1 确定性核心、fixture、独立求解器与静态边界
- 结论：通过，可进入视觉/UI 阶段

## 1. 范围边界

本阶段已经实现：

- 可编辑纯文本配置与整份原子回退；
- 30Hz 整数规则、五关状态机与公开 view；
- 同 tick 双门原子裁决、闭窗口、环形跨零；
- SUSPEND、input epoch、retry、next、complete 与 restart；
- 五组冻结黄金轨迹；
- 与生产 reducer 独立的动态规划求解器；
- hostile object、引用隔离、JSON replay、批处理与静态零依赖回归；
- 当前阶段借鉴与许可证声明。

本阶段没有创建 `index.html`、`styles.css`、`app.js`、生产资产或 README，也没有
修改 catalog、portal、installed 清单或作品计数。因此当前目录仍不能作为完整
作品点开游玩，浏览器/UI 验收不属于本结论。

## 2. 可解性与合作必要性

独立求解器只使用 720 格环形角度、outer `+2`、inner `+3`、目标角、目标 lane
和共同窗口，不调用生产 reducer 的穿越 helper。

验证结果：

- 五关在各自合法窗口的五个 tick 均存在解；
- 五组冻结 fixture 均在窗口中心 tick 精确同达；
- 第五关轨迹明确经过 719→0 回绕，并在目标 32 正确穿越；
- 任一席固定为 outer 或 inner 时，五关分别都无解；
- 任一席缺席并保持 released/outer 时，另一席无法补偿；
- 左右两席五关合计均为 150 个 inner tick；
- 第 1/2 关、第 4/5 关严格镜像，第 3 关双方 inner 总量相同；
- 单 tick 与 1–5 tick 批处理得到同一权威终态；
- JSON 序列化 state 重放可以完成五关并完整重开。

## 3. 防御与静态边界

专项回归确认：

- 配置、state、action 只接受 exact own-data schema；
- accessor getter 执行次数为 0；
- Proxy `get` 执行次数为 0，抛错元操作安全封闭；
- 数组子类、额外字段、非法阶段、旧 epoch 与 safe-integer 极值 fail closed；
- 合法 no-op 保持调用者原引用，提交后的 state/view 深冻结且引用隔离；
- public view 不泄露 fixture、input epoch、内部 retry 枚举或未来关卡；
- 生产核心不调用 DOM、时钟、随机、网络、storage、代码生成或仓库外文件；
- 三个生产脚本可在没有 DOM、计时器和服务 API 的经典脚本上下文初始化；
- 项目级外部代码、资产、运行依赖和开发依赖新增均为 0。

## 4. 实际验证

执行：

```bash
node --check experiences/co-op/twin-orbit/config.js
node --check experiences/co-op/twin-orbit/logic.js
node --check experiences/co-op/twin-orbit/fixtures.js
node --check experiences/co-op/twin-orbit/logic.test.js
node --check experiences/co-op/twin-orbit/solver.test.js
node --check experiences/co-op/twin-orbit/static-contract.test.js
node --test experiences/co-op/twin-orbit/logic.test.js \
  experiences/co-op/twin-orbit/solver.test.js \
  experiences/co-op/twin-orbit/static-contract.test.js
git diff --check
npm run verify
npm test
```

结果：

- 六个 JavaScript 文件语法检查通过；
- 核心专项测试：36/36；
- 仓库验证：58 个已安装作品入口，计数未变化；
- 全仓测试：2110/2110；
- `git diff --check`：通过。

## 5. 实际 bug 与沉淀

核心实现期间发现并修复：

- 孤立 surrogate 被 Unicode normalize 接受；
- 成功关卡 SUSPEND 后 lane 被错误清空；
- revision 溢出时批量 TICK 泄出未冻结快照；
- canonical 内容校验二次触发 Proxy `get`；
- 空闲或极值 SUSPEND 泄出校验快照。

完整复现、根因、方案与回归位于 [`bugs/`](../bugs/README.md)。

跨项目方法没有重复新建主题；本项目证据已补入
[`单次观察快照`](../learn/2026-07-23-single-observation-snapshot-boundary.md)，
合作必要性方法沿用仓库既有“可达性 oracle 与必要性 oracle 分离”的沉淀。

## 6. 借鉴声明

本核心只参考仓库内部 `orbit-star-race` 的高层机制：离散半径可选择不同角速度。
没有复制其代码、常量、关卡、界面、文案、测试或资产。外部开源项目直接借鉴为
0，第三方代码和素材为 0。

完整边界见：

- [`项目级 ATTRIBUTION`](../experiences/co-op/twin-orbit/ATTRIBUTION.md)
- [`借鉴与依赖审计`](./307-twin-orbit-attribution-dependency-audit.md)

## 7. 下一阶段 Gate

进入 UI 阶段后仍需单独完成：

- `file://` 生产入口、双键盘与双 Pointer；
- 自动暂停事件接线、固定步 RAF 与长帧处理；
- reduced-motion、forced-colors、无 Canvas/无 JS 降级；
- 四种目标视口、200% 文本与 400% 缩放；
- 控制台、网络、完整五关与重开浏览器实测；
- README、catalog、portal 和 installed 接入。

未完成以上项目之前，不把 `twin-orbit` 标记为 installed 或“点开即玩”。
