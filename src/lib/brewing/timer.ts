import type { BrewTimerSnapshot, TimerState } from './types';

const RUNNING: ReadonlySet<TimerState> = new Set(['rinse-running', 'infusion-running']);
const PAUSED: ReadonlySet<TimerState> = new Set(['rinse-paused', 'infusion-paused']);
const READY: ReadonlySet<TimerState> = new Set(['rinse-ready', 'infusion-ready']);
const COMPLETE: ReadonlySet<TimerState> = new Set(['rinse-complete', 'infusion-complete']);

export function isRunningState(state: TimerState): boolean {
  return RUNNING.has(state);
}

export function isPausedState(state: TimerState): boolean {
  return PAUSED.has(state);
}

export function isReadyState(state: TimerState): boolean {
  return READY.has(state);
}

export function isStageCompleteState(state: TimerState): boolean {
  return COMPLETE.has(state);
}

export function runningStateFor(kind: 'rinse' | 'infusion'): TimerState {
  return kind === 'rinse' ? 'rinse-running' : 'infusion-running';
}

export function pausedStateFor(kind: 'rinse' | 'infusion'): TimerState {
  return kind === 'rinse' ? 'rinse-paused' : 'infusion-paused';
}

export function completeStateFor(kind: 'rinse' | 'infusion'): TimerState {
  return kind === 'rinse' ? 'rinse-complete' : 'infusion-complete';
}

export function readyStateFor(kind: 'rinse' | 'infusion'): TimerState {
  return kind === 'rinse' ? 'rinse-ready' : 'infusion-ready';
}

export function stageKind(state: TimerState): 'rinse' | 'infusion' | null {
  if (state.startsWith('rinse')) return 'rinse';
  if (state.startsWith('infusion')) return 'infusion';
  return null;
}

export function remainingMs(timer: BrewTimerSnapshot, now: number): number {
  if (isPausedState(timer.state) || isReadyState(timer.state)) {
    return Math.max(0, timer.remainingMs ?? timer.durationMs);
  }
  if (isRunningState(timer.state) && timer.expectedEndAt !== undefined) {
    return Math.max(0, timer.expectedEndAt - now);
  }
  if (isStageCompleteState(timer.state) || timer.state === 'session-complete') {
    return 0;
  }
  return Math.max(0, timer.remainingMs ?? timer.durationMs);
}

export function hasExpired(timer: BrewTimerSnapshot, now: number): boolean {
  return isRunningState(timer.state) && remainingMs(timer, now) === 0;
}

export function elapsedSinceCompletionMs(timer: BrewTimerSnapshot, now: number): number | null {
  if (
    !isStageCompleteState(timer.state) ||
    typeof timer.completedAt !== 'number' ||
    !Number.isFinite(timer.completedAt) ||
    timer.completedAt < 0
  ) {
    return null;
  }
  return Math.max(0, now - timer.completedAt);
}

export function startCountdown(
  durationMs: number,
  now: number,
  kind: 'rinse' | 'infusion',
): BrewTimerSnapshot {
  return {
    state: runningStateFor(kind),
    durationMs,
    remainingMs: durationMs,
    startedAt: now,
    expectedEndAt: now + durationMs,
  };
}

export function pauseCountdown(timer: BrewTimerSnapshot, now: number): BrewTimerSnapshot {
  const kind = stageKind(timer.state);
  if (!kind || !isRunningState(timer.state)) return timer;
  const left = remainingMs(timer, now);
  return {
    ...timer,
    state: pausedStateFor(kind),
    remainingMs: left,
    expectedEndAt: undefined,
  };
}

export function resumeCountdown(timer: BrewTimerSnapshot, now: number): BrewTimerSnapshot {
  const kind = stageKind(timer.state);
  if (!kind || !isPausedState(timer.state)) return timer;
  const left = Math.max(0, timer.remainingMs ?? timer.durationMs);
  if (left === 0) {
    return completeCountdown(timer, now);
  }
  return {
    ...timer,
    state: runningStateFor(kind),
    remainingMs: left,
    startedAt: now,
    expectedEndAt: now + left,
  };
}

export function adjustCountdown(
  timer: BrewTimerSnapshot,
  deltaMs: number,
  now: number,
): BrewTimerSnapshot {
  const kind = stageKind(timer.state);
  if (!kind) return timer;
  if (isStageCompleteState(timer.state) || timer.state === 'session-complete') return timer;

  const current = remainingMs(timer, now);
  const next = Math.max(0, current + deltaMs);
  const durationMs = Math.max(timer.durationMs, next);

  if (isRunningState(timer.state)) {
    if (next === 0) {
      return completeCountdown({ ...timer, durationMs }, now);
    }
    return {
      state: runningStateFor(kind),
      durationMs,
      remainingMs: next,
      startedAt: now,
      expectedEndAt: now + next,
    };
  }

  return {
    ...timer,
    durationMs,
    remainingMs: next,
    expectedEndAt: undefined,
  };
}

export function completeCountdown(
  timer: BrewTimerSnapshot,
  completedAt: number,
): BrewTimerSnapshot {
  const kind = stageKind(timer.state);
  if (!kind || isStageCompleteState(timer.state)) return timer;
  return {
    ...timer,
    state: completeStateFor(kind),
    remainingMs: 0,
    expectedEndAt: undefined,
    completedAt,
  };
}

export function readyCountdown(durationMs: number, kind: 'rinse' | 'infusion'): BrewTimerSnapshot {
  return {
    state: readyStateFor(kind),
    durationMs,
    remainingMs: durationMs,
    expectedEndAt: undefined,
    startedAt: undefined,
  };
}

export function syncCountdown(timer: BrewTimerSnapshot, now: number): BrewTimerSnapshot {
  if (!hasExpired(timer, now)) {
    if (isRunningState(timer.state)) {
      return { ...timer, remainingMs: remainingMs(timer, now) };
    }
    return timer;
  }
  return completeCountdown(timer, timer.expectedEndAt ?? now);
}
