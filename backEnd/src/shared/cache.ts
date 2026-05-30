import NodeCache from 'node-cache';

const cache = new NodeCache({
  stdTTL: 900,           // 15 minutes default
  checkperiod: 120,      // cleanup every 2 minutes
  useClones: false,
});

export async function getOrSet<T>(
  key: string,
  ttlSeconds: number,
  fetchFn: () => Promise<T>,
): Promise<T> {
  const cached = cache.get<T>(key);
  if (cached !== undefined) {
    return cached;
  }
  const data = await fetchFn();
  cache.set(key, data, ttlSeconds);
  return data;
}

export function invalidate(key: string): void {
  cache.del(key);
}

export function flushAll(): void {
  cache.flushAll();
}

export default cache;
