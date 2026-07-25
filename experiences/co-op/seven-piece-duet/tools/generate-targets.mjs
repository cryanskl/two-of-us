#!/usr/bin/env node

import { createHash } from "node:crypto";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const geometry = require("../geometry.js");
const installedTargets = require("../targets.js");

const LIMIT = 3000;
const TRANSLATION_MIN = -4;
const TRANSLATION_MAX = 5;
const TITLES = {
  embrace: "相拥",
  "side-by-side": "并肩",
  echo: "回响",
  interlock: "相扣"
};

function pose(tx = 0, ty = 0, quarterTurns = 0, flipped = false) {
  return { tx, ty, quarterTurns, flipped };
}

function vertices(key) {
  const body = key.startsWith("q:") ? key.slice(2) : key;
  return body.split("|").map((pair) => {
    const [x, y] = pair.split(",").map(Number);
    return { x, y };
  });
}

function edgeKey(left, right) {
  const points = [left, right].sort((a, b) => (
    a.x - b.x || a.y - b.y
  ));
  return `${points[0].x},${points[0].y}>${points[1].x},${points[1].y}`;
}

function shapeBoundary(shape) {
  const counts = new Map();
  for (const key of shape) {
    const points = vertices(key);
    for (let index = 0; index < 3; index += 1) {
      const edge = edgeKey(points[index], points[(index + 1) % 3]);
      counts.set(edge, (counts.get(edge) || 0) + 1);
    }
  }
  return new Set(
    [...counts]
      .filter(([, count]) => count === 1)
      .map(([edge]) => edge)
  );
}

function hasWholeEdgeContact(left, right) {
  const leftEdges = shapeBoundary(left);
  const rightEdges = shapeBoundary(right);
  return [...leftEdges].some((edge) => rightEdges.has(edge));
}

function hasSingleCoverageBoundary(shape) {
  const counts = new Map();
  for (const key of geometry.coverageShape(shape)) {
    const points = vertices(key);
    for (let index = 0; index < 3; index += 1) {
      const edge = edgeKey(points[index], points[(index + 1) % 3]);
      counts.set(edge, (counts.get(edge) || 0) + 1);
    }
  }
  const boundary = [...counts]
    .filter(([, count]) => count === 1)
    .map(([edge]) => edge);
  const adjacency = new Map();
  for (const edge of boundary) {
    const [left, right] = edge.split(">");
    if (!adjacency.has(left)) adjacency.set(left, new Set());
    if (!adjacency.has(right)) adjacency.set(right, new Set());
    adjacency.get(left).add(right);
    adjacency.get(right).add(left);
  }
  if (
    adjacency.size === 0
    || [...adjacency.values()].some((neighbors) => neighbors.size !== 2)
  ) {
    return false;
  }
  const pending = [adjacency.keys().next().value];
  const visited = new Set();
  while (pending.length) {
    const point = pending.pop();
    if (visited.has(point)) continue;
    visited.add(point);
    pending.push(...adjacency.get(point));
  }
  return visited.size === adjacency.size;
}

function metrics(shape) {
  const points = shape.flatMap(vertices);
  const minX = Math.min(...points.map(({ x }) => x));
  const maxX = Math.max(...points.map(({ x }) => x));
  const minY = Math.min(...points.map(({ y }) => y));
  const maxY = Math.max(...points.map(({ y }) => y));
  const width = maxX - minX;
  const height = maxY - minY;
  return {
    width,
    height,
    area: width * height,
    perimeterEdges: shapeBoundary(shape).size
  };
}

function normalizedOrientations(pieceId) {
  const orientations = [];
  const flips = pieceId === "parallelogram" ? [false, true] : [false];
  for (const flipped of flips) {
    for (let quarterTurns = 0; quarterTurns < 4; quarterTurns += 1) {
      const raw = geometry.transformShape(
        geometry.getPieceTemplate(pieceId),
        pose(0, 0, quarterTurns, flipped)
      );
      const points = raw.flatMap(vertices);
      const dx = -Math.min(...points.map(({ x }) => x));
      const dy = -Math.min(...points.map(({ y }) => y));
      const shape = geometry.transformShape(raw, pose(dx, dy));
      const signature = shape.join(";");
      if (!orientations.some((entry) => entry.signature === signature)) {
        orientations.push({
          quarterTurns,
          flipped,
          dx,
          dy,
          shape,
          signature
        });
      }
    }
  }
  return orientations;
}

const ORIENTATIONS = Object.fromEntries(
  geometry.PIECE_IDS.map((pieceId) => [
    pieceId,
    normalizedOrientations(pieceId)
  ])
);

function groupsTouch(placed) {
  const fine = new Set(geometry.PIECE_GROUPS.fine);
  for (const left of placed) {
    for (const right of placed) {
      if (
        fine.has(left.id) !== fine.has(right.id)
        && hasWholeEdgeContact(left.shape, right.shape)
      ) {
        return true;
      }
    }
  }
  return false;
}

