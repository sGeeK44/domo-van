import { describe, expect, it } from "vitest";
import { BundledFonts } from "@/design-system/fonts";
import { FontFamilies } from "@/design-system/tokens";

describe("BundledFonts", () => {
  it("registers every declared family and nothing else", () => {
    expect(Object.keys(BundledFonts).sort()).toEqual([...FontFamilies].sort());
  });
});
