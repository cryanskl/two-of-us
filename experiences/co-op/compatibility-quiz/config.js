export const QUESTIONS = Object.freeze([
  question("quiet-evening", "周末突然空出一天，你更想？", "一起出门走走", "窝在家里慢慢过"),
  question("weekend-treat", "周末的小奖励，更期待哪一种？", "吃一顿好的", "去一个新地方"),
  question("travel-rhythm", "一起旅行时，更喜欢哪种节奏？", "慢慢闲逛", "排满体验"),
  question("rainy-day", "下雨天，更想做哪件事？", "窝在家里", "穿雨鞋出门"),
  question("shared-photo", "拍下共同回忆时，更偏爱哪一种？", "自然抓拍", "认真合照"),
  question("late-snack", "夜里忽然嘴馋，更想选什么？", "甜甜的", "咸香的"),
  question("little-surprise", "收到小惊喜时，更喜欢哪一种？", "一张手写纸条", "一件实用小物"),
  question("free-afternoon", "共同拥有一个空闲下午，更想去哪儿？", "熟悉的老地方", "没去过的新角落"),
]);

export const QUESTION_IDS = Object.freeze(QUESTIONS.map(({ id }) => id));

export function getQuestion(questionId) {
  return QUESTIONS.find(({ id }) => id === questionId) ?? null;
}

export function isAnswerId(questionId, answerId) {
  return Boolean(getQuestion(questionId)?.answers.some(({ id }) => id === answerId));
}

function question(id, prompt, firstLabel, secondLabel) {
  return Object.freeze({
    id,
    prompt,
    answers: Object.freeze([
      Object.freeze({ id: "a", label: firstLabel }),
      Object.freeze({ id: "b", label: secondLabel }),
    ]),
  });
}
