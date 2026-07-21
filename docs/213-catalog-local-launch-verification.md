# Catalog 本地直达合同验收记录

- 日期：2026-07-21
- 状态：通过；`file://` 浏览器实测受当前 Chrome 控制策略限制，已如实降级为静态 file 合同 + localhost 全量实测
- 规划提交：`55f7feb docs: plan catalog local launch contracts`
- 实现提交：`7edca34 feat: enforce catalog local launch contracts`
- 验收范围：55 个 installed 作品、47 个 A 级直开入口、8 个 B/C/D 启动器

## 1. 结论

catalog 现在是本地启动合同的单一入口。新增作品只要进入 catalog，就会自动接受以下检查：

1. 完整 metadata schema、分类目录、ID、entry/README 对齐与唯一性；
2. installed 作品必须 `networkRequired: false`，入口和 README 必须是仓库内普通文件，README 必须有独立“借鉴与来源声明”；
3. A 级入口接受严格 HTML/CSS 本地依赖闭包验证；
4. B/C/D 入口必须带与共享 renderer 逐字一致的 `start.command` 和 `start.bat`；POSIX 额外要求 `0755`，Git 索引八份均为 `100755`；
5. 所有错误排序、去重、冻结、路径受 realpath containment 约束，URL 与控制字符按统一规则脱敏。

真实仓库验证返回零错误：47 个 A 级入口全部进入直开合同，8 个非 A 入口全部进入启动器合同，没有手工维护的作品例外表。

## 2. 自动化证据

环境：macOS、Node `v22.22.3`。

| Gate | 结果 |
| --- | --- |
| `node --test scripts/experience-contracts.test.mjs` | 66/66 通过 |
| `npm test` | 1658/1658 通过 |
| `npm run verify` | 55 个入口、47 个 A、8 个非 A、1 个能力声明通过 |
| `git diff --check` | 无输出 |
| `node --check scripts/experience-contracts.mjs` | 通过 |
| `node --check scripts/validate-repository.mjs` | 通过 |

fixture 覆盖合法递归 CSS/media、所有 deny loading family、HTML entity、畸形 comment/raw-text/tag、CSS lexer 失败、data icon hash、缺失文件、目录伪装、symlink/realpath 越界、错误启动器、README 缺失/symlink、稳定脱敏和真实 catalog。

两轮独立终审结论均为 P0–P2 零问题：一轮专查 HTML/CSS parser 与路径安全，一轮专查规格集成、跨平台 mode、installed 过滤、错误输出和测试充分性。

## 3. Chrome 全量验收

### 3.1 方法边界

首选 Codex In-app Browser（Chromium）拒绝 `file://` 导航，并明确禁止通过其他浏览器控制面绕过。因此本轮没有把 47 次被拒绝导航记为失败作品，也没有把 localhost 冒充 file 证据。

替代证据分为两部分：

- `validateExperienceContracts` 对 47 个 A 级入口逐一证明 file 静态合同、依赖闭包与禁止网络声明；
- 同一 Chrome tab 通过 `node scripts/start.mjs --no-open` 启动的 `http://127.0.0.1:4173/`，逐一真实加载全部 55 个入口。

Chrome 导航前启用 CDP `Network`、`Runtime` 与 `Log`，每页使用独立 cursor 收集 `requestWillBeSent`、`loadingFailed`、`webSocketCreated`、`webTransportCreated`、exception 与 error/warning。DOM 检查 `readyState=complete`、非空标题、可见正文与可见坏图；隐藏完成态的空图片不按坏资源误报。

### 3.2 结果

| 等级 | 作品数 | 页面加载通过 | 备注 |
| --- | ---: | ---: | --- |
| A | 47 | 47 | 无外部请求、加载失败、可见坏图或运行时异常 |
| B | 1 | 1 | `panorama-memory` 显示“本地运行时已就绪” |
| C | 6 | 6 | 六个入口均创建一条预期本地 WebSocket |
| D | 1 | 1 | `i-heard-you` 显示模型已安装与“准备本机语音”；未请求麦克风权限 |
| 合计 | 55 | 55 | 首屏证据全部通过 |

`photo-swap-puzzle` 初始检查曾把无 `src` 的完成态 `<img>` 误认为坏图。DOM 复核确认其父容器为 `hidden`、自身宽高为 0，只会在用户选择并拼完私人照片后赋值；最终判据只检查可见坏图，完整重跑后 55/55 通过。

代表入口语义抽查：

- B：`panorama-memory` 标题“回到那一天”，照片选择区与本地隐私说明完整；
- C：`together-lock` 标题“同心解锁”，显示“已连接本地房间”及创建/加入入口；
- D：`i-heard-you` 标题“我听见了”，能力检查完成后显示模型已安装和“准备本机语音”。

以下启动器等价命令均复用同一个 4173 运行时，并解析到精确作品入口：

```bash
node scripts/start.mjs --no-open --experience panorama-memory
node scripts/start.mjs --no-open --experience together-lock
node scripts/start.mjs --no-open --experience i-heard-you
```

### 3.3 监听器自证

为避免“没有事件只是因为监听器失效”，测试期间创建并随后删除三个未提交探针页：

| 探针 | 捕获证据 |
| --- | --- |
| HTTP | `requestWillBeSent` + `loadingFailed (ERR_UNSAFE_PORT)` |
| WebSocket | `webSocketCreated` + `webSocketClosed` |
| WebTransport | `webTransportCreated` + `webTransportClosed` |

探针只访问环回地址，不含私人数据；测试后已删除，`git status` 不保留探针文件。

## 4. 已发现并修复的缺陷

- [HTML 扫描边界与浏览器 tokenizer 漂移](../bugs/2026-07-21-local-launch-html-tokenizer-boundary.md)
- [非 A 资源错误允许控制字符污染 CLI](../bugs/2026-07-21-local-launch-cli-control-output.md)
- [启动器错误 ID 测试可空数组误绿](../bugs/2026-07-21-local-launch-vacuous-launcher-test.md)

三个缺陷均在实现提交前修复并补入回归。Chrome 的 `file://` 拒绝属于当前测试工具策略限制，不是仓库产品缺陷，故只记录在本验收边界中。

## 5. 仍然不能证明什么

- 当前工具策略下没有真实 Chrome `file://` 导航证据；需要人工双击或未来允许 file 导航的受控浏览器补证；
- 首屏观测不能覆盖用户交互后才执行的所有动态分支；每个作品仍由自己的 reducer、交互和浏览器验收负责；
- static classic script 只验证文件存在，不尝试从任意 JavaScript 字符串推断动态依赖；
- D 级没有在本轮请求麦克风权限，也没有执行真实转写；这里只证明页面、能力状态与启动边界。

## 6. 借鉴与来源声明

本批实现来自仓库既有 190 规格、共享运行时、catalog 与启动器的内部抽象；没有新增外部开源参考、第三方代码、素材或依赖。三份修复来自内部威胁建模与独立代码审查。

可复用结论见 [Catalog 驱动的本地启动合同](../learn/2026-07-21-catalog-driven-local-launch-contracts.md)。
