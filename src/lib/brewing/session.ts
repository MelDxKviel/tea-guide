import { calculateRecipeGrams, displayGrams } from './calculate';
import {
  canExtend,
  extensionKey,
  getInfusionDurationSeconds,
  getInfusions,
  hasRinse,
  nextExtensionSeconds,
  totalPlannedInfusions,
} from './sequence';
import {
  adjustCountdown,
  completeCountdown,
  hasExpired,
  isPausedState,
  isReadyState,
  isRunningState,
  isStageCompleteState,
  pauseCountdown,
  readyCountdown,
  remainingMs,
  resumeCountdown,
  startCountdown,
  stageKind,
  syncCountdown,
} from './timer';
import {
  SESSION_VERSION,
  type BrewSession,
  type BrewingRecipe,
  type GongfuVessel,
  type SessionAction,
  type Strength,
  type TemperatureConfig,
} from './types';

export interface CreateSessionInput {
  teaId: string;
  teaSlug: string;
  teaName: string;
  recipe: BrewingRecipe;
  volumeMl: number;
  strength: Strength;
  vessel?: GongfuVessel;
  now?: number;
}

export function recipeForSession(recipe: BrewingRecipe): BrewingRecipe {
  if (recipe.infusions?.length) return recipe;
  if (recipe.durationSeconds) {
    return {
      ...recipe,
      infusions: [{ number: 1, durationSeconds: recipe.durationSeconds }],
    };
  }
  return recipe;
}

export function createSession(input: CreateSessionInput): BrewSession {
  const now = input.now ?? Date.now();
  const recipe = recipeForSession(input.recipe);
  const exactLeafGrams = calculateRecipeGrams(recipe, input.volumeMl, input.strength);
  const leafGrams = displayGrams(exactLeafGrams);
  const infusions = getInfusions(recipe);
  const rinse = hasRinse(recipe);
  const firstDuration = rinse
    ? recipe.rinse!.durationSeconds * 1000
    : getInfusionDurationSeconds(recipe, 0) * 1000;

  return {
    version: SESSION_VERSION,
    teaId: input.teaId,
    teaSlug: input.teaSlug,
    teaName: input.teaName,
    recipeId: recipe.id,
    method: recipe.method,
    vessel: input.vessel ?? recipe.vessel,
    volumeMl: input.volumeMl,
    leafGrams,
    exactLeafGrams,
    strength: input.strength,
    temperature: recipe.temperature,
    stage: rinse ? 'rinse-ready' : 'infusion-ready',
    currentInfusionIndex: 0,
    totalInfusions: infusions.length,
    isExtension: false,
    extensionCount: 0,
    timer: readyCountdown(firstDuration, rinse ? 'rinse' : 'infusion'),
    modifiedInfusionDurations: {},
    createdAt: now,
    updatedAt: now,
  };
}

export function reduceSession(
  session: BrewSession,
  rawRecipe: BrewingRecipe,
  action: SessionAction,
  now = Date.now(),
): BrewSession {
  const recipe = recipeForSession(rawRecipe);
  const synced = applySync(session, now);

  switch (action.type) {
    case 'SYNC':
      return synced;
    case 'START':
      return startStage(synced, now);
    case 'PAUSE':
      return pauseStage(synced, now);
    case 'RESUME':
      return resumeStage(synced, now);
    case 'ADJUST':
      return adjustStage(synced, action.deltaMs, now);
    case 'SKIP_RINSE':
      return skipRinse(synced, recipe, now);
    case 'ADVANCE':
      return advance(synced, recipe, now);
    case 'FINISH_STAGE':
      return finishStageNow(synced, now);
    case 'RESTART_STAGE':
      return restartStage(synced, recipe, now);
    case 'PREV_INFUSION':
      return jumpInfusion(synced, recipe, synced.currentInfusionIndex - 1, now);
    case 'NEXT_INFUSION':
      return jumpInfusion(synced, recipe, synced.currentInfusionIndex + 1, now);
    case 'END_SESSION':
      return endSession(synced, now);
    case 'RESTART_SESSION':
      return createSession({
        teaId: session.teaId,
        teaSlug: session.teaSlug,
        teaName: session.teaName,
        recipe,
        volumeMl: session.volumeMl,
        strength: session.strength,
        vessel: session.vessel,
        now,
      });
    case 'START_EXTENSION':
      return startExtension(synced, recipe, now);
    default:
      return synced;
  }
}

