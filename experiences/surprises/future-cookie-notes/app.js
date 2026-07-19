(function () {
  "use strict";

  const configApi = globalThis.FutureCookieNotesConfig;
  const logic = globalThis.FutureCookieNotesLogic;
  const app = document.querySelector("#app");
  const liveRegion = document.querySelector("#live-region");

  if (!configApi || !logic || !app || !liveRegion) {
    document.body.textContent = "未来签加载失败，请确认 config.js、logic.js 与 app.js 都在页面旁边。";
    return;
  }

  let safeConfig;
  let state;
  let view;

  try {
    safeConfig = logic.sanitizeConfig(configApi.DEFAULT_CONFIG, configApi.composeInvitation);
    state = logic.createInitialState();
    view = logic.getFutureCookieNotesView(state, safeConfig);
  } catch (_error) {
    document.body.textContent = "未来签初始化失败，请重新打开页面。";
    return;
  }

  app.addEventListener("click", handleClick);
  watchCookieAsset();
  render();
  liveRegion.textContent = view.announcement;

  function handleClick(event) {
    const button = event.target.closest("button[data-action]");
    if (!button || !app.contains(button)) return;
    const type = button.dataset.action;
    const action = type === "OPEN_NOTE"
      ? { type, noteId: button.dataset.noteId }
      : { type };
    const previous = state;
    const next = logic.reduceFutureCookieNotes(state, action);
    if (next === previous) return;
    state = next;
    view = logic.getFutureCookieNotesView(state, safeConfig);
    render();
    liveRegion.textContent = view.announcement;
    moveFocus(type);
  }

  function render() {
    app.dataset.phase = view.phase;
    app.replaceChildren(buildHeader(), buildContent(), buildPrivacy());
  }

  function buildHeader() {
    const header = element("header", "quiet-header");
    const titleGroup = element("div", "title-group");
    titleGroup.append(
      textElement("h1", view.title, "page-title", { id: "page-title" }),
      textElement("p", view.subtitle, "subtitle"),
    );
    header.append(titleGroup, textElement("p", view.progress.text, "progress"));
    return header;
  }

  function buildContent() {
    if (view.phase === "finale") return buildFinale();
    const section = element("section", `notes-stage is-${view.phase}`);
    if (view.intro) section.append(textElement("p", view.intro, "intro-copy"));
    const grid = element("div", "notes-grid");
    view.notes.forEach((note) => grid.append(note.isOpen ? buildOpenNote(note) : buildClosedNote(note)));
    section.append(grid);
    if (view.ready) {
      const ready = element("section", "ready-action");
      ready.append(
        textElement("h2", view.ready.title, "ready-title"),
        actionButton(view.ready.actionLabel, "ASSEMBLE", "primary-button", "assemble-action"),
      );
      section.append(ready);
    }
    return section;
  }

  function buildClosedNote(note) {
    const button = actionButton(`敲开“${note.label}”`, "OPEN_NOTE", `future-note is-closed note-${note.id}`);
    button.dataset.noteId = note.id;
    button.dataset.focus = `note-${note.id}`;
    button.setAttribute("aria-label", `第 ${note.number} 枚，${note.label}，敲开`);
    button.prepend(cookieSprite("closed"), noteHeading(note));
    return button;
  }

  function buildOpenNote(note) {
    const article = element("article", `future-note is-open note-${note.id}`);
    article.setAttribute("aria-labelledby", `note-title-${note.id}`);
    const heading = noteHeading(note);
    heading.id = `note-title-${note.id}`;
    const paper = element("div", "note-paper");
    paper.append(
      textElement("p", note.body, "note-body"),
      textElement("p", "这一枚，收好了", "saved-copy"),
    );
    article.append(cookieSprite("open"), heading, paper);
    return article;
  }

  function buildFinale() {
    const section = element("section", "finale-stage");
    const letter = element("article", "final-letter");
    letter.append(
      textElement("h2", view.finale.title, "final-title", { tabindex: "-1", "data-focus": "final-title" }),
      textElement("p", view.finale.invitation, "invitation"),
    );
    const notes = element("ol", "final-notes");
    view.notes.forEach((note) => {
      const item = element("li", "final-note-row");
      item.append(
        textElement("span", twoDigits(note.number), "final-note-number"),
        textElement("span", note.label, "final-note-label"),
        textElement("span", note.body, "final-note-body"),
      );
      notes.append(item);
    });
    letter.append(
      notes,
      textElement("p", view.finale.closing, "closing"),
      textElement("p", view.finale.signature, "signature"),
      actionButton(view.finale.restartLabel, "RESTART", "secondary-button", "restart-action"),
    );
    section.append(letter);
    return section;
  }

  function noteHeading(note) {
    const heading = element("span", "note-heading");
    heading.append(
      textElement("span", twoDigits(note.number), "note-number"),
      textElement("span", note.label, "note-label"),
    );
    return heading;
  }

  function cookieSprite(stateName) {
    const wrapper = element("span", `cookie-visual is-${stateName}`);
    wrapper.setAttribute("aria-hidden", "true");
    wrapper.append(element("span", "cookie-fallback"), element("span", "cookie-sprite"));
    return wrapper;
  }

  function buildPrivacy() {
    return textElement("p", view.privacy, "privacy-copy");
  }

  function moveFocus(actionType) {
    let target = null;
    if (view.phase === "finale") target = app.querySelector('[data-focus="final-title"]');
    else if (view.phase === "ready") target = app.querySelector('[data-focus="assemble-action"]');
    else if (actionType === "RESTART") target = app.querySelector('[data-focus^="note-"]');
    else target = app.querySelector('[data-focus^="note-"]');
    if (!target) return;
    globalThis.requestAnimationFrame(() => {
      if (document.body.contains(target)) target.focus({ preventScroll: true });
    });
  }

  function actionButton(label, action, className, focusName) {
    const button = textElement("button", label, className, { type: "button", "data-action": action });
    if (focusName) button.dataset.focus = focusName;
    return button;
  }

  function element(tagName, className) {
    const node = document.createElement(tagName);
    if (className) node.className = className;
    return node;
  }

  function textElement(tagName, text, className, attributes) {
    const node = element(tagName, className);
    node.textContent = text == null ? "" : String(text);
    if (attributes) Object.entries(attributes).forEach(([name, value]) => node.setAttribute(name, value));
    return node;
  }

  function twoDigits(value) {
    return String(value).padStart(2, "0");
  }

  function watchCookieAsset() {
    const probe = new Image();
    probe.addEventListener("load", () => {
      document.body.classList.remove("cookie-asset-failed");
      document.body.classList.add("cookie-asset-ready");
    }, { once: true });
    probe.addEventListener("error", () => {
      document.body.classList.remove("cookie-asset-ready");
      document.body.classList.add("cookie-asset-failed");
    }, { once: true });
    probe.src = "./assets/future-cookie-atlas.png";
  }
})();
