# `wish-fireworks` 非视觉核心复验

> 日期：2026-07-25
> 基线：`5d995630672668df6e1a4f356b5eef67606d89b0`
> 分支：`codex/exp-wish-fireworks-core-audit`
> 范围：确定性核心、输入/动效数据合同、来源与资源、已安装作品去重
> 明确不在范围：生产 UI、浏览器验收、launcher 与 catalog Gate

## 1. 结论

`wish-fireworks` 的非视觉核心在修复一处 docs-only 来源链接漂移后通过复验：

- `logic.js` 保持纯确定性；三束都必定成功，蓄光档位只影响当前束的表现高度，
  不改变最终内容或完成结果；
- reducer、配置校验、revision/token、公开投影和隐私前缀 Gate 与冻结规格一致；
- 整数表现帧不读取随机数、时钟、DOM、网络、存储或权限，也没有闪烁/频闪数据；
- 五项固定上游提交仍可访问，许可证文件 SHA-256 与生产
  `ATTRIBUTION.md` 全部一致；
- 当前生产目录没有第三方运行依赖、vendor、字体、图片或音频资源；
- 与 catalog 中相近的已安装惊喜相比，固定三束点阵成字和“高度仅为表现”的组合
  仍有清楚边界。

本结论只接受现有非视觉核心。项目尚无 `index.html`、`app.js`、`styles.css` 或
`README.md`，也未进入 `experiences/catalog.json`；因此仍不是可双击打开的 A 级
作品，不能据此宣称 UI、浏览器、响应式、无障碍或 catalog 验收完成。

## 2. 已核对的冻结材料与实现

完整阅读并交叉核对：

- [183：调研](./183-wish-fireworks-research.md)
- [184：可执行规格](./184-wish-fireworks-spec.md)
- [201：脑暴决策](./201-wish-fireworks-brainstorm.md)
- [202：ImageGen 简报](./202-wish-fireworks-imagegen-brief.md)
- [227：来源刷新](./227-wish-fireworks-source-refresh.md)
- [229：视觉提案](./229-wish-fireworks-design-proposal.md)
- [246：分批实施计划](./246-wish-fireworks-plan.md)
- `config.js`、`logic.js`、`logic.test.js` 与生产 `assets/ATTRIBUTION.md`
- 逻辑引入提交 `c178dc6` 与生产借鉴声明提交 `51f879d`

当前生产目录恰有四个文件：

```text
experiences/surprises/wish-fireworks/
├── assets/ATTRIBUTION.md
├── config.js
├── logic.js
└── logic.test.js
```

## 3. 基线与最终测试

### 3.1 修复前原始基线

| 检查 | 结果 |
| --- | --- |
| `node --check config.js` / `logic.js` | 通过 |
| `node --test experiences/surprises/wish-fireworks/logic.test.js` | 30 / 30 通过 |
| `npm test` | 2269 / 2269 通过 |
| `npm run verify` | 通过；58 个作品入口、1 个能力声明 |
| `git diff --check` | 通过 |

### 3.2 红测与修复

来源一致性回归加入后，定向测试稳定得到 30 项通过、1 项失败：ImageGen
生成台账指向 `tangren1998/canvas-text-particle`，但冻结提交、许可证和生产声明
都属于 `dango0812/canvas-text-particle`。完整记录见
[bug 记录](../bugs/2026-07-25-wish-fireworks-generation-ledger-source-drift.md)。

提交拆分：

1. `48521d8 test: expose wish fireworks source drift`
2. `43fd632 docs: correct wish fireworks source link`
3. `a7cfd3f docs: record wish fireworks source drift`

修复后定向测试为 31 / 31 通过；最终全仓与仓库验收结果见第 8 节。

## 4. 确定性 reducer 与隐私 Gate

| 合同 | 核验结果 |
| --- | --- |
| 状态与动作 | 六字段状态和四种动作均按 exact schema 校验；拒绝 accessor、额外键、污染原型与强制类型转换 |
| 非法输入 | 畸形 state 返回全新 canonical intro，且不读取 action；合法 state 的非法 action 保持原引用 |
| JSON 可重放 | 每个合法 phase 的 JSON clone 都可继续使用；action log 与 JSON clone 字节一致 |
| revision headroom | intro、ready、bursting、complete 与 restart 的 `MAX_SAFE_INTEGER` 边界和完整下一轮余量均有回归 |
| 三束保证 | 20³ = 8,000 种三束 charge 组合得到字节一致的 complete state 和 public view |
| 隐私前缀 | 只公开已完成字形；bursting 只公开当前目标；收件人、署名、标题与留言仅 complete 可见 |
| 最终点阵 | 当前束按五档高度表现；已完成字形统一落在固定 band 2，charge 不改变最终文字 |
| 环境隔离 | 模块初始化不触碰 DOM、真实时钟、随机、网络、存储、权限或动画 API |

没有发现 reducer、配置回退、公开投影或 revision/token 的新缺口。

## 5. 输入生命周期边界

核心已提供的仅是可由 UI 消费的纯数据合同：

- `quantizeHold(startMs, endMs)` 只接受非负 safe integer、拒绝倒序时间；
- 以 50 ms 为单位量化为 1–20 单位，950 ms 封顶，并稳定映射五档高度；
- `LAUNCH` 同时校验 `index`、`expectedRevision` 与 `chargeUnits`；
- `COMPLETE_BURST` 必须携带当前 `burstToken`，旧 token 不能结束新的一束。

以下内容属于 `app.js`/浏览器层，当前不存在，因此本轮没有实现或假装验收：

