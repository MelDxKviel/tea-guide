import { t, vesselLabel } from '../i18n';
import { formatDuration, formatDurationMs } from '../lib/brewing/calculate';
import { canExtend, nextExtensionSeconds } from '../lib/brewing/sequence';
import {
  currentNote,
  displayInfusionNumber,
  plannedDurations,
  reduceSession,
} from '../lib/brewing/session';
import {
  elapsedSinceCompletionMs,
  isPausedState,
  isReadyState,
  isRunningState,
  remainingMs,
} from '../lib/brewing/timer';
import type { BrewSession, BrewingRecipe, SessionAction } from '../lib/brewing/types';
import { loadPreferences, savePreferences, type UserPreferences } from '../lib/storage/preferences';
import { clearSession, loadSession, saveSession } from '../lib/storage/session';
import { catalogPath, teaPath } from '../lib/urls';
import { playCompleteSound, requestWakeLock, unlockAudio, vibrateComplete } from './signals';

export function mountTimerApp(): void {
  const root = document.querySelector<HTMLElement>('#timer-root');
  const raw = document.querySelector('#recipes-data')?.textContent;
  if (!root || !raw) return;

  let recipes: Record<string, BrewingRecipe>;
  try {
    recipes = JSON.parse(raw) as Record<string, BrewingRecipe>;
  } catch {
    root.innerHTML = emptyState('Не удалось прочитать рецепты.');
    return;
  }

  let session = loadSession();
  if (!session) {
    root.innerHTML = emptyState('Нет активного чаепития.');
    return;
  }

  const recipe = recipes[session.recipeId];
  if (!recipe) {
    root.innerHTML = emptyState('Рецепт для этой сессии не найден.');
    return;
  }

  let prefs = loadPreferences();
  let wake: WakeLockSentinel | null = null;
  let lastStage = session.stage;

  const dispatch = (action: SessionAction, now = Date.now()): void => {
    const next = reduceSession(session!, recipe, action, now);
    const completed =
      (lastStage.endsWith('running') ||
        lastStage.endsWith('paused') ||
        lastStage.endsWith('ready')) &&
      next.stage.endsWith('complete') &&
      next.stage !== lastStage;
    session = next;
    lastStage = next.stage;
    saveSession(next);
    if (completed) {
      if (prefs.sound) playCompleteSound();
      if (prefs.vibration) vibrateComplete();
    }
    render();
    void syncWakeLock();
  };

  const paintClock = (): void => {
    if (!session) return;
    const synced = reduceSession(session, recipe, { type: 'SYNC' }, Date.now());
    if (synced.stage !== session.stage) {
      session = synced;
      lastStage = synced.stage;
      saveSession(synced);
      if (synced.stage.endsWith('complete')) {
        if (prefs.sound) playCompleteSound();
        if (prefs.vibration) vibrateComplete();
      }
      render();
      return;
    }
    const clock = root.querySelector('[data-clock]');
    if (clock) clock.textContent = formatDurationMs(remainingMs(session.timer, Date.now()));
    const elapsed = root.querySelector('[data-elapsed]');
    const elapsedMs = elapsedSinceCompletionMs(session.timer, Date.now());
    if (elapsed && elapsedMs !== null) {
      elapsed.textContent = formatDuration(Math.floor(elapsedMs / 1000));
    }
  };

  const render = (): void => {
    if (!session) return;
    root.innerHTML = template(session, recipe, prefs);
    bind();
  };

  const bind = (): void => {
    root.querySelector('[data-act="start"]')?.addEventListener('click', () => {
      unlockAudio();
      dispatch({ type: 'START' });
    });
    root
      .querySelector('[data-act="pause"]')
      ?.addEventListener('click', () => dispatch({ type: 'PAUSE' }));
    root.querySelector('[data-act="resume"]')?.addEventListener('click', () => {
      unlockAudio();
      dispatch({ type: 'RESUME' });
    });
    root
      .querySelector('[data-act="advance"]')
      ?.addEventListener('click', () => dispatch({ type: 'ADVANCE' }));
    root.querySelector('[data-act="skip-stage"]')?.addEventListener('click', () => {
      if (!session) return;
      if (session.stage.startsWith('rinse')) {
        dispatch({ type: 'SKIP_RINSE' });
        return;
      }
      dispatch({ type: 'FINISH_STAGE' });
      dispatch({ type: 'ADVANCE' });
    });
    root
      .querySelector('[data-act="plus"]')
      ?.addEventListener('click', () => dispatch({ type: 'ADJUST', deltaMs: 5_000 }));
    root
      .querySelector('[data-act="minus"]')
      ?.addEventListener('click', () => dispatch({ type: 'ADJUST', deltaMs: -5_000 }));
    root
      .querySelector('[data-act="finish"]')
      ?.addEventListener('click', () => dispatch({ type: 'FINISH_STAGE' }));
    root
      .querySelector('[data-act="restart-stage"]')
      ?.addEventListener('click', () => dispatch({ type: 'RESTART_STAGE' }));
    root
      .querySelector('[data-act="prev"]')
      ?.addEventListener('click', () => dispatch({ type: 'PREV_INFUSION' }));
    root
      .querySelector('[data-act="next"]')
      ?.addEventListener('click', () => dispatch({ type: 'NEXT_INFUSION' }));
    root.querySelector('[data-act="end"]')?.addEventListener('click', () => {
      dispatch({ type: 'END_SESSION' });
      clearSession();
      render();
    });
    root
      .querySelector('[data-act="restart"]')
      ?.addEventListener('click', () => dispatch({ type: 'RESTART_SESSION' }));
    root
      .querySelector('[data-act="extend"]')
      ?.addEventListener('click', () => dispatch({ type: 'START_EXTENSION' }));
    root.querySelector('[data-pref="sound"]')?.addEventListener('click', () => {
      prefs = savePreferences({ sound: !prefs.sound });
      render();
    });
    root.querySelector('[data-pref="vibration"]')?.addEventListener('click', () => {
      prefs = savePreferences({ vibration: !prefs.vibration });
      render();
    });
    root.querySelector('[data-pref="wakeLock"]')?.addEventListener('click', () => {
      prefs = savePreferences({ wakeLock: !prefs.wakeLock });
      void syncWakeLock();
      render();
    });
  };

  const syncWakeLock = async (): Promise<void> => {
    const need = prefs.wakeLock && session && session.stage !== 'session-complete';
    if (!need) {
      try {
        await wake?.release();
      } catch {
        // ignore
      }
      wake = null;
      return;
    }
    if (wake) return;
    wake = await requestWakeLock();
  };

  document.addEventListener('visibilitychange', () => {
    dispatch({ type: 'SYNC' });
    if (document.visibilityState === 'visible') {
      wake = null;
      void syncWakeLock();
    }
  });

  document.addEventListener('keydown', (event) => {
    const target = event.target as HTMLElement | null;
    if (
      target &&
      (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
    ) {
      return;
    }
    if (event.code === 'Space') {
      event.preventDefault();
      if (!session) return;
      if (isRunningState(session.stage)) dispatch({ type: 'PAUSE' });
      else if (isPausedState(session.stage)) dispatch({ type: 'RESUME' });
      else if (isReadyState(session.stage)) dispatch({ type: 'START' });
      else if (session.stage.endsWith('complete') && session.stage !== 'session-complete')
        dispatch({ type: 'ADVANCE' });
    } else if (event.key === '+' || event.key === '=') {
      dispatch({ type: 'ADJUST', deltaMs: 5_000 });
    } else if (event.key === '-' || event.key === '_') {
      dispatch({ type: 'ADJUST', deltaMs: -5_000 });
    } else if (event.key === 'ArrowRight') {
      if (session?.stage.endsWith('complete')) dispatch({ type: 'ADVANCE' });
      else dispatch({ type: 'NEXT_INFUSION' });
    }
  });

  dispatch({ type: 'SYNC' });
  const frame = (): void => {
    paintClock();
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
  void syncWakeLock();
}

function emptyState(message: string): string {
  return `
    <main class="timer-shell timer-shell--empty">
      <div class="timer-finish">
        <p class="timer-kicker">${t('timer.label')}</p>
        <h1 class="timer-name">${message}</h1>
        <a class="btn timer-main" href="${catalogPath()}">К каталогу</a>
      </div>
    </main>
  `;
}

function template(session: BrewSession, recipe: BrewingRecipe, prefs: UserPreferences): string {
  if (session.stage === 'session-complete') {
    const extra = canExtend(recipe)
      ? `<p class="timer-finish__note">${t('timer.canExtend')}</p>
         <button class="btn timer-main" type="button" data-act="extend">${t('timer.moreInfusion', { n: nextExtensionSeconds(recipe, session.extensionCount) ?? '' })}</button>`
      : '';
    return `
      <main class="timer-shell timer-shell--complete">
        <header class="timer-header">
          <p class="timer-kicker">${t('timer.label')}</p>
          <a class="timer-back" href="${teaPath(session.teaSlug)}"><span aria-hidden="true">←</span> ${t('timer.backToTea')}</a>
        </header>
        <div class="timer-finish">
          <div class="timer-finish__mark" aria-hidden="true">✓</div>
          <p class="timer-stage">${t('timer.sessionDone')}</p>
          <h1 class="timer-name">${session.teaName}</h1>
          <p class="timer-finish__summary">${session.totalInfusions} проливов · ${session.leafGrams} г · ${session.volumeMl} мл${session.vessel ? ` · ${vesselLabel(session.vessel)}` : ''}${session.temperature ? ` · ${session.temperature.recommendedCelsius}°C` : ''}</p>
          ${extra}
          <div class="timer-finish__actions">
            <button class="btn" type="button" data-act="restart">${t('timer.brewAgain')}</button>
            <a class="btn btn--ghost" href="${teaPath(session.teaSlug)}">${t('timer.backToTea')}</a>
          </div>
        </div>
      </main>
    `;
  }

  const rinse = session.stage.startsWith('rinse');
  const ready = isReadyState(session.stage);
  const running = isRunningState(session.stage);
  const paused = isPausedState(session.stage);
  const complete = session.stage.endsWith('complete');
  const elapsedMs = elapsedSinceCompletionMs(session.timer, Date.now());
  const note = currentNote(session, recipe);
  const stageLabel = rinse
    ? t('timer.rinse')
    : session.isExtension
      ? t('timer.extension')
      : t('timer.infusionOf', {
          current: displayInfusionNumber(session),
          total: session.totalInfusions,
        });

  let primary = '';
  let secondary = '';
  if (ready && rinse) {
    primary = `<button class="btn timer-main" type="button" data-act="start" data-testid="start-stage">${t('timer.startRinse')}</button>`;
  } else if (ready) {
    primary = `<button class="btn timer-main" type="button" data-act="start" data-testid="start-stage">${t('timer.start')}</button>`;
  } else if (running) {
    primary = `<button class="btn timer-main" type="button" data-act="pause" data-testid="pause">${t('timer.pause')}</button>`;
  } else if (paused) {
    primary = `<button class="btn timer-main" type="button" data-act="resume" data-testid="resume">${t('timer.resume')}</button>`;
  } else if (complete && rinse) {
    primary = `<button class="btn timer-main" type="button" data-act="advance" data-testid="advance">${t('timer.toFirst')}</button>`;
  } else if (complete) {
    primary = `<button class="btn timer-main" type="button" data-act="advance" data-testid="advance">${t('timer.nextInfusion')}</button>`;
  }

  if (!complete) {
    secondary = rinse
      ? `<button class="btn timer-secondary" type="button" data-act="skip-stage" data-testid="skip-rinse">${t('timer.skipRinse')}</button>`
      : `<button class="btn timer-secondary" type="button" data-act="skip-stage" data-testid="skip-infusion">${t('timer.skipInfusion')}</button>`;
  }

  const status = complete
    ? rinse
      ? `${t('timer.rinseComplete')}. ${t('timer.rinseDrain')}`
      : t('timer.complete')
    : (note ?? (paused ? t('timer.paused') : running ? t('timer.running') : t('timer.ready')));

  const track = plannedDurations(recipe)
    .map((seconds: number, index: number) => {
      const cls =
        index < session.currentInfusionIndex
          ? 'is-done'
          : index === session.currentInfusionIndex && !rinse
            ? 'is-now'
            : '';
      return `<li class="${cls}"><span>${index + 1}</span><strong>${seconds}<small>с</small></strong></li>`;
    })
    .join('');

  const vibrateSupported =
    typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';

  return `
    <main class="timer-shell">
      <header class="timer-header">
        <p class="timer-kicker">${t('timer.label')}</p>
        <div class="timer-top">
          <a class="timer-back" href="${teaPath(session.teaSlug)}"><span aria-hidden="true">←</span> ${session.teaName}</a>
          <div class="timer-meta" aria-label="Параметры заваривания">
            <span>${session.leafGrams} г</span>
            <span>${session.volumeMl} мл</span>
            ${session.temperature ? `<span>${session.temperature.recommendedCelsius}°C</span>` : ''}
          </div>
        </div>
      </header>
      <section class="timer-clock" aria-labelledby="timer-stage-label">
        <p class="timer-stage" id="timer-stage-label">${stageLabel}</p>
        <div class="timer-well ${running ? 'is-running' : ''} ${paused ? 'is-paused' : ''} ${complete ? 'is-complete' : ''}">
          <div class="timer-digits" data-clock data-testid="clock">${formatDurationMs(remainingMs(session.timer, Date.now()))}</div>
        </div>
        <p class="timer-status ${complete ? 'is-done' : ''}" aria-live="assertive">${status}</p>
        ${
          elapsedMs !== null
            ? `<p class="timer-elapsed">${t('timer.sinceComplete')} <span data-elapsed>${formatDuration(Math.floor(elapsedMs / 1000))}</span></p>`
            : ''
        }
      </section>
      <section class="timer-actions" aria-label="${t('timer.controls')}">
        ${primary}
        <div class="timer-adjust-slot">
          ${
            running || paused || ready
              ? `<div class="timer-adjust" aria-label="${t('timer.adjust')}">
                  <button class="btn" type="button" data-act="minus" aria-label="${t('timer.minus5')}">${t('timer.minus5')}</button>
                  <button class="btn" type="button" data-act="plus" aria-label="${t('timer.plus5')}">${t('timer.plus5')}</button>
                </div>`
              : ''
          }
        </div>
        <div class="timer-secondary-slot">${secondary}</div>
      </section>
      <section class="timer-track-wrap" aria-labelledby="timer-plan-title">
        <h2 id="timer-plan-title">${t('timer.plan')}</h2>
        <ol class="timer-track">${track}</ol>
      </section>
      <details class="timer-more">
        <summary>${t('timer.more')}</summary>
        <div class="timer-more__actions">
          <button class="btn" type="button" data-act="restart-stage">${t('timer.restartStage')}</button>
          <button class="btn" type="button" data-act="finish">${t('timer.finishNow')}</button>
          <button class="btn" type="button" data-act="prev">${t('timer.prev')}</button>
          <button class="btn" type="button" data-act="next">${t('timer.next')}</button>
          <button class="btn" type="button" data-act="end">${t('timer.end')}</button>
          <button class="btn" type="button" data-act="restart">${t('timer.restart')}</button>
        </div>
        <div class="prefs">
          <label>${t('timer.sound')} <button type="button" class="choice" data-pref="sound">${prefs.sound ? t('timer.on') : t('timer.off')}</button></label>
          ${
            vibrateSupported
              ? `<label>${t('timer.vibration')} <button type="button" class="choice" data-pref="vibration">${prefs.vibration ? t('timer.on') : t('timer.off')}</button></label>`
              : ''
          }
          <label>${t('timer.wakeLock')} <button type="button" class="choice" data-pref="wakeLock">${prefs.wakeLock ? t('timer.on') : t('timer.off')}</button></label>
          <p>${t('timer.shortcuts')}</p>
        </div>
      </details>
    </main>
  `;
}
