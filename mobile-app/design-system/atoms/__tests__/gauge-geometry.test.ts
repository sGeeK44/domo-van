import { describe, expect, it } from "vitest";
import {
  clampRatio,
  drawsMeniscus,
  fillExtent,
  linePosition,
} from "@/design-system/atoms/gauge-geometry";

describe("a gauge ratio", () => {
  it("collapses a reading below zero onto an empty surface", () => {
    expect(clampRatio(-0.3)).toBe(0);
  });

  it("collapses a missing reading onto an empty surface", () => {
    expect(clampRatio(Number.NaN)).toBe(0);
  });

  it("collapses a reading past the top onto a full surface", () => {
    expect(clampRatio(1.4)).toBe(1);
  });

  it("keeps a reading inside the range untouched", () => {
    expect(clampRatio(0.72)).toBe(0.72);
  });
});

describe("the fill extent", () => {
  it("grows a vertical gauge in height", () => {
    expect(fillExtent(0.72, "vertical")).toEqual({ height: "72%" });
  });

  it("grows a horizontal gauge in width", () => {
    expect(fillExtent(0.72, "horizontal")).toEqual({ width: "72%" });
  });

  it("clamps before it measures", () => {
    expect(fillExtent(1.4, "vertical")).toEqual({ height: "100%" });
    expect(fillExtent(Number.NaN, "horizontal")).toEqual({ width: "0%" });
  });
});

describe("the line position", () => {
  it("rides up from the bottom on a vertical gauge", () => {
    expect(linePosition(0.72, "vertical")).toEqual({ bottom: "72%" });
  });

  it("rides in from the left on a horizontal gauge", () => {
    expect(linePosition(0.72, "horizontal")).toEqual({ left: "72%" });
  });
});

describe("the meniscus", () => {
  it("is not drawn on a full surface", () => {
    expect(drawsMeniscus(1, "#000000")).toBe(false);
  });

  it("is still drawn just short of full", () => {
    expect(drawsMeniscus(0.999, "#000000")).toBe(true);
  });

  it("is not drawn without a colour: a bar in a cluster marks no boundary", () => {
    expect(drawsMeniscus(0.72, undefined)).toBe(false);
  });
});
