# 心愿烟火：降动效即时完成让重复激活跨束生效

- 状态：`fixed`
- 日期：2026-07-21
- 影响作品：S12 心愿烟火（调研/规格阶段）
- 发现版本 / commit：`8498e7b`

## 环境

- 设计审查与事件序列重放；
- A 级 `file://` 目标；
- `prefers-reduced-motion: reduce` 或 Canvas 失败降级；
- 鼠标双击，或按住 Enter 产生重复键盘激活。

## 复现步骤

1. 在 ready 阶段快速双击任一发射按钮，或持续按住 Enter；
2. 第一个 click 派 LAUNCH，降动效路径用 microtask 立即 COMPLETE；
3. 第二个 click 到达时重新读取状态。

## 预期结果

一次物理激活意图最多点燃一束；降动效、Canvas 失败和正常动画应得到相同束次数。

## 实际结果

修复前只依赖 bursting 阶段拒绝重复 LAUNCH。microtask 已在第二个 click 前把状态送回下一束 ready，因此第二个动作对新 revision/index 再次合法，会越过一束。

## 根因

状态机能拒绝同一阶段的非法重复动作，却不能判断新阶段收到的动作是否仍属于上一轮双击或键盘 repeat。即时完成路径缩短了阶段门，暴露了物理激活层缺失去重合同的问题。

## 解决方案

- 两个按钮忽略 pointer `click.detail > 1`；
- Enter/Space 的 `keydown.repeat` 必须 preventDefault，held-key 在 keyup/blur 清理；
- AT/语音产生的独立 `detail=0` activation 仍保留；
- 去重发生在 LAUNCH 与 reduced-motion microtask 之前；
- 动态切入 reduced-motion 时把当前 pointerId 写入按 `mouse/touch/pen/other` 分桶、最多四项的墓碑表；新 pointerdown 另建 candidate、不能删除其他类型墓碑；旧手势随后补发的 `detail=1` click 只清同桶墓碑并 no-op，不同类型的新 candidate 仍可提交；
- 同类型下先匹配精确旧 pointerId：命中才消费墓碑并 no-op；若改为命中当前 normal/reduced candidate，则允许提交且保留旧墓碑；两者都不匹配才 fail closed；元数据缺失且仍有墓碑时同样 no-op；
- matching pointercancel 原子清普通/reduced candidate 与同身份墓碑，避免 canceled reduced candidate 残留；
- 独立 `detail=0` activation 不受墓碑阻断；
- `window.blur`、hidden 与 pagehide 完整取消 capture、holding/awaiting、计时、fallback、held-key 和蓄力 UI；
- 延迟结果焦点统一由 `window.focus` 与 visible 恢复冲刷，避免 blur-only 完成后永远不聚焦；
- 规格同时覆盖主按钮、直接入口、Canvas 失败和动态切换 reduced-motion。

## 回归验证

- [x] 调研合同明确 pointer 双击只点燃一束；
- [x] 调研合同明确 Enter/Space repeat 不连开；
- [x] AT/语音独立 activation 不被时间锁误伤；
- [x] 动态切入 reduced 后，旧 pointer click 被一次性墓碑吞掉；
- [x] touch→mouse 与 mouse→touch 交错时，新设备不删除旧设备墓碑；
- [x] blur/hidden/pagehide 都按完整取消路径处理；
- [x] blur-only 完成可由 window focus 恢复结果焦点；
- [x] 进入规格 Gate 已包含 reduced-motion 与 Canvas 失败竞态；
- [x] `npm run verify` 通过：55 个作品入口、1 个能力声明，资源与借鉴声明完整。

## 相关提交

- 文档修复提交：`docs: harden wish fireworks activation research`
