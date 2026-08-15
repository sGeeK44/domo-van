// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { FieldReadout } from "@/design-system/molecules/field-readout";
import { ThemeProvider } from "@/design-system/theme/ThemeContext";
import { Colors, type ThemeName } from "@/design-system/tokens";

const THEMES: ThemeName[] = ["light", "dark"];

const LABEL = "TENSION";
const VALUE = "13.4";
const UNIT = "V";

function readout(
  props: Partial<Parameters<typeof FieldReadout>[0]> = {},
  theme: ThemeName = "dark",
) {
  return (
    <ThemeProvider initialMode={theme}>
      <FieldReadout label={LABEL} value={VALUE} unit={UNIT} {...props} />
    </ThemeProvider>
  );
}

/** A themed StyleSheet reaches the DOM as a class, so the cascade has to be resolved. */
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

describe("a read-only field", () => {
  afterEach(cleanup);

  it("shows what the module reported, and offers nothing to type in", () => {
    render(readout());

    expect(screen.getByText(VALUE)).toBeTruthy();
    expect(screen.getByText(UNIT)).toBeTruthy();
    expect(screen.queryByRole("textbox")).toBeNull();
  });

  it("drops the unit when the value carries none", () => {
    render(readout({ unit: undefined }));

    expect(screen.queryByText(UNIT)).toBeNull();
  });

  it.each(THEMES)("keeps the value in ink and its unit dim (%s)", (theme) => {
    render(readout({}, theme));
    const colors = Colors[theme];

    expect(inkOf(LABEL)).toBe(rgb(colors.textMuted));
    expect(inkOf(VALUE)).toBe(rgb(colors.text));
    expect(inkOf(UNIT)).toBe(rgb(colors.textMuted));
  });
});
