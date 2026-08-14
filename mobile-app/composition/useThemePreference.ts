import { useCallback, useEffect, useRef, useState } from "react";
import type {
  PreferencesRepository,
  ThemeMode,
} from "@/domain/ports/PreferencesRepository";

const DEFAULT_THEME_MODE: ThemeMode = "auto";

export type ThemePreference = {
  hydrated: boolean;
  /** Only ever the stored value: the live mode belongs to the theme provider. */
  initialThemeMode: ThemeMode;
  saveThemeMode: (mode: ThemeMode) => void;
};

/** Reads the stored theme mode once, and writes a new one through without waiting. */
export function useThemePreference(
  repository: PreferencesRepository,
): ThemePreference {
  const [stored, setStored] = useState<Omit<ThemePreference, "saveThemeMode">>({
    hydrated: false,
    initialThemeMode: DEFAULT_THEME_MODE,
  });
  const repositoryAtBoot = useRef(repository);

  useEffect(() => {
    let cancelled = false;
    const hydrate = (initialThemeMode: ThemeMode) => {
      if (!cancelled) setStored({ hydrated: true, initialThemeMode });
    };

    repositoryAtBoot.current
      .load()
      .then(({ themeMode }) => hydrate(themeMode ?? DEFAULT_THEME_MODE))
      .catch((error) => {
        console.warn("Failed to read the stored preferences:", error);
        hydrate(DEFAULT_THEME_MODE);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const saveThemeMode = useCallback(
    (themeMode: ThemeMode) => {
      // A preference that fails to persist must not surface as a crash.
      repository.save({ themeMode }).catch((error) => {
        console.warn("Failed to persist the theme mode:", error);
      });
    },
    [repository],
  );

  return { ...stored, saveThemeMode };
}
