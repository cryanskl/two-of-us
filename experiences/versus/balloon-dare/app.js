(function () {
  "use strict";

  const logic = globalThis.BALLOON_DARE_LOGIC;
  if (!logic) {
    document.body.textContent = "气球胆量局加载失败，请确认 logic.js 与页面放在同一目录。";
    return;
  }

  const arena = document.querySelector("#arena");
  const stage = document.querySelector("#stage");
  const roundStatus = document.querySelector("#round-status");
  const currentPlayer = document.querySelector("#current-player");
  const coralScore = document.querySelector("#coral-score");
  const tealScore = document.querySelector("#teal-score");
  const coralPanel = document.querySelector("#score-coral");
  const tealPanel = document.querySelector("#score-teal");
  const pumpCount = document.querySelector("#pump-count");
  const pendingScore = document.querySelector("#pending-score");
  const balloon = document.querySelector("#balloon");
  const burst = document.querySelector("#burst");
  const pumpButton = document.querySelector("#pump-button");
  const bankButton = document.querySelector("#bank-button");

  let state = logic.createDareState();
  let startError = "";

  render();

  stage.addEventListener("click", (event) => {
    const button = event.target.closest("[data-action]");
    if (!button) return;
    const action = button.dataset.action;
    if (action === "start") {
      startError = "";
      state = logic.startMatch(state);
    } else if (action === "begin") {
      startError = "";
      try {
        state = logic.beginTurn(state, drawBurstPoint());
      } catch (error) {
        startError = error instanceof Error ? error.message : "无法生成本回合爆点。";
      }
    } else if (action === "advance") {
      state = logic.advanceTurn(state);
    } else if (action === "restart") {
      state = logic.restartMatch();
      startError = "";
    }
    render();
  });

  pumpButton.addEventListener("click", pump);
  bankButton.addEventListener("click", bank);

  document.addEventListener("keydown", (event) => {
    if (event.repeat || event.altKey || event.ctrlKey || event.metaKey || state.phase !== "pumping") return;
    if (event.key === "ArrowUp") {
      event.preventDefault();
      pump();
    } else if (event.key === "ArrowDown" && state.pumps > 0) {
      event.preventDefault();
      bank();
    }
  });

  function pump() {
    if (state.phase !== "pumping") return;
    state = logic.pumpBalloon(state);
    render();
  }

  function bank() {
    if (state.phase !== "pumping" || state.pumps < 1) return;
    state = logic.bankTurn(state);
    render();
  }

  function render() {
    const playerIndex = logic.playerForTurn(state.turnIndex) ?? 0;
    const playerName = playerIndex === 0 ? "珊瑚方" : "青绿方";
    const round = logic.roundForTurn(state.turnIndex) ?? 1;

    roundStatus.textContent = state.phase === "intro" ? "双人胆量 · 4 轮" : `第 ${round} / ${logic.TOTAL_ROUNDS} 轮`;
    coralScore.textContent = String(state.scores[0]).padStart(2, "0");
    tealScore.textContent = String(state.scores[1]).padStart(2, "0");
    currentPlayer.textContent = state.phase === "intro" ? "等待开局" : state.phase === "complete" ? "最终结果" : playerName;
    coralPanel.classList.toggle("is-current", state.phase !== "intro" && state.phase !== "complete" && playerIndex === 0);
    tealPanel.classList.toggle("is-current", state.phase !== "intro" && state.phase !== "complete" && playerIndex === 1);

    pumpCount.textContent = String(state.pumps);
    pendingScore.textContent = String(state.pending);
    arena.style.setProperty("--pumps", String(state.pumps));
    arena.style.setProperty("--pressure", String(Math.min(1, state.pumps / logic.MAX_BURST_POINT)));
    arena.classList.toggle("is-burst", state.phase === "burst");
    arena.classList.toggle("is-banked", state.phase === "banked");
    balloon.classList.toggle("is-teal", playerIndex === 1);
    burst.classList.toggle("is-teal", playerIndex === 1);

    const canPump = state.phase === "pumping";
    pumpButton.disabled = !canPump;
    bankButton.disabled = !canPump || state.pumps < 1;
    renderStage(playerName, playerIndex);

    const focusTarget = stage.querySelector("[data-focus]");
    if (focusTarget) window.requestAnimationFrame(() => focusTarget.focus({ preventScroll: true }));
  }

  function renderStage(playerName, playerIndex) {
    if (state.phase === "intro") {
      stage.innerHTML = `<h2>四轮，谁更懂得见好就收？</h2><p>每次安全打气，待收分都会增加；气球爆掉只清空本轮。</p>${startError ? `<p class="error">${startError}</p>` : ""}<button class="stage-action" data-action="start" data-focus type="button">开始胆量局</button>`;
      return;
    }
    if (state.phase === "handoff") {
      stage.innerHTML = `<h2>轮到${playerName}</h2><p>接过设备再开始；前三泵绝对安全，爆点不会显示。</p>${startError ? `<p class="error">${startError}</p>` : ""}<button class="stage-action" data-action="begin" data-focus type="button">${playerName}接好了</button>`;
      return;
    }
    if (state.phase === "pumping") {
      stage.innerHTML = state.pumps === 0
        ? `<h2>${playerName}，第一泵很安全</h2><p>按 ↑ 或点击“再打一泵”开始。</p>`
        : `<h2>现在可以收下 ${state.pending} 分</h2><p>继续打气，下一次安全收益会更高。</p>`;
      return;
    }
    if (state.phase === "banked") {
      const nextCopy = state.turnIndex === logic.TOTAL_TURNS - 1 ? "查看最终结果" : `交给${nextPlayerName()}`;
      stage.innerHTML = `<h2>${playerName}收下 ${state.outcome.points} 分</h2><p>这只气球稳稳落袋，总分已经记下。</p><button class="stage-action" data-action="advance" data-focus type="button">${nextCopy}</button>`;
      return;
    }
    if (state.phase === "burst") {
      const nextCopy = state.turnIndex === logic.TOTAL_TURNS - 1 ? "查看最终结果" : `交给${nextPlayerName()}`;
      stage.innerHTML = `<h2>这一轮飞走了</h2><p>${playerName}在第 ${state.outcome.pumps} 泵遇到爆点，待收 ${state.outcome.lost} 分清零；总分不倒扣。</p><button class="stage-action" data-action="advance" data-focus type="button">${nextCopy}</button>`;
      return;
    }
    const winner = logic.winnerForScores(state.scores);
    const heading = winner === "tie" ? "今晚胆量刚好一样" : `${winner === 0 ? "珊瑚方" : "青绿方"}拿下这一局`;
    const copy = winner === "tie"
      ? `双方都是 ${state.scores[0]} 分，平局也是正式结果。`
      : `最终比分 ${state.scores[0]} : ${state.scores[1]}，四轮机会全部完成。`;
    stage.innerHTML = `<h2>${heading}</h2><p>${copy}</p><button class="stage-action" data-action="restart" data-focus type="button">再来四轮</button>`;

    function nextPlayerName() {
      const nextIndex = logic.playerForTurn(state.turnIndex + 1);
      return nextIndex === 0 ? "珊瑚方" : "青绿方";
    }
  }

  function drawBurstPoint() {
    if (!globalThis.crypto || typeof globalThis.crypto.getRandomValues !== "function") {
      throw new Error("当前浏览器没有安全随机源，无法开始本回合。");
    }
    const value = new Uint32Array(1);
    for (let attempt = 0; attempt < 8; attempt += 1) {
      globalThis.crypto.getRandomValues(value);
      const burstPoint = logic.mapRandomToBurstPoint(value[0]);
      if (burstPoint !== null) return burstPoint;
    }
    throw new Error("安全随机源连续返回了不可用值，请重新接过设备。");
  }
})();
