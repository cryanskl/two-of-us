# S12“心愿烟火”定向调研：把愿望，放到夜空里

调研日期：2026-07-21

对应创意：`docs/40-idea-backlog.md` 的 S12“心愿烟火”

推荐目录：`experiences/surprises/wish-fireworks/`

推荐启动等级：A（直接双击 `index.html`，无安装、服务、权限或公网）

## 1. 结论

S12 可以做，而且适合成为一个有限、无失败的单人惊喜：收礼者连续点燃三束烟火，每次爆开都按准备者预先写好的顺序形成一个 9×9 点阵字；第三个字落定后，三个字组成完整短句，才展开私人结语与署名。

题名冻结为：

> 把愿望，放到夜空里

页面公开题名建议使用：

> 今晚，点三束光

固定说明：

> 按住蓄光，松开就会发射；也可以选好高度后直接点燃。每一束都会成功。

推荐默认三字为“我 / 爱 / 你”。首版保留“蓄力”的真实反馈：按住时长只量化为五档爆点高度，不改变字符、顺序、成败、公开时机或最终文案；一个原生五档选择器配合“直接点燃”提供无需计时的完整等价入口，默认中档。由此既没有假按钮，也不要求任何人精确掌握长按时间。

## 2. 与现有作品的边界

| 作品 | 已覆盖机制 | S12 必须保持的差异 |
| --- | --- | --- |
| `paper-plane-mail` | 选择角度和力度，弹道命中星门与信箱 | 不瞄准、无角度、碰撞、命中、失败或重试；高度只影响表现 |
| `soft-sumo` | 两人持续蓄力、冲刺、碰撞并争夺胜负 | 无对手、冲量、连续物理 tick、擂台或输赢 |
| `balloon-dare` | 隐藏爆点、逐次加压、可停手得分与打爆清零 | 无隐藏阈值、风险、分数、归零、止盈或“再冒险一次” |
| `future-cookie-notes` | 三枚固定内容任意顺序收集后主动合成 | S12 顺序固定；每次发射都在夜空逐字形成，不另做 assemble |
| S11“雪球摇一摇” | 四方向收齐后，一次 settling 整体形成 9×11 图案 | S12 无方向收集；三次独立发射各形成一个 9×9 字并留在公开字列 |
| 节奏类合作作品 | 早晚窗口、同步保持、序列复现或节拍 | S12 任何时候发射都有效，不判 early/late、连击或同步 |

烟花、粒子和夜空只是表现。只有“有限三束 → 蓄力只定高度 → 每束必成一个字 → 逐字遮蔽 → 三字后私信 Gate”同时成立，才算实现 S12。

## 3. Brainstorm：四种方向与取舍

### 3.1 方向 A：自由点击的无限烟花沙盒

优点是直观，缺点是没有完成条件、私人内容节奏或可验收终局，也容易演变成常驻 RAF、随机粒子和反复闪烁。

**结论：排除。** 首版固定三束，上一束落定前不能发下一束，不自动连放。

### 3.2 方向 B：力度决定能否命中目标高度

让用户在窄窗口松开，命中才出现字符，会产生一点技巧性；但这会复制纸飞机的力度/命中/重试结构，也让送给对象的惊喜可能卡在失败循环。

**结论：排除。** 每次合法发射都成功，蓄力不参与胜负或内容选择。

### 3.3 方向 C：按住只播放 CSS，引擎只接收 click

这是无障碍与状态最简单的版本：长按没有规则意义，原生 click 直接揭下一个字。它适合作为低风险降级，却削弱了原始创意中“蓄力放烟火”的触感。

**结论：不作为主线。** 在 `prefers-reduced-motion`、Pointer Events 不可用或直接点燃入口中采用用户已选的离散高度，默认中档。

### 3.4 方向 D：三束必成字，蓄力只量化爆点高度

按下建立一次短命输入会话，松开把时长映射为 `1..20` 整数蓄力，再归入五个高度档。当前字符与完整结语早已由配置和顺序锁定；无论高度如何，该束都会形成下一个字。

**结论：采用。** 它保留蓄力的真实可见差异，又把规则、隐私和结果从计时与动画中分离；同样五档可由无需计时的原生选择器完整访问。

## 4. 首版产品范围

首版只做：

