# Kaleidoscope Names 生产 UI 最终验收

- 日期：2026-07-26
- 项目 ID：`kaleidoscope-names`
- 生产标题：`把名字折成同一束光`
- 分类：异步单人惊喜
- 等级：A 级本地直开
- 基线：`69c8e74`
- 分支：`codex/exp-kaleidoscope-names-production-ui`
- Worktree：`/Users/zenith/Desktop/two-of-us-worktrees/kaleidoscope-names-production-ui`
- 结论：**项目范围内 Go，可交给共享目录集成**

## 1. 交付结论

Kaleidoscope Names 已从冻结的纯逻辑核心补齐为生产 UI。准备者离线编辑
`config.js`，体验者稍后单人打开页面，根据两条线索调整六档镜面阶数与 24 格
相位。只有两项 exact 命中后才进入对齐态；体验者还必须主动按“照见我们”，
两枚名字标记、最终标题、留言和署名才会进入 DOM。

生产目录现在包含：

```text
experiences/surprises/kaleidoscope-names/
├── ATTRIBUTION.md
├── README.md
├── app.js
├── config.js
├── index.html
├── logic.js
├── logic.test.js
├── package.json
├── styles.css
└── ui-contract.test.js
```

本分支没有修改 catalog、根门户、分类 README、全局索引、Board、共享运行时、
根依赖清单或锁文件。

## 2. 分阶段提交

| Commit | 内容 |
| --- | --- |
| `7bc0222` | 先冻结生产 UI、本地闭包、隐私和无障碍红测试 |
| `57ff6f0` | 实现语义 HTML、公开视图控制器和阶段私密 DOM |
| `01ad079` | 完成深紫光学台视觉、响应式、README 与借鉴声明 |
| `a8b0aac` | 修复真实 Chrome 中的标题焦点框、组合摘要位置与 Canvas 失败兜底 |
| 最终文档提交 | 本文与最终执行证据 |

每一部分均独立提交。主集成任务可按顺序 cherry-pick，或核对范围后合并整个分支。

## 3. A 级本地直开闭包

入口只使用同目录相对文件：

```text
index.html
  → styles.css
  → config.js
  → logic.js
  → app.js
```

页面使用经典脚本，不使用 module、构建产物、动态 import、CDN、远程字体、远程
图片、第三方运行时、服务端 API、存储或权限。生产静态契约拒绝：

- `fetch`、XHR、WebSocket、EventSource、Beacon、Worker 与 Service Worker；
- localStorage、sessionStorage、IndexedDB、Cookie；
- 摄像头、麦克风、位置、通知、剪贴板和分享权限；
- docs 概念 PNG、HTTP(S) URL 与运行时第三方资产；
- 内联事件、HTML 字符串注入和预埋私密 template。

系统用 Chrome 直接打开了以下文件，并在开放标签清单中观察到正确
`file://` URL 与标题“把名字折成同一束光”：

```text
file:///Users/zenith/Desktop/two-of-us-worktrees/kaleidoscope-names-production-ui/
experiences/surprises/kaleidoscope-names/index.html
```

Chrome 自动化安全策略不允许代理接管 `file://` 标签，因此文件标签只作为直开
入口证据；完整交互、触控、响应式和辅助模式在 localhost 的真实 Chrome 中验收。
静态闭包测试与 localhost 实交互分别证明启动边界与运行行为，不把 localhost
成功冒充为唯一启动方式。

新 worktree 没有自己的 `node_modules`。本轮只复用主 checkout 已安装且被 Git
忽略的普通依赖目录，没有创建符号链接，也没有修改 `package.json` 或
`package-lock.json`。生产作品自身仍是零依赖。

## 4. 状态机、公开视图与私密揭晓

冻结流程为：

```text
intro
  → START
tuning
  → SET_FOLDS / SET_PHASE（任意顺序）
aligned
  → REVEAL
complete
  → RESTART
intro
```

UI 只消费 `logic.getPublicView(state)`：

- 不读取 `targetFolds`、`targetPhase`、距离常量或权威 state 内部字段；
- Canvas 只投影公开 pattern model，不参与命中判断，也不绘制答案或名字；
- 同阶段 SET 原地更新按钮、range、状态和 Canvas，不重建子树，焦点与拖动连续；
- 阶段变化才用 `replaceChildren` 销毁旧阶段节点；
- 最终标题、两枚 marks、留言和署名只在 `createCompletePhase` 中创建。

Chrome 完整走通默认准备者配置：

1. intro 时 marks 数为 0，最终标题、留言、署名均不在 DOM；
2. 开始后默认 `4 面 / 0 格`，两个状态都是“已经贴近”；
3. 折面先选 `5 面`，相位用 `End → 23`、`Home → 0` 和
   `End + ArrowLeft → 22` 验证离散边界；
4. `5 面 / 22 格` 进入 aligned，调参按钮和 range 被物理移除，marks 仍为 0；
5. 主动点“照见我们”后恰出现两个等宽 mark well 与全部最终文案；
6. 点“再折一次”回到 intro，所有私密节点再次被销毁。

