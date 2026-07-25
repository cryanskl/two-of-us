"use strict";

(function startFourSymbolFilmDuel() {
  var logic = window.FourSymbolFilmLogic;
  var root = document.getElementById("app");

  if (!logic || !root) return;

  var state = logic.createInitialState();
  var textEquivalentVisible = false;
  var interactionEpoch = 0;

  function element(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function append(parent) {
    for (var index = 1; index < arguments.length; index += 1) {
      if (arguments[index]) parent.append(arguments[index]);
    }
    return parent;
  }

  function button(label, className, onClick) {
    var node = element("button", className, label);
    node.type = "button";
    node.addEventListener("click", onClick);
    return node;
  }

  function ruleLine() {
    var line = element("div", "rule-line");
    line.setAttribute("aria-hidden", "true");
    return line;
  }

  function createHeader(view) {
    var header = element("header", "ticket-header");
    var title = element("h1", "title", view.title);
    title.id = "screen-title";
    append(header, ruleLine(), title, ruleLine());
    if (view.phase !== "setup") {
      header.append(createScoreRail(view));
    }
    return header;
  }

  function createScoreRail(view) {
    var rail = element("section", "score-rail");
    rail.setAttribute("aria-label", "对局计分");

    view.players.forEach(function addPlayer(player) {
      var item = element("div", "score-player");
      if (
        view.currentPlayer &&
        view.currentPlayer.id === player.id &&
        view.phase !== "result"
      ) {
        item.classList.add("is-current");
        item.setAttribute("aria-current", "true");
      }
      var name = element("strong", "score-name", player.name);
      var score = element("span", "score-value", player.score + " 分");
      var spotlight = element(
        "span",
        "score-spotlight",
        "聚光灯 × " + player.spotlights
      );
      append(item, name, score, spotlight);
      rail.append(item);
    });

    var progress = element(
      "p",
      "progress",
      "第 " + view.roundNumber + " / " + view.totalRounds + " 题"
    );
    rail.insertBefore(progress, rail.children[1]);
    return rail;
  }

  function createSetup(view) {
    var section = element("section", "screen setup-screen");
    section.setAttribute("aria-labelledby", "setup-heading");
    var heading = element("h2", "screen-heading", "今晚放映哪一场？");
    heading.id = "setup-heading";
    var intro = element(
      "p",
      "lead",
      "两个人，一台设备，八张原创片名票。每题交接前都会先闭幕。"
    );
    var form = element("form", "setup-form");

    var names = element("fieldset", "field-group");
    var namesLegend = element("legend", "", "写下两位玩家的称呼");
    var nameGrid = element("div", "name-grid");
    [
      ["player-a", "玩家 A", "玩家 A"],
      ["player-b", "玩家 B", "玩家 B"]
    ].forEach(function addName(item) {
      var label = element("label", "input-label");
      label.htmlFor = item[0];
      label.textContent = item[1];
      var input = element("input", "text-input");
      input.id = item[0];
      input.name = item[0];
      input.type = "text";
      input.maxLength = 12;
      input.placeholder = item[2];
      input.autocomplete = "off";
      append(label, input);
      nameGrid.append(label);
    });
    append(names, namesLegend, nameGrid);

    var packs = element("fieldset", "field-group");
    var packsLegend = element("legend", "", "选择题包");
    var packGrid = element("div", "pack-grid");
    view.availablePacks.forEach(function addPack(pack, index) {
      var label = element("label", "pack-choice");
      var input = element("input");
      input.type = "radio";
      input.name = "pack";
      input.value = pack.id;
      input.checked = index === 0;
      var copy = element("span", "pack-copy");
      append(
        copy,
        element("strong", "", pack.title),
        element("small", "", pack.subtitle)
      );
      append(label, input, copy);
      packGrid.append(label);
    });
    append(packs, packsLegend, packGrid);

    var equivalentLabel = element("label", "equivalent-choice");
    var equivalentInput = element("input");
    equivalentInput.type = "checkbox";
    equivalentInput.name = "text-equivalent";
    append(
      equivalentLabel,
      equivalentInput,
      element("span", "", "在符号下始终显示中文等价文字")
    );

    var rules = element("div", "rules");
    append(
      rules,
      element("strong", "", "计分规则"),
      element("span", "", "直接答对 2 分"),
      element("span", "", "聚光灯后答对 1 分"),
      element("span", "", "答错 0 分")
    );

    var submit = element("button", "primary-button", "开始放映");
    submit.type = "submit";

    form.addEventListener("submit", function handleStart(event) {
      event.preventDefault();
      var selectedPack = form.elements.pack.value;
      textEquivalentVisible = Boolean(form.elements["text-equivalent"].checked);
      dispatch({
        type: logic.ACTIONS.START_MATCH,
        revision: state.revision,
        packId: selectedPack,
        playerNames: [
          form.elements["player-a"].value,
          form.elements["player-b"].value
        ]
      });
    });

    append(form, names, packs, equivalentLabel, rules, submit);
    append(section, heading, intro, form);
    return section;
  }

  function createHandoff(view) {
    var section = element("section", "screen handoff-screen");
    section.setAttribute("aria-labelledby", "handoff-heading");
    var curtain = element("div", "handoff-curtain");
    var heading = element(
      "h2",
      "handoff-heading",
      "请交给 " + view.currentPlayer.name
    );
    heading.id = "handoff-heading";
    append(
      curtain,
      heading,
      element("p", "", "下一题将在确认后出现")
    );
    var ready = button(
      view.currentPlayer.name + " 已准备好",
      "primary-button ready-button",
      function acknowledge() {
        dispatch({
          type: logic.ACTIONS.ACK_HANDOFF,
          revision: state.revision
        });
      }
    );
    ready.id = "primary-action";
    append(
      section,
      curtain,
      ready,
      element("p", "privacy-note", "确认前不会显示符号、选项或答案")
    );
    return section;
  }

  function createTokens(card) {
    var group = element("div", "symbol-group");
    group.setAttribute("aria-label", "四枚题面符号");
    card.tokens.forEach(function addToken(token) {
      var item = element("div", "symbol-cell");
      var glyph = element("span", "glyph", token.glyph);
      glyph.setAttribute("aria-hidden", "true");
      var label = element(
        "span",
        textEquivalentVisible ? "token-label" : "sr-only",
        token.labelZh
      );
      append(item, glyph, label);
      group.append(item);
    });
    return group;
  }

  function createQuestion(view) {
    var section = element("section", "screen question-screen");
    section.setAttribute("aria-labelledby", "question-heading");
    var heading = element(
      "h2",
      "screen-heading compact",
      view.currentPlayer.name + "，这部片叫什么？"
    );
    heading.id = "question-heading";
    var meta = element(
      "p",
      "question-meta",
      view.currentCard.genre + " · 难度 " + view.currentCard.difficulty
    );
    var options = element("div", "option-grid");
    options.setAttribute("role", "group");
    options.setAttribute("aria-label", "选择片名");

    view.currentCard.options.forEach(function addOption(option, index) {
      var label = option.title;
      if (option.selected) label += "，已选择";
      if (option.eliminated) label += "，已由聚光灯排除";
      var optionButton = button(
        option.title,
        "option-button",
        function selectOption() {
          dispatch(
            {
              type: logic.ACTIONS.SELECT_OPTION,
              revision: state.revision,
              optionId: option.id
            },
            "option-" + index
          );
        }
      );
      optionButton.id = "option-" + index;
      optionButton.setAttribute("aria-label", label);
      optionButton.setAttribute(
        "aria-pressed",
        option.selected ? "true" : "false"
      );
      optionButton.disabled = option.eliminated;
      if (option.selected) optionButton.classList.add("is-selected");
      if (option.eliminated) {
        optionButton.classList.add("is-eliminated");
        optionButton.append(element("span", "option-state", "已排除"));
      }
      options.append(optionButton);
    });

    var actions = element("div", "question-actions");
    var spotlightLabel = view.spotlightUsedThisRound
      ? "本题已使用聚光灯"
      : "使用聚光灯（剩余 " +
        view.players.find(function findPlayer(player) {
          return player.id === view.currentPlayer.id;
        }).spotlights +
        "）";
    var spotlight = button(
      spotlightLabel,
      "secondary-button",
      function useSpotlight() {
        dispatch({
          type: logic.ACTIONS.USE_SPOTLIGHT,
          revision: state.revision
        });
      }
    );
    var current = view.players.find(function findCurrent(player) {
      return player.id === view.currentPlayer.id;
    });
    spotlight.disabled =
      view.spotlightUsedThisRound || current.spotlights < 1;

    var continueButton = button(
      view.selectedOptionId ? "确认这张片名票" : "选择一个片名后继续",
      "primary-button",
      function openConfirmation() {
        dispatch({
          type: logic.ACTIONS.OPEN_CONFIRMATION,
          revision: state.revision
        });
      }
    );
    continueButton.disabled = !view.selectedOptionId;
    continueButton.id = "primary-action";
    append(actions, spotlight, continueButton);

    append(
      section,
      heading,
      meta,
      createTokens(view.currentCard),
      options,
      actions,
      element("p", "privacy-note", "交给下一位时会先遮住下一题")
    );
    return section;
  }

  function selectedOptionTitle(view) {
    var selected = view.currentCard.options.find(function findSelected(option) {
      return option.id === view.selectedOptionId;
    });
    return selected ? selected.title : "";
  }

  function createConfirm(view) {
    var section = element("section", "screen confirm-screen");
    section.setAttribute("aria-labelledby", "confirm-heading");
    var heading = element("h2", "screen-heading", "最后确认");
    heading.id = "confirm-heading";
    append(
      section,
      heading,
      element("p", "confirm-player", view.currentPlayer.name + " 选择了"),
      element("p", "chosen-title", "《" + selectedOptionTitle(view) + "》"),
      element(
        "p",
        "points-note",
        view.spotlightUsedThisRound
          ? "答对将获得 1 分"
          : "答对将获得 2 分"
      )
    );
    var actions = element("div", "confirm-actions");
    var back = button(
      "返回修改",
      "secondary-button",
      function returnToQuestion() {
        dispatch({
          type: logic.ACTIONS.RETURN_TO_QUESTION,
          revision: state.revision
        });
      }
    );
    var submit = button(
      "提交答案",
      "primary-button",
      function submitAnswer() {
        dispatch({
          type: logic.ACTIONS.SUBMIT_ANSWER,
          revision: state.revision
        });
      }
    );
    submit.id = "primary-action";
    append(actions, back, submit);
    section.append(actions);
    return section;
  }

  function createResult(view) {
    var result = view.lastResult;
    var section = element(
      "section",
      "screen result-screen " + (result.isCorrect ? "is-correct" : "is-wrong")
    );
    section.setAttribute("aria-labelledby", "result-heading");
    var heading = element(
      "h2",
      "screen-heading",
      result.isCorrect ? "答对了，票根入场" : "这一张没有猜中"
    );
    heading.id = "result-heading";
    var resultCopy = element("div", "result-copy");
    append(
      resultCopy,
      element("p", "result-score", "+" + result.scoreAwarded + " 分"),
      element("p", "", "你的选择：《" + result.selectedTitle + "》"),
      element("p", "correct-answer", "正确片名：《" + result.correctTitle + "》"),
      element("p", "rationale", result.rationale)
    );
    var next = button(
      view.roundNumber === view.totalRounds ? "查看片尾" : "交接下一位",
      "primary-button",
      function advanceRound() {
        dispatch({
          type: logic.ACTIONS.ADVANCE_ROUND,
          revision: state.revision
        });
      }
    );
    next.id = "primary-action";
    append(section, heading, createTokens(view.currentCard), resultCopy, next);
    return section;
  }

  function createSummary(view) {
    var section = element("section", "screen summary-screen");
    section.setAttribute("aria-labelledby", "summary-heading");
    var byId = new Map(
      view.players.map(function mapPlayer(player) {
        return [player.id, player];
      })
    );
    var winnerCopy =
      view.summary.winner === "tie"
        ? "今晚平分秋色"
        : byId.get(view.summary.winner).name + " 赢得末场";
    var heading = element("h2", "screen-heading", winnerCopy);
    heading.id = "summary-heading";
    var finalScores = element("div", "final-scores");
    view.players.forEach(function addFinalScore(player) {
      append(
        finalScores,
        element(
          "p",
          "final-score",
          player.name +
            " · " +
            player.score +
            " 分 · 使用聚光灯 " +
            (logic.CONSTANTS.STARTING_SPOTLIGHTS - player.spotlights) +
            " 次"
        )
      );
    });

    var review = element("ol", "review-list");
    review.setAttribute("aria-label", "八题结果");
    view.summary.results.forEach(function addReview(result) {
      var item = element("li", "review-item");
      var player = byId.get(result.playerId);
      append(
        item,
        element(
          "strong",
          "",
          "第 " + (result.roundIndex + 1) + " 题 · " + player.name
        ),
        element(
          "span",
          "",
          result.correctTitle + " · +" + result.scoreAwarded + " 分"
        )
      );
      review.append(item);
    });

    var restart = button(
      "再放映一场",
      "primary-button",
      function restartMatch() {
        textEquivalentVisible = false;
        dispatch({
          type: logic.ACTIONS.RESTART,
          revision: state.revision
        });
      }
    );
    restart.id = "primary-action";
    append(section, heading, finalScores, review, restart);
    return section;
  }

  function createScreen(view) {
    switch (view.phase) {
      case "setup":
        return createSetup(view);
      case "handoff":
        return createHandoff(view);
      case "question":
        return createQuestion(view);
      case "confirm":
        return createConfirm(view);
      case "result":
        return createResult(view);
      case "summary":
        return createSummary(view);
      default:
        return createSetup(view);
    }
  }

  function dispatch(action, focusId) {
    var next = logic.reduce(state, action);
    if (next === state) return;
    state = next;
    interactionEpoch += 1;
    render(focusId);
  }

  function render(focusId) {
    var view = logic.getPublicView(state);
    var ticket = element("article", "ticket");
    ticket.setAttribute("aria-labelledby", "screen-title");
    append(ticket, createHeader(view), createScreen(view));
    root.replaceChildren(ticket);
    root.hidden = false;
    document.body.dataset.phase = view.phase;

    var target = focusId ? document.getElementById(focusId) : null;
    if (!target && view.phase !== "setup") {
      target =
        document.getElementById("primary-action") ||
        ticket.querySelector("h2");
    }
    if (target && typeof target.focus === "function") {
      target.focus({ preventScroll: true });
    }
  }

  function cancelTransientInteraction() {
    interactionEpoch += 1;
  }

  document.addEventListener("keydown", function handleKeyboard(event) {
    if (event.defaultPrevented) return;
    var view = logic.getPublicView(state);
    if (
      view.phase === "question" &&
      /^[1-4]$/.test(event.key) &&
      !event.metaKey &&
      !event.ctrlKey &&
      !event.altKey
    ) {
      var index = Number(event.key) - 1;
      var option = view.currentCard.options[index];
      if (!option.eliminated) {
        event.preventDefault();
        dispatch(
          {
            type: logic.ACTIONS.SELECT_OPTION,
            revision: state.revision,
            optionId: option.id
          },
          "option-" + index
        );
      }
    }
  });
  document.addEventListener("visibilitychange", cancelTransientInteraction);
  window.addEventListener("blur", cancelTransientInteraction);
  document.addEventListener("pointercancel", cancelTransientInteraction);

  render();
})();
