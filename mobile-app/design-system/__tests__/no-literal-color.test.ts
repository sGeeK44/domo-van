import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = join(import.meta.dirname, "..", "..");
const SCANNED = ["app", "components", "design-system", "screens"];

/** A six-digit hex or an rgba() call: a colour spelled out instead of read from the palette. */
const COLOR = /#[0-9a-fA-F]{6}|rgba\(/;

/** The native toast bypasses the design system's single feedback channel. */
const NATIVE_TOAST = /\bToastAndroid\b/;

/** The palette is the one permanent place a colour is spelled out. */
const COLOR_PERMANENT: Record<string, string> = {
  "design-system/tokens.ts":
    "the palette itself, the single source of every colour",
};

/** Each file a later issue rewrites onto tokens; the entry retires with it. */
const COLOR_RETIRING: Record<string, string> = {};

const COLOR_ALLOWED = { ...COLOR_PERMANENT, ...COLOR_RETIRING };

/** The settings sections still confirm through the native toast until #7 rewrites them. */
const TOAST_ALLOWED: Record<string, string> = {
  "components/water-settings/TankSettingsSection.tsx":
    "#7 rewrites the settings sections onto useToast",
  "components/water-settings/ValveSettingsSection.tsx":
    "#7 rewrites the settings sections onto useToast",
  "components/heater-settings/HeaterPidSection.tsx":
    "#7 rewrites the settings sections onto useToast",
  "components/module-settings/AdminSection.tsx":
    "#7 rewrites the settings sections onto useToast",
};

/** The rows of the exception table in the doc: `| \`path\` | reason |`. */
function documentedExceptions(): string[] {
  const doc = readFileSync(join(ROOT, "docs", "design-system.md"), "utf8");
  const guardrail = doc.slice(doc.indexOf("## The colour guardrail"));
  return [...guardrail.matchAll(/^\|\s*`([^`]+)`\s*\|/gm)].map(
    ([, path]) => path,
  );
}

function sourceFiles(directory: string): string[] {
  const walk = (path: string): string[] => {
    if (statSync(path).isFile()) return /\.tsx?$/.test(path) ? [path] : [];
    return readdirSync(path).flatMap((entry) => walk(join(path, entry)));
  };
  return walk(join(ROOT, directory)).filter(
    (path) => !path.includes("__tests__"),
  );
}

function offenders(pattern: RegExp): string[] {
  return SCANNED.flatMap(sourceFiles)
    .filter((file) => pattern.test(readFileSync(file, "utf8")))
    .map((file) => relative(ROOT, file));
}

describe("no literal colour, no native toast", () => {
  it("scans the trees it claims to guard", () => {
    expect(SCANNED.flatMap(sourceFiles).length).toBeGreaterThan(30);
  });

  it("recognises the literals it forbids", () => {
    expect(COLOR.test("#123456")).toBe(true);
    expect(COLOR.test("rgba(0, 0, 0, 0.5)")).toBe(true);
    expect(NATIVE_TOAST.test("ToastAndroid.show(msg)")).toBe(true);
  });

  it("finds every colour read from the palette", () => {
    const unexpected = offenders(COLOR).filter((f) => !(f in COLOR_ALLOWED));

    expect(unexpected).toEqual([]);
  });

  it("keeps the design system free of literal colour", () => {
    const inside = Object.keys(COLOR_ALLOWED).filter((f) =>
      f.startsWith("design-system/"),
    );

    expect(inside).toEqual(["design-system/tokens.ts"]);
  });

  it("routes every confirmation through the design-system toast", () => {
    const unexpected = offenders(NATIVE_TOAST).filter(
      (f) => !(f in TOAST_ALLOWED),
    );

    expect(unexpected).toEqual([]);
  });

  it("keeps the exception lists honest: every entry still offends", () => {
    const colorHits = new Set(offenders(COLOR));
    for (const file of Object.keys(COLOR_ALLOWED)) {
      expect(colorHits.has(file), file).toBe(true);
    }
    const toastHits = new Set(offenders(NATIVE_TOAST));
    for (const file of Object.keys(TOAST_ALLOWED)) {
      expect(toastHits.has(file), file).toBe(true);
    }
  });

  it("keeps the documented inventory equal to the exception maps", () => {
    const documented = documentedExceptions();

    expect(documented.length).toBeGreaterThan(0);
    expect([...documented].sort()).toEqual(
      [...Object.keys(COLOR_ALLOWED), ...Object.keys(TOAST_ALLOWED)].sort(),
    );
  });

  it("names the issue that retires each temporary exception", () => {
    for (const [file, reason] of [
      ...Object.entries(COLOR_RETIRING),
      ...Object.entries(TOAST_ALLOWED),
    ]) {
      expect(reason, file).toMatch(/#\d+/);
    }
  });
});
