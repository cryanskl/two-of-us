# C 级“你记得，我们在哪里”产品与实现规格

- 日期：2026-07-25
- 工作 ID：`our-place-guess`
- 分类：co-op
- 能力等级：C，本机服务 + 同一可信局域网内两台设备
- 前置文档：[`330-our-place-guess-research.md`](./330-our-place-guess-research.md)、[`331-our-place-guess-brainstorm.md`](./331-our-place-guess-brainstorm.md)
- 本阶段范围：冻结首版行为与验收合同；不写生产代码
- 状态：规格通过，可进入实施计划

## 1. 产品合同

目录名：

```text
你记得，我们在哪里
```

目录短说明：

```text
看同一段回忆，各自密封落点，再一起揭晓真正的地方。
```

一句话规则：

> 每轮两个人看到同一条共同回忆，各自在离线世界图上放下一枚 pin；两枚都密封后，同时揭晓目标，并按两人中较远的一枚得到共同等级。

首版固定：

- 恰好 2 名玩家；
- 恰好 4 轮；
- 每轮不限时；
- 每人每轮恰好一份有效提交；
- 只产生共同结果，不产生赢家；
- 两台设备、同一可信局域网；
- 公网依赖为无；
- 账号、存档、定位和照片为无。

## 2. 用户流程

### 2.1 启动

首次使用：

1. macOS 双击仓库根目录 `setup.command`；
2. Windows 双击仓库根目录 `setup.bat`。

此后使用：

1. 双击作品目录的 `start.command` / `start.bat`；
2. 启动器调用根目录 `scripts/start.mjs --experience our-place-guess`；
3. 若仓库运行时已启动，复用合格端口和服务；
4. 否则启动本地 Node 运行时并打开作品；
5. 终端显示同一局域网入口，第二台设备访问该地址。

本作不能通过 `file://` 直接双击 `index.html` 游玩。所谓“此后点开即用”指统一安装一次后双击 C 级启动器。

### 2.2 大厅

1. 第一人创建五位码房间；
2. 第二人输入房间码加入；
3. 第三人不能成为活跃玩家，收到“房间里已经有两个人了”并返回大厅；
4. 两人到齐后，房主选择题包：
   - 使用仓库内的虚构示例；
   - 或通过文件选择器读取本机私人 JSON；
5. 房主页面显示题包校验结果，但不显示本地绝对路径；
6. 访客只看到“房主题包已准备 / 尚未准备”，看不到卡组内容；
7. 房主点击“开始四段回忆”。

### 2.3 单轮

1. 双方同时看到当前卡的标题、线索和可选时间提示；
2. 地图初始显示完整世界轮廓，不显示目标；
3. 玩家点按地图放置自己的 pin；
4. 玩家可拖动、方向键或四向按钮微调；
5. 玩家点击“密封这枚落点”；
6. 提交成功后 pin 冻结，页面只显示自己已提交与等待对方；
7. 第一份提交不会向另一位玩家或房主页面代码公开另一份内容；
8. 两份提交到齐后，本机 Node 裁判向冻结的两名玩家同时发送密封结果；
9. 房主用本地私有卡片目标计算结果，发布可验证的揭晓状态；
10. 双方看到目标、两枚玩家 pin、各自距离、共同档位、结果结语和复盘问题；
11. 房主点击“下一段回忆”。

### 2.4 终局

第四轮揭晓后显示：

- 四轮共同档位；
- 两个人都在 200 km 内的轮数；
- `jointDistance` 最小的一轮；
- 固定结语；
- 私人题包可选的整场结语。

房主可点击“再走一遍”。重开：

- 生成新的 `gameId`；
- 仍按题包顺序使用前四张；
- 清空所有落点、密封结果和总结；
- 保留当前房主浏览器内已校验的题包；
- 保留准备者设计的叙事顺序，但不保留上一局成绩。

## 3. 地点题包合同

### 3.1 JSON schema

私人题包使用 UTF-8 JSON：

```json
{
  "schemaVersion": 1,
  "title": "我们的四张地图",
  "finalNote": "总有一些坐标，只有我们知道为什么重要。",
  "cards": [
    {
      "id": "night-by-the-sea",
      "title": "路灯熄灭以后",
      "clue": "我们在海边坐到很晚，最后一起跑去赶车。",
      "era": "初秋",
      "target": {
        "longitude": 121.4737,
        "latitude": 31.2304
      },
      "revealNote": "你先想起的是风，还是那天没说完的话？"
    }
  ]
}
```

