# 借鉴与来源声明

## 创意与传统规则

本作品来自仓库原创创意池 V14「纸上足球」，采用传统纸笔游戏 Paper Soccer / Paper Football 的通用机制：八方向相邻移动、线段不可重复、旧点或边界反弹、进球或困死取胜。

规则核验来源：

- https://paper.soccer/rules/
- https://www.paper-football.com/

规则事实只用于确认传统玩法，不复制网站文案、代码、视觉、商标或素材。

## 开源候选核验

为确认可许可生态，仅检查以下仓库的元数据、许可证和固定 commit；没有读取、复制、改写、运行或打包其源码与素材：

- `jdermont/YaPaperSoccer`
  - URL：https://github.com/jdermont/YaPaperSoccer
  - commit：`756758b1d7f21513d74b7a1a653421dc32ad3c50`
  - license：MIT
  - 借鉴边界：零代码、零素材借用，仅作为生态调研记录
- `MateuszJanda/paper-soccer`
  - URL：https://github.com/MateuszJanda/paper-soccer
  - commit：`dcaeb4e25db9e9279bd0680b852b1e6a24a18f37`
  - license：MIT
  - 借鉴边界：零代码、零素材借用，仅作为生态调研记录

因此本作品当前不包含第三方开源代码，也不因上述仓库产生许可证再分发义务。若未来实际借用，必须另行补充文件级来源、许可证正文和修改说明。

## 运行代码与视觉

- JavaScript 状态机、图结构、SVG 球场、中文文案、键盘映射、页面布局和测试：本仓库原创；
- `tactics-desk.png`：由 OpenAI ImageGen 于 2026-07-18 生成，只包含无字桌毡和文具环境；
- `docs/assets/paper-soccer/concept-desktop.png` 与 `concept-mobile.png`：由 OpenAI ImageGen 于 2026-07-18 生成，仅作为设计规格与验收对照；
- 字体：仅使用系统字体 fallback，不打包第三方字体；
- 音乐、音效、照片、远程 API：未使用。

运行时所有网格、球门、轨迹、节点、球、合法目标、按钮、比分和文字均由 HTML/CSS/SVG/JavaScript 原生生成，不从概念图裁切 UI。
