import { getLocales } from 'expo-localization';
import ja from './ja';
import en from './en';

type Locale = 'ja' | 'en';

const translations: Record<Locale, Record<string, string>> = { ja, en };

let currentLocale: Locale = 'ja';

/** Detect device locale and set it (falls back to 'ja') */
export function getLocale(): Locale {
  try {
    const locales = getLocales();
    const lang = locales?.[0]?.languageCode ?? 'ja';
    return lang === 'en' ? 'en' : 'ja';
  } catch {
    return 'ja';
  }
}

/** Initialize locale from device settings */
currentLocale = getLocale();

/** Translate a key, with optional interpolation: t('key', { count: 3 }) */
export function t(key: string, params?: Record<string, string | number>): string {
  let text = translations[currentLocale]?.[key] ?? translations.ja[key] ?? key;
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      text = text.replace(`{${k}}`, String(v));
    });
  }
  return text;
}

/** Manually set locale */
export function setLocale(locale: Locale): void {
  currentLocale = locale;
}

/** Get current locale */
export function getCurrentLocale(): Locale {
  return currentLocale;
}