### 3.2 校验

整包规则：

- 文件大小 `1..65536` bytes；
- 根对象只接受 `schemaVersion`、`title`、`finalNote`、`cards`；
- `schemaVersion` 必须严格等于 `1`；
- `title`：1–40 Unicode code point；
- `finalNote`：可选，0–120 code point；
- `cards`：4–24 张；
- 卡片 ID 唯一；
- 解析、规范化、深拷贝后递归冻结；
- 任一字段失败则整包原子拒绝，不做部分导入。

首版始终按文件顺序使用 `cards[0..3]`。模板建议正好四张；多于四张时校验仍成功，但房主开始前必须看到“本局按顺序使用前四张，其余 N 张忽略”，并能取消开始、重新选择文件。不得随机抽题或重排准备者的叙事顺序。

卡片规则：

- 只接受 `id`、`title`、`clue`、`era`、`target`、`revealNote`；
- `id`：`[a-z0-9][a-z0-9-]{0,47}`；
- `title`：1–40 code point；
- `clue`：1–160 code point；
- `era`：可选，0–24 code point；
- `revealNote`：可选，0–120 code point；
- `target` 只接受 `longitude` 和 `latitude`；
- longitude 是 `[-180, 180]` 内有限数；
- latitude 是 `[-80, 80]` 内有限数；
- 坐标最多保留 6 位小数；
- 不接受 HTML、Markdown、URL、地址、图片、文件路径或额外字段。

字符串只做首尾空白清理和 CRLF 规范化，超长直接拒绝，不静默截断。渲染必须使用 `textContent`。

### 3.3 私人文件边界

- `<input type="file" accept="application/json,.json">` 只出现在房主页面；
- 使用 `File.size` 先做上限检查，再调用 `File.text()`；
- 文件内容只存在房主标签页内存；
- 不通过 `fetch` 上传，不提交给 Node，不广播整个题包；
- 不显示绝对路径；
- 不写 localStorage、sessionStorage、IndexedDB、Cookie 或下载缓存；
- 切换题包、离开房间、成员变化、主机迁移、socket 断开和页面刷新都会清除私人题包；
- 浏览器文件选择器的最近文件记录属于浏览器/操作系统行为，本作不声称能清除；
- 正常 UI 不向访客泄露目标，但房主本人本来就拥有文件，本作不防房主记忆答案。

### 3.4 虚构示例

仓库内置 4 张完全虚构的世界尺度地点卡，供零配置走通流程。示例：

- 不使用作者或用户真实经历；
- 不使用真实地址、照片或私人称呼；
- 可使用宽泛、原创的虚构情境；
- 目标分布在 `|latitude| <= 70`；
- 文件顺序就是固定游玩顺序，四张至少跨两个世界区域；
- README 明示示例目标随静态文件公开，不提供开发者工具级秘密。

示例题包和私人题包走同一校验器与规则层。

## 4. 地图合同

### 4.1 数据

唯一外部地图数据：

- Natural Earth Vector v5.1.2；
- tag commit `f1890d9f152c896d250a77557a5751a93d494776`；
- `geojson/ne_110m_land.geojson`；
- 原始 SHA-256 `9e0729ee253ca7d7a5c4ae9395fb1902264c5377c52e224d13dd85010e2835d9`；
- public domain；
- 只使用物理陆地多边形，不使用行政边界、国家、城市、标签、道路或在线瓦片。

生产页只读取仓库内派生静态资产，不在运行时访问 GitHub 或 Natural Earth。

### 4.2 派生

派生过程必须确定性：

1. 校验固定输入哈希；
2. 校验 `FeatureCollection` 和 Polygon/MultiPolygon；
3. 删除 `properties`、`name` 和旧式 `crs`；
4. 坐标按固定小数位规范化；
5. 输出最小 JSON；
6. 记录输出 SHA-256；
7. 对相同输入重复运行产生逐字节相同输出。

不得手工复制网页 SVG path，也不得截取第三方地图截图作为背景。

