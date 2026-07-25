# `ricochet-tank-duel` 非视觉核心再验收

> 日期：2026-07-25  
> 基线：`b9bddfe31b9559b3fe095fd010e6a4591a074257`  
> 分支：`codex/exp-ricochet-tank-duel-core-reaudit`  
> 范围：项目现有非视觉核心、定向测试、必要 `bugs/` 与 `learn/`  
> 不在范围：生产 UI、Board、catalog、共享依赖、launcher

## 1. 结论

**非视觉 Core：Go。完整作品：Conditional Go。**

当前核心具备固定 60 Hz tick、定点整数与精确 TOI 排序、连续墙面反射、移动目标
CCD、多弹同刻原子结算、严格动作重放、稳定状态哈希和镜像公平。再验收发现的三处
真实缺口均已按失败测试先行修复，定向测试由基线 `44 / 44` 增至 `47 / 47`。

但目录仍只有 `config.js`、核心模块、测试与借鉴声明，没有 `index.html`、生产交互
层、README 或 catalog 条目。本次又明确禁止修改这些区域，因此不能把该项目称为
“本地点开即玩”或 installed；完整作品继续等待用户确认视觉方向后的生产阶段。

## 2. 当前边界

核心文件：

- `experiences/versus/ricochet-tank-duel/js/constants.js`
- `experiences/versus/ricochet-tank-duel/js/fixed.js`
- `experiences/versus/ricochet-tank-duel/js/geometry.js`
- `experiences/versus/ricochet-tank-duel/js/simulation.js`
- `experiences/versus/ricochet-tank-duel/tests/geometry.test.js`
- `experiences/versus/ricochet-tank-duel/tests/simulation.test.js`
- `experiences/versus/ricochet-tank-duel/tests/replay.test.js`
- `experiences/versus/ricochet-tank-duel/ATTRIBUTION.md`

项目 `package.json` 只声明 CommonJS 边界。核心只加载同目录的
`constants.js`、`fixed.js` 与 `geometry.js`，没有新增 npm、网络、字体、素材、
存储、DOM、随机或真实时钟依赖。仓库根依赖没有被该核心引用，也无需为本次审计
调整共享依赖。

## 3. 核心合同复核

| 合同 | 当前证据 | 结论 |
| --- | --- | --- |
| 固定 tick | `STEP` 一次只推进一个逻辑 tick；倒计时 180 tick，比赛上限 5400 active tick | 通过 |
| 定点与 TOI | Q10 整数；墙面使用规范有理数；圆命中保留整数二次系数并用 BigInt 瞬时比较 | 通过 |
| 连续反射 | 每次推进至最早接触，再用剩余全局时间继续；拐角合并双轴法向 | 通过 |
| 反射/接触上限 | 第 1–3 次反射继续，第 4 次接触前销毁；单 tick 第 5 个候选前 contact-cap | 通过 |
| 移动目标 CCD | 弹体与车体分段路径做相对 sweep；不退化为终点或静态圆检测 | 通过 |
| 多弹原子结算 | 全部弹体先求解到 `hitSet`；同目标多弹只计 1 分；双命中同时计分 | 通过 |
| 时间与得分顺序 | 第 5400 个 playing tick 先完成命中，再按更新比分确定结果 | 通过 |
| 固定日志重放 | 严格 `START/STEP/PAUSE/RESUME/RESTART` 动作联合；100 次重放一致 | 通过 |
| 哈希 | 规范状态排除语义文案，保留逻辑字段和稳定 ID；FNV-1a 输出稳定 | 通过 |
| 镜像公平 | action、state、速度、方向、owner 与弹体 ID 都有确定镜像；长日志探针等价 | 修复后通过 |
| state 敌对输入 | exact schema、值域、phase 联合不变量、规范速度、ID 席位、对手重叠均关闭 | 修复后通过 |
| action 敌对输入 | unknown/extra key/非法 bit/reason 拒绝；畸形便捷 STEP 不再绕过 state 校验 | 修复后通过 |

## 4. 本轮发现与修复

### 4.1 同 tick 发射的稳定 ID 破坏镜像重放

旧测试只证明镜像函数二次调用恢复，没有证明：

