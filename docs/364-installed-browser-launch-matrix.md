# 58 个 installed 作品：真实浏览器首载与统一入口矩阵

> 验收日期：2026-07-25  
> 严格基线：`a38c90d01492a30cac05b32c514d305e2a749ae2`  
> 浏览器：真实 Google Chrome（Chrome 扩展会话）  
> 统一运行时：`http://127.0.0.1:4173/`

## 1. 范围、口径与限制

- `experiences/catalog.json` 在基线中登记 58 个 `installed: true` 作品：A 级 50 个、B 级 1 个、C 级 6 个、D 级 1 个。
- 统一门户在 localhost 显示“本地运行时已就绪”、58 张作品卡；D 级《我听见了》显示“能力就绪”。
- 每个作品的首载通过统一门户生成的实际 `href` 导航，不手写猜测入口。
- 每项记录 `document.title`、首个 `h1/h2`、`readyState`、非空正文、Chrome Network 请求/响应、HTTP 4xx/5xx、加载失败、console warning/error、公网请求及首屏横向溢出。
- Chrome 的浏览器安全策略拒绝自动化会话导航 `file://`，并禁止通过其他浏览器通道绕过。因此 A 级的“真实浏览器首载”在 localhost 同源静态托管下完成；A 级“双击 HTML 可直开”另由仓库 A 级静态资源合同和最终 `npm run verify` 验证。本文不会把 localhost 首载冒充成 file 直开。
- 首载矩阵不等于 58 个作品的全流程通关；A/B/C/D 的高风险代表会在后文另列深测边界。

## 2. 统一门户

| 检查项 | 结果 |
| --- | --- |
| 页面标题 | `Two of Us · 两个人的本地游乐场` |
| 运行时状态 | `本地运行时已就绪` |
| catalog 数量 | `58 个体验`，DOM 中 58 张卡 |
| D 级能力标签 | 《我听见了》显示“能力就绪” |
| console warning/error | 0 |

## 3. A 级全量首载矩阵（50/50）

表中“网络”是 Chrome Network 捕获的“请求数/收到响应数”；“页内返库”是作品页面内指向门户根路径的链接数量。50 个作品均为 `readyState=complete`、正文非空、无 4xx/5xx、无加载失败、无意外公网请求、无 console warning/error、无首屏横向溢出。

