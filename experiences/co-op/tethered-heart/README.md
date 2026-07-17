# 同心牵引

一个 A 级、同一设备双人实时合作的连续牵引游戏。珊瑚与青色玩家分别控制一枚线轴，两条丝带共同拉着一颗布艺心；绕开针脚和软垫，把它稳定送进刺绣绷。

## 启动

直接双击本目录的 `index.html`。无需安装、服务器、账号或网络，也没有第三方运行依赖。

## 操作与规则

- 珊瑚线轴：`W / A / S / D`；
- 青色线轴：键盘方向键；
- 触屏时使用页面下方两组方向盘，可以由两个人同时长按；
- 两条丝带始终连接共享吊坠；单边拖得太远会提高张力并牵动另一端；
- 软垫不能穿过，吊坠碰到危险针脚会回到本幕检查点；
- 把吊坠送进右侧刺绣绷，让两枚线轴靠近并把张力稳定约半秒即可过关；
- 共三幕；可以暂停、重来本幕、查看玩法或完成后重新游玩；
- 窗口失焦或页面隐藏时自动暂停并清空当前输入，避免恢复时粘键。

## 本地与隐私边界

本作品使用经典相对脚本、原生 DOM、Canvas、一张本地背景和一张本地透明图集，可通过 `file://` 直接运行。它不使用 ES Modules、`fetch`、XHR、WebSocket、CDN、远程字体、统计、Service Worker、localStorage、IndexedDB 或 Cache API，也不会收集、保存或上传按键、关卡进度与设备信息。

## 标签

`双人合作` · `A 级` · `单设备同屏` · `键盘/双人触屏` · `连续牵引` · `公网依赖：无`

## 实现说明

三幕场景、状态机、固定步长运动、碰撞、双丝带约束、输入协议、中文文案和全部视觉均由本仓库自行设计。规则世界使用固定坐标；浏览器以 `1/120s` 子步推进纯状态，Canvas 只负责把状态绘制出来，因此不同屏幕刷新率不会改变规则结果。

两枚线轴、吊坠、终点、软垫、针脚、检查点和完成火花来自本地 `4 × 2` 图集，丝带曲线由当前端点和张力实时绘制。概念、生产背景与图集源稿由本项目在 2026-07-17 使用 OpenAI 内置图像生成工具创建；运行页面只使用本地背景和去除生成用绿色背景后的透明图集。

## 借鉴与来源声明

玩法调研参考了 [pemmyz/js_thrustvector](https://github.com/pemmyz/js_thrustvector/tree/4d140761ba1af8f4448bc6bd4785b63fc8928c5c) 中“两名玩家通过短绳共同影响一个物理载荷”的抽象合作机制。固定版本为 commit [`4d140761ba1af8f4448bc6bd4785b63fc8928c5c`](https://github.com/pemmyz/js_thrustvector/commit/4d140761ba1af8f4448bc6bd4785b63fc8928c5c)，上游 [`LICENSE`](https://github.com/pemmyz/js_thrustvector/blob/4d140761ba1af8f4448bc6bd4785b63fc8928c5c/LICENSE) 为 MIT License，版权标注为 `Copyright (c) 2025 pemmyz`。来源和许可证于 2026-07-17 按上述 commit 复核。

这是**机制借鉴、自行重写**，不是对上游实现的移植、翻译或改写。本目录没有复制、改写、打包或依赖上游源码、公式、常量、飞船、炸弹、夹取、燃料、生命值、Harmony/Stability、洞穴、迷雾、雷达、路径搜索、地图、DOM、CSS、文案或素材。本仓库自行定义了丝带线轴、始终连接的双拼吊坠、三幕几何、固定步长、碰撞、完成条件、触屏控制、页面结构与全部代码。

技术选型阶段还比较了 [Matter.js 0.20.0](https://github.com/liabru/matter-js/tree/0.20.0) 的距离约束能力与 [MIT LICENSE](https://github.com/liabru/matter-js/blob/0.20.0/LICENSE)，但本作品不引入、不打包、不调用也不复制 Matter.js。

由于没有引入或修改上述上游代码，本目录当前不附加上游源码或许可证副本。若未来直接引入任何代码，必须保留相应许可证与版权通知，并同步更新本声明和仓库第三方清单。

详细玩法与视觉标准见 [`docs/27-tethered-heart-spec.md`](../../../docs/27-tethered-heart-spec.md)，自动检查、Chrome 三幕实玩和响应式证据见 [`docs/28-tethered-heart-verification.md`](../../../docs/28-tethered-heart-verification.md)。
