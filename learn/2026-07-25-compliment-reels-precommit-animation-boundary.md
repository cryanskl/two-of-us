# 预提交规则与动画完成器要分层

## 背景

`compliment-reels` 在一轮开始时先排好最多六次的三列 stop，浏览器只负责逐次
展示。每次拉动还有 Web Animations、timeout、reduced-motion、hidden、pagehide
和 window blur 等多个潜在完成源。

## 可复用结论

规则层与表现层应各自保留一道防线：

1. 规则层在 ARM 时一次性接收 entropy、清洗后的内容和私人结语，生成并冻结计划；
2. public view 只释放 settled prefix，不把当前 pending stop 或 future stop 交给 UI；
3. 表现层只持有 public `animationToken`，不读取计划来判断动画终点；
4. 任一完成源触发时，先清理 Animation 和 timeout，再提交带 token 的 `SETTLE`；
5. reduced-motion、hidden、pagehide、blur 不重新抽取，只提交 `SUSPEND`，让 reducer
   把同一 locked stop 落定；
6. controller 的 token gate 与 reducer 的 token 校验同时保留：前者减少重复工作，
   后者保证迟到回调无法改变新一轮；
7. RESTART 必须先确认 reducer 真正进入 intro，再创建下一轮 ARM，避免私人结语
   composer 被无效动作额外调用。

这样做的收益不只是“动画不重复”：它让断网、降动效、页面失焦和正常动画共享
同一条规则结果，浏览器时序无法改变已经承诺给用户的内容。

## 输入门的配套边界

- 业务动作只从原生 button 的 `click` 发出；
- Enter/Space 的 keydown 只维护 held set 并阻止 repeat，不能再手动派一次 PULL；
- `click.detail === 0` 的键盘/辅助技术激活不进入 pointer 冷却；
- pointer timeStamp 必须有限、单调且距上次真正被 reducer 接受的 click 至少 350ms；
- 不要在 reducer 拒绝动作时提前更新时间戳，否则准备失败重试也会被误伤。

这个模式适用于所有“结果先锁定、动画后揭晓”的本地轻应用。
