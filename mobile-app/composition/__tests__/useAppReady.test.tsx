// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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

function Boot() {
  const ready = useAppReady({});
  return <span data-testid="boot">{ready ? "app" : "splash"}</span>;
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
    render(<Boot />);

    expect(shown()).toBe("splash");
    expect(hideAsync).not.toHaveBeenCalled();
  });

  it("lifts the splash once the fonts are loaded", async () => {
    fontResult = [true, null];
    render(<Boot />);

    expect(shown()).toBe("app");
    await waitFor(() => expect(hideAsync).toHaveBeenCalled());
  });

  it("lifts the splash and renders the app when the fonts fail to load", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const failure = new Error("asset bundle incomplete");
    fontResult = [false, failure];

    render(<Boot />);

    expect(shown()).toBe("app");
    await waitFor(() => expect(hideAsync).toHaveBeenCalled());
    expect(warn).toHaveBeenCalledWith(expect.any(String), failure);
    warn.mockRestore();
  });
});