function enumerateCandidates() {
  const candidates = [];
  const fingerprints = new Set();
  const seenAtStage = Array.from(
    { length: geometry.PIECE_IDS.length },
    () => new Set()
  );
  const first = {
    id: "large-a",
    pose: pose(),
    shape: geometry.getPieceTemplate("large-a")
  };

  function search(index, placed, combinedShape) {
    if (candidates.length >= LIMIT) return;
    if (index === geometry.PIECE_IDS.length) {
      if (
        geometry.coverageShape(combinedShape).length
          !== geometry.CONSTANTS.TOTAL_COVERAGE_CELLS
        || !hasSingleCoverageBoundary(combinedShape)
        || !groupsTouch(placed)
      ) {
        return;
      }
      const fingerprint = geometry.fingerprintShape(combinedShape);
      if (fingerprints.has(fingerprint)) return;
      fingerprints.add(fingerprint);
      candidates.push({
        solution: Object.fromEntries(
          placed.map((entry) => [entry.id, entry.pose])
        ),
        cells: geometry.canonicalShape(combinedShape),
        fingerprint,
        ...metrics(combinedShape)
      });
      return;
    }

    const pieceId = geometry.PIECE_IDS[index];
    const occupied = new Set(geometry.coverageShape(combinedShape));
    for (const orientation of ORIENTATIONS[pieceId]) {
      for (let tx = TRANSLATION_MIN; tx <= TRANSLATION_MAX; tx += 1) {
        for (let ty = TRANSLATION_MIN; ty <= TRANSLATION_MAX; ty += 1) {
          const placedShape = geometry.transformShape(
            orientation.shape,
            pose(tx, ty)
          );
          if (
            geometry.coverageShape(placedShape).some((key) => occupied.has(key))
            || !hasWholeEdgeContact(placedShape, combinedShape)
          ) {
            continue;
          }
          const nextShape = geometry.canonicalShape([
            ...combinedShape,
            ...placedShape
          ]);
          const stageKey = geometry.coverageShape(nextShape).join(";");
          if (seenAtStage[index].has(stageKey)) continue;
          seenAtStage[index].add(stageKey);
          search(
            index + 1,
            [
              ...placed,
              {
                id: pieceId,
                pose: pose(
                  tx + orientation.dx,
                  ty + orientation.dy,
                  orientation.quarterTurns,
                  orientation.flipped
                ),
                shape: placedShape
              }
            ],
            nextShape
          );
          if (candidates.length >= LIMIT) return;
        }
      }
    }
  }

  search(1, [first], first.shape);
  if (candidates.length !== LIMIT) {
    throw new Error(`candidate search stopped at ${candidates.length}`);
  }
  return candidates;
}

function compareFingerprint(left, right) {
  if (left.fingerprint === right.fingerprint) return 0;
  return left.fingerprint < right.fingerprint ? -1 : 1;
}

function chooseTargets(candidates) {
  const chosen = new Set();
  function take(filter, compare) {
    const candidate = candidates
      .filter((entry) => filter(entry) && !chosen.has(entry))
      .sort(compare)[0];
    if (!candidate) throw new Error("selection rule has no candidate");
    chosen.add(candidate);
    return candidate;
  }

  const embrace = take(
    ({ area }) => area > 8,
    (left, right) => (
      left.area - right.area
      || left.perimeterEdges - right.perimeterEdges
      || compareFingerprint(left, right)
    )
  );
  const sideBySide = take(
    ({ width, height }) => width * 2 >= height * 3,
    (left, right) => (
      right.width * left.height - left.width * right.height
      || left.perimeterEdges - right.perimeterEdges
      || compareFingerprint(left, right)
    )
  );
  const echo = take(
    ({ solution }) => solution.parallelogram.flipped,
    (left, right) => (
      left.area - right.area
      || left.perimeterEdges - right.perimeterEdges
      || compareFingerprint(left, right)
    )
  );
  const interlock = take(
    () => true,
    (left, right) => (
      right.perimeterEdges - left.perimeterEdges
      || left.area - right.area
      || compareFingerprint(left, right)
    )
  );

  return [
    ["embrace", embrace],
    ["side-by-side", sideBySide],
    ["echo", echo],
    ["interlock", interlock]
  ].map(([id, candidate]) => ({
    id,
    title: TITLES[id],
    solution: candidate.solution,
    cells: candidate.cells,
    fingerprint: candidate.fingerprint
  }));
}

function generateTargets() {
  return chooseTargets(enumerateCandidates());
}

function stablePayload(targets) {
  return `${JSON.stringify(targets, null, 2)}\n`;
}

function comparable(target) {
  return {
    id: target.id,
    title: target.title,
    solution: target.solution,
    cells: target.cells,
    fingerprint: target.fingerprint
  };
}

const generated = generateTargets();
const payload = stablePayload(generated);
const digest = createHash("sha256").update(payload).digest("hex");
const mode = process.argv[2] || "--summary";

if (mode === "--emit") {
  process.stdout.write(payload);
} else if (mode === "--check") {
  const installed = installedTargets.getTargets().map(comparable);
  if (stablePayload(installed) !== payload) {
    throw new Error("targets.js differs from deterministic generator output");
  }
  const validation = installedTargets.validateAllTargets();
  if (!validation.valid) {
    throw new Error(validation.errors.join("; "));
  }
  process.stdout.write(
    `目标生成检查通过：${generated.length} 形，候选 ${LIMIT}，SHA-256 ${digest}\n`
  );
} else if (mode === "--summary") {
  process.stdout.write(
    `确定性候选 ${LIMIT}；选定 ${generated.map(({ id }) => id).join(", ")}；SHA-256 ${digest}\n`
  );
} else {
  throw new Error("usage: generate-targets.mjs [--summary|--emit|--check]");
}
