(function () {
  "use strict";

  const logic = globalThis.NUMBER_TARGET_LOGIC;
  const copy = globalThis.NUMBER_TARGET_COPY;
  if (!logic || !copy) {
    document.body.textContent = "数字凑靶加载失败，请确认 logic.js、copy.js 与页面放在同一目录。";
    return;
  }

  const app = document.querySelector(".app");
  const roundStatus = document.querySelector("#round-status");
  const targetNumber = document.querySelector("#target-number");
  const turnCard = document.querySelector("#turn-card");
  const markets = document.querySelector("#markets");
  const numberButtons = document.querySelector("#number-buttons");
  const operatorButtons = document.querySelector("#operator-buttons");
  const playerCards = [document.querySelector("#player-coral"), document.querySelector("#player-blue")];
  const scoreNodes = [document.querySelector("#score-coral"), document.querySelector("#score-blue")];
  const resultNodes = [document.querySelector("#result-coral"), document.querySelector("#result-blue")];
  const operatorSymbols = new Map(logic.OPERATORS.map((operator) => [operator.id, operator.symbol]));

  let state = logic.createInitialState();
  let randomError = false;
  let focusRevision = 0;

  turnCard.addEventListener("click", (event) => {
    const button = event.target.closest("[data-action]");
    if (!button) return;
    if (button.dataset.action === "start") startMatch();
    if (button.dataset.action === "retry") {
      if (state.phase === "round-result" && state.roundIndex < logic.TOTAL_ROUNDS - 1) startNextRound();
      else startMatch();
    }
    if (button.dataset.action === "next") startNextRound();
    if (button.dataset.action === "show-result") {
      state = logic.showMatchResult(state);
      render(true);
    }
    if (button.dataset.action === "restart") {
      state = logic.restartMatch(state);
      randomError = false;
      render(true);
    }
  });

  markets.addEventListener("click", (event) => {
    const button = event.target.closest(".token-button");
    if (!button || button.disabled) return;
    if (button.dataset.number) chooseNumber(Number(button.dataset.number));
    if (button.dataset.operator) chooseOperator(button.dataset.operator);
  });

  document.addEventListener("keydown", (event) => {
    if (event.repeat || state.phase !== "drafting") return;
    const kind = logic.kindForStep(state.stepIndex);
    if (kind === "operator" && ["+", "-", "*"].includes(event.key)) {
      event.preventDefault();
      chooseOperator(event.key);
      return;
    }
    if (kind !== "operator" && /^[1-9]$/.test(event.key)) {
      event.preventDefault();
      chooseNumber(Number(event.key));
    }
  });

  render(true);

  function startMatch() {
    randomError = false;
    try {
      const plan = logic.createRoundPlan(secureRandomIndex);
      const starter = secureRandomIndex(2);
      if (!plan) throw new Error("ROUND_PLAN_FAILED");
      state = logic.startMatch(state, plan, starter);
    } catch {
      randomError = true;
    }
    render(randomError);
  }

  function startNextRound() {
    try {
      const plan = logic.createRoundPlan(secureRandomIndex);
      if (!plan) throw new Error("ROUND_PLAN_FAILED");
      state = logic.nextRound(state, plan);
      randomError = false;
    } catch {
      randomError = true;
    }
    render(randomError);
  }

  function secureRandomIndex(maxExclusive) {
    if (!globalThis.crypto?.getRandomValues) throw new Error("SECURE_RANDOM_UNAVAILABLE");
    const values = new Uint32Array(1);
    for (let attempt = 0; attempt < 1024; attempt += 1) {
      globalThis.crypto.getRandomValues(values);
      const mapped = logic.mapUint32ToIndex(values[0], maxExclusive);
      if (mapped !== null) return mapped;
    }
    throw new Error("SECURE_RANDOM_RETRY_LIMIT");
  }

  function chooseNumber(value) {
    const previous = state;
    const player = logic.turnForStep(state.starter, state.stepIndex);
    const kind = logic.kindForStep(state.stepIndex);
    state = logic.pickNumber(state, value);
    if (state === previous) return;
    render(false, { player, slot: kind === "first-number" ? "left" : "right" });
  }

  function chooseOperator(operatorId) {
    const previous = state;
    const player = logic.turnForStep(state.starter, state.stepIndex);
    state = logic.pickOperator(state, operatorId);
    if (state === previous) return;
    render(false, { player, slot: "operator" });
  }

  function render(focusPrimary = false, stamped = null) {
    app.dataset.phase = randomError ? "error" : state.phase;
    roundStatus.textContent = state.phase === "intro" ? "准备开局" : `第 ${state.roundIndex + 1} / ${logic.TOTAL_ROUNDS} 局`;
    targetNumber.textContent = state.target ?? "?";
    renderPlayers(stamped);
    renderTurnCard();
    renderMarkets();
    scheduleFocus(focusPrimary);
  }

  function renderPlayers(stamped) {
    for (let player = 0; player < 2; player += 1) {
      const hand = state.hands[player];
      scoreNodes[player].textContent = String(state.scores[player]);
      setSlot(player, "left", hand.left ?? "?", stamped);
      setSlot(player, "operator", hand.operator ? operatorSymbols.get(hand.operator) : "?", stamped);
      setSlot(player, "right", hand.right ?? "?", stamped);
      playerCards[player].classList.toggle("is-current", state.phase === "drafting"
        && logic.turnForStep(state.starter, state.stepIndex) === player);
      if (state.roundResult) {
        const distance = state.roundResult.distances[player];
        resultNodes[player].textContent = `${formatHand(hand)} = ${state.roundResult.values[player]} · 差 ${distance}`;
      } else {
        resultNodes[player].textContent = "等待完成";
      }
    }
  }

  function setSlot(player, slot, value, stamped) {
    const node = document.querySelector(`[data-player="${player}"][data-slot="${slot}"]`);
    node.textContent = String(value);
    node.classList.toggle("is-empty", value === "?");
    const shouldStamp = stamped && stamped.player === player && stamped.slot === slot;
    node.classList.toggle("is-stamped", Boolean(shouldStamp));
    if (shouldStamp) {
      globalThis.setTimeout(() => node.classList.remove("is-stamped"), 190);
    }
  }

  function renderTurnCard() {
    turnCard.replaceChildren();
    if (randomError) {
      turnCard.append(
        heading("本机随机数不可用"),
        paragraph("没有安全随机题面，比赛不会用可预测数字凑合开始。"),
        action("重新检查", "retry"),
      );
      return;
    }
    if (state.phase === "intro") {
      turnCard.append(
        heading("每人两张数字、一个运算符。"),
        paragraph("三局后，离靶心更近的人获胜。"),
        action("开始凑靶", "start"),
      );
      return;
    }
    if (state.phase === "drafting") {
      const player = logic.turnForStep(state.starter, state.stepIndex);
      turnCard.append(
        heading(`现在轮到 ${logic.PLAYERS[player].name}`),
        paragraph(instructionFor(logic.kindForStep(state.stepIndex))),
      );
      return;
    }
    if (state.phase === "round-result") {
      turnCard.append(
        heading("本局结果"),
        paragraph(copy.describeRound(state.roundResult)),
        state.roundIndex < logic.TOTAL_ROUNDS - 1
          ? action("下一局", "next")
          : action("看最终比分", "show-result"),
      );
      return;
    }
    const winner = state.scores[0] === state.scores[1] ? null : state.scores[0] > state.scores[1] ? 0 : 1;
    turnCard.append(
      heading(winner === null ? "三局打成平手" : `${logic.PLAYERS[winner].name} 拿下这场`),
      paragraph(`最终比分 ${state.scores[0]} : ${state.scores[1]}，只记录这三局，不评价谁更会算。`),
      action("再来三局", "restart"),
    );
  }

  function renderMarkets() {
    numberButtons.replaceChildren();
    operatorButtons.replaceChildren();
    const kind = state.phase === "drafting" ? logic.kindForStep(state.stepIndex) : null;
    for (const number of state.availableNumbers) {
      const button = tokenButton(String(number));
      button.dataset.number = String(number);
      button.disabled = kind !== "first-number" && kind !== "second-number";
      button.setAttribute("aria-label", `选择数字 ${number}`);
      numberButtons.append(button);
    }
    for (const operatorId of state.availableOperators) {
      const symbol = operatorSymbols.get(operatorId);
      const button = tokenButton(symbol);
      button.dataset.operator = operatorId;
      button.disabled = kind !== "operator";
      button.setAttribute("aria-label", `选择运算符 ${symbol}`);
      operatorButtons.append(button);
    }
    markets.hidden = state.phase === "intro" || randomError;
  }

  function scheduleFocus(primary) {
    const revision = ++focusRevision;
    globalThis.requestAnimationFrame(() => {
      if (revision !== focusRevision) return;
      if (primary) {
        turnCard.querySelector("button")?.focus({ preventScroll: true });
        return;
      }
      if (state.phase === "drafting") {
        const selector = logic.kindForStep(state.stepIndex) === "operator"
          ? "#operator-buttons button:not(:disabled)"
          : "#number-buttons button:not(:disabled)";
        document.querySelector(selector)?.focus({ preventScroll: true });
      } else {
        turnCard.querySelector("button")?.focus({ preventScroll: true });
      }
    });
  }

  function instructionFor(kind) {
    if (kind === "first-number") return "选择第一个数字";
    if (kind === "operator") return "选择运算符";
    return "选择第二个数字";
  }

  function formatHand(hand) {
    return `${hand.left} ${operatorSymbols.get(hand.operator)} ${hand.right}`;
  }

  function heading(value) {
    const element = document.createElement("h2");
    element.textContent = value;
    return element;
  }

  function paragraph(value) {
    const element = document.createElement("p");
    element.textContent = value;
    return element;
  }

  function action(label, name) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "primary-action";
    button.dataset.action = name;
    button.textContent = label;
    return button;
  }

  function tokenButton(label) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "token-button";
    button.textContent = label;
    return button;
  }
})();