另一路径先调相位再选折面，同样进入 aligned，证明 UI 未引入输入顺序依赖。

阶段焦点依次进入 tuning 标题、aligned 主操作、complete 标题和重开后的 intro
标题。完整态程序化标题焦点不再绘制巨型双框，computed style 为
`outline: none`、`box-shadow: none`；按钮和 range 的可见键盘焦点保持不变。

## 5. 输入 Gate

| 输入 | Chrome 证据 | 结果 |
| --- | --- | --- |
| 鼠标 | 六个原生 button、range、揭晓与重开均可操作 | PASS |
| 键盘按钮 | Enter/Space 使用原生 button 行为 | PASS |
| 键盘 range | Home=0、End=23、End+Left=22，焦点保持在 `#phase-range` | PASS |
| 同阶段焦点 | 点击 `5 面` 后活动元素仍是该按钮，没有因重绘丢失 | PASS |
| 真实触控按钮 | CDP touchStart/touchEnd 点 `8 面` 后唯一 pressed 为 `8 面` | PASS |
| 真实触控 range | 在 390×844 上从轨道左端拖到右端，值与 output 均到 23 | PASS |

六个镜面按钮、原生 range 与主操作在所有验收视口中都不小于 48 CSS px。

## 6. 六档响应式矩阵

所有下列视口的 `documentElement.scrollWidth - innerWidth` 都为 `0`。窄屏与短横屏
允许自然纵向滚动，不缩小触控目标或用固定层覆盖控件。

### 调参态

| 视口 | 最小折面按钮 | range | 图案 | 页面高度 |
| --- | ---: | ---: | ---: | ---: |
| 320×568 | 143×52 | 296×48 | 230×230 | 1213 |
| 390×844 | 113×52 | 358×48 | 296×296 | 1204 |
| 768×1024 | 113×56 | 205×48 | 340×340 | 1024 |
| 1280×720 | 67×56 | 299×48 | 680×680 | 858 |
| 1504×1000 | 81×56 | 378×48 | 760×760 | 1000 |
| 844×390 | 153×48 | 324×48 | 296×296 | 525 |

### 完成态

| 视口 | 重开按钮 | 两枚 mark well | 页面高度 |
| --- | ---: | ---: | ---: |
| 320×568 | 296×53 | 各 144×139 | 896 |
| 390×844 | 358×53 | 各 172×178 | 947 |
| 768×1024 | 354×53 | 各 170×157 | 1024 |
| 1280×720 | 360×53 | 各 249×197 | 805 |
| 1504×1000 | 360×53 | 各 296×201 | 1000 |
| 844×390 | 360×53 | 各 215×157 | 577 |

每一视口内两枚 mark well 尺寸一致，完成态恰有两枚标记。

## 7. 无障碍、系统模式与失败降级

### no-JS

禁用脚本并重新加载后：

- 公共标题和公共说明仍可见；
- `noscript` 显示“需要启用 JavaScript”和本地隐私说明；
- button=0、canvas=0、mark=0；
- `data-phase` 不存在，私密最终标题不在正文；
- 横向溢出为 0。

### reduced-motion

`prefers-reduced-motion: reduce` 真实命中，折面按钮 transition 计算为 `0s`；
Canvas 直接绘制静态公开图案，不建立持续动画循环。

### forced-colors

`forced-colors: active` 真实命中：

- Canvas 为 `display:none`；
- CSS fallback opacity 为 `1`；
- 选中折面使用系统 SelectedItem / SelectedItemText；
- 文字状态和不同轮廓继续表达 far / near / exact；
- 横向溢出为 0。

### Canvas 失败

浏览器运行时分别强制：

1. `getContext("2d")` 返回 `null`；
2. 2D context 的 `setTransform` 抛出异常。

两条路径都自动给图案 shell 加上 `is-canvas-fallback`、隐藏 Canvas、显示 CSS
折光环；按钮、range、阶段与私密边界仍正常。恢复浏览器 API 并再次调整后，
Canvas 自动恢复。延迟绘制还检查 render generation 与 `canvas.isConnected`，
旧阶段 RAF 不会写入已销毁节点。

最终 Chrome console 的 error/warning 列表为空。

## 8. 请求、存储与权限边界

localhost 重载的页面资源只包括同源本地：

- `styles.css`
- `config.js`
- `logic.js`
- `app.js`

浏览器还按默认行为探测了同源 `/favicon.ico`；它不是生产代码发起的外部请求，
没有进入作品目录，也不影响 `file://` 直开。生产 HTML、CSS、JS 没有外部
HTTP(S) URL，也没有运行时网络 API。

静态契约同时证明零 Web Storage、零 Cookie、零 URL 私人参数、零 Worker、
零设备/媒体权限。重开后状态只回到内存初态，不保留上一轮数据。

## 9. 视觉 fidelity ledger

最终浏览器截图与两张已确认概念图在同一 QA pass 中对照。概念 PNG 只位于
`docs/assets`，生产目录没有引用、裁切、描图或采样。

