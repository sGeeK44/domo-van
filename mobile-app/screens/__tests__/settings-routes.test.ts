import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";

// `app/_layout.tsx` cannot be imported under vitest, so the wiring is read as source.
const ROOT = join(import.meta.dirname, "..", "..");
const ROUTES = join(ROOT, "app");
const SETTINGS_ROUTES = join(ROOT, "app", "settings");
const SCREENS = join(ROOT, "screens");
const LAYOUT = join(ROOT, "app", "_layout.tsx");
const SHELL = join(ROOT, "screens", "settings-form-screen.tsx");

/** A navigation that does not pop cannot return the user to the surface they came from. */
const FORBIDDEN_NAVIGATION = ["replace", "dismissTo"];

/** expo-router reads `anchor ?? initialRouteName`, so both spellings seat a route underneath. */
const FORBIDDEN_ANCHORS = ["anchor", "initialRouteName"];

/** The five forms of #7, whichever of them have landed. */
const FORM_SCREEN = /-(identity|tanks|pid|info)-screen\.tsx$/;

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

/** Everything that could navigate away from a form: the shell, the forms, and their routes. */
function formSources(): string[] {
  const forms = readdirSync(SCREENS)
    .filter((entry) => FORM_SCREEN.test(entry))
    .map((entry) => join(SCREENS, entry));
  return [SHELL, ...forms, ...routeFiles()];
}

/** A directory is a route group, a file is a route; `_layout` is neither. */
function topLevelRoutes(): string[] {
  return readdirSync(ROUTES)
    .filter((entry) => !entry.startsWith("_layout."))
    .map((entry) =>
      statSync(join(ROUTES, entry)).isDirectory()
        ? entry
        : entry.replace(/\.tsx?$/, ""),
    );
}

/** Each `<Stack.Screen name=… options={…}/>`, mapped to the options it declares. */
function stackScreensOf(file: string): Map<string, string> {
  const screens = nodesOf(parse(file))
    .filter(
      (node): node is ts.JsxSelfClosingElement =>
        ts.isJsxSelfClosingElement(node) &&
        node.tagName.getText() === "Stack.Screen",
    )
    .map((element) => {
      const attributes = element.attributes.properties.filter(
        ts.isJsxAttribute,
      );
      const named = (attribute: string) =>
        attributes.find((candidate) => candidate.name.getText() === attribute)
          ?.initializer;
      const name = named("name");
      const options = named("options");
      return [
        name && ts.isStringLiteral(name) ? name.text : "",
        options && ts.isJsxExpression(options)
          ? (options.expression?.getText() ?? "")
          : "",
      ] as const;
    });

  return new Map(screens);
}

function identifiersOf(file: string): string[] {
  return nodesOf(parse(file))
    .filter(ts.isIdentifier)
    .map((node) => node.text);
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
    const offenders = formSources().filter((file) =>
      calledMethodsOf(file).includes(method),
    );

    expect(offenders.map((file) => relative(ROOT, file))).toEqual([]);
  });

  // A two-line re-export can hold no navigation, so the scan has to reach the screens.
  it("are scanned through the screens that hold the navigation", () => {
    const scanned = formSources().map((file) => relative(ROOT, file));

    expect(scanned).toContain("screens/settings-form-screen.tsx");
    expect(scanned).toContain("screens/battery-info-screen.tsx");
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

  // An anchored group would seat Réglages under every form, and back would land there.
  it.each(FORBIDDEN_ANCHORS)("are anchored on no %s", (anchor) => {
    expect(identifiersOf(join(SETTINGS_ROUTES, "_layout.tsx"))).not.toContain(
      anchor,
    );
  });
});

describe("the root stack", () => {
  // A route with no entry inherits headerShown: true, and wears a native bar over its own header.
  it("declares every route under app/, with no native header", () => {
    const declared = stackScreensOf(LAYOUT);

    expect(topLevelRoutes().length).toBeGreaterThan(0);
    for (const route of topLevelRoutes()) {
      expect(declared.has(route), `no Stack.Screen for "${route}"`).toBe(true);
      expect(declared.get(route), route).toContain("headerShown: false");
    }
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
