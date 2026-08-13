import { describe, expect, it } from 'vitest';
import { createSession, reduceSession } from '../../src/lib/brewing/session';
import type { BrewingRecipe } from '../../src/lib/brewing/types';
import { loadPreferences, savePreferences } from '../../src/lib/storage/preferences';
import { loadRecent, pushRecent } from '../../src/lib/storage/recent';
import { clearSession, loadSession, saveSession } from '../../src/lib/storage/session';

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

describe('preferences and recent', () => {
  it('stores local settings without extra personal data', () => {
    const storage = new MemoryStorage();
    savePreferences({ sound: false, lastVolumeMl: 150 }, storage);
    expect(loadPreferences(storage)).toMatchObject({ sound: false, lastVolumeMl: 150, wakeLock: true });
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
