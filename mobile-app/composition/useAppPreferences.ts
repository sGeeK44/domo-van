import { useCallback, useEffect, useRef, useState } from "react";
import type {
  Language,
  Preferences,
  PreferencesRepository,
  ThemeMode,
} from "@/domain/ports/PreferencesRepository";
import { deviceLanguage } from "@/i18n/language";

const DEFAULT_THEME_MODE: ThemeMode = "auto";

export type AppPreferences = {
  hydrated: boolean;
  /** Only ever the stored value: the live mode belongs to the theme provider. */
  initialThemeMode: ThemeMode;
  /** Only ever the stored value: the live language belongs to the language provider. */
  initialLanguage: Language;
  saveThemeMode: (mode: ThemeMode) => void;
  saveLanguage: (language: Language) => void;
};

type StoredPreferences = Omit<AppPreferences, "saveThemeMode" | "saveLanguage">;

function storedOrDefault(
  stored: Partial<Preferences>,
): Omit<StoredPreferences, "hydrated"> {
  return {
    initialThemeMode: stored.themeMode ?? DEFAULT_THEME_MODE,
    initialLanguage: stored.language ?? deviceLanguage(),
  };
}

/** Reads the stored preferences once, and writes a new one through without waiting. */
export function useAppPreferences(
  repository: PreferencesRepository,
): AppPreferences {
  const [stored, setStored] = useState<StoredPreferences>(() => ({
    hydrated: false,
    ...storedOrDefault({}),
  }));
  const repositoryAtBoot = useRef(repository);

  useEffect(() => {
    let cancelled = false;
    const hydrate = (loaded: Partial<Preferences>) => {
      if (!cancelled) setStored({ hydrated: true, ...storedOrDefault(loaded) });
    };

    repositoryAtBoot.current
      .load()
      .then(hydrate)
      .catch((error) => {
        console.warn("Failed to read the stored preferences:", error);
        hydrate({});
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const persist = useCallback(
    (patch: Partial<Preferences>) => {
      // A preference that fails to persist must not surface as a crash.
      repository.save(patch).catch((error) => {
        console.warn("Failed to persist the preferences:", error);
      });
    },
    [repository],
  );

  const saveThemeMode = useCallback(
    (themeMode: ThemeMode) => persist({ themeMode }),
    [persist],
  );
  const saveLanguage = useCallback(
    (language: Language) => persist({ language }),
    [persist],
  );

  return { ...stored, saveThemeMode, saveLanguage };
}
