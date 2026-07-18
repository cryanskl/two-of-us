# 星码解锁

一个可以直接双击打开的本地惊喜：对方依次回答三条只有你们知道的线索，每个正确答案点亮一颗星；三星连成后，再由对方主动读出你准备好的话。

## 直接使用

1. 用文本编辑器打开 [`config.js`](./config.js)；
2. 把示例称呼、三条问题、可接受答案、提示和最终文案换成你们自己的内容；
3. 双击 [`index.html`](./index.html)；
4. 测试三题、帮助校准和重新封存，再把整个 `star-code-unlock` 文件夹交给对方。

不需要安装依赖，也不需要启动服务器。页面通过经典脚本加载，可以在现代 Chrome、Edge、Firefox 和 Safari 中以 `file://` 直接运行。

## 配置说明

每条 `clue` 必须保留唯一的 `id`，并从 `s01`–`s12` 中选择一个不重复的 `starId`。`acceptedAnswers` 可放 1–5 个可接受写法；匹配时会统一全角/半角、大小写、空白和常见标点，但不会自动处理同义词。

`hintAfterMiss({ clueIndex, wrongCount })` 是留给准备者的小扩展点：它只收到题号和错误次数，可以用约 5–10 行代码写出你们才懂的两级提示。第三次答错时系统固定提供“让星盘帮一次”，保证对方不会卡住。

如果配置结构不完整、字段为空或星位重复，页面会整份回退到安全示例配置，不会把半份自定义内容与示例内容混在一起。

## 隐私边界

- 页面不联网，不调用 `fetch`、WebSocket、浏览器存储或任何远程服务；
- 输入只在提交瞬间用于比较，不进入状态、不写日志、不保存，刷新即清空；
- 未到对应阶段时，问题答案和最终正文不会预先进入 `index.html` 的 DOM；
- `config.js` 是本机明文配置，不是加密保险箱。能读取文件源码的人仍能看到答案和最终文案，因此请只把目录交给你信任的人，也不要把真实私人内容提交到公开仓库。

## 借鉴与来源声明

本作独立实现，没有复制第三方代码、星表、星座线、关卡、图片、音频或字体，也没有第三方运行时依赖。设计前核验了以下项目的机制与本地运行边界：

- [`tympanix/pattern-lock-js`](https://github.com/tympanix/pattern-lock-js/tree/95d40ac58f56beb11b96d403c10c9349d8372c4d)（MIT）：只用于评估 SVG 图案锁，最终未采用该机制；
- [`jamesgary/constellations`](https://github.com/jamesgary/constellations/tree/615ba564fa28626d84866583ccc95d5a06ee013a)（根 LICENSE 为 MIT，`package.json` 标记 ISC）：只用于理解点/边谜题机制；
- [`ofrohn/d3-celestial`](https://github.com/ofrohn/d3-celestial/tree/7e720a3de062059d4c5400a379146a601d9010e0)（BSD-3-Clause）：因依赖 D3、JSON 数据和本地服务条件而未引入。

浏览器行为参考 MDN 的 [`String.prototype.normalize()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/normalize)、[`<input>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/input) 与 [`autocomplete`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/autocomplete) 文档。完整固定版本、生成资产和独立实现边界见 [`assets/ATTRIBUTION.md`](./assets/ATTRIBUTION.md)，产品与验收规格见 [`../../../docs/58-star-code-unlock-spec.md`](../../../docs/58-star-code-unlock-spec.md)。
