(function (root, factory) {
  "use strict";

  const config = factory();
  if (typeof module === "object" && module && module.exports) module.exports = config;
  if (root && typeof root === "object") root.COMPLIMENT_REELS_CONFIG = config;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  return {
    recipient: "你",
    sender: "我",
    columns: {
      moment: [
        { id: "m_listen", text: "你认真听我说话的时候" },
        { id: "m_remember", text: "你把小事放在心上的时候" },
        { id: "m_finish", text: "你耐心把事情做完的时候" },
        { id: "m_slow", text: "你愿意慢下来陪我的时候" },
        { id: "m_notice", text: "你发现我情绪变化的时候" },
        { id: "m_care", text: "你照顾身边人的时候" },
      ],
      shine: [
        { id: "s_gentle", text: "总有一种很温柔的认真" },
        { id: "s_light", text: "总能把普通一天慢慢照亮" },
        { id: "s_safe", text: "会让安心变成很具体的事" },
        { id: "s_steady", text: "总带着安静又可靠的力量" },
        { id: "s_lovely", text: "总能显出你细腻的用心" },
        { id: "s_true", text: "会把真诚留在每一个细节里" },
      ],
      echo: [
        { id: "e_beside", text: "让我更喜欢和你并肩的日子" },
        { id: "e_here", text: "让我觉得身边有你真好" },
        { id: "e_closer", text: "让我总想再靠近你一点点" },
        { id: "e_strength", text: "让我知道温柔也可以很有力量" },
        { id: "e_future", text: "让我对我们的以后多一点期待" },
        { id: "e_smile", text: "让我每次想起都会悄悄开心" },
      ],
    },
    composeJackpotNote(summary) {
      // 这是准备者可调整的 5–10 行学习入口。
      // summary 只含本轮已经封好的称呼、句子和拉动次数。
      // 请只返回 1–120 字素纯文本，不要返回 HTML 或 Promise。
      const opening = summary.pullCount <= 4 ? "这么快就遇见同频" : "慢慢拉到同频";
      const ending = "这些不是碰巧，是我真的一直这样看见你";
      return `${summary.recipient}，${opening}。${ending}。——${summary.sender}`;
    },
  };
});