### 4.3 投影

显示使用等距圆柱投影：

```text
x = (longitude + 180) / 360
y = (90 - latitude) / 180
longitude = x * 360 - 180
latitude = 90 - y * 180
```

规则：

- 输入点钳制到 `[0, 1]`；
- 经度规范化到 `[-180, 180]`；
- 纬度钳制到 `[-80, 80]`；
- 反变换最多保留 6 位小数；
- 地图图形不作为公里距离计算依据；
- README 说明高纬视觉拉伸和小比例尺概化。

### 4.4 视口

自研 SVG 交互，不引入 Leaflet：

- 缩放档位固定 `1× / 2× / 4× / 8×`；
- `+`、`−`、`重置视图`为原生按钮；
- 指针拖动平移；
- 双指缩放不是首版必需；
- 视口永远钳制在世界边界；
- 缩放和平移只改变视觉变换，不改变已选经纬度；
- 结果页提供“显示全部落点”以自动 fit 三枚 pin；
- `prefers-reduced-motion` 下视口切换即时完成。

### 4.5 落点输入

- 首次点击/触摸地图放置 pin；
- 未提交前再次点击移动 pin；
- pin 可拖动；
- 地图获得焦点后方向键移动；
- 普通方向键每次 `0.5°`，Shift + 方向键每次 `0.1°`；
- 同步提供四个原生微调按钮，触屏无需键盘；
- 当前选择以“北纬/南纬、东经/西经和一位小数”文字显示；
- 提交按钮在没有合法 pin 时禁用；
- 提交前确认区说明“提交后本轮不能修改”；
- 提交后移除拖动与微调能力；
- 不启用浏览器地理定位。

## 5. 距离与共同成绩

### 5.1 haversine

两点大圆距离：

```text
R = 6371.0088 km
Δφ = φ2 - φ1
Δλ = wrapToPi(λ2 - λ1)
a = sin²(Δφ/2) + cos(φ1)cos(φ2)sin²(Δλ/2)
c = 2 atan2(√a, √(1-a))
d = R × c
```

要求：

- 角度先转弧度；
- `Δλ` 规范化到 `[-π, π]`，正确跨越反经线；
- `a` 因浮点误差钳制到 `[0, 1]`；
- 规则层保留未舍入公里数；
- UI：小于 10 km 显示一位小数，否则显示整数；
- 相同坐标返回 0；
- 函数对调两点结果相同；
- 不声称导航级精度。

### 5.2 单轮共同档位

```text
jointDistance = max(distanceA, distanceB)
```

固定档位：

| 条件 | ID | 展示文案 |
| --- | --- | --- |
| `jointDistance <= 50` | `close` | 像昨天才去过 |
| `<= 200` | `near` | 方向一直在 |
| `<= 800` | `familiar` | 记忆还认得回家的路 |
| `> 800` | `far` | 下次一起把它记得更清楚 |

两人距离都展示，但不用颜色、排序或奖牌标记谁更好。

### 5.3 终局摘要

规则层从四轮已揭晓结果纯函数派生：

```js
{
  rounds: 4,
  bothWithin200Count,
  closestRoundIndex,
  closestJointDistance,
  tiers
}
```

若多个回合相同，选择较早回合。终局不计算总公里数、平均排名或个人胜场。

## 6. 状态机

### 6.1 阶段

```text
idle
  └─ START(valid pack, two members) → guessing
guessing
  └─ VALID_SEALED_RESULT → revealed / finished
revealed
  └─ NEXT → guessing
finished
  └─ RESTART(valid retained pack, same members) → guessing
any active phase
  └─ MEMBERS_OR_HOST_CHANGED / DISCONNECT / LEAVE → idle + clear secrets
```

没有倒计时、暂停、跳题或回退。

### 6.2 房主私有状态

房主私有内存可保存：

```js
{
  pack,
  activeCards,
  state
}
```

`activeCards` 始终是 `pack.cards.slice(0, 4)` 的隔离冻结副本；`pack` 和 `activeCards` 都不进入公开状态。`state`：

```js
{
  schemaVersion: 1,
  version,
  phase,
  gameId,
  memberIds,
  roundIndex,
  totalRounds: 4,
  roundId,
  card: {
    id,
    title,
    clue,
    era
  },
  lastResult,
  summaries
}
```

