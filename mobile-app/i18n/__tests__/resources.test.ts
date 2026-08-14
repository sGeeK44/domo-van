import { describe, expect, it } from "vitest";
import { SUPPORTED_LANGUAGES } from "@/i18n/language";
import { en } from "@/i18n/resources/en";
import { fr } from "@/i18n/resources/fr";

type Dictionary = { [key: string]: string | Dictionary };

function paths(dictionary: Dictionary, prefix = ""): string[] {
  return Object.entries(dictionary).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return typeof value === "string" ? [path] : paths(value, path);
  });
}

function placeholders(text: string): string[] {
  return [...text.matchAll(/{{(\w+)}}/g)].map((match) => match[1]).sort();
}

function leaves(dictionary: Dictionary): Map<string, string> {
  const found = new Map<string, string>();
  const walk = (node: Dictionary, prefix: string) => {
    for (const [key, value] of Object.entries(node)) {
      const path = prefix ? `${prefix}.${key}` : key;
      if (typeof value === "string") found.set(path, value);
      else walk(value, path);
    }
  };
  walk(dictionary, "");
  return found;
}

const french = fr as unknown as Dictionary;
const english = en as unknown as Dictionary;

describe("the dictionaries", () => {
  it("covers every language the app claims to support", () => {
    expect(SUPPORTED_LANGUAGES).toEqual(["fr", "en"]);
  });

  it("translates exactly the same keys, so a missing translation fails CI", () => {
    expect(paths(english).sort()).toEqual(paths(french).sort());
  });

  it("leaves no key on an empty string", () => {
    for (const [dictionary, name] of [
      [french, "fr"],
      [english, "en"],
    ] as const) {
      for (const [path, value] of leaves(dictionary)) {
        expect(value.trim(), `${name}.${path}`).not.toBe("");
      }
    }
  });

  it("interpolates the same placeholders in both languages", () => {
    const source = leaves(french);
    for (const [path, translation] of leaves(english)) {
      expect(placeholders(translation), path).toEqual(
        placeholders(source.get(path) ?? ""),
      );
    }
  });

  it("names every key `<area>.<screen>.<element>` — at least two segments", () => {
    for (const path of paths(french)) {
      expect(path.split(".").length, path).toBeGreaterThanOrEqual(2);
    }
  });
});
