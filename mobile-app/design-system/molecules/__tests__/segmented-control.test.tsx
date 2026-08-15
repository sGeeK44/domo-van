// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SegmentedControl } from "@/design-system/molecules/segmented-control";
import { ThemeProvider } from "@/design-system/theme/ThemeContext";
import { Colors, type ThemeName } from "@/design-system/tokens";

const THEMES: ThemeName[] = ["light", "dark"];

const LABEL = "Thème";
const OPTIONS = [
  { value: "auto", label: "Auto" },
  { value: "dark", label: "Sombre" },
  { value: "light", label: "Clair" },
] as const;

type Mode = (typeof OPTIONS)[number]["value"];

function control(
  props: Partial<Parameters<typeof SegmentedControl<Mode>>[0]> = {},
  theme: ThemeName = "dark",
) {
  return (
    <ThemeProvider initialMode={theme}>
      <SegmentedControl
        label={LABEL}
        options={OPTIONS}
        value="auto"
        onChange={() => {}}
        {...props}
      />
    </ThemeProvider>
  );
}

/** A themed StyleSheet reaches the DOM as a class, so the cascade has to be resolved. */
function paintOf(testID: string): CSSStyleDeclaration {
  return window.getComputedStyle(screen.getByTestId(testID));
}

function inkOf(text: string): string {
  return window.getComputedStyle(screen.getByText(text)).color;
}

/** The palette is written in hex; the DOM answers in rgb(). */
function rgb(hex: string): string {
  const [red, green, blue] = [1, 3, 5].map((start) =>
    Number.parseInt(hex.slice(start, start + 2), 16),
  );
  return `rgb(${red}, ${green}, ${blue})`;
}

describe("a segmented control", () => {
  afterEach(cleanup);

  it.each(THEMES)("fills the chosen option alone in %s", (theme) => {
    render(control({ value: "dark" }, theme));
    const colors = Colors[theme];

    const filled = OPTIONS.filter(
      (option) =>
        paintOf(`segment-${option.value}`).backgroundColor ===
        rgb(colors.inverse),
    );

    expect(filled.map((option) => option.value)).toEqual(["dark"]);
    expect(inkOf("Sombre")).toBe(rgb(colors.onInverse));
    expect(inkOf("Auto")).toBe(rgb(colors.textMuted));
    expect(inkOf("Clair")).toBe(rgb(colors.textMuted));
  });

  it("reports the option that was pressed, not the one in place", () => {
    const onChange = vi.fn();
    render(control({ value: "auto", onChange }));

    fireEvent.click(screen.getByTestId("segment-light"));

    expect(onChange).toHaveBeenCalledWith("light");
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("reports nothing when the option in place is pressed again", () => {
    const onChange = vi.fn();
    render(control({ value: "auto", onChange }));

    fireEvent.click(screen.getByTestId("segment-auto"));

    expect(onChange).not.toHaveBeenCalled();
  });

  it("names what the rail switches", () => {
    render(control());

    expect(screen.getByText(LABEL)).toBeTruthy();
  });
});
