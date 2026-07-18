# 藏好这一味：借鉴与来源声明

核验日期：2026-07-19。

## 本作原创与零复制边界

“藏好这一味”的配料主题、双轮热座赛制、秘密合法条件、同机遮屏交接、状态与公开投影、反馈代码、测试、页面结构、中文文案、黄铜配料章 SVG、样式和无障碍交互均由本仓库独立实现。下列开源工程只用于研究产品与工程边界，不是运行依赖。

本作没有复制、改写、翻译、移植、打包或依赖这些来源的源码、函数、变量、测试表、组件、构建配置、棋盘、提示钉、图片、字体、图标、音频、页面结构、规则原文或文案。其 MIT 许可证不被用来主张本作素材来自这些仓库。

## 固定版本的开源调研

| 来源 | 固定版本与许可证 | 权利主体 | 只研究的边界 |
| --- | --- | --- | --- |
| [Calanthe/mastermind](https://github.com/Calanthe/mastermind/tree/688006ae2280b721e4a8289b710351dd3fd7e5ed) | `688006ae2280b721e4a8289b710351dd3fd7e5ed`，MIT | Copyright 2020 Zofia Korcz | 棋盘行、当前输入、历史反馈的界面分层 |
| [sztamas/mastermind](https://github.com/sztamas/mastermind/tree/525937d2fd8a5490aed0ea3f9198d0777b1670cb) | `525937d2fd8a5490aed0ea3f9198d0777b1670cb`，MIT | Copyright 2015 sztamas | 可重放状态和重复颜色得分测试边界 |
| [sajadhsm/mastermind](https://github.com/sajadhsm/mastermind/tree/32ad16b12621abe41be95245586f8db9c8f98acf) | `32ad16b12621abe41be95245586f8db9c8f98acf`，MIT | Copyright 2021 Sajad Hashemian | 先同位、再消费剩余频数的反馈边界 |
| [klomontes/js-mastermind](https://github.com/klomontes/js-mastermind/tree/2cb289f390adc5571f4a2494e920e7b5e1250874) | `2cb289f390adc5571f4a2494e920e7b5e1250874`，MIT | Copyright 2014 Branko Tomic | 原生 JavaScript 中反馈步骤的最小边界 |
| [BreakLock](https://github.com/maxwellito/breaklock/tree/a06fb28a3fa6072a089ca664c66a7bf08c0a3e99) | `a06fb28a3fa6072a089ca664c66a7bf08c0a3e99`，MIT | Copyright 2017 maxwellito | 将有限反馈游戏改造成移动优先体验的产品思路 |

若未来实质引入其中任何代码或素材，必须另立变更，保留对应许可证与版权声明，并重新执行离线、隐私和浏览器验收。

## 商业产品与论文边界

- [Hasbro 官方规则 PDF](https://www.hasbro.com/common/documents/430e4f3f6bfd10148a8ef35124427085/E0A7EB4950569047F5C0080A51F685F8.pdf) 只用于确认四位、六色、精确/错位反馈、角色交换与尝试次数计分属于公开机制，以及相关商业名称是注册商标。本作不使用该商业名称、注册商标符号、官方规则原句、红白提示钉、黑色塑料板、包装、图形或 trade dress。
- Donald E. Knuth, [“The Computer as Master Mind”](https://janmr.com/refs/knuth-mastermind76/)（Journal of Recreational Mathematics 9, 1976, 1–6）只用于确认这类序列重建可形式化为有限候选消除问题。本作没有电脑求解器、五步算法、首猜策略或论文算法实现，也不复制论文文字、公式、图表和测试输入。

## 平台规范

以下固定版本只用于研究浏览器平台行为；不复制规范文字、IDL、示例或站点视觉：

- [WHATWG HTML](https://github.com/whatwg/html/tree/56674fb3ac40279141a202e5d19b84f30d99854d)：原生按钮与隐藏内容模型；
- [Page Visibility](https://github.com/w3c/page-visibility/tree/8ca533c744e655b8340b5713d1bd5ea97b202b13)：页面隐藏事件；
- [W3C WCAG](https://github.com/w3c/wcag/tree/07123b871c103268375880980fd715b2b26b2ff0)：焦点、键盘和非颜色信息；
- [CSSWG Drafts](https://github.com/w3c/csswg-drafts/tree/c7573530343759ace8e46438a1fa2c44515b5554)：响应式、降动效与强制颜色。

## 明确排除的来源

- `debjeanlee/mastermind` 没有清晰许可证；未复制其 JavaScript、CSS、HTML、README、颜色、布局或演示。
- `8ix/codebreaker` 未在本批核验固定版本与许可证；未复制其 Next.js/TypeScript、规则、页面或素材。
- Hasbro/Invicta 商业产品、在线猜码站、CodePen、教程和应用商店截图未作为实现来源；公开可访问不等于允许复制具体表达。

## ImageGen 资产输入链

三个状态概念和生产背景均由本次项目通过 OpenAI ImageGen 新生成，没有输入第三方图片：

1. 桌面设置态：午夜药房、左侧深蓝编辑栏、右侧羊皮纸账本、四格秘密与六枚黄铜配料章，避开商业棋盘和仪表盘；
2. 移动猜测态：真实 390px 单列、当前试配、反馈图例、3×2 配料、禁用主按钮和猜测历史，不显示秘密；
3. 桌面终局：2 比 3、两轮记录、较少次数者获胜；初稿强调错误后，仅以该本地初稿编辑纠正比分强调，生成 v2；
4. 生产背景：俯视深色胡桃木与夜蓝布面，药罐、黄铜杯和勺只在边缘，中央大面积留空，不含 UI、书本、文字或标识。

运行时只加载 `assets/apothecary-table.jpg`。概念图不进入页面；配料图标是本作代码原生 SVG，不是概念位图的切片或临摹。
