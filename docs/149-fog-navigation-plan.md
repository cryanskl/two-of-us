# “雾里，跟着你走”分步实施计划

- 日期：2026-07-20
- 状态：待执行
- 对应调研：[`146-fog-navigation-research.md`](./146-fog-navigation-research.md)
- 对应规格：[`147-fog-navigation-spec.md`](./147-fog-navigation-spec.md)
- 视觉冻结：[`148-fog-navigation-design.md`](./148-fog-navigation-design.md)
- 目标目录：`experiences/co-op/fog-navigation/`

## 1. 执行原则

1. 作品是 A 级经典脚本，零运行依赖、零网络、零存储、零随机；
2. 规格和视觉已经冻结，实现不扩充第五张地图、音频、设置、统计、联网或存档；
3. 逻辑与前端由两个不重叠子任务驱动，共享 worktree 但不共享写入文件；
4. 子任务只编辑白名单文件、不 stage、不 commit；主线程审查后按部分提交；
5. 每次提交前运行 `git branch --show-current && git rev-parse --show-toplevel`；
6. 每个部分跑对应测试，涉及 UI 的完成态必须用 Browser/IAB 实玩；
7. 新 bug 一事一档写 `/bugs`，跨项目经验写 `/learn`；
8. 来源声明在 README 与 ATTRIBUTION 独立满足 Gate，不能只互相跳转。

## 2. 子任务边界

### 2.1 逻辑子任务

唯一可写：

```text
experiences/co-op/fog-navigation/config.js
experiences/co-op/fog-navigation/levels.js
experiences/co-op/fog-navigation/logic.js
experiences/co-op/fog-navigation/logic.test.js
```

职责：

- 冻结默认配置、Unicode 名字清洗与完成策略安全包装；
- 四张 13×9 地图、schema 校验、深冻结；
- 安全 BFS、普通可达 BFS、局部 canonical signature 与合作必要性分析；
- intro/briefing/cover/driving/retry/result/complete reducer；
- navigator/driver/public 三类 view 与隐私投影；
- 原生 KeyboardEvent 方向分类；
- 规格测试矩阵，包含 22/13/22/13 与四图两步等价证明；
- CommonJS 与浏览器 global 双导出。

禁止：HTML/CSS/app、DOM、图片、目录、文档、第三方代码、网络/存储/随机。

### 2.2 前端子任务

唯一可写：

```text
experiences/co-op/fog-navigation/index.html
experiences/co-op/fog-navigation/styles.css
experiences/co-op/fog-navigation/app.js
experiences/co-op/fog-navigation/assets/fog-table-background.png
experiences/co-op/fog-navigation/assets/favicon.svg
experiences/co-op/fog-navigation/README.md
experiences/co-op/fog-navigation/ATTRIBUTION.md
```

职责：

- 按 `config → levels → logic → app` 顺序经典加载；
- phase-owned DOM 和 `replaceChildren()`，briefing 离开后完整图真实移除；
- 13×9 导航图、7 秒计时、cover/retry、5×5 driver grid、四向按钮、摘要；
- rAF 30Hz accumulator、100ms cap、最多 3 tick、hidden/blur 遮盖；
- KeyboardEvent、按钮点击、焦点迁移、live region；
- 设计令牌、桌面/移动/低高响应式、52/56px、reduced-motion、forced-colors；
- 逐字节复制冻结背景源稿，原创 favicon；
- README/ATTRIBUTION 固定 rot.js、TwoPlayerGames、Amazeing、排除 fog-of-war、ImageGen 和零复制声明。

禁止：修改逻辑四文件、目录/catalog/backlog/docs、添加依赖、复制概念中的地图/文字/成绩。

## 3. 阶段与提交

### 阶段 A：逻辑

审查：

```sh
node --check experiences/co-op/fog-navigation/config.js
node --check experiences/co-op/fog-navigation/levels.js
node --check experiences/co-op/fog-navigation/logic.js
node --test experiences/co-op/fog-navigation/logic.test.js
git diff --check
```

重点人工复核：

- 四图与 147 号逐字一致；
- canonical signature 真正比较前两步，不把 H 或世界坐标泄露；
- driver view JSON 无 rows/hazard/critical/safePath/world position；
- 210 tick、H retry、G completion 与 A/B/A/B 角色；
- 返回对象递归冻结且引用隔离；
- 无来源代码或参数复制。

提交：`feat: add fog navigation logic`

### 阶段 B：前端

审查：

