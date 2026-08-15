// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PreferencesRepository } from "@/domain/ports/PreferencesRepository";
import { InMemoryPreferencesRepository } from "@/infrastructure/fake/InMemoryPreferencesRepository";

// expo-font pulls react-native's Flow source, which Vite cannot parse, and the
// font result is the very input under test — so both boundaries are stubbed.
let fontResult: [boolean, Error | null] = [false, null];
const hideAsync = vi.fn(() => Promise.resolve(true));

vi.mock("expo-font", () => ({ useFonts: () => fontResult }));
vi.mock("expo-splash-screen", () => ({
  preventAutoHideAsync: () => Promise.resolve(true),
  hideAsync: () => hideAsync(),
}));

const { useAppReady } = await import("@/composition/useAppReady");

function Boot({ preferences }: { preferences: PreferencesRepository }) {
  const { ready, initialThemeMode, initialLanguage } = useAppReady(
    {},
    preferences,
  );
  return (
    <span data-testid="boot">
      {ready ? `app:${initialThemeMode}:${initialLanguage}` : "splash"}
    </span>
  );
}

function renderBoot(stored?: PreferencesRepository) {
  return render(
    <Boot preferences={stored ?? new InMemoryPreferencesRepository()} />,
  );
}

function shown(): string {
  return screen.getByTestId("boot").textContent ?? "";
}

describe("useAppReady", () => {
  beforeEach(() => {
    fontResult = [false, null];
    hideAsync.mockClear();
  });

  afterEach(cleanup);

  it("holds the splash while the fonts are still loading", () => {
    renderBoot();

    expect(shown()).toBe("splash");
    expect(hideAsync).not.toHaveBeenCalled();
  });

  it("holds the splash until the stored preferences are read", async () => {
    fontResult = [true, null];
    renderBoot();

    expect(shown()).toBe("splash");
    expect(hideAsync).not.toHaveBeenCalled();

    await waitFor(() => expect(shown()).toBe("app:auto:fr"));
  });

  it("lifts the splash once the fonts are loaded and the preferences are read", async () => {
    fontResult = [true, null];
    renderBoot(new InMemoryPreferencesRepository({ themeMode: "light" }));

    await waitFor(() => expect(shown()).toBe("app:light:fr"));
    await waitFor(() => expect(hideAsync).toHaveBeenCalled());
  });

  it("hands the stored language down, so the first frame is not painted in the device's", async () => {
    fontResult = [true, null];
    renderBoot(new InMemoryPreferencesRepository({ language: "en" }));

    await waitFor(() => expect(shown()).toBe("app:auto:en"));
  });

  it("lifts the splash and renders the app when the fonts fail to load", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const failure = new Error("asset bundle incomplete");
    fontResult = [false, failure];

    renderBoot();

    await waitFor(() => expect(shown()).toBe("app:auto:fr"));
    await waitFor(() => expect(hideAsync).toHaveBeenCalled());
    expect(warn).toHaveBeenCalledWith(expect.any(String), failure);
    warn.mockRestore();
  });
});
