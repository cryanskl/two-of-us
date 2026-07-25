# `twin-orbit` 定向调研：这一圈，和你同时到

- 日期：2026-07-25
- 稳定工作 ID：`twin-orbit`（仅作仓库内部标识）
- 建议公开标题：**这一圈，和你同时到**
- 主分类：双人合作
- 目标启动等级：A（`file://` 直开）
- 当前阶段：brainstorm / research；不创建生产 UI、入口或 catalog 条目

## 1. 结论

**Conditional Go。**

这个方向只有在以下机制同时成立时，才不是
[`orbit-star-race`](../experiences/versus/orbit-star-race/README.md) 的合作换皮：

1. 两颗星同向绕同一中心运动，双方分别只控制自己那颗星；
2. 松开时在外轨以 2 格/tick 前进，按住时切到内轨以 3 格/tick 前进；
3. 每一关公开一对目标门、目标半径和共同开门 tick；
4. 成功不是“谁先碰到目标”，而是两颗星在同一逻辑 tick 穿过各自目标门；
5. 目标距离与开门时间强制双方在每关都用过快、慢两种状态；
6. 五关把目标半径、先快后慢与先慢后快的负担镜像交换。

临时整数模拟已经验证五组候选金路径都能在指定 tick 同时到达，且双方在五关中
各使用 150 个内轨 tick。这个模拟只证明规则可达，不是生产逻辑、测试或安装
证据。

若后续求解器不能证明五关可达、双方都不可挂机、刷新率分片一致，或真实试玩
发现玩法只剩“看到亮窗一起按”，应立即 **No-Go**，不要用视觉包装掩盖重复。

## 2. 产品定位

### 2.1 为什么是双人合作

- 两位玩家同时参与；
- 每人控制一颗独立双星；
- 两颗星必须同 tick 到门，任何一方都不能单独完成；
- 最终只有共同完成，没有个人比分、赢家、淘汰或关系评价。

因此它不是：

- **惊喜**：没有一人准备、另一人揭晓的核心流程；
- **对抗**：没有互相争抢、积分或先后胜负；
- **单人工具**：没有可单人完成的替代规则。

主分类冻结为 `co-op`。面向文案使用“情侣、夫妻、朋友或任意两个人”，不把
玩法或完成赠语限定为某种关系。

### 2.2 为什么目标是 A 级

首版只需经典脚本、原生 DOM/CSS、`requestAnimationFrame`、键盘和 Pointer
Events。它不需要：

- ES modules、构建器、包管理器或第三方运行依赖；
- 服务端、localhost、WebSocket、账号或联网；
- storage、cookie、分享、剪贴板或 URL 配置；
- 相机、麦克风、位置、传感器、通知或文件权限；
- WebGL、物理引擎、外部字体、CDN、远程图片或音频。

规则以 30Hz 整数 tick 推进，Canvas/SVG/DOM 只投影状态。因此目录可独立复制，
从 Finder 双击 `index.html` 后完整游玩，目标等级为 A。

## 3. 当前仓库去重审计

本轮读取了 `experiences/catalog.json` 的 58 个已安装条目，并重点检查以下相邻
项目及其研究、规格、README、核心验证和归属声明。

| 项目 | 已占据的核心机制 | `twin-orbit` 必须保持的边界 |
| --- | --- | --- |
| `orbit-star-race` | 双方反向绕行；三轨换轨改变角速度；竞争同一目标星 | 同向、二档按住/松开、固定双门、同 tick 合作、无随机星流和比分 |
| `capsule-docking` | 姿态席与推进席分工控制同一个刚体；六项安全 Gate 稳定 30 tick | 两个独立角色、两席能力同构、无惯性/碰撞/刚体、成功是双事件原子会合 |
| `kaleidoscope-names` | 单人调折面与相位，exact 后主动揭晓名字 | 不配置私人答案、不揭晓内容；相位是实时合作状态，不是单人谜底 |
| `four-hands-harmony` | 双方在 200ms 内直接按目标键并保持 300ms | 输入可在整段轨迹任意时刻发生；结果由累计相位决定，不判按键间隔 |
| `together-zipper` | 公共亮窗内双方各提交一次离散拉动 | 双方持续按住/松开改变速度，不记录“一次提交” |
| `same-pace-star` | 领拍按住、接住、领拍松开、接方松开的四拍交接 | 两席同时拥有同构控制，没有轮流领拍；空间相位而非固定四拍顺序 |
| `steady-together` | 双方托住天平两端，球位/梁角安全时自动推进 | 没有共享刚体、滚珠、平衡阈值或自动路线 |
| `moving-home-together` | 两端方向合成为家具平移/旋转并穿过障碍 | 两颗星不合成为共享物体，没有地图碰撞和方向摇杆 |
| `tethered-heart` | 双角色被丝带约束，共同拖动共享吊坠 | 双星之间没有距离约束、碰撞或共享载荷 |

