// @vitest-environment jsdom
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
// The Map-backed stub the vitest alias substitutes for the native store.
import { __store } from "@/__mocks__/async-storage";
import type {
  Preferences,
  PreferencesRepository,
} from "@/domain/ports/PreferencesRepository";
import { InMemoryPreferencesRepository } from "@/infrastructure/fake/InMemoryPreferencesRepository";
import { AsyncStoragePreferencesRepository } from "@/infrastructure/storage/AsyncStoragePreferencesRepository";

// The OS reports dark throughout, so only a stored mode can make it light.
vi.mock("react-native", async () => ({
  ...(await vi.importActual<typeof import("@/__mocks__/react-native")>(
    "react-native",
  )),
  useColorScheme: () => "dark",
}));

const { ThemeProvider, useTheme } = await import("@/design-system");
const { useAppPreferences } = await import("@/composition/useAppPreferences");

let setThemeMode: (mode: "auto" | "dark" | "light") => void = () => {
  throw new Error("the theme provider did not render");
};

function Probe() {
  const theme = useTheme();
  setThemeMode = theme.setThemeMode;

  return (
    <span data-testid="theme">{`${theme.themeMode}:${theme.colorScheme}`}</span>
  );
}

/** The wiring `app/_layout.tsx` performs: hydrate above the provider, persist below it. */
function Boot({ repository }: { repository: PreferencesRepository }) {
  const { hydrated, initialThemeMode, saveThemeMode } =
    useAppPreferences(repository);
  if (!hydrated) return <span data-testid="theme">splash</span>;

  return (
    <ThemeProvider initialMode={initialThemeMode} onModeChange={saveThemeMode}>
      <Probe />
    </ThemeProvider>
  );
}

async function boot(repository: PreferencesRepository) {
  const { unmount } = render(<Boot repository={repository} />);
  await waitFor(() => expect(shown()).not.toBe("splash"));
  return unmount;
}

function shown(): string {
  return screen.getByTestId("theme").textContent ?? "";
}

describe("the persisted theme mode", () => {
  afterEach(cleanup);

  it("comes back after a restart, against the OS setting", async () => {
    const repository = new InMemoryPreferencesRepository();
    const unmount = await boot(repository);
    expect(shown()).toBe("auto:dark");

    act(() => setThemeMode("light"));
    expect(shown()).toBe("light:light");
    unmount();

    await boot(repository);

    expect(shown()).toBe("light:light");
  });

  it("holds the splash until the store answers, so no frame is painted in the wrong mode", async () => {
    const repository = new InMemoryPreferencesRepository({
      themeMode: "light",
    });

    render(<Boot repository={repository} />);
    expect(shown()).toBe("splash");

    await waitFor(() => expect(shown()).toBe("light:light"));
  });

  it("reads the store once, even from a repository rebuilt on every render", async () => {
    let answer = () => {};
    const load = vi.fn(
      () =>
        new Promise<Partial<Preferences>>((resolve) => {
          answer = () => resolve({ themeMode: "light" });
        }),
    );

    function RebuildingBoot() {
      const { hydrated, initialThemeMode } = useAppPreferences({
        load,
        save: () => Promise.resolve(),
      });

      return (
        <span data-testid="theme">
          {hydrated ? initialThemeMode : "splash"}
        </span>
      );
    }

    render(<RebuildingBoot />);
    // Hydrating re-renders, which hands the hook a brand new repository object.
    await act(async () => answer());

    expect(shown()).toBe("light");
    expect(load).toHaveBeenCalledTimes(1);
  });

  it("survives a store that rejects", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const broken: PreferencesRepository = {
      load: () => Promise.reject(new Error("store unavailable")),
      save: () => Promise.reject(new Error("store unavailable")),
    };

    await boot(broken);
    expect(shown()).toBe("auto:dark");

    act(() => setThemeMode("light"));

    expect(shown()).toBe("light:light");
    await waitFor(() => expect(warn).toHaveBeenCalledTimes(2));
    warn.mockRestore();
  });

  describe("read through the device store", () => {
    beforeEach(() => __store.clear());

    it("falls back to auto on a value it cannot read", async () => {
      __store.set("preferences.themeMode", "sepia");

      await boot(new AsyncStoragePreferencesRepository());

      expect(shown()).toBe("auto:dark");
    });

    it("writes the chosen mode through to the store", async () => {
      await boot(new AsyncStoragePreferencesRepository());

      act(() => setThemeMode("light"));

      await waitFor(() =>
        expect(__store.get("preferences.themeMode")).toBe("light"),
      );
    });
  });
});