| 视觉锚点 | 概念目标 | 生产实现与取舍 |
| --- | --- | --- |
| 氛围 | 深紫光学校准台 | 锁定 `#171326` 背景、象牙文字、青绿/珊瑚/琥珀/薰衣草光路 |
| 桌面结构 | 左控制、右大圆镜 | 保留双栏，六键、range、两轴状态与组合摘要在左，图案在右 |
| 移动结构 | 图案先叙事，再出现私密结果 | complete 依次为公共标题、图案、最终标题、双 marks、留言、署名、重开 |
| 光学图案 | 圆形刻度与对称光带 | 使用公开整数模型驱动的原创 Canvas 三层路径；不复制生成式纹理 |
| 状态表达 | 近似与对齐清晰但不泄题 | far/near/exact 同时使用文字和不同轮廓，不提供方向或距离 |
| 私密揭晓 | 两枚名字标记等权呈现 | 两枚等宽 mark well，只有 REVEAL 后创建 |
| 交互密度 | 克制、无多余导航 | 没有设置、分数、倒计时、音效、上传、分享或虚构仪表 |

规格优先于概念图的两项有意偏差：

- intro 不预先创建 Canvas，因为 intro 公开 DTO 没有 pattern；
- tuning 不伪造额外公共说明，只渲染公开 DTO 已提供的线索、状态与 summary。

## 10. 借鉴与来源声明

本作没有参考任何开源万花筒项目，也没有复制第三方代码、图片、字体、图标、
纹样、文案或品牌。二维校准玩法、2520 整数圈、状态机、Canvas 图案、DOM、CSS
与测试均为本仓库独立实现，运行时第三方依赖为 0。

`README.md` 与 `ATTRIBUTION.md` 已明确记录：

- WHATWG Canvas 与 Range state：只校准平台能力边界；
- W3C Pointer Events Level 3：只校准输入边界；
- WCAG 2.2 / WAI：只校准键盘、状态、目标尺寸、动效和闪烁 Gate；
- Media Queries Level 5：只校准 reduced-motion 语义；
- W3C 文档保留原始版权与 W3C Software and Document License；
- 若未来参考开源项目，必须先固定 commit/tag、LICENSE、版权人、实际借鉴与
  未复制范围。

两张 docs 概念图只作内部设计对照，不是运行资产或第三方来源。

## 11. 自动化门禁

定向检查：

```text
node --check experiences/surprises/kaleidoscope-names/config.js
node --check experiences/surprises/kaleidoscope-names/logic.js
node --check experiences/surprises/kaleidoscope-names/app.js
node --test experiences/surprises/kaleidoscope-names/logic.test.js \
  experiences/surprises/kaleidoscope-names/ui-contract.test.js

tests 35
pass 35
fail 0
```

全仓测试：

```text
npm test

tests 2388
pass 2388
fail 0
duration_ms 49259.274
```

仓库验证：

```text
npm run verify

仓库验收通过：66 个作品入口（58 个 A 级直开、8 个非 A 启动器）、
1 个能力声明、资源与借鉴声明完整。
```

`git diff --check` 与范围审计均通过。

## 12. 缺陷与沉淀

本轮真实 Chrome 验收发现并修复一组同根可见性问题：

- `bugs/kaleidoscope-names-browser-fidelity.md`
  - 程序化聚焦标题误用交互控件双层焦点框；
  - 组合摘要被大图题注带到低视口首屏之外；
  - 同次增加 Canvas 断连和完整绘制异常降级。

修复提交为 `a8b0aac`，定向契约和真实 Chrome 都已回归。

既有四条非视觉核心问题仍已修复且测试保持通过：

- `bugs/kaleidoscope-names-function-freeze-cycle.md`
- `bugs/kaleidoscope-names-phase-display-offset.md`
- `bugs/kaleidoscope-names-frozen-content-canonicalization.md`
- `bugs/kaleidoscope-names-standard-reference-drift.md`

本轮没有形成超出既有项目文档、核心沉淀和上述 bug 记录的新通用方法，因此没有
为了填充目录而新增 `learn/`。

## 13. 集成 Runbook

共享集成任务完成 catalog 与入口登记后，执行：

```bash
node --check experiences/surprises/kaleidoscope-names/config.js
node --check experiences/surprises/kaleidoscope-names/logic.js
node --check experiences/surprises/kaleidoscope-names/app.js
node --test experiences/surprises/kaleidoscope-names/logic.test.js \
  experiences/surprises/kaleidoscope-names/ui-contract.test.js
npm test
npm run verify
```

随后从 catalog 打开项目，复核：

1. 入口仍指向项目自己的 `index.html`；
2. catalog 描述保持“准备者配置、体验者单人揭晓”，不误写为实时双人；
3. 打包或发布流程没有把 docs 概念 PNG 复制进生产目录；
4. `file://` 直开、localhost、六视口和私密阶段 DOM 边界仍成立。

当前分支项目范围内没有剩余功能 Gate；只等待上层共享目录集成。
