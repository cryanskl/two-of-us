# 在雾上，写给你

一个可以从 `file://` 直接打开的双阶段雾窗手写惊喜：先自由写下一点什么，再沿自己的笔迹走一遍；找回足够多的露珠锚点后，窗内才会出现信件。

## 直接使用

1. 双击 `index.html`，或把它拖进浏览器。
2. 选择“开始写”，在雾窗上写一个字、符号或简单图形。
3. 达到最低笔迹范围后选择“就写到这里”。
4. 沿原来的笔迹再走一遍；找回 80% 锚点后会打开信件。

不方便使用指针时，可以用 Tab 移到“不方便手写，直接打开”，键盘也能抵达同一个完成态。

## 修改给对方的话

打开 `config.js` 修改标题、引导语、默认结语和署名。`composeFogWindowLetter(view)` 是唯一的个性化扩展点，可以根据笔画数、形态或完成方式返回不同结语；保持返回纯文本即可。

页面使用 `textContent` 写入动态文案，不把个性化内容当作 HTML 解析。完成前，信件标题、正文、署名与“再写一次”按钮不会创建在页面 DOM 中；重开时这些节点会被删除。

这只是浏览时的渐进揭晓，不是加密：能读取本地 `config.js` 源码的人仍然可以看到结语。若内容需要真正保密，请不要把明文放进静态 HTML/JavaScript 项目。

## 离线与隐私

- 零运行时依赖、零外链、零 `fetch`，不需要安装或构建。
- 窗景图片、图标、样式和脚本都在本目录内。
- 不使用 localStorage、IndexedDB、Cookie、剪贴板、上传、下载或分享接口。
- 刷新、关闭页面或选择“再写一次”都会丢弃当前笔迹。
- 两层 Canvas 仅负责视觉；状态与完成判定由纯逻辑层维护。

## 无障碍与降级

- 所有非手写操作都是原生按钮，焦点样式清晰，触控目标至少 48px 高。
- 页面保留一个稳定的 `aria-live` 状态区，只播报阶段、门槛差距、每 10% 追踪进度和完成事件，不播报每个坐标点。
- `prefers-reduced-motion` 下停用露珠呼吸动画；`forced-colors` 下用系统颜色、边框和文字表达状态。
- 如果任一 Canvas 2D context 不可用，交互面会停用，但“直接打开”仍可使用。
- `blur`、页面隐藏、Escape 或超长动画帧会进入暂停；`pointercancel` 与 `lostpointercapture` 只结束当前一笔，不抹掉已有内容。

## 文件说明

- `config.js`：可编辑文案与完成结语函数。
- `logic.js`：纯状态机、门槛、锚点与完成判定。
- `app.js`：DOM、Pointer Events、Canvas 绘制与页面生命周期适配。
- `logic.test.js`：可重复的逻辑与输入回放测试。
- `assets/window-evening.jpg`：本项目生成的本地夜景窗外底图。
- `ATTRIBUTION.md`：研究参考、素材来源与不复制声明。

## 验证

在仓库根目录运行：

```sh
node --check experiences/surprises/fog-window-letter/app.js
node --test experiences/surprises/fog-window-letter/logic.test.js
npm test
```

完整视觉与交互验收覆盖 320×700、390×844、1280×800，另检查减少动态、强制颜色、键盘直达、暂停恢复、Pointer capture 丢失和离线 Network 0。
