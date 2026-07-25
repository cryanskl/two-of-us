# 四符片名擂台：多字素和普通文字可冒充 Emoji

## 现象

非视觉核心复审发现，token 的 `glyph` 只限制为 1–4 个 Unicode 码点，并排除
ZWJ、肤色、旗帜、tag 与私用区。以下值都会被基线
`validateGameData()` 和 `sanitizeConfig()` 接受：

```text
🐈🐕
☀️☁️
A
中
```

前两项各含两枚可见符号，后两项不是 Emoji。自定义配置因此能把“每题严格四符”
悄悄扩张成更多符号，或失去 Emoji 呈现合同。

## 根因

`cleanText()` 的码点长度限制只能证明字符串短，不能证明它是一枚 Emoji。
一次性检查内置 48 个 token 都是单扩展字素，也不能约束以后送入公开校验 API 的
候选配置。

## 解决方案

glyph 现在必须匹配以下窄合同：

```js
/^(?:\p{Emoji_Presentation}|\p{Extended_Pictographic}\uFE0F)$/u
```

- 默认 Emoji 呈现字符可直接使用；
- 默认文本呈现的象形字符必须显式带 VS16；
- 多字素、普通文字、裸文本呈现符号和既有高风险序列均被拒绝；
- 不引入 `Intl.Segmenter`、第三方 Unicode 数据或平台图像依赖；
- 现有 48 个 token 和每枚原创 `labelZh` 全部保留。

## 验证

- 红灯：新增用例后定向测试 `27/28`；
- 第一阶段收紧多字素后 `28/28`；
- 加入非 Emoji 与默认文本呈现边界后再次红灯 `27/28`；
- 最终定向测试 `28/28`；
- `node --check logic.js` 通过；
- 内置 48/48 glyph 通过新合同。

## 影响范围

仅修改 `four-symbol-film-duel` 配置净化与测试，不涉及题卡文本、生产 UI、共享
依赖、入口、launcher、catalog 或 Board。
