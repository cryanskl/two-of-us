# “影子剑术”概念图生成台账

- 生成日期：2026-07-23
- 工具：OpenAI ImageGen（Codex 内置）
- 输入图片：无
- 外部参考图：无
- 用途：docs-only 视觉方向评审
- 生产运行时：不得使用、复制、链接或内嵌这些 PNG

## 1. desktop choosing

- 文件：`concept-choosing-desktop.png`
- 原始输出：
  `{generated-image-root}/019f6391-1492-74c1-ad81-58b3f8721526/exec-26974a4e-e7b3-4766-a47e-329155f4952d.png`
- 像素：1586×992
- SHA-256：`1ab4beba8f23c03a4f6daf724989ead2ea911640f13e04ec8662960c723777f7`
- 状态：choosing，左席已选“防”但尚未封招

生成提示摘要：

```text
1440x900 full-page desktop functional UI for “影子剑术”.
Midnight indigo fibrous paper, ivory text, restrained cinnabar/cyan,
two public resource rails, central four real-button choices in fixed order,
“防” selected, one seal action, no dashboard/cards/IP/network UI.
```

审计：

- 采纳左右资源、中轴动作、纸影色彩和开放布局；
- 拒绝图中的“攻必定命中、护甲、跳过下一次攻击、下次增伤”错误说明；
- 拒绝蓝色发光 HUD，生产改为实线 focus；
- 图像不是生产截图。

## 2. mobile ready-to-reveal

- 文件：`concept-ready-mobile.png`
- 原始输出：
  `{generated-image-root}/019f6391-1492-74c1-ad81-58b3f8721526/exec-b9f9946c-37cb-4d41-a52c-aa6a614dcf8e.png`
- 像素：853×1844
- SHA-256：`524ac55e9d57514cd6d7894afa04a075e53fa05e61656d91c1f46f71b5aec758`
- 状态：两份动作已封、尚未揭晓

生成提示摘要：

```text
390x844 mobile READY-TO-REVEAL UI.
Only public resources, “两位都已封招”, neutral closed paper fold,
one “一起揭晓” button; absolutely no action values, icons or color coding.
```

审计：

- 没有出现攻/防/闪/蓄或两份选择，符合隐私方向；
- 纸折面积在生产移动端缩小，不能占据半屏；
- 图中纸折实际过于像信封，该造型拒绝；生产只保留无邮寄/封印语义的抽象折纸；
- 抽象折纸只表示提交完成，不表示加密或某一种动作。

## 3. desktop round-result

- 文件：`concept-result-desktop.png`
- 原始输出：
  `{generated-image-root}/019f6391-1492-74c1-ad81-58b3f8721526/exec-441bf4f4-9858-40ee-901d-36b17ce1e5d0.png`
- 像素：1586×992
- SHA-256：`3497cf889280d79c48855027eb03aef4b9f7ac9130c01daabc46dac8df618a1b`
- 状态：普通攻 / 防，右席防守成功并取得先机

生成提示摘要：

```text
1440x900 desktop ROUND-RESULT UI.
Reveal 左席攻 / 右席防, “普通攻被挡下”, ordered resource effects,
updated public rails, one next-round button and revealed history.
```

审计：

- 资源与结果符合冻结规则；
- 采纳因果编号列表、左右 rail 和轻量历史；
- 拒绝“下一回合”按钮的蓝色外发光，生产改为 3px 实线 focus；
- 生产不会复制图中纹理、书法字形或边缘图形。

## 4. 共同边界

- 三张图均由纯文本提示生成，没有输入图片；
- 提示明确排除现有游戏 IP、品牌、角色、关卡、地图、精灵、音频和 logo；
- 图中文字如与规格冲突，一律以
  [`220-shadow-sword-duel-spec.md`](../../220-shadow-sword-duel-spec.md) 为准；
- 概念图不提供许可证判断或第三方来源证明；
- 最终生产文件的来源、哈希与许可需另行登记。
