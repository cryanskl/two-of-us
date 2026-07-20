(function () {
  "use strict";

  const logic = globalThis.ConstellationRelayLogic;
  const rawConfig = globalThis.CONSTELLATION_RELAY_CONFIG;
  const root = document.querySelector("#constellation-app");
  if (!logic || !rawConfig || !root) {
    document.body.textContent = "星光接线台加载失败，请确认 logic.js、config.js 与 app.js 都在同一目录。";
    return;
  }

  const requiredApi = ["normalizeConfig", "createInitialState", "reduce", "getPublicView"];
  if (requiredApi.some((name) => typeof logic[name] !== "function")) {
    document.body.textContent = "星光接线台规则接口不完整，请重新复制整个作品目录。";
    return;
  }

  const config = logic.normalizeConfig(rawConfig);

  const svgNamespace = "http://www.w3.org/2000/svg";
  const elements = {
    completedCount: document.querySelector("#completed-count"),
    seatA: document.querySelector("#seat-a"),
    seatB: document.querySelector("#seat-b"),
    seatNameA: document.querySelector("#seat-name-a"),
    seatNameB: document.querySelector("#seat-name-b"),
    seatCountA: document.querySelector("#seat-count-a"),
    seatCountB: document.querySelector("#seat-count-b"),
    legendNameA: document.querySelector("#legend-name-a"),
    legendNameB: document.querySelector("#legend-name-b"),
    handoffCopy: document.querySelector("#handoff-copy"),
    choosingCopy: document.querySelector("#choosing-copy"),
    attemptCount: document.querySelector("#attempt-count"),
    jammedCopy: document.querySelector("#jammed-copy"),
    completionNote: document.querySelector("#completion-note"),
    completionKeepsake: document.querySelector("#completion-keepsake"),
    phasePanels: [...document.querySelectorAll("[data-phase-panel]")],
    starControls: document.querySelector("#star-controls"),
    boardSurface: document.querySelector("#board-surface"),
    targetLayer: document.querySelector("#target-layer"),
    completedLayer: document.querySelector("#completed-layer"),
    ghostLayer: document.querySelector("#ghost-layer"),
    log: document.querySelector("#connection-log"),
    logCount: document.querySelector("#log-count"),
    liveStatus: document.querySelector("#live-status"),
  };

  const pointCopy = Object.freeze({
    spool: Object.freeze({ name: "线轴", short: "线轴" }),
    "west-hub": Object.freeze({ name: "西翼枢纽", short: "西枢" }),
    "west-top": Object.freeze({ name: "西翼上星", short: "西上" }),
    "west-tip": Object.freeze({ name: "西翼尖星", short: "西尖" }),
    "west-bottom": Object.freeze({ name: "西翼下星", short: "西下" }),
    "east-hub": Object.freeze({ name: "东翼枢纽", short: "东枢" }),
    "east-top": Object.freeze({ name: "东翼上星", short: "东上" }),
    "east-tip": Object.freeze({ name: "东翼尖星", short: "东尖" }),
    "east-bottom": Object.freeze({ name: "东翼下星", short: "东下" }),
  });

  const resultCopy = Object.freeze({
    "edge-used": "这根星线已经接过了。",
    "wire-crossed": "线束会相撞，换一颗星试试。",
    "off-outline": "这不在星鸢的接线图上。",
    "future-stranded": "这样会留下接不完的线，换一条路。",
    invalid: "这次接线没有被观测台接受。",
  });

  const seatNames = Object.freeze({ a: config.seats.a, b: config.seats.b });
  const starButtons = new Map();
  let state = logic.createInitialState();
  let view = logic.getPublicView(state);
  let pointById = new Map(view.points.map((point) => [point.id, point]));
  let pointOrder = new Map(view.points.map((point, index) => [point.id, index]));
  let rovingId = view.cursorId;
  let ghostTargetId = null;
  let focusRevision = 0;
  let liveRevision = 0;
  let dispatching = false;

  buildTargetLayer();
  buildStarControls();
  installEvents();
  syncStaticCopy();
  probeAsset("./assets/observatory-console-background.png", "background-image-ready");
  probeKeepsake();
  render({ focus: "none" });

  function installEvents() {
    root.addEventListener("click", handleClick);
    document.addEventListener("keydown", handleKeyDown);
    elements.starControls.addEventListener("focusin", (event) => {
      const button = event.target instanceof Element ? event.target.closest(".star-button") : null;
      if (!button) return;
      setRoving(button.dataset.pointId, false);
      setGhost(button.dataset.pointId);
    });
    elements.starControls.addEventListener("focusout", (event) => {
      const next = event.relatedTarget instanceof Element ? event.relatedTarget.closest(".star-button") : null;
      if (!next || !elements.starControls.contains(next)) setGhost(null);
    });
    elements.starControls.addEventListener("pointerover", (event) => {
      const button = event.target instanceof Element ? event.target.closest(".star-button") : null;
      if (button) setGhost(button.dataset.pointId);
    });
    elements.boardSurface.addEventListener("pointerleave", () => {
      const focused = document.activeElement?.closest?.(".star-button");
      setGhost(focused?.dataset.pointId || null);
    });
  }

  function handleClick(event) {
    const target = event.target instanceof Element ? event.target : null;
    const star = target?.closest("button[data-point-id]");
    if (star && elements.starControls.contains(star)) {
      if (view.phase === "choosing") submitPoint(star.dataset.pointId);
      return;
    }

    const actionButton = target?.closest("button[data-action]");
    if (!actionButton || !root.contains(actionButton) || actionButton.hidden || actionButton.disabled) return;
    const type = actionButton.dataset.action;
    if (type === "START") {
      dispatch({ type }, { focus: "phase" });
    } else if (type === "TAKE_OVER") {
      dispatch({ type, seat: view.currentSeat }, { focus: "cursor" });
    } else if (type === "NEXT_TURN") {
      dispatch({ type }, { focus: "phase" });
    } else if (type === "RETRY_EDGE") {
      dispatch({ type }, { focus: "cursor" });
    } else if (type === "FINISH") {
      dispatch({ type }, { focus: "complete" });
    } else if (type === "RESTART") {
      dispatch({ type }, { focus: "primary" });
    }
  }

  function handleKeyDown(event) {
    if (event.repeat || hasCommandModifier(event) || isEditable(event.target)) return;

    if (event.key === "Escape" && view.phase === "choosing") {
      event.preventDefault();
      setGhost(null);
      setRoving(view.cursorId, true);
      return;
    }

    const button = event.target instanceof Element ? event.target.closest("button[data-point-id]") : null;
    if (!button || !elements.starControls.contains(button)) return;

    if (["ArrowUp", "ArrowRight", "ArrowDown", "ArrowLeft"].includes(event.key)) {
      const nextId = spatialNeighbor(button.dataset.pointId, event.key);
      event.preventDefault();
      if (!nextId) return;
      setRoving(nextId, true);
      setGhost(nextId);
      return;
    }

    if ((event.key === "Enter" || event.key === " ") && view.phase === "choosing") {
      event.preventDefault();
      submitPoint(button.dataset.pointId);
    }
  }

  function hasCommandModifier(event) {
    try {
      return event.ctrlKey === true || event.metaKey === true || event.altKey === true;
    } catch (_error) {
      return true;
    }
  }

  function isEditable(target) {
    return target instanceof Element
      && (target.isContentEditable || Boolean(target.closest("input, textarea, select")));
  }

  function submitPoint(toId) {
    if (dispatching || view.phase !== "choosing" || toId === view.cursorId || !pointById.has(toId)) return;
    rovingId = toId;
    dispatch({
      type: "CONNECT",
      seat: view.currentSeat,
      fromId: view.cursorId,
      toId,
    }, { focus: "star", pointId: toId });
  }

  function dispatch(action, focusRequest) {
    if (dispatching) return;
    dispatching = true;
    const previousView = view;
    const nextState = logic.reduce(state, action);
    if (nextState === state) {
      dispatching = false;
      return;
    }
    state = nextState;
    view = logic.getPublicView(state);
    pointById = new Map(view.points.map((point) => [point.id, point]));
    pointOrder = new Map(view.points.map((point, index) => [point.id, index]));
    ghostTargetId = null;
    if (view.phase === "choosing" || view.completedCount > previousView.completedCount) rovingId = view.cursorId;
    const resolvedFocus = action.type === "CONNECT" && view.phase === "constellation-result"
      ? { focus: "phase" }
      : focusRequest;
    render(resolvedFocus);
    announce(describeAction(action, previousView, view));
    dispatching = false;
  }

  function describeAction(action, previous, next) {
    if (action.type === "START") return `请把观测台交给${seatName(next.currentSeat)}。`;
    if (action.type === "TAKE_OVER") return `${seatName(next.currentSeat)}已经接过观测台，可以开始接线。`;
    if (action.type === "CONNECT") {
      if (next.phase === "jammed") return resultCopy[next.lastResult?.status] || resultCopy.invalid;
      if (next.phase === "constellation-result") return "十根星线全部接通。";
      const move = next.completedMoves.at(-1);
      return `${seatName(move.seat)}接通了${pointName(move.fromId)}到${pointName(move.toId)}。`;
    }
    if (action.type === "RETRY_EDGE") return `${seatName(next.currentSeat)}重新选择这根线。`;
    if (action.type === "NEXT_TURN") return `接通。请把观测台交给${seatName(next.currentSeat)}。`;
    if (action.type === "FINISH") return "我们把同一束星光交了十次。";
    if (action.type === "RESTART") return "星光已经收好，接线台回到起点。";
    return previous.phase === next.phase ? "" : "观测台状态已经更新。";
  }

  function render(focusRequest = { focus: "none" }) {
    root.dataset.phase = view.phase;
    root.dataset.seat = view.currentSeat || "a";
    elements.completedCount.textContent = String(view.completedCount);
    elements.seatCountA.textContent = String(view.seatCounts.a);
    elements.seatCountB.textContent = String(view.seatCounts.b);
    elements.seatA.classList.toggle("is-current", isActiveSeat("a"));
    elements.seatB.classList.toggle("is-current", isActiveSeat("b"));
    elements.handoffCopy.textContent = `请把观测台交给${seatName(view.currentSeat)}`;
    elements.choosingCopy.textContent = `${seatName(view.currentSeat)}，从亮着的线头接向下一颗星。`;
    elements.attemptCount.textContent = String(view.attempt);
    elements.jammedCopy.textContent = resultCopy[view.lastResult?.status] || resultCopy.invalid;
    elements.logCount.textContent = `${view.completedCount} / 10`;

    for (const panel of elements.phasePanels) panel.hidden = panel.dataset.phasePanel !== view.phase;
    renderCompletedLines();
    renderStars();
    renderLog();
    renderGhost();
    scheduleFocus(focusRequest);
  }

  function isActiveSeat(seat) {
    return !["intro", "complete"].includes(view.phase) && view.currentSeat === seat;
  }

  function syncStaticCopy() {
    for (const element of [elements.seatNameA, elements.legendNameA]) element.textContent = seatNames.a;
    for (const element of [elements.seatNameB, elements.legendNameB]) element.textContent = seatNames.b;
    elements.completionNote.textContent = config.completionNote;
  }

  function buildTargetLayer() {
    const fragment = document.createDocumentFragment();
    for (const edge of view.targetEdges) {
      const from = pointById.get(edge.a);
      const to = pointById.get(edge.b);
      if (!from || !to) continue;
      fragment.append(svg("line", {
        class: "target-wire",
        x1: from.x,
        y1: from.y,
        x2: to.x,
        y2: to.y,
        "data-edge-id": edge.id,
      }));
    }
    elements.targetLayer.replaceChildren(fragment);
  }

  function buildStarControls() {
    const fragment = document.createDocumentFragment();
    for (const point of view.points) {
      const copy = pointCopy[point.id] || { name: point.id, short: point.id };
      const button = document.createElement("button");
      button.type = "button";
      button.className = "star-button";
      button.dataset.pointId = point.id;
      button.style.left = `${point.x / 10}%`;
      button.style.top = `${point.y / 10}%`;
      button.tabIndex = point.id === rovingId ? 0 : -1;
      const visibleName = document.createElement("span");
      visibleName.className = "star-name";
      visibleName.setAttribute("aria-hidden", "true");
      visibleName.textContent = copy.short;
      button.append(visibleName);
      starButtons.set(point.id, button);
      fragment.append(button);
    }
    elements.starControls.append(fragment);
  }

  function renderStars() {
    const usedPoints = new Set();
    for (const move of view.completedMoves) {
      usedPoints.add(move.fromId);
      usedPoints.add(move.toId);
    }
    if (!starButtons.has(rovingId)) rovingId = view.cursorId;

    for (const point of view.points) {
      const button = starButtons.get(point.id);
      const current = point.id === view.cursorId;
      const used = usedPoints.has(point.id);
      button.tabIndex = point.id === rovingId ? 0 : -1;
      button.classList.toggle("is-current", current);
      button.classList.toggle("is-used", used);
      button.setAttribute("aria-current", current ? "true" : "false");
      button.setAttribute("aria-disabled", String(view.phase !== "choosing" || current));
      button.setAttribute("aria-label", starLabel(point, current, used));
    }
  }

  function starLabel(point, current, used) {
    const role = point.role === "start" ? "，固定起点" : point.role === "end" ? "，固定终点" : "";
    const stateText = current
      ? "，当前线头"
      : used
        ? "，已有线路经过"
        : "，尚未接入";
    const action = view.phase === "choosing" && !current ? "，可以尝试接向这里" : "";
    return `${pointName(point.id)}${role}${stateText}${action}`;
  }

  function renderCompletedLines() {
    const fragment = document.createDocumentFragment();
    view.completedMoves.forEach((move, index) => {
      const from = pointById.get(move.fromId);
      const to = pointById.get(move.toId);
      if (!from || !to) return;
      const group = svg("g", {
        class: `wire-group${index === view.completedMoves.length - 1 ? " is-new" : ""}`,
        "data-edge-id": move.edgeId,
        "data-seat": move.seat,
      });
      group.append(
        svg("line", { class: "wire-groove", x1: from.x, y1: from.y, x2: to.x, y2: to.y }),
        svg("line", { class: "wire-core", x1: from.x, y1: from.y, x2: to.x, y2: to.y }),
      );
      appendEndcap(group, to, move.seat);
      fragment.append(group);
    });
    elements.completedLayer.replaceChildren(fragment);
  }

  function appendEndcap(group, point, seat) {
    if (seat === "a") {
      group.append(svg("circle", { class: "wire-endcap wire-endcap--a", cx: point.x, cy: point.y, r: 10 }));
      return;
    }
    group.append(
      svg("circle", { class: "wire-endcap wire-endcap--b", cx: point.x, cy: point.y, r: 12 }),
      svg("circle", { class: "wire-endcap-inner--b", cx: point.x, cy: point.y, r: 6 }),
    );
  }

  function renderLog() {
    if (view.completedMoves.length === 0) {
      const empty = document.createElement("li");
      empty.className = "log-empty";
      empty.textContent = "还没有接入星线。";
      elements.log.replaceChildren(empty);
      return;
    }

    const fragment = document.createDocumentFragment();
    view.completedMoves.forEach((move, index) => {
      const item = document.createElement("li");
      item.setAttribute("aria-label", `第 ${index + 1} 根，席位 ${move.seat.toUpperCase()}，${seatName(move.seat)}，从${pointName(move.fromId)}到${pointName(move.toId)}，第 ${move.attempts} 次尝试接通`);
      item.append(
        span(String(index + 1).padStart(2, "0"), "log-number"),
        span(move.seat.toUpperCase(), `log-seat log-seat--${move.seat}`),
        span(`${pointShort(move.fromId)} → ${pointShort(move.toId)}`, "log-route"),
        span(`尝试 ${move.attempts}`, "log-attempt"),
      );
      fragment.append(item);
    });
    elements.log.replaceChildren(fragment);
  }

  function setGhost(pointId) {
    ghostTargetId = pointId && pointId !== view.cursorId && pointById.has(pointId) ? pointId : null;
    renderGhost();
  }

  function renderGhost() {
    elements.ghostLayer.replaceChildren();
    elements.ghostLayer.dataset.seat = view.currentSeat || "a";
    if (view.phase !== "choosing" || !ghostTargetId) return;
    const from = pointById.get(view.cursorId);
    const to = pointById.get(ghostTargetId);
    if (!from || !to) return;
    elements.ghostLayer.append(svg("line", {
      class: "ghost-wire",
      x1: from.x,
      y1: from.y,
      x2: to.x,
      y2: to.y,
    }));
  }

  function spatialNeighbor(fromId, key) {
    const from = pointById.get(fromId);
    if (!from) return null;
    const candidates = [];
    for (const point of view.points) {
      if (point.id === fromId) continue;
      const dx = point.x - from.x;
      const dy = point.y - from.y;
      const primary = key === "ArrowRight" ? dx : key === "ArrowLeft" ? -dx : key === "ArrowDown" ? dy : -dy;
      if (primary <= 0) continue;
      const perpendicular = key === "ArrowRight" || key === "ArrowLeft" ? Math.abs(dy) : Math.abs(dx);
      candidates.push({
        id: point.id,
        angle: Math.atan2(perpendicular, primary),
        distance: dx * dx + dy * dy,
        order: pointOrder.get(point.id),
      });
    }
    candidates.sort((left, right) => left.angle - right.angle || left.distance - right.distance || left.order - right.order);
    return candidates[0]?.id || null;
  }

  function setRoving(pointId, focus) {
    if (!starButtons.has(pointId)) return;
    rovingId = pointId;
    for (const [id, button] of starButtons) button.tabIndex = id === pointId ? 0 : -1;
    if (focus) starButtons.get(pointId).focus({ preventScroll: true });
  }

  function scheduleFocus(request = { focus: "none" }) {
    const revision = ++focusRevision;
    globalThis.queueMicrotask(() => {
      if (revision !== focusRevision) return;
      if (request.focus === "none") return;
      if (request.focus === "cursor") {
        setRoving(view.cursorId, true);
        return;
      }
      if (request.focus === "star" && starButtons.has(request.pointId)) {
        setRoving(request.pointId, true);
        return;
      }
      if (request.focus === "complete") {
        document.querySelector("#complete-title")?.focus({ preventScroll: true });
        return;
      }
      if (request.focus === "primary") {
        document.querySelector(`[data-phase-panel="${view.phase}"] .primary-action`)?.focus({ preventScroll: true });
        return;
      }
      if (request.focus === "phase") {
        document.querySelector(`[data-phase-panel="${view.phase}"] h2`)?.focus({ preventScroll: true });
      }
    });
  }

  function announce(message) {
    if (!message) return;
    const revision = ++liveRevision;
    elements.liveStatus.textContent = "";
    globalThis.setTimeout(() => {
      if (revision === liveRevision) elements.liveStatus.textContent = message;
    }, 0);
  }

  function pointName(id) {
    return pointCopy[id]?.name || id;
  }

  function pointShort(id) {
    return pointCopy[id]?.short || id;
  }

  function seatName(seat) {
    return seatNames[seat] || "下一席";
  }

  function span(text, className) {
    const node = document.createElement("span");
    node.className = className;
    node.textContent = text;
    return node;
  }

  function svg(name, attributes) {
    const node = document.createElementNS(svgNamespace, name);
    for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, String(value));
    return node;
  }

  function probeAsset(source, readyClass) {
    const image = new Image();
    image.addEventListener("load", () => document.body.classList.add(readyClass), { once: true });
    image.addEventListener("error", () => document.body.classList.remove(readyClass), { once: true });
    image.src = source;
  }

  function probeKeepsake() {
    const markReady = () => document.body.classList.add("keepsake-image-ready");
    const markFailed = () => {
      document.body.classList.remove("keepsake-image-ready");
      elements.completionKeepsake.hidden = true;
    };
    if (elements.completionKeepsake.complete) {
      if (elements.completionKeepsake.naturalWidth > 0) markReady();
      else markFailed();
      return;
    }
    elements.completionKeepsake.addEventListener("load", markReady, { once: true });
    elements.completionKeepsake.addEventListener("error", markFailed, { once: true });
  }
})();
