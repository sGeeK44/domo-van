import { describe, expect, it } from "vitest";
import { Colors, TextStyles } from "@/design-system/tokens";

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

const BUNDLED_FACES = new Set([
  "Archivo_400Regular",
  "Archivo_500Medium",
  "Archivo_600SemiBold",
  "Archivo_700Bold",
  "Archivo_800ExtraBold",
  "Archivo_900Black",
  "SpaceMono_400Regular",
  "SpaceMono_700Bold",
]);

describe("TextStyles", () => {
  const entries = Object.entries(TextStyles);

  it("names one of the bundled faces for every style", () => {
    for (const [name, style] of entries) {
      expect([...BUNDLED_FACES], name).toContain(style.fontFamily);
    }
  });

  it("reaches every weight by family, never by fontWeight", () => {
    for (const [name, style] of entries) {
      expect(style, name).not.toHaveProperty("fontWeight");
    }
  });
});
