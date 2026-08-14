// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ThemeProvider } from "@/design-system";
import GaugeGalleryScreen from "@/screens/gauge-gallery-screen";

describe("the dev gauge gallery", () => {
  afterEach(cleanup);

  it("renders a gauge in every seeded state, so a device can be looked at", () => {
    render(
      <ThemeProvider initialMode="dark">
        <GaugeGalleryScreen />
      </ThemeProvider>,
    );

    expect(screen.getAllByTestId("gauge-fill").length).toBeGreaterThan(5);
    expect(screen.getAllByTestId("gauge-hatch").length).toBeGreaterThan(0);
    expect(screen.getAllByTestId("gauge-marker").length).toBe(1);
    expect(screen.getAllByTestId("gauge-outline").length).toBe(2);
  });
});