1. 一个公开 intro 和主动开始 Gate；
2. 三个按固定顺序公开的 9×9 点阵字；
3. 一个可按住/松开的原生发射按钮；
4. 一个原生五档高度选择器和持久“直接点燃”按钮，默认中档且结果等价；
5. 五档离散爆点高度；
6. 每束一次有限的上升、爆开、成字与落定；
7. 已公开字列、`第 n / 3 束` 文本进度与重新开始；
8. 第三束后才创建的称呼、完整标题、私信与署名；
9. reduced-motion、forced-colors、无 Canvas 与无 Pointer Events 降级。

首版明确不做：

- 随机烟花、无限点击、自动连放、循环背景烟花或常驻 RAF；
- 力度命中、角度、风向、碰撞、失败、生命、分数、计时挑战或排行榜；
- 真实粒子物理、逐帧积分、WebGL、Worker 或第三方运行依赖；
- 字体轮廓采样、`fillText/getImageData`、任意文本自动转点阵；
- 爆炸声、音乐、振动、传感器、摄像头、麦克风、定位或权限请求；
- 全屏白闪、随机 flicker、饱和红爆闪、屏幕震动、快速多重子爆或亮暗交替；
- 编辑器、导出、截图、分享、账号、存储、分析或联网。

## 5. 三字内容模型

推荐配置形状：

```js
window.WISH_FIREWORKS_CONFIG = {
  recipient: "你",
  sender: "我",
  glyphs: [
    { id: "g0", label: "我", rows: [/* 9 行 × 9 个 . 或 # */] },
    { id: "g1", label: "爱", rows: [/* 9 行 × 9 个 . 或 # */] },
    { id: "g2", label: "你", rows: [/* 9 行 × 9 个 . 或 # */] }
  ],
  patternLabel: "烟火写出的三个字",
  finalTitle: "这三束光，都想送给你",
  finalNote: "愿望写完了，但我还想和你一起看很多很多次夜空。"
};
```

进入规格时冻结：

- 精确三个 glyph，ID 固定为 `g0/g1/g2`；
- 每个 `rows` 精确 9×9，只接受 ASCII `.` / `#`；
- 每字 active cell 建议限制在 `16..48`，避免难辨或粒子过密；
- `label` 精确一个合法 Unicode code point，拒绝控制字符、行分隔符和 lone surrogate；
- 三个 label 可以组成中文、首字母或符号短句，但逐项不得相同；
- 称呼、图案说明、最终标题与私信使用有界纯文本；任一字段非法时整份回默认；
- 从 row-major `#` 生成稳定 point ID 与整数目标坐标，不依赖字体、DPR 或 Canvas 像素。

点阵是视觉表达，label 是同一字的真实 DOM 文本。每束完成后必须同时留下对应 label；最终含义不能只存在于 Canvas。

## 6. 蓄力输入与直接入口

### 6.1 Pointer 按住

app 只保留当前短命会话：

```js
{
  phase: "holding" | "awaiting-click",
  pointerId,
  generation,
  startMs,
  rect,
  expectedIndex,
  expectedRevision,
  candidate
}
```

- 只接受 primary pointer 与鼠标主键；第二指和重复 pointerdown 忽略；
- pointerdown 后 capture 当前 pointer，显示稳定递增的蓄力条；
- pointerdown 快照当时 public view 的 index/revision；后续绝不读取新的 completedCount 来替换它们；
- pointerup 先验证匹配的 holding 会话，再检查释放点仍在冻结按钮矩形内；它把会话推进到 awaiting-click，并缓存本 generation 的 accepted/canceled activation candidate，不直接发射；
- 随后的原生 click 是唯一提交点：正常动效且 Pointer Events 可用时，`detail===1` 且 pointerId 与同 generation accepted candidate 匹配才消费其蓄力值；canceled、缺失、不匹配或 `detail>1` 的 pointer click 精确 no-op；
- 非 pointer 的 `detail===0` activation 永不消费旧 pointer candidate，而是先让旧 generation 失效，再快照当前选择高度并提交；
- `pointercancel/lostpointercapture` 只取消仍处于 holding 的会话；matching pointerup 后预期发生的隐式 lost capture 只清 capture，不得删除同 generation 的 awaiting-click candidate；
- awaiting-click candidate 只由对应 click、跨入口提交、`window.blur`、`visibilitychange(hidden)`、`pagehide` 或 generation 失效消费/清除；所有取消路径都幂等且不补发；
- holding 的活动 pointer 与计时资源必须早于显式 release capture 清掉；awaiting-click candidate 独立保留到规定的消费路径，迟到事件不得撞入下一束；
- `window.blur`、`visibilitychange(hidden)` 与 `pagehide` 都是完整取消点：先递增 generation，再释放 capture，清 holding/awaiting-click、蓄力 RAF、计时器、document fallback、held-key 与蓄力 UI；任何迟到事件均不得复用旧会话；
- 任一入口准备提交 LAUNCH 时，先快照自己的 index/revision/units，再让所有旧 charge session、candidate 与 generation 失效；直接入口不能与仍按住的旧会话并存；
- 不读取 pressure、tilt、twist、movement、raw/coalesced/predicted events 或设备 ID；
- 原始 pointerId、时间和轨迹不进入 reducer、public view、console、storage 或日志。

