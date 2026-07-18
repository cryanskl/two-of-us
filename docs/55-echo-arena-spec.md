# A 级「回声擂台」规格

## 1. 定位与 brainstorm 结论

- 创意池：V17「音符记忆擂台」；
- 产品名：回声擂台；
- ID：`echo-arena`；
- 主分类：双人对抗；
- 启动等级：A；
- 设备：同一台电脑或手机，轮流操作；
- 公网依赖：无；
- 账号、服务、长期存储：无；
- 首版核心：当前玩家完整复现共享音符序列，再亲手追加一音；第一位按错的人输掉本局，先赢两局者赢下比赛。

首版不加入倒计时、联网房间、排行榜、AI、商业音乐、谱面编辑器或录音。音频由 Web Audio 振荡器现场合成；即使浏览器静音或不支持 AudioContext，颜色、编号、进度和按压动画仍完整表达规则。

### 1.1 为什么现在做

创意池“推荐先做的 12 个”中，其余 11 个已经落地；V17 是最后一个未实现项。当前对抗作品覆盖反应、连续输入、止盈、算式和空间封路，但还没有音频反馈与顺序记忆对抗。

它与合作作品“节拍接力”只共享“序列增长”抽象，不共享胜负语义：

- 节拍接力的错误消耗共同资源，双方目标是一起到十拍；
- 回声擂台的错误必须归责给当前玩家，并立即把本局交给对方；
- 节拍接力只有两类拍点和轮流接棒；回声擂台有四个固定音高、完整复现阶段、追加阶段和三局两胜；
- 本作每局轮换先手，避免把多一次追加机会固定给同一人。

## 2. 规则来源与原创边界

