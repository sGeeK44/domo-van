import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";

const ROOT = join(import.meta.dirname, "..", "..");
const SCANNED = ["app", "components", "design-system", "screens"];

/** Props that carry copy. `name` and `subtitle` also carry data, so they are read too. */
const COPY_PROPS = new Set([
  "title",
  "subtitle",
  "label",
  "buttonLabel",
  "placeholder",
  "accessibilityLabel",
  "accessibilityHint",
  "name",
  "children",
]);

/** On an icon or a route, `name` is an identifier, not copy. */
const IDENTIFIER_NAME_TAGS = new Set([
  "IconSymbol",
  "MaterialIcons",
  "Stack.Screen",
  "Tabs.Screen",
]);

/** Operators whose operands both reach the screen. A comparison operand is a value, not copy. */
const BOTH_SIDES_RENDER = new Set<ts.SyntaxKind>([
  ts.SyntaxKind.BarBarToken,
  ts.SyntaxKind.QuestionQuestionToken,
  ts.SyntaxKind.PlusToken,
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
const ALLOWED: Record<string, string> = {
  "components/dev/gauge-gallery-link.tsx":
    "#6 deletes the dev gallery, and this entry point with it",
  "screens/gauge-gallery-screen.tsx":
    "#6 deletes the dev gallery once the real screens render the gauges",
};

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

function binaryOperands(node: ts.BinaryExpression): ts.Node[] {
  const operator = node.operatorToken.kind;
  if (operator === ts.SyntaxKind.AmpersandAmpersandToken) return [node.right];
  return BOTH_SIDES_RENDER.has(operator) ? [node.left, node.right] : [];
}

/** Reaches through the shapes that render a string: `{a ? "x" : "y"}`, `{a || "x"}`, `{"x" + b}`. */
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
  if (ts.isJsxExpression(node)) {
    return node.expression ? literalsOf(node.expression) : [];
  }
  if (ts.isParenthesizedExpression(node)) return literalsOf(node.expression);
  if (ts.isConditionalExpression(node)) {
    return [...literalsOf(node.whenTrue), ...literalsOf(node.whenFalse)];
  }
  if (ts.isBinaryExpression(node)) {
    return binaryOperands(node).flatMap(literalsOf);
  }
  return [];
}

/** `{">>>"}` between tags is copy; `testID={`row-${id}`}` is an attribute and is not. */
function isRenderedChild(node: ts.Node): node is ts.JsxExpression {
  if (!ts.isJsxExpression(node)) return false;
  return ts.isJsxElement(node.parent) || ts.isJsxFragment(node.parent);
}

function tagOf(attribute: ts.JsxAttribute): string {
  const element = attribute.parent.parent;
  return ts.isJsxOpeningElement(element) || ts.isJsxSelfClosingElement(element)
    ? element.tagName.getText()
    : "";
}

function isCopyProp(node: ts.JsxAttribute): boolean {
  if (!ts.isIdentifier(node.name) || !COPY_PROPS.has(node.name.text)) {
    return false;
  }
  return node.name.text !== "name" || !IDENTIFIER_NAME_TAGS.has(tagOf(node));
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
    if (isRenderedChild(node)) {
      hits.push(...literalsOf(node).filter(isCopy));
    }
    if (ts.isJsxAttribute(node) && node.initializer && isCopyProp(node)) {
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
