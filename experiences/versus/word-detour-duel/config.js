"use strict";

(function exposeConfig(root, factory) {
  var config = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = config;
  }
  if (root) {
    root.WORD_DETOUR_CONFIG = config;
  }
})(typeof window === "object" ? window : null, function createConfig() {
  var cards = [
    { id: "daily-01", theme: "daily", difficulty: 1, target: "雨伞", forbidden: ["下雨", "撑开", "遮挡", "伞柄"] },
    { id: "daily-02", theme: "daily", difficulty: 1, target: "牙刷", forbidden: ["刷牙", "牙膏", "早晚", "清洁"] },
    { id: "daily-03", theme: "daily", difficulty: 1, target: "水杯", forbidden: ["喝水", "杯子", "装水", "杯盖"] },
    { id: "daily-04", theme: "daily", difficulty: 1, target: "钥匙", forbidden: ["开门", "锁孔", "金属", "随身"] },
    { id: "daily-05", theme: "daily", difficulty: 2, target: "充电线", forbidden: ["手机", "电源", "插头", "数据线"] },
    { id: "daily-06", theme: "daily", difficulty: 2, target: "衣架", forbidden: ["挂衣", "衣柜", "晾晒", "肩膀"] },
    { id: "daily-07", theme: "daily", difficulty: 2, target: "胶带", forbidden: ["粘住", "透明", "剪刀", "卷筒"] },
    { id: "daily-08", theme: "daily", difficulty: 2, target: "遥控器", forbidden: ["电视", "按钮", "频道", "电池"] },
    { id: "daily-09", theme: "daily", difficulty: 3, target: "订书机", forbidden: ["纸张", "钉子", "办公", "按压"] },
    { id: "daily-10", theme: "daily", difficulty: 3, target: "削皮器", forbidden: ["水果", "蔬菜", "外皮", "刀片"] },
    { id: "daily-11", theme: "daily", difficulty: 3, target: "密封夹", forbidden: ["袋口", "零食", "夹紧", "防潮"] },
    { id: "daily-12", theme: "daily", difficulty: 3, target: "鞋拔", forbidden: ["穿鞋", "脚后跟", "弯腰", "长柄"] },

    { id: "food-01", theme: "food", difficulty: 1, target: "苹果", forbidden: ["红色", "水果", "果核", "脆甜"] },
    { id: "food-02", theme: "food", difficulty: 1, target: "面条", forbidden: ["长条", "筷子", "煮熟", "汤汁"] },
    { id: "food-03", theme: "food", difficulty: 1, target: "牛奶", forbidden: ["白色", "奶牛", "早餐", "乳制品"] },
    { id: "food-04", theme: "food", difficulty: 1, target: "饼干", forbidden: ["烘烤", "酥脆", "零食", "甜味"] },
    { id: "food-05", theme: "food", difficulty: 2, target: "豆腐", forbidden: ["大豆", "白嫩", "方块", "炖煮"] },
    { id: "food-06", theme: "food", difficulty: 2, target: "柠檬", forbidden: ["酸味", "黄色", "果汁", "切片"] },
    { id: "food-07", theme: "food", difficulty: 2, target: "爆米花", forbidden: ["玉米", "电影院", "膨胀", "香脆"] },
    { id: "food-08", theme: "food", difficulty: 2, target: "酸奶", forbidden: ["发酵", "杯装", "乳酸", "勺子"] },
    { id: "food-09", theme: "food", difficulty: 3, target: "八角", forbidden: ["香料", "星形", "卤味", "棕色"] },
    { id: "food-10", theme: "food", difficulty: 3, target: "薄荷", forbidden: ["清凉", "叶子", "香气", "绿色"] },
    { id: "food-11", theme: "food", difficulty: 3, target: "海苔", forbidden: ["紫菜", "薄片", "咸味", "卷饭"] },
    { id: "food-12", theme: "food", difficulty: 3, target: "桂花", forbidden: ["秋天", "小花", "香甜", "金黄"] },

    { id: "nature-01", theme: "nature", difficulty: 1, target: "彩虹", forbidden: ["雨后", "七色", "天空", "弧线"] },
    { id: "nature-02", theme: "nature", difficulty: 1, target: "雪花", forbidden: ["冬天", "白色", "结晶", "飘落"] },
    { id: "nature-03", theme: "nature", difficulty: 1, target: "月亮", forbidden: ["夜晚", "天空", "圆缺", "卫星"] },
    { id: "nature-04", theme: "nature", difficulty: 1, target: "海浪", forbidden: ["海边", "起伏", "浪花", "潮汐声"] },
    { id: "nature-05", theme: "nature", difficulty: 2, target: "露珠", forbidden: ["清晨", "叶尖", "水滴", "晶莹"] },
    { id: "nature-06", theme: "nature", difficulty: 2, target: "松果", forbidden: ["松树", "鳞片", "种子", "棕色"] },
    { id: "nature-07", theme: "nature", difficulty: 2, target: "漩涡", forbidden: ["旋转", "水流", "中心", "卷入"] },
    { id: "nature-08", theme: "nature", difficulty: 2, target: "晚霞", forbidden: ["傍晚", "云层", "橙红", "天边"] },
    { id: "nature-09", theme: "nature", difficulty: 3, target: "潮汐", forbidden: ["海水", "涨落", "月球", "岸边"] },
    { id: "nature-10", theme: "nature", difficulty: 3, target: "年轮", forbidden: ["树干", "圆圈", "年龄", "木纹"] },
    { id: "nature-11", theme: "nature", difficulty: 3, target: "极光", forbidden: ["高纬", "夜空", "彩色", "光带"] },
    { id: "nature-12", theme: "nature", difficulty: 3, target: "季风", forbidden: ["季节", "风向", "雨季", "气流"] },

    { id: "action-01", theme: "action", difficulty: 1, target: "打哈欠", forbidden: ["困倦", "张嘴", "睡觉", "传染"] },
    { id: "action-02", theme: "action", difficulty: 1, target: "鼓掌", forbidden: ["双手", "拍击", "赞赏", "掌声"] },
    { id: "action-03", theme: "action", difficulty: 1, target: "跳绳", forbidden: ["绳子", "跳跃", "运动", "计数"] },
    { id: "action-04", theme: "action", difficulty: 1, target: "散步", forbidden: ["走路", "慢慢", "户外", "步伐"] },
    { id: "action-05", theme: "action", difficulty: 2, target: "伸懒腰", forbidden: ["起床", "手臂", "拉伸", "舒展"] },
    { id: "action-06", theme: "action", difficulty: 2, target: "系鞋带", forbidden: ["鞋子", "绳结", "脚下", "蝴蝶结"] },
    { id: "action-07", theme: "action", difficulty: 2, target: "打包", forbidden: ["行李", "箱子", "收拾", "封装"] },
    { id: "action-08", theme: "action", difficulty: 2, target: "晾衣服", forbidden: ["洗衣", "挂杆", "阳台", "晒干"] },
    { id: "action-09", theme: "action", difficulty: 3, target: "对折", forbidden: ["一半", "翻折", "折痕", "重合"] },
    { id: "action-10", theme: "action", difficulty: 3, target: "倒带", forbidden: ["录像", "回退", "磁带", "重新播放"] },
    { id: "action-11", theme: "action", difficulty: 3, target: "眨眼", forbidden: ["眼睛", "闭合", "瞬间", "睫毛"] },
    { id: "action-12", theme: "action", difficulty: 3, target: "踮脚", forbidden: ["脚尖", "变高", "轻轻", "够到"] },

    { id: "place-01", theme: "place", difficulty: 1, target: "图书馆", forbidden: ["书本", "借阅", "安静", "书架"] },
    { id: "place-02", theme: "place", difficulty: 1, target: "公园", forbidden: ["草地", "长椅", "休闲", "绿地"] },
    { id: "place-03", theme: "place", difficulty: 1, target: "车站", forbidden: ["公交", "等待", "站台", "到达"] },
    { id: "place-04", theme: "place", difficulty: 1, target: "厨房", forbidden: ["做饭", "锅具", "灶台", "冰箱"] },
    { id: "place-05", theme: "place", difficulty: 2, target: "天桥", forbidden: ["马路", "行人", "楼梯", "跨越"] },
    { id: "place-06", theme: "place", difficulty: 2, target: "码头", forbidden: ["船只", "岸边", "停靠", "水面"] },
    { id: "place-07", theme: "place", difficulty: 2, target: "菜市场", forbidden: ["蔬菜", "摊位", "叫卖", "采购"] },
    { id: "place-08", theme: "place", difficulty: 2, target: "露营地", forbidden: ["帐篷", "野外", "营火", "过夜"] },
    { id: "place-09", theme: "place", difficulty: 3, target: "中转站", forbidden: ["换乘", "路线", "停留", "枢纽"] },
    { id: "place-10", theme: "place", difficulty: 3, target: "观景台", forbidden: ["高处", "眺望", "栏杆", "风景"] },
    { id: "place-11", theme: "place", difficulty: 3, target: "防波堤", forbidden: ["海岸", "石墙", "挡浪", "港口"] },
    { id: "place-12", theme: "place", difficulty: 3, target: "候机厅", forbidden: ["飞机", "登机", "座位", "航班"] },

    { id: "feeling-01", theme: "feeling", difficulty: 1, target: "开心", forbidden: ["笑容", "快乐", "好心情", "高兴"] },
    { id: "feeling-02", theme: "feeling", difficulty: 1, target: "紧张", forbidden: ["心跳", "担心", "考试", "手心"] },
    { id: "feeling-03", theme: "feeling", difficulty: 1, target: "惊讶", forbidden: ["意外", "张嘴", "没想到", "突然"] },
    { id: "feeling-04", theme: "feeling", difficulty: 1, target: "放松", forbidden: ["休息", "轻松", "深呼吸", "舒缓"] },
    { id: "feeling-05", theme: "feeling", difficulty: 2, target: "安心", forbidden: ["放心", "安全", "踏实", "陪伴"] },
    { id: "feeling-06", theme: "feeling", difficulty: 2, target: "期待", forbidden: ["等待", "未来", "盼望", "礼物"] },
    { id: "feeling-07", theme: "feeling", difficulty: 2, target: "犹豫", forbidden: ["选择", "不确定", "来回", "迟疑"] },
    { id: "feeling-08", theme: "feeling", difficulty: 2, target: "默契", forbidden: ["配合", "理解", "同时", "不用说"] },
    { id: "feeling-09", theme: "feeling", difficulty: 3, target: "释然", forbidden: ["放下", "接受", "轻松", "过去"] },
    { id: "feeling-10", theme: "feeling", difficulty: 3, target: "惦记", forbidden: ["想念", "挂念", "远方", "牵挂"] },
    { id: "feeling-11", theme: "feeling", difficulty: 3, target: "共鸣", forbidden: ["感受", "相似", "认同", "心声"] },
    { id: "feeling-12", theme: "feeling", difficulty: 3, target: "体谅", forbidden: ["理解", "换位", "包容", "难处"] }
  ];

  var themes = ["daily", "food", "nature", "action", "place", "feeling"];
  var buckets = {};
  var used = {};
  cards.forEach(function indexCard(card) {
    var key = card.theme + ":" + card.difficulty;
    if (!buckets[key]) {
      buckets[key] = [];
      used[key] = 0;
    }
    buckets[key].push(card.id);
  });

  var schedules = [];
  for (var variant = 0; variant < 3; variant += 1) {
    var hands = [];
    for (var turn = 0; turn < 4; turn += 1) {
      var hand = themes.map(function pickCard(theme, themeIndex) {
        var difficulty = ((themeIndex + turn + variant) % 3) + 1;
        var key = theme + ":" + difficulty;
        var cardId = buckets[key][used[key]];
        used[key] += 1;
        return cardId;
      });
      hands.push(hand);
    }
    schedules.push(hands);
  }

  return {
    publicTitle: "绕词对决",
    publicInstructions: "绕开四个禁用提示，让对方猜到目标词。每人描述两回合。",
    trustNotice: "这是信任型友谊赛：页面不会录音或自动判罚，请主动记录踩词并在回合后一起复核。",
    playerLabels: ["玩家 1", "玩家 2"],
    deckLabels: ["纸飞机", "晚风", "星灯"],
    cards: cards,
    schedules: schedules
  };
});
