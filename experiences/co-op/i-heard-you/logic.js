export const prompts = Object.freeze([
  "说一句，想让对方认真听见的话",
  "说一句，你一直记得、却很少说出口的话",
]);

export function createSession() {
  return freeze({
    phase: "intro",
    roundIndex: 0,
    draft: "",
    confirmed: ["", ""],
    error: null,
  });
}

export function advance(session, action) {
  if (!isSession(session) || !action || typeof action.type !== "string") return createSession();
  switch (action.type) {
    case "BEGIN":
      return session.phase === "intro" ? update(session, { phase: "ready", error: null }) : session;
    case "START_RECORDING":
      return session.phase === "ready" ? update(session, { phase: "recording", draft: "", error: null }) : session;
    case "STOP_RECORDING":
      return session.phase === "recording" ? update(session, { phase: "transcribing" }) : session;
    case "TRANSCRIBED": {
      if (session.phase !== "transcribing") return session;
      const draft = normalizeText(action.text);
      return draft ? update(session, { phase: "review", draft }) : update(session, {
        phase: "ready",
        error: "没有听清这句话，请靠近一点再说一次。",
      });
    }
    case "EDIT_DRAFT":
      return session.phase === "review" ? update(session, { draft: normalizeText(action.text, false) }) : session;
    case "RETRY":
      return session.phase === "review" || session.phase === "error"
        ? update(session, { phase: "ready", draft: "", error: null })
        : session;
    case "CONFIRM": {
      if (session.phase !== "review") return session;
      const text = normalizeText(session.draft);
      if (!text) return update(session, { error: "先留下一句话，再交给对方。" });
      const confirmed = [...session.confirmed];
      confirmed[session.roundIndex] = text;
      return session.roundIndex === 0
        ? freeze({ ...session, phase: "handoff", roundIndex: 1, draft: "", confirmed, error: null })
        : freeze({ ...session, phase: "complete", draft: "", confirmed, error: null });
    }
    case "ACCEPT_HANDOFF":
      return session.phase === "handoff" ? update(session, { phase: "ready" }) : session;
    case "FAIL":
      return ["recording", "transcribing"].includes(session.phase)
        ? update(session, { phase: "error", draft: "", error: normalizeError(action.message) })
        : session;
    default:
      return session;
  }
}

function update(session, patch) {
  return freeze({ ...session, ...patch });
}

function normalizeText(value, trim = true) {
  if (typeof value !== "string") return "";
  const limited = value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").slice(0, 200);
  return trim ? limited.trim() : limited;
}

function normalizeError(value) {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, 160) : "本机语音处理失败，请再试一次。";
}

function isSession(value) {
  return value && typeof value === "object" && typeof value.phase === "string"
    && (value.roundIndex === 0 || value.roundIndex === 1) && Array.isArray(value.confirmed);
}

function freeze(value) {
  value.confirmed = Object.freeze([...value.confirmed]);
  return Object.freeze(value);
}
