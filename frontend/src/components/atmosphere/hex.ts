/** A tiny seeded generator (LCG), so the decorative hex columns are identical on every render. */
function lcg(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0
    return state / 2 ** 32
  }
}

/** `count` lines of two hexadecimal bytes, such as `4F A3`. Texture only; it encodes nothing. */
export function hexLines(count: number, seed: number): string[] {
  const next = lcg(seed)
  const byte = () =>
    Math.floor(next() * 256)
      .toString(16)
      .toUpperCase()
      .padStart(2, '0')
  return Array.from({ length: count }, () => `${byte()} ${byte()}`)
}
