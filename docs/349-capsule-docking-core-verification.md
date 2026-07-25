# capsule-docking 非视觉核心复核

- 日期：2026-07-25
- 分支：`codex/exp-capsule-docking-core-audit`
- 审计基线：`2d442c0004c9425573d72f052fff5ce58f70e6a4`
- 原核心提交：`4172fc9`（`feat: add capsule docking core`）
- 本轮修复提交：`782cc6c`（`fix: harden capsule docking input boundaries`）
- 范围：research / brainstorm / spec / ImageGen brief / source refresh / plan、
  配置、纯领域逻辑、固定 fixture、测试与借鉴声明
- 浏览器：N/A；生产 UI、视觉资产、输入调度与 `file://` 入口仍未创建

## 1. 结论

本轮复核发现并修复一个真实的敌对扩展值边界缺口：

- 函数型 Proxy `composeCompletionNote` 会在配置递归冻结时触发 trap，同时外部
  callback 会被意外冻结；
- 对象型 Proxy control 会在查表的隐式属性键转换中触发 trap。

修复后，配置通过内部 wrapper 与输入断开引用，control 在查表前先做字符串类型
收窄；两条路径均按规格安全调用或 no-op，不再抛异常。复现、根因和修复记录见
[`bugs/capsule-docking-hostile-extension-values.md`](../bugs/capsule-docking-hostile-extension-values.md)，
可复用结论见
[`learn/callback-and-identifier-hostile-boundaries.md`](../learn/callback-and-identifier-hostile-boundaries.md)。

除此之外，没有发现需要修改数值、状态机、金路径、来源声明或依赖边界的真实
缺口。当前非视觉核心可以交付集成，但**仍不是可玩作品**，不得加入 catalog、
不得标记 installed，也不得把纯逻辑通过等同于 A 级 `file://` 直开。

## 2. 冻结合同复核

### 2.1 双人职责与合作必要性

- 姿态席仅能通过 `rotate-left / rotate-right` 改变角速度；
- 推进席仅能通过 `thrust-forward / thrust-reverse` 沿更新后的船头改变线速度；
- 两席共同控制同一个刚体，没有第二艘船、隐藏信息或个人评分；
- 三条 fixture 都包含两席有效 control tick；
- 无推进时第一段 x 保持初始值，无法进入位置 Gate；
- 无姿态时三个初始角度保持在 `32 / 16 / 240`，无法进入 ±5 角格 Gate；
- 任一 control 仍按住时 `controlsReleased=false`，稳定窗不能累计。

因此，一席不能独立完成规则合同；同机页面仍只能依赖参与者信任，不能证明物理上
一定由两个人操作。

### 2.2 确定性与重放

- 位置、速度、角度、角速度、碰撞与 Gate 全部使用安全整数；
- 256 项三角表的规范 SHA-256 仍为
  `33ba6aa1ad08759367f945d173cc89d34e5de1177c1c1bc92426568212727573`；
- 生产核心不调用 `Math.sin`、`Math.cos`、随机、时间、DOM、网络或存储；
- TICK 分片只改变 revision，不改变物理终态或去除 revision 后的 public view；
- 三段仍分别在 367 / 382 / 386 tick 到达精确终态：

| 航段 | tick | `x / y` | `vx / vy` | `angle / av` |
| ---: | ---: | --- | --- | --- |
| 1 | 367 | `81537 / 31000` | `21 / 0` | `0 / 0` |
| 2 | 382 | `80851 / 30762` | `0 / 0` | `255 / 0` |
| 3 | 386 | `80658 / 31114` | `0 / 0` | `1 / 0` |

每条路线最后连续 30 tick 同时满足位置、线速度、角度、角速度、四键松开与无碰撞
六项 Gate。

### 2.3 状态、配置与公开视图

- 七阶段 reducer、exact action/state schema、失败优先级、重试、SUSPEND、纪念态
  与 RESTART 仍符合 177；
- hostile accessor、对象/数组子类、descriptor Proxy、函数型 Proxy 与非字符串
  control 均有安全边界；
- public view 只公开共同完成记录，不泄露个人 control tick、金路径、燃料、
  评分或未来输入；
- 配置只能改变两个称呼与最终赠言，不能改变物理、键位、航段或 Gate；
- 完成赠言只消费冻结、断引用 summary，异常、异步或非法结果回退默认文案。

## 3. 机制去重复核

本作的机制增量仍是“把同一惯性刚体的转动权与局部轴向推力权硬拆给两席，再用
多变量连续稳定窗完成对接”，与已安装作品边界清楚：

| 对照作品 | 已有核心 | `capsule-docking` 的不可替代差异 |
| --- | --- | --- |
| `lighthouse-passage` | 一席照明，另一席独立驾驶小船 | 两席直接拆分同一刚体的转动/平动权限；无照明和信息不对称 |
| `moving-home-together` | 两端意图合成家具平移/旋转 | 有线速度、角速度、局部推力、反推与连续碰撞，不是直接位置微步 |
| `steady-together` | 两席托天平两端维持滚珠安全 | 二维自由漂移与接口捕获，不是支撑/滚珠/路线自动推进 |
| `tethered-heart` | 两个角色通过绳带约束 | 只有一个共享刚体，无双角色、绳带或互撞 |
| `orbit-star-race` | 两个独立卫星竞争抢星 | 合作近距对接，无轨道竞速、刷新星星或赢家 |
| `moon-base-power` | 两席调节支路并保持供电稳定 | 稳定计数是通用模式；本作判定的是刚体的六项运动/碰撞 Gate |

