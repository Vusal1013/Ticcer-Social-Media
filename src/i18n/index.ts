import az from './az';
import en from './en';
import ru from './ru';
import zh from './zh';
import es from './es';
import hi from './hi';
import ar from './ar';
import pt from './pt';
import fr from './fr';
import de from './de';
import ja from './ja';
import ko from './ko';
import tr from './tr';
import type { Locale } from '../types';

const translations: Record<Locale, Record<string, string | ((params: Record<string, string | number>) => string)>> = {
  az, en, ru, zh, es, hi, ar, pt, fr, de, ja, ko, tr,
};

let currentLocale: Locale = 'en';

export function setLocale(locale: Locale) {
  currentLocale = locale;
}

export function getLocale(): Locale {
  return currentLocale;
}

export function t(key: string, params?: Record<string, string | number>): string {
  const dict = translations[currentLocale] || translations.en;
  const val = dict[key];
  if (typeof val === 'function') return val(params || {});
  if (typeof val === 'string') return val;
  const fallback = translations.en[key];
  if (typeof fallback === 'function') return fallback(params || {});
  if (typeof fallback === 'string') return fallback;
  return key;
}

export function getLocaleLabel(locale: Locale): string {
  const labels: Record<Locale, string> = {
    az: 'Azərbaycan',
    en: 'English',
    ru: 'Русский',
    zh: '中文',
    es: 'Español',
    hi: 'हिन्दी',
    ar: 'العربية',
    pt: 'Português',
    fr: 'Français',
    de: 'Deutsch',
    ja: '日本語',
    ko: '한국어',
    tr: 'Türkçe',
  };
  return labels[locale] || locale;
}
