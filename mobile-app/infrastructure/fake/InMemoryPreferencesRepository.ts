import type {
  Preferences,
  PreferencesRepository,
} from "@/domain/ports/PreferencesRepository";

/** Keeps preferences for one run only, so fake mode never touches the device store. */
export class InMemoryPreferencesRepository implements PreferencesRepository {
  private preferences: Partial<Preferences>;

  constructor(initial: Partial<Preferences> = {}) {
    this.preferences = { ...initial };
  }

  async load(): Promise<Partial<Preferences>> {
    return { ...this.preferences };
  }

  async save(patch: Partial<Preferences>): Promise<void> {
    this.preferences = { ...this.preferences, ...patch };
  }
}
