# Love Tree clean-room 重制：实施计划

> 当前执行范围：仅完成设计前置与视觉概念
> 生产实现：必须等待用户视觉确认
> 基线：`f51c884`
> 工作分支：`codex/exp-love-tree-clean-room`

## 1. 计划原则

1. **先确认视觉，再写生产代码。**
2. **只保留可观察体验目标，不接触旧业务源码。**
3. **每完成一个独立部分就验证并提交一次。**
4. **新实现验证通过前不删除旧实现。**
5. **功能替换与历史文件清理分开提交。**
6. **任何新开源借鉴都先核对许可证，再写归属声明。**
7. **直接打开、离线运行、零运行时第三方依赖是硬约束。**

## 2. 已完成的前置阶段

### 阶段 A：行为边界与 brainstorm

输出：

- `docs/366-love-tree-clean-room-brainstorm.md`

验证：

- 仅从目录、README、预览图和黑盒画面提取体验目标；
- 没有读取旧 `index.html`、`renxi/*.js` 或 `renxi/*.css`；
- 没有修改生产目录；
- 明确推荐“暮蓝纸雕花园”方向。

提交：

- `2fbb307 docs: brainstorm love tree clean-room rewrite`

### 阶段 B：产品与技术规格

输出：

- `docs/367-love-tree-clean-room-spec.md`

验证：

- 明确状态机、配置、离线、响应式、无障碍和性能标准；
- 明确默认静音与本地 Web Audio 边界；
- 明确归属和迁移清理约束；
- 没有修改生产目录。

提交：

- `e0085fe docs: specify love tree clean-room experience`

## 3. 当前阶段：视觉概念

### 阶段 C1：桌面初始态

目标：

- 展示暮蓝舞台、唯一心形入口、标题和静音状态；
- 证明初始画面足够克制；
- 不包含导航、卡片、设置面板或旧版布局。

输出候选：

- `docs/assets/love-tree-clean-room/concept-01-desktop-idle.png`

检查：

- 心形入口是否是第一视觉焦点；
- 标题和按钮是否适合代码原生排版；
- 是否与旧版米白底构图有明显区隔；
- 生成图中的文字只作为布局提示，不作为生产资产。

### 阶段 C2：桌面盛放与揭晓态

目标：

- 展示完整心形花冠；
- 展示树下展开的暖色信件和共同时间；
- 验证“盛放高潮 → 阅读收束”的信息层级。

输出候选：

- `docs/assets/love-tree-clean-room/concept-02-desktop-reveal.png`

检查：

- 树冠自然但能读出心形；
- 信件与场景融合，不像通用模态框；
- 正文区域有足够对比度和行长；
- 计时存在但不抢过情书。

### 阶段 C3：桌面生长中间态

目标：

- 展示从地面长出的枝干与部分花瓣；
- 验证中间态本身有美感，不依赖最终成图；
- 给未来程序化动画提供层次参考。

输出候选：

- `docs/assets/love-tree-clean-room/concept-03-desktop-growing.png`

检查：

- 主干、主枝、细枝与花瓣出现顺序可推导；
- 枝杈不机械对称；
- 动画空间不会撞到文案安全区。

### 阶段 C4：移动端最终态

目标：

- 展示 390 × 844 比例下的心形花冠、信件与重播入口；
- 验证揭晓后纵向阅读结构；
- 避免把桌面图直接等比缩小。

输出候选：

- `docs/assets/love-tree-clean-room/concept-04-mobile-reveal.png`

检查：

- 44 px 触控目标可实现；
- 树冠仍是场景中心；
- 信件正文可在窄屏阅读；
- 顶部安全区和底部滚动空间合理。

### 阶段 C5：概念说明与提交

输出：

- `docs/assets/love-tree-clean-room/README.md`
- 四张概念图；
- 每张图对应的提示词摘要、用途、非生产声明和确认问题。

验证：

- 使用图像查看工具逐张人工检查；
- 图像文件可读取、尺寸合理；
- `git diff --check`；
- `git status --short` 只包含预期概念资产；
- 生产目录无变化。

提交建议：

- `design: add love tree clean-room visual concepts`

### 视觉确认门

将四张概念图展示给用户，并明确询问：

1. 整体方向是否通过；
2. 花冠是保持自然轮廓，还是强化心形；
3. 信件是保留“树下展开”，还是改为直接浮现；
4. 桌面和手机布局是否通过；
5. 声音开关是否应保持现在的低存在感位置。

