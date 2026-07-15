(function () {
  "use strict";

  const signal = document.querySelector("#signal");
  const label = document.querySelector("#signal-label");
  const detail = document.querySelector("#signal-detail");
  const startButton = document.querySelector("#start");
  const scores = { a: 0, b: 0 };
  let round = 0;
  let state = "idle";
  let goAt = 0;
  let waitTimer = null;
  let timeoutTimer = null;

  function setSignal(kind, title, copy) {
    signal.className = `signal signal--${kind}`;
    label.textContent = title;
    detail.textContent = copy;
  }

  function updateScore() {
    document.querySelector("#score-a").textContent = String(scores.a);
    document.querySelector("#score-b").textContent = String(scores.b);
    document.querySelector("#round").textContent = String(round);
  }

  function clearTimers() {
    window.clearTimeout(waitTimer);
    window.clearTimeout(timeoutTimer);
  }

  function resetMatch() {
    clearTimers();
    scores.a = 0;
    scores.b = 0;
    round = 0;
    state = "idle";
    updateScore();
    setSignal("idle", "准备好了吗？", "开始后不要抢跑");
    startButton.textContent = "开始第一回合";
    startButton.disabled = false;
  }

  function startRound() {
    if (!['idle', 'round-end'].includes(state)) return;
    clearTimers();
    round += 1;
    updateScore();
    state = "waiting";
    startButton.disabled = true;
    setSignal("waiting", "等一下…", "看到绿色再按");
    waitTimer = window.setTimeout(() => {
      state = "go";
      goAt = performance.now();
      setSignal("go", "现在！", "快按你的按钮");
      timeoutTimer = window.setTimeout(() => {
        state = "round-end";
        setSignal("result", "没人按下", "这一回合不计分，再来一次");
        round -= 1;
        updateScore();
        startButton.disabled = false;
        startButton.textContent = "重新开始这一回合";
      }, 5000);
    }, 1400 + Math.random() * 2800);
  }

  function finishRound(winner, message, fault) {
    clearTimers();
    scores[winner] += 1;
    updateScore();
    const winnerName = winner.toUpperCase();
    setSignal(fault ? "fault" : "result", `${winnerName} 玩家得分`, message);
    if (scores[winner] >= 2) {
      state = "match-end";
      startButton.disabled = false;
      startButton.textContent = "重新比赛";
      detail.textContent += " · 三局两胜完成";
    } else {
      state = "round-end";
      startButton.disabled = false;
      startButton.textContent = "开始下一回合";
    }
  }

  function press(player) {
    if (state === "waiting") {
      const winner = player === "a" ? "b" : "a";
      finishRound(winner, `${player.toUpperCase()} 玩家抢跑，分数归对方`, true);
      return;
    }
    if (state === "go") {
      const reaction = Math.round(performance.now() - goAt);
      finishRound(player, `反应时间 ${reaction} ms`, false);
    }
  }

  startButton.addEventListener("click", () => {
    if (state === "match-end") resetMatch();
    else startRound();
  });
  document.querySelector("#player-a").addEventListener("pointerdown", () => press("a"));
  document.querySelector("#player-b").addEventListener("pointerdown", () => press("b"));
  window.addEventListener("keydown", (event) => {
    if (event.repeat) return;
    if (event.key.toLowerCase() === "a") press("a");
    if (event.key.toLowerCase() === "l") press("b");
  });
})();