离散量化建议冻结为：

```text
elapsed = clamp(endMs - startMs, 0, 950)
chargeUnits = 1 + floor(elapsed / 50)       // 1..20
chargeBand = floor((chargeUnits - 1) / 4)  // 0..4
```

只把 `LAUNCH { index, expectedRevision, chargeUnits }` 送入逻辑层。五档选择器的 canonical units 固定为 `[4, 8, 12, 16, 20]`，默认 band 2 / units 12；直接入口读取当前选项。若时间戳非法、倒退或会话丢失，本次取消；用户仍可选择高度后直接点燃。

输入谓词不能混用：量化后的事件时间必须是非负 safe integer；冻结的 rect 与 `clientX/clientY` 只要求 `Number.isFinite`、绝对值不超过 `Number.MAX_SAFE_INTEGER`，允许小数且不截断，并验证 `left <= right`、`top <= bottom`。200%/400% zoom 必须用 fractional rect/client fixture 覆盖。

### 6.2 键盘、语音与单击

- 五档使用持久原生 `<select>`；“直接点燃”是持久原生 `<button type="button">`，其 click 读取选项并一次只派一个 LAUNCH；选项被篡改或缺失时 fail closed 到 band 2 / units 12；
- 主按钮分流优先级固定：先检查按 `mouse/touch/pen/other` 分桶、最多四项的 `suppressedMainPointerClicks`；同 pointerType 的 `detail===1` 若 pointerId 精确匹配旧墓碑则删墓碑并 no-op，若改为精确匹配当前 normal/reduced candidate 则保留旧墓碑并继续 candidate 提交，两者都不匹配才保留墓碑并 no-op；元数据缺失且仍有任一墓碑也 fail closed；`detail===0` 不受抑制。没有拦截后，reduced-motion 且 Pointer Events 可用时只接受 matching reduced candidate，无 Pointer Events 时 detail 0/1 使用 select；正常动效时 detail=1 只接受 matching hold candidate；所有路径的 `detail>1` no-op；
- Pointer Events 不可用时不绑定 mouse/touch 双套事件；
- 两个按钮都忽略 pointer `click.detail>1`；Enter/Space 只让非 repeat keydown 走原生激活，`keydown.repeat` 必须 preventDefault，held-key 集合在 keyup/blur 清除；
- `prefers-reduced-motion` 生效时不建立计时会话、不播放蓄力条；两个按钮都用当前所选高度发射并立即完成同一 shot；
- 运行中切入 reduced-motion：holding/awaiting-click 先把当前 pointerId 写入对应 pointerType 的 `suppressedMainPointerClicks` 桶，再递增 generation、取消 capture/计时/监听并清 candidate；旧 pointer 随后补发的 `detail===1` click 只消费同身份墓碑。新 pointerdown 不删除任何墓碑，而另存当前模式的短命 candidate：不同 pointerType 或同类型新 pointerId 都可按 matching candidate 提交，同时保留未结旧墓碑。`detail===0` 的新 AT/键盘激活永不被墓碑阻断；matching pointercancel 原子清普通/reduced candidate 与同身份墓碑，因为该流不会再合成 click。bursting 保持原 token 并由 microtask 完成；切回 no-preference 不恢复旧会话或动画；
- bursting 时 reducer 先行拒绝重复动作；两个按钮保留相同 DOM 节点和 tabindex，只设 `aria-disabled=true` 并由事件 guard 阻止操作，不使用 native `disabled`、不替换节点；
- select 在 bursting 保持原生 enabled，可预选下一束高度；当前 shot 已锁定，change 不得回写它；
- 按住按钮的提示必须明确“无需蓄满，每一束都会成功”，不能暗示某个秘密时间窗。

