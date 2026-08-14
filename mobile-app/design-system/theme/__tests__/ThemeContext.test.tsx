// @vitest-environment jsdom
import { act, cleanup, render, screen } from "@testing-library/react";
import { useEffect } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ThemeMode } from "@/design-system/theme/ThemeContext";

// The OS scheme is the input under test, so react-native's hook is the boundary
// the test drives. Re-rendering the same element is what an OS switch does to a
// subscribed hook — a remount would hide the bug this covers.
let systemScheme: "light" | "dark" | null = "light";
vi.mock("react-native", () => ({ useColorScheme: () => systemScheme }));

const { ThemeProvider, useTheme } = await import(
  "@/design-system/theme/ThemeContext"
);

let mounts = 0;
let setThemeMode: (mode: ThemeMode) => void = () => {
  throw new Error("the theme provider did not render");
};

function Probe() {
  const theme = useTheme();
  setThemeMode = theme.setThemeMode;
  useEffect(() => {
    mounts += 1;
  }, []);

  return (
    <span data-testid="theme">{`${theme.themeMode}:${theme.colorScheme}`}</span>
  );
}

function renderTheme(initialMode?: ThemeMode, onModeChange?: () => void) {
  const tree = () => (
    <ThemeProvider initialMode={initialMode} onModeChange={onModeChange}>
      <Probe />
    </ThemeProvider>
  );
  const { rerender } = render(tree());

  return { repaint: () => rerender(tree()) };
}

function shown(): string {
  return screen.getByTestId("theme").textContent ?? "";
}

describe("the theme", () => {
  beforeEach(() => {
    systemScheme = "light";
    mounts = 0;
  });

  afterEach(cleanup);

  it("follows an OS theme switch while the app is running, in auto", () => {
    const { repaint } = renderTheme("auto");
    expect(shown()).toBe("auto:light");

    systemScheme = "dark";
    repaint();

    expect(shown()).toBe("auto:dark");
    expect(mounts).toBe(1);
  });

  it("ignores the OS once a mode is chosen", () => {
    const { repaint } = renderTheme("light");

    systemScheme = "dark";
    repaint();

    expect(shown()).toBe("light:light");
  });

  it("starts on the mode it is given", () => {
    renderTheme("dark");

    expect(shown()).toBe("dark:dark");
  });

  it("reads dark when the OS reports no scheme", () => {
    systemScheme = null;
    renderTheme("auto");

    expect(shown()).toBe("auto:dark");
  });

  it("defaults to auto when no mode is given", () => {
    renderTheme();

    expect(shown()).toBe("auto:light");
  });

  it("hands a chosen mode to the persistence seam and applies it at once", () => {
    const onModeChange = vi.fn();
    renderTheme("auto", onModeChange);

    act(() => setThemeMode("dark"));

    expect(shown()).toBe("dark:dark");
    expect(onModeChange).toHaveBeenCalledWith("dark");
    expect(mounts).toBe(1);
  });
});
