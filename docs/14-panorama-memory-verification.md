# “回到那一天”实现与验收记录

## 1. 验收范围

本记录对应首个 B 级作品“回到那一天”。核心范围是单张本机 360° 等距柱状全景、固定 Pannellum 2.5.7、本地文件 Gate、对象 URL 生命周期和响应式页面；不包含多场景、热点、音频、设备方向、保存或上传。

## 2. 自动检查

- 纯逻辑覆盖 JPEG / PNG / WebP、空文件、40 MiB 上限、非法大小、1.9–2.1 比例边界、低分辨率提醒、高分辨率提醒和 8192×4096 上限；
- catalog 检查 B 级入口、无公网依赖和入口文件；
- 静态服务只允许两条固定 Pannellum 2.5.7 资源，不允许 `latest`、任意 `node_modules` 或路径穿越；
- 仓库 verifier 能解析固定 vendor URL，并继续检查入口、资源和借鉴声明。

## 3. Chrome 核心流程

验收日期：2026-07-15。

- 桌面空状态：`1150×1024`，完整标题、主动作、2:1 舞台、说明和禁用操作均可见；
- 移动空状态：`390×844`，`innerWidth = scrollWidth = 390`、`scrollHeight = 844`；
- 有效文件：页面内生成 `2048×1024` JPEG `File`，加载后出现一个 Pannellum canvas，状态进入 ready；
- 全景控制：点击 Pannellum 放大控件后，浏览器截图中的视野确实变化；
- 无效替换：加载有效全景后再选择 `1000×1000` PNG，提示比例错误、canvas 仍为 1、清除按钮仍可用；
- 生命周期：在 QA 中包裹 `URL.createObjectURL` / `URL.revokeObjectURL`，加载时观测到应用与 Pannellum 共创建 2 个 URL；点击“清除照片”后撤销数为 2、canvas 数为 0；
- 网络与控制台：页面只请求 localhost 下的 HTML、CSS、JS 和两条固定 vendor 资源；没有 `Runtime.exceptionThrown`、console error 或公网请求。Chrome 扩展自己的光标图片不属于应用请求。

Chrome 扩展没有开启 file URL 访问，因此 `fileChooser.setFiles` 被扩展拒绝。验收改用 CDP 在当前 localhost 页面内生成临时 Canvas、转换为 JPEG / PNG `File` 并触发同一 input change 流程；验证结束后重新加载页面，未留下页面修改或测试素材。真实文件选择器按钮、关联 input 和可访问名称仍通过 DOM 检查。

## 4. 视觉忠实度账本

| 比较点 | 概念证据 | 实现证据 | 结果 |
| --- | --- | --- | --- |
| 文案层级 | “回到那一天”标题、单句说明、单一选择动作 | 桌面与移动保持相同顺序和文字 | 一致 |
| 色彩 | 暖白、墨色、夕阳橙、浅灰细线 | `#f4efe6 / #24211d / #d86e3a / #d8d0c4` | 一致 |
| 容器模型 | 开放纸面、一个全景舞台，不使用卡片网格 | 页面仅舞台有必要边框，说明和操作直接排版 | 一致 |
| 字体与控件 | 编辑感宋体标题、无衬线正文、克制小圆角 | 本机宋体 fallback；按钮 50–52px 高、5px 圆角 | 一致 |
| 移动节奏 | 24px 边距、主按钮通栏、舞台后依次是三条说明和双操作 | 390×844 截图中顺序、间距和宽度一致 | 一致 |
| 全景比例 | 概念图表现为宽幅舞台 | 实现按功能规格固定严格 2:1 | 有意以功能规格为准 |

空状态首屏文案 diff 为零；“B 级体验”一行在本地服务就绪时动态从“请先运行”改为“本地运行时已就绪”，属于真实状态反馈。初稿多出的一行重复格式提示已经删除。除严格 2:1 舞台相对概念略高外，没有剩余可修复的实质视觉偏差。

## 5. 验收截图

当前机器的临时证据：

- 概念图：`/Users/zenith/.codex/generated_images/019f64a6-a21a-7422-a71a-682735543ad1/exec-d1b8f849-b15f-436c-9bec-dc650c2406ed.png`
- 桌面实现：`/tmp/panorama-memory-final-desktop-v3.png`
- 移动实现：`/tmp/panorama-memory-final-mobile.png`
- 移动成功态与缩放后：`/tmp/panorama-memory-mobile-ready.png`、`/tmp/panorama-memory-mobile-after-zoom.png`

这些是本机 QA 临时产物，不进入公开仓库，也不包含用户私人照片。