```text
mirror(reduce(state, action))
  == reduce(mirror(state), mirror(action))
```

双方同 tick 发射时，全局 ID 按左席优先分配，导致镜像日志反镜像后的 owner/ID
绑定相反，规范状态与哈希分叉。

修复后每个成功发射 tick 使用奇数批次基址，左席占奇数、右席占偶数；即使单方
发射也推进整对。镜像同步翻转 ID 奇偶，validator 同时关闭 owner/ID 不匹配和偶数
批次基址。另用 100 组、每组 240 个 playing tick 的确定性随机日志做独立镜像
探针，全部通过。

记录：`bugs/2026-07-25-ricochet-mirrored-bullet-id-bias.md`

### 4.2 畸形 input frame 让 `step` 绕过 state 校验

`step(hostileState, malformedFrame)` 原先在 reducer 之前提前返回，能把攻击者对象
原样传出。现在畸形 frame 也进入 `applyCommand`：先校验或恢复 state，再对非法
action no-op。

记录：`bugs/2026-07-25-ricochet-step-validation-bypass.md`

### 4.3 伪造弹体可在 tick 边界与对手重叠

正常 CCD 在接触当 tick 已销毁弹体，合法持久状态不可能保留“弹体与对手相交”。
旧 validator 漏掉该联合不变量，使伪造状态下一 tick 可以凭空计分。现在对每枚
弹体与其对手做精确整数距离检查；自己的弹体仍按“不自伤”规则允许穿过己方。

记录：`bugs/2026-07-25-ricochet-opponent-overlap-state.md`

## 5. 提交顺序

1. `6b4c3c4` — 红测：暴露双方同刻发射的镜像 ID 偏置
2. `66e3575` — 修复：对称批次 ID、镜像 ID 与 state 不变量
3. `86a113d` — 红测：暴露畸形 STEP 的 state 校验绕过
4. `5077976` — 修复：便捷 STEP 先进入统一 reducer
5. `7b56433` — 红测：暴露伪造弹体与对手重叠
6. `bf47e10` — 修复：拒绝 tick 边界对手重叠
7. `204d5e6` — 记录三处 bug 的复现、根因、修复与回归
8. `8c89ebf` — 沉淀镜像确定性中的身份分配方法

## 6. 来源与借鉴复核

2026-07-25 重新打开并核对了 `ATTRIBUTION.md` 中的六个固定来源：

- Tang、Kim、Manocha 的连续碰撞论文；
- Linahan 的扫掠球数值稳健性论文；
- Breitner、Smith 的 lock-step simulation 论文；
- W3C High Resolution Time；
- WHATWG animation frames 与 page visibility。

这些来源仍只用于理解连续检测、固定步长、确定性和页面调度边界。当前代码未参考
或复制任何开源坦克游戏、商业游戏、物理引擎、碰撞库、地图、数值、测试、品牌、
图标或素材；本轮也没有新增外部实现参考，所以现有独立实现声明准确，无需补充
第三方软件许可证。

## 7. 验证 Gate

在修复后、写入本报告前执行：

```text
node --test experiences/versus/ricochet-tank-duel/tests/*.test.js
47 / 47 passed

npm test
2287 / 2287 passed

npm run verify
仓库验收通过：58 个作品入口（50 个 A 级直开、8 个非 A 启动器）、
1 个能力声明、资源与借鉴声明完整。
```

报告提交后还需对最终 HEAD 重跑以上三项，并执行：

```text
git diff --check b9bddfe..HEAD
```

只有全部保持通过，最终 Gate 才为 **Core Go / Full Experience Conditional Go**。

## 8. 后续生产阶段的明确前置

本轮没有授权也没有实现以下内容：

- `index.html`、样式、渲染与输入采集；
- 失焦、隐藏、长帧暂停的浏览器接线；
- 键盘、多指触控与 `pointercancel`；
- 文本状态投影、reduced-motion 与完整浏览器 smoke；
- README、catalog、launcher、Board 或 shared deps。

这些不是当前 Core 的缺陷，但都是“本地点开即玩”验收所需的剩余生产工作。生产
UI 必须先取得视觉方向确认，并继续沿用现有 `ATTRIBUTION.md` 的独立实现边界。

