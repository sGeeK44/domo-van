import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";

// `app/_layout.tsx` cannot be imported under vitest, so the wiring is read as source.
const ROOT = join(import.meta.dirname, "..", "..");
const SETTINGS_ROUTES = join(ROOT, "app", "settings");
const LAYOUT = join(ROOT, "app", "_layout.tsx");
const SHELL = join(ROOT, "screens", "settings-form-screen.tsx");

/** A navigation that does not pop cannot return the user to the surface they came from. */
const FORBIDDEN_NAVIGATION = ["replace", "dismissTo"];

function parse(file: string): ts.SourceFile {
  return ts.createSourceFile(
    file,
    readFileSync(file, "utf8"),
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

function jsxTagsOf(file: string): string[] {
  return nodesOf(parse(file))
    .filter(
      (node): node is ts.JsxOpeningElement | ts.JsxSelfClosingElement =>
        ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node),
    )
    .map((element) => element.tagName.getText());
}

function calledMethodsOf(file: string): string[] {
  return nodesOf(parse(file))
    .filter(ts.isCallExpression)
    .map((call) => call.expression)
    .filter(ts.isPropertyAccessExpression)
    .map((access) => access.name.getText());
}

function routeFiles(): string[] {
  const walk = (path: string): string[] => {
    if (statSync(path).isFile()) return /\.tsx?$/.test(path) ? [path] : [];
    return readdirSync(path).flatMap((entry) => walk(join(path, entry)));
  };
  return walk(SETTINGS_ROUTES);
}

function importedFrom(file: string, module: string): string[] {
  return nodesOf(parse(file))
    .filter(ts.isImportDeclaration)
    .filter(
      (declaration) =>
        ts.isStringLiteral(declaration.moduleSpecifier) &&
        declaration.moduleSpecifier.text === module,
    )
    .flatMap((declaration) => {
      const bindings = declaration.importClause?.namedBindings;
      if (!bindings || !ts.isNamedImports(bindings)) return [];
      return bindings.elements.map((element) => element.name.getText());
    });
}

describe("the settings routes", () => {
  // Planning decision 4: the stack does the work, so back returns to the caller.
  it.each(FORBIDDEN_NAVIGATION)("never call %s", (method) => {
    const offenders = routeFiles().filter((file) =>
      calledMethodsOf(file).includes(method),
    );

    expect(offenders.map((file) => relative(ROOT, file))).toEqual([]);
  });

  it("are re-exports, so no screen logic sits under app/", () => {
    const screens = routeFiles().filter(
      (file) => !file.endsWith("_layout.tsx"),
    );

    expect(screens.length).toBeGreaterThan(0);
    for (const file of screens) {
      expect(jsxTagsOf(file), relative(ROOT, file)).toEqual([]);
    }
  });

  it("hide the navigator's own header for the whole group", () => {
    expect(jsxTagsOf(join(SETTINGS_ROUTES, "_layout.tsx"))).toEqual(["Stack"]);
  });
});

describe("the keyboard the forms are typed on", () => {
  // Acceptance example 5's automated half; the real one is run on the phone.
  it("is provided at the root, above every screen", () => {
    expect(jsxTagsOf(LAYOUT)).toContain("KeyboardProvider");
    expect(importedFrom(LAYOUT, "react-native-keyboard-controller")).toContain(
      "KeyboardProvider",
    );
  });

  it("lifts the form's own list, not a bare ScrollView", () => {
    expect(jsxTagsOf(SHELL)).toContain("KeyboardAwareScrollView");
    expect(jsxTagsOf(SHELL)).not.toContain("ScrollView");
    expect(importedFrom(SHELL, "react-native-keyboard-controller")).toContain(
      "KeyboardAwareScrollView",
    );
  });
});
