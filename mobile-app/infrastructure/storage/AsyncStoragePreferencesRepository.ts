import AsyncStorage from "@react-native-async-storage/async-storage";
import type {
  Language,
  Preferences,
  PreferencesRepository,
  ThemeMode,
} from "@/domain/ports/PreferencesRepository";

const THEME_MODE_KEY = "preferences.themeMode";
const LANGUAGE_KEY = "preferences.language";

const THEME_MODES: readonly ThemeMode[] = ["auto", "dark", "light"];
const LANGUAGES: readonly Language[] = ["fr", "en"];

/** Drops anything it does not recognise: a corrupt value must not brick the boot. */
function known<T extends string>(
  stored: string | null | undefined,
  allowed: readonly T[],
): T | undefined {
  return allowed.find((value) => value === stored);
}

/** Persists preferences in the device's unencrypted key-value store. */
export class AsyncStoragePreferencesRepository
  implements PreferencesRepository
{
  async load(): Promise<Partial<Preferences>> {
    const entries = await AsyncStorage.multiGet([THEME_MODE_KEY, LANGUAGE_KEY]);
    const stored = new Map(entries);

    const themeMode = known(stored.get(THEME_MODE_KEY), THEME_MODES);
    const language = known(stored.get(LANGUAGE_KEY), LANGUAGES);

    return {
      ...(themeMode && { themeMode }),
      ...(language && { language }),
    };
  }

  async save(patch: Partial<Preferences>): Promise<void> {
    const pairs: [string, string][] = [];
    if (patch.themeMode) pairs.push([THEME_MODE_KEY, patch.themeMode]);
    if (patch.language) pairs.push([LANGUAGE_KEY, patch.language]);
    if (pairs.length === 0) return;
    await AsyncStorage.multiSet(pairs);
  }
}
