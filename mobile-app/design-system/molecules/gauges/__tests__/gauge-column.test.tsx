// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { GaugeColumnProps } from "@/design-system/molecules/gauges/gauge-column";
import {
  Colors,
  Motion,
  TextStyles,
  type ThemeName,
} from "@/design-system/tokens";

// The animation library is the boundary the two durations are observed at.
const withTiming = vi.hoisted(() => vi.fn((target: unknown) => target));

vi.mock("react-native-reanimated", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("react-native-reanimated")>();
  return { ...actual, withTiming };
});

const { GaugeColumn } = await import(
  "@/design-system/molecules/gauges/gauge-column"
);
const { ThemeProvider } = await import("@/design-system/theme/ThemeContext");

// Deliberately in no palette entry of either theme: the gauge must paint what the caller passes, never a domain token of its own.
const FILL = "rgb(255, 0, 255)";
const LINE = "rgb(0, 255, 0)";

const BASE = {
  ratio: 0.72,
  fillColor: FILL,
  lineColor: LINE,
  label: "CLEAN WATER",
  caption: "100 L tank",
  value: { amount: "72", unit: " L" },
  footer: "4 DAYS LEFT",
} as const satisfies GaugeColumnProps;

function tank(
  props: Partial<GaugeColumnProps> = {},
  theme: ThemeName = "dark",
) {
  return (
    <ThemeProvider initialMode={theme}>
      <GaugeColumn {...BASE} {...props} />
    </ThemeProvider>
  );
}

function styleOf(testID: string): CSSStyleDeclaration {
  return screen.getByTestId(testID).style;
}

/** A static text style lands in a generated class, not on the element: only the cascade resolves it. */
function inkOf(node: HTMLElement) {
  const { color, letterSpacing } = getComputedStyle(node);
  return { color, letterSpacing };
}

function ink(hex: string, style: { letterSpacing: number }) {
  return { color: rgb(hex), letterSpacing: `${style.letterSpacing}px` };
}

/** The palette is authored in hex; the DOM answers in rgb. */
function rgb(hex: string): string {
  const [red, green, blue] = [1, 3, 5].map((at) =>
    Number.parseInt(hex.slice(at, at + 2), 16),
  );
  return `rgb(${red}, ${green}, ${blue})`;
}

const THEMES: ThemeName[] = ["light", "dark"];

describe("a column gauge", () => {
  afterEach(() => {
    cleanup();
    withTiming.mockClear();
  });

  it("fills from the bottom to its level and marks the boundary", () => {
    render(tank());

    expect(styleOf("gauge-fill").height).toBe("72%");
    expect(styleOf("gauge-meniscus").bottom).toBe("72%");
    expect(styleOf("gauge-fill").backgroundColor).toBe(FILL);
    expect(styleOf("gauge-meniscus").backgroundColor).toBe(LINE);
  });

  it("reads its label, caption, value with its unit, and footer", () => {
    render(tank());

    expect(screen.getByText(BASE.label)).toBeTruthy();
    expect(screen.getByText(BASE.caption)).toBeTruthy();
    expect(screen.getByText(BASE.footer)).toBeTruthy();
    expect(screen.getByText(BASE.value.amount)).toBeTruthy();
    // The unit is its own smaller span inside the metric, not part of the number.
    expect(screen.getByText(BASE.value.unit.trim())).toBeTruthy();
  });

  it.each(THEMES)("outlines a draining tank in danger (%s)", (theme) => {
    render(tank({ draining: true }, theme));

    const danger = rgb(Colors[theme].danger);
    expect(styleOf("gauge-outline").borderTopColor).toBe(danger);
    expect(styleOf("gauge-outline").borderTopWidth).toBe("2px");
    expect(styleOf("gauge-meniscus").backgroundColor).toBe(danger);
  });

  it.each(THEMES)("tints the drain ink with danger (%s)", (theme) => {
    render(tank({ draining: true }, theme));

    const danger = rgb(Colors[theme].danger);
    expect(screen.getByText(BASE.caption).style.color).toBe(danger);
    expect(screen.getByText(BASE.footer).style.color).toBe(danger);
  });

  it("hatches nothing while draining: the level is still a reading", () => {
    render(tank({ draining: true }));

    expect(screen.queryByTestId("gauge-hatch")).toBeNull();
    expect(styleOf("gauge-fill").height).toBe("72%");
  });

  // Both themes: dark collapses onFillMuted onto onFill, so only light tells the two inks apart.
  it.each(THEMES)("keeps the ink neutral when not draining (%s)", (theme) => {
    render(tank({}, theme));

    expect(screen.queryByTestId("gauge-outline")).toBeNull();
    expect(inkOf(screen.getByText(BASE.label))).toEqual(
      ink(Colors[theme].text, TextStyles.cardLabel),
    );
    expect(inkOf(screen.getByText(BASE.value.amount))).toEqual(
      ink(Colors[theme].onFill, TextStyles.metricLarge),
    );
    expect(screen.getByText(BASE.caption).style.color).toBe(
      rgb(Colors[theme].textMuted),
    );
    expect(screen.getByText(BASE.footer).style.color).toBe(
      rgb(Colors[theme].onFillMuted),
    );
  });

  it("sweeps a normal level change on the fill duration", () => {
    const { rerender } = render(tank());

    rerender(tank({ ratio: 0.68 }));

    expect(withTiming).toHaveBeenCalledWith(0.68, { duration: Motion.fill });
    expect(styleOf("gauge-fill").height).toBe("68%");
  });

  it("sweeps a drain on the slower drain duration", () => {
    const { rerender } = render(tank({ draining: true }));

    rerender(tank({ draining: true, ratio: 0.68 }));

    expect(withTiming).toHaveBeenCalledWith(0.68, { duration: Motion.drain });
    expect(styleOf("gauge-fill").height).toBe("68%");
  });
});
