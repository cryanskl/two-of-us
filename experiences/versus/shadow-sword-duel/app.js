(function () {
  "use strict";

  const logic = globalThis.ShadowSwordLogic;
  const config = globalThis.SHADOW_SWORD_CONFIG;
  const stage = document.getElementById("stage");
  const roundMarker = document.getElementById("round-marker");
  const leftRail = document.getElementById("left-rail");
  const rightRail = document.getElementById("right-rail");
  const liveStatus = document.getElementById("live-status");

  if (!logic || !stage || !roundMarker || !leftRail || !rightRail || !liveStatus) return;

  const actionSummaries = Object.freeze({
    attack: "花 1 点气；普通攻会被防住，先机攻可以破防。",
    guard: "挡住普通攻并取得先机；空防没有收益。",
    dodge: "避开本回合任意攻击。",
    charge: "本回合没受伤就回复 1 点气，最多 2 点。",
  });

  let machine = logic.createInitialState(config);
  let publicView = logic.getScreenView(machine);

  function element(tagName, className, text) {
    const node = document.createElement(tagName);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function heading(text) {
    const node = element("h2", "stage-title", text);
    node.tabIndex = -1;
    return node;
  }

  function makeButton(label, actionFactory, options = {}) {
    const button = element("button", options.className || "button", label);
    button.type = "button";
    button.disabled = Boolean(options.disabled);
    if (options.controlId) button.dataset.control = options.controlId;
    let consumed = false;

    button.addEventListener("keydown", function (event) {
      if (event.repeat && (event.key === "Enter" || event.key === " ")) {
        event.preventDefault();
      }
    });

    button.addEventListener("click", function (event) {
      if (consumed || event.detail > 1) return;
      const changed = dispatch(actionFactory(), {
        focus: options.focus || "heading",
        selectedControl: options.selectedControl || null,
      });
      if (changed) consumed = true;
    });
    return button;
  }

  function dispatch(action, options = {}) {
    const next = logic.reduce(machine, action);
    if (next === machine) return false;
    machine = next;
    publicView = logic.getScreenView(machine);
    render(publicView, options);
    return true;
  }

  function render(view, options = {}) {
    document.body.className = `phase-${view.phase}`;
    roundMarker.textContent = `第 ${view.roundIndex} / ${view.maxRounds} 回合`;
    renderResourceRail(leftRail, view, 0);
    renderResourceRail(rightRail, view, 1);
    stage.replaceChildren();

    if (view.phase === "intro") renderIntro(view);
    if (view.phase === "choosing" && !view.covered) renderChoosing(view);
    if (view.phase === "choosing" && view.covered) renderCovered(view);
    if (view.phase === "handoff") renderHandoff(view);
    if (view.phase === "ready-to-reveal") renderReady(view);
    if (view.phase === "round-result" || view.phase === "match-result") renderResult(view);

    liveStatus.textContent = statusSummary(view);
    focusAfterRender(options);
  }

  function renderResourceRail(container, view, seat) {
    const player = view.players[seat];
    const sideClass = seat === 0 ? "left" : "right";
    const name = element("h2", `resource-name resource-name--${sideClass}`, view.playerNames[seat]);
    name.id = `${sideClass}-name`;

    const list = element("dl", "resource-list");
    appendResource(list, "体力", `${player.health} / 3`);
    appendResource(list, "气", `${player.energy} / 2`);
    appendResource(list, "先机", player.initiative ? "有" : "无");

    const order = element(
      "p",
      "seat-order",
      view.firstSeat === seat ? "本回合先选" : "本回合后选",
    );
    container.setAttribute("aria-labelledby", name.id);
    container.replaceChildren(name, list, order);
  }

  function appendResource(list, label, value) {
    const term = element("dt", null, label);
    const detail = element("dd", null, value);
    list.append(term, detail);
  }

  function renderIntro(view) {
    const title = heading("准备好读懂对方了吗？");
    const instructions = element("ul", "instructions");
    for (const instruction of view.instructions) {
      instructions.append(element("li", null, instruction));
    }
    const start = makeButton(
      "开始决斗",
      function () {
        return { type: "START" };
      },
      { className: "button button--primary", controlId: "start" },
    );
    stage.append(title, instructions, start);
  }

  function renderChoosing(view) {
    const title = heading(view.prompt);
    const guidance = element(
      "p",
      "stage-copy",
      "你可以改选；只有按下“封好这一招”才会交给下一位。",
    );
    const actionList = element("div", "action-list");

    for (const action of view.availableActions) {
      const selected = view.draftAction === action.move;
      const button = makeButton(
        action.label,
        function () {
          return { type: "CHOOSE", seat: view.activeSeat, move: action.move };
        },
        {
          className: `action-button${selected ? " is-selected" : ""}`,
          controlId: `choose-${action.move}`,
          disabled: !action.available,
          focus: "selected",
          selectedControl: `choose-${action.move}`,
        },
      );
      button.setAttribute("aria-pressed", selected ? "true" : "false");

      const label = element("span", "action-label", action.label);
      const summary = element("span", "action-summary", actionSummaries[action.move]);
      button.replaceChildren(label, summary);
      if (selected) {
        button.append(element("span", "selection-copy", "已选，尚未封招"));
      } else if (action.reason === "needs-energy") {
        button.append(element("span", "unavailable-copy", "需要 1 点气"));
      }
      actionList.append(button);
    }

    const controls = element("div", "stage-actions");
    const confirm = makeButton(
      "封好这一招",
      function () {
        return { type: "CONFIRM", seat: view.activeSeat };
      },
      {
        className: "button button--primary",
        controlId: "confirm",
        disabled: !view.controls.canConfirm,
      },
    );
    const cover = makeButton(
      "先遮住页面",
      function () {
        return { type: "COVER" };
      },
      { className: "button button--quiet", controlId: "cover" },
    );
    controls.append(confirm, cover);
    stage.append(title, guidance, actionList, controls);
  }

  function renderCovered(view) {
    const playerName = view.playerNames[view.resumeSeat];
    const title = heading("页面已遮住");
    const fold = createFold("fold-mark--quiet");
    const copy = element(
      "p",
      "stage-copy",
      `${playerName}，刚才未封好的选择已清空。确认四周没人偷看，再继续选招。`,
    );
    const resume = makeButton(
      "继续选招",
      function () {
        return { type: "RESUME", seat: view.resumeSeat };
      },
      { className: "button button--primary", controlId: "resume" },
    );
    stage.append(title, fold, copy, resume);
  }

  function renderHandoff(view) {
    const playerName = view.playerNames[view.handoffSeat];
    const isRoundStart = view.handoffKind === "round-start";
    const title = heading(
      isRoundStart
        ? `下一回合，请 ${playerName} 先选`
        : `请把设备交给 ${playerName}`,
    );
    const fold = createFold("fold-mark--quiet");
    const copy = element(
      "p",
      "stage-copy",
      isRoundStart
        ? "上一回合已经收好；新回合还没有任何人选招。"
        : "上一位的招式已经离开屏幕，请不要回看。",
    );
    const takeOver = makeButton(
      "我拿好了",
      function () {
        return { type: "TAKE_OVER", seat: view.handoffSeat };
      },
      { className: "button button--primary", controlId: "take-over" },
    );
    stage.append(title, fold, copy, takeOver);
  }

  function renderReady(view) {
    const title = heading(view.readyMessage);
    const fold = createFold("fold-mark--sealed");
    const copy = element(
      "p",
      "stage-copy",
      "两份招式都没有出现在屏幕上。准备好就一起揭晓。",
    );
    const reveal = makeButton(
      "一起揭晓",
      function () {
        return { type: "REVEAL" };
      },
      { className: "button button--primary", controlId: "reveal" },
    );
    stage.append(title, fold, copy, reveal);
  }

  function createFold(variant) {
    const fold = element("div", `fold-mark ${variant}`);
    fold.setAttribute("aria-hidden", "true");
    for (let index = 0; index < 4; index += 1) {
      fold.append(element("span", "fold-plane"));
    }
    return fold;
  }

  function renderResult(view) {
    const latestRound = view.latestRound;
    const effect = latestRound.effect;
    const isMatch = view.phase === "match-result";
    const title = heading(isMatch ? matchHeadline(view) : `第 ${latestRound.roundIndex} 回合结果`);
    const reveal = element("div", "reveal-pair");
    reveal.append(
      actionReveal(view.playerNames[0], effect.actions[0], "left"),
      actionReveal(view.playerNames[1], effect.actions[1], "right"),
    );

    const headline = element("p", "result-headline", roundHeadline(view));
    const ledgerTitle = element("h3", "ledger-title", "因果顺序");
    const ledger = element("ol", "effect-ledger");
    for (const line of effectLines(view)) ledger.append(element("li", null, line));

    const action = isMatch
      ? makeButton(
        "再来一场",
        function () {
          return { type: "RESTART" };
        },
        { className: "button button--primary", controlId: "restart" },
      )
      : makeButton(
        "下一回合",
        function () {
          return { type: "NEXT_ROUND" };
        },
        { className: "button button--primary", controlId: "next-round" },
      );

    stage.append(title, reveal, headline, ledgerTitle, ledger);
    if (isMatch) {
      stage.append(
        element("p", "match-reason", matchReason(view)),
        element("blockquote", "final-note", view.finalNote),
      );
    }
    stage.append(action);
    const history = renderHistory(view);
    if (history) stage.append(history);
  }

  function actionReveal(playerName, move, side) {
    const row = element("p", `action-reveal action-reveal--${side}`);
    row.append(
      element("span", "action-player", `${playerName}：`),
      element("strong", null, actionLabel(move)),
    );
    return row;
  }

  function actionLabel(move) {
    const labels = {
      attack: "攻",
      guard: "防",
      dodge: "闪",
      charge: "蓄",
    };
    return labels[move] || "未知";
  }

  function roundHeadline(view) {
    const hit = view.latestRound.effect.hit;
    const gained = view.latestRound.effect.gainedInitiative;
    if (hit[0] && hit[1]) return "双方交锋，各受 1 点伤害";
    if (hit[0]) return `${view.playerNames[0]} 被击中`;
    if (hit[1]) return `${view.playerNames[1]} 被击中`;
    if (gained[0] || gained[1]) return "普通攻被挡下";
    return "本回合无人受伤";
  }

  function effectLines(view) {
    const effect = view.latestRound.effect;
    const lines = [
      `${view.playerNames[0]}选择${actionLabel(effect.actions[0])}，`
        + `${view.playerNames[1]}选择${actionLabel(effect.actions[1])}。`,
    ];
    for (let seat = 0; seat < 2; seat += 1) {
      if (effect.spentEnergy[seat]) lines.push(`${view.playerNames[seat]}花费 1 点气。`);
    }
    for (let seat = 0; seat < 2; seat += 1) {
      if (effect.spentInitiative[seat]) lines.push(`${view.playerNames[seat]}消耗先机。`);
    }
    for (let seat = 0; seat < 2; seat += 1) {
      if (effect.hit[seat]) lines.push(`${view.playerNames[seat]}受到 1 点伤害。`);
    }
    if (!effect.hit[0] && !effect.hit[1]) lines.push("双方本回合都没有受伤。");
    for (let seat = 0; seat < 2; seat += 1) {
      if (effect.gainedEnergy[seat]) {
        lines.push(`${view.playerNames[seat]}没有受伤，回复 1 点气。`);
      }
    }
    for (let seat = 0; seat < 2; seat += 1) {
      if (effect.gainedInitiative[seat]) {
        lines.push(`${view.playerNames[seat]}挡住普通攻，取得先机。`);
      }
    }
    return lines;
  }

  function matchHeadline(view) {
    const result = view.matchResult;
    if (result.reason === "double-ko") return "双双倒下，平局";
    if (result.reason === "round-limit-draw") return "九回合结束，仍是平局";
    return `${view.playerNames[result.winnerSeat]} 获胜`;
  }

  function matchReason(view) {
    const result = view.matchResult;
    if (result.reason === "knockout") return "对方体力归零，决斗结束。";
    if (result.reason === "double-ko") return "双方在同一个回合体力归零。";
    if (result.reason === "health") return "九回合后，以剩余体力决出胜负。";
    if (result.reason === "energy") return "九回合后体力相同，以剩余气决出胜负。";
    return "九回合后体力与气仍然相同。";
  }

  function renderHistory(view) {
    const pastRounds = view.revealedHistory.slice(0, -1);
    if (pastRounds.length === 0) return null;
    const section = element("section", "history");
    const title = element("h3", "history-title", "此前已揭晓回合");
    const list = element("ol", "history-list");
    for (const round of pastRounds) {
      const hit = round.effect.hit;
      const outcome = hit[0] && hit[1]
        ? "双方受伤"
        : hit[0]
          ? `${view.playerNames[0]}受伤`
          : hit[1]
            ? `${view.playerNames[1]}受伤`
            : "无人受伤";
      list.append(element(
        "li",
        null,
        `第 ${round.roundIndex} 回合 · ${actionLabel(round.actions[0])} / `
          + `${actionLabel(round.actions[1])} · ${outcome}`,
      ));
    }
    section.append(title, list);
    return section;
  }

  function statusSummary(view) {
    if (view.phase === "intro") return "决斗尚未开始。";
    if (view.phase === "choosing" && view.covered) return "页面已遮住，未确认草稿已清空。";
    if (view.phase === "choosing") return `轮到 ${view.playerNames[view.activeSeat]} 选招。`;
    if (view.phase === "handoff") return `请把设备交给 ${view.playerNames[view.handoffSeat]}。`;
    if (view.phase === "ready-to-reveal") return "两位都已封招，可以一起揭晓。";
    if (view.phase === "match-result") return matchHeadline(view);
    return `第 ${view.latestRound.roundIndex} 回合已揭晓。`;
  }

  function focusAfterRender(options) {
    if (!options.focus || document.visibilityState === "hidden" || !document.hasFocus()) return;
    if (options.focus === "selected" && options.selectedControl) {
      const selected = stage.querySelector(`[data-control="${options.selectedControl}"]`);
      if (selected) {
        selected.focus();
        return;
      }
    }
    focusStageHeading();
  }

  function focusStageHeading() {
    if (document.visibilityState === "hidden" || !document.hasFocus()) return;
    const title = stage.querySelector(".stage-title");
    if (title) title.focus();
  }

  function coverForLifecycle() {
    const view = logic.getScreenView(machine);
    if (!view.controls.canCover) return;
    dispatch({ type: "COVER" }, { focus: null });
  }

  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "hidden") coverForLifecycle();
  });
  window.addEventListener("pagehide", coverForLifecycle);
  window.addEventListener("blur", coverForLifecycle);
  window.addEventListener("focus", function () {
    if (publicView.covered) focusStageHeading();
  });

  render(publicView, { focus: null });
})();
