export const TARGET_SAMPLE_RATE = 16_000;
export const MAX_RECORDING_SECONDS = 12;

export function mergeChunks(chunks) {
  if (!Array.isArray(chunks) || chunks.length === 0) return new Float32Array();
  const valid = chunks.filter((chunk) => chunk instanceof Float32Array && chunk.length > 0);
  const total = valid.reduce((sum, chunk) => sum + chunk.length, 0);
  const merged = new Float32Array(total);
  let offset = 0;
  for (const chunk of valid) {
    merged.set(chunk, offset);
    offset += chunk.length;
  }
  return merged;
}

export function resampleTo16k(input, sourceRate) {
  if (!(input instanceof Float32Array) || input.length === 0) return new Float32Array();
  if (!Number.isFinite(sourceRate) || sourceRate <= 0) throw new TypeError("sourceRate must be positive");
  if (sourceRate === TARGET_SAMPLE_RATE) return input.slice();

  const outputLength = Math.min(
    Math.round(input.length * TARGET_SAMPLE_RATE / sourceRate),
    TARGET_SAMPLE_RATE * MAX_RECORDING_SECONDS,
  );
  const output = new Float32Array(outputLength);
  const ratio = sourceRate / TARGET_SAMPLE_RATE;
  for (let index = 0; index < outputLength; index += 1) {
    const start = index * ratio;
    const end = Math.min((index + 1) * ratio, input.length);
    const first = Math.floor(start);
    const last = Math.max(first + 1, Math.ceil(end));
    let sum = 0;
    let weight = 0;
    for (let source = first; source < last && source < input.length; source += 1) {
      const overlap = Math.max(0, Math.min(end, source + 1) - Math.max(start, source));
      sum += input[source] * overlap;
      weight += overlap;
    }
    output[index] = weight > 0 ? sum / weight : 0;
  }
  return output;
}

export function recordingLevel(chunk) {
  if (!(chunk instanceof Float32Array) || chunk.length === 0) return 0;
  let squareSum = 0;
  for (const sample of chunk) squareSum += sample * sample;
  return Math.min(1, Math.sqrt(squareSum / chunk.length) * 4);
}
