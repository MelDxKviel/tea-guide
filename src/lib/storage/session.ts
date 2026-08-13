import { SESSION_VERSION, type BrewSession } from '../brewing/types';
import { STORAGE_KEYS } from './keys';
import { getLocalStorage, readJson, writeJson } from './safe';

export function loadSession(storage: Storage | null = getLocalStorage()): BrewSession | null {
  if (!storage) return null;
  const parsed = readJson<BrewSession>(storage.getItem(STORAGE_KEYS.session));
  if (!parsed || parsed.version !== SESSION_VERSION) return null;
  if (!parsed.teaId || !parsed.recipeId || !parsed.timer) return null;
  return parsed;
}

export function saveSession(session: BrewSession, storage: Storage | null = getLocalStorage()): void {
  if (!storage) return;
  writeJson(storage, STORAGE_KEYS.session, session);
}

export function clearSession(storage: Storage | null = getLocalStorage()): void {
  try {
    storage?.removeItem(STORAGE_KEYS.session);
  } catch {
    // ignore
  }
}

export function isSessionActive(session: BrewSession | null): boolean {
  return Boolean(session && session.stage !== 'session-complete' && session.stage !== 'setup');
}