export function applySync(session: BrewSession, now: number): BrewSession {
  const timer = syncCountdown(session.timer, now);
  if (timer === session.timer && session.stage === timer.state) return session;
  return { ...session, timer, stage: timer.state, updatedAt: now };
}

function startStage(session: BrewSession, now: number): BrewSession {
  if (!isReadyState(session.stage) && !isPausedState(session.stage)) {
    if (isRunningState(session.stage)) return session;
  }
  if (isPausedState(session.stage)) {
    const timer = resumeCountdown(session.timer, now);
    return { ...session, timer, stage: timer.state, updatedAt: now };
  }
  if (!isReadyState(session.stage)) return session;
  const kind = stageKind(session.stage);
  if (!kind) return session;
  const duration = session.timer.remainingMs ?? session.timer.durationMs;
  const timer = startCountdown(duration, now, kind);
  return { ...session, timer, stage: timer.state, updatedAt: now };
}

function pauseStage(session: BrewSession, now: number): BrewSession {
  if (!isRunningState(session.stage)) return session;
  const timer = pauseCountdown(session.timer, now);
  return { ...session, timer, stage: timer.state, updatedAt: now };
}

function resumeStage(session: BrewSession, now: number): BrewSession {
  if (!isPausedState(session.stage)) return session;
  const timer = resumeCountdown(session.timer, now);
  return { ...session, timer, stage: timer.state, updatedAt: now };
}

function adjustStage(session: BrewSession, deltaMs: number, now: number): BrewSession {
  if (session.stage === 'session-complete' || session.stage === 'setup') return session;
  const kind = stageKind(session.stage);
  if (!kind) return session;
  const timer = adjustCountdown(session.timer, deltaMs, now);
  const next: BrewSession = { ...session, timer, stage: timer.state, updatedAt: now };

  if (kind === 'infusion') {
    const seconds = Math.round((timer.remainingMs ?? 0) / 1000);
    const key = session.isExtension
      ? extensionKey(session.extensionCount)
      : String(session.currentInfusionIndex);
    next.modifiedInfusionDurations = {
      ...session.modifiedInfusionDurations,
      [key]: Math.max(0, seconds),
    };
  }

  return next;
}

function skipRinse(session: BrewSession, recipe: BrewingRecipe, now: number): BrewSession {
  if (!session.stage.startsWith('rinse')) return session;
  if (!recipe.rinse?.optional) return session;
  return moveToInfusion(session, recipe, 0, now);
}

function finishStageNow(session: BrewSession, now: number): BrewSession {
  if (session.stage === 'session-complete') return session;
  const kind = stageKind(session.stage);
  if (!kind && !isReadyState(session.stage)) return session;
  const timer = completeCountdown({
    ...session.timer,
    state: session.stage.startsWith('rinse') ? 'rinse-running' : 'infusion-running',
  });
  return { ...session, timer, stage: timer.state, updatedAt: now };
}

function restartStage(session: BrewSession, recipe: BrewingRecipe, now: number): BrewSession {
  if (session.stage === 'session-complete') {
    return createSession({
      teaId: session.teaId,
      teaSlug: session.teaSlug,
      teaName: session.teaName,
      recipe,
      volumeMl: session.volumeMl,
      strength: session.strength,
      vessel: session.vessel,
      now,
    });
  }
  if (session.stage.startsWith('rinse')) {
    const duration = (recipe.rinse?.durationSeconds ?? 0) * 1000;
    const timer = readyCountdown(duration, 'rinse');
    return { ...session, timer, stage: timer.state, updatedAt: now };
  }
  const seconds = getInfusionDurationSeconds(
    recipe,
    session.currentInfusionIndex,
    {},
    session.extensionCount,
  );
  const timer = readyCountdown(seconds * 1000, 'infusion');
  const modified = { ...session.modifiedInfusionDurations };
  const key = session.isExtension ? extensionKey(session.extensionCount) : String(session.currentInfusionIndex);
  delete modified[key];
  return { ...session, timer, stage: timer.state, modifiedInfusionDurations: modified, updatedAt: now };
}

