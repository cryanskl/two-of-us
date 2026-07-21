# Catalog 驱动的本地启动合同：静态闭包、启动器与浏览器证据

- 日期：2026-07-21
- 适用范围：同一仓库内并存 file 直开、本地服务、局域网与本地重型能力的 HTML 作品集

## 核心结论

“本地可用”不是一个布尔字段，而是三层需要分别证明的承诺：

| 层 | 回答的问题 | 能证明 | 不能证明 |
| --- | --- | --- | --- |
| catalog/schema | 哪些作品受约束 | metadata 完整、分类/路径/ID 对齐、唯一性、安装与联网声明 | 文件真实存在、页面能运行 |
| 静态合同/依赖图 | 作品带走后是否闭合 | HTML/CSS 声明资源存在、realpath 不越界、禁用已知网络承载、启动器内容精确 | 任意 JS 动态分支、浏览器实现差异 |
| 真实浏览器 | 首屏实际发生什么 | 加载完成、实际请求、console/page exception、WebSocket/WebTransport | 未触发的交互路径、其他浏览器与未来环境 |

可靠验收必须保留三层，不能用其中一层替代另外两层。

## 1. 让 catalog 成为自动扩展边界

最容易腐化的做法是维护一个“已经检查过的目录列表”。新增作品时，人会忘记同步列表，测试仍然全绿。

更稳的结构是：

```text
catalog entry
├── schema：字段、类型、分类、ID、entry、README、唯一性
├── installed=false：只保留规划信息，不要求磁盘文件
└── installed=true
    ├── networkRequired=false
    ├── entry + README + attribution
    ├── level=A → HTML/CSS 本地依赖闭包
    └── level=B/C/D → 两个平台启动器精确模板
```

这样新增 catalog entry 会自动进入相应 Gate；漏文件、错目录或漏启动器会在同一次 verify 中失败。

## 2. 静态依赖图要按浏览器边界保守失败

HTML 不是可以用几个宽松正则安全近似的语言。尤其要注意：

- comment 的 `-->` 与畸形 `--!>` 采用不同结束语义；
- 只有 `=` 后的 quoted attribute value 才能让 `>` 留在标签内；
- unquoted value 中的引号是 parse error 字符，不会开启 quoted 状态；
- raw-text `script/style` 的结束标签边界与普通标签不同；
- entity 会在浏览器 tokenizer 中还原，控制属性和 URL 若不支持完整解码，应直接拒绝 `&`；
- CSS 的注释、字符串、`url()` 与 `@import` 需要状态机，不能先全局删注释再匹配。

安全策略不是实现完整浏览器，而是定义一个更小、明确的可接受 profile：能可靠分类的输入通过；状态不完整、escape 或边界含糊时稳定失败。

## 3. 路径安全要同时看 lexical path 与 realpath

只检查 `path.resolve()` 不足以阻止 symlink 逃逸。稳定流程是：

1. lexical path 必须位于仓库 root；
2. catalog 入口、README 与启动器本身拒绝 symlink；
3. dependency 允许正常文件，但 `realpath` 结果仍必须位于 `realRoot`；
4. containment 使用 `path.relative` 的完整段边界，不能用字符串前缀；
5. percent-encoded 分隔符、NUL、control character 与 backslash 在进入路径解析前拒绝。

错误信息只显示仓库相对 label；外链、data/blob、query/fragment 与控制字符使用稳定占位或转义，避免把秘密和伪造日志行带进 CI。

## 4. 启动器应是 renderer，不是 16 份手写文本

跨平台启动器最容易出现“看起来一样、细节漂移”：换行、参数顺序、目录定位、作品 ID、退出码或可执行位。

用两个纯 renderer 生成 expected，再逐字比较已提交文件，可以同时服务：

- validator；
- 真实仓库测试；
- fixture；
- 未来生成/修复工具。

Unix mode 只在 POSIX 工作区读取；Windows 验证路径和内容。发布权限由 Git 索引 `100755` 继续证明，不能要求 Windows `stat.mode` 模拟 Unix。

## 5. 浏览器证据必须先证明监听器有效

“没有外部请求”可能有两种解释：页面确实没有请求，或监听器根本没工作。至少用一次不提交的本地探针正向触发：

- HTTP request + request failure；
- WebSocket created/closed；
- WebTransport created/closed。

然后再把作品的零事件当成证据。多页面顺序验证时，每次导航前记录事件 cursor，页面结果只读取该 cursor 之后的事件，防止上一页的连接关闭或异常污染下一页。

坏图也应限定为“可见坏图”。预先存在但位于 `hidden` 完成态中的空 `<img>`，可能是合法的私人 Blob 目标；检查 `naturalWidth===0` 前还要确认祖先未隐藏、矩形非零和 computed visibility。

## 6. 测试测试本身

高风险 validator 需要 hostile fixture，而 hostile fixture 也可能误绿：

- `errors.every(...)` 对空数组返回 true，必须先断言错误基数；
- deny case 要创建其余合法依赖，避免“缺文件”替代目标错误；
- 每条绕过输入断言具体错误族，而不是只断言 `errors.length > 0`；
- 用真实 catalog 做零错误回归，同时用临时目录覆盖失败矩阵；
- validator 的最终 errors 排序、去重、冻结，减少平台与遍历顺序造成的漂移。

## 7. 什么时候仍需作品级验收

catalog 合同适合证明分发和启动，不应吞掉作品自己的责任。以下仍属于作品级测试：

- 私密阶段是否提前进入 DOM；
- 游戏规则、胜负、公平性和状态重放；
- pointer、keyboard、touch、focus 与 screen reader；
- 用户操作后才创建的 Blob、Worker、audio、WebSocket 或 WebTransport；
- 响应式、视觉和 reduced motion。

公共合同越清晰，作品测试越能专注玩法；不要把通用 validator 变成一个猜测所有 JavaScript 行为的伪浏览器。

## 借鉴与来源声明

本文沉淀自本仓库 catalog、共享运行时、190 规格、本次 hostile fixture 与 Chrome/CDP 验收；没有引用新的外部项目、代码、素材或第三方依赖。
