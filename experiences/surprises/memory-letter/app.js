(function () {
  "use strict";

  const config = window.MEMORY_LETTER_CONFIG;
  if (!config || !Array.isArray(config.memories) || config.memories.length === 0) {
    document.body.textContent = "配置缺失：请检查 config.js。";
    return;
  }

  const elements = {
    intro: document.querySelector("#intro"),
    letter: document.querySelector("#letter"),
    finale: document.querySelector("#finale"),
    recipient: document.querySelector("#recipient"),
    opening: document.querySelector("#opening"),
    symbol: document.querySelector("#memory-symbol"),
    date: document.querySelector("#memory-date"),
    title: document.querySelector("#memory-title"),
    text: document.querySelector("#memory-text"),
    progress: document.querySelector("#progress"),
    next: document.querySelector("#next-memory"),
    closing: document.querySelector("#closing"),
    invitation: document.querySelector("#invitation"),
    accept: document.querySelector("#accept"),
    signature: document.querySelector("#signature"),
    celebration: document.querySelector("#celebration"),
  };

  let memoryIndex = 0;

  function showOnly(section) {
    [elements.intro, elements.letter, elements.finale].forEach((node) => {
      node.classList.toggle("hidden", node !== section);
    });
  }

  function renderMemory() {
    const memory = config.memories[memoryIndex];
    elements.symbol.textContent = memory.symbol || "♡";
    elements.date.textContent = memory.date;
    elements.title.textContent = memory.title;
    elements.text.textContent = memory.text;
    elements.progress.replaceChildren(
      ...config.memories.map((_, index) => {
        const bar = document.createElement("span");
        bar.classList.toggle("active", index <= memoryIndex);
        return bar;
      }),
    );
    elements.next.textContent = memoryIndex === config.memories.length - 1 ? "读到信的最后" : "继续往下读";
  }

  function openLetter() {
    memoryIndex = 0;
    elements.recipient.textContent = config.recipient;
    elements.opening.textContent = config.opening;
    renderMemory();
    showOnly(elements.letter);
    elements.next.focus();
  }

  function nextMemory() {
    if (memoryIndex < config.memories.length - 1) {
      memoryIndex += 1;
      renderMemory();
      return;
    }
    elements.closing.textContent = config.closing;
    elements.invitation.textContent = config.invitation;
    elements.accept.textContent = config.acceptText;
    elements.signature.textContent = `— ${config.sender}`;
    showOnly(elements.finale);
    elements.accept.focus();
  }

  function celebrate() {
    elements.accept.textContent = "那就说定啦 ♡";
    for (let index = 0; index < 28; index += 1) {
      const heart = document.createElement("span");
      heart.className = "heart";
      heart.textContent = index % 3 === 0 ? "✦" : "♥";
      heart.style.left = `${Math.random() * 100}%`;
      heart.style.fontSize = `${14 + Math.random() * 24}px`;
      heart.style.animationDelay = `${Math.random() * 0.7}s`;
      elements.celebration.append(heart);
      window.setTimeout(() => heart.remove(), 3400);
    }
  }

  document.querySelector("#open-letter").addEventListener("click", openLetter);
  elements.next.addEventListener("click", nextMemory);
  elements.accept.addEventListener("click", celebrate);
  document.querySelector("#replay").addEventListener("click", openLetter);
})();
