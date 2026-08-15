// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NavRow } from "@/design-system/molecules/nav-row";
import { ThemeProvider } from "@/design-system/theme/ThemeContext";
import { Colors, Opacity, type ThemeName } from "@/design-system/tokens";

const THEMES: ThemeName[] = ["light", "dark"];

// A colour no palette entry holds: a row painting a domain token instead of its prop cannot pass.
const CHIP = "rgb(255, 0, 255)";
const ICON = "water-drop";
const TITLE = "Eau";
const SUBTITLE = "volumes, hauteurs, vanne";
const CHEVRON = "chevron-right";

function row(
  props: Partial<Parameters<typeof NavRow>[0]> = {},
  theme: ThemeName = "dark",
) {
  return (
    <ThemeProvider initialMode={theme}>
      <NavRow
        icon={ICON}
        iconBackground={CHIP}
        title={TITLE}
        subtitle={SUBTITLE}
        onPress={() => {}}
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

describe("a navigation row", () => {
  afterEach(cleanup);

  it.each(THEMES)("names its destination in %s", (theme) => {
    render(row({}, theme));
    const colors = Colors[theme];

    expect(inkOf(TITLE)).toBe(rgb(colors.text));
    expect(inkOf(SUBTITLE)).toBe(rgb(colors.textMuted));
    expect(inkOf(CHEVRON)).toBe(rgb(colors.textMuted));
    expect(inkOf(ICON)).toBe(rgb(colors.onFill));
    expect(paintOf("nav-row").backgroundColor).toBe(rgb(colors.surface));
    expect(
      window.getComputedStyle(screen.getByText(ICON).parentElement as Element)
        .backgroundColor,
    ).toBe(CHIP);
  });

  it("goes where it says", () => {
    const onPress = vi.fn();
    render(row({ onPress }));

    fireEvent.click(screen.getByTestId("nav-row"));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  // an unpaired module is still worth opening: the form explains why it is empty
  it("dims a row without disabling it", () => {
    const onPress = vi.fn();
    render(row({ dimmed: true, onPress }));

    expect(paintOf("nav-row").opacity).toBe(`${Opacity.faint}`);

    fireEvent.click(screen.getByTestId("nav-row"));

    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
