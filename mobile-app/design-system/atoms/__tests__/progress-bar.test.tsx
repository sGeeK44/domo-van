// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ProgressBar } from "@/design-system/atoms/progress-bar";
import { ThemeProvider } from "@/design-system/theme/ThemeContext";

// Colours no palette entry holds: a bar painting a token instead of its props cannot pass.
const TROUGH = "rgb(255, 0, 255)";
const FILL = "rgb(0, 255, 255)";

function bar(ratio: number) {
  return (
    <ThemeProvider initialMode="dark">
      <ProgressBar ratio={ratio} troughColor={TROUGH} fillColor={FILL} />
    </ThemeProvider>
  );
}

describe("a progress bar", () => {
  afterEach(cleanup);

  it("fills to the ratio it is given, in the caller's two colours", () => {
    render(bar(0.4));

    expect(screen.getByTestId("gauge-fill").style.width).toBe("40%");
    expect(screen.getByTestId("gauge-fill").style.backgroundColor).toBe(FILL);
    expect(screen.getByTestId("progress-bar").style.backgroundColor).toBe(
      TROUGH,
    );
  });

  it("marks no boundary: a countdown has no meniscus", () => {
    render(bar(0.4));

    expect(screen.queryByTestId("gauge-meniscus")).toBeNull();
  });

  // The fill is a square block, so only the bar's own clipping rounds its leading edge.
  it("clips the fill to its rounded ends", () => {
    render(bar(1));

    const { overflowX, overflowY } = window.getComputedStyle(
      screen.getByTestId("progress-bar"),
    );

    expect([overflowX, overflowY]).toEqual(["hidden", "hidden"]);
  });
});