`lastResult` 仅在 `revealed` / `finished`：

```js
{
  roundId,
  cardId,
  target: { longitude, latitude },
  submissions: [
    { memberId, point: { longitude, latitude }, distanceKm }
  ],
  jointDistanceKm,
  tierId,
  revealNote
}
```

`summaries` 只包含已经揭晓轮次的结果，不含未来卡片。

### 6.3 不变量

- `schemaVersion === 1`；
- `version` 是严格递增正整数；
- `memberIds` 恰好是冻结且有序的两名房间成员；
- `totalRounds === 4`；
- `roundIndex` 为 `0..3`；
- `roundId === gameId + "-r" + (roundIndex + 1)`；
- `card` 只含当前公开字段；
- `guessing` 时 `lastResult === null`；
- `revealed` 时 `roundIndex < 3`；
- `finished` 时 `roundIndex === 3`；
- summaries 数量在 guessing 时等于 `roundIndex`，在 revealed/finished 时等于 `roundIndex + 1`；
- 每个结果的成员、卡片、距离、共同距离和档位都可由密封结果与揭晓目标重新计算；
- 未来目标永不进入公开状态。

合法状态上的非法动作返回同一对象引用。公开函数输出与输入断开引用并递归冻结。

## 7. 房间协议

### 7.1 共享协议复用

不修改 `shared/runtime`。使用：

- `room:create`
- `room:join`
- `room:leave`
- `room:state`
- `room:direct`
- `room:sealed-submit`
- `room:sealed-result`

### 7.2 常量

```js
SEALED_NAMESPACE = "our-place"
STATE_MESSAGE_TYPE = "our-place:state"
```

`gameId` 使用 `[A-Za-z0-9_-]{1,40}`，`roundId` 总长不超过 64。

### 7.3 房主状态

房主只向另一位活跃成员定向发送：

```js
socket.emit("room:direct", {
  roomId,
  targetId: guestId,
  type: "our-place:state",
  data: publicState
})
```

访客只接受：

- `message.roomId === currentRoomId`；
- `message.senderId === knownHostId`；
- `type === "our-place:state"`；
- 成员列表与当前两位按顺序相同；
- schema 合法；
- version 严格递增；
- 状态能从当前状态按唯一合法转移推导。

### 7.4 密封提交

每人提交：

```js
socket.emit("room:sealed-submit", {
  roomId,
  namespace: "our-place",
  roundId,
  data: {
    cardId,
    point: {
      longitude,
      latitude
    }
  }
})
```

客户端先规范化到最多 6 位小数。结果验证器要求：

- room、namespace、roundId 与当前回合一致；
- 恰好两份提交；
- memberId 恰好覆盖冻结的两位成员且不重复；
- data 只有 `cardId` 与 `point`；
- cardId 与当前公开卡一致；
- point 只有两个合法有限坐标；
- 成员顺序按冻结 `memberIds` 规范化。

### 7.5 acknowledgment 与重复提交

- 第一次成功提交后本地立即进入 `submitted`；
- ack `pending: true` 只表示仍等另一人，不含答案；
- 若 ack 丢失，可重发**逐字节语义相同**的规范化 payload；
- 共享层把相同重复提交视为幂等；
- 坐标不同的重复提交返回 `SEALED_ALREADY_SUBMITTED`；
- UI 保留原提交并显示“本轮已经密封，不能修改”；
- `room:sealed-result` 可能早于 ack，结果优先推进，不回退到等待态；
- 完成结果的 replay 只能重放同一结果，不能推进两次。

### 7.6 乱序

房主在收到合法 `room:sealed-result` 后：

1. 用当前私有卡目标计算揭晓状态；
2. 本地应用；
3. 通过 `room:direct` 发布。

访客可能先收到 host state、后收到 sealed result。访客维护最多 4 个 envelope 的有界队列：

- 未有对应密封结果的合法未来一版本状态暂存；
- 密封结果到达后重新计算并逐一重放；
- 非连续版本、超过当前一轮的未来状态、重复版本和旧 host 状态丢弃；
- 队列溢出时清空并显示“状态不同步，请重新加入”，不无限增长。

访客不盲信 host 给出的距离和档位，必须用自己收到的 sealed result 与 target 重算后逐字段一致才显示。

