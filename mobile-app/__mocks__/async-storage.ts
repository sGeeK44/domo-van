// @react-native-async-storage/async-storage reaches for its native module at
// import time, which only exists inside the app. Tests resolve it here through
// vitest.config.ts.

export const __store = new Map<string, string>();

async function multiGet(
  keys: readonly string[],
): Promise<[string, string | null][]> {
  return keys.map((key) => [key, __store.get(key) ?? null]);
}

async function multiSet(pairs: readonly [string, string][]): Promise<void> {
  for (const [key, value] of pairs) __store.set(key, value);
}

export default { multiGet, multiSet };
