import { describe, expect, it } from "vitest";
import {
  Colors,
  FontFamilies,
  MetricUnitSize,
  type TextStyleName,
  TextStyles,
} from "@/design-system/tokens";

type Shape = { [key: string]: Shape | null };

function shapeOf(value: object): Shape {
  return Object.fromEntries(
    Object.entries(value)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, child]) => [
        key,
        typeof child === "object" && child !== null ? shapeOf(child) : null,
      ]),
  );
}

describe("Colors", () => {
  it("gives every token a light and a dark value", () => {
    expect(shapeOf(Colors.light)).toEqual(shapeOf(Colors.dark));
  });
});

describe("TextStyles", () => {
  const entries = Object.entries(TextStyles);

  it("names one of the bundled faces for every style", () => {
    for (const [name, style] of entries) {
      expect([...FontFamilies], name).toContain(style.fontFamily);
    }
  });

  it("reaches every weight by family, never by fontWeight", () => {
    for (const [name, style] of entries) {
      expect(style, name).not.toHaveProperty("fontWeight");
    }
  });
});

describe("MetricUnitSize", () => {
  const entries = Object.entries(MetricUnitSize) as [TextStyleName, number][];

  it("keys a real text style", () => {
    for (const [name] of entries) {
      expect(Object.keys(TextStyles), name).toContain(name);
    }
  });

  it("stays smaller than the metric it sits in", () => {
    for (const [name, size] of entries) {
      expect(size, name).toBeLessThan(TextStyles[name].fontSize);
    }
  });
});