### 7.7 成员变化与重连

使用 `reconcileTwoPlayerMembership`：

- 只取最早两位为 active；
- 第三人 `shouldExit` 后主动 leave 并返回大厅；
- 成员 ID 顺序、active 集合或 host ID 变化即 `shouldReset`；
- reset 清空游戏、pin、队列、密封结果、文件内容与文件名；
- 原 host 离开后，剩余成员被提升为新 host，但不能继承旧比赛；
- 新 host 回到 idle，重新选题包，等第二位玩家加入；
- socket 断开即清空房间 ID 和全部本地状态；
- 自动重连只恢复 socket 连接，不自动重入房间；
- 不用 Cookie、token、昵称或设备指纹恢复身份；
- 刷新等同离开，不断线续局。

## 8. 隐私与安全声明

页面与 README 必须明确：

> 私人题包只由房主浏览器读取，不上传公网，也不保存。双方落点会交给房主电脑上的本机 Node 裁判密封，收齐后才发给两位玩家；它不是端到端加密，请只在信任的设备和局域网中使用。

诚实边界：

- 房主拥有私人文件和目标答案；
- 本机 Node 裁判能在揭晓前读到双方提交；
- 房间码不是密码；
- 静态虚构题包可被查看源码；
- 不防开发者工具、窥屏、恶意改客户端或现实口头泄露；
- 本作保护的是正常 UI 流程中的阶段秘密；
- 不监听 `0.0.0.0` 以外的公共部署，不提供 TLS；
- 不应端口转发到公网。

输入防护：

- 所有文案只通过 `textContent`；
- JSON 只接受 plain object / array / string / finite number；
- 拒绝 accessor、循环引用、prototype 异常和额外字段；
- 不把用户字符串插入 HTML、CSS、URL、文件名或日志；
- 房间提交小于共享密封上限 2 KB；
- 不接受图片、data URL、blob URL 或任意链接。

## 9. 页面与可访问性

### 9.1 页面区

```text
connection / offline
lobby
room header + members + room code
pack setup（host only）
round clue
map viewport
pin controls
sealed waiting
reveal panel
final summary
```

每阶段只渲染需要的信息。目标和结果不能预先放在 `hidden`、`aria-hidden`、`data-*`、SVG metadata、CSS 变量或透明图层。

### 9.2 键盘

- Tab 可遍历创建、加入、文件选择、开始、地图、缩放、微调、提交和下一轮；
- Enter/Space 激活原生按钮；
- 地图焦点时方向键移动 pin；
- Shift + 方向键细调；
- Escape 不执行破坏性动作；
- 焦点在阶段切换后移到新阶段标题；
- 不覆盖输入框中的方向键。

### 9.3 触屏

- 触控目标至少 48×48 CSS px；
- 地图区域 `touch-action: none` 仅在主动地图层；
- 拖动 pin 时页面不跟随滚动；
- 页面其他区域保持正常纵向滚动；
- pointer capture 在 up/cancel/lostcapture 时释放；
- 390×844 可在不横向滚动下完成一轮；
- 不依赖 hover。

### 9.4 非颜色信息

- 玩家一：`● 你`；
- 玩家二：`◆ 对方`；
- 目标：`★ 真正地点`；
- 三者同时有形状、文字、描边和颜色；
- 结果线型不同；
- 状态用完整文本说明；
- `aria-live="polite"` 只播报连接、提交、对方已提交、揭晓和终局，不播报拖动每一帧。

### 9.5 动态与强制颜色

- `prefers-reduced-motion`：取消 pin 弹跳、连线绘制和视口动画；
- `forced-colors`：使用系统颜色、边框和文本保持三类点可分；
- 地图数据失败时不允许开始，给出本地资产错误，不用空白地图继续；
- CSS 背景或装饰失败不影响题包、房间、落点和结果。

## 10. 文件与模块

计划生产目录：

```text
experiences/co-op/our-place-guess/
├── index.html
├── styles.css
├── sample-pack.js
├── pack.js
├── pack.test.js
├── map.js
├── map.test.js
├── logic.js
├── logic.test.js
├── protocol.js
├── protocol.test.js
├── app.js
├── README.md
├── ATTRIBUTION.md
├── start.command
├── start.bat
└── assets/
    ├── ne-110m-land.min.geojson
    └── favicon.svg
```