W3C WCAG 2.1.1 明确要求键盘功能不能依赖单次击键的特定时长；2.5.2 鼓励在 up-event/click 提交并允许在提交前取消。因此五档选择器、click 唯一提交、直接入口和按钮外松开取消都属于首版验收条件，而不是可选增强。

## 7. 权威状态与动作草案

推荐阶段：

```text
intro → ready ↔ bursting → complete
```

最小 state：

```js
{
  version,
  phase,
  content,
  completedCount,
  currentShot,
  revision
}
```

- `content`：START 时清洗、复制并冻结的三字配置；
- `completedCount`：精确 `0..3`；
- `currentShot`：仅 bursting 为 `{ index, chargeUnits, burstToken }`；
- `revision`：安全整数且跨 restart/token 单调。

动作只需四类：

- `START { content }`：仅 intro 接受，进入 ready；
- `LAUNCH { index, expectedRevision, chargeUnits }`：仅 ready 接受，index 必须等于 completedCount 且 expectedRevision 必须等于当前 revision；立即锁定本束索引、档位与 token，进入 bursting；
- `COMPLETE_BURST { burstToken }`：仅 token 精确匹配当前 shot 时接受；完成数加一，未满回 ready，第三束进入 complete；
- `RESTART`：仅 complete 接受，回 intro；同一原生 click 可随后重新 START，但 revision/token 不回退。

按住过程、event timestamp、pointerId、动画 tick、粒子坐标和 Canvas 尺寸都不进入 state。合法 state 上的错 index、错 token、重复完成和阶段错误动作返回原引用；非法 state fail closed 为全新安全 intro。

## 8. 固定整数表现计划

表现可以使用一个 `1000×1000` 逻辑世界，规格阶段建议验证以下基线：

```text
rocketStart = (500, 900)
apexYByBand = [430, 390, 350, 310, 270]
ASCENT_TICKS = 48
FORMATION_TICKS = 24
HOLD_TICKS = 36
FADE_TICKS = 12
```

点阵 target 相对爆点使用整数：

```text
dx = -240 + 60 × column
dy = -240 + 60 × row
```

每个表现帧从 `shot + presentationTick` 直接计算位置，不从上一帧积分，不保存速度，也不以“粒子是否到位”决定业务完成。rAF timestamp 只映射到展示 tick；正常 animation end、timeout、hidden、pagehide、途中切 reduced-motion 和 Canvas 异常都捕获启动时的 burstToken，并统一派一次 `COMPLETE_BURST`。

建议冻结的蓄力 fixture：

| elapsed ms | units | band | apexY |
| ---: | ---: | ---: | ---: |
| 0 | 1 | 0 | 430 |
| 49 | 1 | 0 | 430 |
| 50 | 2 | 0 | 430 |
| 199 | 4 | 0 | 430 |
| 200 | 5 | 1 | 390 |
| 949 | 19 | 4 | 270 |
| 950 / 5000 | 20 | 4 | 270 |
| 直接点燃选 band 0..4 | 4 / 8 / 12 / 16 / 20 | 0 / 1 / 2 / 3 / 4 | 430 / 390 / 350 / 310 / 270 |

最终稳定的三字列使用固定槽位，不因爆点高低而错位；高度只属于本束在夜空中的形成过程。

## 9. Public view 与秘密 Gate

页面只能消费 public view。建议返回：

```js
{
  phase,
  completedCount,
  totalCount: 3,
  revealedGlyphs,
  currentTargets,
  currentChargeBand,
  burstToken,
  canLaunch,
  recipient,
  sender,
  patternLabel,
  finalTitle,
  finalNote,
  revision
}
```

阶段遮蔽：

- intro/ready：`revealedGlyphs` 只含已完成前缀；未来 label/rows/targets 全不可见；
- bursting：可公开当前 shot 的 target，让爆炸形成当前字；仍不公开未来字、最终标题、私信或署名；
- 每次 COMPLETE 后，才把当前 glyph 加入真实 DOM 字列；
- complete：三个字都公开后，才公开 recipient、sender、patternLabel、finalTitle 和 finalNote。

