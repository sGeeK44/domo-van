import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";

const ROOT = join(import.meta.dirname, "..", "..");

/**
 * `domain/` carries translation keys, never copy. What is left is the
 * `lastMessage` feedback channel, which a settings section pushes straight to a
 * toast; #7 rewrites those screens onto the toast contract and moves it to keys.
 * The ceiling only ever goes down.
 */
const ALLOWED: Record<string, string> = {
  "domain/heater/HeaterZone.ts":
    "`lastMessage` feedback copy, surfaced by HeaterPidSection — retired by #7",
  "domain/heater/EnvironmentData.ts":
    "`lastMessage` feedback copy on the environment snapshot — retired by #7",
  "domain/water/DrainValve.ts":
    "`lastMessage` feedback copy, surfaced by ValveSettingsSection — retired by #7",
};

const CEILING = 9;

/** French copy, told apart from the English text a `throw` or a log carries. */
function isFrenchCopy(text: string): boolean {
  return /[àâçèéêëîïôùûÀÂÇÈÉÊËÎÏÔÙÛ]/.test(text) || /\bErreur\b/.test(text);
}

function sourceFiles(): string[] {
  const walk = (path: string): string[] => {
    if (statSync(path).isFile()) return /\.tsx?$/.test(path) ? [path] : [];
    return readdirSync(path).flatMap((entry) => walk(join(path, entry)));
  };
  return walk(join(ROOT, "domain")).filter(
    (path) => !path.includes("__tests__"),
  );
}

function frenchCopyIn(file: string): string[] {
  const source = ts.createSourceFile(
    file,
    readFileSync(file, "utf8"),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );

  const hits: string[] = [];
  const visit = (node: ts.Node) => {
    const literal =
      ts.isStringLiteral(node) ||
      ts.isNoSubstitutionTemplateLiteral(node) ||
      ts.isTemplateHead(node) ||
      ts.isTemplateMiddle(node) ||
      ts.isTemplateTail(node);
    if (literal && isFrenchCopy(node.text)) hits.push(node.text);
    ts.forEachChild(node, visit);
  };
  visit(source);
  return hits;
}

describe("the domain carries keys, not copy", () => {
  const offenders = new Map<string, string[]>();
  for (const file of sourceFiles()) {
    const hits = frenchCopyIn(file);
    if (hits.length > 0) offenders.set(relative(ROOT, file), hits);
  }

  it("leaves no French copy outside the debt the exception list names", () => {
    const unexpected = [...offenders].filter(([file]) => !(file in ALLOWED));

    expect(Object.fromEntries(unexpected)).toEqual({});
  });

  it("keeps the debt shrinking: every entry still carries copy", () => {
    for (const file of Object.keys(ALLOWED)) {
      expect(offenders.get(file), file).toBeTruthy();
    }
  });

  it("names the issue that retires each entry", () => {
    for (const [file, reason] of Object.entries(ALLOWED)) {
      expect(reason, file).toMatch(/#\d+/);
    }
  });

  it("never lets the debt grow past its ceiling", () => {
    const total = [...offenders.values()].reduce(
      (count, hits) => count + hits.length,
      0,
    );

    expect(total).toBeLessThanOrEqual(CEILING);
  });
});
