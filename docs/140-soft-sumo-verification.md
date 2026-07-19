# “软软相扑”验收记录

- 日期：2026-07-19
- 作品：`experiences/versus/soft-sumo/`
- 等级：A（纯静态、零运行依赖、零网络、零存储、零随机）
- 对应调研：[136-soft-sumo-research.md](./136-soft-sumo-research.md)
- 对应规格：[137-soft-sumo-spec.md](./137-soft-sumo-spec.md)
- 视觉冻结：[138-soft-sumo-design.md](./138-soft-sumo-design.md)
- 分步计划：[139-soft-sumo-plan.md](./139-soft-sumo-plan.md)

## 1. 结论

作品已完成为单设备双人三轮对抗：双方转向、按住蓄力、松开冲刺，以整数 60 tick/s 固定步处理缩圈、双体碰撞和同 tick 原子出圈；暂停会取消蓄力并写入可重放控制事件，恢复前重新倒数。页面可从 49 项统一门户或作品目录打开，不依赖服务器、共享运行时或第三方包。

真实浏览器已覆盖入口、开始、倒计时、playing、手动暂停、继续比赛、1280/390/320 三档布局和控制台。IAB 不允许导航 `file://`，其 locator 也没有可靠产生“保持按下”的原生 Pointer 序列，因此不把完整浏览器三轮、真实触屏 `pointercancel`、200% 文本缩放写成已通过；这些缺口不由逻辑测试冒充。

## 2. 实现简报与文件

- `config.js`：双席名字、界面短句和只接收冻结终局摘要的结语策略；
- `logic.js`：严格 reducer、整数方向表、缩圈、等质量冲量、原子出圈、三轮派生比分和轮/整场重放；
- `logic.test.js`：27 项规则、不变量、镜像、公平、暂停与 golden replay；
- `index.html` / `styles.css` / `app.js`：语义 DOM、经典脚本、双键区、并发 Pointer 映射、固定步 accumulator、暂停保护与响应式投影；
- `assets/arena-background.webp` / `token-atlas.webp` / `favicon.svg`：原创生成场地、透明棋子图集和独立 SVG；
- `README.md` / `ATTRIBUTION.md`：直开方式、降级边界、固定参考 commit、许可证与零复制声明。

## 3. 自动检查

最终执行：

```sh
node --check experiences/versus/soft-sumo/app.js
node --test experiences/versus/soft-sumo/logic.test.js
node --test shared/runtime/catalog.test.js
npm test
npm run verify
git diff --check
```

结果：

- 作品逻辑：27 / 27 通过；
- 目录与静态 Gate：75 / 75 通过；
- 全仓：1280 / 1280 通过，0 失败；
- `verify`：49 个作品入口、1 个能力声明通过；
- `git diff --check`：通过。

目录 Gate 固定经典脚本、零远程 URL、零网络/存储/随机/共享运行时、两种重放 API、Pointer 取消路径、生产素材和三份固定借鉴 commit。

## 4. 浏览器路径与指标

使用 Codex 内置 Browser/IAB，通过 `http://localhost:4173/` 加载同一套生产文件：

1. 1280×720 点击“开始第一轮”，2.5 秒倒数后进入 playing；
2. playing 中暂停，DOM 只保留“继续比赛”，状态播报为“比赛已暂停。”；
3. 点击继续，1.5 秒保护倒数后回到 playing；
4. 重启目录服务后，门户显示 49 个体验，《软软相扑》链接唯一且指向本地入口；
5. 页面与门户控制台均为 0 warning / 0 error。

| 视口 / 阶段 | 实测结果 |
| --- | --- |
| 1280×720 playing | `scrollWidth = clientWidth = 1280`；场地单圆；暂停 48px；六控制 52–58px；页面高 761，可纵向滚动 |
| 390×844 intro | 场地 359×359；两枚出生棋子可见；开始按钮 48px；无横向溢出 |
| 320×700 intro | 场地 294×294；开始按钮 48px；`scrollWidth = clientWidth = 320`；页面高 711 |
| 320×700 playing | 暂停 62px；六控制 52–56px；第二席位于文档流下方可达；无横向溢出 |

IAB 安全策略拒绝 `file://`，没有绕过。A 级直开由相对经典脚本、本地资源、零 module/fetch/XHR/WebSocket/存储/Worker、目录静态 Gate 和仓库验收共同证明。真实设备仍应补测多指并发、`pointercancel` / `lostpointercapture`、200% 文本、forced colors 和完整三轮 UI。

## 5. 可访问性与降级