### 3.1 最大重复风险

`orbit-star-race` 已明确使用“内轨更快、外轨更慢”。因此题材、轨道、星体和
换轨本身都不能算创新。

新项目的独立核心必须是：

> 双方提前塑造各自累计相位，在一个公开共同开门时刻，让两颗星各自穿过不同
> 半径、不同角度的目标门，并在同一固定 tick 形成一对事件。

如果实现改成随机出星、抢先碰撞、个人得分、反向绕行或三轨升降，应停止并回到
`orbit-star-race`，不新增项目。

### 3.2 与直接同步按键的区别

`four-hands-harmony` 和 `together-zipper` 都已经很好地覆盖了“看到时间窗后双方
直接提交输入”。`twin-orbit` 的按键不能直接代表成功：

- 按下只把自己的星切入快轨；
- 松开只把自己的星切回慢轨；
- 任意一次按下或松开都可能发生在目标门亮起前很多 tick；
- 权威判定只看轨迹积分后的双门穿越事件。

若试玩者最有效的策略退化成“亮了就一起按”，则判为机制失败。

## 4. 备选方向与取舍

| 方向 | 结论 | 原因 |
| --- | --- | --- |
| 把 `orbit-star-race` 改成合作收集星星 | 排除 | 只改胜负目标，轨道和输入仍相同 |
| 一人控制共同半径、一人控制共同相位 | 排除 | 与 `capsule-docking` 的共享对象分权过近，双方能力也不对等 |
| 两颗星相撞即成功 | 排除 | 容易退化为单次角度校准，没有关卡和半径约束 |
| 两人看到亮窗同时按键 | 排除 | 与现有同步/节奏项目重复 |
| 自由轨道物理、引力和弹弓 | 排除首版 | 难以解释、验证和保证 A 级公平，不需要真实物理 |
| 固定 tick 双门会合 | 采用 | 累积相位、独立角色、共同结果和确定验证可以同时成立 |

## 5. 候选规则的可达性探针

规则圆周使用 720 个整数角格：

```text
outer / released = +2 angle steps per tick
inner / held     = +3 angle steps per tick
```

一关给出：

```text
startAngle[2]
targetAngle[2]
targetLane[2]
openTick
```

候选五关及已验证金路径：

| 关 | 起点 A / B | 目标 A / B | 开门 tick | A 路径 | B 路径 | 目标半径 A / B |
| --- | --- | --- | ---: | --- | --- | --- |
| 1 | 40 / 320 | 180 / 470 | 60 | 内 20、外 40 | 外 30、内 30 | 外 / 内 |
| 2 | 80 / 400 | 230 / 540 | 60 | 外 30、内 30 | 内 20、外 40 | 内 / 外 |
| 3 | 120 / 450 | 300 / 630 | 72 | 内 18、外 36、内 18 | 外 18、内 36、外 18 | 内 / 外 |
| 4 | 160 / 500 | 352 / 708 | 84 | 内 24、外 60 | 外 44、内 40 | 外 / 内 |
| 5 | 200 / 560 | 408 / 32 | 84 | 外 44、内 40 | 内 24、外 60 | 内 / 外 |

五关中：

