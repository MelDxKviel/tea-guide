import { t, vesselLabel } from '../i18n';
import { calculateRecipeGrams, displayGrams, formatGrams, validateVolume } from '../lib/brewing/calculate';
import { createSession } from '../lib/brewing/session';
import { VOLUME_PRESETS_ML, type BrewingRecipe, type GongfuVessel, type Strength } from '../lib/brewing/types';
import { loadPreferences, savePreferences } from '../lib/storage/preferences';
import { pushRecent } from '../lib/storage/recent';
import { saveSession } from '../lib/storage/session';
import { sessionPath } from '../lib/urls';
import { unlockAudio } from './signals';

interface SetupPayload {
  teaId: string;
  teaSlug: string;
  teaName: string;
  recipes: BrewingRecipe[];
  lastVolumeMl?: number | null;
}

export function mountBrewSetup(): void {
  const root = document.querySelector<HTMLElement>('[data-brew-setup]');
  if (!root) return;
  const raw = root.querySelector('[data-brew-payload]')?.textContent;
  if (!raw) return;
  const payload = JSON.parse(raw) as SetupPayload;
  const gongfu = payload.recipes.filter((recipe) => recipe.method === 'gongfu');
  if (gongfu.length === 0) return;

  const dialog = root.querySelector<HTMLDialogElement>('dialog');
  const openers = document.querySelectorAll<HTMLElement>('[data-open-brew]');
  const vesselBox = root.querySelector<HTMLElement>('[data-vessel-choices]');
  const volumeBox = root.querySelector<HTMLElement>('[data-volume-choices]');
  const strengthBox = root.querySelector<HTMLElement>('[data-strength-choices]');
  const customInput = root.querySelector<HTMLInputElement>('[data-custom-volume]');
  const preview = root.querySelector<HTMLElement>('[data-preview]');
  const warning = root.querySelector<HTMLElement>('[data-volume-warning]');
  const start = root.querySelector<HTMLButtonElement>('[data-start-session]');
  if (!dialog || !vesselBox || !volumeBox || !strengthBox || !customInput || !preview || !warning || !start) {
    return;
  }

  const vessels = [...new Set(gongfu.map((recipe) => recipe.vessel).filter(Boolean))] as GongfuVessel[];
  let vessel: GongfuVessel = vessels[0] ?? 'gaiwan';
  const remembered = payload.lastVolumeMl ?? loadPreferences().lastVolumeMl;
  let volume = remembered && remembered > 0 ? remembered : gongfu[0].referenceVolumeMl;
  let strength: Strength = 'normal';
  let customMode = !VOLUME_PRESETS_ML.includes(volume as (typeof VOLUME_PRESETS_ML)[number]);
  let opener: HTMLElement | null = null;

  const currentRecipe = (): BrewingRecipe =>
    gongfu.find((recipe) => recipe.vessel === vessel) ?? gongfu[0];

  const renderChoices = (): void => {
    vesselBox.hidden = vessels.length < 2;
    vesselBox.innerHTML = vessels
      .map(
        (item) =>
          `<button type="button" class="choice" data-vessel="${item}" aria-pressed="${item === vessel}">${vesselLabel(item)}</button>`,
      )
      .join('');
    volumeBox.innerHTML = [
      ...VOLUME_PRESETS_ML.map((item: number) => {
        return `<button type="button" class="choice" data-volume="${item}" aria-pressed="${!customMode && item === volume}">${item}</button>`;
      }),
      `<button type="button" class="choice" data-volume="other" aria-pressed="${customMode}">${t('brew.volume.other')}</button>`,
    ].join('');
    strengthBox.innerHTML = (['soft', 'normal', 'strong'] as Strength[])
      .map(
        (item) =>
          `<button type="button" class="choice" data-strength="${item}" aria-pressed="${item === strength}">${t(`brew.strength.${item}`)}</button>`,
      )
      .join('');
    const wasCustomHidden = customInput.hidden;
    customInput.hidden = !customMode;
    if (customMode) {
      customInput.value = String(volume || '');
      if (wasCustomHidden) customInput.focus();
    }
    updatePreview();
  };

  const updatePreview = (): void => {
    const recipe = currentRecipe();
    const check = validateVolume(String(volume), 'gongfu');
    warning.hidden = true;
    warning.textContent = '';
    if (!check.ok) {
      start.disabled = true;
      preview.innerHTML = `<p class="notice notice--warn">${check.error ? t(`brew.volume.error.${check.error}`) : ''}</p>`;
      return;
    }
    if (check.warning) {
      warning.hidden = false;
      warning.textContent = t(`brew.volume.warning.${check.warning}`);
    }
    start.disabled = false;
    const grams = displayGrams(calculateRecipeGrams(recipe, check.value!, strength));
    const infusions = recipe.infusions?.length ?? 0;
    const temp = recipe.temperature?.recommendedCelsius;
    preview.innerHTML = `
      <div class="calc-result">
        <p class="kicker">${t('brew.result')}</p>
        <div class="preview-stats">
          <div class="stat"><dt>Лист</dt><dd>${t('brew.grams', { n: formatGrams(grams) })}</dd></div>
          <div class="stat"><dt>Вода</dt><dd>${temp ? t('brew.temp', { n: temp }) : '—'}</dd></div>
          <div class="stat"><dt>Проливы</dt><dd>${t('brew.infusionCount', { n: infusions })}</dd></div>
        </div>
      </div>
    `;
  };

  const unlockPage = (): void => {
    document.body.classList.remove('is-locked');
    opener?.focus();
  };

  openers.forEach((button) => {
    button.addEventListener('click', () => {
      opener = button;
      document.body.classList.add('is-locked');
      dialog.showModal();
      renderChoices();
    });
  });

  dialog.addEventListener('close', unlockPage);
  root.querySelector('[data-close-brew]')?.addEventListener('click', () => dialog.close());

  vesselBox.addEventListener('click', (event) => {
    const target = (event.target as HTMLElement).closest<HTMLElement>('[data-vessel]');
    if (!target?.dataset.vessel) return;
    vessel = target.dataset.vessel as GongfuVessel;
    renderChoices();
  });

  volumeBox.addEventListener('click', (event) => {
    const target = (event.target as HTMLElement).closest<HTMLElement>('[data-volume]');
    if (!target?.dataset.volume) return;
    if (target.dataset.volume === 'other') {
      customMode = true;
    } else {
      customMode = false;
      volume = Number(target.dataset.volume);
    }
    renderChoices();
  });

  customInput.addEventListener('input', () => {
    volume = Number(customInput.value.replace(',', '.')) || 0;
    updatePreview();
  });

  strengthBox.addEventListener('click', (event) => {
    const target = (event.target as HTMLElement).closest<HTMLElement>('[data-strength]');
    if (!target?.dataset.strength) return;
    strength = target.dataset.strength as Strength;
    renderChoices();
  });

  start.addEventListener('click', () => {
    const recipe = currentRecipe();
    const check = validateVolume(String(volume), 'gongfu');
    if (!check.ok || check.value === null) return;
    unlockAudio();
    const session = createSession({
      teaId: payload.teaId,
      teaSlug: payload.teaSlug,
      teaName: payload.teaName,
      recipe,
      volumeMl: check.value,
      strength,
      vessel: recipe.vessel,
    });
    saveSession(session);
    savePreferences({ lastVolumeMl: check.value });
    pushRecent({
      teaId: payload.teaId,
      slug: payload.teaSlug,
      name: payload.teaName,
      vessel: recipe.vessel,
      volumeMl: check.value,
    });
    location.href = sessionPath();
  });
}
