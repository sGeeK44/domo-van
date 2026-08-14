// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GaugeSetpointRow } from "@/design-system/molecules/gauges/gauge-setpoint-row";
import { ThemeProvider } from "@/design-system/theme/ThemeContext";
import { Colors, Motion, type ThemeName } from "@/design-system/tokens";

// The animation library is the boundary "the target never moves while hidden" is observed at.
const withTiming = vi.hoisted(() => vi.fn((target: unknown) => target));

vi.mock("react-native-reanimated", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("react-native-reanimated")>();
  return { ...actual, withTiming };
});

const THEMES: ThemeName[] = ["light", "dark"];

// Colours no palette entry holds: a row painting a domain token instead of its props cannot pass.
const FILL = "rgb(255, 0, 255)";
const MARKER = "rgb(0, 255, 255)";

const LABEL = "SALON";
const VALUE = "21°";
const CAPTION = "19.4° now";
const DECREASE_GLYPH = "−";
const INCREASE_GLYPH = "+";
const POWER_GLYPH = "power-settings-new";

// Distinct press counts, so a control wired to a neighbour's handler moves a count that is not its own.
const CONTROLS = [
  { testID: "setpoint-decrease", glyph: DECREASE_GLYPH, presses: 1 },
  { testID: "setpoint-increase", glyph: INCREASE_GLYPH, presses: 2 },
  { testID: "setpoint-power", glyph: POWER_GLYPH, presses: 3 },
] as const;

function row(
  props: Partial<Parameters<typeof GaugeSetpointRow>[0]> = {},
  theme: ThemeName = "dark",
) {
  return (
    <ThemeProvider initialMode={theme}>
      <GaugeSetpointRow
        ratio={0.52}
        setpointRatio={0.55}
        fillColor={FILL}
        markerColor={MARKER}
        label={LABEL}
        value={VALUE}
        caption={CAPTION}
        onDecrease={() => {}}
        onIncrease={() => {}}
        onTogglePower={() => {}}
        {...props}
      />
    </ThemeProvider>
  );
}

function styleOf(testID: string): CSSStyleDeclaration {
  return screen.getByTestId(testID).style;
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
  const [r, g, b] = [1, 3, 5].map((start) =>
    Number.parseInt(hex.slice(start, start + 2), 16),
  );
  return `rgb(${r}, ${g}, ${b})`;
}

