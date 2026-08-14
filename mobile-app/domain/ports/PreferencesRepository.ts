export type ThemeMode = "auto" | "dark" | "light";
export type Language = "fr" | "en";

export type Preferences = {
  themeMode: ThemeMode;
  language: Language;
};

/** Keeps the user's app-wide choices across restarts. */
export interface PreferencesRepository {
  /** One call, because it sits on the boot path: key-by-key reads paint the default theme first. */
  load(): Promise<Partial<Preferences>>;
  save(patch: Partial<Preferences>): Promise<void>;
}
