# 把夜晚照成我们

一个可以从 `file://` 直接打开的单人惊喜：移动一盏小灯，在五处微光上连续停留；每件被记住的小物都会留下名称和一句话，五件都找到后才出现完整信。

## 直接使用

1. 双击 `index.html`，或把它拖进浏览器。
2. 选择“提起灯”。
3. 鼠标进入舞台后直接移动；触摸或笔在舞台上按住拖动；键盘先聚焦舞台，再用方向键移动，Home 回到中央。
4. 光心第一次进入目标只负责定位，随后连续停留 14 个 50ms 逻辑 tick 才会发现，共至少 700ms。
5. 不方便视觉搜索或精细移动时，用“不方便寻找，直接点亮”获得等价的完整内容。

离开目标、换目标、暂停、页面隐藏或失焦会清掉当前停留进度，但不会丢掉已经发现的内容。页面没有失败、倒计时、分数或最佳路线。

## 修改给对方的话

在 `config.js` 中修改标题、说明、五件纪念物的名称与短句、默认完成正文和落款。`composeStarlightLetter(view)` 是唯一的个性化策略入口，可按真实发现数量、发现顺序、最后发现的小物或完成方式返回纯文本结尾。

动态文案一律用 `textContent` 写入。每件纪念物只有被发现后才创建对应 `<li>`；直接点亮或搜索完成后才创建完整信、落款、重开按钮与完整发现列表；“再照一次”会删除这些节点。

这是浏览时的渐进揭晓，不是加密：能读取本地 `config.js` 源码的人仍然可以看到准备好的文案。真正需要保密的内容不应以明文放进静态 HTML/JavaScript 项目。

## 离线、隐私与规则边界

- 零第三方运行依赖、零外链、零 `fetch`，无需安装、服务端或构建。
- 不使用 localStorage、IndexedDB、Cookie、剪贴板、上传、下载、分享、媒体或传感器。
- 刷新、关闭页面或重开都会丢弃光心路径、发现顺序和停留进度。
- 背景图片只提供画面；目标地图、命中、连续停留、发现顺序与完成都由纯逻辑状态机决定。
- Canvas 只根据公开 view 绘制暗幕、光圈、停留环和标记，不读取像素，也不参与完成判定。
- `requestAnimationFrame` 只把时间转换成最多 5 个整数 tick；换目标清空残留时间，同目标内移动保留，帧间隔超过 250ms 则暂停且不补算。

## 无障碍与降级

- 所有操作都是原生按钮，焦点清晰，控件至少 48px 高。
- 方向键与 Home 提供完整键盘路径；“直接点亮”是不依赖搜索的等价入口。
- 一个稳定的 `aria-live` 区域只播报阶段、进入/离开微光、单件发现和完成，不按 tick 或坐标刷屏。
- `prefers-reduced-motion` 下停用发现淡入、呼吸与渐亮；光心位置仍即时更新。
- `forced-colors` 下隐藏背景与 Canvas 渐变，改用系统色 DOM 光心、匿名目标圈、文字进度和按钮边界。
- 背景图片失败时保留 CSS 夜桌与匿名几何；任一 Canvas 2D context 不可用时停用搜索面，但“直接点亮”仍可使用。

## 文件说明

- `config.js`：可修改文案、五件纪念物和完成策略。
- `logic.js`：纯状态机、整数地图、输入接管与连续停留规则。
- `app.js`：DOM、Pointer/键盘输入、rAF accumulator、Canvas 与生命周期适配。
- `logic.test.js`：确定性、边界、输入与 golden replay 测试。
- `assets/keepsake-night.jpg`：本项目通过 ImageGen 生成并校准的本地生产背景。
- `ATTRIBUTION.md`：研究参考、素材输入链、排除项与零复制声明。

## 借鉴与来源声明

本作品调研了 PixiJS、PixiJS Filters、Konva 与 Phaser 的公开实现边界，但运行时零第三方依赖、没有复制其源码；背景由 OpenAI 内置 ImageGen 为本项目生成。完整的版本、固定 commit、许可证、著作权、排除项与零复制说明见 `ATTRIBUTION.md`。

## 验证

在仓库根目录运行：

```sh
node --check experiences/surprises/starlight-keepsake-search/app.js
node --test experiences/surprises/starlight-keepsake-search/logic.test.js
npm test
npm run verify
```

完整浏览器验收覆盖 1280×800、390×844、320×700，以及鼠标 enter/leave、触摸 capture/cancel/lost、键盘接管、Home、暂停恢复、direct、背景/Canvas 失败、减少动态和强制颜色。
