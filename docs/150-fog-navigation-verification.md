# “雾里，跟着你走”验收记录

- 日期：2026-07-20
- 作品：`experiences/co-op/fog-navigation/`
- 等级：A（经典脚本、纯本地资源、零运行依赖、零网络、零存储、零随机）
- 对应调研：[146-fog-navigation-research.md](./146-fog-navigation-research.md)
- 对应规格：[147-fog-navigation-spec.md](./147-fog-navigation-spec.md)
- 视觉冻结：[148-fog-navigation-design.md](./148-fog-navigation-design.md)
- 分步计划：[149-fog-navigation-plan.md](./149-fog-navigation-plan.md)

## 1. 结论

作品已完成为单设备双人非对称热座合作游戏：领航员看完整 13×9 地图最多 7 秒，地图真实移除后，驾驶员只看以自己为中心的 5×5 雾窗并听口述方向。四段固定轮换角色，最终双方各领航两次、驾驶两次。

真实浏览器走完四条生产安全路线，并验证自动遮盖、手动遮盖、撞墙、换角、终局和移动端几何。应用内浏览器安全策略不允许自动导航 `file://`，因此没有绕过限制冒充双击通过；A 级直开由经典相对脚本、纯本地资源、无受限 API 和目录 Gate 证明，仍保留一次人工双击 Gate。

## 2. 实现简报

- `levels.js`：四张固定 13×9 地图、地标、关键分叉与安全距离；
- `config.js`：默认双方称呼与只接收隔离冻结摘要的完成结语；
- `logic.js`：严格状态机、BFS、局部投影、危险归一化、合作同构 Gate、30Hz/210 tick 与键盘分类；
- `logic.test.js`：30 项关卡、状态、隐私、生命周期、重放与 hostile config 测试；
- `index.html` / `styles.css` / `app.js`：经典脚本、阶段 DOM、13×9/5×5 双视图、固定步倒计时、原生按钮和响应式布局；
- `assets/fog-table-background.png` / `favicon.svg`：ImageGen 无字源稿的逐字节运行副本与原创提灯 SVG；
- `README.md` / `ATTRIBUTION.md`：直开方式、威胁模型、固定来源、排除来源和完整零复制声明。

## 3. 自动检查

最终执行：

```sh
node --check experiences/co-op/fog-navigation/app.js
node --test experiences/co-op/fog-navigation/logic.test.js
node --test shared/runtime/catalog.test.js
npm test
npm run verify
cmp docs/assets/fog-navigation/fog-table-background-source.png experiences/co-op/fog-navigation/assets/fog-table-background.png
git diff --check
```

结果：

- 作品逻辑：30 / 30 通过；
- 目录与静态 Gate：80 / 80 通过；
- 全仓：1343 / 1343 通过，0 失败；
- `verify`：51 个作品入口、1 个能力声明通过；
- 运行背景与文档源稿逐字节一致，SHA-256 为 `b2113ee1e74d6b8a6fa0a9af97affabb3dd95283be13d703a9e0567c8f216236`；
- `git diff --check`：通过。

四张安全路径的 BFS 距离为 `[22, 13, 22, 13]`。合作 Gate 证明需要不同转向的关键分叉，在抹去方向、镜像和具体地标后具有相同局部签名；驾驶 view 精确 25 格，并把可见危险归一化为普通道路。

## 4. 浏览器生产路径

使用 Codex 内置 Browser/IAB，通过 `http://localhost:4173/experiences/co-op/fog-navigation/index.html` 加载同一套生产文件：