[Hasbro 官方 Simon 说明](https://instructions.hasbro.com/en-us/instruction/simon-game)用于核验“观察灯光/声音序列并按原顺序复现，序列逐渐变长”这一通用记忆机制。本作不使用 Simon 名称、商标、圆形四色象限外观、产品文案、声音、素材或实现；双人交替追加、三局两胜、交接 Gate、视觉方向和状态机均为原创设计。

[MDN Web Audio best practices](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Best_practices)用于确认 AudioContext 应在用户手势内创建或恢复，并提供声音开关。音频是可选反馈层，不是规则 Gate。

为核验开源生态，只检查下列仓库的元数据、许可证和固定 commit，没有读取、复制、改写或运行其源码与素材：

| 项目 | 固定 commit | 许可证 | 本作边界 |
| --- | --- | --- | --- |
| [alguerocode/simon-game](https://github.com/alguerocode/simon-game/tree/fb006ba2e99abf26157957a1e0081ee5f36ae606) | `fb006ba2e99abf26157957a1e0081ee5f36ae606` | [Apache-2.0](https://github.com/alguerocode/simon-game/blob/fb006ba2e99abf26157957a1e0081ee5f36ae606/LICENSE) | 仅证明浏览器序列记忆游戏存在许可明确实现；零代码、零素材借用 |
| [arjuncvinod/Simon-Game](https://github.com/arjuncvinod/Simon-Game/tree/a7cf23b1f03b544d5a13b574aab0ee0c2f70aba1) | `a7cf23b1f03b544d5a13b574aab0ee0c2f70aba1` | [MIT](https://github.com/arjuncvinod/Simon-Game/blob/a7cf23b1f03b544d5a13b574aab0ee0c2f70aba1/LICENSE) | 只核验仓库级许可证；零代码、零素材借用 |

JavaScript reducer、共享 tone player、四音配置、热座交接、视觉布局、中文文案和测试都在本仓库原创。以后若实际借用开源实现，必须更新作品 README 和 `assets/ATTRIBUTION.md` 的文件级边界。

## 3. 一场比赛

比赛采用三局两胜：

1. 第一局由本地配置的 `firstPlayer` 开始，后续各局严格交替先手；
2. 每局以一个开场音开始；默认从四音中安全随机选择，配置可以选择固定开场音；
3. 当前玩家点击“开始听”，页面按顺序播放并点亮全部已有音符；
4. 播放完成后，当前玩家必须从第一音开始完整复现；
5. 任一位置按错，当前玩家立即输掉本局，对方加一分；
6. 全部复现正确后进入“添一音”，当前玩家任选一个音追加；
7. 追加后行动权交给对方，对方确认准备好再开始下一轮播放；
8. 任一方先得到 2 分，比赛完成；否则进入下一局；
9. 若序列被双方推到 16 音仍无人出错，本局以“共同封顶”平局结束，不计分并轮换先手。

没有倒计时，也不允许在播放阶段偷按。玩家的记忆负担只由序列长度增加，不由输入速度或设备性能决定。

## 4. 音符与输入

固定四音：

| ID | 标签 | 键盘 | 频率 | 波形 | 颜色 |
| --- | --- | --- | --- | --- | --- |
| `do` | DO | `1` | 261.63 Hz | sine | 珊瑚红 `#d96852` |
| `mi` | MI | `2` | 329.63 Hz | triangle | 赭黄 `#d3a63c` |
| `sol` | SOL | `3` | 392.00 Hz | sine | 钴蓝 `#4e78a7` |
| `la` | LA | `4` | 440.00 Hz | triangle | 氧化青 `#5f8e83` |

鼠标和触屏点击四个音键；键盘 `1/2/3/4` 调用同一 `pressNote(state, noteId)`。按钮有编号、唱名、颜色和按压状态，不只靠音高或颜色区分。

播放阶段、intro、handoff、round-over 和 match-over 禁用音键。repeat 阶段显示“第几 / 总数”，但不显示答案；append 阶段明确显示“旧旋律正确，现在添一音”。

## 5. 权威状态机

```js
{
  phase: "intro" | "handoff" | "playback" | "repeat" |
         "append" | "round-over" | "match-over",
  currentPlayer: "a" | "b",
  starter: "a" | "b",
  sequence: ["do", "mi", "sol"],
  inputIndex: 0,
  gameNumber: 1,
  turnNumber: 1,
  scores: { a: 0, b: 0 },
  winner: null | "a" | "b",
  loser: null | "a" | "b",
  endReason: null | "mistake" | "cap",
  lastInput: null | { player, noteId, expected, correct },
  playbackToken: 0,
  revision: 0
}
```

所有公开状态和嵌套对象递归冻结；调用方数组、配置上下文和坐标不得与状态共享引用。

### 5.1 纯逻辑 API

- `createInitialState(config?)`：整份校验名字与首发，创建 intro；
- `startMatch(state, openingNote)`：仅 intro 生效，建立一音序列并进入 handoff；
- `beginPlayback(state)`：仅 handoff 生效，进入 playback 并生成单调 token；
- `finishPlayback(state, token)`：只有当前 token 可进入 repeat，旧计时器无效；
- `pressNote(state, noteId)`：repeat 校验当前位置；append 追加新音并换手；
- `startNextGame(state, openingNote)`：仅非终局 round-over 生效，保留比分、轮换先手并重置序列；
- `restartMatch(state)`：从 round-over 或 match-over 回 intro，比分和序列归零；
- `isGameState(value)`：畸形公开状态不进入规则分支。

合法状态上的未知动作、错误 token、播放阶段输入和非法 note 均返回同一引用；畸形状态通过公开动作安全回初始状态，不抛异常。

### 5.2 阶段转换

```text
intro
  └─ startMatch(openingNote) → handoff
handoff
  └─ beginPlayback → playback(token)
playback
  └─ finishPlayback(token) → repeat(inputIndex=0)
repeat
  ├─ 正确且未到末尾 → repeat(inputIndex+1)
  ├─ 完整复现 → append
  └─ 错误 → round-over / match-over（对方得分）
append
  ├─ 追加后长度 < 16 → handoff（换人）
  └─ 追加后长度 = 16 → round-over（共同封顶，不计分）
round-over
  ├─ startNextGame → handoff（保留比分、轮换首发）
  └─ restartMatch → intro
match-over
  └─ restartMatch → intro
```

## 6. 播放生命周期

播放序列属于 UI 副作用，但播放阶段和 token 属于 reducer：

1. 用户点击“开始听”时先调用 `beginPlayback`，拿到新的 `playbackToken`；
2. UI 使用一组短 timer 依次点亮音键并调用共享 tone player；
3. 每个 timer 执行前比较 token，旧播放、重开或下一局的回调直接退出；
4. 最后一个 timer 只用当前 token 调用 `finishPlayback`；
5. 页面隐藏、重开和卸载都会清 timer、清视觉按压并关闭 AudioContext。

声音开关只改变声音输出，不改变视觉播放、token、阶段或判分。AudioContext 不可用、创建失败或 resume 被拒绝时，页面继续以视觉脉冲运行，并显示“当前以静音视觉模式播放”。

## 7. 共享音频依赖

这是仓库第三个使用短振荡器音效的轻量作品，因此先抽出 `shared/audio/tone-player.js`：

- 经典脚本全局工厂，不引入 npm 依赖、模块加载或远程资源；
- 只负责 AudioContext 创建/恢复、振荡器、包络、节点清理和关闭；
- 调用方仍拥有音符表、声音开关、播放 timer、视觉状态和玩法阶段；
- 无效频率、波形、时长或 gain 安全返回 `false`；
- rhythm-relay、telegraph-codebook 和 echo-arena 从同一相对本地脚本加载；
- 三个作品继续真实验证 `file://` 直开。

共享层不包含具体节拍、音高、文案或玩法状态；它是可复用浏览器能力，不是“万能音频引擎”。

## 8. 本地配置与用户可贡献点

`config.js` 提供：

```js
{
  aName: "A 席",
  bName: "B 席",
  firstPlayer: "a",
  chooseOpeningNote({ gameNumber, starter, noteIds }) {
    return null;
  }
}
```

`chooseOpeningNote` 是准备者可以亲手写的 5–10 行策略：

- 返回 `null`：使用安全随机开场音；
- 返回四个 note ID 之一：固定或按局数组成两人的私密开场动机；
- 抛错、修改冻结上下文或返回其他值：安全回退为随机/循环选择。

名字和函数只在当前本机执行，不上传、不保存。

## 9. 视觉规格

方向：70 年代模拟排练台（late-1970s analog rehearsal desk），明确避开圆形四色象限产品外观。

### 9.1 设计令牌

- 深胡桃木：`#231914`；
- 烟熏黑：`#141615`；
- 羊皮纸：`#eadbb8`；
- 黄铜：`#b38b52`；
- A 席：珊瑚红 `#d96852`；
- B 席：钴蓝 `#4e78a7`；
- 音键：珊瑚、赭黄、钴蓝、氧化青；
- 边角：直角或轻微削角，硬边内阴影，不使用霓虹、玻璃拟态或 CSS 渐变。

标题使用本机中文 serif，HUD、数字、键帽和唱名使用 monospace。黄铜细线、螺丝点、冲孔轨道和机械开关构成重复组件语言。

### 9.2 桌面 1504×1046

- 顶栏：返回、居中标题、声音开关；
- 左侧约 28%：局数/当前席、规则、A/B 比分；
- 右侧约 72%：16 孔序列轨、当前动作铭牌、四个纵向音键；
- 页脚显示本地隐私承诺；
- playing 首屏必须完整看见音键、比分、状态、声音和页脚，无横向或纵向滚动。

### 9.3 移动 390px

顺序为导航、标题/短句、比分、当前动作/序列轨、四个并排纵向音键、声音、页脚。四键保持同一行，每键至少 64px 宽；允许短距离自然滚动，不横向溢出。

### 9.4 概念与运行资产

- [1504×1046 桌面概念](assets/echo-arena/concept-desktop.png)；
- [853×1844 移动概念](assets/echo-arena/concept-mobile.png)；
- `assets/rehearsal-desk.png`：1536×1024 无字胡桃木排练桌，只承载环境材质；
- 机箱、螺丝、序列孔、音键、文字、比分、焦点和状态全部由 HTML/CSS 生成。

## 10. 可访问性与响应式 Gate

- 四个音键是原生 button，名称同时包含数字、唱名和快捷键；
- 播放进度使用位置编号、实心/空心/当前环，不只依赖颜色；
- 正确输入、追加、错误和终局都有可见文案与 live region；
- 播放期间使用原生 disabled，避免误按；
- 声音开关使用 `role="switch"` 和真实 `aria-checked`；
- 焦点在 intro、handoff、repeat、append、round-over 和 match-over 都有明确落点；
- `prefers-reduced-motion` 把音键位移和序列脉冲压到 0.001s，规则不等待动画；
- 320×760 无横向溢出，四音键每个至少 56px 宽，所有结果动作可滚动到达。

## 11. 自动测试 Gate

至少覆盖：

1. 固定四音、频率、快捷键和 16 音上限；
2. 配置整份回退、名字去空白与深冻结；
3. intro → handoff → playback → repeat 的唯一入口；
4. playback token 单调且旧 token 不能完成新播放；
5. 正确前缀推进、完整复现进入 append；
6. repeat 错误只给对方加一分并记录 expected/actual；
7. append 追加、换人、回合递增和序列所有权；
8. 16 音共同封顶不加分；
9. 三局两胜、平局后下一局、轮换首发、restart；
10. 非法阶段/note 保持原引用，畸形状态安全回退；
11. shared tone player 的能力缺失、resume、参数规范、包络、ended 清理与 close；
12. catalog A 级、相对共享脚本、相对背景、无网络/存储/远程音频。

整仓继续要求 `npm test`、`npm run verify` 与 `git diff --check` 通过。

## 12. 浏览器验收路径

1. 从门户进入 intro，打开/关闭声音并开始比赛；
2. handoff 点击“开始听”，确认音键按序点亮且播放时不能输入；
3. 用鼠标、键盘和触屏分别完成 repeat 与 append；
4. 制造一次错误，确认对方得分、错误位置和焦点；
5. 下一局确认比分保留、序列重置、首发交替；
6. 再制造一次错误，让一方 2 分，确认 match-over；
7. 重开确认比分、序列、token 和局数归零；
8. 关闭声音走完整局，确认视觉模式不影响规则；
9. 1504×1046、390×844、320×760 检查溢出、触控尺寸和页脚；
10. reduced motion 检查动画压缩；
11. 真实 Chrome `file://` 验证作品脚本、共享 tone player 与背景图全部相对加载；
12. 概念与实装截图同屏比较，记录不少于五项忠实度账本。
