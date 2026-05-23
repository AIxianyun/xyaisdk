/**
 * XYAI SDK Utilities
 */

function generateRequestId(): string {
  return `sdk_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`;
}

function deepMerge<T extends Record<string, unknown>>(target: T, ...sources: Partial<T>[]): T {
  for (const source of sources) {
    for (const key in source) {
      if (source[key] === undefined) continue;
      if (
        source[key] &&
        typeof source[key] === 'object' &&
        !Array.isArray(source[key]) &&
        target[key] &&
        typeof target[key] === 'object' &&
        !Array.isArray(target[key])
      ) {
        (target as Record<string, unknown>)[key] = deepMerge(
          target[key] as Record<string, unknown>,
          source[key] as Record<string, unknown>
        );
      } else {
        (target as Record<string, unknown>)[key] = source[key] as T[Extract<keyof T, string>];
      }
    }
  }
  return target;
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function safeJsonParse<T>(str: string, fallback: T): T {
  try {
    return JSON.parse(str) as T;
  } catch {
    return fallback;
  }
}

function isNode(): boolean {
  return typeof process !== 'undefined' && process.versions?.node != null;
}

function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

export { generateRequestId, deepMerge, delay, safeJsonParse, isNode, isBrowser };
