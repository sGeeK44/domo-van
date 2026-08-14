// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { StatTile } from "@/design-system/molecules/stat-tile";
import { ThemeProvider } from "@/design-system/theme/ThemeContext";
import { Colors, type ThemeName } from "@/design-system/tokens";

const THEMES: ThemeName[] = ["light", "dark"];

const LABEL = "INT";
const VALUE = "21.4°";

function tile(theme: ThemeName = "dark", testID?: string) {
  return (
    <ThemeProvider initialMode={theme}>
      <StatTile label={LABEL} value={VALUE} testID={testID} />
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

describe("a stat tile", () => {
  afterEach(cleanup);

  it("shows the reading under the name of what it reads", () => {
    render(tile());

    expect(screen.getByText(LABEL)).toBeTruthy();
    expect(screen.getByText(VALUE)).toBeTruthy();
  });

  it.each(THEMES)("dims the label and keeps the value in ink (%s)", (theme) => {
    render(tile(theme));

    expect(inkOf(LABEL)).toBe(rgb(Colors[theme].textMuted));
    expect(inkOf(VALUE)).toBe(rgb(Colors[theme].text));
  });

  it("lets a strip of tiles tell one from another", () => {
    render(tile("dark", "tile-humidity"));

    expect(screen.getByTestId("tile-humidity")).toBeTruthy();
  });
});
