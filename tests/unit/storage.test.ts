import { describe, expect, it } from 'vitest';
import { createSession, reduceSession } from '../../src/lib/brewing/session';
import type { BrewingRecipe } from '../../src/lib/brewing/types';
import { loadPreferences, savePreferences } from '../../src/lib/storage/preferences';
import { loadRecent, pushRecent } from '../../src/lib/storage/recent';
import {
  clearSession,
  dismissRecovery,
  isRecoveryDismissed,
  loadSession,
  saveSession,
  tryStartSession,
} from '../../src/lib/storage/session';

class MemoryStorage implements Storage {
  private data = new Map<string, string>();
  get length(): number {
    return this.data.size;
  }
  clear(): void {
    this.data.clear();
  }
  getItem(key: string): string | null {
    return this.data.get(key) ?? null;
  }
  key(index: number): string | null {
    return [...this.data.keys()][index] ?? null;
  }
  removeItem(key: string): void {
    this.data.delete(key);
  }
  setItem(key: string, value: string): void {
    this.data.set(key, value);
  }
}

const recipe: BrewingRecipe = {
  id: 'r1',
  teaId: 'tea-1',
  method: 'gongfu',
  referenceVolumeMl: 100,
  referenceLeafGrams: 7,
  infusions: [
    { number: 1, durationSeconds: 10 },
    { number: 2, durationSeconds: 15 },
  ],
  sourceRefs: [{ sourceId: 's', supports: ['leaf_ratio'] }],
  confidence: 'high',
};

describe('session persistence', () => {
  it('saves and restores a session', () => {
    const storage = new MemoryStorage();
    const session = createSession({
      teaId: 'tea-1',
      teaSlug: 'tea-1',
      teaName: 'Тест',
      recipe,
      volumeMl: 120,
      strength: 'soft',
      now: 1,
    });
    saveSession(session, storage);
    expect(loadSession(storage)?.leafGrams).toBe(session.leafGrams);
  });

  it('drops corrupted or unknown versions', () => {
    const storage = new MemoryStorage();
    storage.setItem('tea-guide:session:v1', '{not json');
    expect(loadSession(storage)).toBeNull();
    storage.setItem('tea-guide:session:v1', JSON.stringify({ version: 99, teaId: 'x' }));
    expect(loadSession(storage)).toBeNull();
    clearSession(storage);
    expect(loadSession(storage)).toBeNull();
  });

  it('restores expired running timer as complete', () => {
    const storage = new MemoryStorage();
    const t0 = 1000;
    let session = createSession({
      teaId: 'tea-1',
      teaSlug: 'tea-1',
      teaName: 'Тест',
      recipe,
      volumeMl: 100,
      strength: 'normal',
      now: t0,
    });
    session = reduceSession(session, recipe, { type: 'START' }, t0);
    saveSession(session, storage);
    const restored = loadSession(storage);
    expect(restored).not.toBeNull();
    const synced = reduceSession(restored!, recipe, { type: 'SYNC' }, t0 + 30_000);
    expect(synced.stage).toBe('infusion-complete');
  });
});

