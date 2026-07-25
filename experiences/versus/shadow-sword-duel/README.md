# 影子剑术

两个人轮流接过同一台设备，各自暗选“攻、防、闪、蓄”。两份招式都封好后一起
揭晓；体力、气和先机会跨回合保留，最多九回合一定结束。

## 打开方式

直接双击本目录的 `index.html`。页面以经典相对脚本读取 `config.js`、`logic.js`
和 `app.js`，不需要安装、构建、登录或启动服务器，也不会访问公网。

如需开发调试，可以从仓库根目录启动任意静态文件服务器，再访问：

```text
/experiences/versus/shadow-sword-duel/index.html
```

localhost 只用于调试，不是正常游玩的前置条件。

## 规则

- 双方初始各有 3 点体力、1 点气，气最多 2 点；
- “攻”花 1 点气；普通攻会被防住，带先机的攻可以破防；
- “闪”能避开本回合任意攻击；
- “防”只有挡住普通攻时才取得先机，空防没有收益；
- “蓄”只有本回合未受伤时才回复 1 点气；
- 本人出攻时会消耗已有先机，无论攻击命中、被防或被闪；
- 任一方体力归零后结束；双方同回合归零是平局；
- 第九回合仍未分胜负，依次比较体力、气，仍相同即平局。

两份动作虽然在同一台设备上依次录入，但揭晓时从同一个回合开始快照联合结算，
因此允许双方同时受伤或同时倒下。

## 怎么玩

1. 第一位选择招式；可以改选，按“封好这一招”后才算提交；
2. 把设备交给第二位，页面不会显示第一位的选择；
3. 第二位同样选招并提交；
4. 两位一起按“一起揭晓”，查看动作、伤害、气与先机的因果列表；
5. 继续下一回合，直到提前击倒或第九回合终局；
6. 终局后按“再来一场”，资源、秘密和历史会全部清空。

选择阶段按“先遮住页面”，或切换页面、隐藏窗口、离开当前窗口，会清除尚未确认的
草稿并进入遮屏。恢复页面不会自动选招、封招或揭晓。

## 自定义

编辑 `config.js` 中的 `SHADOW_SWORD_CONFIG`：

```js
window.SHADOW_SWORD_CONFIG = {
  playerNames: ["左席", "右席"],
  finalNote: "看懂对方之前，先藏好自己。"
};
```

- 两个名字各 1–12 个 Unicode code point，trim 后不能相同；
- `finalNote` 为 1–80 个 Unicode code point；
- 非法名字整对回退，非法结语单独回退；
- 这里只接受纯文本，不接受 HTML、URL、函数、规则或样式。

## 本地与隐私边界

- 未揭晓动作只留在当前页面的 JavaScript 内存，不写 URL、Cookie 或 storage；
- handoff、第二位 choosing 和 ready 阶段都不会把已封动作放进 DOM；
- 刷新或关闭页面会清空整场进度；
- 页面不读取文件、剪贴板、摄像头、麦克风、位置或通知权限；
- 页面不使用网络、随机数、真实时间、音频、远程字体或第三方运行包；
- 同机热座只防正常交接时偷看屏幕，不抵御参与者主动检查开发者工具、断点或内存；
- 若需要抵御恶意参与者，应另做双设备可信裁判版本，不能把本页描述成密码学保密。

没有 JavaScript 时，页面会明确显示“此体验需要浏览器启用 JavaScript”，不会伪装
成可玩状态。

## 测试

从仓库根目录执行：

```bash
node --check experiences/versus/shadow-sword-duel/config.js
node --check experiences/versus/shadow-sword-duel/logic.js
node --check experiences/versus/shadow-sword-duel/app.js
node --test \
  experiences/versus/shadow-sword-duel/logic.test.js \
  experiences/versus/shadow-sword-duel/ui-contract.test.js
```

## 借鉴与来源声明

本体验的规则、状态机、测试、HTML、CSS、JavaScript、中文文案和生产视觉均由
本仓库独立编写。以下来源仅用于研究抽象术语、状态管理核对项、已排除路线和
无障碍标准。它们不是 dependency 或 vendored 文件；本作是零第三方运行依赖、
零第三方代码复制、零第三方资产复制。

