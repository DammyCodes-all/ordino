import type { InternalRenderResult } from "../contracts/rendering";

type CacheEntry = {
  render: InternalRenderResult;
  createdAt: number;
};

const CACHE = new Map<string, CacheEntry>();
const MAX_ENTRIES = 50;

export function getCachedRender(key: string): InternalRenderResult | null {
  const e = CACHE.get(key);
  return e ? e.render : null;
}

export function setCachedRender(key: string, render: InternalRenderResult) {
  if (CACHE.size >= MAX_ENTRIES) {
    // evict oldest
    let oldestKey: string | null = null;
    let oldest = Infinity;
    for (const [k, v] of CACHE.entries()) {
      if (v.createdAt < oldest) {
        oldest = v.createdAt;
        oldestKey = k;
      }
    }
    if (oldestKey) CACHE.delete(oldestKey);
  }
  CACHE.set(key, { render, createdAt: Date.now() });
}

export default { getCachedRender, setCachedRender };
