// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { GaugeSurfaceProps } from "@/design-system/atoms/gauge-surface";
import { Motion } from "@/design-system/tokens";

// The animation library is the boundary the "no sweep on mount" rule is observed at.
const withTiming = vi.hoisted(() => vi.fn((target: unknown) => target));

vi.mock("react-native-reanimated", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("react-native-reanimated")>();
  return { ...actual, withTiming };
});

const { GaugeSurface } = await import("@/design-system/atoms/gauge-surface");
const { ThemeProvider } = await import("@/design-system/theme/ThemeContext");

const FILL = "rgb(155, 220, 220)";
const LINE = "rgb(10, 106, 106)";
const DANGER = "rgb(239, 68, 68)";

const BASE = {
  axis: "vertical",
  fillColor: FILL,
  lineColor: LINE,
  radius: 28,
} as const satisfies Partial<GaugeSurfaceProps>;

function surface(props: Partial<GaugeSurfaceProps> & { ratio: number }) {
  return (
    <ThemeProvider initialMode="dark">
      <GaugeSurface {...BASE} {...props} />
    </ThemeProvider>
  );
}

function styleOf(testID: string): CSSStyleDeclaration {
  return screen.getByTestId(testID).style;
}

describe("a gauge surface", () => {
  afterEach(() => {
    cleanup();
    withTiming.mockClear();
  });

  it("fills from the bottom and marks the boundary", () => {
    render(surface({ ratio: 0.72 }));

    expect(styleOf("gauge-fill").height).toBe("72%");
    expect(styleOf("gauge-meniscus").bottom).toBe("72%");
    expect(styleOf("gauge-fill").backgroundColor).toBe(FILL);
    expect(styleOf("gauge-meniscus").backgroundColor).toBe(LINE);
  });

  it("fills from the left on the horizontal axis", () => {
    render(surface({ ratio: 0.72, axis: "horizontal" }));

    expect(styleOf("gauge-fill").width).toBe("72%");
    expect(styleOf("gauge-meniscus").left).toBe("72%");
  });

  it("marks no boundary on a full surface", () => {
    render(surface({ ratio: 1 }));

    expect(styleOf("gauge-fill").height).toBe("100%");
    expect(screen.queryByTestId("gauge-meniscus")).toBeNull();
  });

  it("marks no boundary without a line colour", () => {
    render(surface({ ratio: 0.72, lineColor: undefined }));

    expect(screen.queryByTestId("gauge-meniscus")).toBeNull();
  });

  it("clamps a reading past the top onto a full surface", () => {
    render(surface({ ratio: 1.4 }));

    expect(styleOf("gauge-fill").height).toBe("100%");
    expect(screen.queryByTestId("gauge-meniscus")).toBeNull();
  });

  it("swaps the fill for the hatch when it has no reading to show", () => {
    render(surface({ ratio: 0.72, hatched: true }));

    expect(screen.getByTestId("gauge-hatch")).toBeTruthy();
    expect(screen.queryByTestId("gauge-fill")).toBeNull();
    expect(screen.queryByTestId("gauge-meniscus")).toBeNull();
  });

  it("places the marker independently of the fill", () => {
    render(surface({ ratio: 0.52, markerRatio: 0.55, markerColor: LINE }));

    expect(styleOf("gauge-fill").height).toBe("52%");
    expect(styleOf("gauge-marker").bottom).toBe("55%");
  });

  it("draws no marker without a marker colour", () => {
    render(surface({ ratio: 0.52, markerRatio: 0.55 }));

    expect(screen.queryByTestId("gauge-marker")).toBeNull();
  });

  it("outlines the surface in the colour it is given", () => {
    render(surface({ ratio: 0.4, outline: { color: DANGER, width: 2 } }));

    expect(styleOf("gauge-outline").borderTopColor).toBe(DANGER);
    expect(styleOf("gauge-outline").borderTopWidth).toBe("2px");
    expect(styleOf("gauge-outline").borderTopStyle).toBe("solid");
  });

  it("dashes the outline of an empty slot", () => {
    render(
      surface({
        ratio: 0,
        hatched: true,
        outline: { color: DANGER, style: "dashed" },
      }),
    );

    expect(styleOf("gauge-outline").borderTopStyle).toBe("dashed");
  });

  it("carries no outline unless one is asked for", () => {
    render(surface({ ratio: 0.4 }));

    expect(screen.queryByTestId("gauge-outline")).toBeNull();
  });

  it("overlays the outline rather than insetting the content", () => {
    const { container } = render(
      surface({ ratio: 0.4, outline: { color: DANGER } }),
    );
    const box = container.firstElementChild as HTMLElement;

    expect(screen.getByTestId("gauge-outline").parentElement).toBe(box);
    expect(getComputedStyle(box).borderTopWidth).toBe("0px");
  });

  it("paints the level it mounts at, without sweeping up to it", () => {
    render(surface({ ratio: 0.72 }));

    expect(styleOf("gauge-fill").height).toBe("72%");
    expect(withTiming).not.toHaveBeenCalled();
  });

  it("animates to a new level instead of jumping to it", () => {
    const { rerender } = render(surface({ ratio: 0.72 }));
    const painted = screen.getByTestId("gauge-fill");

    rerender(surface({ ratio: 0.68 }));

    expect(withTiming).toHaveBeenCalledWith(0.68, { duration: Motion.fill });
    expect(screen.getByTestId("gauge-fill")).toBe(painted);
    expect(styleOf("gauge-fill").height).toBe("68%");
    expect(styleOf("gauge-meniscus").bottom).toBe("68%");
  });

  it("moves the marker on its own duration", () => {
    const { rerender } = render(
      surface({ ratio: 0.52, markerRatio: 0.55, markerColor: LINE }),
    );

    rerender(surface({ ratio: 0.52, markerRatio: 0.6, markerColor: LINE }));

    expect(withTiming).toHaveBeenCalledWith(0.6, { duration: Motion.marker });
    expect(styleOf("gauge-marker").bottom).toBe("60%");
  });

  it("sweeps on the duration it is given", () => {
    const { rerender } = render(
      surface({ ratio: 0.72, duration: Motion.drain }),
    );

    rerender(surface({ ratio: 0.68, duration: Motion.drain }));

    expect(withTiming).toHaveBeenCalledWith(0.68, { duration: Motion.drain });
  });
});
