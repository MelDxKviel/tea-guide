import {
  DEFAULT_STRENGTH_MULTIPLIERS,
  GONGFU_UNUSUAL_VOLUME_ML,
  MAX_REASONABLE_VOLUME_ML,
  type BrewingMethod,
  type BrewingRecipe,
  type Strength,
  type VolumeValidation,
} from './types';

export function getStrengthMultiplier(recipe: Pick<BrewingRecipe, 'strengthMultipliers'>, strength: Strength): number {
  const multipliers = recipe.strengthMultipliers ?? DEFAULT_STRENGTH_MULTIPLIERS;
  return multipliers[strength];
}

export function calculateExactGrams(
  referenceLeafGrams: number,
  referenceVolumeMl: number,
  userVolumeMl: number,
  strengthMultiplier = 1,
): number {
  if (referenceVolumeMl <= 0) {
    throw new Error('referenceVolumeMl must be greater than 0');
  }
  if (referenceLeafGrams <= 0) {
    throw new Error('referenceLeafGrams must be greater than 0');
  }
  return (referenceLeafGrams * userVolumeMl * strengthMultiplier) / referenceVolumeMl;
}

export function calculateRecipeGrams(recipe: BrewingRecipe, userVolumeMl: number, strength: Strength): number {
  return calculateExactGrams(
    recipe.referenceLeafGrams,
    recipe.referenceVolumeMl,
    userVolumeMl,
    getStrengthMultiplier(recipe, strength),
  );
}

/** Round to the nearest 0.5 g for display. Exact value is kept separately. */
export function displayGrams(exactGrams: number): number {
  if (!Number.isFinite(exactGrams) || exactGrams <= 0) return 0;
  return Math.round(exactGrams * 2) / 2;
}

export function formatGrams(grams: number): string {
  const rounded = displayGrams(grams);
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

export function parseVolumeInput(raw: string): number | null {
  const normalized = raw.trim().replace(',', '.');
  if (normalized === '') return null;
  if (!/^-?\d+(\.\d+)?$/.test(normalized)) return null;
  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
}

export function validateVolume(raw: string, method: BrewingMethod): VolumeValidation {
  const trimmed = raw.trim();
  if (trimmed === '') {
    return { ok: false, value: null, error: 'empty' };
  }

  const value = parseVolumeInput(trimmed);
  if (value === null) {
    return { ok: false, value: null, error: 'not-a-number' };
  }
  if (value <= 0) {
    return { ok: false, value, error: 'not-positive' };
  }
  if (value > MAX_REASONABLE_VOLUME_ML) {
    return { ok: false, value, error: 'too-large' };
  }

  const result: VolumeValidation = { ok: true, value };
  if (method === 'gongfu' && value > GONGFU_UNUSUAL_VOLUME_ML) {
    result.warning = value > 1000 ? 'very-large' : 'unusual-gongfu';
  }
  return result;
}

export function formatDuration(totalSeconds: number): string {
  const safe = Math.max(0, Math.round(totalSeconds));
  if (safe >= 3600) {
    const hours = Math.floor(safe / 3600);
    const minutes = Math.floor((safe % 3600) / 60);
    const seconds = safe % 60;
    return `${hours}:${pad(minutes)}:${pad(seconds)}`;
  }
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${pad(minutes)}:${pad(seconds)}`;
}

export function formatDurationMs(ms: number): string {
  return formatDuration(Math.ceil(ms / 1000));
}

function pad(value: number): string {
  return value.toString().padStart(2, '0');
}
