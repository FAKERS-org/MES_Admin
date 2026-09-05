export const APP_CONFIG = {
  name: "MES Admin",
  version: "0.1.0",
  environment: process.env.NODE_ENV ?? "development",
  isProduction: process.env.NODE_ENV === "production",
} as const;

export const THEME_CONFIG = {
  storageKey: "theme",
  defaultTheme: "light" as const,
  darkClass: "dark",
} as const;

export const LANGUAGE_CONFIG = {
  storageKey: "lang",
  defaultLanguage: "kh" as const,
  supportedLanguages: ["kh", "en"] as const,
} as const;
