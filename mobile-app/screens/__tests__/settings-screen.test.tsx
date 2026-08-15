// @vitest-environment jsdom
import { act, cleanup, fireEvent, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// createContainer reads this switch at import time, hence the dynamic imports below.
process.env.EXPO_PUBLIC_FAKE_BLE = "1";

// The OS reports dark throughout, so only the picker can make the palette light.
let systemScheme: "light" | "dark" = "dark";
vi.mock("react-native", async () => ({
  ...(await vi.importActual<typeof import("@/__mocks__/react-native")>(
    "react-native",
  )),
  useColorScheme: () => systemScheme,
}));

const { pairOnly, renderModuleScreen } = await import("./moduleScreenHarness");
const { default: SettingsScreen } = await import("@/screens/settings-screen");
const { LanguageProvider } = await import("@/composition/LanguageProvider");
const { useAppPreferences } = await import("@/composition/useAppPreferences");
const { ThemeProvider, Colors, Opacity } = await import("@/design-system");
const { InMemoryPreferencesRepository } = await import(
  "@/infrastructure/fake/InMemoryPreferencesRepository"
);
const { setExpoConfigForTest } = await import("@/__mocks__/expo-constants");
const { resetNavigation, routerHistory } = await import(
  "@/__mocks__/expo-router"
);

type Preferences = InstanceType<typeof InMemoryPreferencesRepository>;

/** The wiring `app/_layout.tsx` performs: hydrate above the providers, persist below them. */
function Boot({ repository }: { repository: Preferences }) {
  const {
    hydrated,
    initialThemeMode,
    initialLanguage,
    saveThemeMode,
    saveLanguage,
  } = useAppPreferences(repository);
  if (!hydrated) return null;

  return (
    <ThemeProvider initialMode={initialThemeMode} onModeChange={saveThemeMode}>
      <LanguageProvider
        initialLanguage={initialLanguage}
        onLanguageChange={saveLanguage}
      >
        <SettingsScreen />
      </LanguageProvider>
    </ThemeProvider>
  );
}

async function openSettings(
  repository: Preferences,
  paired: readonly ("water" | "heater" | "battery")[] = ["water"],
) {
  const harness = renderModuleScreen(<Boot repository={repository} />);
  await pairOnly(harness, paired);
  await screen.findByTestId("settings-row-water");
}

function press(testID: string) {
  return act(async () => {
    fireEvent.click(screen.getByTestId(testID));
  });
}

/** The palette is written in hex; the DOM answers in rgb(). */
function rgb(hex: string): string {
  const [red, green, blue] = [1, 3, 5].map((start) =>
    Number.parseInt(hex.slice(start, start + 2), 16),
  );
  return `rgb(${red}, ${green}, ${blue})`;
}

function groupInk(): string {
  return window.getComputedStyle(screen.getByText("MODULES")).color;
}

describe("the Réglages screen", () => {
  beforeEach(() => {
    systemScheme = "dark";
    setExpoConfigForTest({ version: "1.4.0" });
  });

  afterEach(() => {
    cleanup();
    resetNavigation();
    vi.restoreAllMocks();
  });

  // Acceptance example 7, end to end: the picker is what makes the switch reachable.
  it("switches the whole screen to English on the press, and reads it back after a restart", async () => {
    const repository = new InMemoryPreferencesRepository();
    const save = vi.spyOn(repository, "save");
    await openSettings(repository);
    expect(screen.getByText("Réglages")).toBeTruthy();

    await press("segment-en");

    expect(screen.getByText("Settings")).toBeTruthy();
    expect(screen.getByText("Paired modules")).toBeTruthy();
    expect(save).toHaveBeenCalledWith({ language: "en" });

    cleanup();
    await openSettings(repository);

    expect(screen.getByText("Settings")).toBeTruthy();
  });

  it("repaints on the chosen theme and hands the OS the palette back on Auto", async () => {
    const repository = new InMemoryPreferencesRepository();
    const save = vi.spyOn(repository, "save");
    await openSettings(repository);
    expect(groupInk()).toBe(rgb(Colors.dark.textMuted));

    await press("segment-light");

    expect(groupInk()).toBe(rgb(Colors.light.textMuted));
    expect(save).toHaveBeenCalledWith({ themeMode: "light" });

    await press("segment-auto");

    expect(groupInk()).toBe(rgb(Colors.dark.textMuted));
    expect(save).toHaveBeenLastCalledWith({ themeMode: "auto" });
  });

  it("opens the three forms and the Modules list from their rows", async () => {
    await openSettings(new InMemoryPreferencesRepository(), [
      "water",
      "heater",
      "battery",
    ]);

    await press("settings-row-modules");
    await press("settings-row-water");
    await press("settings-row-heater");
    await press("settings-row-battery");

    expect(routerHistory).toEqual([
      { method: "push", href: "/modules" },
      { method: "push", href: "/settings/water-tanks" },
      { method: "push", href: "/settings/heater-pid" },
      { method: "push", href: "/settings/battery-info" },
    ]);
  });

  // Planning decision 13: the row dims, it does not disable — the form carries the notice.
  it("dims an unpaired module's row and still navigates to its form", async () => {
    await openSettings(new InMemoryPreferencesRepository(), []);

    expect(
      window.getComputedStyle(screen.getByTestId("settings-row-heater"))
        .opacity,
    ).toBe(`${Opacity.faint}`);

    await press("settings-row-heater");

    expect(routerHistory).toContainEqual({
      method: "push",
      href: "/settings/heater-pid",
    });
  });

  it("counts the paired modules against the slots the registry holds", async () => {
    await openSettings(new InMemoryPreferencesRepository(), [
      "water",
      "heater",
    ]);

    expect(screen.getByText("2 sur 3 emplacements")).toBeTruthy();
  });

  it("footers the app version the manifest declares", async () => {
    setExpoConfigForTest({ version: "9.9.9" });

    await openSettings(new InMemoryPreferencesRepository());

    expect(screen.getByTestId("settings-version").textContent).toBe(
      "Domo-Van 9.9.9",
    );
  });
});
