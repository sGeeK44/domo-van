// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { FieldReadout } from "@/design-system/molecules/field-readout";
import { FieldRow } from "@/design-system/molecules/field-row";
import { ThemeProvider } from "@/design-system/theme/ThemeContext";
import { Spacing, type ThemeName } from "@/design-system/tokens";

const THEMES: ThemeName[] = ["light", "dark"];

const GAINS = ["KP", "KI", "KD"];

function row(theme: ThemeName = "dark") {
  return (
    <ThemeProvider initialMode={theme}>
      <FieldRow>
        {GAINS.map((gain) => (
          <FieldReadout key={gain} label={gain} value="1.20" />
        ))}
      </FieldRow>
    </ThemeProvider>
  );
}

/** A themed StyleSheet reaches the DOM as a class, so the cascade has to be resolved. */
function paintOf(element: Element): CSSStyleDeclaration {
  return window.getComputedStyle(element);
}

describe("a field row", () => {
  afterEach(cleanup);

  it.each(THEMES)("splits a three-gain card in three in %s", (theme) => {
    render(row(theme));

    const fields = Array.from(screen.getByTestId("field-row").children);

    expect(fields).toHaveLength(GAINS.length);
    for (const field of fields) {
      expect(paintOf(field).flexGrow).toBe("1");
      expect(paintOf(field).flexBasis).toBe("0%");
    }
  });

  it("lays its fields out beside each other, clear of the card's accent", () => {
    render(row());
    const rowStyle = paintOf(screen.getByTestId("field-row"));

    expect(rowStyle.flexDirection).toBe("row");
    expect(rowStyle.gap).toBe(`${Spacing.m}px`);
    expect(rowStyle.paddingLeft).toBe(`${Spacing.s}px`);
  });
});