- pointer capture、`pointercancel`、`lostpointercapture` 与 tombstone；
- pointer 之后的兼容 click 抑制、键盘 repeat、直接点燃与按住蓄光互斥；
- `blur`、`visibilitychange`、卸载清理与重复激活防护；
- 原生 select、按钮可用态、焦点转移和状态播报。

冻结规格中的输入生命周期仍有效，但必须等生产 UI 获准后用真实浏览器验证。

## 6. 闪烁与 reduced-motion 数据合同

`presentationTick` 和 `getPresentationFrame` 是绝对输入的整数函数：

- 时间只由调用者传入；0–1000 ms 映射到 0–120 tick；
- ascent、formation、hold、fade 四段边界固定；
- 点位 `id/x/y/alpha` 全为稳定整数，不调用随机数；
- alpha 只在最后 fade 段单向下降，没有亮暗往返、闪烁、strobe 或全屏 flash；
- 同一 rows、chargeUnits、tick 始终返回相同递归冻结帧。

核心的 `burstToken` 足以让未来 reduced-motion 路径跳过表现帧、异步完成同一束并
拒绝旧完成信号。但“用 microtask 完成而不是同步重入”、媒体查询切换、Canvas/CSS
降级和三闪阈值都属于尚未存在的 UI；本轮只确认数据合同，没有声称这些浏览器行为
已经落地。

## 7. 来源、资源与机制去重

### 7.1 固定来源实时复核

2026-07-25 通过 GitHub commit API 与固定 commit 的 raw license 逐项复核：

| 来源 | 固定 commit | commit | license SHA-256 |
| --- | --- | --- | --- |
| `crashmax-dev/fireworks-js` | `8f01eeaef422c1f0880e94ce99040025a1b74d7e` | HTTP 200、SHA 一致 | 一致 |
| `w3c/pointerevents` | `238e8273305bb2e3c76f9f0bb289fb127c3dff74` | HTTP 200、SHA 一致 | 一致 |
| `dango0812/canvas-text-particle` | `9ee144a548aad85275318b30891c71dcf6e10f7b` | HTTP 200、SHA 一致 | 一致 |
| `catdad/canvas-confetti` | `20eebad51dde793070c373d594099a7ed8d96e22` | HTTP 200、SHA 一致 | 一致 |
| `w3c/wcag` | `07123b871c103268375880980fd715b2b26b2ff0` | HTTP 200、SHA 一致 | 一致 |

生产 `ATTRIBUTION.md` 已记录五项的许可证、版权主体、固定 commit、许可证哈希、
实际借鉴和明确未复制范围。运行目录未发现第三方 script、动态 import、require、
fetch、网络地址、图片、字体或音频；根依赖也未因本项目改变。15 张 ImageGen PNG
仍只在 `docs/assets/wish-fireworks/`，生产目录不加载它们。

### 7.2 与已安装项目的决定性差异

| 已安装项目 | 相近表面 | `wish-fireworks` 的决定性差异 |
| --- | --- | --- |
| `future-cookie-notes` | 三次渐进揭晓后组成邀请 | 三枚签可任意顺序打开；本作严格三束顺序、每束形成固定点阵字符，蓄光只改表现高度 |
| `future-ticket` | 三步后组成完整结果 | 车票每步盲选候选并产生组合；本作没有选择结果或随机组合，20³ 输入都到同一终局 |
| `star-code-unlock` | 三步点亮后读最终内容 | 星码需要回答私人线索且可答错/求助；本作没有答案判定，三束保证成功并逐字留下 |
| `paper-plane-mail` | 力度/轨迹表现后打开私信 | 纸飞机有可失败的物理命中；本作 charge 不判成败，只改变当前火箭 apex |
| `scratch-surprise` | Canvas 动作后揭晓惊喜 | 刮卡按像素覆盖阈值且有直接揭晓；本作按三次离散 token 推进，点阵目标不来自像素采样 |

因此，不能把“本地惊喜”或“三阶段揭晓”本身当作独创点；需要同时保留“固定三束
必成、charge 仅改变高度、三份 9×9 点阵逐字前缀、complete-only 私信”才与现有
catalog 保持可辨识边界。

## 8. 最终验收与保留 Gate

文档提交前重新执行：

| 检查 | 最终结果 |
| --- | --- |
| `node --check` | `config.js`、`logic.js` 通过 |
| `node --test experiences/surprises/wish-fireworks/logic.test.js` | 31 / 31 通过 |
| `npm test` | 2270 / 2270 通过 |
| `npm run verify` | 通过；58 个作品入口、1 个能力声明 |
| `git diff --check` | 通过 |

仍保留以下 Gate：

1. **视觉确认 Gate**：用户确认或修改
   [229](./229-wish-fireworks-design-proposal.md) 后，才能写生产 UI；
2. **UI/输入 Gate**：实现 `index.html/app.js/styles.css/README.md` 后，验证完整
   pointer、click、键盘、取消、后台与 reduced-motion 生命周期；
3. **浏览器 Gate**：用真实浏览器覆盖 `file://`、桌面/手机/横屏、forced colors、
   reduced motion、no Canvas、no JS、焦点和 320 px；
4. **catalog Gate**：只有上述通过后才可加入 launcher/catalog 并宣称 A 级直开。

本轮没有修改 shared、根依赖、launcher 或 catalog，也没有创建 `learn/`：新发现
是本项目可复现的来源账本漂移，已完整记录在 `bugs/`，不足以另立通用学习条目。
