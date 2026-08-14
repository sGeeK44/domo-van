// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { GaugeHero } from "@/design-system/molecules/gauges/gauge-hero";
import { ThemeProvider } from "@/design-system/theme/ThemeContext";

// Colours no palette entry holds: a hero painting a domain token instead of its props cannot pass.
const FILL = "rgb(255, 0, 255)";
const LINE = "rgb(0, 255, 255)";

function hero(ratio: number) {
  return (
    <ThemeProvider initialMode="dark">
      <GaugeHero
        ratio={ratio}
        fillColor={FILL}
        lineColor={LINE}
        label="BATTERIE"
        value={{ amount: "82", unit: "%" }}
        aside={{ value: "18 h", caption: "autonomie" }}
      />
    </ThemeProvider>
  );
}

describe("a gauge hero", () => {
  afterEach(cleanup);

  it("shows the label, the metric with its unit and the aside block", () => {
    render(hero(0.82));

    expect(screen.getByText("BATTERIE")).toBeTruthy();
    expect(screen.getByText("82")).toBeTruthy();
    expect(screen.getByText("%")).toBeTruthy();
    expect(screen.getByText("18 h")).toBeTruthy();
    expect(screen.getByText("autonomie")).toBeTruthy();
  });

  it("fills bottom-up and marks the boundary at its level", () => {
    render(hero(0.82));

    expect(screen.getByTestId("gauge-fill").style.height).toBe("82%");
    expect(screen.getByTestId("gauge-meniscus").style.bottom).toBe("82%");
  });

  it("paints the fill and the boundary in the colours its caller chose", () => {
    render(hero(0.82));

    expect(screen.getByTestId("gauge-fill").style.backgroundColor).toBe(FILL);
    expect(screen.getByTestId("gauge-meniscus").style.backgroundColor).toBe(
      LINE,
    );
  });

  it("marks no boundary on a full charge", () => {
    render(hero(1));

    expect(screen.queryByTestId("gauge-meniscus")).toBeNull();
  });
});
