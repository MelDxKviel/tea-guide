import { describe, expect, it } from 'vitest';
import { createSession, reduceSession } from '../../src/lib/brewing/session';
import { remainingMs } from '../../src/lib/brewing/timer';
import type { BrewingRecipe } from '../../src/lib/brewing/types';

const recipe: BrewingRecipe = {
  id: 'dhp-gongfu',
  teaId: 'da-hong-pao',
  method: 'gongfu',
  vessel: 'gaiwan',
  referenceVolumeMl: 110,
  referenceLeafGrams: 8,
  rinse: { durationSeconds: 5, optional: true },
  infusions: [
    { number: 1, durationSeconds: 8 },
    { number: 2, durationSeconds: 10 },
    { number: 3, durationSeconds: 15 },
  ],
  extension: { initialSeconds: 120, incrementSeconds: 30 },
  sourceRefs: [{ sourceId: 's1', supports: ['infusion_times'] }],
  confidence: 'medium',
};

function sessionAt(now: number) {
  return createSession({
    teaId: 'da-hong-pao',
    teaSlug: 'da-hong-pao',
    teaName: 'Да Хун Пао',
    recipe,
    volumeMl: 110,
    strength: 'normal',
    now,
  });
}

describe('timer timestamps', () => {
  it('counts remaining from expectedEndAt, not interval ticks', () => {
    const t0 = 1_000_000;
    let session = sessionAt(t0);
    session = reduceSession(session, recipe, { type: 'START' }, t0);
    session = reduceSession(session, recipe, { type: 'SKIP_RINSE' }, t0);
    session = reduceSession(session, recipe, { type: 'START' }, t0);
    expect(remainingMs(session.timer, t0 + 3_000)).toBe(5_000);
    expect(reduceSession(session, recipe, { type: 'SYNC' }, t0 + 8_000).stage).toBe('infusion-complete');
  });

  it('survives background elapsed time', () => {
    const t0 = 5_000_000;
    let session = sessionAt(t0);
    session = reduceSession(session, recipe, { type: 'SKIP_RINSE' }, t0);
    session = reduceSession(session, recipe, { type: 'START' }, t0);
    const later = reduceSession(session, recipe, { type: 'SYNC' }, t0 + 60_000);
    expect(later.stage).toBe('infusion-complete');
    expect(later.timer.remainingMs).toBe(0);
  });

  it('pause freezes remaining and resume rebuilds expectedEndAt', () => {
    const t0 = 10_000;
    let session = sessionAt(t0);
    session = reduceSession(session, recipe, { type: 'SKIP_RINSE' }, t0);
    session = reduceSession(session, recipe, { type: 'START' }, t0);
    session = reduceSession(session, recipe, { type: 'PAUSE' }, t0 + 3_000);
    expect(session.stage).toBe('infusion-paused');
    expect(session.timer.remainingMs).toBe(5_000);
    session = reduceSession(session, recipe, { type: 'RESUME' }, t0 + 20_000);
    expect(session.stage).toBe('infusion-running');
    expect(session.timer.expectedEndAt).toBe(t0 + 20_000 + 5_000);
    session = reduceSession(session, recipe, { type: 'PAUSE' }, t0 + 22_000);
    session = reduceSession(session, recipe, { type: 'RESUME' }, t0 + 40_000);
    expect(remainingMs(session.timer, t0 + 40_000)).toBe(3_000);
  });

  it('adjusts only the current session', () => {
    const t0 = 0;
    let session = sessionAt(t0);
    session = reduceSession(session, recipe, { type: 'SKIP_RINSE' }, t0);
    session = reduceSession(session, recipe, { type: 'ADJUST', deltaMs: 5_000 }, t0);
    expect(session.timer.remainingMs).toBe(13_000);
    expect(recipe.infusions?.[0].durationSeconds).toBe(8);
  });

  it('minus 5 does not go below zero and can complete', () => {
    const t0 = 0;
    let session = sessionAt(t0);
    session = reduceSession(session, recipe, { type: 'SKIP_RINSE' }, t0);
    session = reduceSession(session, recipe, { type: 'START' }, t0);
    session = reduceSession(session, recipe, { type: 'ADJUST', deltaMs: -30_000 }, t0 + 100);
    expect(session.stage).toBe('infusion-complete');
  });

  it('restores an already expired running timer as complete', () => {
    const t0 = 1000;
    let session = sessionAt(t0);
    session = reduceSession(session, recipe, { type: 'SKIP_RINSE' }, t0);
    session = reduceSession(session, recipe, { type: 'START' }, t0);
    const restored = reduceSession(session, recipe, { type: 'SYNC' }, t0 + 20_000);
    expect(restored.stage).toBe('infusion-complete');
  });
});

describe('sequence', () => {
  it('treats rinse as its own stage', () => {
    const t0 = 0;
    let session = sessionAt(t0);
    expect(session.stage).toBe('rinse-ready');
    session = reduceSession(session, recipe, { type: 'START' }, t0);
    session = reduceSession(session, recipe, { type: 'SYNC' }, t0 + 5_000);
    expect(session.stage).toBe('rinse-complete');
    session = reduceSession(session, recipe, { type: 'ADVANCE' }, t0 + 5_000);
    expect(session.stage).toBe('infusion-ready');
    expect(session.currentInfusionIndex).toBe(0);
  });

  it('never auto-starts the next infusion', () => {
    const t0 = 0;
    let session = sessionAt(t0);
    session = reduceSession(session, recipe, { type: 'SKIP_RINSE' }, t0);
    session = reduceSession(session, recipe, { type: 'START' }, t0);
    session = reduceSession(session, recipe, { type: 'SYNC' }, t0 + 8_000);
    expect(session.stage).toBe('infusion-complete');
    expect(session.currentInfusionIndex).toBe(0);
    session = reduceSession(session, recipe, { type: 'ADVANCE' }, t0 + 8_000);
    expect(session.stage).toBe('infusion-ready');
    expect(session.currentInfusionIndex).toBe(1);
    expect(session.timer.durationMs).toBe(10_000);
  });

  it('completes after the last planned infusion and can extend', () => {
    const t0 = 0;
    let session = sessionAt(t0);
    session = reduceSession(session, recipe, { type: 'SKIP_RINSE' }, t0);
    for (let i = 0; i < 3; i += 1) {
      session = reduceSession(session, recipe, { type: 'START' }, t0);
      session = reduceSession(session, recipe, { type: 'FINISH_STAGE' }, t0);
      session = reduceSession(session, recipe, { type: 'ADVANCE' }, t0);
    }
    expect(session.stage).toBe('session-complete');
    session = reduceSession(session, recipe, { type: 'START_EXTENSION' }, t0);
    expect(session.stage).toBe('infusion-ready');
    expect(session.isExtension).toBe(true);
    expect(session.timer.durationMs).toBe(120_000);
    session = reduceSession(session, recipe, { type: 'FINISH_STAGE' }, t0);
    session = reduceSession(session, recipe, { type: 'ADVANCE' }, t0);
    session = reduceSession(session, recipe, { type: 'START_EXTENSION' }, t0);
    expect(session.timer.durationMs).toBe(150_000);
  });
});
