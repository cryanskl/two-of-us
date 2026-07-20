# 月面，保持有光

「月面，保持有光」是一款本地同屏双人合作谜题。一个人坐电源席，决定电从哪里来；另一个人坐负载席，安排氧气、照明和通信接到哪条母线。两人需要在三次月面班次中找到唯一安全路由，并连续稳定 90 个固定逻辑 tick（3 秒）。

本作是原创抽象合作玩法，不模拟真实电压、电流、频率、保护动作或生命保障系统，也不构成电气工程、月面工程或安全培训。

## 启动

作品为 A 级本地体验，无需安装依赖或启动服务器。

1. 双击本目录中的 `index.html`；
2. 点击“开始第一班”；
3. 双方确认各自席位后，点击“已经换好位置”。

macOS 也可在仓库根目录运行：

```sh
open experiences/co-op/moon-base-power/index.html
```

页面通过 `file://` 直接运行。请保留 `index.html`、`styles.css`、`config.js`、`levels.js`、`logic.js`、`app.js` 与 `assets/` 的相对位置。

## 操作

| 席位 | 键盘 | 原生控件 | 职责 |
| --- | --- | --- | --- |
| 电源席 | `A` 太阳能、`S` 蓄电池、`D` 循环联络方向 | 两个馈线按钮与联络 radio group | 控制两侧供给和 `断开 / L→R / R→L` |
| 负载席 | `J` 氧气、`K` 照明、`L` 通信 | 三组负载 radio group | 让每项负载在 `关闭 / L / R` 间切换；受损插口不可选 |

键盘只在值班进行阶段生效；长按重复、修饰键组合和页面快捷键不会被当成游戏操作。鼠标、触控、Enter 和 Space 都通过同一组原生控件调用相同规则。

## 规则

- 太阳能只向 BUS L 供电，蓄电池只向 BUS R 供电；两条馈线都必须开启。
- 氧气、照明、通信各自只能接 BUS L、关闭或接 BUS R。
- 联络线容量为 2；只有从有余量一侧指向有缺口一侧时才会发生整数转移。
- 前两班联络线维护中，必须断开；第三班要求联络线实际送出电力，并公开标出受损插口。
- 所有负载接通、插口可用、联络条件满足且两侧最终缺口都为 0，才得到一个安全 tick。
- 必须连续保持 90 个安全 tick；任何不安全调整都会把连续进度归零，但不会重置开关。
- 错误配置没有惩罚，可按故障列表继续调整。

值班中手动暂停、切到后台、页面失焦或画面间隔过长时，规则进入显式暂停。已经获得的安全进度会冻结；恢复必须点击“继续值班”，后台时间不会补算。

## 本地配置

准备者可以只修改 [`config.js`](./config.js) 中的双方称呼、完成标题和 `composeCompletionNote(summary)`。默认配置可直接游玩。

`composeCompletionNote` 只收到一份冻结、隔离的三班摘要，并应返回 1–160 字纯文本。空白、超长、非字符串、抛错或尝试修改摘要都会使用安全默认结语；配置不能改关卡、容量、状态或完成条件。

## A 级、隐私与实现边界

- 加载顺序固定为经典脚本 `config.js → levels.js → logic.js → app.js`；不使用 ES Module、构建步骤或 npm 运行依赖。
- 不使用 `fetch`、XHR、WebSocket、Worker、Service Worker、远程字体、CDN、统计或分享。
- 不使用本地/会话存储、IndexedDB、Cookie、账户或服务端；刷新即重置。
- 不使用随机数、音频、振动、传感器或真实时钟参与规则。
- `levels.js` 保存三班冻结数据；`logic.js` 是供需、联络、故障、状态机、键盘分类与固定 tick 的唯一权威规则来源。
- `app.js` 只投影 `MoonBasePowerLogic.getPublicView()`，并通过 reducer 处理按钮、键盘、30Hz rAF accumulator、暂停和焦点；DOM、CSS 和背景像素都不能决定通关。
- 每个班次的 324 个原始控制向量都由生产 evaluator 穷举，三班各自只有一个安全向量。
- 背景加载失败时，代码原生的文字、母线、线路、数值、状态和原生控件仍可完整通关。

详细依据见[定向调研](../../../docs/141-moon-base-power-research.md)、[可执行规格](../../../docs/142-moon-base-power-spec.md)、[视觉设计](../../../docs/143-moon-base-power-design.md)与[实现计划](../../../docs/144-moon-base-power-plan.md)。

## 生成资产说明

运行背景 [`assets/control-room-background.png`](./assets/control-room-background.png) 直接复制自本项目于 2026-07-20 使用 OpenAI 内置 ImageGen 生成并接受的无字源稿 [`docs/assets/moon-base-power/control-room-background-source.png`](../../../docs/assets/moon-base-power/control-room-background-source.png)。源稿与运行文件均为 1586 × 992 RGB PNG。

背景只提供虚构 1970s 月面控制室氛围，不包含文字、数字、控件、线路、人物、飞船、NASA/Artemis 标识或第三方品牌。favicon、双母线、联络箭头、状态轨和全部控件由本项目 HTML/CSS/SVG 原创实现。

## 借鉴与来源声明

开发前固定研究了 PipeWalker v1.1、Grid2Op v1.12.5 与 Power Overload 2.1.6 的一般问题边界，并查阅 NASA Moon Base Systems 与 Gateway 页面确认题材背景。它们不进入运行依赖。

本作没有复制、改写、翻译、移植、打包或依赖这些项目的源码、API、算法、关卡、数值、测试、文档原句、页面、贴图、图标、音频、字体、标识或其他素材。双母线规则、三班数值、两席权限、整数 evaluator、连续安全窗、状态机、中文文案、DOM、CSS、SVG 与生成资产均为本项目独立原创。

固定版本、许可证、权利主体、事实来源和逐项零复制边界见 [`ATTRIBUTION.md`](./ATTRIBUTION.md)。