```sh
node --check experiences/co-op/fog-navigation/app.js
node --test experiences/co-op/fog-navigation/logic.test.js
cmp docs/assets/fog-navigation/fog-table-background-source.png experiences/co-op/fog-navigation/assets/fog-table-background.png
git diff --check
```

静态人工复核：

- 经典脚本、相对路径、无 module/远程 URL；
- app 无 `innerHTML =`，阶段节点真实替换；
- controls 只在 driving；
- H 不产生 driver DOM class/text/aria 泄漏；
- CSS 满足三态设计、触控、focus、reduced-motion、forced-colors；
- README 与 ATTRIBUTION 均完整声明来源。

提交：`feat: build fog navigation interface`

### 阶段 C：目录与静态 Gate

主线程修改：

```text
experiences/catalog.json
experiences/co-op/README.md
docs/40-idea-backlog.md
index.html
shared/runtime/catalog.test.js
README.md（作品状态/计数，如需）
```

工作：

- catalog 新增第 51 个作品，A、2 人合作、单设备轮流、无网络；
- 合作分类新增唯一链接；
- backlog C09 改为已实现并更新总数/合作数/剩余数；
- 门户内置 catalog 同步；
- 目录测试锁定入口、协议、隐私、来源、背景副本和 backlog；
- 复用“分类 README 覆盖全部 catalog 合作项”的通用测试。

验证：

```sh
node --test shared/runtime/catalog.test.js
npm run verify
npm test
git diff --check
```

提交：`feat: catalog fog navigation`

### 阶段 D：浏览器与 bug 循环

1. 启动本地服务并用 Browser/IAB 访问门户和作品；
2. 7 秒自动遮盖、manual/hidden/blur 分别验证；
3. 第一轮键盘、第二轮点击、第三轮撞墙 + H + review、第四轮混合；
4. cover/driving 抓 DOM，确认无完整地图/危险信息；
5. 1440×900、1280×800、390×844、320×700 几何；
6. 键盘 repeat、焦点保持、背景失败、reduced-motion/forced-colors 能覆盖多少就记录多少；
7. 最新概念与最终截图都用 `view_image(detail="original")` 查看；
8. 控制台 0 error、资源同源；
9. 每发现一个真实缺陷立即建 bug 文件，修复后运行定向 + 全量测试；
10. 每个独立 bug 修复单独提交 `fix: ...`。

## 4. learn 沉淀

计划主题：`阶段所有权 + 最小公开投影 + 局部同构合作证明`。

至少记录：

- CSS 隐藏不是热座隐私，phase 离开要移除节点；
- state 可以拥有完整事实，但 view 必须按角色/阶段最小投影；
- 局部信息差需排除地标、边界、转弯等旁路，而非只隐藏 hazard；
- canonical signature 如何消除朝向和左右镜像；
- 固定地图仍可用算法证明首次游玩的合作必要性；
- view/DOM 泄漏测试如何跨作品复用。

文件：`learn/2026-07-20-stage-owned-private-map-and-local-isomorphism.md`，并更新 `learn/README.md`。

验证后提交：`docs: record fog navigation privacy lessons`

## 5. 最终验收记录

新建 `docs/150-fog-navigation-verification.md`，记录：

- 逻辑/目录/全仓测试实际数量；
- 四图 BFS 与 canonical Gate 结果；
- file/localhost 边界；
- 四轮实玩动作与真实摘要；
- DOM 隐私证据；
- 四档 viewport 几何；
- 概念与最终截图原尺寸路径；
- 背景降级、reduced-motion、forced-colors、键盘与触控；
- 来源与零复制核验；
- bugs/learn 文件与提交列表；
- 未能在自动环境覆盖的人工设备 Gate。

更新 docs/root 索引，运行：

```sh
node --check experiences/co-op/fog-navigation/app.js
node --test experiences/co-op/fog-navigation/logic.test.js
node --test shared/runtime/catalog.test.js
npm run verify
npm test
git diff --check
```

提交：`docs: verify fog navigation`

## 6. 预期提交序列

```text
docs: research fog navigation                    # 已完成
docs: specify fog navigation                     # 已完成
docs: design fog navigation                      # 已完成
docs: plan fog navigation                        # 本文件
feat: add fog navigation logic
feat: build fog navigation interface
fix: ...                                         # 仅实际发现时，一缺陷一提交
feat: catalog fog navigation
docs: record fog navigation privacy lessons
docs: verify fog navigation
```

任何步骤失败时留在当前阶段，不把未验证文件混入下一提交，也不为赶进度跳过浏览器、来源或隐私 Gate。
