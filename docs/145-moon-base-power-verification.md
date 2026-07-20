# “月面，保持有光”验收记录

- 日期：2026-07-20
- 作品：`experiences/co-op/moon-base-power/`
- 等级：A（经典脚本、纯本地资源、零运行依赖、零网络、零存储、零随机）
- 对应调研：[141-moon-base-power-research.md](./141-moon-base-power-research.md)
- 对应规格：[142-moon-base-power-spec.md](./142-moon-base-power-spec.md)
- 视觉冻结：[143-moon-base-power-design.md](./143-moon-base-power-design.md)
- 分步计划：[144-moon-base-power-plan.md](./144-moon-base-power-plan.md)

## 1. 结论

作品已完成为单设备双人非对称合作谜题：电源席控制太阳能、蓄电池和联络方向，负载席安排氧气、照明和通信；三班分别只有一个安全向量，双方要连续稳定 90 tick 才能交班。最终页面可从 50 项统一门户或作品目录打开，三班真实摘要和“留给彼此的话”在完成态一次性出现。

真实浏览器再次完成了第一班全键盘、第二班全点击、第三班 radio 焦点下混合键盘/点击的生产路径，并复验暂停/恢复、1440/390/320 三档几何和统一门户。浏览器安全策略不允许自动导航 `file://`，因此未绕过该限制；A 级直开由经典相对脚本、纯本地资源、无运行时 API 和目录静态 Gate 证明，仍保留一次人工双击 Gate。

## 2. 实现简报

- `levels.js`：三班整数供给、负载、容量、端口与唯一目标；
- `config.js`：默认双席、短句清洗和只接收冻结完成摘要的结语策略；
- `logic.js`：严格状态、双母线 evaluator、有序故障码、平局决策表、30Hz/90 tick、暂停和平台键盘分类；
- `logic.test.js`：28 项规则、324 状态/班穷举、唯一解、畸形输入、时间分组与原生事件形态；
- `index.html` / `styles.css` / `app.js`：经典脚本、阶段 DOM、原生按钮/radio/progress、固定步 accumulator、可见性保护和响应式控制台；
- `assets/control-room-background.png` / `favicon.svg`：ImageGen 源稿的逐字节运行副本与原创双母线图标；
- `README.md` / `ATTRIBUTION.md`：直开说明、NASA 事实边界、三份固定开源来源和完整零复制声明。

## 3. 自动检查

最终执行：

```sh
node --check experiences/co-op/moon-base-power/app.js
node --test experiences/co-op/moon-base-power/logic.test.js
node --test shared/runtime/catalog.test.js
npm test
npm run verify
git diff --check
```

结果：

- 作品逻辑：28 / 28 通过；
- 目录与静态 Gate：77 / 77 通过；
- 全仓：1310 / 1310 通过，0 失败；
- `verify`：50 个作品入口、1 个能力声明通过；
- `git diff --check`：通过。

三班分别枚举 324 个原始组合，安全解计数为 `[1, 1, 1]`。目录 Gate 固定脚本顺序、零远程 URL、零网络/存储/随机/共享运行时、48px/reduced-motion/forced-colors 声明、四个上游对象 ID、ImageGen 零复制边界，并逐字节比较运行背景和文档源稿。

## 4. 浏览器生产路径

使用 Codex 内置 Browser/IAB，通过 `http://localhost:4173/` 加载同一套生产文件：

1. 进入第一班，用 `A / S / J / K / L` 完成安全向量，连续稳定至 90 / 90；
2. 第二班全部点击按钮与 radio，完成第二个唯一向量；
3. 第三班先点击“氧气 R”，在该 radio 保持焦点时按 `L` 接通通信，再点击“照明 L”并在其焦点上按 `D` 选择 `L→R`；
4. 终局 DOM 显示三条真实摘要：两班联络断开，第三班 `L→R` 转移 1，且只有“重新值班”和“返回目录”；
5. operating 手动暂停后稳定窗停止，继续值班不会补算暂停时间；
6. 初始缺供/未接故障在页面可读，其余联络方向、容量、禁止端口、欠供和过载由纯 evaluator 测试覆盖；
7. 运行时重启后门户显示“50 个体验”，新卡片唯一且指向本地入口；
8. 最终页面控制台 0 warning / 0 error，页面资源均来自同一本地入口。

## 5. 响应式与可访问性

| 视口 / 阶段 | 实测结果 |
| --- | --- |
| 1440×900 operating | `scrollWidth = clientWidth = 1440`；`scrollHeight = clientHeight = 900`；完整双母线、故障、稳定窗与双席同屏 |
| 390×844 operating | `scrollWidth = clientWidth = 390`；页面高 1777，可自然纵向滚动；首屏露出标题、班次、完整双母线和部分负载；最小按钮 48px |
| 320×700 operating | `scrollWidth = clientWidth = 320`；页面高 1844；body 16px；最小按钮 48px；两席顺序可滚动到达 |
| 1440×900 complete | `scrollWidth = clientWidth = 1440`；`scrollHeight = clientHeight = 900`；三班摘要、共享留言和主动作完整可见 |

