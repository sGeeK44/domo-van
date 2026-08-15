// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SettingsHeader } from "@/design-system/molecules/settings-header";
import { ThemeProvider } from "@/design-system/theme/ThemeContext";
import { Colors, Spacing, type ThemeName } from "@/design-system/tokens";

const THEMES: ThemeName[] = ["light", "dark"];

const CRUMB = "Eau";
const PAGE = "Réglages";
const BACK_GLYPH = "arrow-back";
const CLOSE_GLYPH = "close";

function header(
  props: Partial<Parameters<typeof SettingsHeader>[0]> = {},
  theme: ThemeName = "dark",
) {
  return (
    <ThemeProvider initialMode={theme}>
      <SettingsHeader
        title={CRUMB}
        variant="crumb"
        onBackPress={() => {}}
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

describe("a settings header", () => {
  afterEach(cleanup);

  it.each(THEMES)("names the module a form belongs to in %s", (theme) => {
    render(header({}, theme));
    const colors = Colors[theme];

    expect(screen.getByText(CRUMB)).toBeTruthy();
    expect(inkOf(CRUMB)).toBe(rgb(colors.text));
    expect(inkOf(BACK_GLYPH)).toBe(rgb(colors.text));
  });

  it("sits the crumb on the form's own margins", () => {
    render(header());

    expect(paintOf("settings-header").paddingTop).toBe(`${Spacing.xxl}px`);
    expect(paintOf("settings-header").paddingLeft).toBe(`${Spacing.gutter}px`);
    expect(paintOf("settings-header").paddingBottom).toBe(`${Spacing.l}px`);
  });

  // the pages that are not a form keep the header they shipped with
  it("leaves a page title where it was", () => {
    render(header({ variant: undefined }));

    expect(paintOf("settings-header").paddingTop).toBe(`${Spacing.s}px`);
    expect(paintOf("settings-header").paddingLeft).toBe(`${Spacing.xxl}px`);
  });

  it.each(THEMES)("closes a page instead of going back, in %s", (theme) => {
    render(header({ variant: "close", title: PAGE }, theme));
    const colors = Colors[theme];

    expect(inkOf(CLOSE_GLYPH)).toBe(rgb(colors.textMuted));
    expect(inkOf(PAGE)).toBe(rgb(colors.text));
    expect(screen.queryByText(BACK_GLYPH)).toBeNull();
  });

  // the glyph is not a back arrow, so there is nothing to centre the title against
  it("keeps the closing title beside its glyph, balanced by nothing", () => {
    render(header({ variant: "close", title: PAGE }));

    expect(screen.getByTestId("settings-header").children).toHaveLength(2);
    expect(paintOf("settings-header").gap).toBe(`${Spacing.xl}px`);
    expect(paintOf("settings-header").paddingTop).toBe(`${Spacing.xxl}px`);
  });

  it("returns to wherever the form was opened from", () => {
    const onBackPress = vi.fn();
    render(header({ onBackPress }));

    fireEvent.click(screen.getByText(BACK_GLYPH));

    expect(onBackPress).toHaveBeenCalledTimes(1);
  });
});
