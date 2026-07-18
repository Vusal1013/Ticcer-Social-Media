import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';
import { setLocale as setI18nLocale, t as translate } from './index';
import type { Locale } from '../types';

const SUPPORTED_LOCALES: Locale[] = ['az', 'en', 'ru', 'zh', 'es', 'hi', 'ar', 'pt', 'fr', 'de', 'ja', 'ko', 'tr'];
const LANG_STORAGE_KEY = 'ticcer_selected_language';

function detectDeviceLanguage(): Locale {
  try {
    const deviceLocales = Localization.getLocales();
    if (deviceLocales && deviceLocales.length > 0) {
      const deviceLang = deviceLocales[0].languageCode?.toLowerCase();
      if (deviceLang) {
        const matched = SUPPORTED_LOCALES.find(l => l === deviceLang);
        if (matched) return matched;
      }
    }
  } catch {}
  return 'en';
}

type LanguageContextType = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  deviceLocale: Locale;
  isAuto: boolean;
  setAuto: () => void;
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const deviceLang = detectDeviceLanguage();
  const [locale, setLocaleState] = useState<Locale>(deviceLang);
  const [isAuto, setIsAuto] = useState(true);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(LANG_STORAGE_KEY);
        if (saved && SUPPORTED_LOCALES.includes(saved as Locale)) {
          setLocaleState(saved as Locale);
          setI18nLocale(saved as Locale);
          setIsAuto(false);
        } else {
          setI18nLocale(deviceLang);
        }
      } catch {
        setI18nLocale(deviceLang);
      }
      setReady(true);
    })();
  }, []);

  const setLocale = useCallback(async (l: Locale) => {
    setLocaleState(l);
    setI18nLocale(l);
    setIsAuto(false);
    try {
      await AsyncStorage.setItem(LANG_STORAGE_KEY, l);
    } catch {}
  }, []);

  const setAuto = useCallback(async () => {
    setLocaleState(deviceLang);
    setI18nLocale(deviceLang);
    setIsAuto(true);
    try {
      await AsyncStorage.removeItem(LANG_STORAGE_KEY);
    } catch {}
  }, [deviceLang]);

  const t = useCallback((key: string, params?: Record<string, string | number>) => {
    return translate(key, params);
  }, [locale]);

  if (!ready) return null;

  return (
    <LanguageContext.Provider value={{ locale, setLocale, t, deviceLocale: deviceLang, isAuto, setAuto }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used within LanguageProvider');
  return context;
}
