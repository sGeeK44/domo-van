// @vitest-environment jsdom
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import type { i18n } from "i18next";
import { useTranslation } from "react-i18next";
import { afterEach, describe, expect, it, vi } from "vitest";
import { setLocalesForTest } from "@/__mocks__/expo-localization";
import type {
  Language,
  PreferencesRepository,
} from "@/domain/ports/PreferencesRepository";
import { InMemoryPreferencesRepository } from "@/infrastructure/fake/InMemoryPreferencesRepository";

const { instances } = vi.hoisted(() => ({ instances: [] as i18n[] }));

vi.mock("@/i18n/createI18n", async () => {
  const actual =
    await vi.importActual<typeof import("@/i18n/createI18n")>(
      "@/i18n/createI18n",
    );

  return {
    createI18n(language: Language) {
      const instance = actual.createI18n(language);
      vi.spyOn(instance, "changeLanguage");
      instances.push(instance);
      return instance;
    },
  };
});

const { LanguageProvider, useLanguage } = await import(
  "@/composition/LanguageProvider"
);
const { useAppPreferences } = await import("@/composition/useAppPreferences");

let setLanguage: (language: Language) => void = () => {
  throw new Error("the language provider did not render");
};

function Probe() {
  const { t } = useTranslation();
  const language = useLanguage();
  setLanguage = language.setLanguage;

  return (
    <span data-testid="app">{`${language.language}:${t("dashboard.title")}`}</span>
  );
}

/** The wiring `app/_layout.tsx` performs: hydrate above the provider, persist below it. */
function Boot({ repository }: { repository: PreferencesRepository }) {
  const { hydrated, initialLanguage, saveLanguage } =
    useAppPreferences(repository);
  if (!hydrated) return <span data-testid="app">splash</span>;

  return (
    <LanguageProvider
      initialLanguage={initialLanguage}
      onLanguageChange={saveLanguage}
    >
      <Probe />
    </LanguageProvider>
  );
}

async function boot(repository: PreferencesRepository) {
  const { unmount } = render(<Boot repository={repository} />);
  await waitFor(() => expect(shown()).not.toBe("splash"));
  return unmount;
}

function shown(): string {
  return screen.getByTestId("app").textContent ?? "";
}

function switchesOf(instance: i18n): unknown[] {
  return vi.mocked(instance.changeLanguage).mock.calls.map(([next]) => next);
}

describe("the persisted language", () => {
  afterEach(() => {
    cleanup();
    instances.length = 0;
    setLocalesForTest([{ languageCode: "fr" }]);
  });

  it("switches the copy on a mounted screen, and comes back after a restart", async () => {
    const repository = new InMemoryPreferencesRepository();
    const save = vi.spyOn(repository, "save");
    const unmount = await boot(repository);
    expect(shown()).toBe("fr:Bord");

    await act(async () => setLanguage("en"));
    expect(shown()).toBe("en:Home");
    expect(save).toHaveBeenCalledWith({ language: "en" });
    unmount();

    await boot(repository);

    expect(shown()).toBe("en:Home");
  });

  it("builds its instance in the stored language instead of switching it after the first paint", async () => {
    await boot(new InMemoryPreferencesRepository({ language: "en" }));

    expect(shown()).toBe("en:Home");
    expect(switchesOf(instances[0])).toEqual([]);
  });

  it("holds the splash until the store answers, so no frame paints in the wrong language", async () => {
    const repository = new InMemoryPreferencesRepository({ language: "en" });

    render(<Boot repository={repository} />);
    expect(shown()).toBe("splash");

    await waitFor(() => expect(shown()).toBe("en:Home"));
  });

  it("falls back to the device locale when nothing is stored", async () => {
    setLocalesForTest([{ languageCode: "en" }]);

    await boot(new InMemoryPreferencesRepository());

    expect(shown()).toBe("en:Home");
  });

  it("falls back to French on a locale the app does not carry", async () => {
    setLocalesForTest([{ languageCode: "de" }]);

    await boot(new InMemoryPreferencesRepository());

    expect(shown()).toBe("fr:Bord");
  });

  it("survives a store that rejects", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const broken: PreferencesRepository = {
      load: () => Promise.reject(new Error("store unavailable")),
      save: () => Promise.reject(new Error("store unavailable")),
    };

    await boot(broken);
    expect(shown()).toBe("fr:Bord");

    await act(async () => setLanguage("en"));

    expect(shown()).toBe("en:Home");
    await waitFor(() => expect(warn).toHaveBeenCalledTimes(2));
    warn.mockRestore();
  });
});