function advance(session: BrewSession, recipe: BrewingRecipe, now: number): BrewSession {
  if (session.stage === 'rinse-complete' || (session.stage.startsWith('rinse') && hasExpired(session.timer, now))) {
    return moveToInfusion(session, recipe, 0, now);
  }
  if (session.stage !== 'infusion-complete' && !hasExpired(session.timer, now)) {
    if (!isStageCompleteState(session.stage)) return session;
  }
  if (!session.stage.startsWith('infusion') && session.stage !== 'infusion-complete') return session;

  const nextIndex = session.currentInfusionIndex + 1;
  if (nextIndex < session.totalInfusions) {
    return moveToInfusion(session, recipe, nextIndex, now);
  }
  return { ...session, stage: 'session-complete', timer: { ...session.timer, state: 'session-complete', remainingMs: 0, expectedEndAt: undefined }, updatedAt: now };
}

function startExtension(session: BrewSession, recipe: BrewingRecipe, now: number): BrewSession {
  if (!canExtend(recipe)) return session;
  if (session.stage !== 'session-complete' && session.currentInfusionIndex < session.totalInfusions - 1) {
    return session;
  }
  const readyCount = session.extensionCount;
  const seconds = nextExtensionSeconds(recipe, readyCount);
  if (seconds === null) return session;
  const nextCount = readyCount + 1;
  const timer = readyCountdown(seconds * 1000, 'infusion');
  return {
    ...session,
    currentInfusionIndex: session.totalInfusions + nextCount - 1,
    isExtension: true,
    extensionCount: nextCount,
    timer,
    stage: timer.state,
    updatedAt: now,
  };
}

function jumpInfusion(session: BrewSession, recipe: BrewingRecipe, index: number, now: number): BrewSession {
  if (index < 0) return session;
  if (index >= session.totalInfusions) {
    if (canExtend(recipe) && index === session.totalInfusions) {
      return startExtension({ ...session, stage: 'session-complete' }, recipe, now);
    }
    return session;
  }
  return moveToInfusion(session, recipe, index, now);
}

function moveToInfusion(session: BrewSession, recipe: BrewingRecipe, index: number, now: number): BrewSession {
  const seconds = getInfusionDurationSeconds(recipe, index, session.modifiedInfusionDurations, session.extensionCount);
  const timer = readyCountdown(seconds * 1000, 'infusion');
  return {
    ...session,
    currentInfusionIndex: index,
    isExtension: index >= session.totalInfusions,
    timer,
    stage: timer.state,
    updatedAt: now,
  };
}

function endSession(session: BrewSession, now: number): BrewSession {
  return {
    ...session,
    stage: 'session-complete',
    timer: {
      ...session.timer,
      state: 'session-complete',
      remainingMs: 0,
      expectedEndAt: undefined,
    },
    updatedAt: now,
  };
}

export function nextInfusionSeconds(session: BrewSession, recipe: BrewingRecipe): number | null {
  const nextIndex = session.currentInfusionIndex + 1;
  if (nextIndex < session.totalInfusions) {
    return getInfusionDurationSeconds(recipe, nextIndex, session.modifiedInfusionDurations);
  }
  return nextExtensionSeconds(recipe, session.extensionCount);
}

export function currentNote(session: BrewSession, recipe: BrewingRecipe): string | undefined {
  if (session.stage.startsWith('rinse')) return recipe.rinse?.note;
  const infusions = getInfusions(recipe);
  if (session.currentInfusionIndex < infusions.length) {
    return infusions[session.currentInfusionIndex].note;
  }
  return undefined;
}

export function plannedDurations(recipe: BrewingRecipe): number[] {
  return getInfusions(recipe).map((item) => item.durationSeconds);
}

export function displayInfusionNumber(session: BrewSession): number {
  return session.currentInfusionIndex + 1;
}

export function restoreExpiredSession(session: BrewSession, now: number): BrewSession {
  return applySync(session, now);
}

export function sessionSummaryTemperature(temperature?: TemperatureConfig): string | null {
  if (!temperature) return null;
  return `${temperature.recommendedCelsius}°C`;
}

export function getVisibleRemainingMs(session: BrewSession, now: number): number {
  return remainingMs(session.timer, now);
}

export { totalPlannedInfusions };