正常页面在允许阶段前不得把 future glyph 或最终文本写入 hidden/template、ARIA、class/id/data/title/style、CSS `content`、Canvas `fillText`、离屏缓存、console、URL、storage、clipboard 或网络。`config.js` 仍是磁盘明文，不是密码学加密；承诺只限正常页面分阶段呈现、不上传和不额外持久化。

隐私测试必须使用互不包含且不出现在公开 UI 的 sentinel，逐束断言仅已公开前缀可见，不能拿默认“你/我”做脆弱的全局零次测试。

## 10. 动画、闪烁与生命周期

- 同时最多一束；bursting 时不接受第二次发射；
- 一束只做一次上升、一次有边界的径向展开、一次单调衰减和一次成字；
- 不使用 flicker/twinkle/strobe、alternate、steps 闪烁、背景亮暗反转或全屏覆层闪白；
- 不使用饱和红爆闪；背景亮度保持稳定，粒子只在局部区域单调淡出；
- 动画建议 `800..1200ms`，下一束必须再次主动操作，永不自动连发；
- 一个 token 化完成器统一拥有 RAF/WAAPI、timeout、媒体查询与生命周期监听；先到路径清理其余资源，迟到路径由 token/phase 变成 no-op；
- reduced-motion 下不播放蓄力条；LAUNCH 使用选择器中的离散高度锁定同一 shot，随后用 microtask 直接完成当前字，不播放上升、扩张、位移、缩放、拖尾、淡入淡出或闪光；物理激活去重仍先于该 microtask，不能靠 bursting 阶段挡双击；
- Canvas/context/尺寸失败时用 CSS 9×9 grid 形成当前字并完成同一 token，不跳过字符，也不一次解锁全部内容。

WCAG 2.3.1 要求任何一秒内不得出现超过三次危险 general/red flash，除非低于相应阈值。本作采用更强、也更容易验收的规则：不制造重复闪烁，不依赖面积或亮度阈值豁免，也不在未经专业分析时声称“通过闪烁阈值测试”。WCAG 2.3.3 同时要求交互触发的非必要动画可被禁用，本作直接尊重系统降动效偏好。

## 11. 焦点、语义与 forced-colors

- 高度是原生 select，两个发射入口都是原生 button；不伪造 slider、meter 或 launch role；
- 视觉蓄力条不连续写 live，稳定文本只说明“无需蓄满”；
- 一个预先存在的 polite status 只在前两束落定时各播一次：`第 n 束留下：{label}`；升空进度使用普通可见文本，不逐帧播报高度或粒子；
- 第三束完成只走结果焦点路径：创建完整三字与结语后，把焦点移到 `tabindex=-1` 且由 `aria-describedby` 关联完整三字的结果标题，不再连续覆写 live；
- 页面 hidden 或 `window.blur` 时完成只记录 pendingResultFocus；统一 `flushPendingResultFocus()` 由 `window.focus` 与 `visibilitychange(visible)` 调用，且仅在文档 visible、窗口有焦点、activeElement 仍是 body 或原发射控件时聚焦结果，不能偷走用户已经移动的焦点；控件自身 blur 不得被误当作 window blur；
- 束一、二完成后保留焦点在原按钮；bursting 期间按钮节点不替换、不 native-disable，select 仍可操作；验收 direct/hold 两条路径的 activeElement、下一次 Tab 和重复 Enter no-op；
- 已公开字使用真实 DOM 列表/字符节点；Canvas 和装饰粒子 `aria-hidden=true`；
- start、按住点燃、直接点燃与 restart 等所有原生按钮在六档视口均至少 56×56 CSS px；触控环境中的原生 select 可操作高度也至少 56px。使用明显 `:focus-visible` outline，状态不只靠颜色、位置或动画；
- forced-colors 隐藏 Canvas 装饰并启用 CSS 9×9 grid；移除渐变、filter、mix-blend-mode、box-shadow 和背景图，使用系统色、真实 border/outline、字、束数和“已出现”文本，不使用 `forced-color-adjust:none` 强保色；
- 无 JavaScript 时只显示静态说明，不伪造三字或私信已经解锁。

## 12. 响应式 Gate

至少验证：

