(function () {
  "use strict";

  const config = window.PICTIONARY_CONFIG;
  if (!config || !Array.isArray(config.words) || config.words.length < config.rounds) {
    document.body.textContent = "配置错误：题库数量必须不少于回合数。";
    return;
  }

  const screens = ["welcome", "handoff", "game", "result"].map((id) => document.querySelector(`#${id}`));
  const canvas = document.querySelector("#canvas");
  const context = canvas.getContext("2d");
  const guessInput = document.querySelector("#guess-input");
  let round = 0;
  let score = 0;
  let answer = "";
  let words = [];
  let timerId = null;
  let secondsLeft = config.secondsPerRound;
  let drawing = false;
  let lastPoint = null;

  function show(id) {
    screens.forEach((screen) => screen.classList.toggle("hidden", screen.id !== id));
  }

  function shuffle(items) {
    const result = [...items];
    for (let index = result.length - 1; index > 0; index -= 1) {
      const swap = Math.floor(Math.random() * (index + 1));
      [result[index], result[swap]] = [result[swap], result[index]];
    }
    return result;
  }

  function drawerName() {
    return round % 2 === 0 ? "A" : "B";
  }

  function startGame() {
    round = 0;
    score = 0;
    words = shuffle(config.words).slice(0, config.rounds);
    document.querySelector("#score").textContent = "0";
    prepareRound();
  }

  function prepareRound() {
    window.clearInterval(timerId);
    answer = words[round];
    document.querySelector("#round-label").textContent = `第 ${round + 1} / ${config.rounds} 轮`;
    document.querySelector("#drawer-label").textContent = `这一轮由 ${drawerName()} 画`;
    document.querySelector("#handoff-copy").classList.remove("hidden");
    document.querySelector("#reveal-word").classList.remove("hidden");
    document.querySelector("#secret").classList.add("hidden");
    document.querySelector("#secret-word").textContent = "";
    show("handoff");
  }

  function revealWord() {
    document.querySelector("#secret-word").textContent = answer;
    document.querySelector("#secret").classList.remove("hidden");
    document.querySelector("#reveal-word").classList.add("hidden");
    document.querySelector("#handoff-copy").classList.add("hidden");
  }

  function resizeCanvas() {
    const ratio = Math.max(1, window.devicePixelRatio || 1);
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.round(rect.width * ratio);
    canvas.height = Math.round(rect.height * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.lineCap = "round";
    context.lineJoin = "round";
    context.lineWidth = 5;
    context.strokeStyle = "#1f2a2b";
  }

  function beginDrawing() {
    document.querySelector("#secret-word").textContent = "";
    document.querySelector("#active-drawer").textContent = `${drawerName()} 在画`;
    document.querySelector("#guess-feedback").textContent = "";
    guessInput.value = "";
    show("game");
    resizeCanvas();
    context.clearRect(0, 0, canvas.width, canvas.height);
    secondsLeft = config.secondsPerRound;
    document.querySelector("#timer").textContent = String(secondsLeft);
    timerId = window.setInterval(() => {
      secondsLeft -= 1;
      document.querySelector("#timer").textContent = String(secondsLeft);
      if (secondsLeft <= 0) finishRound(false, `时间到，这一题是“${answer}”。`);
    }, 1000);
    guessInput.focus();
  }

  function normalize(value) {
    return value.trim().toLocaleLowerCase().replace(/[\s·,，。.!！?？_-]/g, "");
  }

  function submitGuess(event) {
    event.preventDefault();
    const guess = normalize(guessInput.value);
    if (!guess) return;
    if (guess === normalize(answer)) {
      finishRound(true, `答对了！“${answer}”让共同得分 +1。`);
    } else {
      document.querySelector("#guess-feedback").textContent = "还不对，再看看画面。";
      guessInput.select();
    }
  }

  function finishRound(correct, message) {
    window.clearInterval(timerId);
    if (correct) score += 1;
    document.querySelector("#score").textContent = String(score);
    document.querySelector("#guess-feedback").textContent = message;
    guessInput.disabled = true;
    window.setTimeout(() => {
      guessInput.disabled = false;
      round += 1;
      if (round >= config.rounds) finishGame();
      else prepareRound();
    }, 1500);
  }

  function finishGame() {
    document.querySelector("#result-title").textContent = `你们共同猜对了 ${score} / ${config.rounds} 题`;
    document.querySelector("#result-copy").textContent = score === config.rounds ? "满分默契！下一轮可以换一套属于你们的私人题库。" : score >= Math.ceil(config.rounds / 2) ? "配合越来越顺了，再来一次也许就能满分。" : "画得抽象也没关系，笑出来就已经合作成功了。";
    show("result");
  }

  function pointerPosition(event) {
    const rect = canvas.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  canvas.addEventListener("pointerdown", (event) => {
    drawing = true;
    lastPoint = pointerPosition(event);
    canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener("pointermove", (event) => {
    if (!drawing) return;
    const point = pointerPosition(event);
    context.beginPath();
    context.moveTo(lastPoint.x, lastPoint.y);
    context.lineTo(point.x, point.y);
    context.stroke();
    lastPoint = point;
  });
  canvas.addEventListener("pointerup", () => { drawing = false; lastPoint = null; });
  canvas.addEventListener("pointercancel", () => { drawing = false; lastPoint = null; });

  document.querySelector("#start-game").addEventListener("click", startGame);
  document.querySelector("#reveal-word").addEventListener("click", revealWord);
  document.querySelector("#hide-word").addEventListener("click", beginDrawing);
  document.querySelector("#guess-form").addEventListener("submit", submitGuess);
  document.querySelector("#clear-canvas").addEventListener("click", () => context.clearRect(0, 0, canvas.width, canvas.height));
  document.querySelector("#skip-round").addEventListener("click", () => finishRound(false, `跳过了，这一题是“${answer}”。`));
  document.querySelector("#restart").addEventListener("click", startGame);
})();
