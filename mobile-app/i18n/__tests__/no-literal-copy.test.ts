import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";

const ROOT = join(import.meta.dirname, "..", "..");
const SCANNED = ["components", "screens"];

/** Props that carry copy. `name`, `value` and `subtitle` also carry data, so they are read too. */
const COPY_PROPS = new Set([
  "title",
  "subtitle",
  "label",
  "buttonLabel",
  "placeholder",
  "accessibilityLabel",
  "accessibilityHint",
]);

/**
 * Units, notation and numeric examples read the same in every language, so they are
 * not copy. Permanent, unlike ALLOWED below.
 */
const NON_COPY = new Set(["hPa", "mV", "Ah", "Kp", "Ki", "Kd"]);

/**
 * Files still holding copy, each retired by the issue that rewrites it.
 * A file is listed only when its copy cannot move to a key before that rewrite.
 */
const ALLOWED: Record<string, string> = {};

function sourceFiles(directory: string): string[] {
  const absolute = join(ROOT, directory);
  const walk = (path: string): string[] => {
    if (statSync(path).isFile()) return /\.tsx?$/.test(path) ? [path] : [];
    return readdirSync(path).flatMap((entry) => walk(join(path, entry)));
  };
  return walk(absolute).filter((path) => !path.includes("__tests__"));
}

function isCopy(text: string): boolean {
  const trimmed = text.trim();
  if (NON_COPY.has(trimmed)) return false;
  return /\p{L}{2,}/u.test(trimmed);
}

function literalsOf(node: ts.Node): string[] {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
    return [node.text];
  }
  if (ts.isTemplateExpression(node)) {
    return [
      node.head.text,
      ...node.templateSpans.map((span) => span.literal.text),
    ];
  }
  return [];
}

/** `{">>>"}` between tags is copy; `testID={`row-${id}`}` is an attribute and is not. */
function isRenderedChild(node: ts.Node): node is ts.JsxExpression {
  if (!ts.isJsxExpression(node)) return false;
  return ts.isJsxElement(node.parent) || ts.isJsxFragment(node.parent);
}

function copyIn(file: string): string[] {
  const source = ts.createSourceFile(
    file,
    readFileSync(file, "utf8"),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );

  const hits: string[] = [];
  const visit = (node: ts.Node) => {
    if (ts.isJsxText(node) && isCopy(node.text)) {
      hits.push(node.text.trim());
    }
    if (isRenderedChild(node) && node.expression) {
      hits.push(...literalsOf(node.expression).filter(isCopy));
    }
    if (
      ts.isJsxAttribute(node) &&
      ts.isIdentifier(node.name) &&
      COPY_PROPS.has(node.name.text) &&
      node.initializer
    ) {
      hits.push(...literalsOf(node.initializer).filter(isCopy));
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return hits;
}

describe("no literal copy in a JSX tree", () => {
  const offenders = new Map<string, string[]>();
  for (const directory of SCANNED) {
    for (const file of sourceFiles(directory)) {
      const hits = copyIn(file);
      if (hits.length > 0) offenders.set(relative(ROOT, file), hits);
    }
  }

  it("scans the trees it claims to guard", () => {
    expect(SCANNED.flatMap(sourceFiles).length).toBeGreaterThan(30);
  });

  it("finds every user-visible string behind a translation key", () => {
    const unexpected = [...offenders].filter(([file]) => !(file in ALLOWED));

    expect(Object.fromEntries(unexpected)).toEqual({});
  });

  it("keeps the exception list honest: every entry still carries copy", () => {
    for (const file of Object.keys(ALLOWED)) {
      expect(offenders.get(file), file).toBeTruthy();
    }
  });

  it("names the issue that retires each exception", () => {
    for (const [file, reason] of Object.entries(ALLOWED)) {
      expect(reason, file).toMatch(/#\d+/);
    }
  });
});
