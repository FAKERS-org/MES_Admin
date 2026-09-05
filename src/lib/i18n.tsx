import React, { createContext, useContext, useEffect, useState } from "react";
import kh from "@/locales/kh.json";
import en from "@/locales/en.json";
import { LANGUAGE_CONFIG } from "@/config";

export type Lang = typeof LANGUAGE_CONFIG.supportedLanguages[number];

export const translations: Record<Lang, Record<string, string>> = { kh, en };

export type TranslationKey = keyof typeof kh;

export type TranslateFn = (
  key: TranslationKey,
  params?: Record<string, string | number>,
) => string;

interface LanguageContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  toggleLang: () => void;
  t: TranslateFn;
}

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

const LANG_KEY = LANGUAGE_CONFIG.storageKey;

function getInitialLang(): Lang {
  if (typeof window === "undefined") return LANGUAGE_CONFIG.defaultLanguage;
  const stored = window.localStorage.getItem(LANG_KEY);
  if (LANGUAGE_CONFIG.supportedLanguages.includes(stored as Lang)) {
    return stored as Lang;
  }
  return LANGUAGE_CONFIG.defaultLanguage;
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<Lang>(getInitialLang);

  useEffect(() => {
    window.localStorage.setItem(LANG_KEY, lang);
    document.documentElement.style.setProperty(
      "--font-current",
      lang === "en" ? "var(--font-lexend)" : "var(--font-sans)"
    );
  }, [lang]);

  const t: TranslateFn = (key, params) => {
    let str =
      translations[lang][key] ?? translations[LANGUAGE_CONFIG.defaultLanguage][key] ?? key;
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        str = str.replace(`{${k}}`, String(v));
      }
    }
    return str;
  };

  const toggleLang = () =>
    setLang((l) =>
      l === LANGUAGE_CONFIG.supportedLanguages[0]
        ? LANGUAGE_CONFIG.supportedLanguages[1]
        : LANGUAGE_CONFIG.supportedLanguages[0]
    );

  return (
    <LanguageContext.Provider value={{ lang, setLang, toggleLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx)
    throw new Error(
      "useLanguage must be used within LanguageProvider. Make sure the component is wrapped in <LanguageProvider>"
    );
  return ctx;
}
