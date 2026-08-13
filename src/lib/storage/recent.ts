import type { GongfuVessel } from '../brewing/types';
import { RECENT_VERSION, STORAGE_KEYS } from './keys';
import { getLocalStorage, readJson, writeJson } from './safe';

export interface RecentTea {
  teaId: string;
  slug: string;
  name: string;
  vessel?: GongfuVessel;
  volumeMl: number;
  usedAt: number;
}

interface RecentStore {
  version: number;
  items: RecentTea[];
}

const MAX_RECENT = 6;

export function loadRecent(storage: Storage | null = getLocalStorage()): RecentTea[] {
  if (!storage) return [];
  const parsed = readJson<RecentStore>(storage.getItem(STORAGE_KEYS.recent));
  if (!parsed || parsed.version !== RECENT_VERSION || !Array.isArray(parsed.items)) return [];
  return parsed.items.slice(0, MAX_RECENT);
}

export function pushRecent(item: Omit<RecentTea, 'usedAt'>, storage: Storage | null = getLocalStorage()): RecentTea[] {
  const now = Date.now();
  const next = [
    { ...item, usedAt: now },
    ...loadRecent(storage).filter((entry) => entry.teaId !== item.teaId),
  ].slice(0, MAX_RECENT);
  if (storage) {
    writeJson(storage, STORAGE_KEYS.recent, { version: RECENT_VERSION, items: next } satisfies RecentStore);
  }
  return next;
}
