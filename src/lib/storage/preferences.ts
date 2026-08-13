import { PREFERENCES_VERSION, STORAGE_KEYS } from './keys';
import { getLocalStorage, readJson, writeJson } from './safe';

export interface UserPreferences {
  version: number;
  sound: boolean;
  vibration: boolean;
  wakeLock: boolean;
  lastVolumeMl: number | null;
}

export const DEFAULT_PREFERENCES: UserPreferences = {
  version: PREFERENCES_VERSION,
  sound: true,
  vibration: true,
  wakeLock: true,
  lastVolumeMl: null,
};

export function loadPreferences(storage: Storage | null = getLocalStorage()): UserPreferences {
  if (!storage) return { ...DEFAULT_PREFERENCES };
  const parsed = readJson<Partial<UserPreferences>>(storage.getItem(STORAGE_KEYS.preferences));
  if (!parsed || parsed.version !== PREFERENCES_VERSION) {
    return { ...DEFAULT_PREFERENCES };
  }
  return {
    version: PREFERENCES_VERSION,
    sound: parsed.sound ?? DEFAULT_PREFERENCES.sound,
    vibration: parsed.vibration ?? DEFAULT_PREFERENCES.vibration,
    wakeLock: parsed.wakeLock ?? DEFAULT_PREFERENCES.wakeLock,
    lastVolumeMl: typeof parsed.lastVolumeMl === 'number' ? parsed.lastVolumeMl : null,
  };
}

export function savePreferences(
  patch: Partial<Omit<UserPreferences, 'version'>>,
  storage: Storage | null = getLocalStorage(),
): UserPreferences {
  const next = { ...loadPreferences(storage), ...patch, version: PREFERENCES_VERSION };
  if (storage) writeJson(storage, STORAGE_KEYS.preferences, next);
  return next;
}