describe('starting another tea', () => {
  const makeSession = (teaId: string, now: number) =>
    createSession({
      teaId,
      teaSlug: teaId,
      teaName: teaId,
      recipe: { ...recipe, teaId, id: `${teaId}-recipe` },
      volumeMl: 120,
      strength: 'soft',
      now,
    });

  it('keeps the active tea and its paused timer until replacement is confirmed', () => {
    const storage = new MemoryStorage();
    let active = makeSession('first', 1000);
    active = reduceSession(active, recipe, { type: 'START' }, 1000);
    active = reduceSession(active, recipe, { type: 'PAUSE' }, 4000);
    saveSession(active, storage);
    const before = storage.getItem('tea-guide:session:v1');
    const next = makeSession('second', 5000);

    expect(tryStartSession(next, null, storage)).toEqual({ started: false, activeSession: active });
    expect(storage.getItem('tea-guide:session:v1')).toBe(before);
    expect(tryStartSession(next, active, storage)).toEqual({ started: true });
    expect(loadSession(storage)).toMatchObject({ teaId: 'second', stage: 'infusion-ready' });
  });

  it('protects a newer session created while the replacement prompt was open', () => {
    const storage = new MemoryStorage();
    const earlier = makeSession('first', 1000);
    const newer = makeSession('first', 2000);
    saveSession(newer, storage);

    expect(tryStartSession(makeSession('second', 3000), earlier, storage)).toEqual({
      started: false,
      activeSession: newer,
    });
    expect(loadSession(storage)?.createdAt).toBe(2000);
  });

  it('accepts confirmation after the same tea advances to another stage', () => {
    const storage = new MemoryStorage();
    const earlier = makeSession('first', 1000);
    saveSession(reduceSession(earlier, recipe, { type: 'NEXT_INFUSION' }, 2000), storage);

    expect(tryStartSession(makeSession('second', 3000), earlier, storage)).toEqual({
      started: true,
    });
  });

  it.each([null, '{invalid', JSON.stringify({ version: 99 })])(
    'starts normally with missing or incompatible saved data: %s',
    (saved) => {
      const storage = new MemoryStorage();
      if (saved) storage.setItem('tea-guide:session:v1', saved);
      expect(tryStartSession(makeSession('second', 3000), null, storage)).toEqual({
        started: true,
      });
      expect(loadSession(storage)?.teaId).toBe('second');
    },
  );

  it('does not ask to replace a finished tea', () => {
    const storage = new MemoryStorage();
    saveSession(
      reduceSession(makeSession('first', 1000), recipe, { type: 'END_SESSION' }, 2000),
      storage,
    );
    expect(tryStartSession(makeSession('second', 3000), null, storage)).toEqual({ started: true });
  });

  it('does not block starting when storage is unavailable', () => {
    expect(tryStartSession(makeSession('second', 3000), null, null)).toEqual({ started: true });
  });
});

describe('recovery banner dismiss', () => {
  it('stays dismissed for the same session across page loads', () => {
    const storage = new MemoryStorage();
    const session = createSession({
      teaId: 'tea-1',
      teaSlug: 'tea-1',
      teaName: 'Тест',
      recipe,
      volumeMl: 100,
      strength: 'normal',
      now: 42,
    });
    expect(isRecoveryDismissed(session, storage)).toBe(false);
    dismissRecovery(session, storage);
    expect(isRecoveryDismissed(session, storage)).toBe(true);
  });

  it('shows the banner again for a new brewing session', () => {
    const storage = new MemoryStorage();
    const first = createSession({
      teaId: 'tea-1',
      teaSlug: 'tea-1',
      teaName: 'Тест',
      recipe,
      volumeMl: 100,
      strength: 'normal',
      now: 42,
    });
    dismissRecovery(first, storage);
    const next = createSession({
      teaId: 'tea-1',
      teaSlug: 'tea-1',
      teaName: 'Тест',
      recipe,
      volumeMl: 100,
      strength: 'normal',
      now: 99,
    });
    expect(isRecoveryDismissed(next, storage)).toBe(false);
  });
});

describe('preferences and recent', () => {
  it('stores local settings without extra personal data', () => {
    const storage = new MemoryStorage();
    savePreferences({ sound: false, lastVolumeMl: 150 }, storage);
    expect(loadPreferences(storage)).toMatchObject({
      sound: false,
      lastVolumeMl: 150,
      wakeLock: true,
    });
  });

  it('keeps a short recent list', () => {
    const storage = new MemoryStorage();
    pushRecent({ teaId: 'a', slug: 'a', name: 'A', volumeMl: 100 }, storage);
    pushRecent({ teaId: 'b', slug: 'b', name: 'B', volumeMl: 110, vessel: 'gaiwan' }, storage);
    pushRecent({ teaId: 'a', slug: 'a', name: 'A', volumeMl: 120 }, storage);
    const recent = loadRecent(storage);
    expect(recent[0]?.teaId).toBe('a');
    expect(recent).toHaveLength(2);
  });
});