开发期来源脚本：

```text
scripts/vendor-our-place-map.mjs
```

职责：

- `pack.js`：题包 schema、解析、深冻结和安全摘要；
- `map.js`：投影/反投影、视口钳制、pin 规范化、GeoJSON 验证；
- `logic.js`：状态机、haversine、档位和终局摘要；
- `protocol.js`：成员协调、host envelope、密封结果验证和乱序队列；
- `app.js`：DOM、File API、Socket.IO、SVG/pointer/keyboard 与渲染；
- `sample-pack.js`：冻结的虚构示例；
- vendoring 脚本：固定来源下载、哈希校验和确定性派生。

不新增 npm 依赖，不修改 `shared/runtime`。

## 11. 集成

实施时更新：

- `experiences/catalog.json`：新增 installed C / co-op 项；
- `experiences/co-op/README.md`；
- 根 `README.md`；
- `docs/README.md`；
- 需要时扩展 catalog/contract 定向测试；
- 不改 orchestration Board 的历史状态，除非主任务另有明确工作流要求。

目录依赖应只声明仓库已有 Socket.IO 运行时，不新增项目私有 `package.json`、lockfile、CDN 或 vendor JS。

## 12. 自动化测试

### 12.1 题包

- 合法 4 张与 24 张；
- 文件大小边界；
- JSON 解析失败；
- 根/卡片/target 额外字段；
- schema、数量、重复 ID；
- Unicode code point 长度；
- NaN、Infinity、字符串坐标、超范围和纬度超过 80；
- HTML/URL 字段被 schema 拒绝或按普通纯文本处理；
- 原子拒绝；
- 返回值与输入断开并深冻结；
- 虚构示例通过同一校验器。

### 12.2 地图

- 投影/反投影往返；
- 世界四角和边界；
- 纬度钳制；
- 1×/2×/4×/8× 视口；
- 平移不出世界；
- pointer 到经纬度；
- 键盘 0.5° 与 Shift 0.1°；
- GeoJSON 只含合法 Polygon/MultiPolygon；
- 派生脚本固定输入哈希；
- 连续两次派生逐字节一致；
- 页面运行资产输出哈希与 attribution 记录一致。

### 12.3 距离

- 相同点为 0；
- 对称性；
- 赤道 1° 经度；
- 高纬 1° 经度；
- 跨 ±180° 取短路；
- 近对跖点不产生 NaN；
- 输入无效返回拒绝；
- 四个档位边界 `50/200/800`；
- `jointDistance` 取较大值；
- 终局并列选择较早回合。

### 12.4 状态机

- 需要两位成员、合法题包和四张卡才能开始；
- 严格按文件顺序使用前四张，多余卡数量形成明确房主提示；
- guessing 不含 target；
- 合法密封结果原子揭晓；
- 成员、card、round 或坐标畸形结果拒绝；
- 下一轮递增 version 与 roundId；
- 第四轮进入 finished；
- 重开生成新 gameId 并清空摘要；
- 非法动作返回同一引用；
- view/summary 深冻结且无未来目标。

### 12.5 协议

- 只有已知 host 的同房间状态可进入队列；
- 旧 version、跳 version、旧 host、第三人、错 room/type 拒绝；
- host state 先于 sealed result 时可有界暂存并重放；
- 队列最多 4，溢出失败关闭；
- 密封结果恰好覆盖冻结两人；
- 重复 member、额外字段、错 namespace/round/card 拒绝；
- 两份坐标按成员顺序规范化；
- 相同重复提交幂等；
- 修改坐标的重复提交不可覆盖；
- result 早于 ack 不回退；
- 成员替换、host 迁移和 disconnect 清空所有秘密。

## 13. 浏览器验收 Gate

使用 Chrome MCP 做真实双端与移动视口验证。首版必须通过：

### 13.1 启动与离线

- 从干净统一安装后双击作品启动器可直达；
- 运行时已存在时复用，不重复占端口；
- 第二台/第二上下文通过局域网 URL 加入；
- Network 仅访问本机 host；
- 不访问 GitHub、Natural Earth、CDN、字体、瓦片、统计或 API；
- 停止本地服务后给出明确离线状态。

