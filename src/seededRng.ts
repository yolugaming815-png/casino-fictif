export function mulberry32(seed: number): () => number {
  let state = seed >>> 0;

  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashSeed(...parts: Array<number | string>): number {
  let h = 1779033703 ^ parts.length;

  for (const part of parts) {
    const text = `${typeof part}:${String(part)}`;
    for (let index = 0; index < text.length; index += 1) {
      h = Math.imul(h ^ text.charCodeAt(index), 3432918353);
      h = (h << 13) | (h >>> 19);
    }
  }

  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  return (h ^ (h >>> 16)) >>> 0;
}

export function deriveRng(seed: number, roundIndex: number): () => number {
  return mulberry32(hashSeed(seed, roundIndex));
}