describe("a setpoint row", () => {
  afterEach(() => {
    cleanup();
    withTiming.mockClear();
  });

  it("draws the reading and the target at two distinct positions", () => {
    render(row());

    expect(styleOf("gauge-fill").width).toBe("52%");
    expect(styleOf("gauge-fill").backgroundColor).toBe(FILL);
    expect(styleOf("gauge-marker").left).toBe("55%");
    expect(styleOf("gauge-marker").backgroundColor).toBe(MARKER);
    // a 2 px upright bar spanning the row, not a rule laid across it
    expect(paintOf("gauge-marker").width).toBe("2px");
    expect(paintOf("gauge-marker").top).toBe("0px");
  });

  // `position: relative` is every View's default, so paint order is what actually stacks them.
  it("draws the readings and the controls after the fill, so they sit above it", () => {
    render(row());

    const order = screen
      .getByTestId("gauge-fill")
      .compareDocumentPosition(screen.getByTestId("setpoint-content"));

    expect(order & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("keeps the target marker inside the row, centred on the boundary in between", () => {
    const { rerender } = render(row({ ratio: 1, setpointRatio: 1 }));
    expect(styleOf("gauge-marker").left).toBe("100%");
    expect(styleOf("gauge-marker").marginLeft).toBe("-2px");

    rerender(row({ ratio: 0.5, setpointRatio: 0.5 }));
    expect(styleOf("gauge-marker").left).toBe("50%");
    expect(styleOf("gauge-marker").marginLeft).toBe("-1px");

    rerender(row({ ratio: 0, setpointRatio: 0 }));
    expect(styleOf("gauge-marker").left).toBe("0%");
    expect(styleOf("gauge-marker").marginLeft).toBe("0px");
  });

  it("never moves the target while the zone is off: it reappears in place, not from 0", () => {
    const { rerender } = render(row());
    withTiming.mockClear();

    rerender(row({ inert: true }));

    expect(withTiming).not.toHaveBeenCalledWith(expect.anything(), {
      duration: Motion.marker,
    });
  });

  // dark collapses onFill, onFillMuted and inverse onto #FFFFFF; only light tells them apart.
  it.each(THEMES)("shows a live zone over its fill in %s", (theme) => {
    render(row({}, theme));
    const colors = Colors[theme];

    expect(inkOf(LABEL)).toBe(rgb(colors.onFill));
    expect(inkOf(VALUE)).toBe(rgb(colors.onFill));
    expect(inkOf(CAPTION)).toBe(rgb(colors.onFillMuted));
    expect(inkOf(DECREASE_GLYPH)).toBe(rgb(colors.onFill));
    expect(inkOf(INCREASE_GLYPH)).toBe(rgb(colors.onFill));
    expect(inkOf(POWER_GLYPH)).toBe(rgb(colors.onInverse));
    expect(paintOf("setpoint-increase").backgroundColor).toBe(
      colors.onFillSurface,
    );
    expect(paintOf("setpoint-power").backgroundColor).toBe(rgb(colors.inverse));
  });

  it.each(THEMES)("dims a switched-off zone in %s", (theme) => {
    render(row({ inert: true }, theme));
    const colors = Colors[theme];

    expect(styleOf("gauge-fill").backgroundColor).toBe(rgb(colors.off));
    // 45 % of the live 52 %: the level is a hint, not a reading
    expect(styleOf("gauge-fill").width).toBe("23.4%");
    expect(screen.queryByTestId("gauge-marker")).toBeNull();
    expect(inkOf(LABEL)).toBe(rgb(colors.textMuted));
    expect(inkOf(VALUE)).toBe(rgb(colors.textMuted));
    expect(inkOf(CAPTION)).toBe(rgb(colors.textMuted));
    expect(inkOf(DECREASE_GLYPH)).toBe(rgb(colors.dash));
    expect(inkOf(INCREASE_GLYPH)).toBe(rgb(colors.dash));
    expect(inkOf(POWER_GLYPH)).toBe(rgb(colors.textMuted));
  });

  it("offers no step past a clamp bound, and shows the one it still offers", () => {
    const onDecrease = vi.fn();
    const onIncrease = vi.fn();
    render(row({ increaseDisabled: true, onDecrease, onIncrease }));

    fireEvent.click(screen.getByTestId("setpoint-increase"));
    fireEvent.click(screen.getByTestId("setpoint-decrease"));

    expect(onIncrease).not.toHaveBeenCalled();
    expect(onDecrease).toHaveBeenCalledTimes(1);
    expect(paintOf("setpoint-increase").backgroundColor).toBe(
      rgb(Colors.dark.off),
    );
    expect(inkOf(INCREASE_GLYPH)).toBe(rgb(Colors.dark.dash));
    expect(paintOf("setpoint-decrease").backgroundColor).toBe(
      Colors.dark.onFillSurface,
    );
  });

  it("clamps a reading past the top before it dims it", () => {
    render(row({ inert: true, ratio: 1.4 }));

    expect(styleOf("gauge-fill").width).toBe("45%");
  });

  it("outlines the power control instead of filling it when inert", () => {
    render(row({ inert: true }));

    expect(paintOf("setpoint-power").borderTopColor).toBe(
      rgb(Colors.dark.textMuted),
    );
    expect(paintOf("setpoint-power").borderTopWidth).toBe("1.5px");
    expect(paintOf("setpoint-decrease").backgroundColor).toBe(
      rgb(Colors.dark.off),
    );
  });

  it.each([
    true,
    false,
  ])("fires each action from the control that shows its glyph, inert %s", (inert) => {
    const onDecrease = vi.fn();
    const onIncrease = vi.fn();
    const onTogglePower = vi.fn();
    render(row({ inert, onDecrease, onIncrease, onTogglePower }));

    for (const { testID, glyph, presses } of CONTROLS) {
      const control = screen.getByTestId(testID);
      expect([testID, control.textContent]).toEqual([testID, glyph]);
      for (let press = 0; press < presses; press++) fireEvent.click(control);
    }

    expect(onDecrease).toHaveBeenCalledTimes(1);
    expect(onIncrease).toHaveBeenCalledTimes(2);
    expect(onTogglePower).toHaveBeenCalledTimes(3);
  });
});
