// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { GaugeSurfaceProps } from "@/design-system/atoms/gauge-surface";
import { Colors, Motion } from "@/design-system/tokens";

// The animation library is the boundary the "no sweep on mount" rule is observed at.
const withTiming = vi.hoisted(() => vi.fn((target: unknown) => target));

vi.mock("react-native-reanimated", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("react-native-reanimated")>();
  return { ...actual, withTiming };
});

const { GaugeSurface } = await import("@/design-system/atoms/gauge-surface");
const { ThemeProvider } = await import("@/design-system/theme/ThemeContext");

// Colours no palette entry holds, and none equal to another: a surface painting a token,
// or one prop's colour where another's belongs, cannot pass. The first test below enforces it.
const FILL = "rgb(255, 0, 255)";
const LINE = "rgb(0, 255, 255)";
const MARKER = "rgb(0, 128, 255)";
const OUTLINE = "rgb(255, 255, 0)";
const FIXTURES = { FILL, LINE, MARKER, OUTLINE };

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

/** A module StyleSheet reaches the DOM as a class, so the cascade has to be resolved. */
function paintOf(testID: string): CSSStyleDeclaration {
  return window.getComputedStyle(screen.getByTestId(testID));
}

function paletteColors(value: unknown = Colors): string[] {
  return typeof value === "string"
    ? [value]
    : Object.values(value as object).flatMap((entry) => paletteColors(entry));
}

/** The palette is written in hex, a fixture in rgb(): compare them on the same footing. */
function toRgb(color: string): string {
  if (!color.startsWith("#")) return color;
  const [r, g, b] = [1, 3, 5].map((start) =>
    Number.parseInt(color.slice(start, start + 2), 16),
  );
  return `rgb(${r}, ${g}, ${b})`;
}

describe("a gauge surface", () => {
  afterEach(() => {
    cleanup();
    withTiming.mockClear();
  });

  it("is tested on colours neither the palette nor another fixture holds", () => {
    const palette = new Set(paletteColors().map(toRgb));

    expect(
      Object.entries(FIXTURES).filter(([, color]) => palette.has(color)),
    ).toEqual([]);
    expect(new Set(Object.values(FIXTURES)).size).toBe(
      Object.keys(FIXTURES).length,
    );
  });

  it("fills from the bottom and marks the boundary", () => {
    render(surface({ ratio: 0.72 }));

    expect(styleOf("gauge-fill").height).toBe("72%");
    expect(styleOf("gauge-meniscus").bottom).toBe("72%");
    expect(styleOf("gauge-fill").backgroundColor).toBe(FILL);
    expect(styleOf("gauge-meniscus").backgroundColor).toBe(LINE);
    // anchored across the width, so the level reads as a rising floor and the line as its edge
    expect(paintOf("gauge-fill").right).toBe("0px");
    expect(paintOf("gauge-meniscus").height).toBe("2px");
  });

  it("fills from the left on the horizontal axis", () => {
    render(surface({ ratio: 0.72, axis: "horizontal" }));

    expect(styleOf("gauge-fill").width).toBe("72%");
    expect(styleOf("gauge-meniscus").left).toBe("72%");
    // anchored across the height instead, and the line turns on its side with it
    expect(paintOf("gauge-fill").top).toBe("0px");
    expect(paintOf("gauge-meniscus").width).toBe("2px");
  });

  it("clips its fill to its own rounded corners", () => {
    render(surface({ ratio: 0.72 }));

    expect(paintOf("gauge-surface").overflowX).toBe("hidden");
    expect(paintOf("gauge-surface").overflowY).toBe("hidden");
    expect(styleOf("gauge-surface").borderTopLeftRadius).toBe("28px");
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
    render(surface({ ratio: 0.52, markerRatio: 0.55, markerColor: MARKER }));

    expect(styleOf("gauge-fill").height).toBe("52%");
    expect(styleOf("gauge-marker").bottom).toBe("55%");
    expect(styleOf("gauge-marker").backgroundColor).toBe(MARKER);
    expect(paintOf("gauge-marker").height).toBe("2px");
  });

  it("insets the marker proportionally: whole at the top, centred on the boundary in between", () => {
    const marked = {
      ratio: 1,
      markerColor: MARKER,
      axis: "horizontal",
    } as const;
    const { rerender } = render(surface({ ...marked, markerRatio: 1 }));

    expect(styleOf("gauge-marker").left).toBe("100%");
    expect(styleOf("gauge-marker").marginLeft).toBe("-2px");

    rerender(surface({ ...marked, markerRatio: 0.5 }));
    expect(styleOf("gauge-marker").left).toBe("50%");
    expect(styleOf("gauge-marker").marginLeft).toBe("-1px");

    rerender(surface({ ...marked, markerRatio: 0 }));
    expect(styleOf("gauge-marker").marginLeft).toBe("0px");
  });

  it("insets a vertical marker along its own axis", () => {
    render(surface({ ratio: 1, markerRatio: 1, markerColor: MARKER }));

    expect(styleOf("gauge-marker").marginBottom).toBe("-2px");
    expect(styleOf("gauge-marker").marginLeft).toBe("");
  });

  it("draws no marker without a marker colour", () => {
    render(surface({ ratio: 0.52, markerRatio: 0.55 }));

    expect(screen.queryByTestId("gauge-marker")).toBeNull();
  });

  it("outlines the surface in the colour it is given", () => {
    render(surface({ ratio: 0.4, outline: { color: OUTLINE, width: 2 } }));

    expect(styleOf("gauge-outline").borderTopColor).toBe(OUTLINE);
    expect(styleOf("gauge-outline").borderTopWidth).toBe("2px");
    expect(styleOf("gauge-outline").borderTopStyle).toBe("solid");
  });

  it("dashes the outline of an empty slot", () => {
    render(
      surface({
        ratio: 0,
        hatched: true,
        outline: { color: OUTLINE, style: "dashed" },
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
      surface({ ratio: 0.4, outline: { color: OUTLINE } }),
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
      surface({ ratio: 0.52, markerRatio: 0.55, markerColor: MARKER }),
    );

    rerender(surface({ ratio: 0.52, markerRatio: 0.6, markerColor: MARKER }));

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
