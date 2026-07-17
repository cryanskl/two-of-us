(function () {
  "use strict";

  const logic = window.FUTURE_TICKET_LOGIC;
  const config = logic.sanitizeConfig(window.FUTURE_TICKET_CONFIG);
  const app = document.querySelector("#app");
  const fields = [...document.querySelectorAll("[data-field]")];
  const serials = [...document.querySelectorAll("[data-serial]")];
  const passenger = document.querySelector("[data-passenger]");
  const issuer = document.querySelector("[data-issuer]");
  const prompt = document.querySelector("[data-prompt]");
  const finalNote = document.querySelector("[data-final-note]");
  const holes = [...document.querySelectorAll("[data-hole]")];
  const holesGroup = document.querySelector(".holes");
  const primary = document.querySelector("[data-action]");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  let state = logic.createInitialState();
  let punchTimer = null;

  serials.forEach((node) => { node.textContent = config.serial; });
  passenger.textContent = config.passenger;
  issuer.textContent = config.issuer;

  holes.forEach((button, index) => {
    button.addEventListener("click", () => choose(index));
  });

  primary.addEventListener("click", () => {
    if (state.phase === "intro") {
      state = logic.start(state);
      render(true);
      return;
    }
    if (state.phase === "choosing") {
      punchCurrent();
      return;
    }
    if (state.phase === "complete") {
      clearPunchTimer();
      state = logic.restart(state);
      render(true);
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.repeat || state.phase !== "choosing") return;
    const index = ["1", "2", "3"].indexOf(event.key);
    if (index >= 0) {
      event.preventDefault();
      choose(index);
      return;
    }
    if (event.key === "Enter" && state.selection !== null) {
      event.preventDefault();
      punchCurrent();
    }
  });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden && state.phase === "punching") settlePunch();
  });
  window.addEventListener("pagehide", clearPunchTimer);

  function choose(index) {
    const next = logic.selectHole(state, index);
    if (next === state) return;
    state = next;
    render(false);
    primary.focus({ preventScroll: true });
  }

  function punchCurrent() {
    if (state.phase !== "choosing" || state.selection === null) return;
    const option = config.groups[state.step].options[state.selection];
    const next = logic.punch(state, option);
    if (next === state) return;
    state = next;
    render(false);
    clearPunchTimer();
    punchTimer = window.setTimeout(settlePunch, reducedMotion.matches ? 30 : 520);
  }

  function settlePunch() {
    clearPunchTimer();
    if (state.phase !== "punching") return;
    state = logic.finishPunch(state);
    render(true);
  }

  function clearPunchTimer() {
    if (punchTimer !== null) window.clearTimeout(punchTimer);
    punchTimer = null;
  }

  function render(shouldFocus) {
    app.dataset.phase = state.phase;
    app.classList.toggle("is-punching", state.phase === "punching");
    app.classList.toggle("is-complete", state.phase === "complete");

    fields.forEach((field, index) => {
      const value = state.reveals[index];
      field.classList.toggle("is-punched", value !== null);
      field.querySelector("p").textContent = value ?? "尚未打孔";
    });

    const complete = state.phase === "complete";
    const currentGroup = config.groups[Math.min(state.step, 2)];
    prompt.textContent = complete ? "车票已签发" : currentGroup.prompt;
    finalNote.hidden = !complete;
    finalNote.textContent = complete ? config.finalNote : "";
    holesGroup.hidden = complete;

    holes.forEach((button, index) => {
      const selected = state.selection === index;
      button.disabled = state.phase !== "choosing";
      button.setAttribute("aria-checked", String(selected));
      button.classList.toggle("is-selected", selected);
    });

    if (state.phase === "intro") {
      primary.textContent = "开始打孔";
      primary.dataset.action = "start";
      primary.disabled = false;
    } else if (state.phase === "choosing") {
      primary.textContent = "打下这一孔";
      primary.dataset.action = "punch";
      primary.disabled = state.selection === null;
    } else if (state.phase === "punching") {
      primary.textContent = "打下这一孔";
      primary.dataset.action = "punch";
      primary.disabled = true;
    } else {
      primary.textContent = "重新组合";
      primary.dataset.action = "restart";
      primary.disabled = false;
    }

    if (shouldFocus) primary.focus({ preventScroll: true });
  }

  render(false);
})();
