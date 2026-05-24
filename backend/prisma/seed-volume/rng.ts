export function createRng(seed: number) {
  let state = seed >>> 0;

  const next = () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 0x100000000;
  };

  return {
    next,
    int(min: number, max: number) {
      return Math.floor(next() * (max - min + 1)) + min;
    },
    pick<T>(items: T[]): T {
      return items[Math.min(items.length - 1, Math.floor(next() * items.length))];
    },
    amount(min: number, max: number) {
      return Math.round((min + next() * (max - min)) * 100) / 100;
    },
  };
}
