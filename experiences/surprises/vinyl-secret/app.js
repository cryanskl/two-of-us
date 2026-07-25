(function () {
  "use strict";

  const logic = globalThis.VINYL_SECRET_LOGIC;
  const config = globalThis.VINYL_SECRET_CONFIG;
  const stage = document.getElementById("stage");
  const appTitle = document.getElementById("app-title");
  const liveStatus = document.getElementById("live-status");
  const audio = document.getElementById("track-audio");
  const motionQuery = globalThis.matchMedia("(prefers-reduced-motion: reduce)");

  if (!logic || !config || !stage || !appTitle || !liveStatus || !audio) return;

  let machine = logic.createInitialState();
  let view = logic.getViewModel(machine, config);
  let settleTimer = null;
  let settleToken = null;
  let audioGeneration = 0;
  let audioToken = null;
  let audioStatus = "none";
  let announcedSerial = -1;

  function element(tagName, className, text) {
    const node = document.createElement(tagName);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function makeHeading(text, className, id) {
    const heading = element("h2", className, text);
    if (id) heading.id = id;
    heading.tabIndex = -1;
    return heading;
  }

  function makeButton(id, text, onClick, options) {
    const button = element("button", options?.className || "button", text);
    button.type = "button";
    button.id = id;
    if (options?.disabled) button.disabled = true;
    let consumed = false;
    button.addEventListener("click", function (event) {
      if (button.disabled || (options?.oneShot && (consumed || event.detail > 1))) return;
      if (options?.oneShot) {
        consumed = true;
        button.disabled = true;
      }
      onClick();
    });
    button.addEventListener("keydown", function (event) {
      if (event.repeat && (event.key === "Enter" || event.key === " ")) {
        event.preventDefault();
      }
    });
    return button;
  }

  function focusById(id) {
    const target = id ? document.getElementById(id) : null;
    if (target) target.focus({ preventScroll: false });
  }

  function announceCurrentView() {
    if (view.noticeSerial === announcedSerial) return;
    announcedSerial = view.noticeSerial;
    const messages = {
      started: "第一条线索已经放好，请移动唱针。",
      miss: "还不是这一圈，再听听附近的信号。",
      hit: "找到了，这一轨已经为你展开。",
      settled: "这一轨已经收好，可以继续听下一面。",
      advanced: "下一条线索已经放好，请继续寻声。",
      completed: "三段秘密都找到了，封套已经打开。",
      restarted: "唱片已经重新收好。",
    };
    const message = messages[view.lastNotice];
    if (message) liveStatus.textContent = message;
  }

  function transition(action) {
    machine = logic.transition(machine, action, config);
    view = logic.getViewModel(machine, config);
  }

  function clearSettleTimer() {
    if (settleTimer !== null) {
      globalThis.clearTimeout(settleTimer);
      settleTimer = null;
    }
    settleToken = null;
  }

  function clearMediaNode() {
    try {
      audio.pause();
    } catch (_error) {
      // Some test doubles may reject media methods; cleanup remains best effort.
    }
    audio.removeAttribute("src");
    try {
      audio.load();
    } catch (_error) {
      // Removing the source is the authoritative cleanup step.
    }
  }

  function stopAndReleaseAudio(nextStatus) {
    audioGeneration += 1;
    clearMediaNode();
    audioToken = null;
    audioStatus = nextStatus || "none";
    refreshAudioFeedback();
  }

  function audioCopy() {
    if (audioStatus === "loading") return "正在放下这一轨的唱针。";
    if (audioStatus === "playing") return "这一轨的本地声音正在播放。";
    if (audioStatus === "ended") return "这一轨的声音已经播放完。";
    if (audioStatus === "stopped") return "声音已经停下，文字仍然留在这里。";
    if (audioStatus === "failed") return "这段声音没有播放，文字已经为你留下。";
    return "这一轨没有附声音，文字已经展开。";
  }

  function refreshAudioFeedback() {
    const feedback = document.getElementById("audio-feedback");
    if (feedback) feedback.textContent = audioCopy();
    const existing = document.getElementById("stop-audio-button");
    const shouldShowStop = audioStatus === "loading" || audioStatus === "playing";
    if (shouldShowStop && !existing) {
      const region = document.getElementById("audio-region");
      if (region) {
        region.append(makeButton(
          "stop-audio-button",
          "停止声音",
          function () {
            stopAndReleaseAudio("stopped");
          },
          { className: "button button--quiet" },
        ));
      }
    } else if (!shouldShowStop && existing) {
      existing.remove();
    }
  }

  function audioCallbackIsCurrent(generation, token) {
    return generation === audioGeneration && token === audioToken;
  }

  function failAudio(generation, token) {
    if (!audioCallbackIsCurrent(generation, token)) return;
    audioGeneration += 1;
    audioToken = null;
    audioStatus = "failed";
    clearMediaNode();
    refreshAudioFeedback();
    liveStatus.textContent = "这段声音没有播放，文字已经为你留下。";
  }

  function attemptAudio(audioSrc, pendingToken) {
    audioGeneration += 1;
    const generation = audioGeneration;
    audioToken = pendingToken;
    audioStatus = "loading";
    clearMediaNode();
    audio.setAttribute("src", audioSrc);
    try {
      audio.currentTime = 0;
    } catch (_error) {
      // Some browsers delay currentTime writes until metadata is available.
    }

    let playResult;
    try {
      playResult = audio.play();
    } catch (_error) {
      failAudio(generation, pendingToken);
      return;
    }
    Promise.resolve(playResult).then(
      function () {
        if (generation !== audioGeneration || pendingToken !== audioToken) return;
        audioStatus = "playing";
        refreshAudioFeedback();
      },
      function () {
        failAudio(generation, pendingToken);
      },
    );
  }

  function makeProgress(trackNumber, trackCount) {
    const progress = element(
      "p",
      "track-progress",
      `第 ${trackNumber} / ${trackCount} 轨`,
    );
    progress.setAttribute("aria-label", `第 ${trackNumber} 轨，共 ${trackCount} 轨`);
    return progress;
  }

  function makeRecord(currentView, options) {
    const frame = element("div", "record-frame");
    frame.setAttribute("aria-hidden", "true");
    const record = element("div", "record");
    if (options?.spinning) record.classList.add("record--spinning");
    const grooveCount = currentView.grooveCount || logic.GROOVE_COUNT;
    for (let groove = 1; groove <= grooveCount; groove += 1) {
      const ring = element("span", "groove");
      ring.dataset.groove = String(groove);
      ring.style.setProperty("--groove-index", String(groove - 1));
      if (currentView.cursorGroove === groove) ring.dataset.current = "true";
      record.append(ring);
    }
    record.append(
      element("span", "record-label"),
      element("span", "spindle"),
    );

    const tonearm = element("div", "tonearm");
    const cursor = currentView.cursorGroove || grooveCount;
    const ratio = grooveCount > 1 ? (cursor - 1) / (grooveCount - 1) : 0;
    tonearm.style.setProperty("--arm-ratio", String(ratio));
    tonearm.append(
      element("span", "tonearm__pivot"),
      element("span", "tonearm__shaft"),
      element("span", "tonearm__head"),
    );
    frame.append(record, tonearm);
    return frame;
  }

  function makeSignal() {
    const signal = element("section", "signal-panel");
    signal.setAttribute("aria-label", `当前信号：${view.signalLabel}`);
    const labels = ["寂静", "微响", "靠近", "清晰"];
    const codes = ["quiet", "warm", "near", "clear"];
    const activeIndex = codes.indexOf(view.signalCode);
    const meter = element("div", "signal-meter");
    meter.setAttribute("aria-hidden", "true");
    for (let index = 0; index < labels.length; index += 1) {
      const segment = element("span", "signal-meter__segment");
      if (index <= activeIndex) segment.dataset.active = "true";
      meter.append(segment);
    }
    const labelRow = element("div", "signal-labels");
    for (const label of labels) labelRow.append(element("span", "", label));
    const current = element("p", "signal-current", view.signalLabel);
    current.id = "signal-current";
    signal.append(meter, labelRow, current);
    return signal;
  }

  function makeAudioRegion() {
    const region = element("div", "audio-region");
    region.id = "audio-region";
    const feedback = element("p", "audio-feedback", audioCopy());
    feedback.id = "audio-feedback";
    region.append(feedback);
    const shouldShowStop = audioStatus === "loading" || audioStatus === "playing";
    if (shouldShowStop) {
      region.append(makeButton(
        "stop-audio-button",
        "停止声音",
        function () {
          stopAndReleaseAudio("stopped");
        },
        { className: "button button--quiet" },
      ));
    }
    return region;
  }

  function makeSeekingWorkspace(currentView, locked) {
    const workspace = element("div", "workbench");
    const visual = element("section", "turntable-panel");
    visual.append(makeRecord(currentView, { spinning: locked }));

    const rail = element("section", "clue-rail");
    rail.append(makeProgress(currentView.trackNumber, currentView.trackCount));
    const clue = makeHeading(currentView.clue, "clue", "phase-title");
    rail.append(clue, makeSignal());

    const controls = element("section", "groove-controls");
    controls.setAttribute("aria-label", "唱针位置");
    const label = element("label", "groove-label", "唱针所在沟槽");
    label.htmlFor = "groove-control";
    const output = element(
      "output",
      "groove-output",
      `第 ${currentView.cursorGroove} 圈，共 ${currentView.grooveCount} 圈`,
    );
    output.htmlFor = "groove-control";
    output.id = "groove-output";

    const range = document.createElement("input");
    range.id = "groove-control";
    range.className = "groove-range";
    range.type = "range";
    range.min = "1";
    range.max = String(view.grooveCount);
    range.step = "1";
    range.value = String(currentView.cursorGroove);
    range.disabled = locked;
    range.setAttribute(
      "aria-valuetext",
      `第 ${currentView.cursorGroove} 圈，共 ${currentView.grooveCount} 圈`,
    );
    range.addEventListener("input", function () {
      moveTo(range.valueAsNumber);
    });

    const stepRow = element("div", "step-row");
    stepRow.append(
      makeButton(
        "outward-button",
        "向外一圈",
        function () {
          moveTo(Math.max(1, view.cursorGroove - 1));
        },
        {
          className: "button button--step",
          disabled: locked || currentView.cursorGroove === 1,
        },
      ),
      makeButton(
        "inward-button",
        "向内一圈",
        function () {
          moveTo(Math.min(view.grooveCount, view.cursorGroove + 1));
        },
        {
          className: "button button--step",
          disabled: locked || currentView.cursorGroove === currentView.grooveCount,
        },
      ),
    );
    controls.append(label, output, range, stepRow);

    if (locked) {
      const notePanel = element("article", "note-panel note-panel--opening");
      const noteTitle = makeHeading("这一轨已经展开", "note-title", "playing-title");
      notePanel.append(noteTitle, element("p", "note-copy", currentView.note), makeAudioRegion());
      controls.append(notePanel);
    } else {
      controls.append(makeButton(
        "drop-button",
        "落下唱针",
        dropNeedle,
        { className: "button button--primary", oneShot: true },
      ));
    }

    workspace.append(visual, rail, controls);
    return workspace;
  }

  function renderIntro() {
    const intro = element("section", "intro");
    const sleeve = element("div", "closed-sleeve");
    sleeve.setAttribute("aria-hidden", "true");
    sleeve.append(element("span", "closed-sleeve__disc"));
    const copy = element("div", "intro-copy");
    copy.append(
      element("p", "intro-text", view.intro),
      makeButton(
        "start-button",
        view.primaryAction,
        function () {
          transition({ type: "START" });
          render("groove-control");
        },
        { className: "button button--primary", oneShot: true },
      ),
    );
    intro.append(sleeve, copy);
    stage.replaceChildren(intro);
  }

  function renderSeeking() {
    stage.replaceChildren(makeSeekingWorkspace(view, false));
  }

  function renderPlaying() {
    stage.replaceChildren(makeSeekingWorkspace(view, true));
  }

  function renderTrackResult() {
    const result = element("section", "result-layout");
    const recordColumn = element("div", "result-record");
    recordColumn.append(makeRecord(
      { grooveCount: logic.GROOVE_COUNT, cursorGroove: logic.GROOVE_COUNT },
    ));
    const paper = element("article", "result-paper");
    paper.append(
      makeProgress(view.trackNumber, view.trackCount),
      makeHeading("这一轨，已经找到", "result-title", "result-title"),
      element("p", "result-clue", view.clue),
      element("p", "result-note", view.note),
      makeAudioRegion(),
      makeButton(
        "next-button",
        "继续听下一面",
        function () {
          stopAndReleaseAudio("none");
          transition({ type: "NEXT" });
          render("groove-control");
        },
        { className: "button button--primary", oneShot: true },
      ),
    );
    result.append(recordColumn, paper);
    stage.replaceChildren(result);
  }

  function renderComplete() {
    const complete = element("section", "complete");
    complete.append(
      makeProgress(view.foundCount, view.trackCount),
      element("p", "recipient", view.recipientName),
      makeRecord({ grooveCount: logic.GROOVE_COUNT, cursorGroove: logic.GROOVE_COUNT }),
    );

    const sleeve = element("article", "open-sleeve");
    const finalTitle = makeHeading(view.finalTitle, "final-title", "final-title");
    sleeve.append(
      element("p", "final-eyebrow", view.finalEyebrow),
      finalTitle,
    );
    const noteList = element("ol", "final-notes");
    for (const note of view.notes) noteList.append(element("li", "", note));
    sleeve.append(
      noteList,
      element("p", "final-message", view.finalMessage),
      element("p", "signature", view.signature),
      makeAudioRegion(),
      makeButton(
        "restart-button",
        "重新开始",
        function () {
          clearSettleTimer();
          stopAndReleaseAudio("none");
          transition({ type: "RESTART" });
          render("app-title");
        },
        { className: "button button--primary", oneShot: true },
      ),
    );
    complete.append(sleeve);
    stage.replaceChildren(complete);
  }

  function render(focusId) {
    document.body.dataset.phase = view.phase;
    if (view.phase === "intro") renderIntro();
    if (view.phase === "seeking") renderSeeking();
    if (view.phase === "playing") renderPlaying();
    if (view.phase === "track-result") renderTrackResult();
    if (view.phase === "complete") renderComplete();
    announceCurrentView();
    focusById(focusId);
  }

  function updateSeekingPosition(currentView) {
    const range = document.getElementById("groove-control");
    const output = document.getElementById("groove-output");
    const signalText = document.getElementById("signal-current");
    if (!range || !output || !signalText) {
      render("groove-control");
      return;
    }
    range.value = String(currentView.cursorGroove);
    range.setAttribute(
      "aria-valuetext",
      `第 ${currentView.cursorGroove} 圈，共 ${currentView.grooveCount} 圈`,
    );
    output.textContent =
      `第 ${currentView.cursorGroove} 圈，共 ${currentView.grooveCount} 圈`;
    signalText.textContent = currentView.signalLabel;
    const signalPanel = signalText.closest(".signal-panel");
    if (signalPanel) signalPanel.setAttribute(
      "aria-label",
      `当前信号：${currentView.signalLabel}`,
    );

    const codes = ["quiet", "warm", "near", "clear"];
    const activeIndex = codes.indexOf(currentView.signalCode);
    const segments = stage.querySelectorAll(".signal-meter__segment");
    for (let index = 0; index < segments.length; index += 1) {
      if (index <= activeIndex) segments[index].dataset.active = "true";
      else delete segments[index].dataset.active;
    }
    const grooves = stage.querySelectorAll(".groove");
    for (const groove of grooves) {
      if (groove.dataset.groove === String(currentView.cursorGroove)) {
        groove.dataset.current = "true";
      } else {
        delete groove.dataset.current;
      }
    }
    const tonearm = stage.querySelector(".tonearm");
    if (tonearm) {
      tonearm.style.setProperty(
        "--arm-ratio",
        String((currentView.cursorGroove - 1) / (currentView.grooveCount - 1)),
      );
    }
    const outward = document.getElementById("outward-button");
    const inward = document.getElementById("inward-button");
    if (outward) outward.disabled = currentView.cursorGroove === 1;
    if (inward) inward.disabled = currentView.cursorGroove === currentView.grooveCount;
  }

  function moveTo(groove) {
    const previous = machine;
    transition({ type: "MOVE", groove });
    if (machine === previous) return;
    updateSeekingPosition(view);
  }

  function settleTrack(token, reason) {
    clearSettleTimer();
    const previous = machine;
    transition({ type: "SETTLE_TRACK", token, reason });
    if (machine === previous) return;
    render(view.phase === "complete" ? "final-title" : "result-title");
  }

  function scheduleSettlement(pendingToken) {
    clearSettleTimer();
    settleToken = pendingToken;
    if (motionQuery.matches) {
      queueMicrotask(function () {
        if (settleToken !== pendingToken) return;
        settleTrack(pendingToken, "reduced-motion");
      });
      return;
    }
    settleTimer = globalThis.setTimeout(function () {
      if (settleToken !== pendingToken) return;
      settleTrack(pendingToken, "timer");
    }, logic.TRACK_SETTLE_MS);
  }

  function dropNeedle() {
    const previous = machine;
    transition({ type: "DROP_NEEDLE" });
    if (machine === previous) return;
    if (view.phase !== "playing") {
      render("drop-button");
      return;
    }

    audioStatus = view.audioSrc === null ? "none" : "loading";
    audioToken = view.pendingToken;
    render("playing-title");
    if (view.audioSrc !== null) attemptAudio(view.audioSrc, view.pendingToken);
    scheduleSettlement(view.pendingToken);
  }

  function settlePendingForLifecycle(reason) {
    if (view.phase !== "playing") return;
    const pendingToken = view.pendingToken;
    settleTrack(pendingToken, reason);
  }

  audio.addEventListener("error", function () {
    if (audioToken === null) return;
    failAudio(audioGeneration, audioToken);
  });

  audio.addEventListener("ended", function () {
    if (audioToken === null) return;
    audioStatus = "ended";
    refreshAudioFeedback();
  });

  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState !== "hidden") return;
    settlePendingForLifecycle("hidden");
    stopAndReleaseAudio("stopped");
  });

  globalThis.addEventListener("pagehide", function () {
    settlePendingForLifecycle("pagehide");
    clearSettleTimer();
    stopAndReleaseAudio("stopped");
  });

  function handleMotionChange(event) {
    if (!event.matches || view.phase !== "playing") return;
    settleTrack(view.pendingToken, "reduced-motion");
  }

  if (typeof motionQuery.addEventListener === "function") {
    motionQuery.addEventListener("change", handleMotionChange);
  } else if (typeof motionQuery.addListener === "function") {
    motionQuery.addListener(handleMotionChange);
  }

  render();
})();
