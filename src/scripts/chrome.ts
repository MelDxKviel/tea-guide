import { t } from '../i18n';
import { applySync } from '../lib/brewing/session';
import { dismissRecovery, isRecoveryDismissed, isSessionActive, loadSession } from '../lib/storage/session';
import { sessionPath, teaPath } from '../lib/urls';

export function hydrateChrome(): void {
  const session = loadSession();
  const chip = document.querySelector<HTMLAnchorElement>('[data-session-chip]');
  const recovery = document.querySelector<HTMLElement>('[data-recovery]');
  if (!session || !isSessionActive(session)) {
    chip?.setAttribute('hidden', '');
    recovery?.setAttribute('hidden', '');
    return;
  }

  const now = Date.now();
  const synced = applySync(session, now);
  const label =
    synced.stage.startsWith('rinse')
      ? `${synced.teaName} · ${t('timer.rinse')}`
      : `${synced.teaName} · ${t('timer.infusionOf', { current: synced.currentInfusionIndex + 1, total: synced.totalInfusions })}`;

  if (chip) {
    const text = chip.querySelector('[data-session-chip-label]');
    if (text) text.textContent = label;
    chip.href = sessionPath();
    chip.hidden = false;
    chip.classList.add('is-visible');
  }

  const onSessionPage = location.pathname.replace(/\/+$/, '').endsWith('/session');
  if (recovery && !onSessionPage && !isRecoveryDismissed(synced)) {
    const recLabel = recovery.querySelector('[data-recovery-label]');
    if (recLabel) recLabel.textContent = label;
    recovery.hidden = false;
    recovery.classList.add('is-visible');
    recovery.querySelector('[data-recovery-dismiss]')?.addEventListener('click', () => {
      dismissRecovery(synced);
      recovery.hidden = true;
      recovery.classList.remove('is-visible');
    });
    recovery.querySelector('[data-recovery-restart]')?.addEventListener('click', () => {
      location.href = teaPath(synced.teaSlug);
    });
  }
}