| 视口 | 重点 |
| --- | --- |
| 1504×1046 | 公开题名、夜空、三字列、进度、五档选择、两按钮与隐私说明同屏；无横纵滚 |
| 1280×800 | 夜空、三字列和发射入口同屏；无横向滚 |
| 768×1024 | 单列居中，三字与按钮完整可见 |
| 390×844 | 夜空约 280–320px；三字单行；所有按钮与触控 select 均 ≥56px |
| 320×568 | 夜空约 220–240px；允许纵滚，零横溢，所有按钮与触控 select 均 ≥56px 且不被 safe-area 遮挡 |
| 844×390 | 夜空约 230px 左置，进度与控制右置，不锁方向；所有按钮与触控 select 均 ≥56px |

另验 200% 文本、约 320 CSS px 的 400% zoom、最大结语换行、safe-area、无 Canvas、无 Pointer Events、reduced-motion、forced-colors、零公网请求和零 console error。

## 13. A 级本地边界

- 经典脚本按相对路径加载，不用 ES Module、dynamic import、fetch、XHR、WebSocket、CDN 或远程字体；
- 不新增根依赖，不打包下列参考库；DOM、Canvas/CSS fallback 和纯逻辑均自行实现；
- 双击 `index.html` 与根门户进入都能完成三束；
- 不使用账号、服务端、数据库、Service Worker、storage、cookie、分析或权限；
- 图片、音频和网络全部缺席也不影响规则与最终文本；
- 所有配置字符串只经 `textContent` 写入，不解释 HTML。

## 14. 固定来源与借鉴声明

以下项目与标准只用于研究抽象机制和约束。首版不复制其源码、算法表达、API、默认参数、测试、DOM、CSS、配色、字体、图片、音频、品牌或演示资产，也不把它们加入运行依赖。若未来实际复用代码或素材，必须重新审计并随分发保留许可证与版权文本。

### 14.1 Fireworks.js

