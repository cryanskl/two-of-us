(function (root, factory) {
  "use strict";
  root.PHOTO_SWAP_PUZZLE_LOGIC = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const MAX_FILE_SIZE = 20 * 1024 * 1024;
  const MIN_SHORT_SIDE = 600;
  const MAX_SIDE = 6000;
  const ALLOWED_TYPES = Object.freeze(["image/jpeg", "image/png", "image/webp"]);

  function response(ok, code, message, extras) {
    return Object.assign({ ok, code, message }, extras || {});
  }

  function validateFileMetadata(metadata) {
    const input = metadata && typeof metadata === "object" ? metadata : {};
    const type = String(input.type || "").trim().toLowerCase();
    const size = Number(input.size);
    if (!ALLOWED_TYPES.includes(type)) {
      return response(false, "unsupported-type", "请选择 JPEG、PNG 或 WebP 格式的照片。");
    }
    if (!Number.isFinite(size) || size < 0) {
      return response(false, "invalid-file-size", "无法读取照片大小，请换一张重试。");
    }
    if (size === 0) return response(false, "empty-file", "这张照片是空文件，请换一张重试。");
    if (size > MAX_FILE_SIZE) return response(false, "file-too-large", "照片超过 20 MiB，请先在本地缩小。");
    return response(true, "ok", "照片格式和大小符合要求。", { type, size });
  }

  function assessImageDimensions(dimensions) {
    const input = dimensions && typeof dimensions === "object" ? dimensions : {};
    const width = Number(input.width);
    const height = Number(input.height);
    if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0) {
      return response(false, "invalid-dimensions", "无法读取有效的照片尺寸。");
    }
    if (Math.max(width, height) > MAX_SIDE) {
      return response(false, "image-too-large", "照片任一边不能超过 6000px，请先在本地缩小。", { width, height });
    }
    if (Math.min(width, height) < MIN_SHORT_SIDE) {
      return response(false, "image-too-small", "照片短边至少需要 600px。", { width, height });
    }
    return response(true, "ok", "照片尺寸符合要求。", { width, height });
  }

  function isSolved(order) {
    return Array.isArray(order) && order.length > 0 && order.every((tileIndex, position) => tileIndex === position);
  }

  function isPermutation(order) {
    if (!Array.isArray(order) || order.length < 2) return false;
    return new Set(order).size === order.length
      && order.every((value) => Number.isInteger(value) && value >= 0 && value < order.length);
  }

  function createShuffledOrder(itemCount, unitValues) {
    const count = Number(itemCount);
    if (!Number.isInteger(count) || count < 2) throw new RangeError("itemCount must be an integer of at least 2");
    if (!Array.isArray(unitValues) && !ArrayBuffer.isView(unitValues)) {
      throw new TypeError("unitValues must be an array-like collection");
    }
    if (unitValues.length < count - 1) throw new RangeError("not enough random values");

    const order = Array.from({ length: count }, (_, index) => index);
    let randomIndex = 0;
    for (let position = count - 1; position > 0; position -= 1) {
      const unitValue = Number(unitValues[randomIndex]);
      randomIndex += 1;
      if (!Number.isFinite(unitValue) || unitValue < 0 || unitValue >= 1) {
        throw new RangeError("random values must be in [0, 1)");
      }
      const swapPosition = Math.floor(unitValue * (position + 1));
      [order[position], order[swapPosition]] = [order[swapPosition], order[position]];
    }
    if (isSolved(order)) order.push(order.shift());
    return order;
  }

  function createPuzzleState(order) {
    if (!isPermutation(order)) throw new TypeError("order must be a complete permutation");
    const copiedOrder = order.slice();
    return {
      order: copiedOrder,
      selectedPosition: null,
      moves: 0,
      solved: isSolved(copiedOrder),
    };
  }

  function selectPosition(state, position) {
    if (!state || !isPermutation(state.order) || state.solved) return state;
    const nextPosition = Number(position);
    if (!Number.isInteger(nextPosition) || nextPosition < 0 || nextPosition >= state.order.length) return state;

    if (state.selectedPosition === null) {
      return Object.assign({}, state, { selectedPosition: nextPosition });
    }
    if (state.selectedPosition === nextPosition) {
      return Object.assign({}, state, { selectedPosition: null });
    }

    const order = state.order.slice();
    [order[state.selectedPosition], order[nextPosition]] = [order[nextPosition], order[state.selectedPosition]];
    return {
      order,
      selectedPosition: null,
      moves: state.moves + 1,
      solved: isSolved(order),
    };
  }

  function getTileCoordinates(tileIndex, gridSize) {
    const tile = Number(tileIndex);
    const size = Number(gridSize);
    if (!Number.isInteger(size) || size < 1 || !Number.isInteger(tile) || tile < 0 || tile >= size * size) return null;
    return { row: Math.floor(tile / size), column: tile % size };
  }

  return Object.freeze({
    MAX_FILE_SIZE,
    MIN_SHORT_SIDE,
    MAX_SIDE,
    ALLOWED_TYPES,
    validateFileMetadata,
    assessImageDimensions,
    createShuffledOrder,
    createPuzzleState,
    selectPosition,
    isSolved,
    getTileCoordinates,
  });
});
