// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import {
  type GaugeBar,
  GaugeBars,
} from "@/design-system/molecules/gauges/gauge-bars";
import { ThemeProvider } from "@/design-system/theme/ThemeContext";
import { Colors, type ThemeName } from "@/design-system/tokens";

// A colour no palette entry holds: a cluster painting a domain token instead of its prop cannot pass.
const FILL = "rgb(255, 0, 255)";

const CELLS: GaugeBar[] = [
  { id: "c1", label: "C1", ratio: 0.78, value: "3.42" },
  { id: "c2", label: "C2", ratio: 0.76, value: "3.41" },
  { id: "c3", label: "C3", ratio: 0.84, value: "3.44" },
  { id: "c4", label: "C4 min", ratio: 0.7, value: "3.39" },
];

function bars(cells: GaugeBar[] = CELLS, theme: ThemeName = "dark") {
  return (
    <ThemeProvider initialMode={theme}>
      <GaugeBars bars={cells} fillColor={FILL} />
    </ThemeProvider>
  );
}

/** The palette is written in hex; the DOM answers in rgb(). */
function rgb(hex: string): string {
  const [red, green, blue] = [1, 3, 5].map((start) =>
    Number.parseInt(hex.slice(start, start + 2), 16),
  );
  return `rgb(${red}, ${green}, ${blue})`;
}

describe("a cluster of gauge bars", () => {
  afterEach(cleanup);

  it("draws one bar per cell, in the order it was given", () => {
    render(bars());

    const fills = screen.getAllByTestId("gauge-fill");
    expect(fills).toHaveLength(CELLS.length);
    expect(fills.map((fill) => fill.style.height)).toEqual([
      "78%",
      "76%",
      "84%",
      "70%",
    ]);
  });

  it("draws no meniscus: a bar has no boundary line", () => {
    render(bars());

    expect(screen.queryByTestId("gauge-meniscus")).toBeNull();
  });

  it("draws no meniscus on a full cell either", () => {
    render(bars([{ id: "c1", label: "C1", ratio: 1, value: "3.50" }]));

    expect(screen.queryByTestId("gauge-meniscus")).toBeNull();
  });

  it("shows each cell's reading and the label its caller chose", () => {
    render(bars());

    expect(screen.getByText("3.39")).toBeTruthy();
    expect(screen.getByText("C4 min")).toBeTruthy();
  });

  // `off` is the inert state's token; an unfilled cell is a card, not a switched-off one.
  it.each<ThemeName>([
    "light",
    "dark",
  ])("sits each bar on the card surface, never on the inert fill (%s)", (theme) => {
    render(bars(CELLS, theme));

    for (const bar of screen.getAllByTestId("gauge-surface")) {
      expect(window.getComputedStyle(bar).backgroundColor).toBe(
        rgb(Colors[theme].surface),
      );
    }
  });

  it("ranks nothing: the minimum cell is filled like its siblings", () => {
    render(bars());

    for (const fill of screen.getAllByTestId("gauge-fill")) {
      expect(fill.style.backgroundColor).toBe(FILL);
      expect(fill.style.opacity).toBe("");
    }
  });
});
