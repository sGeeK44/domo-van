// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import { afterEach, describe, expect, it, vi } from "vitest";
import { HeaterPresets } from "@/components/heater/heater-presets";
import { Colors, type ThemeName, ThemeProvider } from "@/design-system";
import { createI18n } from "@/i18n/createI18n";

const THEMES: ThemeName[] = ["light", "dark"];

const NIGHT_MODE = "Mode nuit";
const STOP_ALL = "Tout arrêter";

function presets(
  props: Partial<Parameters<typeof HeaterPresets>[0]> = {},
  theme: ThemeName = "dark",
) {
  return (
    <I18nextProvider i18n={createI18n("fr")}>
      <ThemeProvider initialMode={theme}>
        <HeaterPresets
          nightMode={false}
          onNightMode={() => {}}
          onStopAll={() => {}}
          {...props}
        />
      </ThemeProvider>
    </I18nextProvider>
  );
}

function paintOf(testID: string): CSSStyleDeclaration {
  return window.getComputedStyle(screen.getByTestId(testID));
}

function inkOf(text: string): string {
  return window.getComputedStyle(screen.getByText(text)).color;
}

/** The palette is written in hex; the DOM answers in rgb(). */
function rgb(hex: string): string {
  const [r, g, b] = [1, 3, 5].map((start) =>
    Number.parseInt(hex.slice(start, start + 2), 16),
  );
  return `rgb(${r}, ${g}, ${b})`;
}

describe("the heater presets bar", () => {
  afterEach(cleanup);

  it("fires the preset that was pressed, and only that one", () => {
    const onNightMode = vi.fn();
    const onStopAll = vi.fn();
    render(presets({ onNightMode, onStopAll }));

    fireEvent.click(screen.getByText(NIGHT_MODE));

    expect(onNightMode).toHaveBeenCalledTimes(1);
    expect(onStopAll).not.toHaveBeenCalled();
  });

  // The preset is not a toggle: an active night mode still sends, which is how a stale flag recovers.
  it("keeps sending night mode while it is already active", () => {
    const onNightMode = vi.fn();
    render(presets({ nightMode: true, onNightMode }));

    fireEvent.click(screen.getByText(NIGHT_MODE));
    fireEvent.click(screen.getByText(NIGHT_MODE));

    expect(onNightMode).toHaveBeenCalledTimes(2);
  });

  it.each(THEMES)("outlines an inactive night mode in %s", (theme) => {
    render(presets({}, theme));
    const colors = Colors[theme];

    expect(paintOf("preset-night-mode").borderTopColor).toBe(colors.border);
    expect(inkOf(NIGHT_MODE)).toBe(rgb(colors.textMuted));
  });

  it.each(THEMES)("fills night mode while it is active, in %s", (theme) => {
    render(presets({ nightMode: true }, theme));
    const colors = Colors[theme];

    expect(paintOf("preset-night-mode").backgroundColor).toBe(
      rgb(colors.inverse),
    );
    expect(inkOf(NIGHT_MODE)).toBe(rgb(colors.onInverse));
    // Tout arrêter is a command, never a state: it stays outlined next to a filled night mode.
    expect(paintOf("preset-stop-all").backgroundColor).toBe("rgba(0, 0, 0, 0)");
    expect(inkOf(STOP_ALL)).toBe(rgb(colors.textMuted));
  });
});
