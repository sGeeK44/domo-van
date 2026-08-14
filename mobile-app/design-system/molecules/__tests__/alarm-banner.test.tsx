// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import {
  AlarmBanner,
  type AlarmBannerTone,
} from "@/design-system/molecules/alarm-banner";
import { ThemeProvider } from "@/design-system/theme/ThemeContext";
import { Colors, type ThemeName } from "@/design-system/tokens";

const THEMES: ThemeName[] = ["light", "dark"];

// The icons reach the DOM as their own name, so they must differ to be told apart.
const OK_ICON = "check-circle";
const ALARM_ICON = "warning";
const MESSAGE = "Aucune alarme.";

function banner(tone: AlarmBannerTone, theme: ThemeName = "dark") {
  return (
    <ThemeProvider initialMode={theme}>
      <AlarmBanner
        tone={tone}
        icon={tone === "ok" ? OK_ICON : ALARM_ICON}
        message={MESSAGE}
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

/** The palette spells a colour in hex or in rgba(); the DOM answers in rgb() and trims the alpha's trailing zero. */
function css(color: string): string {
  if (color.startsWith("rgba(")) {
    const [red, green, blue, alpha] = color.slice(5, -1).split(",").map(Number);
    return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
  }
  const [red, green, blue] = [1, 3, 5].map((start) =>
    Number.parseInt(color.slice(start, start + 2), 16),
  );
  return `rgb(${red}, ${green}, ${blue})`;
}

describe("an alarm banner", () => {
  afterEach(cleanup);

  it("reads out the state it is given", () => {
    render(banner("ok"));

    expect(screen.getByText(MESSAGE)).toBeTruthy();
    expect(screen.getByText(OK_ICON)).toBeTruthy();
  });

  it.each(THEMES)("tints a quiet pack in success (%s)", (theme) => {
    const colors = Colors[theme];
    render(banner("ok", theme));

    expect(paintOf("alarm-banner").backgroundColor).toBe(
      css(colors.successSurface),
    );
    expect(paintOf("alarm-banner").borderTopColor).toBe(
      css(colors.successBorder),
    );
    expect(inkOf(OK_ICON)).toBe(css(colors.success));
  });

  it.each(
    THEMES,
  )("turns the whole banner to danger on an alarm (%s)", (theme) => {
    const colors = Colors[theme];
    render(banner("alarm", theme));

    expect(paintOf("alarm-banner").backgroundColor).toBe(
      css(colors.dangerSurface),
    );
    expect(paintOf("alarm-banner").borderTopColor).toBe(
      css(colors.dangerBorder),
    );
    expect(inkOf(ALARM_ICON)).toBe(css(colors.danger));
  });
});