仓库内静态检索只发现 UMD/CommonJS 包装、descriptor snapshot、clamp 等共享工程
惯例，没有发现其他作品的关卡、数值、角色、默认文案或资产进入本目录。

## 4. 固定来源、许可证与零复制

2026-07-25 重新读取 GitHub API、默认分支 ref 与固定/当前许可证原文：

| 来源 | 默认分支 HEAD | 公开状态 / SPDX | 许可证 SHA-256 |
| --- | --- | --- | --- |
| [Farama Gymnasium](https://github.com/Farama-Foundation/Gymnasium/tree/20b453de30ef725a538e235fcdec909f30c95783) | `20b453de30ef725a538e235fcdec909f30c95783` | 未归档、未禁用 / MIT | `7dacaa9772e856aee6943b32ef663d3634d91d72ec7bbc74d136943673f91e18` |
| [schteppe/p2.js](https://github.com/schteppe/p2.js/tree/2beb2750f42d29014e289cb803b7269d5b0edaad) | `2beb2750f42d29014e289cb803b7269d5b0edaad` | 未归档、未禁用 / `NOASSERTION`；根 LICENSE 为 MIT | `bf18c22aac924767ac66ef68e453f4e78f39d0e054442bc6925b09a1fcdb61b2` |
| [jriecken/sat-js](https://github.com/jriecken/sat-js/tree/20e612681d1f9eabc9ea34dc98c4d27f985ffec6) | `20e612681d1f9eabc9ea34dc98c4d27f985ffec6` | 未归档、未禁用 / MIT | `de2ab62cb212dfbfe403a2f7e8b7de9b7e74e33d12bdbe8854bf324ab00fd2a2` |
| [phaserjs/phaser](https://github.com/phaserjs/phaser/tree/41be1e462bc600064e498cba370bfa8c5c055a22) | `41be1e462bc600064e498cba370bfa8c5c055a22` | 未归档、未禁用 / MIT | `c3a9ba7e38d4ef33dccf5fdd1046655c63df06714f84776118fe406f43db5cf2` |

四个 HEAD 仍精确等于固定 commit，固定与当前许可证哈希也逐项相同。
`ATTRIBUTION.md` 已保留完整 commit、许可证、版权主体、只研究的抽象点与未引入
范围。NASA NTRS 仍只支持位置、速度、姿态和姿态率四类事实背景，不是代码、
参数、素材或训练结论来源。

运行目录只有 `package.json`、配置、逻辑、fixture、测试与借鉴声明；
`package.json` 精确为 `{"type":"commonjs"}`，没有第三方依赖或 import。静态扫描
中，来源项目名和 NASA 只出现在 `ATTRIBUTION.md`，生产逻辑没有其 API、品牌、
源码符号或运行引用。这里的“零复制”结论限于当前目录、固定来源边界与可复核
静态证据；若未来引入任何第三方代码或资产，必须重新做文件级许可审计。

## 5. ImageGen 与非视觉边界

[`208-capsule-docking-imagegen-brief.md`](./208-capsule-docking-imagegen-brief.md)
仍只是一份冻结简报：

- D1–D13 概念图未生成；
- `docs/assets/capsule-docking/` 不存在；
- 生产目录没有 `index.html`、`app.js`、CSS、图片、字体、音频或其他视觉资产；
- 本轮没有调用 ImageGen、没有生产 UI，也没有修改 launcher、catalog、Board、
  README、共享 runtime 或根依赖声明。

视觉接受、浏览器输入生命周期和 A 级启动合同仍应由后续独立阶段完成。

## 6. 验证结果

项目级：

```text
node --check config.js / logic.js / golden-fixtures.js / logic.test.js
node --test experiences/co-op/capsule-docking/logic.test.js
tests 22
pass 22
fail 0
```

统一依赖：

```text
npm ci
added 55 packages
audited 56 packages
found 0 vulnerabilities
```

全仓：

```text
npm test
tests 2271
pass 2271
fail 0
```

仓库合同：

```text
npm run verify
仓库验收通过：58 个作品入口（50 个 A 级直开、8 个非 A 启动器）、
1 个能力声明、资源与借鉴声明完整。
```

`git diff --check` 通过。58 个入口计数保持不变，因为本项目尚未 installed。

## 7. 后续仍未通过的 Gate

- 用户接受的 D1–D13 视觉概念、生成台账与 fidelity ledger；
- `index.html`、`app.js`、CSS、运行资产与无脚本内容；
- 键盘、双 Pointer、input epoch、rAF generation、BFCache、焦点和 live region；
- 四档 100% 视口、两档 200% zoom、reduced-motion、forced-colors、图片阻断；
- 真实 `file://` 三层启动、控制台/网络、完整三段浏览器重放；
- README、catalog、门户、分类索引、Board 与最终 installed 集成。

这些 Gate 不能由本次非视觉核心审计替代。