- 固定版本：[commit `8f01eeaef422c1f0880e94ce99040025a1b74d7e`](https://github.com/crashmax-dev/fireworks-js/commit/8f01eeaef422c1f0880e94ce99040025a1b74d7e)
- 许可证：[MIT](https://github.com/crashmax-dev/fireworks-js/blob/8f01eeaef422c1f0880e94ce99040025a1b74d7e/LICENSE)
- 版权：`Copyright (c) 2021-2023 Vitalij Ryndin`
- 仅借鉴：把上升轨迹、爆炸粒子、控制器生命周期和清理视为相互分离的表现职责。
- 明确排除：其[实现](https://github.com/crashmax-dev/fireworks-js/blob/8f01eeaef422c1f0880e94ce99040025a1b74d7e/packages/fireworks-js/src/fireworks.ts)的源码/API、随机范围、gravity/friction 公式、particle/flickering/sound、默认配置、框架封装和素材；尤其不采用 flickering。

### 14.2 W3C Pointer Events

- 固定版本：[commit `238e8273305bb2e3c76f9f0bb289fb127c3dff74`](https://github.com/w3c/pointerevents/commit/238e8273305bb2e3c76f9f0bb289fb127c3dff74)
- 许可证：[W3C Software and Document License](https://github.com/w3c/pointerevents/blob/238e8273305bb2e3c76f9f0bb289fb127c3dff74/LICENSE.md)
- 授权主体：仓库贡献者；规范由 Pointer Events Working Group 维护。
- 设计依据：`pointerdown/pointerup/pointercancel`、pointer capture 与 lost capture 生命周期。
- 不复制：规范措辞、示例代码、规范算法或图片；不使用 pressure、tilt、persistentDeviceId、raw/coalesced/predicted events。

### 14.3 canvas-text-particle

- 固定版本：[commit `9ee144a548aad85275318b30891c71dcf6e10f7b`](https://github.com/dango0812/canvas-text-particle/commit/9ee144a548aad85275318b30891c71dcf6e10f7b)
- 许可证：[ISC](https://github.com/dango0812/canvas-text-particle/blob/9ee144a548aad85275318b30891c71dcf6e10f7b/LICENSE)
- 版权：`Copyright (c) 2026, dango0812`
- 仅借鉴：粒子先有稳定 ID，再朝一组静态目标点归位的职责分层。
- 明确偏离：本作从固定 9×9 ASCII 字符网格生成目标，不使用离屏文字 Canvas、`fillText/getImageData`、字体轮廓、alpha 阈值、采样间隔、排斥/回归公式、默认字体、API 或演示。

### 14.4 canvas-confetti

- 固定版本：[commit `20eebad51dde793070c373d594099a7ed8d96e22`](https://github.com/catdad/canvas-confetti/commit/20eebad51dde793070c373d594099a7ed8d96e22)
- 许可证：[ISC](https://github.com/catdad/canvas-confetti/blob/20eebad51dde793070c373d594099a7ed8d96e22/LICENSE)
- 版权：`Copyright (c) 2020, Kiril Vatev`
- 仅借鉴：降动效时跳过混乱粒子但仍完成同一逻辑结果，以及统一 reset/clear 表现资源的原则。
- 不复制：Promise/Worker 协调、粒子物理、位图缓存、默认形状/颜色/参数、Canvas 源码、emoji/path 示例或素材。

### 14.5 W3C WCAG

- 固定版本：[commit `07123b871c103268375880980fd715b2b26b2ff0`](https://github.com/w3c/wcag/commit/07123b871c103268375880980fd715b2b26b2ff0)
- 许可证：[W3C Document License](https://github.com/w3c/wcag/blob/07123b871c103268375880980fd715b2b26b2ff0/LICENSE.md)
- 授权主体：仓库贡献者。
- 只引用固定规范结论：[SC 2.1.1 Keyboard](https://github.com/w3c/wcag/blob/07123b871c103268375880980fd715b2b26b2ff0/guidelines/sc/20/keyboard.html)、[SC 2.3.1 Three Flashes or Below Threshold](https://github.com/w3c/wcag/blob/07123b871c103268375880980fd715b2b26b2ff0/guidelines/sc/20/three-flashes-or-below-threshold.html)、[SC 2.3.3 Animation from Interactions](https://github.com/w3c/wcag/blob/07123b871c103268375880980fd715b2b26b2ff0/guidelines/sc/21/animation-from-interactions.html) 与 [SC 2.5.2 Pointer Cancellation](https://github.com/w3c/wcag/blob/07123b871c103268375880980fd715b2b26b2ff0/guidelines/sc/21/pointer-cancellation.html)；公开 Understanding 页面只作为持续更新的解释资料。
- W3C 文档许可证不是 MIT 式源码授权；本作不复制规范正文、测试工具、示例或图片，也不把设计说明冒充合规认证。

## 15. 排除来源

- [kennethkufluk/js-fireworks](https://github.com/kennethkufluk/js-fireworks) 与 [scottschiller/fireworks.js](https://github.com/scottschiller/fireworks.js)：仓库未检测到许可证，完全排除代码与素材复制；
- CodePen/Gist 烟花与文字粒子示例：常缺仓库级许可证、固定版本和完整作者信息，只能作发现线索；
- 来源不明的烟花 GIF、视频、背景图、Google Fonts、音效、PNG/SVG 与品牌节庆角色；
- 即使许可证宽松，只要实现依赖全屏频闪、连续亮暗反转、饱和红爆闪或无法关闭的常驻烟花，也不进入参考或复用范围；
- 商业文字粒子产品、无法确认素材再授权链的 demo 和只有构建产物、没有对应源码/许可证的下载包。

## 16. Go / No-Go 与进入规格的 Gate

结论：**Go，按 A 级自主实现。** 不需要新增依赖，也不需要复制参考项目代码。

进入规格前必须冻结：

1. 默认“我/爱/你”三份 9×9 点阵、active count 与 canonical hash；
2. 配置文本长度、控制字符与 hostile input 的精确合同；
3. elapsed→units→band、整数坐标、rounding 和完整 fixture；
4. START/LAUNCH/COMPLETE_BURST/RESTART 的 exact schema、revision headroom 与非法输入语义；
5. public view 每阶段的字段遮蔽和三组独立隐私 sentinel；
6. pointer 外松开、cancel/lost capture、candidate/click 单提交、detail 分流、跨入口旧 generation、动态 reduced 的分桶旧 click 墓碑、touch→mouse 与 mouse→touch 迟到序列、五档 direct、Pointer Events 缺失、双击与键盘 repeat；
7. 动画 token、timeout、blur/hidden/pagehide 完整取消、holding/awaiting/bursting 途中切 reduced-motion、Canvas 失败与延迟结果焦点的统一完成路径；
8. 小数 rect/client 坐标、闪烁审计、forced-colors、六档视口全控件 56px、缩放、零网络和零 console error。

生产视觉仍须等待统一 ImageGen 概念被用户接受；该 Gate 不阻塞本文件对规则、隐私、许可证与验收边界的冻结。