- A 的内轨总 tick：`20 + 30 + 36 + 24 + 40 = 150`；
- B 的内轨总 tick：`30 + 20 + 36 + 40 + 24 = 150`；
- 所有路径都在目标 tick 恰好落到目标角；
- 每位玩家每关都必须使用两种速度；全程外轨会太晚，全程内轨会太早；
- 第 1/2 关和第 4/5 关互换双方负担，第 3 关总量相同。

正式逻辑仍须用枚举/动态规划求解器证明开门窗口内存在解，并证明恒定输入不能
过关。这里的手工路径不能替代自动测试。

## 6. 输入、触屏与公平性

### 6.1 输入模型

- 左席：按住 `F` 进入内轨，松开回外轨；
- 右席：按住 `J` 进入内轨，松开回外轨；
- 触屏：左右各一个至少 48×48 CSS px 的原生按钮；
- 键盘使用 `KeyboardEvent.code` 的 `KeyF` / `KeyJ`，避免字符布局改变规则；
- `keydown` 只把对应 held 设为 true，repeat 不重复产生 action；
- `keyup` 把 held 设为 false；
- Pointer 以 `pointerId` 绑定席位，处理 `pointerup`、`pointercancel`、
  `lostpointercapture` 和 document 级释放。

[W3C UI Events KeyboardEvent code Values](https://www.w3.org/TR/uievents-code/)
定义了物理键位 `code`；[Pointer Events Level 3](https://www.w3.org/TR/pointerevents3/)
定义了 capture、cancel 与释放生命周期。标准只用于校准平台行为，不是运行依赖
或代码来源。

### 6.2 公平合同

- 两席拥有相同速度、相同控制能力、相同可见信息和相同目标尺寸；
- 每个 tick 先读取双方 held 快照，再统一推进，不按事件到达顺序偏袒某席；
- 同 tick 双事件原子裁决，不能先渲染 A 再裁决 B；
- 五关镜像交换角色负担，双方内轨金路径总量相同；
- 颜色之外同时使用“左星 / 右星”、形状、轨迹和文字；
- 不显示个人失误、准确率、贡献分、赢家或责任归因；
- 真实桌面必须验证 `F + J` 同时保持；真实触屏必须验证双 pointer；
- 无障碍单人可用 Tab 激活两个原生按钮理解规则，但不把单人自动完成当成产品
  承诺；核心仍是两人同时操作。

## 7. 暂停、失败与重开

建议阶段：

```text
intro → gate-intro → playing → gate-success
                         └────→ gate-retry
       → campaign-complete
```

- `Escape`、window blur、`document.hidden` 或 `pagehide` 立即清空 held；
- 自动暂停不在后台补 tick，也不保留可能粘住的 Pointer；
- 返回后回到当前关的 `gate-intro`，从冻结起点重来，不计失败；
- 任一星过早穿门、只有一星穿门、目标半径错误或窗口关闭，进入温和重试；
- 重试只重置当前关，已经完成的关不丢；
- 完成页提供“再绕一次”，明确从第 1 关开始；
- 任何终态都必须幂等，按键和 Pointer 不能继续改状态。

[WHATWG HTML：Page visibility](https://html.spec.whatwg.org/multipage/interaction.html#page-visibility)
规定 `visibilityState` 与 `visibilitychange`；本作据此选择“失去可靠输入时
重置当前关”，而不是猜测后台经过的时间。W3C Page Visibility Level 2 已是
discontinued draft，不作为现行规范来源。

## 8. 可访问性与动效边界

- 规则信息以 DOM 文字呈现，轨道图不是唯一信息源；
- 原生按钮支持 Tab、Enter、Space；实时键位只是并行快捷入口；
- 状态消息用 `role="status"` / `aria-live="polite"`，不逐 tick 播报角度；
- 进行态提供节流摘要，例如“左星稍早，右星还需追近”，但不泄露自动解法；
- 触控目标至少 48px，超过 WCAG 2.2 的 24px 最低目标要求；
- `prefers-reduced-motion: reduce` 关闭拖尾、脉冲和半径过渡，规则 tick 不变；
- forced-colors 下保留轮廓、焦点环、左右形状和目标半径文字；
- 320px 宽、200% text、400% zoom 不横向溢出；
- Canvas/SVG/装饰失败时，文字、计时条、按钮和结果仍能完成规则。

依据：

- [WCAG 2.2 Keyboard](https://www.w3.org/WAI/WCAG22/Understanding/keyboard.html)
- [WCAG 2.2 Target Size](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum)
- [WCAG 2.2 Status Messages](https://www.w3.org/WAI/WCAG22/Understanding/status-messages)
- [WCAG 2.2 Animation from Interactions](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html)

## 9. 名称、版权、商标与开源边界

### 9.1 名称风险

2026-07-25 的来源复核发现：

- Apple 官方
  [iTunes Lookup API](https://itunes.apple.com/lookup?id=6779551879&country=no)
  当前返回 `resultCount=1`：`trackId=6779551879`、`trackName=Twin Orbit`、
  `releaseDate=2026-06-23`、`version=2.1`、
  `currentVersionReleaseDate=2026-07-16`；描述明确包含双火箭、双指控制、收集/
  躲避和排行榜。对应
  [App Store 页面](https://apps.apple.com/no/app/twin-orbit/id6779551879)；
- 首轮检索曾从 Playgama 的同名 URL 读到 Low Gear Games 的点击反转双球、
  躲避陨石描述；但当前
  [该 URL](https://playgama.com/game/twin-orbit) 返回 `301` 到
  `/category/space`，响应头为 `x-bff-redirect-reason: game_hidden`。它只保留为
  2026-07-25 首轮检索的历史记录，不是当前可访问或在架证据。

因此：

- `twin-orbit` 只作当前仓库内部工作 ID；
- 页面标题、卡片标题、README 标题和未来截图都使用“这一圈，和你同时到”；
- Apple 当前官方条目单独足以支持英文名称避让；
- 不使用 Apple 当前条目及 Playgama 历史记录中的名称呈现、火箭、双球反转、
  陨石、生存、排行榜、视觉或文案；
- 本轮检索不是法律意见，也不是商标清查；
- 若未来公开发布、商业化或上架，必须用 USPTO TSDR、WIPO Global Brand
  Database 和目标司法辖区数据库做正式检索，并视风险更换目录 ID。

### 9.2 借鉴声明

本调研直接参考了本仓库 `orbit-star-race` 的高层抽象：

> 半径状态可以选择不同角速度。

这是**机制边界对照**，不是代码复用。新项目不得复制其源码、常量、随机星流、
三轨结构、反向方向、比分、界面、素材、文案或测试。

本轮没有选择、下载、复制、修改、链接、vendoring 或改写任何外部开源游戏、
轨道 demo、物理库、代码片段、素材、字体、音频或图标。外部网页只用于名称冲突
检查；W3C/WHATWG/WAI 文档只用于平台与无障碍边界。

若实现阶段打开任何外部开源项目，必须先暂停编码，固定 commit/tag、LICENSE、
版权人、文件级来源和实际借鉴范围，再更新本研究及项目 `ATTRIBUTION.md`。

## 10. Conditional Go Gate

进入生产前必须同时满足：

1. 独立求解器验证五关在开放窗口内可达；
2. 每关双方的恒定外轨、恒定内轨都不可完成；
3. 五关双方金路径负担镜像且总量相同；
4. 同 seed/关卡 + 同 input log 在任意 RAF 分片下得到完全相同状态；
5. 两星同 tick 事件原子裁决，不依赖 DOM、Canvas 或动画结束；
6. 真实键盘 `F + J` 和真实双 pointer 可同时保持；
7. 失焦、hidden、pagehide 后清输入并从当前关安全重来；
8. 经典相对脚本、零网络、零存储、零权限、零第三方运行依赖；
9. 公开标题避开 “Twin Orbit”，归属声明写清内部机制对照与零复制边界；
10. 两位不了解实现的人能在 30 秒内说出“按住变快、松开变慢、同拍过双门”。

任一项失败则 No-Go 或返回研究。本文件不代表项目已安装，也不增加 catalog
计数。
