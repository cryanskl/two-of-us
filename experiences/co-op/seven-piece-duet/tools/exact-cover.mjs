import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const geometry = require("../geometry.js");

function pose(tx, ty, quarterTurns, flipped) {
  return { tx, ty, quarterTurns, flipped };
}

function vertices(key) {
  return key.split("|").map((pair) => {
    const [x, y] = pair.split(",").map(Number);
    return { x, y };
  });
}

function compareRows(left, right) {
  const pieceOrder = (
    geometry.PIECE_IDS.indexOf(left.pieceId)
    - geometry.PIECE_IDS.indexOf(right.pieceId)
  );
  if (pieceOrder !== 0) return pieceOrder;
  if (left.pose.flipped !== right.pose.flipped) {
    return left.pose.flipped ? 1 : -1;
  }
  return (
    left.pose.quarterTurns - right.pose.quarterTurns
    || left.pose.tx - right.pose.tx
    || left.pose.ty - right.pose.ty
  );
}

export function enumeratePlacementRows(
  target,
  { allowParallelogramFlip = true } = {}
) {
  const targetCoverage = new Set(geometry.coverageShape(target.cells));
  const rows = [];

  for (const pieceId of geometry.PIECE_IDS) {
    const flips = pieceId === "parallelogram" && allowParallelogramFlip
      ? [false, true]
      : [false];
    for (const flipped of flips) {
      for (let quarterTurns = 0; quarterTurns < 4; quarterTurns += 1) {
        const oriented = geometry.transformShape(
          geometry.getPieceTemplate(pieceId),
          pose(0, 0, quarterTurns, flipped)
        );
        const points = oriented.flatMap(vertices);
        const minPieceX = Math.min(...points.map(({ x }) => x));
        const maxPieceX = Math.max(...points.map(({ x }) => x));
        const minPieceY = Math.min(...points.map(({ y }) => y));
        const maxPieceY = Math.max(...points.map(({ y }) => y));
        const minTx = target.board.minX - maxPieceX;
        const maxTx = target.board.maxX - minPieceX;
        const minTy = target.board.minY - maxPieceY;
        const maxTy = target.board.maxY - minPieceY;

        for (let tx = minTx; tx <= maxTx; tx += 1) {
          for (let ty = minTy; ty <= maxTy; ty += 1) {
            const placementPose = pose(tx, ty, quarterTurns, flipped);
            const shape = geometry.transformShape(
              geometry.getPieceTemplate(pieceId),
              placementPose
            );
            const coverage = geometry.coverageShape(shape);
            if (
              coverage.length === (
                geometry.getPieceTemplate(pieceId).length
                * geometry.CONSTANTS.COVERAGE_CELLS_PER_ATOM
              )
              && coverage.every((key) => targetCoverage.has(key))
            ) {
              rows.push({
                pieceId,
                pose: placementPose,
                coverage
              });
            }
          }
        }
      }
    }
  }
  return rows.sort(compareRows);
}

function rowSignature(row) {
  const { tx, ty, quarterTurns, flipped } = row.pose;
  return `${row.pieceId}|${flipped ? 1 : 0}|${quarterTurns}|${tx}|${ty}`;
}

function samePose(left, right) {
  return (
    left.tx === right.tx
    && left.ty === right.ty
    && left.quarterTurns === right.quarterTurns
    && left.flipped === right.flipped
  );
}

export function frozenSolutionRows(target, rows) {
  const selected = [];
  for (const pieceId of geometry.PIECE_IDS) {
    const row = rows.find((candidate) => (
      candidate.pieceId === pieceId
      && samePose(candidate.pose, target.solution[pieceId])
    ));
    if (!row) return null;
    selected.push(row);
  }
  const coverage = geometry.unionShapes(
    selected.map(({ pieceId, pose: placementPose }) => (
      geometry.transformShape(
        geometry.getPieceTemplate(pieceId),
        placementPose
      )
    ))
  );
  const targetCoverage = geometry.coverageShape(target.cells);
  if (
    coverage.length !== targetCoverage.length
    || coverage.some((key, index) => key !== targetCoverage[index])
  ) return null;
  return selected;
}

export function findExactCover(
  target,
  { allowParallelogramFlip = true } = {}
) {
  const rows = enumeratePlacementRows(target, { allowParallelogramFlip });
  const coverageColumns = geometry.coverageShape(target.cells);
  const columns = [
    ...geometry.PIECE_IDS.map((pieceId) => `piece:${pieceId}`),
    ...coverageColumns
  ];
  const rowsByColumn = new Map(columns.map((column) => [column, []]));
  for (const row of rows) {
    rowsByColumn.get(`piece:${row.pieceId}`).push(row);
    for (const key of row.coverage) rowsByColumn.get(key).push(row);
  }

  function search(usedPieces, occupied, selected) {
    if (selected.length === geometry.PIECE_IDS.length) {
      return occupied.size === geometry.CONSTANTS.TOTAL_COVERAGE_CELLS
        ? selected
        : null;
    }
    let candidates = null;
    for (const column of columns) {
      const pieceColumn = column.startsWith("piece:");
      const covered = pieceColumn
        ? usedPieces.has(column.slice(6))
        : occupied.has(column);
      if (covered) continue;
      const available = rowsByColumn.get(column).filter((row) => (
        !usedPieces.has(row.pieceId)
        && row.coverage.every((key) => !occupied.has(key))
      ));
      if (candidates === null || available.length < candidates.length) {
        candidates = available;
        if (available.length === 0) break;
      }
    }
    for (const row of candidates || []) {
      const nextPieces = new Set(usedPieces);
      nextPieces.add(row.pieceId);
      const nextOccupied = new Set(occupied);
      for (const key of row.coverage) nextOccupied.add(key);
      const solution = search(
        nextPieces,
        nextOccupied,
        [...selected, row]
      );
      if (solution) return solution;
    }
    return null;
  }

  const solution = search(new Set(), new Set(), []);
  return solution && solution
    .slice()
    .sort(compareRows)
    .map((row) => ({
      pieceId: row.pieceId,
      pose: { ...row.pose },
      coverage: [...row.coverage],
      signature: rowSignature(row)
    }));
}

export function verifyTargetExactCover(target) {
  const rows = enumeratePlacementRows(target);
  const frozenRows = frozenSolutionRows(target, rows);
  const solution = findExactCover(target);
  return {
    valid: Boolean(frozenRows && solution),
    rowCount: rows.length,
    frozenSolutionPresent: Boolean(frozenRows),
    solution
  };
}
