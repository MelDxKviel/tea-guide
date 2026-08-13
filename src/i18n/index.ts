import { ru, type MessageKey } from './ru';

const dictionaries = { ru } as const;

export type Locale = keyof typeof dictionaries;

export const defaultLocale: Locale = 'ru';

export function t(
  key: MessageKey | (string & {}),
  vars?: Record<string, string | number>,
  locale: Locale = defaultLocale,
): string {
  const table = dictionaries[locale] as Record<string, string>;
  const fallback = dictionaries[defaultLocale] as Record<string, string>;
  let template = table[key] ?? fallback[key] ?? key;
  if (vars) {
    for (const [name, value] of Object.entries(vars)) {
      template = template.replaceAll(`{${name}}`, String(value));
    }
  }
  return template;
}

export function vesselLabel(vessel: 'gaiwan' | 'yixing'): string {
  return t(`brew.vessel.${vessel}`);
}

export function methodLabel(method: 'gongfu' | 'western' | 'thermos' | 'cold_brew'): string {
  return t(`tea.method.${method}`);
}

export function strengthLabel(strength: 'soft' | 'normal' | 'strong'): string {
  return t(`brew.strength.${strength}`);
}

export function sourceCountLabel(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return t('tea.recipeSourcesCount.one', { n });
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return t('tea.recipeSourcesCount', { n });
  return t('tea.recipeSourcesCount.many', { n });
}
