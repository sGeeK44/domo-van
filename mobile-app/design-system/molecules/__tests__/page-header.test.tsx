// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PageHeader } from "@/design-system/molecules/page-header";
import { ThemeProvider } from "@/design-system/theme/ThemeContext";

// Until the three-mode picker of #7 ships, this button is the only theme control.
function renderHeader() {
  const onModeChange = vi.fn();
  render(
    <ThemeProvider onModeChange={onModeChange}>
      <PageHeader title="Eau" onSettingsPress={() => {}} />
    </ThemeProvider>,
  );

  return { onModeChange };
}

function pressTheme() {
  fireEvent.click(screen.getByTestId("theme-mode"));
}

function icon(): string {
  return screen.getByTestId("theme-mode").textContent ?? "";
}

describe("the header theme button", () => {
  afterEach(cleanup);

  it("cycles auto → light → dark → auto, so Auto stays reachable", () => {
    const { onModeChange } = renderHeader();
    expect(icon()).toBe("brightness-auto");

    pressTheme();
    expect(icon()).toBe("light-mode");

    pressTheme();
    expect(icon()).toBe("dark-mode");

    pressTheme();
    expect(icon()).toBe("brightness-auto");
    expect(onModeChange.mock.calls.flat()).toEqual(["light", "dark", "auto"]);
  });

  it("stays on a page with nothing to configure", () => {
    render(
      <ThemeProvider>
        <PageHeader title="Gauge gallery" />
      </ThemeProvider>,
    );

    expect(screen.getByTestId("theme-mode")).toBeTruthy();
    expect(screen.queryByText("settings")).toBeNull();
  });
});
