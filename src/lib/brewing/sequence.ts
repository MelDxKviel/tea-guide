import type { BrewingRecipe, Infusion } from './types';

export function getInfusions(recipe: BrewingRecipe): Infusion[] {
  return [...(recipe.infusions ?? [])].sort((a, b) => a.number - b.number);
}

export function getInfusionDurationSeconds(
  recipe: BrewingRecipe,
  infusionIndex: number,
  modified: Record<string, number> = {},
  extensionCount = 0,
): number {
  const infusions = getInfusions(recipe);

  if (infusionIndex < infusions.length) {
    const key = String(infusionIndex);
    if (modified[key] !== undefined) return modified[key];
    return infusions[infusionIndex].durationSeconds;
  }

  if (!recipe.extension) {
    throw new Error(`No infusion at index ${infusionIndex}`);
  }

  const extraIndex = infusionIndex - infusions.length;
  const seconds =
    recipe.extension.initialSeconds + extraIndex * (recipe.extension.incrementSeconds ?? 0);
  const key = extensionKey(extensionCount || extraIndex + 1);
  if (modified[key] !== undefined) return modified[key];
  return seconds;
}

export function extensionKey(extensionNumber: number): string {
  return `ext-${extensionNumber}`;
}

export function nextExtensionSeconds(recipe: BrewingRecipe, extensionCount: number): number | null {
  if (!recipe.extension) return null;
  return recipe.extension.initialSeconds + extensionCount * (recipe.extension.incrementSeconds ?? 0);
}

export function hasRinse(recipe: BrewingRecipe): boolean {
  return Boolean(recipe.rinse && recipe.rinse.durationSeconds > 0);
}

export function isRinseOptional(recipe: BrewingRecipe): boolean {
  return Boolean(recipe.rinse?.optional);
}

export function totalPlannedInfusions(recipe: BrewingRecipe): number {
  return getInfusions(recipe).length;
}

export function canExtend(recipe: BrewingRecipe): boolean {
  return Boolean(recipe.extension);
}
