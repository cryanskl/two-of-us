# Bugs

这里记录已经复现的缺陷、根因、修复方案和回归验证。一个问题一个文件，命名为 `YYYY-MM-DD-<slug>.md`。

状态使用：`investigating`、`fixed`、`wont-fix`。未经验证的推测必须明确标注，不作为根因结论。

新增记录时复制 [TEMPLATE.md](./TEMPLATE.md)。

## 已记录

- [默契电报码：空码本侧轨覆盖 hidden 语义](./2026-07-17-telegraph-hidden-semantics.md)
- [默契电报码：缺失 favicon 导致浏览器控制台 404](./2026-07-17-telegraph-favicon-404.md)
- [默契电报码：390px intro 主动作落到过深位置](./2026-07-17-telegraph-mobile-intro-depth.md)
- [未来车票：来源声明标题未满足仓库机器 Gate](./2026-07-17-future-ticket-attribution-heading-contract.md)
- [未来车票：概念原生尺寸下整体纵向下沉](./2026-07-17-future-ticket-native-vertical-drift.md)
- [气球胆量局：窄屏隐私说明贴近主动作描边](./2026-07-17-balloon-dare-privacy-spacing.md)
- [节拍接力：320px 窄屏拍键低于触控高度承诺](./2026-07-17-rhythm-relay-narrow-touch-height.md)
- [语音 WASM 缺堆导出、目标识别与预热线程池](./2026-07-17-speech-wasm-build-runtime-contract.md)
- [浏览器资产更新会误判已安装模型不兼容](./2026-07-17-capability-receipt-non-artifact-drift.md)
- [语音 Worker 资产缺少 COEP 导致 pthread 启动失败](./2026-07-17-speech-worker-missing-coep.md)
- [语音录音清理顺序会清空待转写 PCM 或泄漏半初始化轨道](./2026-07-17-speech-recorder-cleanup-order.md)
- [Emscripten pthread 误把外层转写 Worker 当作线程入口](./2026-07-17-emscripten-pthread-outer-worker-entry.md)
- [未限定的测试发现误入 tmp 工具链](./2026-07-17-unscoped-test-discovery-enters-tmp-toolchain.md)
- [缺失能力状态隐藏模型体积](./2026-07-17-missing-capability-hidden-download-size.md)
- [运行时 API 未限制方法且 HEAD 仍写响应体](./2026-07-17-runtime-api-method-and-head-contract.md)
- [运行时相邻端口测试偶发冲突](./2026-07-17-runtime-next-port-test-collision.md)
- [能力安装路径是普通文件时诊断抛出 ENOTDIR](./2026-07-17-capability-install-path-not-directory.md)
- [为你引航：圆心在世界内但暗礁圆周越界](./2026-07-17-lighthouse-reef-radius-out-of-bounds.md)
- [同心牵引：丝带投影把圆重新推入软垫](./2026-07-17-tether-constraint-reintroduces-collision.md)
- [同心牵引：验证轨迹忽略吊坠滞后而卡在第二幕](./2026-07-17-tether-route-payload-lag.md)
- [ImageGen 图集去绿：系统 Python 缺 Pillow，FFmpeg 进程挂起](./2026-07-17-imagegen-chroma-toolchain.md)
- [调研来源漂移：失效仓库仍标为高置信度，重分发仓库被当作一手来源](./2026-07-17-research-source-provenance-drift.md)
- [心跳冲刺：常见桌面与手机首屏看不到完整主控制](./2026-07-17-heart-sprint-primary-control-below-fold.md)
- [心动拔河：规则越线时织带结未对齐终点针](./2026-07-17-ribbon-tug-finish-marker-drift.md)
- [和你一样：已选择后仍提示先选答案](./2026-07-17-compatibility-quiz-stale-selection-hint.md)
- [和你一样：连续乱序状态会丢失下一题](./2026-07-17-compatibility-quiz-out-of-order-state-loss.md)
- [和你一样：历史回合编号可复用并永久等待](./2026-07-17-compatibility-quiz-round-id-reuse.md)
- [和你一样：成员迁移后隐藏 DOM 保留上一题答案](./2026-07-17-compatibility-quiz-hidden-answer-residue.md)
- [和你一样：触屏 sticky hover 让选中答案文字消失](./2026-07-17-compatibility-quiz-mobile-selected-text.md)
- [密封轮次：无关第三人离开会清空两位玩家的待揭晓答案](./2026-07-17-third-member-clears-sealed-round.md)
- [照片拼图：新候选校验失败时旧候选 URL 延迟释放](./2026-07-17-photo-puzzle-stale-candidate-url.md)
- [全景回忆：运行时就绪后仍提示启动服务](./2026-07-15-panorama-stale-startup-copy.md)
- [密封猜拳：第三人消息可覆盖待验证的主机状态](./2026-07-15-sealed-rps-pending-envelope-overwrite.md)
- [密封猜拳：常见桌面与移动视口看不到完整出拳区](./2026-07-15-sealed-rps-first-viewport-density.md)
- [连心四子棋：斜线测试的获胜格顺序写反](./2026-07-15-connect-four-diagonal-test-order.md)
- [连心四子棋：非当前玩家无法理解棋盘布局](./2026-07-15-connect-four-board-accessibility.md)
- [爱的刮刮卡：屏幕阅读器提前读出惊喜](./2026-07-15-scratch-screen-reader-premature-reveal.md)
- [爱的刮刮卡：双指产生跨指错误笔画](./2026-07-15-scratch-multitouch-stroke.md)
- [爱的刮刮卡：高 DPI 屏遮罩提示字号重复放大](./2026-07-15-scratch-dpr-prompt-size.md)
- [隔屏画猜：固定题序可提前预测答案](./2026-07-15-pictionary-predictable-answers.md)
- [隔屏画猜：跨回合保留旧猜词输入](./2026-07-15-pictionary-stale-guess.md)
- [静态根路径末尾斜杠解析](./2026-07-15-static-root-trailing-slash.md)
- [WeasyPrint 在 macOS 缺少 libgobject](./2026-07-15-weasyprint-macos-libgobject.md)
