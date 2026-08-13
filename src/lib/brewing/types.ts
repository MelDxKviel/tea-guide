export type TeaCategoryId =
  | 'oolong'
  | 'green-tea'
  | 'red-tea'
  | 'white-tea'
  | 'yellow-tea'
  | 'dark-tea'
  | 'puer';

export type GongfuVessel = 'gaiwan' | 'yixing';

export type BrewingMethod = 'gongfu' | 'western' | 'thermos' | 'cold_brew';

export type Strength = 'soft' | 'normal' | 'strong';

export type RecipeConfidence = 'high' | 'medium';

export type SourceSupport =
  | 'leaf_ratio'
  | 'water_volume'
  | 'temperature'
  | 'rinse'
  | 'infusion_times'
  | 'vessel'
  | 'western_method'
  | 'thermos_method'
  | 'cold_brew_method'
  | 'origin'
  | 'history'
  | 'taste'
  | 'roasting';

export type TimerState =
  | 'setup'
  | 'rinse-ready'
  | 'rinse-running'
  | 'rinse-paused'
  | 'rinse-complete'
  | 'infusion-ready'
  | 'infusion-running'
  | 'infusion-paused'
  | 'infusion-complete'
  | 'session-complete';

export interface TemperatureConfig {
  recommendedCelsius: number;
  minCelsius?: number;
  maxCelsius?: number;
}

export interface StrengthMultipliers {
  soft: number;
  normal: number;
  strong: number;
}

export interface RinseConfig {
  durationSeconds: number;
  optional: boolean;
  note?: string;
}

export interface Infusion {
  number: number;
  durationSeconds: number;
  note?: string;
}

export interface RecipeExtension {
  initialSeconds: number;
  incrementSeconds?: number;
}

export interface RecipeSourceReference {
  sourceId: string;
  supports: SourceSupport[];
}

export interface BrewingRecipe {
  id: string;
  teaId: string;
  method: BrewingMethod;
  vessel?: GongfuVessel;
  referenceVolumeMl: number;
  referenceLeafGrams: number;
  temperature?: TemperatureConfig;
  strengthMultipliers?: StrengthMultipliers;
  rinse?: RinseConfig;
  infusions?: Infusion[];
  durationSeconds?: number;
  extension?: RecipeExtension;
  notes?: string[];
  sourceRefs: RecipeSourceReference[];
  confidence: RecipeConfidence;
}

export interface BrewTimerSnapshot {
  state: TimerState;
  durationMs: number;
  remainingMs?: number;
  expectedEndAt?: number;
  startedAt?: number;
}

export const SESSION_VERSION = 1;

export interface BrewSession {
  version: number;
  teaId: string;
  teaSlug: string;
  teaName: string;
  recipeId: string;
  method: BrewingMethod;
  vessel?: GongfuVessel;
  volumeMl: number;
  leafGrams: number;
  exactLeafGrams: number;
  strength: Strength;
  temperature?: TemperatureConfig;
  stage: TimerState;
  currentInfusionIndex: number;
  totalInfusions: number;
  isExtension: boolean;
  extensionCount: number;
  timer: BrewTimerSnapshot;
  modifiedInfusionDurations: Record<string, number>;
  createdAt: number;
  updatedAt: number;
}

export type SessionAction =
  | { type: 'START' }
  | { type: 'PAUSE' }
  | { type: 'RESUME' }
  | { type: 'ADJUST'; deltaMs: number }
  | { type: 'SYNC' }
  | { type: 'SKIP_RINSE' }
  | { type: 'ADVANCE' }
  | { type: 'FINISH_STAGE' }
  | { type: 'RESTART_STAGE' }
  | { type: 'PREV_INFUSION' }
  | { type: 'NEXT_INFUSION' }
  | { type: 'END_SESSION' }
  | { type: 'RESTART_SESSION' }
  | { type: 'START_EXTENSION' };

export interface VolumeValidation {
  ok: boolean;
  value: number | null;
  error?: 'empty' | 'not-a-number' | 'not-positive' | 'too-large';
  warning?: 'unusual-gongfu' | 'very-large';
}

export const DEFAULT_STRENGTH_MULTIPLIERS: StrengthMultipliers = {
  soft: 0.85,
  normal: 1,
  strong: 1.15,
};

export const VOLUME_PRESETS_ML = [80, 100, 120, 150, 200] as const;

export const ADJUST_STEP_MS = 5_000;
export const MAX_REASONABLE_VOLUME_ML = 5_000;
export const GONGFU_UNUSUAL_VOLUME_ML = 400;