| id | `document.title` | 首个 `h1/h2` | 网络 | 页内返库 | 结论 |
| --- | --- | --- | ---: | ---: | --- |
| love-tree | 献给我一生最爱的人 | （无 h1/h2） | 13/13 | 0 | 通过 |
| memory-letter | 一封慢慢打开的信 | 有一封信，想请你亲手打开 | 5/5 | 0 | 通过 |
| scratch-surprise | 爱的刮刮卡 · Two of Us | 有一份小惊喜，想请你亲手打开 | 6/6 | 0 | 通过 |
| date-wheel | 今晚做什么 · Two of Us | 今晚做什么？ | 6/6 | 0 | 通过 |
| photo-swap-puzzle | 拼回这一刻 · Two of Us | 拼回这一刻 | 5/5 | 0 | 通过 |
| future-ticket | 未来车票 · Two of Us | 未来车票 | 7/7 | 0 | 通过 |
| instant-photo | 拍立得显影 · Two of Us | 拍立得显影 | 8/8 | 0 | 通过 |
| nested-gift | 一层一层 · Two of Us | 一层一层 | 7/7 | 0 | 通过 |
| paper-plane-mail | 纸飞机投递 · Two of Us | 航路预测图 | 7/7 | 0 | 通过 |
| star-code-unlock | 星码解锁 · Two of Us | 私人星盘 / 观测面 01 | 7/7 | 0 | 通过 |
| hand-crank-music-box | 把这首转给你 · Two of Us | 把这首转给你 | 8/8 | 0 | 通过 |
| moon-phase-secret | 把月亮拨回那一天 · Two of Us | 把月亮拨回那一天 | 8/8 | 0 | 通过 |
| fog-window-letter | 在雾上，写给你 | 在雾上，写给你 | 8/8 | 0 | 通过 |
| starlight-keepsake-search | 把夜晚照成我们 | 把夜晚照成我们 | 8/8 | 0 | 通过 |
| future-cookie-notes | 三枚以后，都是我们 | 三枚以后，都是我们 | 8/8 | 0 | 通过 |
| origami-heart | 沿着折痕，折到你心里 | 沿着折痕，慢慢折 | 7/7 | 0 | 通过 |
| hot-seat-pictionary | 同机你画我猜 | 你画，我猜，我们一起赢 | 5/5 | 0 | 通过 |
| twin-light-maze | 双光点归巢 · Two of Us | 双光点归巢 | 7/7 | 0 | 通过 |
| tethered-heart | 同心牵引 · Two of Us | 同心牵引 | 8/8 | 0 | 通过 |
| lighthouse-passage | 为你引航 · Two of Us | 为你引航 | 8/8 | 0 | 通过 |
| rhythm-relay | 节拍接力 · Two of Us | 节拍接力 | 6/6 | 0 | 通过 |
| telegraph-codebook | 默契电报码 · Two of Us | 默契电报码 | 6/6 | 0 | 通过 |
| kitchen-relay | 双人小馆 · Two of Us | 双人小馆 | 8/8 | 0 | 通过 |
| closer-cards | 靠近一点 · Two of Us | 靠近一点 | 7/7 | 0 | 通过 |
| shared-color-studio | 把颜色调到一起 · Two of Us | 把颜色调到一起 | 8/8 | 0 | 通过 |
| signal-repair-manual | 把信号接回来 · Two of Us | 把信号接回来 | 8/8 | 0 | 通过 |
| four-hands-harmony | 这一拍，刚好和你 · Two of Us | 这一拍，刚好和你 | 9/9 | 0 | 通过 |
| same-pace-star | 慢一点，也和你一起 · Two of Us | 慢一点，也和你一起 | 8/8 | 0 | 通过 |
| steady-together | 稳稳地，和你一起向前 · Two of Us | 稳稳地，和你一起向前 | 8/8 | 0 | 通过 |
| moving-home-together | 一起，把家搬进来 · Two of Us | 一起，把家搬进来 | 8/8 | 0 | 通过 |
| moon-base-power | 月面，保持有光 | 月面，保持有光 | 9/9 | 0 | 通过 |
| fog-navigation | 雾里，跟着你走 | 雾里，跟着你走 | 9/9 | 0 | 通过 |
| cloud-recipe | 这一场雨，我们一起接 | 这一场雨，我们一起接 | 9/9 | 0 | 通过 |
| together-zipper | 把两边，拉成我们 · Two of Us | 把两边，拉成我们 | 7/7 | 0 | 通过 |
| seven-day-garden | 把七天，养成一朵花 · Two of Us | 把七天，养成一朵花 | 10/10 | 0 | 通过 |
| constellation-relay | 把星光，一笔一笔交给你 · Two of Us | 把星光，一笔一笔交给你 | 9/9 | 0 | 通过 |
| balloon-dare | 气球胆量局 · Two of Us | 气球胆量局 | 8/8 | 0 | 通过 |
| number-target | 数字凑靶 · Two of Us | 数字凑靶 | 7/7 | 0 | 通过 |
| paper-soccer | 纸上球局 · Two of Us | 纸上球局 | 7/7 | 0 | 通过 |
| echo-arena | 回声擂台 · Two of Us | 回声擂台 | 8/8 | 0 | 通过 |
| dots-and-boxes | 这一格归谁 · Two of Us | 这一格归谁 | 8/8 | 0 | 通过 |
| light-trail-hunt | 光轨围猎 · Two of Us | 光轨围猎 | 8/8 | 0 | 通过 |
| orbit-star-race | 这一颗我先到 · Two of Us | 朱方 | 9/9 | 0 | 通过 |
| secret-recipe-code | 藏好这一味 · Two of Us | 藏好这一味 | 8/8 | 0 | 通过 |
| memory-bid | 这一串，我还记得 | 这一串，我还记得 | 8/8 | 0 | 通过 |
| garden-resource-duel | 这一朵，我先养开 · Two of Us | 这一朵，我先养开 | 6/6 | 0 | 通过 |
| heart-catapult | 这一颗，绕回来找你 · 双人爱心投射 | 这一颗，绕回来找你 | 7/7 | 0 | 通过 |
| soft-sumo | 软软相扑 | 软软相扑 | 9/9 | 0 | 通过 |
| reaction-duel | 反应力对决 | 别急。等它变绿。 | 4/4 | 0 | 通过 |
| ribbon-tug | 心动拔河 · Two of Us | 心动拔河 | 5/5 | 0 | 通过 |

### A 级阶段结论

- 真实 Chrome 首载：50/50 通过。
- HTTP 错误、资源加载失败、意外公网请求、console warning/error：均为 0。
- 50 个作品页面都没有页内“返回作品库”链接；这不是本轮定义的阻断 bug，入口返回将用“门户点击 → 浏览器后退”在代表深测中验证。
- `love-tree` 没有 `h1/h2`，但页面标题、正文、资源与脚本均正常；记录为语义观察，不判为首载失败。

## 4. 非 A 首载矩阵

待完成。

## 5. A/B/C/D 高风险代表深测

待完成。

## 6. 端口释放与最终仓库验收

待完成。

## 借鉴与来源声明

本文是对本仓库实际页面、统一运行时和 Chrome 运行证据的原创验收记录，没有复制第三方项目文案、代码或测试报告。
