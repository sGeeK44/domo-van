import { readFileSync } from "node:fs";
import { join } from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";

// `app/_layout.tsx` cannot be imported under vitest — gesture-handler, reanimated,
// @react-navigation/native and expo-font all ship Flow source — so it is read as source.
const ROOT = join(import.meta.dirname, "..", "..");
const LAYOUT = "app/_layout.tsx";
const BOOT_GATE = "useAppReady";
const THEMED_PROVIDER = "ThemeProvider";
const LANGUAGE_PROPS = ["initialLanguage", "onLanguageChange"];

function parse(file: string): ts.SourceFile {
  return ts.createSourceFile(
    file,
    readFileSync(join(ROOT, file), "utf8"),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
}

function nodesOf(source: ts.SourceFile): ts.Node[] {
  const all: ts.Node[] = [];
  const visit = (node: ts.Node) => {
    all.push(node);
    ts.forEachChild(node, visit);
  };
  visit(source);
  return all;
}

/** The names `const { … } = useAppReady(…)` binds. */
function bootGateOutputs(nodes: ts.Node[]): string[] {
  return nodes
    .filter(ts.isVariableDeclaration)
    .filter(
      (declaration) =>
        declaration.initializer !== undefined &&
        ts.isCallExpression(declaration.initializer) &&
        declaration.initializer.expression.getText() === BOOT_GATE,
    )
    .filter((declaration) => ts.isObjectBindingPattern(declaration.name))
    .flatMap((declaration) =>
      (declaration.name as ts.ObjectBindingPattern).elements.map((element) =>
        element.name.getText(),
      ),
    );
}

function attributeValue(attribute: ts.JsxAttribute): string {
  const { initializer } = attribute;
  if (initializer === undefined) return "";
  return ts.isJsxExpression(initializer)
    ? (initializer.expression?.getText() ?? "")
    : initializer.getText();
}

function propsOf(attributes: ts.JsxAttribute[]): Map<string, string> {
  return new Map(
    attributes.map((attribute) => [
      attribute.name.getText(),
      attributeValue(attribute),
    ]),
  );
}

/** Each `<ThemeProvider prop={…}>` attribute, mapped to the expression it is given. */
function themeProviderProps(nodes: ts.Node[]): Map<string, string> {
  const openings = nodes.filter(
    (node): node is ts.JsxOpeningElement | ts.JsxSelfClosingElement =>
      (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) &&
      node.tagName.getText() === THEMED_PROVIDER,
  );

  return propsOf(
    openings
      .flatMap((opening) => opening.attributes.properties)
      .filter(ts.isJsxAttribute),
  );
}

/** The language props, wherever in the layout they are handed down. */
function languageProps(nodes: ts.Node[]): Map<string, string> {
  return propsOf(
    nodes
      .filter(ts.isJsxAttribute)
      .filter((attribute) => LANGUAGE_PROPS.includes(attribute.name.getText())),
  );
}

describe("the boot wires persistence to the theme and the language", () => {
  const nodes = nodesOf(parse(LAYOUT));
  const outputs = bootGateOutputs(nodes);
  const props = themeProviderProps(nodes);

  it("finds the boot gate and the provider it claims to guard", () => {
    expect(outputs.length).toBeGreaterThan(0);
    expect(props.size).toBeGreaterThan(0);
  });

  it("hydrates the provider from the gate, so no frame paints in the wrong mode", () => {
    expect(outputs).toContain(props.get("initialMode"));
  });

  it("hands the gate's writer to the provider, or nothing is ever persisted", () => {
    expect(outputs).toContain(props.get("onModeChange"));
  });

  it("hydrates the language from the gate too, so no frame paints in the wrong one", () => {
    const language = languageProps(nodes);

    expect(outputs).toContain(language.get("initialLanguage"));
    expect(outputs).toContain(language.get("onLanguageChange"));
  });

  it("lets the OS deliver a theme change, which Auto needs to follow it", () => {
    const config = JSON.parse(readFileSync(join(ROOT, "app.json"), "utf8"));

    expect(config.expo.userInterfaceStyle).toBe("automatic");
  });
});