- 双席控制都是带席位名的原生按钮，比分、回合、蓄力为语义文本/进度条，状态使用 live region；
- 身份由名字、01/02、固定左右位置、斜纹/点纹和色彩共同表达；方向由图集缺口、CSS 箭头与控制文字共同表达；
- 所有已测阶段动作与六个控制至少 48px；`:focus-visible` 有明确轮廓；
- `prefers-reduced-motion` 只取消表现过渡，不改变固定 tick；
- 静态审计确认 forced-colors 移除生产图、图片失败保留 CSS radial 场地和 CSS 棋子身份；这两项本轮未做浏览器模式仿真；
- `pointercancel` / 活跃的 `lostpointercapture` 会先释放映射再安全暂停，普通 `pointerup` 后的 lost 事件幂等；VM 与逻辑路径通过，真实触屏仍待补测。

## 6. 概念、截图与原生尺寸

冻结概念：

- `desktop-playing-concept.webp`：1586×992；
- `mobile-playing-concept.webp`：853×1844；
- `desktop-result-concept.webp`：1586×992。

最终实装：

- `verification-desktop-playing.jpg`：1280×720，SHA-256 `442c438c6bd372847c9a878bf2638ea7ef293fed080f8cff25eb8c725a5828fd`；
- `verification-mobile-intro.jpg`：320×700，SHA-256 `bcd597dfac2414f53128ff1cb1861124b0bfb0a8cee1f897df734bf04844a8d3`。

同一最终 QA 轮次用 `view_image(detail=original)` 查看三张概念和两张实装。浏览器虽请求 PNG，落盘魔数实际为 JPEG；文件已按真实格式改为 `.jpg`，没有转码或伪装证据。

## 7. fidelity 账本

| 对照点 | 结果 | 证据 / 偏差 |
| --- | --- | --- |
| 单一中央编织圆场 | 忠实 | 生产背景只裁入 `.arena-frame`；真实截图不再出现圆场套圆场 |
| 标题、0–0、1/3 层级 | 忠实 | 桌面压成一条紧凑比分栏；移动保持标题→比分→回合→场地 |
| 珊瑚 / 海盐双席同权 | 忠实 | 两席各三键、同尺寸、同层级，左右/上下重排不改变权重 |
| 软垫棋子与方向缺口 | 忠实 | 透明图集、CSS 纹样和向右零角箭头一致；修正过 90° 偏差 |
| 深墨蓝、亚麻、黄铜、珊瑚、海盐 | 忠实 | 生产没有引入粉色渐变、赛博霓虹或额外主题 |
| 唯一规则提示 | 忠实 | playing 只保留“转向，按住，松开冲出去。”，没有统计或教学弹窗 |
| 移动纵向顺序 | 忠实 | 320/390 为场地→阶段卡/规则→两席控制，第二席可滚动到达 |
| 桌面环境道具 | 有意简化 | 概念的灯、书、咖啡和毛毯未成为 DOM；保留暗桌氛围与核心圆场 |
| 赛果纸片 | 逻辑/样式已实现，未截图验收 | round/match result 共用唯一阶段卡和唯一下一步动作；本轮无浏览器终局证据 |
| 故障与高对比回退 | 静态通过 | CSS 圆场、纹样、箭头与 forced-colors 声明存在；未做 IAB 模式截图 |

## 8. 上首屏文案 diff

- desktop playing 实装只出现：返回作品集、本机/刷新说明、标题、副题、双方名字与 0–0、1/3、规则、两席名字、蓄力百分比、六个操作和暂停；
- mobile intro 只出现：返回作品集、本机/刷新说明、标题、0–0、1/3、规则说明、“开始第一轮”、规则短句与副题；
- 拒绝概念中的“红方/青方”“百川相扑记”、错误回合词、额外得分说明、生成式按钮字和装饰性英文；
- 没有新增 badge、排行榜、统计、主题、音效、分享、账号或公网文案。

## 9. 借鉴、bugs 与 learn

`ATTRIBUTION.md` 固定 robot_sumo、Matter.js 0.20.0 和 Box2D-Lite 的 commit、MIT、权利主体、研究范围与零复制边界；无许可证 SumoBall 只作为明确排除案例。三张概念、背景和图集由 ImageGen 原创生成，没有输入第三方截图或素材。

实现/验收共记录：暂停日志不可重放、色键工具包缺失、Pointer 取消误冲刺、方向箭头偏 90°、暂停目标过小、生产图双场地、目录测试重放 API 命名错误。可复用结论见 [双体互推游戏：原子出圈、冲量分层与控制事件重放](../learn/2026-07-19-atomic-ring-out-impulse-and-control-replay.md)。

## 10. 发布判断

作品达到逻辑、A 级静态边界、门户、响应式、触控尺寸、暂停恢复、控制台、视觉对照、来源声明和 bugs/learn 的当前发布标准，可从本地门户或作品 `index.html` 使用。已明确保留的设备级补测项是：真实多指/Pointer 取消、200% 文本、浏览器完整三轮与 forced-colors/图片阻断截图。
