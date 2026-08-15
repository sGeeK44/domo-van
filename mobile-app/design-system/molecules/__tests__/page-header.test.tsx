// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { SettingsIcon } from "@/design-system/molecules/page-header";
import { PageHeader } from "@/design-system/molecules/page-header";
import { ThemeProvider } from "@/design-system/theme/ThemeContext";

function renderHeader(settingsIcon?: SettingsIcon) {
  const onSettingsPress = vi.fn();
  render(
    <ThemeProvider>
      <PageHeader
        title="Eau"
        onSettingsPress={onSettingsPress}
        settingsIcon={settingsIcon}
      />
    </ThemeProvider>,
  );

  return { onSettingsPress };
}

function chipGlyph(): string {
  return screen.getByTestId("page-settings").textContent ?? "";
}

describe("the header settings chip", () => {
  afterEach(cleanup);

  // The mockup gives Bord the gear and a module tab the sliders.
  it("draws the glyph the page names", () => {
    renderHeader("tune");

    expect(chipGlyph()).toBe("tune");
  });

  it("draws the gear when the page names none", () => {
    renderHeader();

    expect(chipGlyph()).toBe("settings");
  });

  it("hands the press back to the page", () => {
    const { onSettingsPress } = renderHeader("tune");

    fireEvent.click(screen.getByTestId("page-settings"));

    expect(onSettingsPress).toHaveBeenCalledTimes(1);
  });

  it("carries no chip on a page with nothing to configure", () => {
    render(
      <ThemeProvider>
        <PageHeader title="Bord" />
      </ThemeProvider>,
    );

    expect(screen.queryByTestId("page-settings")).toBeNull();
  });
});