**没有用户明确确认，不执行后续任何生产实现步骤。**

## 4. 用户确认后的未来实施阶段

以下内容是后续计划，不属于当前回合授权的实现范围。

### 阶段 D：建立原创骨架

文件：

- 重写 `experiences/surprises/love-tree/index.html`
- 新建 `experiences/surprises/love-tree/styles.css`
- 新建 `experiences/surprises/love-tree/app.js`

工作：

- 建立语义化页面结构；
- 实现配置对象；
- 实现 `idle → growing → blooming → revealing → complete` 状态机；
- 保持所有文本为 HTML；
- 暂时使用简单几何树验证流程，不追求最终视觉。

验证：

- 直接 `file://` 打开；
- 点击、Enter、Space 都能开始；
- 状态只能按合法顺序前进；
- 连续重播 3 次无计时器或状态叠加；
- Chrome 控制台无阻断性错误。

提交建议：

- `feat: build love tree clean-room state flow`

### 阶段 E：原创程序化树木

文件：

- 修改 `app.js`
- 可能新增纯原创的绘制模块文件

工作：

- 从零设计确定性分支数据结构；
- 使用 Canvas 或内联 SVG 绘制树干、枝杈与花瓣；
- 实现视口缩放和 DPR 上限；
- 实现 `requestAnimationFrame` 时间线；
- 实现重播时资源清理。

clean-room 约束：

- 不读取旧绘制函数；
- 不模拟旧参数；
- 不从旧截图测量坐标后复刻；
- 如参考公开算法资料，先确认许可证或只使用不可版权化的通用数学思想，并在归属文件说明。

验证：

- 三种视口尺寸；
- 生长首帧反馈小于 100 ms；
- 动画暂停/恢复不出错；
- 重播 3 次结果稳定；
- 低性能模式仍能完成。

提交建议：

- `feat: animate an original procedural love tree`

### 阶段 F：视觉系统与响应式

文件：

- 修改 `styles.css`
- 必要时新增经确认的本地装饰资产

工作：

- 从用户批准的概念图提取设计系统；
- 落地夜幕、树冠、地面光晕与信件排版；
- 实现桌面、平板、手机布局；
- 实现 200% 缩放与安全区；
- 所有文字和控件均代码原生。

验证：

- Chrome 桌面视口；
- Chrome 390 × 844 视口；
- 360 × 640 最小目标；
- 横屏；
- 200% 缩放；
- 与批准概念并排比较，而不是与旧页面比较。

提交建议：

- `feat: style love tree across desktop and mobile`

### 阶段 G：低动态与无障碍

工作：

- 实现 `prefers-reduced-motion`；
- 完成焦点样式、实时状态文本和装饰图形隐藏；
- 检查对比度和触控尺寸；
- 保证信件可复制、可缩放、可被辅助技术读取。

验证：

- 全键盘流程；
- 低动态流程；
- DOM 快照中的标题、按钮、信件层级；
- 颜色不是唯一状态信号。

提交建议：

- `feat: make love tree accessible and motion-aware`

### 阶段 H：本地合成声音

工作：

- 实现默认关闭的声音开关；
- 用户手势后创建 Web Audio；
- 设计低音脉冲和盛放和弦；
- 关闭时淡出并释放节点；
- Web Audio 不可用时优雅降级。

验证：

- 初次打开没有声音；
- 开启前没有自动播放；
- 关闭后不再发声；
- 重播不叠加节点；
- 禁用 Web Audio 时核心体验正常。

提交建议：

- `feat: add optional local synthesized sound`

如果用户认为声音没有必要，可整体跳过阶段 H，不影响完成标准。

### 阶段 I：配置、文档与归属

文件：

- 更新 `README.md`
- 新建或更新 `ATTRIBUTION.md`
- 更新配置说明

工作：

- 说明如何修改称呼、情书和纪念日起点；
- 说明直接双击与启动脚本两种方式；
- 写明默认静音和重播；
- 写明 clean-room 边界；
- 逐项记录视觉资产与任何开源借鉴。

验证：

- 按 README 从一份干净副本完成个性化；
- 无真实个人数据；
- 所有链接和许可证文本可追溯；
- 文档与实际行为一致。

提交建议：

- `docs: document love tree personalization and attribution`

### 阶段 J：入口与全仓验证

工作：

