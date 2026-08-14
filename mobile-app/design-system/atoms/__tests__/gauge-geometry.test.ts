import { readFileSync } from "node:fs";
import { join } from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";
import {
  clampRatio,
  drawsMeniscus,
  fillExtent,
  linePosition,
  markerInset,
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

describe("the marker inset", () => {
  // -0 is what negating zero yields; it lays out as 0, but vitest tells them apart.
  it("leaves an empty-side marker where it sits: none of it overhangs", () => {
    expect(markerInset(0, "horizontal")).toEqual({ marginLeft: -0 });
    expect(markerInset(0, "vertical")).toEqual({ marginBottom: -0 });
  });

  it("pulls a full-side marker back by its whole thickness, or it is clipped away", () => {
    expect(markerInset(1, "horizontal")).toEqual({ marginLeft: -2 });
    expect(markerInset(1, "vertical")).toEqual({ marginBottom: -2 });
  });

  it("centres the marker on the boundary in between", () => {
    expect(markerInset(0.5, "horizontal")).toEqual({ marginLeft: -1 });
    expect(markerInset(0.5, "vertical")).toEqual({ marginBottom: -1 });
  });

  it("stays proportional across the range", () => {
    expect(markerInset(0.25, "horizontal")).toEqual({ marginLeft: -0.5 });
    expect(markerInset(0.75, "horizontal")).toEqual({ marginLeft: -1.5 });
  });

  it("clamps before it insets", () => {
    expect(markerInset(1.4, "horizontal")).toEqual({ marginLeft: -2 });
    expect(markerInset(Number.NaN, "horizontal")).toEqual({ marginLeft: -0 });
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

/**
 * The vitest mock runs useAnimatedStyle on the JS thread, so a lost "worklet"
 * directive only shows up on device. This reads the source instead.
 */
const SOURCE = join(import.meta.dirname, "..", "gauge-geometry.ts");

/** Called at render time only; every other helper is reached from the UI runtime. */
const RENDER_TIME_ONLY = new Set(["drawsMeniscus"]);

function declaredFunctions(): { name: string; isWorklet: boolean }[] {
  const source = ts.createSourceFile(
    SOURCE,
    readFileSync(SOURCE, "utf8"),
    ts.ScriptTarget.Latest,
    true,
  );

  return source.statements
    .filter(ts.isFunctionDeclaration)
    .map((declaration) => ({
      name: declaration.name?.text ?? "",
      isWorklet: hasWorkletDirective(declaration.body),
    }));
}

function hasWorkletDirective(body: ts.Block | undefined): boolean {
  const first = body?.statements[0];
  if (!first || !ts.isExpressionStatement(first)) return false;
  return (
    ts.isStringLiteral(first.expression) && first.expression.text === "worklet"
  );
}

describe("the worklet directives", () => {
  const functions = declaredFunctions();

  it("reads the helpers it claims to guard", () => {
    expect(functions.map((entry) => entry.name)).toEqual(
      expect.arrayContaining([
        "clampRatio",
        "percent",
        "fillExtent",
        "linePosition",
        "markerInset",
        ...RENDER_TIME_ONLY,
      ]),
    );
  });

  it("marks every helper the UI runtime calls, or Reanimated throws on device", () => {
    const undeclared = functions
      .filter((entry) => !entry.isWorklet && !RENDER_TIME_ONLY.has(entry.name))
      .map((entry) => entry.name);

    expect(undeclared).toEqual([]);
  });

  it("keeps the render-time list honest: a listed helper carries no directive", () => {
    for (const entry of functions.filter((it) => RENDER_TIME_ONLY.has(it.name)))
      expect(entry.isWorklet, entry.name).toBe(false);
  });
});
