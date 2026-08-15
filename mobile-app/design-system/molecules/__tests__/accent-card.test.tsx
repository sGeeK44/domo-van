// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { Text } from "react-native";
import { afterEach, describe, expect, it } from "vitest";
import { AccentCard } from "@/design-system/molecules/accent-card";
import { ThemeProvider } from "@/design-system/theme/ThemeContext";
import { Colors, type ThemeName } from "@/design-system/tokens";

const THEMES: ThemeName[] = ["light", "dark"];

// A colour no palette entry holds: a card painting a domain token instead of its prop cannot pass.
const ACCENT = "rgb(255, 0, 255)";
const LABEL = "CUVE PROPRE";
const CONTENT = "the fields of the card";

function card(theme: ThemeName = "dark", testID?: string) {
  return (
    <ThemeProvider initialMode={theme}>
      <AccentCard accent={ACCENT} label={LABEL} testID={testID}>
        <Text>{CONTENT}</Text>
      </AccentCard>
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

describe("an accent card", () => {
  afterEach(cleanup);

  it("groups its fields under a label", () => {
    render(card());

    expect(screen.getByText(LABEL)).toBeTruthy();
    expect(screen.getByText(CONTENT)).toBeTruthy();
  });

  it("paints the edge in the colour the caller chose, on a themed surface", () => {
    render(card());

    expect(paintOf("accent-card-bar").backgroundColor).toBe(ACCENT);
    expect(paintOf("accent-card-bar").width).toBe("5px");
    expect(paintOf("accent-card-bar").position).toBe("absolute");
  });

  it.each(THEMES)("reads the label in ink over the card in %s", (theme) => {
    render(card(theme));
    const colors = Colors[theme];

    expect(inkOf(LABEL)).toBe(rgb(colors.text));
    expect(paintOf("accent-card-bar").backgroundColor).toBe(ACCENT);
    expect(paintOf("accent-card").backgroundColor).toBe(rgb(colors.surface));
  });

  it("lets a form holding several cards address one of them", () => {
    render(card("dark", "card-clean-tank"));

    expect(screen.getByTestId("card-clean-tank")).toBeTruthy();
    expect(screen.getByTestId("card-clean-tank-bar")).toBeTruthy();
  });
});
