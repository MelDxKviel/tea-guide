import { describe, expect, it } from 'vitest';
import {
  calculateExactGrams,
  calculateRecipeGrams,
  displayGrams,
  formatDuration,
  formatGrams,
  validateVolume,
} from '../../src/lib/brewing/calculate';
import type { BrewingRecipe } from '../../src/lib/brewing/types';

const recipe = (overrides: Partial<BrewingRecipe> = {}): BrewingRecipe => ({
  id: 'test-gongfu',
  teaId: 'test-tea',
  method: 'gongfu',
  vessel: 'gaiwan',
  referenceVolumeMl: 100,
  referenceLeafGrams: 8,
  sourceRefs: [{ sourceId: 's1', supports: ['leaf_ratio'] }],
  confidence: 'high',
  infusions: [{ number: 1, durationSeconds: 10 }],
  ...overrides,
});

describe('calculateExactGrams', () => {
  it('scales 8 g / 100 ml to 120 ml', () => {
    expect(calculateExactGrams(8, 100, 120)).toBeCloseTo(9.6);
  });

  it('uses recipe-specific ratio, not a category constant', () => {
    expect(calculateExactGrams(5, 110, 110)).toBe(5);
    expect(calculateExactGrams(8, 110, 110)).toBe(8);
  });
});

describe('strength', () => {
  it('applies default multipliers only to leaf amount', () => {
    const base = recipe();
    expect(calculateRecipeGrams(base, 100, 'normal')).toBe(8);
    expect(calculateRecipeGrams(base, 100, 'soft')).toBeCloseTo(6.8);
    expect(calculateRecipeGrams(base, 100, 'strong')).toBeCloseTo(9.2);
  });

  it('allows recipe overrides', () => {
    const custom = recipe({
      strengthMultipliers: { soft: 0.5, normal: 1, strong: 2 },
    });
    expect(calculateRecipeGrams(custom, 100, 'soft')).toBe(4);
    expect(calculateRecipeGrams(custom, 100, 'strong')).toBe(16);
  });
});

describe('displayGrams', () => {
  it('rounds 9.82 to 10', () => {
    expect(displayGrams(9.82)).toBe(10);
  });

  it('rounds 9.31 to 9.5', () => {
    expect(displayGrams(9.31)).toBe(9.5);
  });

  it('keeps exact halves', () => {
    expect(displayGrams(9.5)).toBe(9.5);
  });

  it('rounds .25 down to nearest half via bank? 8.25 -> 8.5 by half-up on *2', () => {
    expect(displayGrams(8.25)).toBe(8.5);
    expect(displayGrams(8.24)).toBe(8);
  });

  it('formats without trailing noise', () => {
    expect(formatGrams(10)).toBe('10');
    expect(formatGrams(9.5)).toBe('9.5');
  });
});

describe('validateVolume', () => {
  it('rejects empty, text, zero and negative', () => {
    expect(validateVolume('', 'gongfu').error).toBe('empty');
    expect(validateVolume('сто', 'gongfu').error).toBe('not-a-number');
    expect(validateVolume('0', 'gongfu').error).toBe('not-positive');
    expect(validateVolume('-10', 'gongfu').error).toBe('not-positive');
  });

  it('accepts custom numbers and warns on huge gongfu vessels', () => {
    expect(validateVolume('135', 'gongfu')).toMatchObject({ ok: true, value: 135 });
    expect(validateVolume('500', 'gongfu').warning).toBe('unusual-gongfu');
    expect(validateVolume('9000', 'gongfu').error).toBe('too-large');
  });

  it('accepts comma decimals', () => {
    expect(validateVolume('110,5', 'western')).toMatchObject({ ok: true, value: 110.5 });
  });
});

describe('formatDuration', () => {
  it('pads minutes and seconds', () => {
    expect(formatDuration(8)).toBe('00:08');
    expect(formatDuration(75)).toBe('01:15');
  });
});
