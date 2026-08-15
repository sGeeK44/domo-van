import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { I18nextProvider } from "react-i18next";
import { createI18n } from "@/i18n/createI18n";
import { DEFAULT_LANGUAGE, type Language } from "@/i18n/language";

type LanguageContextType = {
  language: Language;
  setLanguage: (language: Language) => void;
};

const LanguageContext = createContext<LanguageContextType | null>(null);

export type LanguageProviderProps = {
  children: ReactNode;
  /** Resolved before the first paint, so no frame is painted in a language the user replaced. */
  initialLanguage?: Language;
  /** Where the language is persisted — the provider knows nothing of the store. */
  onLanguageChange?: (language: Language) => void;
};

export function LanguageProvider({
  children,
  initialLanguage = DEFAULT_LANGUAGE,
  onLanguageChange,
}: LanguageProviderProps) {
  const [i18n] = useState(() => createI18n(initialLanguage));
  const [language, setStoredLanguage] = useState<Language>(initialLanguage);

  const setLanguage = useCallback(
    (next: Language) => {
      setStoredLanguage(next);
      void i18n.changeLanguage(next);
      onLanguageChange?.(next);
    },
    [i18n, onLanguageChange],
  );

  const value = useMemo(
    () => ({ language, setLanguage }),
    [language, setLanguage],
  );

  return (
    <LanguageContext.Provider value={value}>
      <I18nextProvider i18n={i18n}>{children}</I18nextProvider>
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextType {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
