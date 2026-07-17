# 心动拔河

一个 A 级、同一设备双人实时对抗小游戏。左边玩家连续按 `A`，右边玩家连续按 `L`，也可以点击各自的触控按钮；把中央织带结拉过自己一侧终点线即可赢下一局，先赢两局完成比赛。

## 启动

直接双击本目录的 `index.html`。无需安装、服务器、账号或网络，也没有第三方运行依赖。

## 操作与规则

- 左边玩家：完整按下一次 `A`，或点击一次左侧“拉一下”；
- 右边玩家：完整按下一次 `L`，或点击一次右侧“拉一下”；
- 长按和浏览器的系统按键重复不会连续加力；松开后再次按下才算下一次；
- 双方在同一个逻辑步中的拉力会合并结算，等量输入互相抵消；
- 停止输入后，织带结会按真实 elapsed 时间缓慢回到中央；
- 主动暂停、切到后台或窗口失去焦点都会清空待处理输入；继续时先经过短倒计时；
- 每局把织带结拉过己方终点线者得一分，先得两分获胜。

## 本地与隐私边界

本作品使用经典相对脚本、原生 DOM 和 `requestAnimationFrame`，可通过 `file://` 直接运行。它不使用 ES Modules、`fetch`、XHR、WebSocket、CDN、远程字体、统计、Service Worker、localStorage、IndexedDB 或 Cache API，也不会收集、保存或上传按键频率、比分历史与设备信息。

## 标签

`双人对抗` · `A 级` · `单设备同屏` · `键盘/触屏` · `三局两胜` · `公网依赖：无`

## 实现说明

浏览器动画帧只负责累计真实时间，规则层始终以 `1000 / 60 ms` 固定步长推进，并将单帧追赶限制在五步。某一动画帧需要追赶多个逻辑步时，待处理的左右脉冲只在第一个逻辑步读取并清空一次，后续追赶步使用零脉冲，避免低帧率把同一批输入重复计算。

键盘控制还维护独立 held 集合：新的 A/L `keydown` 才产生一个脉冲，`event.repeat` 或尚未 `keyup` 的重复按下均被拒绝。触控和鼠标沿用原生 `<button>` 的一次 `click` 一个脉冲语义，不用长按定时器模拟连发。

## 借鉴与来源声明

本作品借鉴的是通用的“双方反复输入，把共享标记拉过边界”的拔河玩法机制。玩法方向调研时参考了 [tridpt/TwoPlayerGames](https://github.com/tridpt/TwoPlayerGames) 中的 [`tugofwar.js`](https://github.com/tridpt/TwoPlayerGames/blob/542c57a778bbf843eb2cb121e99d0b050d8c866e/js/games/tugofwar.js)：该固定上游版本为 commit [`542c57a778bbf843eb2cb121e99d0b050d8c866e`](https://github.com/tridpt/TwoPlayerGames/commit/542c57a778bbf843eb2cb121e99d0b050d8c866e)，上游 [`LICENSE`](https://github.com/tridpt/TwoPlayerGames/blob/542c57a778bbf843eb2cb121e99d0b050d8c866e/LICENSE) 为 MIT License，版权标注为 `Copyright (c) 2026 tridpt`。来源和许可证于 2026-07-17 按上述 commit 复核。

这是**机制借鉴、自行重写**，不是对上游实现的移植、翻译或改写。本目录没有复制、改写、打包或依赖上游的 226 行游戏脚本、Canvas 绘制、常量、计时器、DOM 字符串、CSS、翻译、选项、音效或素材。本仓库自行定义了情侣化中性文案、固定步长公平结算、输入 Gate、暂停语义、DOM 结构、视觉、状态机、测试与全部代码。

由于没有引入或修改上游代码，本目录当前不附加上游源码副本。若未来直接引入或修改该项目的任何代码，必须保留 MIT 许可证全文与版权通知，并同步更新本声明和仓库第三方清单。

详细状态机、视觉边界与验收证据见 [`docs/21-ribbon-tug-spec.md`](../../../docs/21-ribbon-tug-spec.md) 和 [`docs/22-ribbon-tug-verification.md`](../../../docs/22-ribbon-tug-verification.md)。
