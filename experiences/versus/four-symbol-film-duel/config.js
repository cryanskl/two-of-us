"use strict";

(function exposeConfig(root, factory) {
  var config = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = config;
  }
  if (root) {
    root.FOUR_SYMBOL_FILM_CONFIG = config;
  }
})(typeof window === "object" ? window : null, function createConfig() {
  var tokens = [
    { id: "alarm-clock", glyph: "⏰", labelZh: "闹钟", concepts: ["时间", "清晨", "提醒"] },
    { id: "antenna", glyph: "📡", labelZh: "天线", concepts: ["信号", "远方", "联络"] },
    { id: "balloon", glyph: "🎈", labelZh: "气球", concepts: ["漂浮", "庆祝", "轻盈"] },
    { id: "basket", glyph: "🧺", labelZh: "篮子", concepts: ["收纳", "野餐", "携带"] },
    { id: "bird", glyph: "🐦", labelZh: "小鸟", concepts: ["飞翔", "清晨", "歌唱"] },
    { id: "book", glyph: "📖", labelZh: "书本", concepts: ["故事", "阅读", "纸页"] },
    { id: "bread", glyph: "🍞", labelZh: "面包", concepts: ["烘烤", "早餐", "香气"] },
    { id: "bus", glyph: "🚌", labelZh: "巴士", concepts: ["乘车", "城市", "站点"] },
    { id: "butterfly", glyph: "🦋", labelZh: "蝴蝶", concepts: ["花园", "轻盈", "变化"] },
    { id: "cat", glyph: "🐈", labelZh: "猫", concepts: ["动物", "轻步", "陪伴"] },
    { id: "cloud", glyph: "☁️", labelZh: "云朵", concepts: ["天空", "柔软", "天气"] },
    { id: "comet", glyph: "☄️", labelZh: "彗星", concepts: ["太空", "飞行", "长尾"] },
    { id: "cup", glyph: "☕", labelZh: "杯子", concepts: ["饮品", "温暖", "停留"] },
    { id: "dog", glyph: "🐕", labelZh: "小狗", concepts: ["动物", "陪伴", "守候"] },
    { id: "door", glyph: "🚪", labelZh: "门", concepts: ["入口", "离开", "房间"] },
    { id: "dove", glyph: "🕊️", labelZh: "白鸟", concepts: ["飞行", "平静", "送信"] },
    { id: "fish", glyph: "🐟", labelZh: "鱼", concepts: ["水中", "游动", "鳞片"] },
    { id: "flower", glyph: "🌼", labelZh: "小花", concepts: ["花园", "开放", "春天"] },
    { id: "frog", glyph: "🐸", labelZh: "青蛙", concepts: ["池塘", "跳跃", "雨天"] },
    { id: "gift", glyph: "🎁", labelZh: "礼物", concepts: ["惊喜", "盒子", "赠送"] },
    { id: "goose", glyph: "🪿", labelZh: "鹅", concepts: ["动物", "水边", "行走"] },
    { id: "house", glyph: "🏠", labelZh: "房子", concepts: ["家", "屋顶", "归来"] },
    { id: "island", glyph: "🏝️", labelZh: "小岛", concepts: ["海面", "远方", "独处"] },
    { id: "key", glyph: "🔑", labelZh: "钥匙", concepts: ["开启", "秘密", "门锁"] },
    { id: "ladder", glyph: "🪜", labelZh: "梯子", concepts: ["攀爬", "高度", "连接"] },
    { id: "lamp", glyph: "💡", labelZh: "灯", concepts: ["照亮", "想法", "夜晚"] },
    { id: "leaf", glyph: "🍃", labelZh: "叶子", concepts: ["风", "植物", "轻盈"] },
    { id: "mailbox", glyph: "📮", labelZh: "邮箱", concepts: ["信件", "投递", "等待"] },
    { id: "mirror", glyph: "🪞", labelZh: "镜子", concepts: ["倒影", "相对", "房间"] },
    { id: "moon", glyph: "🌙", labelZh: "月亮", concepts: ["夜晚", "月光", "天空"] },
    { id: "owl", glyph: "🦉", labelZh: "猫头鹰", concepts: ["夜晚", "飞行", "守望"] },
    { id: "pencil", glyph: "✏️", labelZh: "铅笔", concepts: ["书写", "绘画", "修改"] },
    { id: "radio", glyph: "📻", labelZh: "收音机", concepts: ["广播", "声音", "旧物"] },
    { id: "rain", glyph: "🌧️", labelZh: "雨云", concepts: ["雨天", "水滴", "天空"] },
    { id: "rainbow", glyph: "🌈", labelZh: "彩虹", concepts: ["雨后", "弧线", "天空"] },
    { id: "rocket", glyph: "🚀", labelZh: "火箭", concepts: ["发射", "太空", "远行"] },
    { id: "satellite", glyph: "🛰️", labelZh: "卫星", concepts: ["轨道", "信号", "太空"] },
    { id: "shell", glyph: "🐚", labelZh: "贝壳", concepts: ["海边", "回声", "收藏"] },
    { id: "snail", glyph: "🐌", labelZh: "蜗牛", concepts: ["缓慢", "小屋", "雨后"] },
    { id: "sparkles", glyph: "✨", labelZh: "闪光", concepts: ["明亮", "魔法", "星光"] },
    { id: "star", glyph: "⭐", labelZh: "星星", concepts: ["夜空", "发光", "远方"] },
    { id: "sun", glyph: "☀️", labelZh: "太阳", concepts: ["白天", "温暖", "晴朗"] },
    { id: "teapot", glyph: "🫖", labelZh: "茶壶", concepts: ["热饮", "容器", "蒸汽"] },
    { id: "telescope", glyph: "🔭", labelZh: "望远镜", concepts: ["观察", "远方", "星空"] },
    { id: "train", glyph: "🚆", labelZh: "列车", concepts: ["轨道", "远行", "车站"] },
    { id: "tree", glyph: "🌳", labelZh: "大树", concepts: ["森林", "生长", "树荫"] },
    { id: "umbrella", glyph: "☂️", labelZh: "雨伞", concepts: ["遮雨", "撑开", "同行"] },
    { id: "whale", glyph: "🐋", labelZh: "鲸鱼", concepts: ["海洋", "巨大", "远游"] }
  ];

  var packs = [
    {
      id: "midnight-room",
      title: "午夜小厅",
      subtitle: "安静的城市把故事留到灯灭以后",
      pairIds: ["midnight-1", "midnight-2", "midnight-3", "midnight-4"]
    },
    {
      id: "after-rain",
      title: "雨后加映",
      subtitle: "水洼、晴光和一场轻轻的远行",
      pairIds: ["rain-1", "rain-2", "rain-3", "rain-4"]
    },
    {
      id: "starlight-last-show",
      title: "星光末场",
      subtitle: "从屋顶慢慢开往宇宙边缘",
      pairIds: ["starlight-1", "starlight-2", "starlight-3", "starlight-4"]
    },
    {
      id: "sunday-screening",
      title: "周日放映",
      subtitle: "明亮、松软，还有一点不着急的幽默",
      pairIds: ["sunday-1", "sunday-2", "sunday-3", "sunday-4"]
    }
  ];

  function option(cardId, suffix, title) {
    return { id: cardId + "-" + suffix, title: title };
  }

  function card(data) {
    var cardId = data[0];
    var titles = data[8];
    var answerIndex = data[9];
    var removeIndex = data[10];
    var options = titles.map(function makeOption(title, index) {
      return option(cardId, "o" + (index + 1), title);
    });
    return {
      id: cardId,
      packId: data[1],
      pairId: data[2],
      side: data[3],
      difficulty: data[4],
      genre: data[5],
      tokens: data[6],
      answerOptionId: options[answerIndex].id,
      options: options,
      spotlightRemoves: options[removeIndex].id,
      rationale: data[7],
      authorship: "original-project-copy",
      reviewed: true
    };
  }

  var cards = [
    card(["midnight-1-a", "midnight-room", "midnight-1", "A", 1, "城市",
      ["umbrella", "rain", "alarm-clock", "key"],
      "一把雨伞替晚归的人守着钥匙，直到钟声响起。",
      ["雨伞借走了晚钟", "钟楼下的晴天", "钥匙睡在水洼边", "没有门的雨夜"], 0, 2]),
    card(["midnight-1-b", "midnight-room", "midnight-1", "B", 1, "城市",
      ["cup", "bus", "lamp", "moon"],
      "一只温热的杯子在夜班巴士旁等最后一盏灯。",
      ["月光停在空杯里", "蓝杯等到末班灯", "夜班车没有座位", "街角最后的热茶"], 1, 0]),
    card(["midnight-2-a", "midnight-room", "midnight-2", "A", 1, "动物",
      ["cat", "book", "moon", "bus"],
      "一只困猫抱着故事书，坐夜车去寻找睡眠。",
      ["夜车读完一本书", "纸船上的睡帽猫", "猫把月亮翻了页", "末班车去往梦里"], 2, 3]),
    card(["midnight-2-b", "midnight-room", "midnight-2", "B", 1, "动物",
      ["snail", "mailbox", "leaf", "alarm-clock"],
      "蜗牛背着一封叶子信，迟了半刻才到邮箱。",
      ["慢邮局没有屋顶", "叶子寄给一场雨", "钟声追不上蜗牛", "蜗牛邮差迟到半刻"], 3, 1]),
    card(["midnight-3-a", "midnight-room", "midnight-3", "A", 2, "奇幻",
      ["ladder", "cloud", "flower", "mirror"],
      "梯子穿过云层，镜中的花园倒挂在天空。",
      ["梯子通往倒挂花园", "云上只有一面镜子", "花朵忘记了地面", "天空折起一段楼梯"], 0, 1]),
    card(["midnight-3-b", "midnight-room", "midnight-3", "B", 2, "奇幻",
      ["teapot", "cloud", "lamp", "house"],
      "旧茶壶收住雷声，把它带回亮着灯的小屋。",
      ["会发光的空茶杯", "茶壶收留一颗雷声", "小屋煮开了夜色", "云朵借宿在灯下"], 1, 3]),
    card(["midnight-4-a", "midnight-room", "midnight-4", "A", 3, "太空",
      ["moon", "lamp", "mailbox", "flower"],
      "月背灯塔把一封带花香的信送向遥远春天。",
      ["月背灯塔寄来春天", "花信停在夜空里", "没有地址的月光", "灯塔种下一颗星"], 0, 2]),
    card(["midnight-4-b", "midnight-room", "midnight-4", "B", 3, "太空",
      ["comet", "train", "door", "star"],
      "彗尾列车驶入星站，却只找到一扇开启的门。",
      ["星门等候末班车", "彗星把轨道折弯", "彗尾车站只开一扇门", "列车驶过无声星海"], 2, 0]),

    card(["rain-1-a", "after-rain", "rain-1", "A", 1, "城市",
      ["umbrella", "house", "sun", "leaf"],
      "湿雨衣的口袋藏着叶片和刚亮起来的清晨。",
      ["屋檐收起一场雨", "清晨落进绿口袋", "雨衣口袋里的清晨", "太阳忘在门背后"], 2, 1]),
    card(["rain-1-b", "after-rain", "rain-1", "B", 1, "城市",
      ["lamp", "rain", "house", "sparkles"],
      "路灯照亮水洼，让碎光沿街回到家门。",
      ["路灯把水洼送回家", "雨夜留下三颗灯", "门前闪着一条河", "碎光走过空街"], 0, 3]),
    card(["rain-2-a", "after-rain", "rain-2", "A", 1, "动物",
      ["snail", "sun", "ladder", "cloud"],
      "蜗牛沿着长坡，把背上的晴天一点点推高。",
      ["云梯尽头没有雨", "蜗牛推着晴天上坡", "太阳住进小小的壳", "慢行者越过云层"], 1, 2]),
    card(["rain-2-b", "after-rain", "rain-2", "B", 1, "动物",
      ["goose", "cloud", "basket", "bread"],
      "白鹅守着云影下的野餐篮，等大家回来吃面包。",
      ["午餐飞到了云上", "白鹅替云守住午餐", "篮子里睡着一片天", "面包沿着河岸散步"], 1, 3]),
    card(["rain-3-a", "after-rain", "rain-3", "A", 2, "奇幻",
      ["fish", "rain", "house", "star"],
      "透明小鱼顺着雨线游过屋顶，鳞片映出星光。",
      ["玻璃鱼游过旧屋顶", "雨滴养大一颗星", "屋顶漂着透明河流", "夜空借走了鱼鳞"], 0, 2]),
    card(["rain-3-b", "after-rain", "rain-3", "B", 2, "奇幻",
      ["bird", "rainbow", "pencil", "cloud"],
      "小鸟用铅笔把云边缺掉的彩虹重新画好。",
      ["云朵学会画弧线", "小鸟衔走一盒彩笔", "小鸟修补了半片彩虹", "雨后天空留下铅印"], 2, 0]),
    card(["rain-4-a", "after-rain", "rain-4", "A", 3, "太空",
      ["satellite", "umbrella", "rain", "moon"],
      "一把星尘伞绕着蓝色天体，替卫星遮住微小流星雨。",
      ["蓝环外的微雨", "星尘雨伞停在蓝环", "卫星撑开夜空", "月雨落在轨道边"], 1, 3]),
    card(["rain-4-b", "after-rain", "rain-4", "B", 3, "太空",
      ["comet", "dove", "mailbox", "rocket"],
      "纸鸟从小行星间穿行，把远信投进火箭邮筒。",
      ["彗尾经过无名邮站", "纸鸟飞向红色火箭", "小行星带的纸鹤邮局", "宇宙来信没有邮票"], 2, 0]),

    card(["starlight-1-a", "starlight-last-show", "starlight-1", "A", 1, "城市",
      ["house", "radio", "moon", "lamp"],
      "天台收音机播完深夜节目，却忘了替屋里关灯。",
      ["天台收音机忘记关灯", "月光调到旧频道", "屋顶传来一段晚安", "最后的广播没有听众"], 0, 2]),
    card(["starlight-1-b", "starlight-last-show", "starlight-1", "B", 1, "城市",
      ["train", "leaf", "cup", "moon"],
      "夜车带着一盆清香小叶和一杯温水驶过月台。",
      ["月台长出一片绿", "夜车载着一盆薄荷", "杯沿经过最后一站", "叶子搭上了慢车"], 1, 3]),
    card(["starlight-2-a", "starlight-last-show", "starlight-2", "A", 1, "动物",
      ["frog", "star", "cup", "lamp"],
      "小青蛙在灯下用勺形杯子收集落下的星光。",
      ["池塘借来一盏灯", "星光掉进绿色杯子", "青蛙偷走了星光勺", "夜晚端来一杯闪光"], 2, 0]),
    card(["starlight-2-b", "starlight-last-show", "starlight-2", "B", 1, "动物",
      ["owl", "mailbox", "sun", "moon"],
      "夜行猫头鹰把写给清晨的信投进了月光邮箱。",
      ["猫头鹰寄错了黎明", "月夜没有收信人", "太阳收到一封晚信", "清晨邮局提早关门"], 0, 2]),
    card(["starlight-3-a", "starlight-last-show", "starlight-3", "A", 2, "奇幻",
      ["mirror", "island", "flower", "door"],
      "推开镜子背后的门，会看见一座开满花的小岛。",
      ["门后漂着一面镜子", "镜子背面种着小岛", "花岛没有倒影", "房间通往安静海面"], 1, 3]),
    card(["starlight-3-b", "starlight-last-show", "starlight-3", "B", 2, "奇幻",
      ["house", "leaf", "cloud", "cup"],
      "一阵南风住进冰冷小屋，把叶子和云吹进杯中。",
      ["杯子装下一阵天气", "冰屋等候绿色来信", "冰箱里住着一阵南风", "云朵躲进小小的家"], 2, 0]),
    card(["starlight-4-a", "starlight-last-show", "starlight-4", "A", 3, "太空",
      ["flower", "rocket", "moon", "gift"],
      "无重力花店把最后一束月光花交给远行火箭。",
      ["火箭捎走一束月光", "无重力花店最后一单", "太空礼物没有丝带", "花束漂过银色轨道"], 1, 3]),
    card(["starlight-4-b", "starlight-last-show", "starlight-4", "B", 3, "太空",
      ["moon", "star", "mailbox", "satellite"],
      "慢递员穿过月轨与星光，把一封信交给沉默卫星。",
      ["月轨之间的慢递员", "卫星等候第二封信", "月光邮路绕了一圈", "无人签收的轨道包裹"], 0, 2]),

    card(["sunday-1-a", "sunday-screening", "sunday-1", "A", 1, "城市",
      ["bread", "sun", "house", "sparkles"],
      "面包店把早晨的影子烤得暖暖发亮。",
      ["太阳在屋里醒来", "面包店把影子烤香", "发光吐司出门散步", "星期天的第一炉光"], 1, 2]),
    card(["sunday-1-b", "sunday-screening", "sunday-1", "B", 1, "城市",
      ["cloud", "house", "pencil", "sun"],
      "阳台小店用铅笔替散乱云朵画好边缘。",
      ["阳台上的云朵修理站", "晴天画了一座小屋", "铅笔追上白色天气", "屋顶收留了半朵云"], 0, 3]),
    card(["sunday-2-a", "sunday-screening", "sunday-2", "A", 1, "动物",
      ["dog", "book", "lamp", "gift"],
      "小狗守着一本会唱歌的礼物书，等主人开灯。",
      ["灯下有一本秘密书", "小狗守着会唱歌的礼物", "礼物盒里住着小读者", "守夜犬等来一首歌"], 1, 2]),
    card(["sunday-2-b", "sunday-screening", "sunday-2", "B", 1, "动物",
      ["whale", "umbrella", "cup", "sun"],
      "小鲸在晴天租下一把伞，把海水盛进杯子。",
      ["海面撑起一把蓝伞", "鲸鱼借走晴天茶杯", "小鲸租下一把午后伞", "阳光落进深海杯沿"], 2, 0]),
    card(["sunday-3-a", "sunday-screening", "sunday-3", "A", 2, "奇幻",
      ["balloon", "star", "house", "alarm-clock"],
      "旋转游乐屋的气球升空时，掉下一颗报时星。",
      ["三点钟飘来一颗星", "旋转屋顶掉下星星", "气球把时间带上天空", "游乐场忘记关闹钟"], 1, 3]),
    card(["sunday-3-b", "sunday-screening", "sunday-3", "B", 2, "奇幻",
      ["pencil", "door", "dog", "sparkles"],
      "铅笔画出的门自己走开，小狗追着闪光寻找入口。",
      ["铅笔画出会走的门", "小狗找到发亮的纸页", "门把一条线带回家", "画里的入口没有墙"], 0, 2]),
    card(["sunday-4-a", "sunday-screening", "sunday-4", "A", 3, "太空",
      ["basket", "satellite", "star", "leaf"],
      "野餐篮沿着环星轨道漂流，叶片向卫星招手。",
      ["环星野餐篮漂流记", "卫星收到绿色午餐", "星轨边的空篮子", "叶子绕着夜空散步"], 0, 2]),
    card(["sunday-4-b", "sunday-screening", "sunday-4", "B", 3, "太空",
      ["rocket", "mailbox", "sun", "alarm-clock"],
      "红行星邮差关掉闹钟，让火箭邮箱过一个安静周日。",
      ["火箭邮局错过清晨", "红行星邮差休息日", "太阳没有寄出包裹", "太空闹钟暂停一天"], 1, 3])
  ];

  return {
    publicTitle: "四符片名擂台",
    publicInstructions: "轮流解开四枚符号组成的原创虚构片名；每人有两枚聚光灯。",
    genres: ["城市", "动物", "奇幻", "太空"],
    tokens: tokens,
    cards: cards,
    packs: packs
  };
});