1. 第一段等待完整 210 tick，确认自动进入 cover；遮盖后 `.navigator-cell = 0`、`.hazard = 0`；
2. 驾驶阶段确认 25 个局部格，不含 `critical`、`safePath`、完整 rows 或危险语义；
3. 开局先向左撞墙，位置和步数不变，反馈为“前面走不通”，撞墙数增至 1；
4. 依次走完雾松坡 22 步、风铃巷 13 步、苔光岸 22 步、归灯台 13 步；后三段使用手动折图；
5. 每轮结果记录真实步数、尝试和撞墙，下一轮领航/驾驶按 `0/1/0/1` 交换；
6. 终局显示四条摘要，双方均为“领航 2 次 · 驾驶 2 次”，结语为“你和我，雾再浓一点，也会有人记得方向。”；
7. 终局只保留“再走四段雾路”和“返回体验目录”，完整地图与局部格节点均为 0；
8. 全程控制台 0 warning / 0 error。

## 5. 响应式与可访问性

| 视口 / 阶段 | 实测结果 |
| --- | --- |
| 1728×962 briefing / driving | 桌面双列成立，完整地图、计时侧栏和驾驶控制无横向溢出 |
| 1280×720 driving | `scrollWidth × scrollHeight = 1280×720`；提示底部 476.9px，方向盘顶部 504.0px，约 27px 间距 |
| 1280×720 complete | 四轮摘要、结语和两个动作完整处于首屏 |
| 390×844 driving | 5×5 网格为 338×338px；四个方向键 56×56px；页面 390×844，无横向或纵向溢出 |
| 320×700 driving | 5×5 网格与上方向键位于首屏；方向键 52×52px；无横向溢出 |

- 控制使用原生 button、grid、progressbar、heading 与 live status；地图格同时有符号和可读名称；
- 阶段改变后焦点进入新标题或状态，方向按钮重建后按 `data-focus-key` 恢复焦点；
- `prefers-reduced-motion` 只关闭表现动画，210 tick 规则不变；forced-colors 会去除背景依赖并保留系统边框；
- 背景图失败仍有 CSS 底色、地图格、文字和全部控制；
- 本轮没有在 IAB 中仿真 forced-colors、资源阻断或 200% 文本缩放，这三项保留为人工设备 Gate。

## 6. 视觉对照

最终页面与三张概念图按原尺寸对照；只接受深夜木桌、纸张、提灯、双栏构图与信息层级。概念中的错误中文、错误地图、错误地标、虚构成绩和生成式图标没有进入生产页面。

桌面 briefing 保持完整纸图与独立倒计时；driving 以局部雾窗为唯一视觉中心；complete 用四轮账页和独立结语纸形成收束。390×844 将驾驶侧栏移除并按文档流放置控制，未用 JavaScript 判断 viewport。最终 QA 截图只用于浏览器会话内目视检查，没有作为新运行资产提交。

## 7. 借鉴、bugs 与 learn

`ATTRIBUTION.md` 固定 rot.js annotated tag object `55f487ca...` / commit `46782e...`、TwoPlayerGames `542c57...` 和 Amazeing `10daea...`，逐项记录许可证、权利主体、只研究范围与未复制范围。无许可证且含商业游戏主题资产的 fog-of-war `1e2c17c...` 被明确排除。运行目录没有打包或依赖这些项目的源码、算法实现、地图、素材、文案、字体或构建产物。

本轮记录并解决：冻结 Proxy 不变量、390px 包含断点误降触控尺寸，以及 1280×720 标题/方向盘重叠。详见 [`bugs/README.md`](../bugs/README.md)。可复用方法见[热座导航：阶段私密地图与局部同构合作证明](../learn/2026-07-20-stage-private-map-and-local-isomorphism.md)。

## 8. 发布判断

作品达到固定地图可达性、合作必要性、阶段隐私、四轮换角、A 级静态边界、统一门户、真实浏览器生产路径、响应式、触控尺寸、控制台、视觉对照、来源声明和 bugs/learn 的当前发布标准。

保留的人工 Gate 是：真实 `file://` 双击、forced-colors、背景阻断和 200% 文本缩放。README 已明确正常热座交接不等于抵抗主动查看源文件或开发者工具；未把这些边界掩饰成已验证或安全隔离。
