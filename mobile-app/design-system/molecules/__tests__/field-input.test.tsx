// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FieldInput } from "@/design-system/molecules/field-input";
import { ThemeProvider } from "@/design-system/theme/ThemeContext";
import { Colors, type ThemeName } from "@/design-system/tokens";

const THEMES: ThemeName[] = ["light", "dark"];

const LABEL = "VOLUME";
const VALUE = "120";
const UNIT = "L";
const TYPED = "135";

function field(
  props: Partial<Parameters<typeof FieldInput>[0]> = {},
  theme: ThemeName = "dark",
) {
  return (
    <ThemeProvider initialMode={theme}>
      <FieldInput
        label={LABEL}
        value={VALUE}
        unit={UNIT}
        onChangeText={() => {}}
        {...props}
      />
    </ThemeProvider>
  );
}

/** A themed StyleSheet reaches the DOM as a class, so the cascade has to be resolved. */
function paintOf(testID: string): CSSStyleDeclaration {
  return window.getComputedStyle(screen.getByTestId(testID));
}

function inkOf(text: string): string {
  return window.getComputedStyle(screen.getByText(text)).color;
}

/** The palette is written in hex; the DOM answers in rgb(). */
function rgb(hex: string): string {
  const [red, green, blue] = [1, 3, 5].map((start) =>
    Number.parseInt(hex.slice(start, start + 2), 16),
  );
  return `rgb(${red}, ${green}, ${blue})`;
}

describe("an editable field", () => {
  afterEach(cleanup);

  it("keeps the unit out of the text being edited", () => {
    render(field());

    expect(screen.getByRole("textbox")).toHaveProperty("value", VALUE);
    expect(screen.getByText(UNIT)).toBeTruthy();
  });

  it("reports every keystroke to the form that owns the draft", () => {
    const onChangeText = vi.fn();
    render(field({ onChangeText }));

    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: TYPED },
    });

    expect(onChangeText).toHaveBeenCalledWith(TYPED);
  });

  it("lets a row holding three fields address one of them", () => {
    render(field({ testID: "field-kp" }));

    expect(screen.getByTestId("field-kp")).toBeTruthy();
    expect(screen.getByTestId("field-kp-box")).toBeTruthy();
  });

  it("forwards the keyboard the caller asked for", () => {
    render(field({ inputProps: { keyboardType: "numeric" } }));

    expect(screen.getByRole("textbox").getAttribute("inputmode")).toBe(
      "numeric",
    );
  });

  it.each(THEMES)("shows a value the form accepts in %s", (theme) => {
    render(field({}, theme));
    const colors = Colors[theme];

    expect(inkOf(LABEL)).toBe(rgb(colors.textMuted));
    expect(inkOf(UNIT)).toBe(rgb(colors.textMuted));
    expect(paintOf("field-input-box").backgroundColor).toBe(rgb(colors.inset));
    expect(paintOf("field-input-box").borderTopColor).not.toBe(
      rgb(colors.danger),
    );
  });

  it.each(THEMES)("outlines a value the form refuses in %s", (theme) => {
    render(field({ invalid: true }, theme));
    const colors = Colors[theme];

    expect(paintOf("field-input-box").borderTopColor).toBe(rgb(colors.danger));
    expect(paintOf("field-input-box").borderTopWidth).toBe("1.5px");
  });
});