许可证载体 SHA-256 是 2026-07-25 从下列固定 commit 或官方许可证页面获取内容的
研究证据，不表示许可证文件进入生产目录。

### OpenSpiel

- 固定源码：[`google-deepmind/open_spiel@112b77704631fc2ce7ad8e4581f6ca09798ce15a`](https://github.com/google-deepmind/open_spiel/tree/112b77704631fc2ce7ad8e4581f6ca09798ce15a)
- 许可证：[Apache-2.0 LICENSE](https://github.com/google-deepmind/open_spiel/blob/112b77704631fc2ce7ad8e4581f6ca09798ce15a/LICENSE)
- 许可证载体 SHA-256：`cfc7749b96f63bd31c3c42b5c471bf756814053e847c10f3eb003417bc523d30`
- 权利主体：OpenSpiel authors/contributors；固定源码文件包含
  `Copyright 2021 DeepMind Technologies Limited`
- 只借鉴：simultaneous move、joint action、sequential encoding 的通用建模术语；
- 未复制：源码、API、算法实现、测试、示例游戏、目录、文案和素材。

### boardgame.io

- 固定源码：[`boardgameio/boardgame.io@65ca73beb62ef2afd980bb9f569b10dabfc60075`](https://github.com/boardgameio/boardgame.io/tree/65ca73beb62ef2afd980bb9f569b10dabfc60075)
- 许可证：[MIT LICENSE](https://github.com/boardgameio/boardgame.io/blob/65ca73beb62ef2afd980bb9f569b10dabfc60075/LICENSE)
- 许可证载体 SHA-256：`516bc5dc1560ba43d2097b5f9b4029a23d073ac7feaa94979ac011f4f959620c`
- 版权：许可证原文为 `Copyright (c) 2017 The boardgame.io Authors.`；
  统一排印可写作 `Copyright © 2017 The boardgame.io Authors`
- 只借鉴：phases、state log、time travel 的公开产品描述；
- 未复制：框架、源码、目录结构、组件、示例、CSS、测试和资源。

### PrinceJS

- 固定源码：[`oklemenz/PrinceJS@ea1a97a763ac78fee5b35129e2841ef31531328e`](https://github.com/oklemenz/PrinceJS/tree/ea1a97a763ac78fee5b35129e2841ef31531328e)
- 许可证：[Unlicense LICENSE](https://github.com/oklemenz/PrinceJS/blob/ea1a97a763ac78fee5b35129e2841ef31531328e/LICENSE)
- 许可证载体 SHA-256：`ca2abdf695884c77ea4b4a5b64ca7b732d9d9dbade4eebc1c2e76c53e9e3bc83`
- 权利说明：LICENSE 没有具名 Copyright 行；作者以 Unlicense 将软件权利投入
  public domain
- 只用于确认：实时移动、格挡、出剑属于被排除的更重产品路线；
- 未复制：全部代码与 API；Prince of Persia 名称、角色、故事、关卡、地图、
  精灵、图像、音频、品牌、trade dress 和仓库内第三方资产。

PrinceJS 的 Unlicense 不等于 Prince of Persia 商业品牌和原作素材得到授权。本作
不使用这些名称、表达或内容。

### W3C WCAG 2.2

- 固定标准：[WCAG 2.2 Recommendation，2024-12-12](https://www.w3.org/TR/2024/REC-WCAG22-20241212/)
- 许可证：[W3C Document License 2023](https://www.w3.org/copyright/document-license-2023/)
- 许可证页面 SHA-256：`baf4bd39646bca6636f035e16aefd82b2ae0a04ae1aa58ded96922c3c1bcd752`
- 版权：`Copyright © 2020–2024 W3C`
- 只用于：键盘、焦点、状态消息、目标尺寸和减少运动的标准校准；
- 未复制：规范原文、示例代码、测试、图片、视觉样式和认证声明。

生产生成资产为无。三张 ImageGen 视觉概念仅保存在
`docs/assets/shadow-sword-duel/`，不被生产页面读取；它们的提示、尺寸与 SHA-256
记录在该目录的 `GENERATION.md`。更完整的来源与品牌边界见同目录
`ATTRIBUTION.md`。