### 13.2 房间

- 创建/加入同一五位码；
- 两人到齐才能开始；
- 第三人被拒并返回大厅；
- 房主离开后剩余端升主但清局；
- 新成员加入后不能继承旧卡、旧 pin 或旧结果；
- 刷新/断线不自动续局。

### 13.3 题包

- 虚构示例走通；
- 合法私人 JSON 在房主端导入；
- 访客看不到文件名、卡组或未揭晓目标；
- 非法/超大 JSON 有字段级中文错误；
- 清局后房主必须重新选择私人文件；
- 访客端 DOM、Network 和 console 输出不出现私人完整卡组；房主可通过开发者工具检查自己标签页的内存，本作不承诺对房主隐藏其自有文件。

### 13.4 完整四轮

- 双方看到相同公开线索；
- 第一人提交后另一端不出现坐标；
- 第二人提交后双方同时揭晓；
- 两端三枚 pin、距离、档位一致；
- 修改后重复提交不能覆盖；
- 结果早于 ack 的模拟仍只揭晓一次；
- 四轮结束摘要一致；
- 重开顺序、落点和摘要全部清空。

### 13.5 输入与可访问性

- 鼠标点按、拖动、缩放和平移；
- 触屏 pointer 路径；
- 仅键盘可放置、微调、提交和进入下一轮；
- 320、390、768、1280 px 无横向溢出；
- 200% 浏览器缩放可完成一轮；
- `prefers-reduced-motion` 无必要动画；
- forced-colors 下三种 pin 可区分；
- AX 树能读出房间、线索、当前坐标、提交状态、各自距离和共同结果；
- 控制台无 error/warning。

## 14. 借鉴与来源声明

生产 README 与 `ATTRIBUTION.md` 至少保留：

1. **Posio**
   - `abrenaut/posio`
   - commit `00262568749fa841994f4c7d6d9a8c75115955d7`
   - MIT
   - Copyright (c) 2024 Arthur Brenaut
   - 只研究多人地图落点、距离和回合这一抽象问题
   - 明示未复制源码、UI、题库、文案、素材、协议和 Django/Redis 栈
2. **Natural Earth**
   - v5.1.2 / commit `f1890d9f152c896d250a77557a5751a93d494776`
   - `ne_110m_land.geojson`
   - public domain
   - 输入/输出 SHA-256、转换过程和 `Made with Natural Earth`
3. **Socket.IO**
   - 4.8.1 / MIT
   - 仓库现有统一直接依赖
4. **本仓库内部经验**
   - `compatibility-quiz` / `sealed-rps`：密封结果和乱序校验
   - `lan-pictionary` / `lan-connect-four`：host 权威、成员变化清局
   - `panorama-memory`：用户本地文件不上传、不持久化
   - `fog-navigation`：阶段秘密不能只藏在 DOM

分别声明：

- 游戏代码由本仓库独立实现；
- 地图几何来自 Natural Earth；
- favicon 与页面视觉必须独立绘制或另行记录生成来源；
- 私人题包版权和内容责任属于准备者，不随仓库分发。

## 15. 首版验收标准

全部满足才算完成：

- C / co-op / installed，统一安装与启动器合同通过；
- 两台设备完成四轮密封落点；
- 私人题包只在房主浏览器内存，不进入静态目录、Node、存储或公网；
- guessing 的公开状态、DOM 和消息没有 target；
- 两份提交到齐前任何浏览器都不收到另一份坐标；
- 揭晓由合法密封结果驱动，访客可重算 host 结果；
- host 迁移、成员变化、第三人、刷新和断线行为符合规格；
- haversine、反经线、档位和终局摘要有纯逻辑测试；
- 离线 Natural Earth 派生资产有固定版本、哈希和声明；
- 触屏、鼠标和键盘都能完整游玩；
- Chrome 双端、移动视口、AX、Network 和 console Gate 通过；
- `npm test`、`npm run verify`、脚本语法检查与 `git diff --check` 通过；
- README / ATTRIBUTION 完整区分外部概念、地图数据、代码与视觉资产；
- 没有 Posio 源码/UI/题库、Django、Redis、Leaflet、在线瓦片或新 npm 依赖。
