import { SESSION_VERSION, type BrewSession } from '../brewing/types';
import { STORAGE_KEYS } from './keys';
import { getLocalStorage, getSessionStorage, readJson, writeJson } from './safe';

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

export function isRecoveryDismissed(
  session: BrewSession,
  storage: Storage | null = getSessionStorage(),
): boolean {
  if (!storage) return false;
  return storage.getItem(STORAGE_KEYS.recoveryDismissed) === String(session.createdAt);
}

export function dismissRecovery(
  session: BrewSession,
  storage: Storage | null = getSessionStorage(),
): void {
  try {
    storage?.setItem(STORAGE_KEYS.recoveryDismissed, String(session.createdAt));
  } catch {
    // ignore
  }
}
