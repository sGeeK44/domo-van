import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";

const ROOT = join(import.meta.dirname, "..", "..");

/** `domain/` carries translation keys, never copy. Nothing is pinned: the list stays empty. */
const ALLOWED: Record<string, string> = {};

const CEILING = 0;

/** Words with no English homograph, to catch French a diacritic misses. */
const FRENCH_WORDS =
  /\b(erreur|le|la|les|un|une|des|du|de|dans|avec|pour|sur|est|sont|pas|aucun|aucune|veuillez|patientez|cours|votre|vos|notre|nos|cette|ces)\b/i;

/** Spelling, not meaning: a diacritic or a French word. Prose with neither slips through. */
function looksFrench(text: string): boolean {
  return /[àâçèéêëîïôùûÀÂÇÈÉÊËÎÏÔÙÛ]/.test(text) || FRENCH_WORDS.test(text);
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
    if (literal && looksFrench(node.text)) hits.push(node.text);
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

  it("reads spelling: it catches an unaccented sentence, not one without a French word", () => {
    expect(looksFrench("Vidange en cours, patientez un instant")).toBe(true);
    expect(looksFrench("Purge finie")).toBe(false);
  });
});
