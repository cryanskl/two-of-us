(function () {
  "use strict";

  const logic = window.PHOTO_SWAP_PUZZLE_LOGIC;
  const GRID_SIZE = 3;
  const TILE_COUNT = GRID_SIZE * GRID_SIZE;
  const elements = {
    chooseLabel: document.querySelector("#choose-label"),
    input: document.querySelector("#photo-input"),
    status: document.querySelector("#status"),
    empty: document.querySelector("#empty-stage"),
    puzzle: document.querySelector("#puzzle-stage"),
    completion: document.querySelector("#completion"),
    completedPhoto: document.querySelector("#completed-photo"),
    moves: document.querySelector("#moves"),
    toolbar: document.querySelector("#game-toolbar"),
    shuffle: document.querySelector("#shuffle-button"),
    replace: document.querySelector("#replace-button"),
    clear: document.querySelector("#clear-button"),
    tiles: Array.from(document.querySelectorAll(".tile")),
  };

  let operationToken = 0;
  let activePhotoUrl = null;
  let puzzleState = null;
  const originalUrls = new Set();

  bindControls();
  bindCleanup();
  renderEmpty();

  if (!logic || !window.crypto || typeof window.crypto.getRandomValues !== "function") {
    elements.input.disabled = true;
    showStatus("当前浏览器缺少生成安全随机排列所需的能力。", true);
  }

  function bindControls() {
    elements.input.addEventListener("change", handleFileChange);
    elements.replace.addEventListener("click", () => elements.input.click());
    elements.shuffle.addEventListener("click", reshuffle);
    elements.clear.addEventListener("click", clearPhoto);
    for (const tile of elements.tiles) tile.addEventListener("click", handleTileClick);
  }

  function handleFileChange(event) {
    const file = event.target.files && event.target.files[0];
    event.target.value = "";
    if (file) preparePhoto(file);
  }

  async function preparePhoto(file) {
    const token = ++operationToken;
    releaseAllOriginals();
    const metadata = logic.validateFileMetadata({ type: file.type, size: file.size });
    announce("正在本地检查照片…");
    if (!metadata.ok) {
      showCandidateError(metadata.message);
      return;
    }

    const originalUrl = URL.createObjectURL(file);
    originalUrls.add(originalUrl);
    let image;
    try {
      image = await decodeImage(originalUrl);
    } catch {
      releaseOriginal(originalUrl);
      if (token === operationToken) showCandidateError("浏览器无法解码这张照片，请确认文件没有损坏。");
      return;
    }

    if (token !== operationToken) {
      releaseOriginal(originalUrl);
      return;
    }

    const dimensions = logic.assessImageDimensions({ width: image.naturalWidth, height: image.naturalHeight });
    if (!dimensions.ok) {
      releaseOriginal(originalUrl);
      showCandidateError(dimensions.message);
      return;
    }

    let derivedBlob;
    try {
      derivedBlob = await createSquareJpeg(image, dimensions.width, dimensions.height);
    } catch {
      releaseOriginal(originalUrl);
      if (token === operationToken) showCandidateError("无法生成拼图照片，请换一张照片重试。");
      return;
    }
    releaseOriginal(originalUrl);

    if (token !== operationToken) return;
    const derivedUrl = URL.createObjectURL(derivedBlob);
    if (token !== operationToken) {
      URL.revokeObjectURL(derivedUrl);
      return;
    }
    commitPhoto(derivedUrl);
  }

  function decodeImage(url) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.decoding = "async";
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("decode-failed"));
      image.src = url;
    });
  }

  function createSquareJpeg(image, width, height) {
    return new Promise((resolve, reject) => {
      const cropSize = Math.min(width, height);
      const outputSize = Math.min(1200, cropSize);
      const sourceX = (width - cropSize) / 2;
      const sourceY = (height - cropSize) / 2;
      const canvas = document.createElement("canvas");
      canvas.width = outputSize;
      canvas.height = outputSize;
      const context = canvas.getContext("2d");
      if (!context) {
        reject(new Error("canvas-unavailable"));
        return;
      }
      context.fillStyle = "#211820";
      context.fillRect(0, 0, outputSize, outputSize);
      context.drawImage(image, sourceX, sourceY, cropSize, cropSize, 0, 0, outputSize, outputSize);
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error("blob-failed"));
      }, "image/jpeg", 0.9);
    });
  }

  function commitPhoto(url) {
    releaseActivePhoto();
    activePhotoUrl = url;
    puzzleState = logic.createPuzzleState(createRandomOrder());
    elements.completedPhoto.src = url;
    renderPuzzle();
    announce("照片已经在当前页面中生成拼图。");
  }

  function createRandomOrder() {
    const values = new Uint32Array(TILE_COUNT - 1);
    window.crypto.getRandomValues(values);
    return logic.createShuffledOrder(TILE_COUNT, Array.from(values, (value) => value / 4294967296));
  }

  function handleTileClick(event) {
    if (!puzzleState || puzzleState.solved) return;
    const previousSelection = puzzleState.selectedPosition;
    const position = Number(event.currentTarget.dataset.position);
    const nextState = logic.selectPosition(puzzleState, position);
    if (nextState === puzzleState) return;
    puzzleState = nextState;
    renderPuzzle();
    if (puzzleState.solved) announce("拼回来了。原来这一刻一直都在。");
    else if (puzzleState.selectedPosition !== null) announce(`已选中第 ${position + 1} 块，请再选一块交换。`);
    else if (previousSelection === position) announce("已取消选择。");
    else announce(`已完成第 ${puzzleState.moves} 次交换。`);
  }

  function reshuffle() {
    if (!activePhotoUrl) return;
    puzzleState = logic.createPuzzleState(createRandomOrder());
    renderPuzzle();
    announce("照片已经重新打乱。");
  }

  function renderPuzzle() {
    if (!activePhotoUrl || !puzzleState) {
      renderEmpty();
      return;
    }
    const solved = puzzleState.solved;
    elements.empty.hidden = true;
    elements.puzzle.hidden = solved;
    elements.completion.hidden = !solved;
    elements.chooseLabel.hidden = true;
    elements.toolbar.hidden = false;
    elements.moves.textContent = `第 ${puzzleState.moves} 次交换`;
    elements.shuffle.disabled = false;
    elements.replace.disabled = false;
    elements.clear.disabled = false;

    elements.tiles.forEach((tile, position) => {
      const tileIndex = puzzleState.order[position];
      const target = logic.getTileCoordinates(tileIndex, GRID_SIZE);
      const current = logic.getTileCoordinates(position, GRID_SIZE);
      tile.dataset.tileIndex = String(tileIndex);
      tile.style.backgroundImage = `url("${activePhotoUrl}")`;
      tile.style.backgroundPosition = `${target.column * 50}% ${target.row * 50}%`;
      tile.classList.toggle("is-selected", puzzleState.selectedPosition === position);
      tile.setAttribute("aria-pressed", String(puzzleState.selectedPosition === position));
      tile.setAttribute("aria-label", `原图第 ${target.row + 1} 行第 ${target.column + 1} 列的拼块，当前在第 ${current.row + 1} 行第 ${current.column + 1} 列`);
      tile.disabled = solved;
    });
  }

  function renderEmpty() {
    puzzleState = null;
    elements.empty.hidden = false;
    elements.puzzle.hidden = true;
    elements.completion.hidden = true;
    elements.chooseLabel.hidden = false;
    elements.toolbar.hidden = true;
    elements.moves.textContent = "第 0 次交换";
    elements.shuffle.disabled = true;
    elements.replace.disabled = true;
    elements.clear.disabled = true;
    elements.completedPhoto.removeAttribute("src");
    for (const tile of elements.tiles) {
      tile.style.backgroundImage = "none";
      tile.classList.remove("is-selected");
      tile.setAttribute("aria-pressed", "false");
      tile.disabled = true;
    }
  }

  function clearPhoto() {
    operationToken += 1;
    releaseAllOriginals();
    releaseActivePhoto();
    renderEmpty();
    announce("照片已经从当前页面清除。");
  }

  function releaseActivePhoto() {
    const url = activePhotoUrl;
    activePhotoUrl = null;
    elements.completedPhoto.removeAttribute("src");
    for (const tile of elements.tiles) tile.style.backgroundImage = "none";
    if (url) URL.revokeObjectURL(url);
  }

  function releaseOriginal(url) {
    originalUrls.delete(url);
    URL.revokeObjectURL(url);
  }

  function releaseAllOriginals() {
    for (const url of originalUrls) URL.revokeObjectURL(url);
    originalUrls.clear();
  }

  function showCandidateError(message) {
    showStatus(`${message}${activePhotoUrl ? " 当前拼图已保留。" : ""}`, true);
  }

  function announce(message) {
    showStatus(message, false);
  }

  function showStatus(message, visible) {
    elements.status.textContent = message;
    elements.status.className = visible ? "status is-visible" : "status visually-hidden";
  }

  function bindCleanup() {
    const cleanup = () => {
      operationToken += 1;
      releaseAllOriginals();
      releaseActivePhoto();
      renderEmpty();
    };
    window.addEventListener("pagehide", cleanup);
    window.addEventListener("beforeunload", cleanup);
  }
})();
