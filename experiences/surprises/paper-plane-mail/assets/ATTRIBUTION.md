# 借鉴与来源声明

## 创意来源

本作品来自仓库原创创意池 S06「纸飞机投递」：准备者预先写好一封本地信件，收件人调节仰角和力度把纸飞机投进邮箱，成功后再打开信。

纸飞机、抛物线投掷、邮箱投递和密封信件属于通用题材与交互机制。本作品不复制任何既有游戏的关卡、数值、文案、布局、代码或素材。

## 开源候选核验

为确认纸飞机网页游戏的许可生态，仅检查以下项目的仓库元数据、许可证状态和固定 commit；没有读取、运行、复制、改写或打包其源码与素材：

- `happy32x/PaperPlaneGame`
  - URL：https://github.com/happy32x/PaperPlaneGame
  - commit：`177cc4e296981bcb67c151fd3a2e7db748652e4d`
  - license：MPL-2.0
  - 借鉴边界：零代码、零素材借用；其键盘障碍飞行与本作的回合式角度/力度投递不同
- `luckyadamsdev/Paper-Pilots`
  - URL：https://github.com/luckyadamsdev/Paper-Pilots
  - commit：`4855322ef485d11ec550190555b64ef51225121e`
  - license：仓库未声明源码许可证；其发布页只单独标注纸飞机模型为 CC BY 4.0
  - 借鉴边界：仅作“纸飞机题材存在 3D 多人变体”的检索记录；零代码、零模型、零素材借用

由于当前实现不使用这些项目，本作品不产生上述代码或模型的再分发义务。若未来实际借用，必须另行补充文件级来源、许可证正文、模型作者与修改说明；未声明源码许可证的项目不得复制。

## 技术资料

- [MDN `requestAnimationFrame`](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame)：只用于核验浏览器动画回调的时间戳、高刷新率和后台暂停边界；没有复制示例代码；
- [MDN `prefers-reduced-motion`](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/%40media/prefers-reduced-motion)：只用于核验减少非必要运动的浏览器偏好。

飞行规则采用仓库自行定义的二维坐标、固定 `1/120s` 步长、重力常量和邮箱碰撞区域，不引入 Paper.js、Matter.js、Phaser 或其他第三方运行时。

## 运行代码与视觉

- JavaScript 状态机、抛体规则、碰撞、SVG 飞行图、中文文案、配置边界、页面布局和测试：本仓库原创；
- `night-post-desk.png`：由 OpenAI ImageGen 于 2026-07-18 生成，只包含无字午夜邮务桌面和边缘文具；
- `docs/assets/paper-plane-mail/concept-desktop.png` 与 `concept-mobile.png`：由 OpenAI ImageGen 于 2026-07-18 生成，仅作为设计规格和验收对照；
- 字体：仅使用系统字体 fallback，不打包第三方字体；
- 音乐、音效、照片、远程 API、第三方模型：未使用。

运行时纸飞机、预测点、航线、月亮、风标、邮箱、刻度、按钮、信封、信纸和全部文字都由 HTML/CSS/SVG/JavaScript 原生生成，不从概念图裁切 UI。