- 控制使用原生 button、radio、progress 和 live status；颜色之外还有 BUS L/R、箭头、故障文字和数值；
- `:focus-visible` 保留高对比轮廓，radio 获焦不再屏蔽另一席快捷键；
- `prefers-reduced-motion` 只关闭表现动画，权威 90 tick 不变；forced-colors 会移除背景图并回到系统色；
- 背景图失败仍保留深色底、边框、文字和全部原生控制，玩法不依赖图片；
- 本轮没有在 IAB 中仿真 forced-colors、资源阻断或 200% 文本缩放，这三项保留为人工设备 Gate。

## 6. 概念与最终截图

同一最终 QA 轮次使用 `view_image(detail=original)` 查看三张冻结概念和三张最终实装：

| 文件 | 实际格式与尺寸 | SHA-256 |
| --- | --- | --- |
| `qa-desktop-operating.jpg` | JPEG，1440×892 | `e7ecdc3625cc7a1d7bce018cd891fbe560044eede73b287176a19f9c6e604dcc` |
| `qa-mobile-operating-390.jpg` | JPEG，390×844 | `bef5b13fcd223e3dfb6818176ce53f3cb297912deb301362031fa314b6cdffb1` |
| `qa-desktop-complete.jpg` | JPEG，1440×892 | `93d423ea454447ad3b0108f6c33b3184ba14d0d772fe5a1e9a82f6ff976956c7` |

浏览器截图接口返回 JPEG 字节；文件按真实魔数命名，没有转码。桌面视口计算高度为 900，截图内容区为 892px，这是 IAB 顶层捕获边界，不作为页面少 8px 的判断依据。

## 7. fidelity 账本

| 对照点 | 结果 | 证据 / 偏差 |
| --- | --- | --- |
| 安静顶部栏、大标题与副题 | 忠实 | 桌面和移动都保持返回入口、C08、标题和一行合作语义，没有额外 badge |
| 双母线是视觉中心 | 忠实 | BUS L/R、供给、需求、余量、联络方向和三条负载在同一控制台内同时可读 |
| 黄铜 / 青绿双席同权 | 忠实 | 电源席与负载席同层级、同宽，移动端按文档流上下重排 |
| 连续稳定窗 | 忠实 | 原生 progress 与 `0 / 90`、故障提示同屏，完成摘要固定为 `90 / 90` |
| 月面控制室气氛 | 忠实 | 深墨蓝、象牙、黄铜、低对比月面背景成立；没有粉色渐变或赛博霓虹 |
| 完成态三班记录 | 忠实且更可信 | 生产页显示三个真实安全向量；拒绝概念中伪造的时间、百分比和重复“第一班” |
| “留给彼此的话” | 忠实 | 冻结标题和共享结语只在终局出现，不提前泄露 |
| 物理仪表与拨杆 | 有意简化 | 概念的假指针表、装饰开关和生成图标改为语义 HTML、明确数字和原生控制 |
| 移动首屏与长页 | 忠实 | 390 首屏包含标题、班次、双母线与故障入口；双席继续向下滚动，不横向压缩 |
| 金属装饰密度 | 有意简化 | 背景保留控制室框架，DOM 只保留规则需要的面板，避免卡片和铆钉喧宾夺主 |

## 8. 首屏文案 diff

- desktop operating 最终只保留：返回双人合作、C08、标题、副题、班次、任务说明、维护限制、暂停、供需/联络、故障、稳定窗和双席控制；
- mobile operating 使用同一文案，不增加移动专属教程；通过重排让标题、班次、双母线和稳定反馈在首屏连续出现；
- complete 最终只保留三班摘要、“留给彼此的话”、共享结语、“重新值班”和“返回目录”；
- 拒绝概念图中的假时间、假 100%、错误重复班次、生成式按钮文字、未经模型定义的仪表说明；
- 没有新增排行榜、统计、主题切换、账号、分享、远程保存或公网文案。

## 9. 借鉴、bugs 与 learn

`ATTRIBUTION.md` 固定 PipeWalker `72c4cfa...`、Grid2Op `a173688...`、Power Overload annotated tag object `94d188c...` 与解引用 commit `8d61811...`，逐项写明许可证、权利主体、只研究范围和未复制范围；NASA 仅提供非专属背景事实。页面不运行、打包或复制上述项目的源码、参数、关卡、测试、截图、图标、音效、字体或文案。

本轮记录并解决：annotated tag 元数据、手动暂停枚举、WebP 编码器缺失、原生 KeyboardEvent、radio 焦点快捷键、暂停目标高度和桌面首屏溢出。可复用结论见 [约束网络合作题：守恒、穷举、连续窗与平台事件边界](../learn/2026-07-20-constrained-network-puzzle-and-platform-events.md)。

## 10. 发布判断

作品达到逻辑唯一解、A 级静态边界、统一门户、三班生产动作、暂停恢复、响应式、触控尺寸、控制台、视觉对照、来源声明和 bugs/learn 的当前发布标准。保留的人工 Gate 是：真实 `file://` 双击、forced-colors、背景阻断和 200% 文本缩放；它们没有被自动化限制掩饰成已通过。