- 检查目录入口仍指向正确文件；
- 跑仓库 catalog / lint / test / build 等现有检查；
- 用 Chrome 完成桌面与手机全流程；
- 断网或网络请求检查；
- 检查控制台；
- 检查 `file://` 直接打开。

验证命令以仓库当时脚本为准，至少包括：

```bash
node scripts/validate-catalog.mjs
npm test
npm run build
```

若仓库没有对应脚本，记录实际可用的替代验证，不编造命令。

提交建议：

- `test: verify love tree offline launch contract`

### 阶段 K：旧依赖清理

前置条件：

- 新版全部验收通过；
- 用户已确认替换；
- 全仓引用扫描完成；
- 当前分支和 worktree 再次核对。

计划移除：

- `experiences/surprises/love-tree/renxi/` 中的旧 jQuery、Jscex、样式与业务脚本；
- `experiences/surprises/love-tree/renxi.mp3`；
- `archive/source-packages/html5-love-original.rar`。

工作：

1. 用 `rg` 搜索所有旧路径引用；
2. 输出待删除清单；
3. 确认没有其他体验依赖；
4. 使用精确文件路径删除，不使用 `rm -rf`；
5. 更新归属、README 和归档清单；
6. 重跑阶段 J 的全部验证。

提交建议：

- `chore: remove legacy love tree dependencies`

此清理提交不得与功能代码混在一起，方便审查和必要时单独回退。

## 5. 提交序列

计划中的最小提交序列：

| 顺序 | 阶段 | 提交目的 |
|---:|---|---|
| 1 | Brainstorm | 固化方向与 clean-room 边界 |
| 2 | Spec | 固化可验收需求 |
| 3 | Plan | 固化实施与提交策略 |
| 4 | Visual concepts | 提交完整视觉讨论材料 |
| 5 | State flow | 建立原创页面骨架 |
| 6 | Procedural tree | 完成原创绘制与动画 |
| 7 | Responsive visual system | 落地批准的视觉 |
| 8 | Accessibility | 完成键盘与低动态 |
| 9 | Optional audio | 完成本地合成音或明确跳过 |
| 10 | Docs and attribution | 完成个性化和借鉴声明 |
| 11 | Verification | 固化离线和浏览器验收 |
| 12 | Legacy cleanup | 移除旧依赖与压缩包 |

任何阶段若出现阻断 bug：

- 先记录到 `bugs/`；
- 修复与对应阶段一起或单独提交；
- 记录复现、原因、修复和验证；
- 不带着已知阻断问题进入下一阶段。

任何可复用的技术沉淀：

- 记录到 `learn/`；
- 重点记录 clean-room 工作法、可重播动画资源清理、直接 `file://` 的限制、Canvas / SVG 响应式和 Web Audio 用户手势要求；
- 不记录凭据、个人文案或隐私信息。

## 6. 借鉴声明执行方法

当前计划没有选择新的开源实现。

未来若需要参考，必须在编码前建立借鉴记录：

```text
项目：
作者：
原始 URL：
许可证：
许可证 URL：
借鉴内容：
未复制内容：
独立改写：
涉及文件：
```

禁止使用：

- 无许可证仓库；
- 仅有在线演示、没有来源说明的代码；
- 商业音乐或字体；
- 需要联网才能运行的素材；
- 与旧 `html_lovetree` 同源但换皮的镜像仓库。

## 7. 风险与回退

| 风险 | 预防 | 回退 |
|---|---|---|
| 视觉确认后程序化树难以接近概念 | 概念按可用 Canvas / SVG 的层次生成 | 减少花瓣细节，不改信息架构 |
| 手机性能不足 | 粒子上限、DPR 上限、低动态模式 | 退化为分阶段淡入 |
| `file://` 限制模块或资源读取 | 避免 `fetch`，优先普通脚本与内联资源 | 合并为少量本地文件 |
| 重播叠加资源 | 单一状态机和集中清理 | 重播时重建舞台实例 |
| 授权边界混淆 | 独立归属文件和不读取旧源码 | 停止实现，重新审计 |
| 删除旧文件误伤其他体验 | 全仓引用扫描、清理独立提交 | 不执行清理，保留旧文件 |

## 8. 当前停点

本回合完成视觉概念并提交后即停止。

向用户展示：

- 四张概念图绝对路径；
- brainstorm、spec、plan 和概念提交 SHA；
- 图像检查结果；
- 生产目录未修改的验证；
- 五个视觉确认问题。

**必须等待用户明确确认视觉方向后，才能开始阶段 D；没有确认即视为未授权实现。**
